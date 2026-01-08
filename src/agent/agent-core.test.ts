// Agent Core tests

import { AgentCoreImpl } from './agent-core';
import { FlowRouterImpl } from '../flow/flow-router';
import { LLMProviderRegistry } from '../llm/provider-registry';
import { ContextManager } from '../context/context-manager';
import { ToolRegistry } from '../tools/tool-registry';
import { WorkflowType, UserInput, ConversationContext } from '../types/agent';
import { AgentConfig } from '../interfaces/agent-core';

describe('AgentCore', () => {
  let agentCore: AgentCoreImpl;
  let mockFlowRouter: jest.Mocked<FlowRouterImpl>;
  let mockLLMRegistry: jest.Mocked<LLMProviderRegistry>;
  let mockContextManager: jest.Mocked<ContextManager>;
  let mockToolRegistry: jest.Mocked<ToolRegistry>;

  const createMockContext = (): ConversationContext => ({
    userId: 'user123',
    sessionId: 'session123',
    conversationHistory: [],
    businessData: {} as any,
    recommendations: new Map(),
    lastUpdated: new Date(),
    userPreferences: {
      language: 'en',
      timezone: 'UTC',
      currency: 'USD',
      notificationSettings: {
        emailEnabled: true,
        pushEnabled: false,
        smsEnabled: false,
        frequency: 'daily' as const,
      },
      displaySettings: {
        theme: 'light' as const,
        compactMode: false,
        showAdvancedMetrics: true,
      },
    },
  });

  beforeEach(() => {
    mockFlowRouter = {
      classifyIntent: jest.fn(),
      selectFlow: jest.fn(),
      executeFlow: jest.fn(),
    } as any;

    mockLLMRegistry = {
      getProvider: jest.fn(),
    } as any;

    mockContextManager = {
      updateContext: jest.fn(),
    } as any;

    mockToolRegistry = {} as any;

    agentCore = new AgentCoreImpl(
      mockFlowRouter,
      mockLLMRegistry,
      mockContextManager,
      mockToolRegistry
    );
  });

  describe('initialization', () => {
    it('should initialize with proper configuration', async () => {
      const config: AgentConfig = {
        llmProvider: 'openai',
        fallbackProviders: ['anthropic'],
        maxRetries: 3,
        timeout: 5000,
        enableLogging: true,
        workflows: [
          { type: WorkflowType.ROUTING, enabled: true, parameters: {} },
          { type: WorkflowType.PROMPT_CHAINING, enabled: true, parameters: {} },
        ],
      };

      await agentCore.initialize(config);
      
      const status = agentCore.getStatus();
      expect(status.isRunning).toBe(true);
      expect(status.activeWorkflows).toBe(0);
      expect(status.totalRequests).toBe(0);
    });

    it('should shutdown gracefully', async () => {
      const config: AgentConfig = {
        llmProvider: 'openai',
        fallbackProviders: [],
        maxRetries: 1,
        timeout: 1000,
        enableLogging: false,
        workflows: [],
      };

      await agentCore.initialize(config);
      await agentCore.shutdown();
      
      const status = agentCore.getStatus();
      expect(status.isRunning).toBe(false);
      expect(status.activeWorkflows).toBe(0);
    });
  });

  describe('workflow execution', () => {
    beforeEach(async () => {
      const config: AgentConfig = {
        llmProvider: 'openai',
        fallbackProviders: [],
        maxRetries: 1,
        timeout: 1000,
        enableLogging: false,
        workflows: [
          { type: WorkflowType.ROUTING, enabled: true, parameters: {} },
        ],
      };
      await agentCore.initialize(config);
    });

    it('should execute routing workflow', async () => {
      const userInput: UserInput = {
        content: 'Help me analyze my product performance',
        userId: 'user123',
        sessionId: 'session123',
        timestamp: new Date(),
      };

      const context = createMockContext();

      // Mock the flow router responses
      mockFlowRouter.classifyIntent.mockResolvedValue({
        intent: 'analyze_product',
        confidence: 0.8,
        entities: [],
        category: 'business_performance' as any,
      });

      mockFlowRouter.selectFlow.mockReturnValue({
        id: 'product_analysis',
        name: 'Product Analysis Flow',
        description: 'Analyze product performance',
        category: 'business_performance' as any,
        requiredTools: [],
        expectedInputs: [],
        outputFormat: { format: 'text', fields: {} },
        nextStepActions: [],
      });

      mockFlowRouter.executeFlow.mockResolvedValue({
        response: {
          content: 'Here is your product analysis...',
          nextStepActions: [
            {
              id: 'view_details',
              title: 'View Details',
              description: 'See detailed analysis',
              actionType: 'view_analytics' as any,
            },
          ],
          metadata: {
            processingTime: 100,
            provider: 'test',
            workflow: WorkflowType.ROUTING,
            confidence: 0.8,
          },
        },
        flowState: {
          currentStep: 'completed',
          completedSteps: ['analysis'],
          variables: {},
        },
      });

      mockContextManager.updateContext.mockResolvedValue();

      const response = await agentCore.processUserInput(userInput, context);

      expect(response.content).toBe('Here is your product analysis...');
      expect(response.nextStepActions).toHaveLength(1);
      expect(response.metadata.workflow).toBe(WorkflowType.ROUTING);
      expect(mockContextManager.updateContext).toHaveBeenCalled();
    });

    it('should handle workflow execution errors gracefully', async () => {
      const userInput: UserInput = {
        content: 'Invalid request',
        userId: 'user123',
        sessionId: 'session123',
        timestamp: new Date(),
      };

      const context = createMockContext();

      mockFlowRouter.classifyIntent.mockRejectedValue(new Error('Classification failed'));

      const response = await agentCore.processUserInput(userInput, context);

      expect(response.content).toContain('encountered an issue');
      expect(response.nextStepActions.length).toBeGreaterThan(0);
    });
  });

  describe('workflow metrics', () => {
    beforeEach(async () => {
      const config: AgentConfig = {
        llmProvider: 'openai',
        fallbackProviders: [],
        maxRetries: 1,
        timeout: 1000,
        enableLogging: false,
        workflows: [
          { type: WorkflowType.ROUTING, enabled: true, parameters: {} },
        ],
      };
      await agentCore.initialize(config);
    });

    it('should track workflow metrics', async () => {
      const metrics = await agentCore.getWorkflowMetrics(WorkflowType.ROUTING);
      
      expect(metrics.type).toBe(WorkflowType.ROUTING);
      expect(metrics.executionCount).toBe(0);
      expect(metrics.successRate).toBe(1.0);
      expect(metrics.averageExecutionTime).toBe(0);
    });

    it('should throw error for non-existent workflow metrics', async () => {
      await expect(
        agentCore.getWorkflowMetrics(WorkflowType.AUTONOMOUS_AGENT)
      ).rejects.toThrow('No metrics found for workflow type');
    });
  });

  describe('workflow handlers', () => {
    beforeEach(async () => {
      const config: AgentConfig = {
        llmProvider: 'openai',
        fallbackProviders: [],
        maxRetries: 1,
        timeout: 1000,
        enableLogging: false,
        workflows: [],
      };
      await agentCore.initialize(config);
    });

    it('should register custom workflow handlers', () => {
      const customHandler = {
        execute: jest.fn(),
        validate: jest.fn().mockReturnValue(true),
        getRequiredCapabilities: jest.fn().mockReturnValue(['custom']),
      };

      agentCore.registerWorkflowHandler(WorkflowType.AUTONOMOUS_AGENT, customHandler);

      // Test passes if no error is thrown during registration
      expect(customHandler.validate).toBeDefined();
      expect(customHandler.execute).toBeDefined();
      expect(customHandler.getRequiredCapabilities).toBeDefined();
    });
  });
});