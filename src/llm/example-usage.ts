// Example usage of LLM Provider Registry and Load Balancer

import { LLMProviderRegistry } from './provider-registry';
import { LLMLoadBalancer } from './load-balancer';
import { LLMHealthMonitor } from './health-monitor';
import { OpenAIProvider } from './providers/openai-provider';
import { AnthropicProvider } from './providers/anthropic-provider';
import {
  ProviderConfig,
  LoadBalancerConfig,
  TextGenerationRequest,
  MessageRole,
} from '../types/llm';

/**
 * Example demonstrating how to set up and use the LLM abstraction layer
 * with multiple providers, load balancing, and health monitoring.
 */
export class LLMSystemExample {
  private registry: LLMProviderRegistry;
  private loadBalancer: LLMLoadBalancer;
  private healthMonitor: LLMHealthMonitor;

  constructor() {
    // Initialize the registry
    this.registry = new LLMProviderRegistry();

    // Configure load balancer
    const loadBalancerConfig: LoadBalancerConfig = {
      strategy: 'round_robin', // Can be 'round_robin', 'least_loaded', or 'cost_optimized'
      fallbackEnabled: true,
      healthCheckInterval: 60, // seconds
    };

    this.loadBalancer = new LLMLoadBalancer(this.registry, loadBalancerConfig);
    this.healthMonitor = new LLMHealthMonitor(this.registry);
  }

  /**
   * Set up multiple LLM providers with different priorities
   */
  async setupProviders(): Promise<void> {
    // Configure OpenAI provider (higher priority)
    const openAIConfig: ProviderConfig = {
      name: 'openai-gpt4',
      apiKey: process.env.OPENAI_API_KEY || 'your-openai-key',
      model: 'gpt-4',
      priority: 2,
      enabled: true,
    };

    // Configure Anthropic provider (lower priority, fallback)
    const anthropicConfig: ProviderConfig = {
      name: 'anthropic-claude',
      apiKey: process.env.ANTHROPIC_API_KEY || 'your-anthropic-key',
      model: 'claude-3-sonnet-20240229',
      priority: 1,
      enabled: true,
    };

    // Create and register providers
    const openAIProvider = new OpenAIProvider(openAIConfig);
    const anthropicProvider = new AnthropicProvider(anthropicConfig);

    await this.registry.registerProvider(openAIConfig, openAIProvider);
    await this.registry.registerProvider(anthropicConfig, anthropicProvider);

    console.log('✅ Providers registered successfully');
  }

  /**
   * Start health monitoring for all providers
   */
  startHealthMonitoring(): void {
    const healthConfig = {
      checkInterval: 60, // Check every 60 seconds
      timeout: 10, // 10 second timeout for health checks
      retryAttempts: 3,
    };

    this.healthMonitor.startMonitoring(healthConfig);
    console.log('✅ Health monitoring started');
  }

  /**
   * Example of making a text generation request with automatic provider selection
   */
  async generateText(userMessage: string): Promise<string> {
    const request: TextGenerationRequest = {
      messages: [
        {
          id: `msg-${Date.now()}`,
          role: MessageRole.USER,
          content: userMessage,
          timestamp: new Date(),
        },
      ],
      temperature: 0.7,
      maxTokens: 150,
    };

    try {
      // Load balancer automatically selects the best available provider
      const selectedProvider = await this.loadBalancer.selectProvider(request);
      console.log(`🔄 Selected provider: ${selectedProvider.name}`);

      // Generate response using the selected provider
      const response = await selectedProvider.generateText(request);
      
      // Update provider statistics
      this.registry.incrementRequestCount(selectedProvider.name);
      
      return response.content;
    } catch (error) {
      console.error('❌ Text generation failed:', error);
      throw error;
    }
  }

