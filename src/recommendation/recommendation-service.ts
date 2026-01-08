// Recommendation Service - High-level service for recommendation management

import {
  Recommendation,
  RecommendationDetail,
  OutcomeData,
  RecommendationFilters,
  AnalysisType,
  BusinessData,
  OutcomeStatus
} from '../types/recommendations';
import {
  IRecommendationEngine,
  IRecommendationStorage,
  RecommendationEngineConfig
} from '../interfaces/recommendation-engine';
import { RecommendationEngineImpl } from './recommendation-engine';
import { RecommendationStorageImpl } from './recommendation-storage';

export class RecommendationService {
  private engine: IRecommendationEngine;
  private storage: IRecommendationStorage;
  private isInitialized = false;

  constructor(config?: RecommendationEngineConfig) {
    this.storage = new RecommendationStorageImpl();
    this.engine = new RecommendationEngineImpl();
    
    if (config) {
      this.initialize(config);
    }
  }

  async initialize(config: RecommendationEngineConfig): Promise<void> {
    // Use the same storage instance for both engine and service
    config.storage = this.storage;
    await this.engine.initialize(config);
    await this.storage.initialize();
    this.isInitialized = true;
  }

  async shutdown(): Promise<void> {
    if (this.engine) {
      await this.engine.shutdown();
    }
    if (this.storage) {
      await this.storage.shutdown();
    }
    this.isInitialized = false;
  }

  // Core recommendation operations
  async generateRecommendations(
    productId: string,
    analysisType: AnalysisType,
    businessData: BusinessData
  ): Promise<Recommendation[]> {
    this.ensureInitialized();
    return await this.engine.generateRecommendations(productId, analysisType, businessData);
  }

  async getRecommendation(recommendationId: string): Promise<Recommendation | null> {
    this.ensureInitialized();
    return await this.storage.load(recommendationId);
  }

  async expandRecommendation(recommendationId: string): Promise<RecommendationDetail> {
    this.ensureInitialized();
    return await this.engine.expandRecommendation(recommendationId);
  }

  // Persistence operations
  async saveRecommendation(recommendation: Recommendation): Promise<void> {
    this.ensureInitialized();
    await this.storage.save(recommendation);
  }

  async saveRecommendationDetail(detail: RecommendationDetail): Promise<void> {
    this.ensureInitialized();
    await this.storage.saveDetail(detail);
  }

  async getUserRecommendations(
    userId: string,
    filters?: RecommendationFilters
  ): Promise<Recommendation[]> {
    this.ensureInitialized();
    return await this.storage.loadByUser(userId, filters);
  }

  // Outcome tracking operations
  async trackOutcome(outcome: OutcomeData): Promise<void> {
    this.ensureInitialized();
    await this.storage.trackOutcome(outcome);
  }

  async markRecommendationImplemented(
    recommendationId: string,
    implementedAt: Date = new Date(),
    notes?: string
  ): Promise<void> {
    this.ensureInitialized();
    
    const outcome: OutcomeData = {
      recommendationId,
      status: OutcomeStatus.IMPLEMENTED,
      implementedAt,
      ...(notes && { notes })
    };
    
    await this.trackOutcome(outcome);
  }

  async markRecommendationRejected(
    recommendationId: string,
    reason?: string
  ): Promise<void> {
    this.ensureInitialized();
    
    const outcome: OutcomeData = {
      recommendationId,
      status: OutcomeStatus.REJECTED,
      ...(reason && { notes: reason })
    };
    
    await this.trackOutcome(outcome);
  }

  async updateRecommendationProgress(
    recommendationId: string,
    status: OutcomeStatus,
    notes?: string
  ): Promise<void> {
    this.ensureInitialized();
    
    const outcome: OutcomeData = {
      recommendationId,
      status,
      ...(notes && { notes })
    };
    
    await this.trackOutcome(outcome);
  }

  // Analytics and reporting
  async getRecommendationOutcomes(recommendationId: string): Promise<OutcomeData[]> {
    this.ensureInitialized();
    
    // Cast storage to access additional methods
    const storageImpl = this.storage as RecommendationStorageImpl;
    return await storageImpl.getOutcomes(recommendationId);
  }

