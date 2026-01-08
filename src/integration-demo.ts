/**
 * Integration Demo
 * 
 * Demonstrates the complete LLM Agnostic AI Agent system
 * with all components wired together and comprehensive error handling.
 */

import { createLLMAgnosticAIAgent } from './app';
import type { UserInput } from './types';

/**
 * Demo configuration (using mock/test values)
 */
const demoConfig = {
  llm: {
    openai: {
      enabled: true,
      apiKey: 'demo-key-openai', // This will fail, demonstrating error handling
      model: 'gpt-4',
      maxTokens: 2000,
      temperature: 0.7
    },
    anthropic: {
      enabled: true,
      apiKey: 'demo-key-anthropic', // This will fail, demonstrating error handling
      model: 'claude-3-sonnet-20240229',
      maxTokens: 2000,
      temperature: 0.7
    },
    loadBalancer: {
      strategy: 'round_robin' as const,
      maxRetries: 2,
      retryDelay: 1000
    }
  }
};

/**
 * Run integration demo
 */
export async function runIntegrationDemo(): Promise<void> {
  console.log('🚀 Starting LLM Agnostic AI Agent Integration Demo...\n');
  
  try {
    // Initialize the complete application
    console.log('📦 Initializing application with all components...');
    const agent = await createLLMAgnosticAIAgent(demoConfig);
    console.log('✅ Application initialized successfully\n');
    
    // Check initial health status
    console.log('🏥 Checking system health...');
    const initialHealth = await agent.getHealthStatus();
    console.log(`System Status: ${initialHealth.status}`);
    console.log('Component Health:', Object.entries(initialHealth.components)
      .map(([name, status]) => `${name}: ${status}`)
      .join(', '));
    
    if (initialHealth.errorMonitoring) {
      console.log(`Error Monitoring: ${initialHealth.errorMonitoring.enabled ? 'Enabled' : 'Disabled'}`);
      console.log(`Error Rate: ${initialHealth.errorMonitoring.errorRate} errors/min`);
    }
    console.log('');
    
    // Test user inputs that will trigger various error scenarios
    const testInputs: UserInput[] = [
      {
        content: "What are my top performing products this month?",
        userId: "demo-user",
        sessionId: "demo-session",
        timestamp: new Date(),
        metadata: { source: 'demo', scenario: 'business_data_request' }
      },
      {
        content: "Help me optimize my SEO for my best selling product",
        userId: "demo-user",
        sessionId: "demo-session", 
        timestamp: new Date(),
        metadata: { source: 'demo', scenario: 'seo_optimization' }
      },
      {
        content: "Create a marketing campaign for my electronics category",
        userId: "demo-user",
        sessionId: "demo-session",
        timestamp: new Date(),
        metadata: { source: 'demo', scenario: 'marketing_campaign' }
      }
    ];
    
    // Process each input and demonstrate error handling
    for (const input of testInputs) {
      const index = testInputs.indexOf(input) + 1;
      console.log(`💬 Processing request ${index}: "${input.content}"`);
      
      try {
        const response = await agent.processUserInput(input, input.userId, input.sessionId);
        
        console.log('🤖 Agent Response:');
        console.log(`Content: ${response.content.substring(0, 150)}...`);
        console.log(`Next Actions: ${response.nextStepActions?.length || 0} available`);
        
        if (response.metadata.isError) {
          console.log(`⚠️  Error handled gracefully: ${response.metadata.errorCode}`);
        }
        
        console.log('');
        
      } catch (error) {
        console.error(`❌ Unexpected error processing input ${index}:`, 
          error instanceof Error ? error.message : error);
        console.log('');
      }
    }
    
    // Demonstrate error metrics and monitoring
    console.log('📊 Error Metrics and Monitoring:');
    const errorMetrics = agent.getErrorMetrics();
    console.log(`Total Errors: ${errorMetrics.globalMetrics.totalErrors}`);
    console.log(`Error Rate: ${errorMetrics.globalMetrics.errorRate} errors/min`);
    console.log(`System Health: ${errorMetrics.healthStatus.isHealthy ? 'Healthy' : 'Degraded'}`);
    console.log(`Monitoring Status: ${errorMetrics.monitoringStatus.enabled ? 'Active' : 'Inactive'}`);
    
    // Show recent errors
    const recentErrors = agent.getRecentErrors(5);
    if (recentErrors.length > 0) {
      console.log('\n🔍 Recent Errors:');
      recentErrors.forEach((error, index) => {
        console.log(`${index + 1}. [${error.component}] ${error.errorCode}: ${error.message}`);
      });
    }
    console.log('');
    
    // Test business profile retrieval (will likely fail gracefully)
    console.log('👤 Testing business profile retrieval...');
    const profile = await agent.getBusinessProfile("demo-user");
    if (profile) {
      console.log(`Business Profile: ${profile.businessName}`);
    } else {
      console.log('No business profile found (expected with demo configuration)');
    }
    console.log('');
    
    // Final health check
    console.log('🏥 Final system health check...');
    const finalHealth = await agent.getHealthStatus();
    console.log(`Final System Status: ${finalHealth.status}`);
    console.log(`Components Healthy: ${Object.values(finalHealth.components)
      .filter(status => status === 'healthy').length}/${Object.keys(finalHealth.components).length}`);
    
    if (finalHealth.errorMonitoring) {
      console.log(`Final Error Rate: ${finalHealth.errorMonitoring.errorRate} errors/min`);
      console.log(`Total Recent Errors: ${finalHealth.errorMonitoring.recentErrors}`);
    }
    console.log('');
    
    // Graceful shutdown
    console.log('🛑 Shutting down application...');
    await agent.shutdown();
    console.log('✅ Application shutdown complete');
    
    console.log('\n🎉 Integration Demo Completed Successfully!');
    console.log('\nKey Demonstrations:');
    console.log('✓ Complete application initialization with dependency injection');
    console.log('✓ Comprehensive error handling with user-friendly messages');
    console.log('✓ Error monitoring and metrics collection');
    console.log('✓ Graceful degradation when services are unavailable');
    console.log('✓ Health monitoring across all system components');
    console.log('✓ Clean shutdown with resource cleanup');
    
  } catch (error) {
    console.error('❌ Demo failed with critical error:', 
      error instanceof Error ? error.message : error);
    
    if (error instanceof Error && error.stack) {
      console.error('Stack trace:', error.stack);
    }
    
    process.exit(1);
  }
}

// Run demo if this file is executed directly
if (require.main === module) {
  runIntegrationDemo().catch(console.error);
}