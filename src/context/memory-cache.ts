// In-memory context cache implementation

import { IContextCache, CacheConfig, CacheStats } from '../interfaces/context-manager';
import { ConversationContext } from '../types/context';

interface CacheEntry {
  context: ConversationContext;
  expiresAt: number;
  accessCount: number;
  lastAccessed: number;
}

export class MemoryContextCache implements IContextCache {
  private cache = new Map<string, CacheEntry>();
  private config!: CacheConfig;
  private stats = {
    hitCount: 0,
    missCount: 0,
    evictionCount: 0,
  };
  private cleanupTimer?: NodeJS.Timeout | undefined;
  private initialized = false;

  async initialize(config: CacheConfig): Promise<void> {
    this.config = config;
    this.cache.clear();
    this.resetStats();
    
    // Start cleanup timer
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, config.cleanupInterval * 1000);
    
    this.initialized = true;
  }

  async shutdown(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    
    this.cache.clear();
    this.initialized = false;
  }

  get(key: string): ConversationContext | null {
    this.ensureInitialized();
    
    const entry = this.cache.get(key);
    if (!entry) {
      this.stats.missCount++;
      return null;
    }

    const now = Date.now();
    if (entry.expiresAt < now) {
      // Entry expired
      this.cache.delete(key);
      this.stats.missCount++;
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = now;
    this.stats.hitCount++;

    return { ...entry.context };
  }

  set(key: string, context: ConversationContext, ttl?: number): void {
    this.ensureInitialized();
    
    const now = Date.now();
    const effectiveTTL = (ttl ?? this.config.defaultTTL) * 1000; // Convert to ms
    
    // Check if we need to evict entries to make room
    if (this.cache.size >= this.config.maxSize && !this.cache.has(key)) {
      this.evictLeastRecentlyUsed();
    }

    const entry: CacheEntry = {
      context: { ...context },
      expiresAt: now + effectiveTTL,
      accessCount: 0,
      lastAccessed: now,
    };

    this.cache.set(key, entry);
  }

  delete(key: string): void {
    this.ensureInitialized();
    this.cache.delete(key);
  }

  clear(): void {
    this.ensureInitialized();
    this.cache.clear();
    this.resetStats();
  }

  getStats(): CacheStats {
    this.ensureInitialized();
    
    const totalRequests = this.stats.hitCount + this.stats.missCount;
    const hitRate = totalRequests > 0 ? this.stats.hitCount / totalRequests : 0;

    return {
      size: this.cache.size,
      hitCount: this.stats.hitCount,
      missCount: this.stats.missCount,
      evictionCount: this.stats.evictionCount,
      hitRate,
    };
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('MemoryContextCache not initialized. Call initialize() first.');
    }
  }

  private resetStats(): void {
    this.stats = {
      hitCount: 0,
      missCount: 0,
      evictionCount: 0,
    };
  }

  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt < now) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  private evictLeastRecentlyUsed(): void {
    let lruKey: string | null = null;
    let lruTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < lruTime) {
        lruTime = entry.lastAccessed;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
      this.stats.evictionCount++;
    }
  }
}