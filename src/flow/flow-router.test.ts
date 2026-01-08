// Flow Router tests

import { FlowRouterImpl } from './flow-router';
import { FlowDefinitions } from './flow-definitions';
import { ILLMProviderRegistry } from '../interfaces/llm-abstraction';
import { LLMProvider, TextGenerationRequest, TextGenerationResponse, FinishReason } from '../types/llm';
import { UserInput, FlowCategory, ConversationContext } from '../types/agent';
import { UserPreferences } from '../types/context';

// Mock LLM Provider for testing
class MockLLMProvider implements LLMProvider {
  name = 'mock-provider';
  capabilities = {
    maxTokens: 4000,
    supportsTools: true,
    supportsStreaming: false,
    supportsFunctionCalling: true,
  };

  async generateText(request: TextGenerationRequest): Promise<TextGenerationResponse> {
    // Mock intent classification response
    const mockResponse = {
      intent: 'seo_analysis',
      confidence: 0.8,
      category: 'BUSINESS_PERFORMANCE',
      entities: [
        { name: 'product', value: 'test-product', confidence: 0.9 }
      ]
    };

    return {
      content: JSON.stringify(mockResponse),
      usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      finishReason: FinishReason.STOP,
    };
  }

  async generateWithTools(): Promise<any> {
    throw new Error('Not implemented for test');
  }

  async *streamGeneration(): AsyncIterable<any> {
    yield { content: 'test', done: true };
    throw new Error('Not implemented for test');
  }
}

// Mock LLM Provider Registry
class MockLLMProviderRegistry implements ILLMProviderRegistry {
  private providers = new Map<string, LLMProvider>();

  constructor() {
    this.providers.set('primary', new MockLLMProvider());
  }

  async registerProvider(): Promise<void> {}
  async getProvider(name: string): Promise<LLMProvider | null> {
    return this.providers.get(name) || null;
  }
  async listProviders(): Promise<LLMProvider[]> {
    return Array.from(this.providers.values());
  }
  async removeProvider(): Promise<void> {}
  async updateProviderConfig(): Promise<void> {}
  async getProviderConfig(): Promise<any> { return null; }
  async getProviderStats(): Promise<any> { return null; }
  async getAllProviderStats(): Promise<any[]> { return []; }
  updateProviderStats(): void {}
  incrementRequestCount(): void {}
  incrementErrorCount(): void {}
  updateResponseTime(): void {}
}

// Helper function to create mock context
function createMockContext(): ConversationContext {
  const mockPreferences: UserPreferences = {
    language: 'en',
    timezone: 'UTC',
    currency: 'USD',
    notificationSettings: {
      emailEnabled: true,
      pushEnabled: false,
      smsEnabled: false,
      frequency: 'daily',
    },
    displaySettings: {
      theme: 'light',
      compactMode: false,
      showAdvancedMetrics: true,
    },
  };

  return {
    userId: 'test-user',
    sessionId: 'test-session',
    businessData: {} as any,
    recommendations: new Map(),
    conversationHistory: [],
    userPreferences: mockPreferences,
    lastUpdated: new Date(),
  };
}

