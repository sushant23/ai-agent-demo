// LLM Abstraction Layer interfaces

import {
  LLMProvider,
  TextGenerationRequest,
  TextGenerationResponse,
  ToolGenerationRequest,
  ToolGenerationResponse,
  StreamRequest,
  StreamChunk,
  ProviderConfig,
  LoadBalancerConfig,
} from '../types/llm';

export interface ILLMProviderRegistry {
  registerProvider(config: ProviderConfig, provider: LLMProvider): Promise<void>;
  getProvider(name: string): Promise<LLMProvider | null>;
  listProviders(): Promise<LLMProvider[]>;
  removeProvider(name: string): Promise<void>;
  updateProviderConfig(name: string, config: Partial<ProviderConfig>): Promise<void>;
  getProviderConfig(name: string): Promise<ProviderConfig | null>;
  getProviderStats(name: string): Promise<ProviderStats | null>;
  getAllProviderStats(): Promise<ProviderStats[]>;
  updateProviderStats(name: string, updates: Partial<ProviderStats>): void;
  incrementRequestCount(name: string): void;
  incrementErrorCount(name: string): void;
  updateResponseTime(name: string, responseTime: number): void;
}

export interface ILLMLoadBalancer {
  selectProvider(request: TextGenerationRequest): Promise<LLMProvider>;
  executeWithFallback<T>(
    operation: (provider: LLMProvider) => Promise<T>,
    maxRetries?: number
  ): Promise<T>;
  updateProviderHealth(providerName: string, isHealthy: boolean): void;
  getProviderStats(): Promise<ProviderStats[]>;
}

export interface ProviderStats {
  name: string;
  requestCount: number;
  errorCount: number;
  averageResponseTime: number;
  isHealthy: boolean;
  lastUsed: Date;
}

export interface ILLMResponseNormalizer {
  normalizeTextResponse(response: unknown, providerName: string): TextGenerationResponse;
  normalizeToolResponse(response: unknown, providerName: string): ToolGenerationResponse;
  normalizeStreamChunk(chunk: unknown, providerName: string): StreamChunk;
}

export interface ILLMHealthMonitor {
  startMonitoring(config: HealthMonitorConfig): void;
  stopMonitoring(): void;
  checkProviderHealth(provider: LLMProvider): Promise<HealthCheckResult>;
  getHealthStatus(): Promise<HealthStatus>;
}

export interface HealthMonitorConfig {
  checkInterval: number; // seconds
  timeout: number; // seconds
  retryAttempts: number;
}

export interface HealthCheckResult {
  providerName: string;
  isHealthy: boolean;
  responseTime: number;
  error?: string | undefined;
  timestamp: Date;
}

export interface HealthStatus {
  overallHealth: 'healthy' | 'degraded' | 'unhealthy';
  providers: HealthCheckResult[];
  lastCheck: Date;
}
