#!/usr/bin/env ts-node

// Quick test script for OpenAI provider
import { setupOpenAI } from './openai-setup';

async function quickTest() {
  try {
    console.log('🚀 Setting up OpenAI provider...');
    const { provider } = await setupOpenAI();
    
    console.log('✅ Provider ready! Testing with a simple request...\n');
    
    const response = await provider.generateText({
      messages: [
        {
          id: 'test-1',
          role: 'user' as any,
          content: 'Say hello and tell me what model you are.',
          timestamp: new Date(),
        },
      ],
      temperature: 0.7,
      maxTokens: 100,
    });
    
    console.log('🤖 OpenAI Response:');
    console.log('─'.repeat(50));
    console.log(response.content);
    console.log('─'.repeat(50));
    console.log(`📊 Tokens: ${response.usage.totalTokens} | Model: ${response.metadata?.model}`);
    console.log('✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('401')) {
        console.log('\n💡 This looks like an authentication error. Please check your API key.');
      } else if (error.message.includes('429')) {
        console.log('\n💡 Rate limit exceeded. Please wait a moment and try again.');
      } else if (error.message.includes('insufficient_quota')) {
        console.log('\n💡 Insufficient quota. Please check your OpenAI account billing.');
      }
    }
  }
}

// Run the test
quickTest();