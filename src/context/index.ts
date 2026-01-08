// Context module exports

export { ContextManager } from './context-manager';
export { MemoryContextStorage } from './memory-storage';
export { MemoryContextCache } from './memory-cache';
export { ContextRefresher } from './context-refresher';
export { ContextCompressor } from './context-compressor';
export { ContextValidator } from './context-validator';

// Factory function for creating a complete context manager
import { ContextManager } from './context-manager';
import { MemoryContextStorage } from './memory-storage';
import { MemoryContextCache } from './memory-cache';
import { ContextRefresher } from './context-refresher';
import { ContextCompressor } from './context-compressor';
import { ContextValidator } from './context-validator';
import { ContextManagerConfig } from '../interfaces/context-manager';

export function createContextManager(): ContextManager {
  const storage = new MemoryContextStorage();
  const cache = new MemoryContextCache();
  const refresher = new ContextRefresher();
  const compressor = new ContextCompressor();
  const validator = new ContextValidator();

  return new ContextManager(storage, cache, refresher, compressor, validator);
}

export function createDefaultContextManagerConfig(): ContextManagerConfig {
  return {
    storage: new MemoryContextStorage(),
    cache: new MemoryContextCache(),
    refreshConfig: {
      businessDataTTL: 3600, // 1 hour
      recommendationsTTL: 1800, // 30 minutes
      conversationHistoryLimit: 50,
      autoRefreshEnabled: true,
    },
    compressionEnabled: true,
    maxContextSize: 1000, // Max number of contexts in cache
  };
}