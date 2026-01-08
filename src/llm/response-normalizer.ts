// LLM Response Normalizer implementation

import {
  TextGenerationResponse,
  ToolGenerationResponse,
  StreamChunk,
  FinishReason,
  TokenUsage,
} from '../types/llm';
import {
  ILLMResponseNormalizer,
} from '../interfaces/llm-abstraction';
import { ValidationError } from '../utils/errors';

export class LLMResponseNormalizer implements ILLMResponseNormalizer {
  normalizeTextResponse(response: unknown, providerName: string): TextGenerationResponse {
    if (!response || typeof response !== 'object') {
      throw new ValidationError('Response must be an object');
    }

    const resp = response as Record<string, unknown>;

    // Extract content based on provider format
    const content = this.extractContent(resp, providerName);
    const usage = this.extractUsage(resp, providerName);
    const finishReason = this.extractFinishReason(resp, providerName);

    const normalized: TextGenerationResponse = {
      content,
      usage,
      finishReason,
      metadata: {
        provider: providerName,
        originalResponse: response,
      },
    };

    this.validateTextResponse(normalized);
    return normalized;
  }

  normalizeToolResponse(response: unknown, providerName: string): ToolGenerationResponse {
    const textResponse = this.normalizeTextResponse(response, providerName);
    const toolCalls = this.extractToolCalls(response, providerName);

    return {
      ...textResponse,
      toolCalls,
    };
  }

  normalizeStreamChunk(chunk: unknown, providerName: string): StreamChunk {
    if (!chunk || typeof chunk !== 'object') {
      throw new ValidationError('Stream chunk must be an object');
    }

    const chunkObj = chunk as Record<string, unknown>;
    const content = this.extractStreamContent(chunkObj, providerName);
    const isComplete = this.extractStreamComplete(chunkObj, providerName);
    const usage = this.extractStreamUsage(chunkObj, providerName);

    return {
      content,
      isComplete,
      usage,
    };
  }

  private extractContent(response: Record<string, unknown>, providerName: string): string {
    switch (providerName.toLowerCase()) {
      case 'openai':
        return this.extractOpenAIContent(response);
      case 'anthropic':
        return this.extractAnthropicContent(response);
      default:
        // Generic extraction
        if (typeof response.content === 'string') {
          return response.content;
        }
        if (response.choices && Array.isArray(response.choices) && response.choices[0]) {
          const choice = response.choices[0] as Record<string, unknown>;
          if (choice.message && typeof choice.message === 'object') {
            const message = choice.message as Record<string, unknown>;
            return String(message.content || '');
          }
        }
        return '';
    }
  }

  private extractOpenAIContent(response: Record<string, unknown>): string {
    if (response.choices && Array.isArray(response.choices) && response.choices[0]) {
      const choice = response.choices[0] as Record<string, unknown>;
      if (choice.message && typeof choice.message === 'object') {
        const message = choice.message as Record<string, unknown>;
        return String(message.content || '');
      }
    }
    return '';
  }

  private extractAnthropicContent(response: Record<string, unknown>): string {
    if (response.content && Array.isArray(response.content)) {
      return response.content
        .filter((block: any) => block.type === 'text')
        .map((block: any) => block.text || '')
        .join('');
    }
    return '';
  }

