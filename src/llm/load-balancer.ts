// LLM Load Balancer implementation

import {
  LLMProvider,
  TextGenerationRequest,
  LoadBalancerConfig,
} from '../types/llm';
import {
  ILLMLoadBalancer,
  ILLMProviderRegistry,
  ProviderStats,
} from '../interfaces/llm-abstraction';
import { LLMProviderError, ValidationError } from '../utils/errors';

export class LLMLoadBalancer implements ILLMLoadBalancer {
  private registry: ILLMProviderRegistry;
  private config: LoadBalancerConfig;
  private currentProviderIndex: number = 0;

  constructor(registry: ILLMProviderRegistry, config: LoadBalancerConfig) {
    this.registry = registry;
    this.config = config;
    this.validateConfig(config);
  }

  async selectProvider(request: TextGenerationRequest): Promise<LLMProvider> {
    const providers = await this.registry.listProviders();
    
    if (providers.length === 0) {
      throw new LLMProviderError('No providers available', 'load-balancer', 'selectProvider');
    }

    // Filter providers that can handle the request
    const capableProviders = providers.filter(provider => {
      // Check if provider can handle the request based on capabilities
      if ('tools' in request && !provider.capabilities.supportsTools) {
        return false;
      }
      if ('onChunk' in request && !provider.capabilities.supportsStreaming) {
        return false;
      }
      return true;
    });

    if (capableProviders.length === 0) {
      throw new LLMProviderError('No providers capable of handling this request', 'load-balancer', 'selectProvider');
    }

    // Filter healthy providers
    const healthyProviders = await this.getHealthyProviders(capableProviders);
    
    if (healthyProviders.length === 0) {
      if (this.config.fallbackEnabled && capableProviders.length > 0) {
        // Use any capable provider as fallback
        return capableProviders[0]!;
      } else {
        throw new LLMProviderError('No healthy providers available', 'load-balancer', 'selectProvider');
      }
    }

    return await this.selectProviderByStrategy(healthyProviders);
  }

  async executeWithFallback<T>(
    operation: (provider: LLMProvider) => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    const providers = await this.registry.listProviders();
    let lastError: Error | null = null;
    let attempts = 0;

    for (const provider of providers) {
      if (attempts >= maxRetries) {
        break;
      }

      try {
        const startTime = Date.now();
        const result = await operation(provider);
        const responseTime = Date.now() - startTime;

        // Update provider stats on success
        this.registry.incrementRequestCount(provider.name);
        this.registry.updateResponseTime(provider.name, responseTime);
        this.updateProviderHealth(provider.name, true);

        return result;
      } catch (error) {
        attempts++;
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Update provider stats on error
        this.registry.incrementErrorCount(provider.name);
        this.updateProviderHealth(provider.name, false);

        // Continue to next provider if fallback is enabled
        if (!this.config.fallbackEnabled) {
          break;
        }
      }
    }

    throw new LLMProviderError(
      `All providers failed after ${attempts} attempts. Last error: ${lastError?.message}`,
      'load-balancer',
      'executeWithFallback'
    );
  }

  updateProviderHealth(providerName: string, isHealthy: boolean): void {
    this.registry.updateProviderStats(providerName, { isHealthy });
  }

  async getProviderStats(): Promise<ProviderStats[]> {
    return this.registry.getAllProviderStats();
  }

  // Update configuration
  public updateConfig(config: Partial<LoadBalancerConfig>): void {
    this.config = { ...this.config, ...config };
    this.validateConfig(this.config);
  }

  public getConfig(): Readonly<LoadBalancerConfig> {
    return { ...this.config };
  }

  private async getHealthyProviders(providers: LLMProvider[]): Promise<LLMProvider[]> {
    const healthyProviders: LLMProvider[] = [];

    for (const provider of providers) {
      const stats = await this.registry.getProviderStats(provider.name);
      if (stats && stats.isHealthy) {
        healthyProviders.push(provider);
      }
    }

    return healthyProviders;
  }

  private async selectProviderByStrategy(providers: LLMProvider[]): Promise<LLMProvider> {
    switch (this.config.strategy) {
      case 'round_robin':
        return this.selectRoundRobin(providers);
      case 'least_loaded':
        return await this.selectLeastLoaded(providers);
      case 'cost_optimized':
        return await this.selectCostOptimized(providers);
      default:
        throw new ValidationError(`Unknown load balancing strategy: ${this.config.strategy}`);
    }
  }

  private selectRoundRobin(providers: LLMProvider[]): LLMProvider {
    if (providers.length === 0) {
      throw new LLMProviderError('No providers available for round robin selection', 'load-balancer', 'selectRoundRobin');
    }
    const provider = providers[this.currentProviderIndex % providers.length]!;
    this.currentProviderIndex = (this.currentProviderIndex + 1) % providers.length;
    return provider;
  }

  private async selectLeastLoaded(providers: LLMProvider[]): Promise<LLMProvider> {
    if (providers.length === 0) {
      throw new LLMProviderError('No providers available for least loaded selection', 'load-balancer', 'selectLeastLoaded');
    }

    // Select provider with lowest request count
    let selectedProvider = providers[0]!;
    let lowestRequestCount = Infinity;

    for (const provider of providers) {
      const stats = await this.registry.getProviderStats(provider.name);
      if (stats && stats.requestCount < lowestRequestCount) {
        lowestRequestCount = stats.requestCount;
        selectedProvider = provider;
      }
    }

    return selectedProvider;
  }

  private async selectCostOptimized(providers: LLMProvider[]): Promise<LLMProvider> {
    if (providers.length === 0) {
      throw new LLMProviderError('No providers available for cost optimized selection', 'load-balancer', 'selectCostOptimized');
    }

    // For now, select by priority (higher priority = lower cost)
    // In a real implementation, this would consider actual pricing
    const sortedProviders = [...providers];
    const providerConfigs = await Promise.all(
      sortedProviders.map(async (provider) => ({
        provider,
        config: await this.registry.getProviderConfig(provider.name),
      }))
    );

    // Sort by priority (higher priority first)
    providerConfigs.sort((a, b) => {
      const priorityA = a.config?.priority ?? 0;
      const priorityB = b.config?.priority ?? 0;
      return priorityB - priorityA;
    });

    if (providerConfigs.length === 0) {
      throw new LLMProviderError('No provider configs available', 'load-balancer', 'selectCostOptimized');
    }

    return providerConfigs[0]!.provider;
  }

  private validateConfig(config: LoadBalancerConfig): void {
    const validStrategies = ['round_robin', 'least_loaded', 'cost_optimized'];
    if (!validStrategies.includes(config.strategy)) {
      throw new ValidationError(`Invalid strategy: ${config.strategy}. Must be one of: ${validStrategies.join(', ')}`);
    }

    if (typeof config.fallbackEnabled !== 'boolean') {
      throw new ValidationError('fallbackEnabled must be a boolean');
    }

    if (typeof config.healthCheckInterval !== 'number' || config.healthCheckInterval <= 0) {
      throw new ValidationError('healthCheckInterval must be a positive number');
    }
  }
}