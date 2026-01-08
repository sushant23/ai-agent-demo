/**
 * Example usage of the LLM Agnostic AI Agent application
 * 
 * This file demonstrates how to initialize and use the complete application
 * with all components wired together.
 */

import { createLLMAgnosticAIAgent, LLMAgnosticAIAgent } from './app';
import type { UserInput } from './types';

/**
 * Example configuration for the application
 */
const exampleConfig = {
  llm: {
    openai: {
      enabled: true,
      apiKey: process.env.OPENAI_API_KEY || 'your-openai-api-key',
      model: 'gpt-4',
      maxTokens: 2000,
      temperature: 0.7
    },
    anthropic: {
      enabled: true,
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
        enabled: true,
        apiKey: process.env.SHOPIFY_API_KEY || 'your-shopify-key',
        shopDomain: process.env.SHOPIFY_SHOP_DOMAIN || 'your-shop.myshopify.com'
      },
      amazon: {
        enabled: false
      },
      ebay: {
        enabled: false
      }
    }
  }
};

/**
 * Example function demonstrating basic application usage
 */
export async function runBasicExample(): Promise<void> {
  console.log('🚀 Starting LLM Agnostic AI Agent Example...');
  
  try {
    // Create and initialize the application
    const agent = await createLLMAgnosticAIAgent(exampleConfig);
    
    console.log('✅ Application initialized successfully');
    
    // Check health status
    const health = await agent.getHealthStatus();
    console.log('🏥 Health Status:', health.status);
    console.log('📊 Component Status:', health.components);
    
    // Example user inputs
    const exampleInputs: UserInput[] = [
      {
        content: "What are my top performing products this month?",
        userId: "user123",
        sessionId: "session1",
        timestamp: new Date(),
        metadata: { source: 'web' }
      },
      {
        content: "Help me optimize my SEO for my best selling product",
        userId: "user123", 
        sessionId: "session1",
        timestamp: new Date(),
        metadata: { source: 'web' }
      },
      {
        content: "Create a marketing campaign for my electronics category",
        userId: "user123",
        sessionId: "session1",
        timestamp: new Date(),
        metadata: { source: 'web' }
      }
    ];
    
    // Process each example input
    for (const input of exampleInputs) {
      const index = exampleInputs.indexOf(input) + 1;
      console.log(`\n💬 Processing input ${index}: "${input.content}"`);
      
      try {
        const response = await agent.processUserInput(input, input.userId);
        
        console.log('🤖 Agent Response:');
        console.log('Content:', response.content.substring(0, 200) + '...');
        console.log('Next Actions:', response.nextStepActions?.map(action => action.title));
        console.log('UI Actions:', response.uiActions?.map(action => action.type));
        console.log('Recommendations:', response.recommendations?.length || 0, 'recommendations');
        
      } catch (error) {
        console.error(`❌ Error processing input ${index}:`, error instanceof Error ? error.message : error);
      }
    }
    
    // Get business profile example
    try {
      const profile = await agent.getBusinessProfile("user123");
      if (profile) {
        console.log('\n👤 Business Profile:', profile.businessName);
        console.log('📧 Email:', profile.primaryEmail);
        console.log('🛒 Connected Marketplaces:', profile.connectedMarketplaces?.length || 0);
      } else {
        console.log('\n👤 No business profile found for user123');
      }
    } catch (error) {
      console.error('❌ Error getting business profile:', error instanceof Error ? error.message : error);
    }
    
    // Shutdown gracefully
    await agent.shutdown();
    console.log('\n✅ Application shutdown complete');
    
  } catch (error) {
    console.error('❌ Application error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

/**
 * Example function demonstrating configuration updates
 */
export async function runConfigurationExample(): Promise<void> {
  console.log('🔧 Starting Configuration Update Example...');
  
  try {
    const agent = await createLLMAgnosticAIAgent(exampleConfig);
    
    // Update configuration
    await agent.updateConfiguration({
      llm: {
        ...exampleConfig.llm,
        loadBalancer: {
          strategy: 'least_loaded',
          maxRetries: 5,
          retryDelay: 2000
        }
      }
    });
    
    console.log('✅ Configuration updated successfully');
    
    await agent.shutdown();
    
  } catch (error) {
    console.error('❌ Configuration update error:', error instanceof Error ? error.message : error);
  }
}

/**
 * Example function demonstrating error handling
 */
export async function runErrorHandlingExample(): Promise<void> {
  console.log('⚠️ Starting Error Handling Example...');
  
  try {
    // Create agent with invalid configuration to test error handling
    const invalidConfig = {
      llm: {
        openai: {
          enabled: true,
          apiKey: 'invalid-key',
          model: 'gpt-4',
          maxTokens: 2000,
          temperature: 0.7
        }
      }
    };
    
    const agent = await createLLMAgnosticAIAgent(invalidConfig);
    
    // Try to process input with invalid LLM configuration
    const input: UserInput = {
      content: "This should trigger error handling",
      userId: "test-user",
      sessionId: "test-session",
      timestamp: new Date(),
      metadata: { source: 'test' }
    };
    
    try {
      const response = await agent.processUserInput(input, input.userId);
      console.log('🤖 Response received despite invalid config:', response.content.substring(0, 100));
    } catch (error) {
      console.log('✅ Error handling working correctly:', error instanceof Error ? error.message : error);
    }
    
    await agent.shutdown();
    
  } catch (error) {
    console.log('✅ Initialization error handling working:', error instanceof Error ? error.message : error);
  }
}

/**
 * Run all examples
 */
export async function runAllExamples(): Promise<void> {
  console.log('🎯 Running All LLM Agnostic AI Agent Examples...\n');
  
  await runBasicExample();
  console.log('\n' + '='.repeat(50) + '\n');
  
  await runConfigurationExample();
  console.log('\n' + '='.repeat(50) + '\n');
  
  await runErrorHandlingExample();
  
  console.log('\n🎉 All examples completed!');
}

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}