// Context compressor implementation

import { IContextCompressor } from '../interfaces/context-manager';
import { ConversationContext } from '../types/context';
import { Message } from '../types/llm';

interface CompressionConfig {
  maxMessages: number;
  maxRecommendationAge: number; // days
  preserveSystemMessages: boolean;
  compressionRatio: number;
}

export class ContextCompressor implements IContextCompressor {
  private config: CompressionConfig = {
    maxMessages: 20,
    maxRecommendationAge: 7,
    preserveSystemMessages: true,
    compressionRatio: 0.7,
  };

  async compress(context: ConversationContext): Promise<ConversationContext> {
    const compressedContext = { ...context };
    
    // Compress conversation history by keeping only recent messages
    compressedContext.conversationHistory = this.compressConversationHistory(
      context.conversationHistory
    );
    
    // Compress recommendations by keeping only active ones
    compressedContext.recommendations = this.compressRecommendations(
      context.recommendations
    );
    
    // Compress business data by removing detailed metrics
    compressedContext.businessData = this.compressBusinessData(
      context.businessData
    );
    
    return compressedContext;
  }

  async decompress(compressedContext: ConversationContext): Promise<ConversationContext> {
    // In a real implementation, this might restore compressed data from storage
    // For now, we'll just return the context as-is since our compression is lossy
    return { ...compressedContext };
  }

  getCompressionRatio(context: ConversationContext): number {
    const originalSize = this.estimateContextSize(context);
    
    // Simulate compression by calculating what the size would be after compression
    const compressedHistorySize = Math.min(
      context.conversationHistory.length * 100, // Assume 100 chars per message
      this.config.maxMessages * 100 // Keep only last N messages
    );
    
    const compressedRecommendationsSize = this.estimateRecommendationsSize(
      context.recommendations
    ) * this.config.compressionRatio;
    
    const compressedBusinessDataSize = this.estimateBusinessDataSize(
      context.businessData
    ) * 0.5; // Assume 50% compression for business data
    
    const compressedSize = compressedHistorySize + compressedRecommendationsSize + compressedBusinessDataSize + 1000; // Base context size
    
    return originalSize > 0 ? compressedSize / originalSize : 1;
  }

  // Configuration methods
  setCompressionConfig(config: Partial<CompressionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getCompressionConfig(): CompressionConfig {
    return { ...this.config };
  }

  // Enhanced compression methods
  shouldCompress(context: ConversationContext): boolean {
    const size = this.estimateContextSize(context);
    const threshold = 50000; // 50KB threshold
    
    return size > threshold || 
           context.conversationHistory.length > this.config.maxMessages * 2 ||
           this.getRecommendationCount(context.recommendations) > 50;
  }

  private compressConversationHistory(history: Message[]): Message[] {
    if (history.length <= this.config.maxMessages) {
      return [...history];
    }
    
    const compressed: Message[] = [];
    
    // Always keep system messages if configured
    if (this.config.preserveSystemMessages) {
      const systemMessages = history.filter(msg => msg.role === 'system');
      compressed.push(...systemMessages);
    }
    
    // Keep the most recent messages
    const nonSystemMessages = history.filter(msg => msg.role !== 'system');
    const recentMessages = nonSystemMessages.slice(-this.config.maxMessages);
    
    // Merge and sort by timestamp
    const allMessages = [...compressed, ...recentMessages];
    allMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    return allMessages;
  }

  private compressRecommendations(recommendations: Map<string, any[]>): Map<string, any[]> {
    const compressed = new Map();
    
    // Keep only recommendations from the last N days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.maxRecommendationAge);
    
    for (const [key, recs] of recommendations.entries()) {
      const recentRecs = recs.filter(rec => {
        if (!rec.createdAt) return true; // Keep if no date
        return new Date(rec.createdAt) > cutoffDate;
      });
      
      if (recentRecs.length > 0) {
        // Keep only the most important recommendations (by priority)
        const sortedRecs = recentRecs.sort((a, b) => {
          const priorityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
          return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
        });
        
        // Keep top 10 recommendations per category
        compressed.set(key, sortedRecs.slice(0, 10));
      }
    }
    
    return compressed;
  }

  private compressBusinessData(businessData: any): any {
    const compressed = { ...businessData };
    
    // Keep only essential metrics, remove detailed trends
    if (compressed.recentMetrics && compressed.recentMetrics.trends) {
      // Keep only the last 5 trends
      compressed.recentMetrics.trends = compressed.recentMetrics.trends.slice(-5);
    }
    
    // Keep only top 5 performing products
    if (compressed.topPerformingProducts) {
      compressed.topPerformingProducts = compressed.topPerformingProducts.slice(0, 5);
    }
    
    // Simplify marketplace status
    if (compressed.marketplaceStatus) {
      compressed.marketplaceStatus = compressed.marketplaceStatus.map((status: any) => ({
        marketplace: {
          id: status.marketplace.id,
          name: status.marketplace.name,
          type: status.marketplace.type,
        },
        isHealthy: status.isHealthy,
        productsCount: status.productsCount,
      }));
    }
    
    return compressed;
  }

  private estimateContextSize(context: ConversationContext): number {
    // Rough estimation of context size in bytes
    let size = 0;
    
    // Conversation history
    size += context.conversationHistory.length * 200; // Assume 200 bytes per message
    
    // Recommendations
    size += this.estimateRecommendationsSize(context.recommendations);
    
    // Business data
    size += this.estimateBusinessDataSize(context.businessData);
    
    // Other fields
    size += 1000;
    
    return size;
  }

  private estimateRecommendationsSize(recommendations: Map<string, any[]>): number {
    let size = 0;
    
    for (const recs of recommendations.values()) {
      size += recs.length * 500; // Assume 500 bytes per recommendation
    }
    
    return size;
  }

  private estimateBusinessDataSize(businessData: any): number {
    // Rough estimation based on the structure
    let size = 1000; // Base size
    
    if (businessData.topPerformingProducts) {
      size += businessData.topPerformingProducts.length * 1000;
    }
    
    if (businessData.recentMetrics && businessData.recentMetrics.trends) {
      size += businessData.recentMetrics.trends.length * 200;
    }
    
    if (businessData.marketplaceStatus) {
      size += businessData.marketplaceStatus.length * 300;
    }
    
    return size;
  }

  private getRecommendationCount(recommendations: Map<string, any[]>): number {
    let count = 0;
    for (const recs of recommendations.values()) {
      count += recs.length;
    }
    return count;
  }
}