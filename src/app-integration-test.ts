/**
 * Integration test for the main application
 * Tests that all components can be wired together successfully
 */

import { LLMAgnosticAIAgent, createLLMAgnosticAIAgent } from './app';

async function testApplicationIntegration(): Promise<void> {
  console.log('🧪 Testing LLM Agnostic AI Agent Integration...');
  
  try {
    // Test 1: Create application with minimal config
    console.log('📝 Test 1: Creating application with minimal config...');
    const minimalConfig = {
      llm: {
        openai: {
          enabled: false, // Disabled to avoid needing real API keys
          apiKey: 'test-key',
          model: 'gpt-4'
        }
      }
    };
    
    const app = new LLMAgnosticAIAgent(minimalConfig);
    console.log('✅ Application instance created successfully');
    
    // Test 2: Initialize application
    console.log('📝 Test 2: Initializing application...');
    await app.initialize();
    console.log('✅ Application initialized successfully');
    
    // Test 3: Check health status
    console.log('📝 Test 3: Checking health status...');
    const health = await app.getHealthStatus();
    console.log('✅ Health status retrieved:', health.status);
    console.log('📊 Components:', Object.keys(health.components).length, 'components checked');
    
    // Test 4: Get error metrics
    console.log('📝 Test 4: Getting error metrics...');
    const errorMetrics = app.getErrorMetrics();
    console.log('✅ Error metrics retrieved');
    
    // Test 5: Get component access
    console.log('📝 Test 5: Accessing components...');
    const components = app.components;
    const componentNames = Object.keys(components);
    console.log('✅ Components accessible:', componentNames.length, 'components');
    console.log('📋 Component names:', componentNames.join(', '));
    
    // Test 6: Update configuration
    console.log('📝 Test 6: Updating configuration...');
    await app.updateConfiguration({
      llm: {
        openai: {
          enabled: false,
          apiKey: 'updated-test-key',
          model: 'gpt-4'
        }
      }
    });
    console.log('✅ Configuration updated successfully');
    
    // Test 7: Shutdown application
    console.log('📝 Test 7: Shutting down application...');
    await app.shutdown();
    console.log('✅ Application shutdown successfully');
    
    console.log('\n🎉 All integration tests passed!');
    
  } catch (error) {
    console.error('❌ Integration test failed:', error instanceof Error ? error.message : error);
    if (error instanceof Error && error.stack) {
      console.error('Stack trace:', error.stack);
    }
    throw error;
  }
}

async function testFactoryFunction(): Promise<void> {
  console.log('\n🧪 Testing Factory Function...');
  
  try {
    // Test factory function with disabled providers to avoid API key requirements
    const config = {
      llm: {
        openai: {
          enabled: false,
          apiKey: 'test-key',
          model: 'gpt-4'
        },
        anthropic: {
          enabled: false,
          apiKey: 'test-key',
          model: 'claude-3-sonnet-20240229'
        }
      }
    };
    
    console.log('📝 Creating application via factory function...');
    const app = await createLLMAgnosticAIAgent(config);
    console.log('✅ Factory function created and initialized application');
    
    const health = await app.getHealthStatus();
    console.log('✅ Factory-created app health status:', health.status);
    
    await app.shutdown();
    console.log('✅ Factory-created app shutdown successfully');
    
    console.log('\n🎉 Factory function test passed!');
    
  } catch (error) {
    console.error('❌ Factory function test failed:', error instanceof Error ? error.message : error);
    throw error;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  Promise.resolve()
    .then(() => testApplicationIntegration())
    .then(() => testFactoryFunction())
    .then(() => {
      console.log('\n🏆 All tests completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Tests failed:', error);
      process.exit(1);
    });
}

export { testApplicationIntegration, testFactoryFunction };