  /**
   * Example of using executeWithFallback for automatic failover
   */
  async generateTextWithFallback(userMessage: string): Promise<string> {
    const request: TextGenerationRequest = {
      messages: [
        {
          id: `msg-${Date.now()}`,
          role: MessageRole.USER,
          content: userMessage,
          timestamp: new Date(),
        },
      ],
      temperature: 0.7,
      maxTokens: 150,
    };

    try {
      const result = await this.loadBalancer.executeWithFallback(
        async (provider) => {
          console.log(`🔄 Trying provider: ${provider.name}`);
          const response = await provider.generateText(request);
          return response.content;
        },
        3 // Max retries
      );

      return result;
    } catch (error) {
      console.error('❌ All providers failed:', error);
      throw error;
    }
  }

  /**
   * Get current system health status
   */
  async getSystemHealth(): Promise<void> {
    const healthStatus = await this.healthMonitor.getHealthStatus();
    
    console.log(`🏥 Overall Health: ${healthStatus.overallHealth}`);
    console.log(`📊 Provider Status:`);
    
    for (const provider of healthStatus.providers) {
      const status = provider.isHealthy ? '✅' : '❌';
      console.log(`  ${status} ${provider.providerName}: ${provider.responseTime}ms`);
    }
  }

  /**
   * Get provider statistics
   */
  async getProviderStats(): Promise<void> {
    const stats = await this.loadBalancer.getProviderStats();
    
    console.log('📈 Provider Statistics:');
    for (const stat of stats) {
      console.log(`  ${stat.name}:`);
      console.log(`    Requests: ${stat.requestCount}`);
      console.log(`    Errors: ${stat.errorCount}`);
      console.log(`    Avg Response Time: ${stat.averageResponseTime}ms`);
      console.log(`    Healthy: ${stat.isHealthy ? '✅' : '❌'}`);
      console.log(`    Last Used: ${stat.lastUsed.toISOString()}`);
    }
  }

  /**
   * Demonstrate different load balancing strategies
   */
  async demonstrateLoadBalancing(): Promise<void> {
    console.log('🔄 Demonstrating load balancing strategies...');

    // Round Robin
    this.loadBalancer.updateConfig({ strategy: 'round_robin' });
    console.log('Strategy: Round Robin');
    
    for (let i = 0; i < 3; i++) {
      const request: TextGenerationRequest = {
        messages: [{ 
          id: `test-${i}`, 
          role: MessageRole.USER, 
          content: 'Hello', 
          timestamp: new Date() 
        }],
      };
      const provider = await this.loadBalancer.selectProvider(request);
      console.log(`  Request ${i + 1}: ${provider.name}`);
    }

    // Least Loaded
    this.loadBalancer.updateConfig({ strategy: 'least_loaded' });
    console.log('Strategy: Least Loaded');
    
    const request: TextGenerationRequest = {
      messages: [{ 
        id: 'test-least-loaded', 
        role: MessageRole.USER, 
        content: 'Hello', 
        timestamp: new Date() 
      }],
    };
    const provider = await this.loadBalancer.selectProvider(request);
    console.log(`  Selected: ${provider.name}`);
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.healthMonitor.stopMonitoring();
    console.log('🧹 Cleanup completed');
  }
}

/**
 * Example usage function
 */
export async function runExample(): Promise<void> {
  const llmSystem = new LLMSystemExample();

  try {
    // Setup
    await llmSystem.setupProviders();
    llmSystem.startHealthMonitoring();

    // Wait a moment for health checks to initialize
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Generate some text
    const response1 = await llmSystem.generateText('What is artificial intelligence?');
    console.log('📝 Response 1:', response1.substring(0, 100) + '...');

    // Generate with fallback
    const response2 = await llmSystem.generateTextWithFallback('Explain machine learning');
    console.log('📝 Response 2:', response2.substring(0, 100) + '...');

    // Check system health
    await llmSystem.getSystemHealth();

    // Show statistics
    await llmSystem.getProviderStats();

    // Demonstrate load balancing
    await llmSystem.demonstrateLoadBalancing();

  } catch (error) {
    console.error('❌ Example failed:', error);
  } finally {
    llmSystem.cleanup();
  }
}

// LLMSystemExample is already exported above