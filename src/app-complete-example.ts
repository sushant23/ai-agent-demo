/**
 * Complete example demonstrating the LLM Agnostic AI Agent
 * with all components wired together and working end-to-end
 */

import { createLLMAgnosticAIAgent } from './app';
import type { UserInput } from './types/agent';

/**
 * Complete configuration example with all supported options
 */
const completeConfig = {
  llm: {
    openai: {
      enabled: process.env.OPENAI_API_KEY ? true : false,
      apiKey: process.env.OPENAI_API_KEY || 'your-openai-api-key',
      model: 'gpt-4',
      maxTokens: 2000,
      temperature: 0.7
    },
    anthropic: {
      enabled: process.env.ANTHROPIC_API_KEY ? true : false,
      apiKey: process.env.ANTHROPIC_API_KEY || 'your-anthropic-api-key',
      model: 'claude-3-sonnet-20240229',
      maxTokens: 2000,
      temperature: 0.7
    },
    loadBalancer: {
      strategy: 'round_robin' as const,
      maxRetries: 3,
      retryDelay: 1000
    }
  },
  business: {
    marketplaces: {
      shopify: {
        enabled: process.env.SHOPIFY_API_KEY ? true : false,
        apiKey: process.env.SHOPIFY_API_KEY || 'your-shopify-key',
        shopDomain: process.env.SHOPIFY_SHOP_DOMAIN || 'your-shop.myshopify.com'
      },
      amazon: {
        enabled: false // Can be enabled with proper credentials
      },
      ebay: {
        enabled: false // Can be enabled with proper credentials
      }
    }
  }
};

/**
 * Demonstration of complete application workflow
 */