describe('FlowRouter', () => {
  let flowRouter: FlowRouterImpl;
  let mockRegistry: MockLLMProviderRegistry;

  beforeEach(() => {
    mockRegistry = new MockLLMProviderRegistry();
    flowRouter = new FlowRouterImpl(mockRegistry);
  });

  describe('Intent Classification', () => {
    it('should classify business performance intent correctly', async () => {
      const userInput: UserInput = {
        content: 'Show me my SEO performance for my products',
        userId: 'test-user',
        sessionId: 'test-session',
        timestamp: new Date(),
      };

      const context = createMockContext();

      const classification = await flowRouter.classifyIntent(userInput, context);

      expect(classification.intent).toBe('seo_analysis');
      expect(classification.confidence).toBe(0.8);
      expect(classification.category).toBe(FlowCategory.BUSINESS_PERFORMANCE);
      expect(classification.entities).toHaveLength(1);
      expect(classification.entities[0]?.name).toBe('product');
    });

    it('should fallback to rule-based classification when LLM fails', async () => {
      // Create a registry that returns null provider
      class FailingRegistry implements ILLMProviderRegistry {
        async registerProvider(): Promise<void> {}
        async getProvider(): Promise<LLMProvider | null> { return null; }
        async listProviders(): Promise<LLMProvider[]> { return []; }
        async removeProvider(): Promise<void> {}
        async updateProviderConfig(): Promise<void> {}
        async getProviderConfig(): Promise<any> { return null; }
        async getProviderStats(): Promise<any> { return null; }
        async getAllProviderStats(): Promise<any[]> { return []; }
        updateProviderStats(): void {}
        incrementRequestCount(): void {}
        incrementErrorCount(): void {}
        updateResponseTime(): void {}
      }

      const failingRouter = new FlowRouterImpl(new FailingRegistry());

      const userInput: UserInput = {
        content: 'Show me my revenue and profit margins',
        userId: 'test-user',
        sessionId: 'test-session',
        timestamp: new Date(),
      };

      const context = createMockContext();

      const classification = await failingRouter.classifyIntent(userInput, context);

      expect(classification.category).toBe(FlowCategory.BUSINESS_PERFORMANCE);
      expect(classification.confidence).toBe(0.7);
    });
  });

  describe('Flow Selection', () => {
    it('should select appropriate flow based on intent classification', () => {
      const intent = {
        intent: 'seo_analysis',
        confidence: 0.8,
        entities: [],
        category: FlowCategory.BUSINESS_PERFORMANCE,
      };

      const selectedFlow = flowRouter.selectFlow(intent);

      expect(selectedFlow.category).toBe(FlowCategory.BUSINESS_PERFORMANCE);
      expect(selectedFlow.id).toBeDefined();
      expect(selectedFlow.name).toBeDefined();
    });

    it('should return default flow for unknown intents', () => {
      const intent = {
        intent: 'unknown_intent',
        confidence: 0.3,
        entities: [],
        category: FlowCategory.GENERAL,
      };

      const selectedFlow = flowRouter.selectFlow(intent);

      expect(selectedFlow).toBeDefined();
      expect(selectedFlow.category).toBe(FlowCategory.GENERAL);
    });
  });

  describe('Flow Execution', () => {
    it('should execute flow and return response', async () => {
      const flow = FlowDefinitions.getFlowById('seo_analysis')!;
      const userInput: UserInput = {
        content: 'Analyze my SEO performance',
        userId: 'test-user',
        sessionId: 'test-session',
        timestamp: new Date(),
      };

      const parameters = {
        input: userInput,
        context: createMockContext(),
        intent: {
          intent: 'seo_analysis',
          confidence: 0.8,
          entities: [],
          category: FlowCategory.BUSINESS_PERFORMANCE,
        },
      };

      const result = await flowRouter.executeFlow(flow, parameters);

      expect(result.response).toBeDefined();
      expect(result.response.content).toContain('SEO Performance Analysis');
      expect(result.response.nextStepActions).toHaveLength(4);
      expect(result.flowState).toBeDefined();
      expect(result.flowState.currentStep).toBe('completed');
    });
  });

  describe('Flow Management', () => {
    it('should register and retrieve flows', () => {
      const testFlow = {
        id: 'test-flow',
        name: 'Test Flow',
        description: 'A test flow',
        category: FlowCategory.GENERAL,
        requiredTools: [],
        expectedInputs: [],
        outputFormat: { format: 'text', fields: {} },
        nextStepActions: [],
      };

      flowRouter.registerFlow(testFlow);
      const flows = flowRouter.listFlows();
      
      expect(flows.find(f => f.id === 'test-flow')).toBeDefined();
    });

    it('should update existing flows', () => {
      const testFlow = {
        id: 'test-flow-update',
        name: 'Test Flow',
        description: 'A test flow',
        category: FlowCategory.GENERAL,
        requiredTools: [],
        expectedInputs: [],
        outputFormat: { format: 'text', fields: {} },
        nextStepActions: [],
      };

      flowRouter.registerFlow(testFlow);
      flowRouter.updateFlow('test-flow-update', { name: 'Updated Test Flow' });
      
      const flows = flowRouter.listFlows();
      const updatedFlow = flows.find(f => f.id === 'test-flow-update');
      
      expect(updatedFlow?.name).toBe('Updated Test Flow');
    });

    it('should remove flows', () => {
      const testFlow = {
        id: 'test-flow-remove',
        name: 'Test Flow',
        description: 'A test flow',
        category: FlowCategory.GENERAL,
        requiredTools: [],
        expectedInputs: [],
        outputFormat: { format: 'text', fields: {} },
        nextStepActions: [],
      };

      flowRouter.registerFlow(testFlow);
      flowRouter.removeFlow('test-flow-remove');
      
      const flows = flowRouter.listFlows();
      expect(flows.find(f => f.id === 'test-flow-remove')).toBeUndefined();
    });
  });
});