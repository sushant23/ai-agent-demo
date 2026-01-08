// OpenAI Provider Setup with your API key

import { LLMProviderRegistry } from './src/llm/provider-registry';
import { OpenAIProvider } from './src/llm/providers/openai-provider';
import {
  ProviderConfig,
  TextGenerationRequest,
  MessageRole,
} from './src/types/llm';

/**
 * Quick setup for OpenAI provider with your API key
 */
export async function setupOpenAI(): Promise<{ registry: LLMProviderRegistry; provider: OpenAIProvider }> {
  // Initialize the registry
  const registry = new LLMProviderRegistry();

  // Configure OpenAI provider with your API key
  const openAIConfig: ProviderConfig = {
    name: 'openai-gpt4',
    apiKey: '<OPEN_API_KEY_HERE>',
    model: 'gpt-4', // You can also use 'gpt-3.5-turbo' for faster/cheaper responses
    priority: 1,
    enabled: true,
  };

  // Create and register the provider
  const openAIProvider = new OpenAIProvider(openAIConfig);
  await registry.registerProvider(openAIConfig, openAIProvider);

  console.log('✅ OpenAI provider configured successfully');
  
  return { registry, provider: openAIProvider };
}

/**
 * Example usage of the configured OpenAI provider
 */
export async function testOpenAI(): Promise<void> {
  try {
    const { provider } = await setupOpenAI();

    // Create a simple text generation request
    const request: TextGenerationRequest = {
      messages: [
        {
          id: `msg-${Date.now()}`,
          role: MessageRole.USER,
          content: 'Hello! Can you tell me a short joke?',
          timestamp: new Date(),
        },
      ],
      temperature: 0.7,
      maxTokens: 100,
    };

    console.log('🤖 Sending request to OpenAI...');
    
    // Generate response
    const response = await provider.generateText(request);
    
    console.log('📝 OpenAI Response:');
    console.log(response.content);
    console.log(`\n📊 Usage: ${response.usage.totalTokens} tokens`);
    console.log(`🏁 Finish reason: ${response.finishReason}`);
    
  } catch (error) {
    console.error('❌ OpenAI test failed:', error);
  }
}

/**
 * Example with streaming
 */
export async function testOpenAIStreaming(): Promise<void> {
  try {
    const { provider } = await setupOpenAI();

    const request = {
      messages: [
        {
          id: `msg-${Date.now()}`,
          role: MessageRole.USER,
          content: 'Write a short story about a robot learning to paint.',
          timestamp: new Date(),
        },
      ],
      temperature: 0.8,
      maxTokens: 200,
      onChunk: (chunk: any) => {
        // This callback will be called for each chunk
        process.stdout.write(chunk.content);
      },
    };

    console.log('🌊 Starting streaming response...\n');
    
    let fullResponse = '';
    for await (const chunk of provider.streamGeneration(request)) {
      fullResponse += chunk.content;
      if (chunk.isComplete) {
        console.log('\n\n✅ Streaming complete!');
        break;
      }
    }
    
  } catch (error) {
    console.error('❌ Streaming test failed:', error);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  console.log('🚀 Testing OpenAI provider...\n');
  testOpenAI().then(() => {
    console.log('\n🌊 Testing streaming...\n');
    return testOpenAIStreaming();
  });
}