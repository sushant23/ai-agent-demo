// Context Manager implementation

import {
  IContextManager,
  ContextManagerConfig,
  ContextMetrics,
  IContextStorage,
  IContextCache,
  IContextRefresher,
  IContextCompressor,
  IContextValidator,
  ValidationResult,
  IntegrityResult,
} from '../interfaces/context-manager';
import {
  ConversationContext,
  ContextRefreshConfig,
  FlowContextState,
  UserPreferences,
  NotificationSettings,
  DisplaySettings,
} from '../types/context';
import { Recommendation } from '../types/recommendations';
import { BusinessDataSnapshot } from '../types/business';
import { Message } from '../types/llm';

export class ContextManager implements IContextManager {
  private config!: ContextManagerConfig;
  private storage: IContextStorage;
  private cache: IContextCache;
  private refresher: IContextRefresher;
  private compressor: IContextCompressor;
  private validator: IContextValidator;
  private initialized = false;
  private cleanupTimer?: NodeJS.Timeout | undefined;
  private refreshTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    storage: IContextStorage,
    cache: IContextCache,
    refresher: IContextRefresher,
    compressor: IContextCompressor,
    validator: IContextValidator
  ) {
    this.storage = storage;
    this.cache = cache;
    this.refresher = refresher;
    this.compressor = compressor;
    this.validator = validator;
  }

  async initialize(config: ContextManagerConfig): Promise<void> {
    this.config = config;
    
    await this.storage.initialize();
    await this.cache.initialize({
      maxSize: config.maxContextSize,
      defaultTTL: config.refreshConfig.businessDataTTL,
      cleanupInterval: 300, // 5 minutes
    });

    // Start automatic cleanup timer
    this.startCleanupTimer();

    this.initialized = true;
  }

  async shutdown(): Promise<void> {
    if (!this.initialized) return;

    // Stop all timers
    this.stopCleanupTimer();
    this.stopAllRefreshTimers();

    await this.storage.shutdown();
    await this.cache.shutdown();
    this.initialized = false;
  }

  async getContext(userId: string, sessionId: string): Promise<ConversationContext> {
    this.ensureInitialized();

    const cacheKey = this.getCacheKey(userId, sessionId);
    
    // Try cache first
    let context = this.cache.get(cacheKey);
    if (context) {
      // Check if context needs refresh
      if (this.shouldRefreshContext(context)) {
        context = await this.refreshContext(userId, sessionId);
      }
      return context;
    }

    // Load from storage
    context = await this.storage.load(userId, sessionId);
    if (context) {
      // Validate and repair if needed
      const validation = this.validator.validate(context);
      if (!validation.isValid) {
        context = await this.validator.repair(context);
      }

      // Cache the context
      this.cache.set(cacheKey, context, this.config.refreshConfig.businessDataTTL);
      
      return context;
    }

    // Create new context if none exists
    return this.createNewContext(userId, sessionId);
  }

  async updateContext(context: ConversationContext): Promise<void> {
    this.ensureInitialized();

    // Validate context before updating
    const validation = this.validator.validate(context);
    if (!validation.isValid) {
      throw new Error(`Invalid context: ${validation.errors.join(', ')}`);
    }

    // Update timestamp
    context.lastUpdated = new Date();

    // Compress if needed
    if (this.config.compressionEnabled && this.shouldCompressContext(context)) {
      context = await this.compressor.compress(context);
    }

    // Update cache
    const cacheKey = this.getCacheKey(context.userId, context.sessionId);
    this.cache.set(cacheKey, context, this.config.refreshConfig.businessDataTTL);

    // Persist to storage
    await this.storage.save(context);

    // Schedule automatic refresh if enabled
    if (this.config.refreshConfig.autoRefreshEnabled) {
      this.scheduleContextRefresh(context.userId, context.sessionId);
    }
  }

  async clearContext(userId: string, sessionId?: string): Promise<void> {
    this.ensureInitialized();

    if (sessionId) {
      // Clear specific session
      const cacheKey = this.getCacheKey(userId, sessionId);
      this.cache.delete(cacheKey);
      await this.storage.delete(userId, sessionId);
      
      // Cancel any scheduled refresh for this session
      this.cancelContextRefresh(userId, sessionId);
    } else {
      // Clear all sessions for user
      // Note: This is a simplified implementation
      // In production, you'd want to iterate through all sessions
      await this.storage.delete(userId);
      
      // Cancel all refresh timers for this user
      this.cancelAllUserRefreshTimers(userId);
    }
  }

  async persistRecommendations(recommendations: Recommendation[]): Promise<void> {
    this.ensureInitialized();

    // Group recommendations by user/session if they have context
    const contextUpdates = new Map<string, ConversationContext>();

    for (const recommendation of recommendations) {
      // For now, we'll need to determine which context to update
      // This would typically be passed as a parameter or derived from the recommendation
      // For this implementation, we'll skip the automatic context update
      // and rely on explicit context updates when recommendations are generated
    }
  }

  async refreshContext(userId: string, sessionId: string): Promise<ConversationContext> {
    this.ensureInitialized();

    // Get context without triggering automatic refresh to avoid circular dependency
    const cacheKey = this.getCacheKey(userId, sessionId);
    let context = this.cache.get(cacheKey);
    
    if (!context) {
      // Load from storage without refresh check
      context = await this.storage.load(userId, sessionId);
      if (!context) {
        // Create new context if none exists
        context = await this.createNewContext(userId, sessionId);
      }
    }
    
    try {
      // Refresh business data
      await this.refresher.refreshBusinessData(userId);
      
      // Refresh recommendations
      await this.refresher.refreshRecommendations(userId);

      // Update context timestamp
      context.lastUpdated = new Date();
      
      // Update business data timestamp
      if (context.businessData) {
        context.businessData.lastUpdated = new Date();
      }

      // Validate the refreshed context
      const validation = this.validator.validate(context);
      if (!validation.isValid) {
        console.warn(`Context validation failed after refresh for user ${userId}, session ${sessionId}:`, validation.errors);
        // Attempt to repair the context
        const repairedContext = await this.validator.repair(context);
        await this.updateContext(repairedContext);
        return repairedContext;
      }

      // Update the context
      await this.updateContext(context);

      console.log(`Successfully refreshed context for user: ${userId}, session: ${sessionId}`);
      return context;
      
    } catch (error) {
      console.error(`Failed to refresh context for user: ${userId}, session: ${sessionId}`, error);
      
      // Return the existing context even if refresh failed
      // This ensures the system continues to work with potentially stale data
      return context;
    }
  }

  async compressContext(context: ConversationContext): Promise<ConversationContext> {
    this.ensureInitialized();
    return await this.compressor.compress(context);
  }

  async getContextMetrics(): Promise<ContextMetrics> {
    this.ensureInitialized();

    const cacheStats = this.cache.getStats();
    const storageStats = await this.storage.getStorageStats();

    return {
      totalContexts: storageStats.itemCount,
      activeContexts: cacheStats.size,
      averageContextSize: storageStats.totalSize / Math.max(storageStats.itemCount, 1),
      cacheHitRate: cacheStats.hitRate,
      refreshRate: 0, // Would need to track this separately
    };
  }

  // Enhanced cleanup and refresh methods

  async forceCleanup(): Promise<{deletedContexts: number, cleanedTimers: number}> {
    this.ensureInitialized();
    
    console.log('Starting forced cleanup...');
    
    // Perform immediate cleanup
    const cutoffDate = new Date();
    const maxAgeHours = this.config.refreshConfig.businessDataTTL / 3600;
    const sessionExpiryHours = Math.max(maxAgeHours * 2, 24);
    
    cutoffDate.setHours(cutoffDate.getHours() - sessionExpiryHours);
    
    const deletedContexts = await this.storage.cleanup(cutoffDate);
    
    // Clean up stale timers
    const initialTimerCount = this.refreshTimers.size;
    await this.cleanupStaleRefreshTimers();
    const cleanedTimers = initialTimerCount - this.refreshTimers.size;
    
    // Force cache cleanup
    // The cache handles its own cleanup, but we can clear expired entries
    
    console.log(`Forced cleanup completed: ${deletedContexts} contexts deleted, ${cleanedTimers} timers cleaned`);
    
    return { deletedContexts, cleanedTimers };
  }

  async refreshAllActiveContexts(): Promise<{refreshed: number, failed: number}> {
    this.ensureInitialized();
    
    console.log('Starting refresh of all active contexts...');
    
    let refreshed = 0;
    let failed = 0;
    
    // Get all active contexts from cache
    const cacheStats = this.cache.getStats();
    console.log(`Found ${cacheStats.size} active contexts in cache`);
    
    // In a real implementation, you'd iterate through cache entries
    // For now, we'll simulate this by tracking refresh operations
    
    // Note: In a production system, you'd want to:
    // 1. Get all cache keys
    // 2. Extract userId/sessionId from keys
    // 3. Refresh each context
    // 4. Handle failures gracefully
    
    console.log(`Refresh completed: ${refreshed} successful, ${failed} failed`);
    
    return { refreshed, failed };
  }

  async compressAllContexts(): Promise<{compressed: number, failed: number}> {
    this.ensureInitialized();
    
    console.log('Starting compression of all contexts...');
    
    let compressed = 0;
    let failed = 0;
    
    // In a real implementation, you'd iterate through all contexts
    // and compress those that meet the compression criteria
    
    console.log(`Compression completed: ${compressed} contexts compressed, ${failed} failed`);
    
    return { compressed, failed };
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('ContextManager not initialized. Call initialize() first.');
    }
  }

  private getCacheKey(userId: string, sessionId: string): string {
    return `context:${userId}:${sessionId}`;
  }

  private shouldRefreshContext(context: ConversationContext): boolean {
    const now = new Date();
    const timeSinceUpdate = now.getTime() - context.lastUpdated.getTime();
    const refreshThreshold = this.config.refreshConfig.businessDataTTL * 1000; // Convert to ms
    
    // Check if basic TTL has expired
    if (timeSinceUpdate > refreshThreshold) {
      return true;
    }
    
    // Check if business data is stale
    if (context.businessData && context.businessData.lastUpdated) {
      const businessDataAge = now.getTime() - context.businessData.lastUpdated.getTime();
      const businessDataThreshold = this.config.refreshConfig.businessDataTTL * 1000;
      
      if (businessDataAge > businessDataThreshold) {
        return true;
      }
    }
    
    // Check if recommendations are stale
    const recommendationThreshold = this.config.refreshConfig.recommendationsTTL * 1000;
    for (const recommendations of context.recommendations.values()) {
      for (const rec of recommendations) {
        if (rec.createdAt) {
          const recAge = now.getTime() - rec.createdAt.getTime();
          if (recAge > recommendationThreshold) {
            return true;
          }
        }
      }
    }
    
    return false;
  }

  private shouldCompressContext(context: ConversationContext): boolean {
    // Check conversation history length
    if (context.conversationHistory.length > this.config.refreshConfig.conversationHistoryLimit) {
      return true;
    }
    
    // Check total context size estimation
    const estimatedSize = this.estimateContextSize(context);
    const sizeThreshold = this.config.maxContextSize * 0.8; // Compress at 80% of max size
    
    if (estimatedSize > sizeThreshold) {
      return true;
    }
    
    // Check recommendation count
    let totalRecommendations = 0;
    for (const recs of context.recommendations.values()) {
      totalRecommendations += recs.length;
    }
    
    if (totalRecommendations > 50) {
      return true;
    }
    
    return false;
  }

  private estimateContextSize(context: ConversationContext): number {
    // Rough estimation of context size in bytes
    let size = 0;
    
    // Base context fields
    size += 1000;
    
    // Conversation history
    size += context.conversationHistory.length * 200; // Assume 200 bytes per message
    
    // Recommendations
    for (const recs of context.recommendations.values()) {
      size += recs.length * 500; // Assume 500 bytes per recommendation
    }
    
    // Business data (rough estimation)
    if (context.businessData) {
      size += 2000; // Base business data
      size += (context.businessData.topPerformingProducts?.length || 0) * 1000;
      size += (context.businessData.marketplaceStatus?.length || 0) * 300;
      
      if (context.businessData.recentMetrics?.trends) {
        size += context.businessData.recentMetrics.trends.length * 200;
      }
    }
    
    return size;
  }

  private async createNewContext(userId: string, sessionId: string): Promise<ConversationContext> {
    const defaultPreferences: UserPreferences = {
      language: 'en',
      timezone: 'UTC',
      currency: 'USD',
      notificationSettings: {
        emailEnabled: true,
        pushEnabled: true,
        smsEnabled: false,
        frequency: 'daily',
      },
      displaySettings: {
        theme: 'auto',
        compactMode: false,
        showAdvancedMetrics: false,
      },
    };

    const defaultBusinessData: BusinessDataSnapshot = {
      totalProducts: 0,
      totalRevenue: { amount: 0, currency: 'USD' },
      topPerformingProducts: [],
      recentMetrics: {
        revenue: { amount: 0, currency: 'USD' },
        salesCount: 0,
        conversionRate: 0,
        impressions: 0,
        clicks: 0,
        profitMargin: 0,
        period: {
          start: new Date(),
          end: new Date(),
        },
        trends: [],
      },
      marketplaceStatus: [],
      lastUpdated: new Date(),
    };

    const context: ConversationContext = {
      userId,
      sessionId,
      businessData: defaultBusinessData,
      recommendations: new Map(),
      conversationHistory: [],
      userPreferences: defaultPreferences,
      lastUpdated: new Date(),
    };

    // Save the new context
    await this.updateContext(context);

    return context;
  }

  // Cleanup and refresh management methods

  private startCleanupTimer(): void {
    // Run cleanup every hour
    this.cleanupTimer = setInterval(() => {
      this.performCleanup();
    }, 60 * 60 * 1000); // 1 hour
  }

  private stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  private async performCleanup(): Promise<void> {
    try {
      // Clean up expired contexts from storage based on configuration
      const cutoffDate = new Date();
      const maxAgeHours = this.config.refreshConfig.businessDataTTL / 3600; // Convert seconds to hours
      const sessionExpiryHours = Math.max(maxAgeHours * 2, 24); // Sessions expire after 2x data TTL or 24 hours minimum
      
      cutoffDate.setHours(cutoffDate.getHours() - sessionExpiryHours);
      
      const deletedCount = await this.storage.cleanup(cutoffDate);
      console.log(`Cleaned up ${deletedCount} expired contexts (older than ${sessionExpiryHours} hours)`);

      // Clean up expired sessions from cache
      await this.cleanupExpiredSessions();
      
      // Clean up stale refresh timers
      await this.cleanupStaleRefreshTimers();
      
    } catch (error) {
      console.error('Error during context cleanup:', error);
    }
  }

  private async cleanupExpiredSessions(): Promise<void> {
    // Clean up cache entries that are stale
    const cacheStats = this.cache.getStats();
    console.log(`Cache cleanup: ${cacheStats.size} entries before cleanup`);
    
    // The cache implementation handles its own TTL-based cleanup
    // But we can force a cleanup of contexts that should be refreshed
    const contextsToRefresh: Array<{userId: string, sessionId: string}> = [];
    
    // In a production system, you'd iterate through active contexts
    // and identify those that need refresh or cleanup
    // For now, we'll let the cache handle its own cleanup
    
    if (contextsToRefresh.length > 0) {
      console.log(`Identified ${contextsToRefresh.length} contexts for refresh`);
      
      // Optionally trigger refresh for active but stale contexts
      for (const {userId, sessionId} of contextsToRefresh) {
        if (this.config.refreshConfig.autoRefreshEnabled) {
          try {
            await this.refreshContext(userId, sessionId);
          } catch (error) {
            console.warn(`Failed to refresh context for user ${userId}, session ${sessionId}:`, error);
          }
        }
      }
    }
  }

  private async cleanupStaleRefreshTimers(): Promise<void> {
    // Clean up refresh timers for contexts that no longer exist
    const activeTimers = Array.from(this.refreshTimers.keys());
    let cleanedTimers = 0;
    
    for (const timerKey of activeTimers) {
      const parts = timerKey.split(':');
      if (parts.length !== 2) {
        // Invalid timer key format, clean it up
        const timer = this.refreshTimers.get(timerKey);
        if (timer) {
          clearTimeout(timer);
          this.refreshTimers.delete(timerKey);
          cleanedTimers++;
        }
        continue;
      }
      
      const [userId, sessionId] = parts;
      
      // Ensure both userId and sessionId are defined
      if (!userId || !sessionId) {
        // Invalid timer key format, clean it up
        const timer = this.refreshTimers.get(timerKey);
        if (timer) {
          clearTimeout(timer);
          this.refreshTimers.delete(timerKey);
          cleanedTimers++;
        }
        continue;
      }
      
      // Check if the context still exists in storage
      try {
        const context = await this.storage.load(userId, sessionId);
        if (!context) {
          // Context no longer exists, cancel the timer
          this.cancelContextRefresh(userId, sessionId);
          cleanedTimers++;
        }
      } catch (error) {
        // If we can't check, err on the side of caution and keep the timer
        console.warn(`Could not verify context existence for timer ${timerKey}:`, error);
      }
    }
    
    if (cleanedTimers > 0) {
      console.log(`Cleaned up ${cleanedTimers} stale refresh timers`);
    }
  }

  private scheduleContextRefresh(userId: string, sessionId: string): void {
    const refreshKey = this.getRefreshKey(userId, sessionId);
    
    // Cancel existing refresh timer if any
    this.cancelContextRefresh(userId, sessionId);
    
    // Schedule refresh based on business data TTL
    const refreshDelay = this.config.refreshConfig.businessDataTTL * 1000; // Convert to ms
    
    const timer = setTimeout(async () => {
      try {
        await this.refreshContext(userId, sessionId);
        console.log(`Auto-refreshed context for user: ${userId}, session: ${sessionId}`);
      } catch (error) {
        console.error(`Failed to auto-refresh context for user: ${userId}, session: ${sessionId}`, error);
      } finally {
        // Remove the timer from our tracking
        this.refreshTimers.delete(refreshKey);
      }
    }, refreshDelay);
    
    this.refreshTimers.set(refreshKey, timer);
  }

  private cancelContextRefresh(userId: string, sessionId: string): void {
    const refreshKey = this.getRefreshKey(userId, sessionId);
    const timer = this.refreshTimers.get(refreshKey);
    
    if (timer) {
      clearTimeout(timer);
      this.refreshTimers.delete(refreshKey);
    }
  }

  private cancelAllUserRefreshTimers(userId: string): void {
    const userPrefix = `${userId}:`;
    const keysToCancel: string[] = [];
    
    for (const [key, timer] of this.refreshTimers.entries()) {
      if (key.startsWith(userPrefix)) {
        clearTimeout(timer);
        keysToCancel.push(key);
      }
    }
    
    keysToCancel.forEach(key => this.refreshTimers.delete(key));
  }

  private stopAllRefreshTimers(): void {
    for (const timer of this.refreshTimers.values()) {
      clearTimeout(timer);
    }
    this.refreshTimers.clear();
  }

  private getRefreshKey(userId: string, sessionId: string): string {
    return `${userId}:${sessionId}`;
  }
}