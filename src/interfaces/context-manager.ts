// Context Manager interfaces

import {
  ContextManager,
  ConversationContext,
  ContextStorage,
  ContextCache,
  ContextRefreshConfig,
} from '../types/context';
import { Recommendation } from '../types/recommendations';

export interface IContextManager extends ContextManager {
  initialize(config: ContextManagerConfig): Promise<void>;
  shutdown(): Promise<void>;
  refreshContext(userId: string, sessionId: string): Promise<ConversationContext>;
  compressContext(context: ConversationContext): Promise<ConversationContext>;
  getContextMetrics(): Promise<ContextMetrics>;
  forceCleanup(): Promise<{deletedContexts: number, cleanedTimers: number}>;
  refreshAllActiveContexts(): Promise<{refreshed: number, failed: number}>;
  compressAllContexts(): Promise<{compressed: number, failed: number}>;
}

export interface ContextManagerConfig {
  storage: ContextStorage;
  cache: ContextCache;
  refreshConfig: ContextRefreshConfig;
  compressionEnabled: boolean;
  maxContextSize: number;
}

export interface ContextMetrics {
  totalContexts: number;
  activeContexts: number;
  averageContextSize: number;
  cacheHitRate: number;
  refreshRate: number;
}

export interface IContextStorage extends ContextStorage {
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  getStorageStats(): Promise<StorageStats>;
  cleanupByUser(userId: string, olderThan?: Date): Promise<number>;
  cleanupInactiveContexts(inactiveThresholdHours?: number): Promise<number>;
  getContextsByUser(userId: string): Promise<ConversationContext[]>;
  getAllContextKeys(): Promise<string[]>;
}

export interface StorageStats {
  totalSize: number;
  itemCount: number;
  oldestItem: Date;
  newestItem: Date;
}

export interface IContextCache extends ContextCache {
  initialize(config: CacheConfig): Promise<void>;
  shutdown(): Promise<void>;
  getStats(): CacheStats;
}

export interface CacheConfig {
  maxSize: number;
  defaultTTL: number;
  cleanupInterval: number;
}

export interface CacheStats {
  size: number;
  hitCount: number;
  missCount: number;
  evictionCount: number;
  hitRate: number;
}

export interface IContextRefresher {
  refreshBusinessData(userId: string): Promise<void>;
  refreshRecommendations(userId: string): Promise<void>;
  scheduleRefresh(userId: string, sessionId: string, delay: number): void;
  cancelRefresh(userId: string, sessionId: string): void;
  refreshBusinessDataIfStale(userId: string, maxAgeSeconds: number): Promise<boolean>;
  refreshRecommendationsIfStale(userId: string, maxAgeSeconds: number): Promise<boolean>;
  refreshWithRetry(userId: string, maxRetries?: number): Promise<void>;
}

export interface IContextCompressor {
  compress(context: ConversationContext): Promise<ConversationContext>;
  decompress(compressedContext: ConversationContext): Promise<ConversationContext>;
  getCompressionRatio(context: ConversationContext): number;
}

export interface IContextValidator {
  validate(context: ConversationContext): ValidationResult;
  repair(context: ConversationContext): Promise<ConversationContext>;
  checkIntegrity(context: ConversationContext): IntegrityResult;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface IntegrityResult {
  isIntact: boolean;
  corruptedFields: string[];
  repairSuggestions: string[];
}