  private extractUsage(response: Record<string, unknown>, providerName: string): TokenUsage {
    switch (providerName.toLowerCase()) {
      case 'openai':
        return this.extractOpenAIUsage(response);
      case 'anthropic':
        return this.extractAnthropicUsage(response);
      default:
        // Generic extraction
        if (response.usage && typeof response.usage === 'object') {
          const usage = response.usage as Record<string, unknown>;
          return {
            promptTokens: Number(usage.prompt_tokens || usage.input_tokens || 0),
            completionTokens: Number(usage.completion_tokens || usage.output_tokens || 0),
            totalTokens: Number(usage.total_tokens || 0),
          };
        }
        return { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    }
  }

  private extractOpenAIUsage(response: Record<string, unknown>): TokenUsage {
    if (response.usage && typeof response.usage === 'object') {
      const usage = response.usage as Record<string, unknown>;
      return {
        promptTokens: Number(usage.prompt_tokens || 0),
        completionTokens: Number(usage.completion_tokens || 0),
        totalTokens: Number(usage.total_tokens || 0),
      };
    }
    return { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
  }

  private extractAnthropicUsage(response: Record<string, unknown>): TokenUsage {
    if (response.usage && typeof response.usage === 'object') {
      const usage = response.usage as Record<string, unknown>;
      const promptTokens = Number(usage.input_tokens || 0);
      const completionTokens = Number(usage.output_tokens || 0);
      return {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
      };
    }
    return { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
  }

  private extractFinishReason(response: Record<string, unknown>, providerName: string): FinishReason {
    switch (providerName.toLowerCase()) {
      case 'openai':
        return this.extractOpenAIFinishReason(response);
      case 'anthropic':
        return this.extractAnthropicFinishReason(response);
      default:
        return FinishReason.STOP;
    }
  }

  private extractOpenAIFinishReason(response: Record<string, unknown>): FinishReason {
    if (response.choices && Array.isArray(response.choices) && response.choices[0]) {
      const choice = response.choices[0] as Record<string, unknown>;
      const reason = String(choice.finish_reason || 'stop');
      
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
    return FinishReason.STOP;
  }

  private extractAnthropicFinishReason(response: Record<string, unknown>): FinishReason {
    const reason = String(response.stop_reason || 'end_turn');
    
    switch (reason) {
      case 'end_turn':
        return FinishReason.STOP;
      case 'max_tokens':
        return FinishReason.LENGTH;
      case 'tool_use':
        return FinishReason.TOOL_CALLS;
      default:
        return FinishReason.STOP;
    }
  }

  private extractToolCalls(response: unknown, providerName: string): Array<{ id: string; name: string; parameters: Record<string, unknown> }> | undefined {
    if (!response || typeof response !== 'object') {
      return undefined;
    }

    const resp = response as Record<string, unknown>;

    switch (providerName.toLowerCase()) {
      case 'openai':
        return this.extractOpenAIToolCalls(resp);
      case 'anthropic':
        return this.extractAnthropicToolCalls(resp);
      default:
        return undefined;
    }
  }

  private extractOpenAIToolCalls(response: Record<string, unknown>): Array<{ id: string; name: string; parameters: Record<string, unknown> }> | undefined {
    if (response.choices && Array.isArray(response.choices) && response.choices[0]) {
      const choice = response.choices[0] as Record<string, unknown>;
      if (choice.message && typeof choice.message === 'object') {
        const message = choice.message as Record<string, unknown>;
        if (message.tool_calls && Array.isArray(message.tool_calls)) {
          return message.tool_calls.map((toolCall: any) => ({
            id: toolCall.id,
            name: toolCall.function.name,
            parameters: JSON.parse(toolCall.function.arguments),
          }));
        }
      }
    }
    return undefined;
  }

  private extractAnthropicToolCalls(response: Record<string, unknown>): Array<{ id: string; name: string; parameters: Record<string, unknown> }> | undefined {
    if (response.content && Array.isArray(response.content)) {
      const toolUses = response.content.filter((block: any) => block.type === 'tool_use');
      if (toolUses.length > 0) {
        return toolUses.map((block: any) => ({
          id: block.id || '',
          name: block.name || '',
          parameters: block.input || {},
        }));
      }
    }
    return undefined;
  }

  private extractStreamContent(chunk: Record<string, unknown>, providerName: string): string {
    switch (providerName.toLowerCase()) {
      case 'openai':
        if (chunk.choices && Array.isArray(chunk.choices) && chunk.choices[0]) {
          const choice = chunk.choices[0] as Record<string, unknown>;
          if (choice.delta && typeof choice.delta === 'object') {
            const delta = choice.delta as Record<string, unknown>;
            return String(delta.content || '');
          }
        }
        return '';
      case 'anthropic':
        if (chunk.delta && typeof chunk.delta === 'object') {
          const delta = chunk.delta as Record<string, unknown>;
          return String(delta.text || '');
        }
        return '';
      default:
        return String(chunk.content || '');
    }
  }

  private extractStreamComplete(chunk: Record<string, unknown>, providerName: string): boolean {
    switch (providerName.toLowerCase()) {
      case 'openai':
        if (chunk.choices && Array.isArray(chunk.choices) && chunk.choices[0]) {
          const choice = chunk.choices[0] as Record<string, unknown>;
          return choice.finish_reason !== null && choice.finish_reason !== undefined;
        }
        return false;
      case 'anthropic':
        return chunk.type === 'message_stop';
      default:
        return Boolean(chunk.isComplete);
    }
  }

  private extractStreamUsage(chunk: Record<string, unknown>, providerName: string): TokenUsage | undefined {
    if (chunk.usage && typeof chunk.usage === 'object') {
      return this.extractUsage(chunk, providerName);
    }
    return undefined;
  }

  private validateTextResponse(response: TextGenerationResponse): void {
    if (typeof response.content !== 'string') {
      throw new ValidationError('Response content must be a string');
    }
    if (!response.usage || typeof response.usage !== 'object') {
      throw new ValidationError('Response usage is required');
    }
    if (!response.finishReason) {
      throw new ValidationError('Response finish reason is required');
    }
  }
}