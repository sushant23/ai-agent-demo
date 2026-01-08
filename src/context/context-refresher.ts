// Context refresher implementation

import { IContextRefresher } from '../interfaces/context-manager';

interface RefreshJob {
  userId: string;
  sessionId: string;
  timeout: NodeJS.Timeout;
}

interface RefreshStats {
  totalRefreshes: number;
  successfulRefreshes: number;
  failedRefreshes: number;
  lastRefreshTime?: Date;
}

export class ContextRefresher implements IContextRefresher {
  private scheduledRefreshes = new Map<string, RefreshJob>();
  private refreshStats = new Map<string, RefreshStats>();

  async refreshBusinessData(userId: string): Promise<void> {
    // In a real implementation, this would:
    // 1. Fetch fresh business data from external APIs
    // 2. Update the business data snapshot
    // 3. Invalidate related caches
    
    try {
      console.log(`Refreshing business data for user: ${userId}`);
      
      // Simulate async operation with potential failure
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          // Simulate 10% failure rate
          if (Math.random() < 0.1) {
            reject(new Error('Simulated API failure'));
          } else {
            resolve(undefined);
          }
        }, 100);
      });

      this.updateRefreshStats(userId, true);
      console.log(`Successfully refreshed business data for user: ${userId}`);
      
    } catch (error) {
      this.updateRefreshStats(userId, false);
      console.error(`Failed to refresh business data for user: ${userId}`, error);
      throw error;
    }
  }

  async refreshRecommendations(userId: string): Promise<void> {
    // In a real implementation, this would:
    // 1. Re-evaluate existing recommendations
    // 2. Generate new recommendations based on fresh data
    // 3. Update recommendation storage
    
    try {
      console.log(`Refreshing recommendations for user: ${userId}`);
      
      // Simulate async operation
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          // Simulate 5% failure rate
          if (Math.random() < 0.05) {
            reject(new Error('Recommendation engine unavailable'));
          } else {
            resolve(undefined);
          }
        }, 150);
      });

      console.log(`Successfully refreshed recommendations for user: ${userId}`);
      
    } catch (error) {
      console.error(`Failed to refresh recommendations for user: ${userId}`, error);
      throw error;
    }
  }

  // Enhanced refresh methods for better stale data handling

  async refreshBusinessDataIfStale(userId: string, maxAgeSeconds: number): Promise<boolean> {
    const stats = this.getRefreshStats(userId);
    
    if (!stats.lastRefreshTime) {
      // Never refreshed, do it now
      await this.refreshBusinessData(userId);
      return true;
    }
    
    const ageSeconds = (Date.now() - stats.lastRefreshTime.getTime()) / 1000;
    
    if (ageSeconds > maxAgeSeconds) {
      await this.refreshBusinessData(userId);
      return true;
    }
    
    return false;
  }

  async refreshRecommendationsIfStale(userId: string, maxAgeSeconds: number): Promise<boolean> {
    // Similar logic to business data refresh
    const stats = this.getRefreshStats(userId);
    
    if (!stats.lastRefreshTime) {
      await this.refreshRecommendations(userId);
      return true;
    }
    
    const ageSeconds = (Date.now() - stats.lastRefreshTime.getTime()) / 1000;
    
    if (ageSeconds > maxAgeSeconds) {
      await this.refreshRecommendations(userId);
      return true;
    }
    
    return false;
  }

  async refreshWithRetry(userId: string, maxRetries: number = 3): Promise<void> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.refreshBusinessData(userId);
        await this.refreshRecommendations(userId);
        return; // Success
      } catch (error) {
        lastError = error as Error;
        console.warn(`Refresh attempt ${attempt}/${maxRetries} failed for user ${userId}:`, error);
        
        if (attempt < maxRetries) {
          // Wait before retrying (exponential backoff)
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Max 10 seconds
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw new Error(`Failed to refresh after ${maxRetries} attempts: ${lastError?.message}`);
  }

  scheduleRefresh(userId: string, sessionId: string, delay: number): void {
    const key = this.getRefreshKey(userId, sessionId);
    
    // Cancel existing refresh if any
    this.cancelRefresh(userId, sessionId);
    
    const timeout = setTimeout(() => {
      this.executeScheduledRefresh(userId, sessionId);
    }, delay * 1000); // Convert to milliseconds
    
    this.scheduledRefreshes.set(key, {
      userId,
      sessionId,
      timeout,
    });

    console.log(`Scheduled refresh for user: ${userId}, session: ${sessionId} in ${delay} seconds`);
  }

  cancelRefresh(userId: string, sessionId: string): void {
    const key = this.getRefreshKey(userId, sessionId);
    const job = this.scheduledRefreshes.get(key);
    
    if (job) {
      clearTimeout(job.timeout);
      this.scheduledRefreshes.delete(key);
      console.log(`Cancelled refresh for user: ${userId}, session: ${sessionId}`);
    }
  }

  // Additional methods for enhanced refresh management

  getRefreshStats(userId: string): RefreshStats {
    return this.refreshStats.get(userId) || {
      totalRefreshes: 0,
      successfulRefreshes: 0,
      failedRefreshes: 0,
    };
  }

  clearRefreshStats(userId?: string): void {
    if (userId) {
      this.refreshStats.delete(userId);
    } else {
      this.refreshStats.clear();
    }
  }

  getScheduledRefreshCount(): number {
    return this.scheduledRefreshes.size;
  }

  cancelAllRefreshes(): void {
    for (const job of this.scheduledRefreshes.values()) {
      clearTimeout(job.timeout);
    }
    this.scheduledRefreshes.clear();
    console.log('Cancelled all scheduled refreshes');
  }

  private async executeScheduledRefresh(userId: string, sessionId: string): Promise<void> {
    try {
      await this.refreshBusinessData(userId);
      await this.refreshRecommendations(userId);
      
      // Remove from scheduled refreshes
      const key = this.getRefreshKey(userId, sessionId);
      this.scheduledRefreshes.delete(key);
      
      console.log(`Completed scheduled refresh for user: ${userId}, session: ${sessionId}`);
    } catch (error) {
      console.error(`Failed to execute scheduled refresh for user: ${userId}, session: ${sessionId}`, error);
      
      // Optionally reschedule with exponential backoff
      this.scheduleRetryRefresh(userId, sessionId);
    }
  }

  private scheduleRetryRefresh(userId: string, sessionId: string): void {
    const stats = this.getRefreshStats(userId);
    const retryDelay = Math.min(300, 30 * Math.pow(2, stats.failedRefreshes)); // Exponential backoff, max 5 minutes
    
    console.log(`Scheduling retry refresh for user: ${userId}, session: ${sessionId} in ${retryDelay} seconds`);
    this.scheduleRefresh(userId, sessionId, retryDelay);
  }

  private updateRefreshStats(userId: string, success: boolean): void {
    const stats = this.getRefreshStats(userId);
    
    stats.totalRefreshes++;
    stats.lastRefreshTime = new Date();
    
    if (success) {
      stats.successfulRefreshes++;
    } else {
      stats.failedRefreshes++;
    }
    
    this.refreshStats.set(userId, stats);
  }

  private getRefreshKey(userId: string, sessionId: string): string {
    return `${userId}:${sessionId}`;
  }
}