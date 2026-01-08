// LLM Provider Registry implementation

import {
  LLMProvider,
  ProviderConfig,
} from '../types/llm';
import {
  ILLMProviderRegistry,
  ProviderStats,
} from '../interfaces/llm-abstraction';
import { ValidationError, ConflictError, NotFoundError } from '../utils/errors';

export class LLMProviderRegistry implements ILLMProviderRegistry {
  private providers: Map<string, LLMProvider> = new Map();
  private configs: Map<string, ProviderConfig> = new Map();
  private stats: Map<string, ProviderStats> = new Map();

  async registerProvider(config: ProviderConfig, provider: LLMProvider): Promise<void> {
    this.validateProviderConfig(config);
    this.validateProvider(provider);

    if (this.providers.has(config.name)) {
      throw new ConflictError(`Provider ${config.name} is already registered`);
    }

    // Verify provider name matches config
    if (provider.name !== config.name) {
      throw new ValidationError(`Provider name mismatch: config has ${config.name}, provider has ${provider.name}`);
    }

    this.providers.set(config.name, provider);
    this.configs.set(config.name, { ...config });
    this.initializeProviderStats(config.name);
  }

  async getProvider(name: string): Promise<LLMProvider | null> {
    const provider = this.providers.get(name);
    if (!provider) {
      return null;
    }

    const config = this.configs.get(name);
    if (!config || !config.enabled) {
      return null;
    }

    return provider;
  }

  async listProviders(): Promise<LLMProvider[]> {
    const enabledProviders: LLMProvider[] = [];
    
    for (const [name, provider] of this.providers.entries()) {
      const config = this.configs.get(name);
      if (config && config.enabled) {
        enabledProviders.push(provider);
      }
    }

    // Sort by priority (higher priority first)
    return enabledProviders.sort((a, b) => {
      const configA = this.configs.get(a.name)!;
      const configB = this.configs.get(b.name)!;
      return configB.priority - configA.priority;
    });
  }

  async removeProvider(name: string): Promise<void> {
    if (!this.providers.has(name)) {
      throw new NotFoundError('Provider', name);
    }

    this.providers.delete(name);
    this.configs.delete(name);
    this.stats.delete(name);
  }

  async updateProviderConfig(name: string, configUpdates: Partial<ProviderConfig>): Promise<void> {
    const existingConfig = this.configs.get(name);
    if (!existingConfig) {
      throw new NotFoundError('Provider config', name);
    }

    const newConfig = { ...existingConfig, ...configUpdates };
    this.validateProviderConfig(newConfig);

    this.configs.set(name, newConfig);
  }

  // Additional methods for registry management
  public async getProviderConfig(name: string): Promise<ProviderConfig | null> {
    return this.configs.get(name) || null;
  }

  public async getProviderStats(name: string): Promise<ProviderStats | null> {
    return this.stats.get(name) || null;
  }

  public async getAllProviderStats(): Promise<ProviderStats[]> {
    return Array.from(this.stats.values());
  }

  public updateProviderStats(name: string, updates: Partial<ProviderStats>): void {
    const currentStats = this.stats.get(name);
    if (currentStats) {
      this.stats.set(name, { ...currentStats, ...updates });
    }
  }

  public incrementRequestCount(name: string): void {
    const stats = this.stats.get(name);
    if (stats) {
      stats.requestCount++;
      stats.lastUsed = new Date();
    }
  }

  public incrementErrorCount(name: string): void {
    const stats = this.stats.get(name);
    if (stats) {
      stats.errorCount++;
    }
  }

  public updateResponseTime(name: string, responseTime: number): void {
    const stats = this.stats.get(name);
    if (stats) {
      // Calculate rolling average
      const totalRequests = stats.requestCount;
      const currentAverage = stats.averageResponseTime;
      stats.averageResponseTime = ((currentAverage * (totalRequests - 1)) + responseTime) / totalRequests;
    }
  }

  private validateProviderConfig(config: ProviderConfig): void {
    if (!config.name || config.name.trim() === '') {
      throw new ValidationError('Provider name is required');
    }
    if (!config.apiKey || config.apiKey.trim() === '') {
      throw new ValidationError('API key is required');
    }
    if (!config.model || config.model.trim() === '') {
      throw new ValidationError('Model name is required');
    }
    if (typeof config.priority !== 'number' || config.priority < 0) {
      throw new ValidationError('Priority must be a non-negative number');
    }
    if (typeof config.enabled !== 'boolean') {
      throw new ValidationError('Enabled must be a boolean');
    }
  }

  private validateProvider(provider: LLMProvider): void {
    if (!provider.name || provider.name.trim() === '') {
      throw new ValidationError('Provider name is required');
    }
    if (!provider.capabilities) {
      throw new ValidationError('Provider capabilities are required');
    }
    if (typeof provider.generateText !== 'function') {
      throw new ValidationError('Provider must implement generateText method');
    }
    if (typeof provider.generateWithTools !== 'function') {
      throw new ValidationError('Provider must implement generateWithTools method');
    }
    if (typeof provider.streamGeneration !== 'function') {
      throw new ValidationError('Provider must implement streamGeneration method');
    }
  }

  private initializeProviderStats(name: string): void {
    this.stats.set(name, {
      name,
      requestCount: 0,
      errorCount: 0,
      averageResponseTime: 0,
      isHealthy: true,
      lastUsed: new Date(),
    });
  }
}