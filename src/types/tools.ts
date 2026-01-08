// Tool Registry types

export interface ToolRegistry {
  registerTool(tool: BusinessTool): Promise<void>;
  getTool(toolId: string, version?: string): Promise<BusinessTool>;
  executeTool(toolId: string, parameters: ToolParameters): Promise<ToolResult>;
  listAvailableTools(category?: ToolCategory): Promise<BusinessTool[]>;
}

export interface BusinessTool {
  id: string;
  name: string;
  description: string;
  version: string;
  category: ToolCategory;
  inputSchema: JSONSchema;
  outputSchema: JSONSchema;
  execute: (parameters: ToolParameters) => Promise<ToolResult>;
  metadata?: ToolMetadata;
}

export interface ToolMetadata {
  author: string;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  deprecated?: boolean;
  replacedBy?: string;
}

export enum ToolCategory {
  BUSINESS_ANALYTICS = 'business_analytics',
  PRODUCT_MANAGEMENT = 'product_management',
  SEO_OPTIMIZATION = 'seo_optimization',
  MARKETING = 'marketing',
  ACCOUNT_MANAGEMENT = 'account_management',
  DATA_INTEGRATION = 'data_integration',
  REPORTING = 'reporting',
}

export interface JSONSchema {
  type: string;
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface JSONSchemaProperty {
  type: string;
  description?: string;
  enum?: unknown[];
  format?: string;
  minimum?: number;
  maximum?: number;
  items?: JSONSchema;
  properties?: Record<string, JSONSchemaProperty>;
}

export type ToolParameters = Record<string, unknown>;

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: ToolError;
  metadata?: ToolResultMetadata;
}

export interface ToolError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ToolResultMetadata {
  executionTime: number;
  dataSource?: string;
  cacheHit?: boolean;
  version: string;
}

// Tool execution context
export interface ToolExecutionContext {
  userId: string;
  sessionId: string;
  businessProfile?: BusinessProfile;
  permissions: ToolPermission[];
  rateLimits: RateLimit[];
}

export interface ToolPermission {
  toolId: string;
  actions: string[];
  restrictions?: Record<string, unknown>;
}

export interface RateLimit {
  toolId: string;
  maxCalls: number;
  windowSeconds: number;
  currentCalls: number;
  resetTime: Date;
}

// Tool versioning and compatibility
export interface ToolVersion {
  version: string;
  releaseDate: Date;
  changelog: string;
  breakingChanges: boolean;
  compatibleVersions: string[];
}

export interface ToolCompatibility {
  minVersion: string;
  maxVersion?: string;
  deprecationDate?: Date;
  migrationGuide?: string;
}

// Import BusinessProfile from business types
import { BusinessProfile } from './business';
