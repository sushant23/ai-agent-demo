// Secure OpenAI Provider Setup using environment variables

import { LLMProviderRegistry } from './src/llm/provider-registry';
import { OpenAIProvider } from './src/llm/providers/openai-provider';
import {
  ProviderConfig,
  TextGenerationRequest,
  MessageRole,
} from './src/types/llm';

/**
 * Secure setup for OpenAI provider using environment variables
 * Set OPENAI_API_KEY in your environment before running
 */
export async function setupOpenAISecure(): Promise<{ registry: LLMProviderRegistry; provider: OpenAIProvider }> {
  // Get API key from environment variable
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }

  // Initialize the registry
  const registry = new LLMProviderRegistry();

  // Configure OpenAI provider
  const openAIConfig: ProviderConfig = {
    name: 'openai-gpt4',
    apiKey: apiKey,
    model: process.env.OPENAI_MODEL || 'gpt-4', // Default to gpt-4, can be overridden
    priority: 1,
    enabled: true,
    baseUrl: process.env.OPENAI_BASE_URL, // Optional: for custom endpoints
  };

  // Create and register the provider
  const openAIProvider = new OpenAIProvider(openAIConfig);
  await registry.registerProvider(openAIConfig, openAIProvider);

  console.log(`✅ OpenAI provider configured with model: ${openAIConfig.model}`);
  
  return { registry, provider: openAIProvider };
}

/**
 * Set up environment variable for your API key
 */
export function setupEnvironment(): void {
  // For demonstration - in production, set this in your shell or .env file
  process.env.OPENAI_API_KEY = '<OPEN_API_KEY_HERE>';
  process.env.OPENAI_MODEL = 'gpt-4';
  
  console.log('🔐 Environment variables set');
}

/**
 * Example usage with different models
 */
export async function testDifferentModels(): Promise<void> {
  setupEnvironment();
  
  const models = ['gpt-4', 'gpt-3.5-turbo'];
  
  for (const model of models) {
    try {
      console.log(`\n🧪 Testing model: ${model}`);
      
      // Set model in environment
      process.env.OPENAI_MODEL = model;
      
      const { provider } = await setupOpenAISecure();
      
      const request: TextGenerationRequest = {
        messages: [
          {
            id: `msg-${Date.now()}`,
            role: MessageRole.USER,
            content: 'What is the capital of France? Answer in one sentence.',
            timestamp: new Date(),
          },
        ],
        temperature: 0.3,
        maxTokens: 50,
      };

      const response = await provider.generateText(request);
      
      console.log(`📝 ${model} Response: ${response.content}`);
      console.log(`📊 Tokens used: ${response.usage.totalTokens}`);
      
    } catch (error) {
      console.error(`❌ ${model} test failed:`, error);
    }
  }
}

// Instructions for setting up environment variables
export function printSetupInstructions(): void {
  console.log(`
🔧 Setup Instructions:

1. Set your OpenAI API key as an environment variable:
   export OPENAI_API_KEY="your-api-key-here"

2. Optionally set the model:
   export OPENAI_MODEL="gpt-4"  # or "gpt-3.5-turbo"

3. For custom endpoints (optional):
   export OPENAI_BASE_URL="https://your-custom-endpoint.com/v1"

4. Then run your application:
   npm run start

📝 Available Models:
- gpt-4: Most capable, higher cost
- gpt-3.5-turbo: Faster, lower cost
- gpt-4-turbo: Latest GPT-4 with larger context window

💡 Tips:
- Use gpt-3.5-turbo for simple tasks to save costs
- Use gpt-4 for complex reasoning and analysis
- Set temperature lower (0.1-0.3) for factual responses
- Set temperature higher (0.7-0.9) for creative responses
  `);
}

// Run if executed directly
if (require.main === module) {
  printSetupInstructions();
  console.log('\n🚀 Testing different models...');
  testDifferentModels();
}