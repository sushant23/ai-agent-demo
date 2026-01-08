// Data caching service for business data

import {
  IDataCache,
  CacheStats,
} from '../interfaces/business-data-service';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  accessCount: number;
  lastAccessed: number;
}

export class DataCache implements IDataCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private hitCount = 0;
  private missCount = 0;
  private defaultTTL = 5 * 60 * 1000; // 5 minutes in milliseconds

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    
    if (!entry) {
      this.missCount++;
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.missCount++;
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.hitCount++;

    return entry.value;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const expirationTime = ttl || this.defaultTTL;
    const expiresAt = Date.now() + expirationTime;

    const entry: CacheEntry<T> = {
      value,
      expiresAt,
      accessCount: 0,
      lastAccessed: Date.now(),
    };

    this.cache.set(key, entry as CacheEntry<unknown>);

    // Clean up expired entries periodically
    if (this.cache.size % 100 === 0) {
      await this.cleanupExpired();
    }
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.hitCount = 0;
    this.missCount = 0;
  }

  async getStats(): Promise<CacheStats> {
    const totalRequests = this.hitCount + this.missCount;
    const hitRate = totalRequests > 0 ? this.hitCount / totalRequests : 0;

    return {
      size: this.cache.size,
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRate,
    };
  }

  private async cleanupExpired(): Promise<void> {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
  }

  // Additional utility methods
  async has(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  async keys(): Promise<string[]> {
    await this.cleanupExpired();
    return Array.from(this.cache.keys());
  }

  async size(): Promise<number> {
    await this.cleanupExpired();
    return this.cache.size;
  }

  // Get cache entries sorted by access frequency (for debugging/monitoring)
  async getPopularEntries(limit = 10): Promise<Array<{ key: string; accessCount: number; lastAccessed: Date }>> {
    const entries: Array<{ key: string; accessCount: number; lastAccessed: Date }> = [];

    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (Date.now() <= entry.expiresAt) {
        entries.push({
          key,
          accessCount: entry.accessCount,
          lastAccessed: new Date(entry.lastAccessed),
        });
      }
    }

    return entries
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, limit);
  }
}