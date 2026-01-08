// Flow Router implementation

import {
  FlowRouter,
  UserInput,
  ConversationContext,
  IntentClassification,
  ConversationFlow,
  FlowParameters,
  FlowResult,
  FlowCategory,
  Entity,
  AgentResponse,
  FlowState,
  AgentError,
} from '../types/agent';
import { ILLMProviderRegistry } from '../interfaces/llm-abstraction';
import { TextGenerationRequest, MessageRole } from '../types/llm';

export class FlowRouterImpl implements FlowRouter {
  private flows: Map<string, ConversationFlow> = new Map();
  private intentClassificationPrompt: string;

  constructor(private llmRegistry: ILLMProviderRegistry) {
    this.intentClassificationPrompt = this.buildIntentClassificationPrompt();
    this.initializeDefaultFlows();
  }

  async classifyIntent(
    input: UserInput,
    context: ConversationContext
  ): Promise<IntentClassification> {
    try {
      // Get the first available provider instead of looking for 'primary'
      const providers = await this.llmRegistry.listProviders();
      const provider = providers.length > 0 ? providers[0] : null;
      if (!provider) {
        throw new Error('No LLM provider available for intent classification');
      }

      const request: TextGenerationRequest = {
        messages: [
          {
            role: MessageRole.SYSTEM,
            content: this.intentClassificationPrompt,
            timestamp: new Date(),
            id: `system-${Date.now()}`,
          },
          {
            role: MessageRole.USER,
            content: this.buildClassificationContext(input, context),
            timestamp: input.timestamp,
            id: `user-${input.userId}-${Date.now()}`,
          },
        ],
        temperature: 0.1,
        maxTokens: 500,
      };

      const response = await provider.generateText(request);
      return this.parseIntentClassification(response.content);
    } catch (error) {
      // Fallback to rule-based classification
      return this.fallbackIntentClassification(input);
    }
  }

  selectFlow(intent: IntentClassification): ConversationFlow {
    // Find the most appropriate flow based on intent and category
    const categoryFlows = Array.from(this.flows.values()).filter(
      (flow) => flow.category === intent.category
    );

    if (categoryFlows.length === 0) {
      return this.getDefaultFlow();
    }

    // Select flow based on intent confidence and flow specificity
    const bestFlow = categoryFlows.reduce((best, current) => {
      const currentScore = this.calculateFlowScore(current, intent);
      const bestScore = this.calculateFlowScore(best, intent);
      return currentScore > bestScore ? current : best;
    });

    return bestFlow;
  }

