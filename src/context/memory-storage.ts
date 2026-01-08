// In-memory context storage implementation

import { IContextStorage, StorageStats } from '../interfaces/context-manager';
import { ConversationContext } from '../types/context';

export class MemoryContextStorage implements IContextStorage {
  private contexts = new Map<string, ConversationContext>();
  private initialized = false;

  async initialize(): Promise<void> {
    this.contexts.clear();
    this.initialized = true;
  }

  async shutdown(): Promise<void> {
    this.contexts.clear();
    this.initialized = false;
  }

  async save(context: ConversationContext): Promise<void> {
    this.ensureInitialized();
    const key = this.getStorageKey(context.userId, context.sessionId);
    this.contexts.set(key, { ...context });
  }

  async load(userId: string, sessionId: string): Promise<ConversationContext | null> {
    this.ensureInitialized();
    const key = this.getStorageKey(userId, sessionId);
    const context = this.contexts.get(key);
    return context ? { ...context } : null;
  }

  async delete(userId: string, sessionId?: string): Promise<void> {
    this.ensureInitialized();
    
    if (sessionId) {
      // Delete specific session
      const key = this.getStorageKey(userId, sessionId);
      this.contexts.delete(key);
    } else {
      // Delete all sessions for user
      const userPrefix = `${userId}:`;
      const keysToDelete = Array.from(this.contexts.keys()).filter(key => 
        key.startsWith(userPrefix)
      );
      keysToDelete.forEach(key => this.contexts.delete(key));
    }
  }

  async cleanup(olderThan: Date): Promise<number> {
    this.ensureInitialized();
    
    let deletedCount = 0;
    const keysToDelete: string[] = [];

    for (const [key, context] of this.contexts.entries()) {
      if (context.lastUpdated < olderThan) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => {
      this.contexts.delete(key);
      deletedCount++;
    });

    return deletedCount;
  }

  // Enhanced cleanup methods

  async cleanupByUser(userId: string, olderThan?: Date): Promise<number> {
    this.ensureInitialized();
    
    let deletedCount = 0;
    const keysToDelete: string[] = [];
    const userPrefix = `${userId}:`;

    for (const [key, context] of this.contexts.entries()) {
      if (key.startsWith(userPrefix)) {
        if (!olderThan || context.lastUpdated < olderThan) {
          keysToDelete.push(key);
        }
      }
    }

    keysToDelete.forEach(key => {
      this.contexts.delete(key);
      deletedCount++;
    });

    return deletedCount;
  }

  async cleanupInactiveContexts(inactiveThresholdHours: number = 24): Promise<number> {
    this.ensureInitialized();
    
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - inactiveThresholdHours);
    
    return this.cleanup(cutoffDate);
  }

  async getContextsByUser(userId: string): Promise<ConversationContext[]> {
    this.ensureInitialized();
    
    const userContexts: ConversationContext[] = [];
    const userPrefix = `${userId}:`;

    for (const [key, context] of this.contexts.entries()) {
      if (key.startsWith(userPrefix)) {
        userContexts.push({ ...context });
      }
    }

    return userContexts;
  }

  async getAllContextKeys(): Promise<string[]> {
    this.ensureInitialized();
    return Array.from(this.contexts.keys());
  }

  async getStorageStats(): Promise<StorageStats> {
    this.ensureInitialized();
    
    let totalSize = 0;
    let oldestItem = new Date();
    let newestItem = new Date(0);

    for (const context of this.contexts.values()) {
      // Rough size estimation (in practice, you'd use a proper serialization)
      totalSize += JSON.stringify(context).length;
      
      if (context.lastUpdated < oldestItem) {
        oldestItem = context.lastUpdated;
      }
      if (context.lastUpdated > newestItem) {
        newestItem = context.lastUpdated;
      }
    }

    return {
      totalSize,
      itemCount: this.contexts.size,
      oldestItem: this.contexts.size > 0 ? oldestItem : new Date(),
      newestItem: this.contexts.size > 0 ? newestItem : new Date(),
    };
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('MemoryContextStorage not initialized. Call initialize() first.');
    }
  }

  private getStorageKey(userId: string, sessionId: string): string {
    return `${userId}:${sessionId}`;
  }
}