export async function runCompleteExample(): Promise<void> {
  console.log('🚀 Starting Complete LLM Agnostic AI Agent Example...');
  console.log('📋 This example demonstrates the complete application workflow');
  
  let agent;
  
  try {
    // Step 1: Initialize the application
    console.log('\n📝 Step 1: Initializing Application...');
    agent = await createLLMAgnosticAIAgent(completeConfig);
    console.log('✅ Application initialized with all components wired together');
    
    // Step 2: Check system health
    console.log('\n📝 Step 2: Checking System Health...');
    const health = await agent.getHealthStatus();
    console.log(`🏥 Overall Health: ${health.status}`);
    console.log('📊 Component Health:');
    Object.entries(health.components).forEach(([component, status]) => {
      const icon = status === 'healthy' ? '✅' : '❌';
      console.log(`   ${icon} ${component}: ${status}`);
    });
    
    if (health.errorMonitoring) {
      console.log(`🔍 Error Monitoring: ${health.errorMonitoring.enabled ? 'Enabled' : 'Disabled'}`);
      console.log(`📈 Error Rate: ${health.errorMonitoring.errorRate.toFixed(2)}%`);
    }
    
    // Step 3: Demonstrate conversation flows
    console.log('\n📝 Step 3: Testing Conversation Flows...');
    
    const testUserId = 'demo-user-123';
    const sessionId = 'demo-session-456';
    
    // Example conversations that would work with real LLM providers
    const conversations: UserInput[] = [
      {
        content: "What are my top performing products this month?",
        userId: testUserId,
        sessionId: sessionId,
        timestamp: new Date(),
        metadata: { 
          source: 'web',
          flow: 'business_performance'
        }
      },
      {
        content: "Help me optimize SEO for my best selling product",
        userId: testUserId,
        sessionId: sessionId,
        timestamp: new Date(),
        metadata: { 
          source: 'web',
          flow: 'seo_optimization'
        }
      },
      {
        content: "Create a marketing campaign for electronics",
        userId: testUserId,
        sessionId: sessionId,
        timestamp: new Date(),
        metadata: { 
          source: 'web',
          flow: 'marketing_strategy'
        }
      },
      {
        content: "Show me my business analytics dashboard",
        userId: testUserId,
        sessionId: sessionId,
        timestamp: new Date(),
        metadata: { 
          source: 'web',
          flow: 'analytics_view'
        }
      }
    ];
    
    // Process each conversation
    for (const input of conversations) {
      const index = conversations.indexOf(input) + 1;
      console.log(`\n💬 Conversation ${index}: "${input.content}"`);
      
      try {
        const response = await agent.processUserInput(input, input.userId, input.sessionId);
        
        console.log('🤖 Agent Response:');
        console.log(`   Content: ${response.content.substring(0, 150)}${response.content.length > 150 ? '...' : ''}`);
        console.log(`   Next Actions: ${response.nextStepActions?.length || 0} available`);
        
        if (response.nextStepActions && response.nextStepActions.length > 0) {
          response.nextStepActions.forEach((action, idx) => {
            console.log(`     ${idx + 1}. ${action.title}`);
          });
        }
        
        if (response.uiActions && response.uiActions.length > 0) {
          console.log(`   UI Actions: ${response.uiActions.length} actions`);
          response.uiActions.forEach((action, idx) => {
            console.log(`     ${idx + 1}. ${action.type}: ${action.target}`);
          });
        }
        
        if (response.recommendations && response.recommendations.length > 0) {
          console.log(`   Recommendations: ${response.recommendations.length} generated`);
          response.recommendations.forEach((rec, idx) => {
            console.log(`     ${idx + 1}. ${rec.title} (${rec.category})`);
          });
        }
        
        console.log(`   Processing Time: ${response.metadata.processingTime}ms`);
        console.log(`   Provider: ${response.metadata.provider}`);
        console.log(`   Workflow: ${response.metadata.workflow}`);
        
      } catch (error) {
        console.log(`❌ Error processing conversation: ${error instanceof Error ? error.message : error}`);
        console.log('   This is expected when LLM providers are not configured with real API keys');
      }
    }
    
    // Step 4: Demonstrate business profile access
    console.log('\n📝 Step 4: Testing Business Profile Access...');
    try {
      const profile = await agent.getBusinessProfile(testUserId);
      if (profile) {
        console.log('👤 Business Profile Retrieved:');
        console.log(`   Business: ${profile.businessName}`);
        console.log(`   Email: ${profile.primaryEmail}`);
        console.log(`   Marketplaces: ${profile.connectedMarketplaces?.length || 0} connected`);
        console.log(`   Goals: ${profile.businessGoals?.length || 0} defined`);
      } else {
        console.log('👤 No business profile found (expected for demo user)');
      }
    } catch (error) {
      console.log(`❌ Error accessing business profile: ${error instanceof Error ? error.message : error}`);
    }
    
    // Step 5: Demonstrate configuration updates
    console.log('\n📝 Step 5: Testing Configuration Updates...');
    try {
      await agent.updateConfiguration({
        llm: {
          openai: {
            enabled: false, // Disable for demo
            apiKey: 'updated-demo-key',
            model: 'gpt-4',
            temperature: 0.5 // Updated temperature
          }
        }
      });
      console.log('✅ Configuration updated successfully');
      
      // Check health after config update
      const updatedHealth = await agent.getHealthStatus();
      console.log(`🏥 Health after config update: ${updatedHealth.status}`);
      
    } catch (error) {
      console.log(`❌ Error updating configuration: ${error instanceof Error ? error.message : error}`);
    }
    
    // Step 6: Demonstrate error monitoring
    console.log('\n📝 Step 6: Checking Error Monitoring...');
    try {
      const errorMetrics = agent.getErrorMetrics();
      console.log('📊 Error Monitoring Metrics:');
      console.log(`   Global Errors: ${errorMetrics.globalMetrics.totalErrors}`);
      console.log(`   Error Rate: ${errorMetrics.globalMetrics.errorRate.toFixed(2)}%`);
      console.log(`   Monitoring Enabled: ${errorMetrics.monitoringStatus.enabled}`);
      console.log(`   Health Status: ${errorMetrics.healthStatus.isHealthy ? 'Healthy' : 'Unhealthy'}`);
      
      const recentErrors = agent.getRecentErrors(5);
      console.log(`   Recent Errors: ${recentErrors.length} in buffer`);
      
    } catch (error) {
      console.log(`❌ Error checking error monitoring: ${error instanceof Error ? error.message : error}`);
    }
    
    // Step 7: Demonstrate component access
    console.log('\n📝 Step 7: Accessing Individual Components...');
    const components = agent.components;
    console.log('🔧 Available Components:');
    console.log(`   Agent Core: ${components.agentCore ? 'Available' : 'Not Available'}`);
    console.log(`   Flow Router: ${components.flowRouter ? 'Available' : 'Not Available'}`);
    console.log(`   Context Manager: ${components.contextManager ? 'Available' : 'Not Available'}`);
    console.log(`   Recommendation Engine: ${components.recommendationEngine ? 'Available' : 'Not Available'}`);
    console.log(`   Business Data Service: ${components.businessDataService ? 'Available' : 'Not Available'}`);
    console.log(`   UI Controller: ${components.uiController ? 'Available' : 'Not Available'}`);
    console.log(`   Tool Registry: ${components.toolRegistry ? 'Available' : 'Not Available'}`);
    console.log(`   LLM Provider Registry: ${components.llmProviderRegistry ? 'Available' : 'Not Available'}`);
    console.log(`   LLM Load Balancer: ${components.llmLoadBalancer ? 'Available' : 'Not Available'}`);
    console.log(`   LLM Health Monitor: ${components.llmHealthMonitor ? 'Available' : 'Not Available'}`);
    console.log(`   Progress Tracker: ${components.progressTracker ? 'Available' : 'Not Available'}`);
    console.log(`   Error Monitor: ${components.errorMonitor ? 'Available' : 'Not Available'}`);
    console.log(`   Global Error Handler: ${components.globalErrorHandler ? 'Available' : 'Not Available'}`);
    
    console.log('\n🎉 Complete example finished successfully!');
    console.log('📋 Summary:');
    console.log('   ✅ Application initialization and component wiring');
    console.log('   ✅ Health monitoring and status checking');
    console.log('   ✅ Conversation flow processing (with graceful error handling)');
    console.log('   ✅ Business profile management');
    console.log('   ✅ Configuration updates and hot reloading');
    console.log('   ✅ Error monitoring and metrics');
    console.log('   ✅ Component access and introspection');
    
  } catch (error) {
    console.error('❌ Complete example failed:', error instanceof Error ? error.message : error);
    if (error instanceof Error && error.stack) {
      console.error('Stack trace:', error.stack);
    }
    throw error;
  } finally {
    // Always shutdown gracefully
    if (agent) {
      console.log('\n📝 Final Step: Shutting down application...');
      try {
        await agent.shutdown();
        console.log('✅ Application shutdown completed');
      } catch (error) {
        console.error('❌ Error during shutdown:', error instanceof Error ? error.message : error);
      }
    }
  }
}

/**
 * Minimal example for quick testing
 */
export async function runMinimalExample(): Promise<void> {
  console.log('🚀 Running Minimal Example...');
  
  // Minimal config with no external dependencies
  const minimalConfig = {
    llm: {
      openai: {
        enabled: false,
        apiKey: 'demo-key',
        model: 'gpt-4'
      }
    }
  };
  
  const agent = await createLLMAgnosticAIAgent(minimalConfig);
  console.log('✅ Minimal application created and initialized');
  
  const health = await agent.getHealthStatus();
  console.log(`🏥 Health: ${health.status}`);
  
  await agent.shutdown();
  console.log('✅ Minimal example completed');
}

// Run examples if this file is executed directly
if (require.main === module) {
  const runExample = process.argv.includes('--minimal') ? runMinimalExample : runCompleteExample;
  
  runExample()
    .then(() => {
      console.log('\n🏆 Example completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Example failed:', error);
      process.exit(1);
    });
}