  async executeFlow(
    flow: ConversationFlow,
    parameters: FlowParameters
  ): Promise<FlowResult> {
    const startTime = Date.now();
    
    try {
      // Initialize flow state
      const flowState: FlowState = {
        currentStep: 'initialize',
        completedSteps: [],
        variables: {},
      };

      // Execute flow logic based on flow type
      const response = await this.executeFlowLogic(flow, parameters, flowState);

      // Update flow state
      flowState.currentStep = 'completed';
      flowState.completedSteps.push('initialize', 'execute', 'completed');

      return {
        response,
        flowState,
        nextFlow: this.determineNextFlow(flow, parameters, response) || undefined,
      };
    } catch (error) {
      console.error(error)
      throw new AgentError({
        code: 'FLOW_EXECUTION_ERROR',
        message: `Failed to execute flow ${flow.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { flowId: flow.id, parameters },
        recoverable: true,
        timestamp: new Date(),
      });
    }
  }

  // Flow management methods
  registerFlow(flow: ConversationFlow): void {
    this.flows.set(flow.id, flow);
  }

  updateFlow(flowId: string, updates: Partial<ConversationFlow>): void {
    const existingFlow = this.flows.get(flowId);
    if (existingFlow) {
      this.flows.set(flowId, { ...existingFlow, ...updates });
    }
  }

  removeFlow(flowId: string): void {
    this.flows.delete(flowId);
  }

  listFlows(): ConversationFlow[] {
    return Array.from(this.flows.values());
  }

  private buildIntentClassificationPrompt(): string {
    return `You are an intent classifier for an e-commerce business AI agent. 
Analyze the user input and classify it into one of these categories:

BUSINESS_PERFORMANCE: Questions about revenue, sales, SEO scores, profitability analysis
PRODUCT_MANAGEMENT: Product catalog queries, inventory, product optimization, listings
MARKETING: Campaign creation, email marketing, advertising strategy, promotions
ACCOUNT_MANAGEMENT: Profile settings, subscription management, business goals, preferences
GENERAL: Greetings, help requests, unclear queries

Extract entities like product names, time periods, specific metrics mentioned.

Respond in JSON format:
{
  "intent": "specific_intent_name",
  "confidence": 0.0-1.0,
  "category": "CATEGORY_NAME",
  "entities": [{"name": "entity_type", "value": "entity_value", "confidence": 0.0-1.0}]
}`;
  }

  private buildClassificationContext(input: UserInput, context: ConversationContext): string {
    const contextInfo = {
      userInput: input.content,
      previousFlow: context.currentFlow,
      activeProduct: context.activeProduct,
      recentRecommendations: context.recommendations.size > 0,
      conversationLength: context.conversationHistory.length,
    };

    return `User Input: "${input.content}"
Context: ${JSON.stringify(contextInfo, null, 2)}

Classify this input:`;
  }

  private parseIntentClassification(content: string): IntentClassification {
    try {
      const parsed = JSON.parse(content);
      return {
        intent: parsed.intent || 'unknown',
        confidence: parsed.confidence || 0.5,
        entities: parsed.entities || [],
        category: this.mapToFlowCategory(parsed.category),
      };
    } catch (error) {
      // Fallback parsing
      return {
        intent: 'unknown',
        confidence: 0.3,
        entities: [],
        category: FlowCategory.GENERAL,
      };
    }
  }

  private fallbackIntentClassification(input: UserInput): IntentClassification {
    const content = input.content.toLowerCase();
    
    // Simple keyword-based classification
    if (content.includes('revenue') || content.includes('sales') || content.includes('profit')) {
      return {
        intent: 'business_analysis',
        confidence: 0.7,
        entities: [],
        category: FlowCategory.BUSINESS_PERFORMANCE,
      };
    }
    
    if (content.includes('product') || content.includes('inventory') || content.includes('catalog')) {
      return {
        intent: 'product_management',
        confidence: 0.7,
        entities: [],
        category: FlowCategory.PRODUCT_MANAGEMENT,
      };
    }
    
    if (content.includes('marketing') || content.includes('campaign') || content.includes('email')) {
      return {
        intent: 'marketing_strategy',
        confidence: 0.7,
        entities: [],
        category: FlowCategory.MARKETING,
      };
    }
    
    if (content.includes('account') || content.includes('profile') || content.includes('subscription')) {
      return {
        intent: 'account_management',
        confidence: 0.7,
        entities: [],
        category: FlowCategory.ACCOUNT_MANAGEMENT,
      };
    }

    return {
      intent: 'general_inquiry',
      confidence: 0.5,
      entities: [],
      category: FlowCategory.GENERAL,
    };
  }

  private mapToFlowCategory(category: string): FlowCategory {
    switch (category?.toUpperCase()) {
      case 'BUSINESS_PERFORMANCE':
        return FlowCategory.BUSINESS_PERFORMANCE;
      case 'PRODUCT_MANAGEMENT':
        return FlowCategory.PRODUCT_MANAGEMENT;
      case 'MARKETING':
        return FlowCategory.MARKETING;
      case 'ACCOUNT_MANAGEMENT':
        return FlowCategory.ACCOUNT_MANAGEMENT;
      default:
        return FlowCategory.GENERAL;
    }
  }

  private calculateFlowScore(flow: ConversationFlow, intent: IntentClassification): number {
    let score = 0;
    
    // Base score for category match
    if (flow.category === intent.category) {
      score += 50;
    }
    
    // Bonus for intent name similarity
    if (flow.name.toLowerCase().includes(intent.intent.toLowerCase())) {
      score += 30;
    }
    
    // Bonus for entity matches in flow description
    intent.entities.forEach(entity => {
      if (flow.description.toLowerCase().includes(entity.value.toLowerCase())) {
        score += entity.confidence * 20;
      }
    });
    
    return score;
  }

  private async executeFlowLogic(
    flow: ConversationFlow,
    parameters: FlowParameters,
    flowState: FlowState
  ): Promise<AgentResponse> {
    // Get the first available provider instead of looking for 'primary'
    const providers = await this.llmRegistry.listProviders();
    console.log({providers})
    const provider = providers.length > 0 ? providers[0] : null;
    if (!provider) {
      throw new Error('No LLM provider available for flow execution');
    }

    // For now, this is a simplified flow execution
    // In a real implementation, this would delegate to specific flow handlers
    // and potentially use tools based on the flow requirements
    const response: AgentResponse = {
      content: `Executing ${flow.name} flow for your request: "${parameters.input.content}"`,
      nextStepActions: flow.nextStepActions,
      metadata: {
        processingTime: Date.now() - parameters.input.timestamp.getTime(),
        provider: provider.name,
        workflow: 'routing' as any,
        confidence: parameters.intent.confidence,
        flowId: flow.id,
      },
    };

    return response;
  }

  private determineNextFlow(
    currentFlow: ConversationFlow,
    parameters: FlowParameters,
    response: AgentResponse
  ): string | undefined {
    // Logic to determine if there should be a follow-up flow
    // This is simplified - real implementation would be more sophisticated
    if (parameters.intent.confidence < 0.7) {
      return 'clarification_flow';
    }
    
    return undefined;
  }

  private getDefaultFlow(): ConversationFlow {
    return this.flows.get('general_assistance') || {
      id: 'fallback',
      name: 'General Assistance',
      description: 'Fallback flow for unclassified intents',
      category: FlowCategory.GENERAL,
      requiredTools: [],
      expectedInputs: [],
      outputFormat: { format: 'text', fields: {} },
      nextStepActions: [],
    };
  }

  private initializeDefaultFlows(): void {
    // Import and register all predefined flows
    const { FlowDefinitions } = require('./flow-definitions');
    const allFlows = FlowDefinitions.getAllFlows();
    
    allFlows.forEach((flow: ConversationFlow) => {
      this.registerFlow(flow);
    });

    // Add a basic general flow as fallback
    this.registerFlow({
      id: 'general_assistance',
      name: 'General Assistance',
      description: 'Provides general help and guidance',
      category: FlowCategory.GENERAL,
      requiredTools: [],
      expectedInputs: [
        {
          name: 'query',
          type: 'string',
          required: true,
          description: 'User question or request',
        },
      ],
      outputFormat: {
        format: 'structured_response',
        fields: {
          content: 'string',
          nextStepActions: 'array',
        },
      },
      nextStepActions: [
        {
          id: 'ask_clarification',
          title: 'Ask for clarification',
          description: 'Get more specific information about your needs',
          actionType: 'ask_question' as any,
        },
        {
          id: 'view_help',
          title: 'View help documentation',
          description: 'Browse available features and capabilities',
          actionType: 'view_analytics' as any,
        },
      ],
    });
  }
}