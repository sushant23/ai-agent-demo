// Business Data Service interfaces

import {
  BusinessDataService,
  Product,
  ProductFilters,
  PerformanceMetrics,
  SyncResult,
  BusinessProfile,
  BusinessDataSnapshot,
} from '../types/business';
import { DateRange } from '../types/common';

export interface IBusinessDataService extends BusinessDataService {
  initialize(config: BusinessDataServiceConfig): Promise<void>;
  shutdown(): Promise<void>;
  getServiceMetrics(): Promise<BusinessDataServiceMetrics>;
}

export interface BusinessDataServiceConfig {
  marketplaceConnectors: MarketplaceConnectorConfig[];
  syncInterval: number;
  cacheEnabled: boolean;
  cacheTTL: number;
}

export interface MarketplaceConnectorConfig {
  type: string;
  enabled: boolean;
  credentials: Record<string, string>;
  syncSettings: SyncSettings;
}

export interface SyncSettings {
  autoSync: boolean;
  syncInterval: number;
  batchSize: number;
  retryAttempts: number;
}

export interface BusinessDataServiceMetrics {
  totalProducts: number;
  syncedMarketplaces: number;
  lastSyncTime: Date;
  syncSuccessRate: number;
  averageResponseTime: number;
  cacheHitRate: number;
}

export interface IMarketplaceConnector {
  connect(credentials: Record<string, string>): Promise<void>;
  disconnect(): Promise<void>;
  testConnection(): Promise<ConnectionTestResult>;
  syncProducts(options?: SyncOptions): Promise<SyncResult>;
  getProducts(filters?: ProductFilters): Promise<Product[]>;
  getProduct(productId: string): Promise<Product | null>;
  getPerformanceMetrics(productId?: string, period?: DateRange): Promise<PerformanceMetrics>;
}

export interface ConnectionTestResult {
  success: boolean;
  latency: number;
  error?: string;
  capabilities: string[];
}

export interface SyncOptions {
  fullSync?: boolean;
  productIds?: string[];
  since?: Date;
  batchSize?: number;
}

export interface IDataAggregator {
  aggregateProducts(sources: Product[][]): Promise<Product[]>;
  aggregateMetrics(sources: PerformanceMetrics[]): Promise<PerformanceMetrics>;
  resolveConflicts(conflicts: DataConflict[]): Promise<Resolution[]>;
}

export interface DataConflict {
  field: string;
  values: unknown[];
  sources: string[];
  confidence: number[];
}

export interface Resolution {
  field: string;
  resolvedValue: unknown;
  strategy: 'latest' | 'highest_confidence' | 'manual' | 'merge';
  confidence: number;
}

export interface IDataCache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  getStats(): Promise<CacheStats>;
}

export interface CacheStats {
  size: number;
  hitCount: number;
  missCount: number;
  hitRate: number;
}

export interface IDataValidator {
  validateProduct(product: Product): ValidationResult;
  validateMetrics(metrics: PerformanceMetrics): ValidationResult;
  validateBusinessProfile(profile: BusinessProfile): ValidationResult;
  sanitizeData<T>(data: T): T;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  severity: 'error' | 'warning';
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

export interface IPerformanceAnalyzer {
  analyzeProduct(product: Product): Promise<ProductAnalysis>;
  analyzeTrends(metrics: PerformanceMetrics[], period: DateRange): Promise<TrendAnalysis>;
  compareProducts(products: Product[]): Promise<ComparisonResult>;
  generateInsights(data: BusinessDataSnapshot): Promise<BusinessInsight[]>;
}

export interface ProductAnalysis {
  productId: string;
  performanceScore: number;
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

export interface TrendAnalysis {
  period: DateRange;
  trends: Trend[];
  seasonality: SeasonalityPattern[];
  forecasts: Forecast[];
}

export interface Trend {
  metric: string;
  direction: 'up' | 'down' | 'stable';
  strength: number;
  significance: number;
}

export interface SeasonalityPattern {
  metric: string;
  pattern: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  strength: number;
  peaks: Date[];
  troughs: Date[];
}

export interface Forecast {
  metric: string;
  period: DateRange;
  predictedValue: number;
  confidence: number;
  factors: string[];
}

export interface ComparisonResult {
  products: Product[];
  rankings: ProductRanking[];
  insights: ComparisonInsight[];
}

export interface ProductRanking {
  productId: string;
  rank: number;
  score: number;
  category: string;
}

export interface ComparisonInsight {
  type: 'opportunity' | 'threat' | 'strength' | 'weakness';
  description: string;
  affectedProducts: string[];
  impact: 'low' | 'medium' | 'high';
}

export interface BusinessInsight {
  id: string;
  type: 'trend' | 'anomaly' | 'opportunity' | 'risk';
  title: string;
  description: string;
  confidence: number;
  impact: 'low' | 'medium' | 'high';
  actionable: boolean;
  relatedProducts: string[];
}
