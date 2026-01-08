// LLM Health Monitor implementation

import {
  LLMProvider,
  TextGenerationRequest,
  MessageRole,
} from '../types/llm';
import {
  ILLMHealthMonitor,
  ILLMProviderRegistry,
  HealthMonitorConfig,
  HealthCheckResult,
  HealthStatus,
} from '../interfaces/llm-abstraction';
import { ValidationError, TimeoutError } from '../utils/errors';

export class LLMHealthMonitor implements ILLMHealthMonitor {
  private registry: ILLMProviderRegistry;
  private config: HealthMonitorConfig;
  private intervalId: NodeJS.Timeout | null = null;
  private isMonitoring: boolean = false;
  private lastHealthCheck: Date = new Date();

  constructor(registry: ILLMProviderRegistry) {
    this.registry = registry;
    this.config = {
      checkInterval: 60, // 60 seconds default
      timeout: 10, // 10 seconds default
      retryAttempts: 3,
    };
  }

  startMonitoring(config: HealthMonitorConfig): void {
    this.validateConfig(config);
    this.config = { ...config };

    if (this.isMonitoring) {
      this.stopMonitoring();
    }

    this.isMonitoring = true;
    this.intervalId = setInterval(
      () => this.performHealthChecks(),
      this.config.checkInterval * 1000
    );

    // Perform initial health check
    this.performHealthChecks();
  }

  stopMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isMonitoring = false;
  }

  async checkProviderHealth(provider: LLMProvider): Promise<HealthCheckResult> {
    const startTime = Date.now();
    let attempts = 0;
    let lastError: string | undefined;

    while (attempts < this.config.retryAttempts) {
      try {
        const isHealthy = await this.performSingleHealthCheck(provider);
        const responseTime = Date.now() - startTime;

        const result: HealthCheckResult = {
          providerName: provider.name,
          isHealthy,
          responseTime,
          timestamp: new Date(),
        };

        // Update provider health in registry
        this.registry.updateProviderStats(provider.name, { isHealthy });

        return result;
      } catch (error) {
        attempts++;
        lastError = error instanceof Error ? error.message : String(error);

        if (attempts < this.config.retryAttempts) {
          // Wait before retry (exponential backoff)
          await this.delay(Math.pow(2, attempts) * 1000);
        }
      }
    }

    // All attempts failed
    const responseTime = Date.now() - startTime;
    const result: HealthCheckResult = {
      providerName: provider.name,
      isHealthy: false,
      responseTime,
      error: lastError,
      timestamp: new Date(),
    };

    // Update provider health in registry
    this.registry.updateProviderStats(provider.name, { isHealthy: false });

    return result;
  }

  async getHealthStatus(): Promise<HealthStatus> {
    const providers = await this.registry.listProviders();
    const healthResults: HealthCheckResult[] = [];

    // Get current health status for all providers
    for (const provider of providers) {
      const stats = await this.registry.getProviderStats(provider.name);
      if (stats) {
        healthResults.push({
          providerName: provider.name,
          isHealthy: stats.isHealthy,
          responseTime: stats.averageResponseTime,
          timestamp: new Date(),
        });
      }
    }

    const overallHealth = this.calculateOverallHealth(healthResults);

    return {
      overallHealth,
      providers: healthResults,
      lastCheck: this.lastHealthCheck,
    };
  }

  private async performHealthChecks(): Promise<void> {
    try {
      const providers = await this.registry.listProviders();
      const healthCheckPromises = providers.map(provider => 
        this.checkProviderHealth(provider)
      );

      await Promise.allSettled(healthCheckPromises);
      this.lastHealthCheck = new Date();
    } catch (error) {
      console.error('Error performing health checks:', error);
    }
  }

  private async performSingleHealthCheck(provider: LLMProvider): Promise<boolean> {
    const testRequest: TextGenerationRequest = {
      messages: [
        {
          id: `health-check-${Date.now()}`,
          role: MessageRole.USER,
          content: 'ping',
          timestamp: new Date(),
        },
      ],
      maxTokens: 5,
      temperature: 0,
    };

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new TimeoutError('health check', this.config.timeout * 1000));
      }, this.config.timeout * 1000);

      provider.generateText(testRequest)
        .then(response => {
          clearTimeout(timeoutId);
          // Consider healthy if we get any response with content
          resolve(response.content.length > 0);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  private calculateOverallHealth(results: HealthCheckResult[]): 'healthy' | 'degraded' | 'unhealthy' {
    if (results.length === 0) {
      return 'unhealthy';
    }

    const healthyCount = results.filter(r => r.isHealthy).length;
    const healthyPercentage = healthyCount / results.length;

    if (healthyPercentage >= 0.8) {
      return 'healthy';
    } else if (healthyPercentage >= 0.5) {
      return 'degraded';
    } else {
      return 'unhealthy';
    }
  }

  private validateConfig(config: HealthMonitorConfig): void {
    if (typeof config.checkInterval !== 'number' || config.checkInterval <= 0) {
      throw new ValidationError('checkInterval must be a positive number');
    }

    if (typeof config.timeout !== 'number' || config.timeout <= 0) {
      throw new ValidationError('timeout must be a positive number');
    }

    if (typeof config.retryAttempts !== 'number' || config.retryAttempts < 1) {
      throw new ValidationError('retryAttempts must be a positive number');
    }

    if (config.timeout >= config.checkInterval) {
      throw new ValidationError('timeout should be less than checkInterval');
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Getters for monitoring state
  public isCurrentlyMonitoring(): boolean {
    return this.isMonitoring;
  }

  public getConfig(): Readonly<HealthMonitorConfig> {
    return { ...this.config };
  }

  public getLastHealthCheck(): Date {
    return new Date(this.lastHealthCheck);
  }
}