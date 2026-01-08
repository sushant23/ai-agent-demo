import {
  IToolRegistry,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ToolMetrics,
} from '../interfaces/tool-registry';
import {
  BusinessTool,
  ToolParameters,
  ToolResult,
  ToolCategory,
  JSONSchema,
  ToolError,
} from '../types/tools';
import { ToolValidationError, ToolNotFoundError, ToolExecutionError } from '../utils/errors';

export class ToolRegistry implements IToolRegistry {
  private tools: Map<string, Map<string, BusinessTool>> = new Map(); // toolId -> version -> tool
  private latestVersions: Map<string, string> = new Map(); // toolId -> latest version
  private metrics: Map<string, ToolMetrics> = new Map(); // toolId -> metrics
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Initialize internal data structures
    this.tools.clear();
    this.latestVersions.clear();
    this.metrics.clear();

    this.initialized = true;
  }

  async shutdown(): Promise<void> {
    this.tools.clear();
    this.latestVersions.clear();
    this.metrics.clear();
    this.initialized = false;
  }

  async registerTool(tool: BusinessTool): Promise<void> {
    if (!this.initialized) {
      throw new Error('ToolRegistry not initialized');
    }

    // Validate the tool before registration
    const validation = await this.validateTool(tool);
    if (!validation.isValid) {
      throw new ToolValidationError(
        `Tool validation failed: ${validation.errors.map(e => e.message).join(', ')}`,
        validation.errors
      );
    }

    // Get or create tool version map
    let versionMap = this.tools.get(tool.id);
    if (!versionMap) {
      versionMap = new Map();
      this.tools.set(tool.id, versionMap);
    }

    // Register the tool version
    versionMap.set(tool.version, tool);

    // Update latest version if this is newer
    const currentLatest = this.latestVersions.get(tool.id);
    if (!currentLatest || this.isNewerVersion(tool.version, currentLatest)) {
      this.latestVersions.set(tool.id, tool.version);
    }

    // Initialize metrics for new tool
    if (!this.metrics.has(tool.id)) {
      this.metrics.set(tool.id, {
        toolId: tool.id,
        executionCount: 0,
        averageExecutionTime: 0,
        successRate: 1.0,
        lastExecuted: new Date(),
        errorsByCode: {},
      });
    }
  }

  async getTool(toolId: string, version?: string): Promise<BusinessTool> {
    if (!this.initialized) {
      throw new Error('ToolRegistry not initialized');
    }

    const versionMap = this.tools.get(toolId);
    if (!versionMap) {
      throw new ToolNotFoundError(`Tool not found: ${toolId}`);
    }

    const targetVersion = version || this.latestVersions.get(toolId);
    if (!targetVersion) {
      throw new ToolNotFoundError(`No version found for tool: ${toolId}`);
    }

    const tool = versionMap.get(targetVersion);
    if (!tool) {
      throw new ToolNotFoundError(`Tool version not found: ${toolId}@${targetVersion}`);
    }

    return tool;
  }

  async executeTool(toolId: string, parameters: ToolParameters): Promise<ToolResult> {
    if (!this.initialized) {
      throw new Error('ToolRegistry not initialized');
    }

    const startTime = Date.now();
    let success = false;
    let error: ToolError | undefined;

    try {
      // Get the tool
      const tool = await this.getTool(toolId);

      // Validate parameters against schema
      const paramValidation = this.validateParameters(parameters, tool.inputSchema);
      if (!paramValidation.isValid) {
      throw new ToolValidationError(
        `Parameter validation failed: ${paramValidation.errors.map(e => e.message).join(', ')}`,
        paramValidation.errors
      );
      }

      // Execute the tool
      const result = await tool.execute(parameters);
      success = result.success;

      // Update metrics
      await this.updateMetrics(toolId, Date.now() - startTime, success, result.error);

      return {
        ...result,
        metadata: {
          ...result.metadata,
          executionTime: Date.now() - startTime,
          version: tool.version,
        },
      };
    } catch (err) {
      // Re-throw ToolNotFoundError and ToolValidationError as they are
      if (err instanceof ToolNotFoundError || err instanceof ToolValidationError) {
        throw err;
      }

      const toolError: ToolError = {
        code: err instanceof ToolExecutionError ? err.code : 'EXECUTION_ERROR',
        message: err instanceof Error ? err.message : 'Unknown error',
        ...(err instanceof ToolExecutionError && err.details ? { details: err.details } : {}),
      };

      error = toolError;
      await this.updateMetrics(toolId, Date.now() - startTime, false, toolError);

      return {
        success: false,
        error: toolError,
        metadata: {
          executionTime: Date.now() - startTime,
          version: 'unknown',
        },
      };
    }
  }

  async listAvailableTools(category?: ToolCategory): Promise<BusinessTool[]> {
    if (!this.initialized) {
      throw new Error('ToolRegistry not initialized');
    }

    const tools: BusinessTool[] = [];

    for (const [toolId, versionMap] of this.tools) {
      const latestVersion = this.latestVersions.get(toolId);
      if (latestVersion) {
        const tool = versionMap.get(latestVersion);
        if (tool && (!category || tool.category === category)) {
          tools.push(tool);
        }
      }
    }

    return tools;
  }

  async validateTool(tool: BusinessTool): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate required fields
    if (!tool.id || tool.id.trim() === '') {
      errors.push({
        field: 'id',
        message: 'Tool ID is required',
        code: 'MISSING_ID',
      });
    }

    if (!tool.name || tool.name.trim() === '') {
      errors.push({
        field: 'name',
        message: 'Tool name is required',
        code: 'MISSING_NAME',
      });
    }

    if (!tool.version || tool.version.trim() === '') {
      errors.push({
        field: 'version',
        message: 'Tool version is required',
        code: 'MISSING_VERSION',
      });
    }

    if (!tool.execute || typeof tool.execute !== 'function') {
      errors.push({
        field: 'execute',
        message: 'Tool execute function is required',
        code: 'MISSING_EXECUTE',
      });
    }

    // Validate version format (semantic versioning)
    if (tool.version && !this.isValidVersion(tool.version)) {
      errors.push({
        field: 'version',
        message: 'Tool version must follow semantic versioning (e.g., 1.0.0)',
        code: 'INVALID_VERSION_FORMAT',
      });
    }

    // Validate category
    if (!Object.values(ToolCategory).includes(tool.category)) {
      errors.push({
        field: 'category',
        message: 'Invalid tool category',
        code: 'INVALID_CATEGORY',
      });
    }

    // Validate schemas
    if (tool.inputSchema) {
      const schemaValidation = this.validateJSONSchema(tool.inputSchema);
      if (!schemaValidation.isValid) {
        errors.push({
          field: 'inputSchema',
          message: 'Invalid input schema',
          code: 'INVALID_INPUT_SCHEMA',
        });
      }
    }

    if (tool.outputSchema) {
      const schemaValidation = this.validateJSONSchema(tool.outputSchema);
      if (!schemaValidation.isValid) {
        errors.push({
          field: 'outputSchema',
          message: 'Invalid output schema',
          code: 'INVALID_OUTPUT_SCHEMA',
        });
      }
    }

    // Check for duplicate tool ID and version
    const existingTool = this.tools.get(tool.id)?.get(tool.version);
    if (existingTool) {
      warnings.push({
        field: 'version',
        message: `Tool ${tool.id}@${tool.version} already exists and will be overwritten`,
        severity: 'medium',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  async getToolMetrics(toolId: string): Promise<ToolMetrics> {
    if (!this.initialized) {
      throw new Error('ToolRegistry not initialized');
    }

    const metrics = this.metrics.get(toolId);
    if (!metrics) {
      throw new ToolNotFoundError(`No metrics found for tool: ${toolId}`);
    }

    return { ...metrics };
  }

  private validateParameters(parameters: ToolParameters, schema: JSONSchema): ValidationResult {
    const errors: ValidationError[] = [];

    // Check required parameters
    if (schema.required) {
      for (const requiredField of schema.required) {
        if (!(requiredField in parameters)) {
          errors.push({
            field: requiredField,
            message: `Required parameter '${requiredField}' is missing`,
            code: 'MISSING_REQUIRED_PARAMETER',
          });
        }
      }
    }

    // Validate parameter types and constraints
    if (schema.properties) {
      for (const [fieldName, fieldSchema] of Object.entries(schema.properties)) {
        const value = parameters[fieldName];
        if (value !== undefined) {
          const fieldValidation = this.validateFieldValue(value, fieldSchema, fieldName);
          errors.push(...fieldValidation);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: [],
    };
  }

  private validateFieldValue(value: unknown, schema: any, fieldName: string): ValidationError[] {
    const errors: ValidationError[] = [];

    // Type validation
    const expectedType = schema.type;
    const actualType = typeof value;

    if (expectedType === 'array' && !Array.isArray(value)) {
      errors.push({
        field: fieldName,
        message: `Expected array, got ${actualType}`,
        code: 'TYPE_MISMATCH',
      });
    } else if (expectedType !== 'array' && actualType !== expectedType) {
      errors.push({
        field: fieldName,
        message: `Expected ${expectedType}, got ${actualType}`,
        code: 'TYPE_MISMATCH',
      });
    }

    // Enum validation
    if (schema.enum && !schema.enum.includes(value)) {
      errors.push({
        field: fieldName,
        message: `Value must be one of: ${schema.enum.join(', ')}`,
        code: 'INVALID_ENUM_VALUE',
      });
    }

    // Numeric constraints
    if (typeof value === 'number') {
      if (schema.minimum !== undefined && value < schema.minimum) {
        errors.push({
          field: fieldName,
          message: `Value must be >= ${schema.minimum}`,
          code: 'VALUE_TOO_SMALL',
        });
      }
      if (schema.maximum !== undefined && value > schema.maximum) {
        errors.push({
          field: fieldName,
          message: `Value must be <= ${schema.maximum}`,
          code: 'VALUE_TOO_LARGE',
        });
      }
    }

    return errors;
  }

  private validateJSONSchema(schema: JSONSchema): ValidationResult {
    const errors: ValidationError[] = [];

    if (!schema.type) {
      errors.push({
        field: 'type',
        message: 'Schema type is required',
        code: 'MISSING_SCHEMA_TYPE',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: [],
    };
  }

  private isValidVersion(version: string): boolean {
    // Simple semantic versioning check (major.minor.patch)
    const semverRegex = /^\d+\.\d+\.\d+$/;
    return semverRegex.test(version);
  }

  private isNewerVersion(version1: string, version2: string): boolean {
    const v1Parts = version1.split('.').map(Number);
    const v2Parts = version2.split('.').map(Number);

    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
      const v1Part = v1Parts[i] || 0;
      const v2Part = v2Parts[i] || 0;

      if (v1Part > v2Part) return true;
      if (v1Part < v2Part) return false;
    }

    return false;
  }

  private async updateMetrics(
    toolId: string,
    executionTime: number,
    success: boolean,
    error?: ToolError
  ): Promise<void> {
    const metrics = this.metrics.get(toolId);
    if (!metrics) return;

    // Update execution count and average time
    const newCount = metrics.executionCount + 1;
    const newAverageTime = (metrics.averageExecutionTime * metrics.executionCount + executionTime) / newCount;

    // Update success rate
    const successCount = Math.round(metrics.successRate * metrics.executionCount) + (success ? 1 : 0);
    const newSuccessRate = successCount / newCount;

    // Update error counts
    if (error) {
      metrics.errorsByCode[error.code] = (metrics.errorsByCode[error.code] || 0) + 1;
    }

    // Update metrics
    this.metrics.set(toolId, {
      ...metrics,
      executionCount: newCount,
      averageExecutionTime: newAverageTime,
      successRate: newSuccessRate,
      lastExecuted: new Date(),
    });
  }
}