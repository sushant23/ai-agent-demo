// Example usage of Agent Core and Flow Router

import { AgentCoreImpl } from './agent-core';
import { FlowRouterImpl } from '../flow/flow-router';
import { UserInput, ConversationContext, WorkflowType } from '../types/agent';
import { ILLMProviderRegistry } from '../interfaces/llm-abstraction';

// Simplified mock for demonstration
class MockLLMRegistry implements ILLMProviderRegistry {
  async registerProvider(): Promise<void> {}
  async getProvider(): Promise<any> {
    return {
      name: 'mock-provider',
      generateText: async () => ({
        content: 'Mock response for business analysis',
        usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
        finishReason: 'stop' as any,
      }),
    };
  }
  async listProviders(): Promise<any[]> { return []; }
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

export async function demonstrateFlowRouter() {
  console.log('=== Flow Router Demonstration ===');
  
  const llmRegistry = new MockLLMRegistry();
  const flowRouter = new FlowRouterImpl(llmRegistry);
  
  const userInput: UserInput = {
    content: 'I want to optimize my product SEO',
    userId: 'user-123',
    sessionId: 'session-456',
    timestamp: new Date(),
  };

  const context: ConversationContext = {
    userId: 'user-123',
    sessionId: 'session-456',
    businessData: {} as any,
    recommendations: new Map(),
    conversationHistory: [],
    userPreferences: {
      language: 'en',
      timezone: 'UTC',
      currency: 'USD',
      notificationSettings: {
        emailEnabled: true,
        pushEnabled: true,
        smsEnabled: false,
        frequency: 'daily',
      },
      displaySettings: {
        theme: 'light',
        compactMode: false,
        showAdvancedMetrics: true,
      },
    },
    lastUpdated: new Date(),
  };

  try {
    // Classify intent
    console.log('Classifying intent for:', userInput.content);
    const intent = await flowRouter.classifyIntent(userInput, context);
    
    console.log('Intent Classification:');
    console.log('- Intent:', intent.intent);
    console.log('- Category:', intent.category);
    console.log('- Confidence:', intent.confidence);
    console.log('- Entities:', intent.entities);
    
    // Select appropriate flow
    const flow = flowRouter.selectFlow(intent);
    console.log('Selected Flow:', flow.name);
    console.log('Flow Description:', flow.description);
    
    // List all available flows
    const allFlows = flowRouter.listFlows();
    console.log('Available Flows:', allFlows.map(f => f.name));
    
    return { intent, flow, allFlows };
  } catch (error) {
    console.error('Error in flow router:', error);
    throw error;
  }
}

export function demonstrateFlowDefinitions() {
  console.log('=== Flow Definitions Demonstration ===');
  
  const { FlowDefinitions } = require('../flow/flow-definitions');
  
  // Get all flows
  const allFlows = FlowDefinitions.getAllFlows();
  console.log('Total flows defined:', allFlows.length);
  
  // Group by category
  const flowsByCategory = allFlows.reduce((acc: Record<string, any[]>, flow: any) => {
    if (!acc[flow.category]) {
      acc[flow.category] = [];
    }
    acc[flow.category]!.push(flow);
    return acc;
  }, {} as Record<string, any[]>);
  
  console.log('Flows by category:');
  Object.entries(flowsByCategory).forEach(([category, flows]) => {
    const flowArray = flows as any[];
    console.log(`- ${category}: ${flowArray.length} flows`);
    flowArray.forEach((flow: any) => {
      console.log(`  * ${flow.name}: ${flow.description}`);
    });
  });
  
  // Demonstrate specific flow lookup
  const seoFlow = FlowDefinitions.getFlowById('seo_analysis');
  if (seoFlow) {
    console.log('\nSEO Analysis Flow Details:');
    console.log('- Required Tools:', seoFlow.requiredTools);
    console.log('- Expected Inputs:', seoFlow.expectedInputs.map((i: any) => i.name));
    console.log('- Next Step Actions:', seoFlow.nextStepActions.map((a: any) => a.title));
  }
  
  return { allFlows, flowsByCategory, seoFlow };
}

// Run demonstrations if this file is executed directly
if (require.main === module) {
  (async () => {
    console.log('=== Agent Core and Flow Router Demonstration ===\n');
    
    try {
      demonstrateFlowDefinitions();
      console.log('\n');
      await demonstrateFlowRouter();
      
      console.log('\n=== Demonstration Complete ===');
    } catch (error) {
      console.error('Demonstration failed:', error);
    }
  })();
}