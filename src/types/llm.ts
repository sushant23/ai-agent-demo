// LLM Abstraction Layer types

export interface LLMProvider {
  name: string;
  capabilities: LLMCapabilities;

  generateText(request: TextGenerationRequest): Promise<TextGenerationResponse>;
  generateWithTools(request: ToolGenerationRequest): Promise<ToolGenerationResponse>;
  streamGeneration(request: StreamRequest): AsyncIterable<StreamChunk>;
}

export interface LLMCapabilities {
  maxTokens: number;
  supportsTools: boolean;
  supportsStreaming: boolean;
  supportsFunctionCalling: boolean;
}

export interface TextGenerationRequest {
  messages: Message[];
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface TextGenerationResponse {
  content: string;
  usage: TokenUsage;
  finishReason: FinishReason;
  metadata?: Record<string, unknown>;
}

export interface ToolGenerationRequest extends TextGenerationRequest {
  tools: ToolDefinition[];
  toolChoice?: 'auto' | 'none' | string;
}

export interface ToolGenerationResponse extends TextGenerationResponse {
  toolCalls?: ToolCall[] | undefined;
}

export interface StreamRequest extends TextGenerationRequest {
  onChunk?: (chunk: StreamChunk) => void;
}

export interface StreamChunk {
  content: string;
  isComplete: boolean;
  usage?: TokenUsage | undefined;
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  metadata?: MessageMetadata;
}

export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
  TOOL = 'tool',
}

export interface MessageMetadata {
  provider?: string;
  model?: string;
  toolCalls?: ToolCall[];
  [key: string]: unknown;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export enum FinishReason {
  STOP = 'stop',
  LENGTH = 'length',
  TOOL_CALLS = 'tool_calls',
  CONTENT_FILTER = 'content_filter',
  ERROR = 'error',
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema
}

export interface ToolCall {
  id: string;
  name: string;
  parameters: Record<string, unknown>;
}

// Provider Registry types
export interface ProviderConfig {
  name: string;
  apiKey: string;
  baseUrl?: string;
  model: string;
  priority: number;
  enabled: boolean;
}

export interface LoadBalancerConfig {
  strategy: 'round_robin' | 'least_loaded' | 'cost_optimized';
  fallbackEnabled: boolean;
  healthCheckInterval: number;
}
