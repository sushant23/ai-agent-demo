// OpenAI LLM Provider implementation

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

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  tool_calls?: OpenAIToolCall[];
  tool_call_id?: string;
}

interface OpenAIToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

interface OpenAITool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: 'assistant';
      content: string | null;
      tool_calls?: OpenAIToolCall[];
    };
    finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter';
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface OpenAIStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: 'assistant';
      content?: string;
      tool_calls?: Array<{
        index: number;
        id?: string;
        type?: 'function';
        function?: {
          name?: string;
          arguments?: string;
        };
      }>;
    };
    finish_reason?: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null;
  }>;
}

export class OpenAIProvider extends BaseLLMProvider {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: ProviderConfig) {
    const capabilities: LLMCapabilities = {
      maxTokens: 128000, // GPT-4 context window
      supportsTools: true,
      supportsStreaming: true,
      supportsFunctionCalling: true,
    };

    super(config, capabilities);
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
  }

  async generateText(request: TextGenerationRequest): Promise<TextGenerationResponse> {
    this.validateTextRequest(request);

    try {
      const openAIRequest = this.convertToOpenAIRequest(request);
      const response = await this.makeOpenAIRequest('/chat/completions', openAIRequest);
      return this.normalizeTextResponse(response);
    } catch (error) {
      this.handleProviderError(error, 'generateText');
    }
  }

  async generateWithTools(request: ToolGenerationRequest): Promise<ToolGenerationResponse> {
    console.log(`🔧 OpenAI Provider: generateWithTools called with ${request.tools.length} tools`);
    this.validateToolRequest(request);

    try {
      const openAIRequest = this.convertToOpenAIToolRequest(request);
      const response = await this.makeOpenAIRequest('/chat/completions', openAIRequest);
      return this.normalizeToolResponse(response);
    } catch (error) {
      this.handleProviderError(error, 'generateWithTools');
    }
  }

  async *streamGeneration(request: StreamRequest): AsyncIterable<StreamChunk> {
    this.validateStreamRequest(request);

    try {
      const openAIRequest = {
        ...this.convertToOpenAIRequest(request),
        stream: true,
      };

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(openAIRequest),
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
              if (data === '[DONE]') {
                return;
              }

              try {
                const chunk = JSON.parse(data) as OpenAIStreamChunk;
                const normalizedChunk = this.normalizeStreamChunk(chunk);
                yield normalizedChunk;

                if (request.onChunk) {
                  request.onChunk(normalizedChunk);
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

  private convertToOpenAIRequest(request: TextGenerationRequest): Record<string, unknown> {
    const messages: OpenAIMessage[] = request.messages.map(msg => ({
      role: this.convertRole(msg.role),
      content: msg.content,
    }));

    // Add system prompt if provided
    if (request.systemPrompt) {
      messages.unshift({
        role: 'system',
        content: request.systemPrompt,
      });
    }

    return {
      model: this.config.model,
      messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens,
    };
  }

  private convertToOpenAIToolRequest(request: ToolGenerationRequest): Record<string, unknown> {
    const baseRequest = this.convertToOpenAIRequest(request);
    
    const tools: OpenAITool[] = request.tools.map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));

    return {
      ...baseRequest,
      tools,
      tool_choice: request.toolChoice || 'auto',
    };
  }

  private convertRole(role: MessageRole): 'system' | 'user' | 'assistant' | 'tool' {
    switch (role) {
      case MessageRole.SYSTEM:
        return 'system';
      case MessageRole.USER:
        return 'user';
      case MessageRole.ASSISTANT:
        return 'assistant';
      case MessageRole.TOOL:
        return 'tool';
      default:
        return 'user';
    }
  }

  private normalizeTextResponse(response: OpenAIResponse): TextGenerationResponse {
    const choice = response.choices[0];
    if (!choice) {
      throw new Error('No choices in OpenAI response');
    }

    const content = choice.message.content || '';
    const finishReason = this.convertFinishReason(choice.finish_reason);

    const result: TextGenerationResponse = {
      content,
      usage: this.createTokenUsage(
        response.usage.prompt_tokens,
        response.usage.completion_tokens
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

  private normalizeToolResponse(response: OpenAIResponse): ToolGenerationResponse {
    const textResponse = this.normalizeTextResponse(response);
    const choice = response.choices[0];

    if (!choice) {
      return {
        ...textResponse,
        toolCalls: undefined,
      };
    }

    const toolCalls = choice.message.tool_calls?.map(toolCall => ({
      id: toolCall.id,
      name: toolCall.function.name,
      parameters: JSON.parse(toolCall.function.arguments),
    }));

    return {
      ...textResponse,
      toolCalls,
    };
  }

  private normalizeStreamChunk(chunk: OpenAIStreamChunk): StreamChunk {
    const choice = chunk.choices[0];
    const content = choice?.delta?.content || '';
    const isComplete = choice?.finish_reason !== null && choice?.finish_reason !== undefined;

    return {
      content,
      isComplete,
      usage: undefined, // Usage not available in streaming
    };
  }

  private convertFinishReason(reason: string): FinishReason {
    switch (reason) {
      case 'stop':
        return FinishReason.STOP;
      case 'length':
        return FinishReason.LENGTH;
      case 'tool_calls':
        return FinishReason.TOOL_CALLS;
      case 'content_filter':
        return FinishReason.CONTENT_FILTER;
      default:
        return FinishReason.STOP;
    }
  }

  private async makeOpenAIRequest(endpoint: string, body: Record<string, unknown>): Promise<OpenAIResponse> {
    console.log({body: JSON.stringify(body)})
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response.json() as Promise<OpenAIResponse>;
  }
}