// Test script to verify tool integration is working

import { LLMAgnosticAIAgent } from './app';
import { MessageRole } from './types/llm';

async function testToolIntegration() {
  console.log('🧪 Testing Tool Integration');
  console.log('============================');

  try {
    // Create and initialize the agent
    const agent = new LLMAgnosticAIAgent({
      llm: {
        openai: {
          enabled: true,
          apiKey: process.env.OPENAI_API_KEY || 'test-key',
          model: 'gpt-3.5-turbo',
        },
      },
    });

    await agent.initialize();
    console.log('✅ Agent initialized');

    // Test input that should trigger tool usage
    const testInput = {
      content: 'Analyze my revenue performance for the last quarter',
      userId: 'test-user',
      timestamp: new Date(),
      sessionId: 'test-session',
    };

    console.log('\n🔧 Testing tool-triggering request...');
    console.log(`Input: "${testInput.content}"`);

    // Process the input
    const response = await agent.processUserInput(testInput, 'test-user', 'test-session');

    console.log('\n📊 Response:');
    console.log(`Content: ${response.content}`);
    console.log(`Tools used: ${response.metadata.toolsUsed || false}`);
    console.log(`Provider: ${response.metadata.provider}`);
    console.log(`Confidence: ${response.metadata.confidence}`);

    if (response.nextStepActions && response.nextStepActions.length > 0) {
      console.log('\n🎯 Next step actions:');
      response.nextStepActions.forEach((action, index) => {
        console.log(`  ${index + 1}. ${action.title}: ${action.description}`);
      });
    }

    // Test another input that shouldn't trigger tools
    const simpleInput = {
      content: 'Hello, how are you?',
      userId: 'test-user',
      timestamp: new Date(),
      sessionId: 'test-session',
    };

    console.log('\n🗣️ Testing simple greeting (should not use tools)...');
    console.log(`Input: "${simpleInput.content}"`);

    const simpleResponse = await agent.processUserInput(simpleInput, 'test-user', 'test-session');

    console.log('\n📝 Simple Response:');
    console.log(`Content: ${simpleResponse.content}`);
    console.log(`Tools used: ${simpleResponse.metadata.toolsUsed || false}`);
    console.log(`Provider: ${simpleResponse.metadata.provider}`);

    await agent.shutdown();
    console.log('\n✅ Test completed successfully');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testToolIntegration().catch(console.error);
}

export { testToolIntegration };