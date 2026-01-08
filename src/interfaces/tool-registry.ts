// Tool Registry interfaces

import {
  ToolRegistry,
  BusinessTool,
  ToolParameters,
  ToolResult,
  ToolCategory,
  ToolExecutionContext,
  ToolVersion,
  ToolCompatibility,
} from '../types/tools';

export interface IToolRegistry extends ToolRegistry {
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  validateTool(tool: BusinessTool): Promise<ValidationResult>;
  getToolMetrics(toolId: string): Promise<ToolMetrics>;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
}

export interface ToolMetrics {
  toolId: string;
  executionCount: number;
  averageExecutionTime: number;
  successRate: number;
  lastExecuted: Date;
  errorsByCode: Record<string, number>;
}

export interface IToolExecutor {
  execute(
    toolId: string,
    parameters: ToolParameters,
    context: ToolExecutionContext
  ): Promise<ToolResult>;

  validateParameters(toolId: string, parameters: ToolParameters): Promise<ValidationResult>;
  checkPermissions(toolId: string, context: ToolExecutionContext): Promise<boolean>;
  checkRateLimit(toolId: string, context: ToolExecutionContext): Promise<RateLimitResult>;
}

export interface RateLimitResult {
  allowed: boolean;
  remainingCalls: number;
  resetTime: Date;
  retryAfter?: number;
}

export interface IToolVersionManager {
  registerVersion(toolId: string, version: ToolVersion): Promise<void>;
  getVersion(toolId: string, version: string): Promise<ToolVersion | null>;
  listVersions(toolId: string): Promise<ToolVersion[]>;
  checkCompatibility(toolId: string, requiredVersion: string): Promise<ToolCompatibility>;
  deprecateVersion(toolId: string, version: string, deprecationDate: Date): Promise<void>;
}

export interface IToolCatalog {
  searchTools(query: ToolSearchQuery): Promise<ToolSearchResult[]>;
  getToolsByCategory(category: ToolCategory): Promise<BusinessTool[]>;
  getPopularTools(limit?: number): Promise<BusinessTool[]>;
  getRecommendedTools(context: ToolRecommendationContext): Promise<BusinessTool[]>;
}

export interface ToolSearchQuery {
  query?: string;
  category?: ToolCategory;
  tags?: string[];
  minVersion?: string;
  maxVersion?: string;
  limit?: number;
  offset?: number;
}

export interface ToolSearchResult {
  tool: BusinessTool;
  relevanceScore: number;
  matchedFields: string[];
}

export interface ToolRecommendationContext {
  userId: string;
  businessProfile?: unknown;
  recentlyUsedTools: string[];
  currentWorkflow?: string;
}
