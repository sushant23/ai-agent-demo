// Anthropic LLM Provider implementation

import {
  LLMCapabilities,
  TextGenerationRequest,
  TextGenerationResponse,
  ToolGenerationRequest,
  ToolGenerationResponse,
  StreamRequest,
  StreamChunk,
  ProviderConfig,
  FinishReason,
  MessageRole,
} from '../../types/llm';
import { BaseLLMProvider } from '../base-provider';
import { LLMProviderError } from '../../utils/errors';

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string | AnthropicContent[];
}

interface AnthropicContent {
  type: 'text' | 'tool_use' | 'tool_result';
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  content?: string;
  tool_use_id?: string;
}

interface AnthropicTool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

interface AnthropicResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: AnthropicContent[];
  model: string;
  stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use';
  stop_sequence?: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

interface AnthropicStreamEvent {
  type: 'message_start' | 'content_block_start' | 'content_block_delta' | 'content_block_stop' | 'message_delta' | 'message_stop';
  message?: Partial<AnthropicResponse>;
  content_block?: AnthropicContent;
  delta?: {
    type: 'text_delta' | 'input_json_delta';
    text?: string;
    partial_json?: string;
  };
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
}

export class AnthropicProvider extends BaseLLMProvider {
  private apiKey: string;
  private baseUrl: string;
  private version: string;

  constructor(config: ProviderConfig) {
    const capabilities: LLMCapabilities = {
      maxTokens: 200000, // Claude-3 context window
      supportsTools: true,
      supportsStreaming: true,
      supportsFunctionCalling: true,
    };

    super(config, capabilities);
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.anthropic.com';
    this.version = '2023-06-01';
  }

  async generateText(request: TextGenerationRequest): Promise<TextGenerationResponse> {
    this.validateTextRequest(request);

    try {
      const anthropicRequest = this.convertToAnthropicRequest(request);
      const response = await this.makeAnthropicRequest('/v1/messages', anthropicRequest);
      return this.normalizeTextResponse(response);
    } catch (error) {
      this.handleProviderError(error, 'generateText');
    }
  }

  async generateWithTools(request: ToolGenerationRequest): Promise<ToolGenerationResponse> {
    this.validateToolRequest(request);

    try {
      const anthropicRequest = this.convertToAnthropicToolRequest(request);
      const response = await this.makeAnthropicRequest('/v1/messages', anthropicRequest);
      return this.normalizeToolResponse(response);
    } catch (error) {
      this.handleProviderError(error, 'generateWithTools');
    }
  }

  async *streamGeneration(request: StreamRequest): AsyncIterable<StreamChunk> {
    this.validateStreamRequest(request);

    try {
      const anthropicRequest = {
        ...this.convertToAnthropicRequest(request),
        stream: true,
      };

      const response = await fetch(`${this.baseUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': this.version,
          'content-type': 'application/json',
        },
        body: JSON.stringify(anthropicRequest),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body available for streaming');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let accumulatedContent = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              
              try {
                const event = JSON.parse(data) as AnthropicStreamEvent;
                const chunk = this.normalizeStreamEvent(event, accumulatedContent);
                
                if (chunk) {
                  if (chunk.content) {
                    accumulatedContent += chunk.content;
                  }
                  
                  yield chunk;

                  if (request.onChunk) {
                    request.onChunk(chunk);
                  }
                }
              } catch (parseError) {
                // Skip invalid JSON chunks
                continue;
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      this.handleProviderError(error, 'streamGeneration');
    }
  }

  private convertToAnthropicRequest(request: TextGenerationRequest): Record<string, unknown> {
    const messages: AnthropicMessage[] = [];
    let systemPrompt = request.systemPrompt;

    // Convert messages, handling system messages
    for (const msg of request.messages) {
      if (msg.role === MessageRole.SYSTEM) {
        systemPrompt = msg.content;
        continue;
      }

      const role = this.convertRole(msg.role);
      if (role) {
        messages.push({
          role,
          content: msg.content,
        });
      }
    }

    const anthropicRequest: Record<string, unknown> = {
      model: this.config.model,
      messages,
      max_tokens: request.maxTokens || 4096,
    };

    if (systemPrompt) {
      anthropicRequest.system = systemPrompt;
    }

    if (request.temperature !== undefined) {
      anthropicRequest.temperature = request.temperature;
    }

    return anthropicRequest;
  }

  private convertToAnthropicToolRequest(request: ToolGenerationRequest): Record<string, unknown> {
    const baseRequest = this.convertToAnthropicRequest(request);
    
    const tools: AnthropicTool[] = request.tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.parameters,
    }));

    return {
      ...baseRequest,
      tools,
    };
  }

  private convertRole(role: MessageRole): 'user' | 'assistant' | null {
    switch (role) {
      case MessageRole.USER:
        return 'user';
      case MessageRole.ASSISTANT:
        return 'assistant';
      case MessageRole.SYSTEM:
        return null; // System messages are handled separately
      case MessageRole.TOOL:
        return 'user'; // Tool results are sent as user messages
      default:
        return 'user';
    }
  }

  private normalizeTextResponse(response: AnthropicResponse): TextGenerationResponse {
    const textContent = response.content
      .filter(block => block.type === 'text')
      .map(block => block.text || '')
      .join('');

    const finishReason = this.convertStopReason(response.stop_reason);

    const result: TextGenerationResponse = {
      content: textContent,
      usage: this.createTokenUsage(
        response.usage.input_tokens,
        response.usage.output_tokens
      ),
      finishReason,
      metadata: {
        provider: this.name,
        model: response.model,
        id: response.id,
      },
    };

    this.validateResponse(result);
    return result;
  }

  private normalizeToolResponse(response: AnthropicResponse): ToolGenerationResponse {
    const textResponse = this.normalizeTextResponse(response);

    const toolCalls = response.content
      .filter(block => block.type === 'tool_use')
      .map(block => ({
        id: block.id || '',
        name: block.name || '',
        parameters: block.input || {},
      }));

    return {
      ...textResponse,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    };
  }

  private normalizeStreamEvent(event: AnthropicStreamEvent, accumulatedContent: string): StreamChunk | null {
    switch (event.type) {
      case 'content_block_delta':
        if (event.delta?.type === 'text_delta' && event.delta.text) {
          return {
            content: event.delta.text,
            isComplete: false,
          };
        }
        break;

      case 'message_stop':
        return {
          content: '',
          isComplete: true,
          usage: event.usage ? this.createTokenUsage(
            event.usage.input_tokens || 0,
            event.usage.output_tokens || 0
          ) : undefined,
        };

      default:
        return null;
    }

    return null;
  }

  private convertStopReason(reason: string): FinishReason {
    switch (reason) {
      case 'end_turn':
        return FinishReason.STOP;
      case 'max_tokens':
        return FinishReason.LENGTH;
      case 'tool_use':
        return FinishReason.TOOL_CALLS;
      case 'stop_sequence':
        return FinishReason.STOP;
      default:
        return FinishReason.STOP;
    }
  }

  private async makeAnthropicRequest(endpoint: string, body: Record<string, unknown>): Promise<AnthropicResponse> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': this.version,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response.json() as Promise<AnthropicResponse>;
  }
}