  async getRecommendationMetrics() {
    this.ensureInitialized();
    return await this.engine.getEngineMetrics();
  }

  async getStorageMetrics() {
    this.ensureInitialized();
    return await this.storage.getStorageMetrics();
  }

  async getRecommendationStatistics(userId: string) {
    this.ensureInitialized();
    
    const userRecommendations = await this.getUserRecommendations(userId);
    const activeRecommendations = await this.getActiveRecommendations(userId);
    
    const categoryStats: Record<string, number> = {};
    const priorityStats: Record<string, number> = {};
    
    userRecommendations.forEach(rec => {
      categoryStats[rec.category] = (categoryStats[rec.category] || 0) + 1;
      priorityStats[rec.priority] = (priorityStats[rec.priority] || 0) + 1;
    });
    
    return {
      totalRecommendations: userRecommendations.length,
      activeRecommendations: activeRecommendations.length,
      categoryBreakdown: categoryStats,
      priorityBreakdown: priorityStats,
      completionRate: userRecommendations.length > 0 
        ? (userRecommendations.length - activeRecommendations.length) / userRecommendations.length 
        : 0
    };
  }

  // Bulk operations
  async generateBulkRecommendations(
    requests: Array<{
      productId: string;
      analysisType: AnalysisType;
      businessData: BusinessData;
    }>
  ): Promise<Recommendation[]> {
    this.ensureInitialized();
    
    const allRecommendations: Recommendation[] = [];
    
    for (const request of requests) {
      const recommendations = await this.generateRecommendations(
        request.productId,
        request.analysisType,
        request.businessData
      );
      allRecommendations.push(...recommendations);
    }
    
    return allRecommendations;
  }

  async expandMultipleRecommendations(recommendationIds: string[]): Promise<RecommendationDetail[]> {
    this.ensureInitialized();
    
    const details: RecommendationDetail[] = [];
    
    for (const id of recommendationIds) {
      try {
        const detail = await this.expandRecommendation(id);
        details.push(detail);
      } catch (error) {
        console.warn(`Failed to expand recommendation ${id}:`, error);
        // Continue with other recommendations
      }
    }
    
    return details;
  }

  // Search and filtering
  async searchRecommendations(
    userId: string,
    query: string,
    filters?: RecommendationFilters
  ): Promise<Recommendation[]> {
    this.ensureInitialized();
    
    const recommendations = await this.getUserRecommendations(userId, filters);
    
    // Simple text search in title and reason
    const searchTerm = query.toLowerCase();
    return recommendations.filter(rec =>
      rec.title.toLowerCase().includes(searchTerm) ||
      rec.reason.toLowerCase().includes(searchTerm)
    );
  }

  async getRecommendationsByCategory(
    userId: string,
    category: string,
    limit?: number
  ): Promise<Recommendation[]> {
    this.ensureInitialized();
    
    const filters: RecommendationFilters = {
      category: category as any,
      ...(limit && { limit })
    };
    
    return await this.getUserRecommendations(userId, filters);
  }

  async getActiveRecommendations(userId: string): Promise<Recommendation[]> {
    this.ensureInitialized();
    
    const allRecommendations = await this.getUserRecommendations(userId);
    const activeRecommendations: Recommendation[] = [];
    
    for (const rec of allRecommendations) {
      const outcomes = await this.getRecommendationOutcomes(rec.id);
      const hasImplementedOutcome = outcomes.some(o => 
        o.status === OutcomeStatus.IMPLEMENTED || o.status === OutcomeStatus.REJECTED
      );
      
      if (!hasImplementedOutcome) {
        activeRecommendations.push(rec);
      }
    }
    
    return activeRecommendations;
  }

  // Cleanup operations
  async cleanupExpiredRecommendations(): Promise<number> {
    this.ensureInitialized();
    return await this.engine.cleanupExpiredRecommendations();
  }

  async archiveOldRecommendations(olderThanDays: number): Promise<number> {
    this.ensureInitialized();
    return await this.engine.archiveOldRecommendations(olderThanDays);
  }

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('RecommendationService must be initialized before use');
    }
  }
}