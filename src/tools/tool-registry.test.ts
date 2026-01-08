import { ToolRegistry } from './tool-registry';
import { BusinessTool, ToolCategory, ToolParameters, ToolResult } from '../types/tools';
import { ToolValidationError, ToolNotFoundError } from '../utils/errors';

describe('ToolRegistry', () => {
  let registry: ToolRegistry;

  beforeEach(async () => {
    registry = new ToolRegistry();
    await registry.initialize();
  });

  afterEach(async () => {
    await registry.shutdown();
  });

  describe('Tool Registration', () => {
    it('should register a valid tool successfully', async () => {
      const tool: BusinessTool = {
        id: 'test-tool',
        name: 'Test Tool',
        description: 'A test tool',
        version: '1.0.0',
        category: ToolCategory.BUSINESS_ANALYTICS,
        inputSchema: {
          type: 'object',
          properties: {
            param1: { type: 'string' },
          },
          required: ['param1'],
        },
        outputSchema: {
          type: 'object',
          properties: {
            result: { type: 'string' },
          },
        },
        execute: async (params: ToolParameters): Promise<ToolResult> => ({
          success: true,
          data: { result: `Hello ${params.param1}` },
        }),
      };

      await expect(registry.registerTool(tool)).resolves.not.toThrow();
      
      const retrievedTool = await registry.getTool('test-tool');
      expect(retrievedTool.id).toBe('test-tool');
      expect(retrievedTool.version).toBe('1.0.0');
    });

    it('should support tool versioning', async () => {
      const toolV1: BusinessTool = {
        id: 'versioned-tool',
        name: 'Versioned Tool',
        description: 'A versioned tool',
        version: '1.0.0',
        category: ToolCategory.BUSINESS_ANALYTICS,
        inputSchema: { type: 'object' },
        outputSchema: { type: 'object' },
        execute: async () => ({ success: true, data: { version: '1.0.0' } }),
      };

      const toolV2: BusinessTool = {
        ...toolV1,
        version: '2.0.0',
        execute: async () => ({ success: true, data: { version: '2.0.0' } }),
      };

      await registry.registerTool(toolV1);
      await registry.registerTool(toolV2);

      // Should get latest version by default
      const latestTool = await registry.getTool('versioned-tool');
      expect(latestTool.version).toBe('2.0.0');

      // Should be able to get specific version
      const specificTool = await registry.getTool('versioned-tool', '1.0.0');
      expect(specificTool.version).toBe('1.0.0');
    });

    it('should validate tool parameters against schema', async () => {
      const tool: BusinessTool = {
        id: 'validation-tool',
        name: 'Validation Tool',
        description: 'A tool for testing validation',
        version: '1.0.0',
        category: ToolCategory.BUSINESS_ANALYTICS,
        inputSchema: {
          type: 'object',
          properties: {
            requiredParam: { type: 'string' },
            optionalParam: { type: 'number' },
          },
          required: ['requiredParam'],
        },
        outputSchema: { type: 'object' },
        execute: async (params: ToolParameters): Promise<ToolResult> => ({
          success: true,
          data: params,
        }),
      };

      await registry.registerTool(tool);

      // Valid parameters should work
      const validResult = await registry.executeTool('validation-tool', {
        requiredParam: 'test',
        optionalParam: 42,
      });
      expect(validResult.success).toBe(true);

      // Missing required parameter should fail with validation error
      await expect(registry.executeTool('validation-tool', {
        optionalParam: 42,
      })).rejects.toThrow(ToolValidationError);
    });

    it('should reject invalid tools', async () => {
      const invalidTool = {
        id: '',
        name: 'Invalid Tool',
        version: 'invalid-version',
        category: 'INVALID_CATEGORY' as ToolCategory,
        inputSchema: { type: 'object' },
        outputSchema: { type: 'object' },
        // Missing execute function
      } as BusinessTool;

      await expect(registry.registerTool(invalidTool)).rejects.toThrow(ToolValidationError);
    });
  });

  describe('Tool Execution', () => {
    beforeEach(async () => {
      const tool: BusinessTool = {
        id: 'execution-tool',
        name: 'Execution Tool',
        description: 'A tool for testing execution',
        version: '1.0.0',
        category: ToolCategory.BUSINESS_ANALYTICS,
        inputSchema: {
          type: 'object',
          properties: {
            input: { type: 'string' },
          },
          required: ['input'],
        },
        outputSchema: { type: 'object' },
        execute: async (params: ToolParameters): Promise<ToolResult> => {
          if (params.input === 'error') {
            throw new Error('Test error');
          }
          return {
            success: true,
            data: { output: `Processed: ${params.input}` },
          };
        },
      };

      await registry.registerTool(tool);
    });

    it('should execute tool successfully with valid parameters', async () => {
      const result = await registry.executeTool('execution-tool', { input: 'test' });
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ output: 'Processed: test' });
      expect(result.metadata?.executionTime).toBeGreaterThanOrEqual(0);
    });

    it('should handle tool execution errors gracefully', async () => {
      const result = await registry.executeTool('execution-tool', { input: 'error' });
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Test error');
      expect(result.metadata?.executionTime).toBeGreaterThanOrEqual(0);
    });

    it('should throw error for non-existent tool', async () => {
      await expect(registry.executeTool('non-existent', {})).rejects.toThrow(ToolNotFoundError);
    });
  });

  describe('Tool Listing and Metrics', () => {
    beforeEach(async () => {
      const tools: BusinessTool[] = [
        {
          id: 'analytics-tool',
          name: 'Analytics Tool',
          description: 'Analytics tool',
          version: '1.0.0',
          category: ToolCategory.BUSINESS_ANALYTICS,
          inputSchema: { type: 'object' },
          outputSchema: { type: 'object' },
          execute: async () => ({ success: true }),
        },
        {
          id: 'marketing-tool',
          name: 'Marketing Tool',
          description: 'Marketing tool',
          version: '1.0.0',
          category: ToolCategory.MARKETING,
          inputSchema: { type: 'object' },
          outputSchema: { type: 'object' },
          execute: async () => ({ success: true }),
        },
      ];

      for (const tool of tools) {
        await registry.registerTool(tool);
      }
    });

    it('should list all available tools', async () => {
      const tools = await registry.listAvailableTools();
      expect(tools).toHaveLength(2);
      expect(tools.map(t => t.id)).toContain('analytics-tool');
      expect(tools.map(t => t.id)).toContain('marketing-tool');
    });

    it('should filter tools by category', async () => {
      const analyticsTools = await registry.listAvailableTools(ToolCategory.BUSINESS_ANALYTICS);
      expect(analyticsTools).toHaveLength(1);
      expect(analyticsTools[0]?.id).toBe('analytics-tool');

      const marketingTools = await registry.listAvailableTools(ToolCategory.MARKETING);
      expect(marketingTools).toHaveLength(1);
      expect(marketingTools[0]?.id).toBe('marketing-tool');
    });

    it('should track tool metrics', async () => {
      // Execute tool to generate metrics
      await registry.executeTool('analytics-tool', {});
      
      const metrics = await registry.getToolMetrics('analytics-tool');
      expect(metrics.toolId).toBe('analytics-tool');
      expect(metrics.executionCount).toBe(1);
      expect(metrics.successRate).toBe(1.0);
      expect(metrics.averageExecutionTime).toBeGreaterThanOrEqual(0);
    });
  });
});