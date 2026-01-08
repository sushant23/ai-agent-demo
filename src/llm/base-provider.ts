// Base LLM Provider abstract class with common functionality

import {
  LLMProvider,
  LLMCapabilities,
  TextGenerationRequest,
  TextGenerationResponse,
  ToolGenerationRequest,
  ToolGenerationResponse,
  StreamRequest,
  StreamChunk,
  ProviderConfig,
  TokenUsage,
  FinishReason,
  MessageRole,
} from '../types/llm';
import { LLMProviderError, ValidationError } from '../utils/errors';

export abstract class BaseLLMProvider implements LLMProvider {
  public readonly name: string;
  public readonly capabilities: LLMCapabilities;
  protected config: ProviderConfig;
  protected isInitialized: boolean = false;

  constructor(config: ProviderConfig, capabilities: LLMCapabilities) {
    this.name = config.name;
    this.config = config;
    this.capabilities = capabilities;
    this.validateConfig(config);
    this.validateCapabilities(capabilities);
  }

  // Abstract methods that concrete providers must implement
  abstract generateText(request: TextGenerationRequest): Promise<TextGenerationResponse>;
  abstract generateWithTools(request: ToolGenerationRequest): Promise<ToolGenerationResponse>;
  abstract streamGeneration(request: StreamRequest): AsyncIterable<StreamChunk>;

  // Common functionality
  protected validateConfig(config: ProviderConfig): void {
    if (!config.name || config.name.trim() === '') {
      throw new ValidationError('Provider name is required');
    }
    if (!config.apiKey || config.apiKey.trim() === '') {
      throw new ValidationError('API key is required');
    }
    if (!config.model || config.model.trim() === '') {
      throw new ValidationError('Model name is required');
    }
    if (typeof config.priority !== 'number' || config.priority < 0) {
      throw new ValidationError('Priority must be a non-negative number');
    }
  }

  protected validateCapabilities(capabilities: LLMCapabilities): void {
    if (!capabilities.maxTokens || capabilities.maxTokens <= 0) {
      throw new ValidationError('Max tokens must be a positive number');
    }
    if (typeof capabilities.supportsTools !== 'boolean') {
      throw new ValidationError('supportsTools must be a boolean');
    }
    if (typeof capabilities.supportsStreaming !== 'boolean') {
      throw new ValidationError('supportsStreaming must be a boolean');
    }
    if (typeof capabilities.supportsFunctionCalling !== 'boolean') {
      throw new ValidationError('supportsFunctionCalling must be a boolean');
    }
  }

  protected validateTextRequest(request: TextGenerationRequest): void {
    if (!request.messages || request.messages.length === 0) {
      throw new ValidationError('Messages array is required and cannot be empty');
    }

    if (request.temperature !== undefined) {
      if (typeof request.temperature !== 'number' || request.temperature < 0 || request.temperature > 2) {
        throw new ValidationError('Temperature must be a number between 0 and 2');
      }
    }

    if (request.maxTokens !== undefined) {
      if (typeof request.maxTokens !== 'number' || request.maxTokens <= 0) {
        throw new ValidationError('Max tokens must be a positive number');
      }
      if (request.maxTokens > this.capabilities.maxTokens) {
        throw new ValidationError(`Max tokens (${request.maxTokens}) exceeds provider limit (${this.capabilities.maxTokens})`);
      }
    }
  }

  protected validateToolRequest(request: ToolGenerationRequest): void {
    this.validateTextRequest(request);

    if (!this.capabilities.supportsTools) {
      throw new ValidationError(`Provider ${this.name} does not support tool calling`);
    }

    if (!request.tools || request.tools.length === 0) {
      throw new ValidationError('Tools array is required for tool generation');
    }

    // Validate each tool definition
    for (const tool of request.tools) {
      if (!tool.name || tool.name.trim() === '') {
        throw new ValidationError('Tool name is required');
      }
      if (!tool.description || tool.description.trim() === '') {
        throw new ValidationError('Tool description is required');
      }
      if (!tool.parameters || typeof tool.parameters !== 'object') {
        throw new ValidationError('Tool parameters must be an object (JSON Schema)');
      }
    }
  }

  protected validateStreamRequest(request: StreamRequest): void {
    this.validateTextRequest(request);

    if (!this.capabilities.supportsStreaming) {
      throw new ValidationError(`Provider ${this.name} does not support streaming`);
    }
  }

  // Capability detection methods
  public hasCapability(capability: keyof LLMCapabilities): boolean {
    return this.capabilities[capability] as boolean;
  }

  public canHandleRequest(request: TextGenerationRequest | ToolGenerationRequest | StreamRequest): boolean {
    try {
      if ('tools' in request) {
        this.validateToolRequest(request as ToolGenerationRequest);
      } else if ('onChunk' in request) {
        this.validateStreamRequest(request as StreamRequest);
      } else {
        this.validateTextRequest(request);
      }
      return true;
    } catch (error) {
      return false;
    }
  }

  // Health check method
  public async healthCheck(): Promise<boolean> {
    try {
      const testRequest: TextGenerationRequest = {
        messages: [
          {
            id: 'health-check',
            role: MessageRole.USER,
            content: 'Hello',
            timestamp: new Date(),
          },
        ],
        maxTokens: 10,
        temperature: 0,
      };

      const response = await this.generateText(testRequest);
      return response.content.length > 0;
    } catch (error) {
      return false;
    }
  }

  // Common error handling
  protected handleProviderError(error: unknown, operation: string): never {
    if (error instanceof LLMProviderError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new LLMProviderError(
      `${this.name} provider failed during ${operation}: ${message}`,
      this.name,
      operation
    );
  }

  // Common response validation
  protected validateResponse(response: TextGenerationResponse): void {
    if (!response.content && response.content !== '') {
      throw new ValidationError('Response content is required');
    }
    if (!response.usage) {
      throw new ValidationError('Response usage information is required');
    }
    if (!response.finishReason) {
      throw new ValidationError('Response finish reason is required');
    }
  }

  // Utility methods for token usage
  protected createTokenUsage(promptTokens: number, completionTokens: number): TokenUsage {
    return {
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
    };
  }

  // Configuration management
  public getConfig(): Readonly<ProviderConfig> {
    return { ...this.config };
  }

  public updateConfig(updates: Partial<ProviderConfig>): void {
    const newConfig = { ...this.config, ...updates };
    this.validateConfig(newConfig);
    this.config = newConfig;
  }

  public isEnabled(): boolean {
    return this.config.enabled;
  }

  public getPriority(): number {
    return this.config.priority;
  }
}