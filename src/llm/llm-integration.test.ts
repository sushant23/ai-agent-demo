// Integration tests for LLM Provider Registry and Load Balancer

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

describe('LLM Integration Tests', () => {
  let registry: LLMProviderRegistry;
  let loadBalancer: LLMLoadBalancer;
  let healthMonitor: LLMHealthMonitor;

  beforeEach(() => {
    registry = new LLMProviderRegistry();
    
    const loadBalancerConfig: LoadBalancerConfig = {
      strategy: 'round_robin',
      fallbackEnabled: true,
      healthCheckInterval: 60,
    };
    
    loadBalancer = new LLMLoadBalancer(registry, loadBalancerConfig);
    healthMonitor = new LLMHealthMonitor(registry);
  });

  afterEach(() => {
    healthMonitor.stopMonitoring();
  });

  describe('Provider Registry Integration', () => {
    test('should register and retrieve providers', async () => {
      const openAIConfig: ProviderConfig = {
        name: 'openai-test',
        apiKey: 'test-key',
        model: 'gpt-4',
        priority: 1,
        enabled: true,
      };

      const openAIProvider = new OpenAIProvider(openAIConfig);
      await registry.registerProvider(openAIConfig, openAIProvider);

      const retrievedProvider = await registry.getProvider('openai-test');
      expect(retrievedProvider).toBe(openAIProvider);
      expect(retrievedProvider?.name).toBe('openai-test');
    });

    test('should list providers in priority order', async () => {
      const openAIConfig: ProviderConfig = {
        name: 'openai-test',
        apiKey: 'test-key',
        model: 'gpt-4',
        priority: 2,
        enabled: true,
      };

      const anthropicConfig: ProviderConfig = {
        name: 'anthropic-test',
        apiKey: 'test-key',
        model: 'claude-3-sonnet',
        priority: 3,
        enabled: true,
      };

      const openAIProvider = new OpenAIProvider(openAIConfig);
      const anthropicProvider = new AnthropicProvider(anthropicConfig);

      await registry.registerProvider(openAIConfig, openAIProvider);
      await registry.registerProvider(anthropicConfig, anthropicProvider);

      const providers = await registry.listProviders();
      expect(providers).toHaveLength(2);
      expect(providers[0]?.name).toBe('anthropic-test'); // Higher priority first
      expect(providers[1]?.name).toBe('openai-test');
    });

    test('should track provider statistics', async () => {
      const config: ProviderConfig = {
        name: 'test-provider',
        apiKey: 'test-key',
        model: 'test-model',
        priority: 1,
        enabled: true,
      };

      const provider = new OpenAIProvider(config);
      await registry.registerProvider(config, provider);

      // Simulate some usage
      registry.incrementRequestCount('test-provider');
      registry.incrementErrorCount('test-provider');
      registry.updateResponseTime('test-provider', 150);

      const stats = await registry.getProviderStats('test-provider');
      expect(stats).toBeDefined();
      expect(stats?.requestCount).toBe(1);
      expect(stats?.errorCount).toBe(1);
      expect(stats?.averageResponseTime).toBe(150);
    });
  });

  describe('Load Balancer Integration', () => {
    test('should select provider for text generation request', async () => {
      const config: ProviderConfig = {
        name: 'test-provider',
        apiKey: 'test-key',
        model: 'test-model',
        priority: 1,
        enabled: true,
      };

      const provider = new OpenAIProvider(config);
      await registry.registerProvider(config, provider);

      const request: TextGenerationRequest = {
        messages: [
          {
            id: 'test-msg',
            role: MessageRole.USER,
            content: 'Hello',
            timestamp: new Date(),
          },
        ],
      };

      const selectedProvider = await loadBalancer.selectProvider(request);
      expect(selectedProvider).toBe(provider);
    });

    test('should handle no providers available', async () => {
      const request: TextGenerationRequest = {
        messages: [
          {
            id: 'test-msg',
            role: MessageRole.USER,
            content: 'Hello',
            timestamp: new Date(),
          },
        ],
      };

      await expect(loadBalancer.selectProvider(request)).rejects.toThrow('No providers available');
    });

    test('should filter providers by capabilities', async () => {
      const openAIConfig: ProviderConfig = {
        name: 'openai-test',
        apiKey: 'test-key',
        model: 'gpt-4',
        priority: 1,
        enabled: true,
      };

      const provider = new OpenAIProvider(openAIConfig);
      await registry.registerProvider(openAIConfig, provider);

      // Test tool request (should work with OpenAI)
      const toolRequest = {
        messages: [
          {
            id: 'test-msg',
            role: MessageRole.USER,
            content: 'Hello',
            timestamp: new Date(),
          },
        ],
        tools: [
          {
            name: 'test-tool',
            description: 'A test tool',
            parameters: { type: 'object' },
          },
        ],
      };

      const selectedProvider = await loadBalancer.selectProvider(toolRequest);
      expect(selectedProvider).toBe(provider);
    });
  });

  describe('Health Monitor Integration', () => {
    test('should initialize health monitoring', () => {
      const config = {
        checkInterval: 30,
        timeout: 5,
        retryAttempts: 2,
      };

      expect(() => {
        healthMonitor.startMonitoring(config);
      }).not.toThrow();

      expect(healthMonitor.isCurrentlyMonitoring()).toBe(true);
    });

    test('should get health status', async () => {
      const providerConfig: ProviderConfig = {
        name: 'test-provider',
        apiKey: 'test-key',
        model: 'test-model',
        priority: 1,
        enabled: true,
      };

      const provider = new OpenAIProvider(providerConfig);
      await registry.registerProvider(providerConfig, provider);

      const healthStatus = await healthMonitor.getHealthStatus();
      expect(healthStatus).toHaveProperty('overallHealth');
      expect(healthStatus).toHaveProperty('providers');
      expect(healthStatus).toHaveProperty('lastCheck');
    });
  });

  describe('Error Handling', () => {
    test('should handle provider registration conflicts', async () => {
      const config: ProviderConfig = {
        name: 'duplicate-provider',
        apiKey: 'test-key',
        model: 'test-model',
        priority: 1,
        enabled: true,
      };

      const provider1 = new OpenAIProvider(config);
      const provider2 = new OpenAIProvider(config);

      await registry.registerProvider(config, provider1);
      
      await expect(registry.registerProvider(config, provider2)).rejects.toThrow('already registered');
    });

    test('should handle invalid provider configurations', async () => {
      const invalidConfig: ProviderConfig = {
        name: '',
        apiKey: 'test-key',
        model: 'test-model',
        priority: 1,
        enabled: true,
      };

      expect(() => new OpenAIProvider(invalidConfig)).toThrow('Provider name is required');
    });
  });
});