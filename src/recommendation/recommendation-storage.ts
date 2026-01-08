// Recommendation Storage Implementation

import {
  Recommendation,
  RecommendationDetail,
  OutcomeData,
  RecommendationFilters
} from '../types/recommendations';
import {
  IRecommendationStorage,
  RecommendationStorageMetrics
} from '../interfaces/recommendation-engine';

export class RecommendationStorageImpl implements IRecommendationStorage {
  private recommendations = new Map<string, Recommendation>();
  private recommendationDetails = new Map<string, RecommendationDetail>();
  private outcomes = new Map<string, OutcomeData[]>();
  private userRecommendations = new Map<string, string[]>();
  private isInitialized = false;

  async initialize(): Promise<void> {
    // In a real implementation, this would connect to a database
    // For now, we'll use in-memory storage
    this.isInitialized = true;
  }

  async shutdown(): Promise<void> {
    // Clean up resources if needed
    this.isInitialized = false;
  }

  async save(recommendation: Recommendation): Promise<void> {
    this.ensureInitialized();
    
    this.recommendations.set(recommendation.id, recommendation);
    
    // For now, we'll associate all recommendations with a default user
    // In a real implementation, this would be extracted from context
    const userId = 'default-user';
    if (!this.userRecommendations.has(userId)) {
      this.userRecommendations.set(userId, []);
    }
    this.userRecommendations.get(userId)!.push(recommendation.id);
  }

  async saveDetail(detail: RecommendationDetail): Promise<void> {
    this.ensureInitialized();
    
    this.recommendationDetails.set(detail.id, detail);
    
    // Also save the base recommendation if not already saved
    if (!this.recommendations.has(detail.id)) {
      await this.save(detail);
    }
  }

  async load(recommendationId: string): Promise<Recommendation | null> {
    this.ensureInitialized();
    
    return this.recommendations.get(recommendationId) || null;
  }

  async loadDetail(recommendationId: string): Promise<RecommendationDetail | null> {
    this.ensureInitialized();
    
    return this.recommendationDetails.get(recommendationId) || null;
  }

  async loadByUser(userId: string, filters?: RecommendationFilters): Promise<Recommendation[]> {
    this.ensureInitialized();
    
    const userRecommendationIds = this.userRecommendations.get(userId) || [];
    let recommendations = userRecommendationIds
      .map(id => this.recommendations.get(id))
      .filter((rec): rec is Recommendation => rec !== undefined);

    // Apply filters
    if (filters) {
      recommendations = this.applyFilters(recommendations, filters);
    }

    return recommendations;
  }

  async trackOutcome(outcome: OutcomeData): Promise<void> {
    this.ensureInitialized();
    
    if (!this.outcomes.has(outcome.recommendationId)) {
      this.outcomes.set(outcome.recommendationId, []);
    }
    
    const existingOutcomes = this.outcomes.get(outcome.recommendationId)!;
    
    // Update existing outcome or add new one
    const existingIndex = existingOutcomes.findIndex(o => o.status === outcome.status);
    if (existingIndex >= 0) {
      existingOutcomes[existingIndex] = outcome;
    } else {
      existingOutcomes.push(outcome);
    }
  }

  async getStorageMetrics(): Promise<RecommendationStorageMetrics> {
    this.ensureInitialized();
    
    const totalOutcomes = Array.from(this.outcomes.values())
      .reduce((sum, outcomes) => sum + outcomes.length, 0);

    return {
      totalRecommendations: this.recommendations.size,
      totalOutcomes,
      storageSize: this.calculateStorageSize(),
      averageRetrievalTime: 5, // milliseconds - placeholder for in-memory storage
    };
  }

  private applyFilters(recommendations: Recommendation[], filters: RecommendationFilters): Recommendation[] {
    let filtered = recommendations;

    if (filters.category) {
      filtered = filtered.filter(rec => rec.category === filters.category);
    }

    if (filters.priority) {
      filtered = filtered.filter(rec => rec.priority === filters.priority);
    }

    if (filters.dateRange) {
      filtered = filtered.filter(rec => 
        rec.createdAt >= filters.dateRange!.start && 
        rec.createdAt <= filters.dateRange!.end
      );
    }

    // Apply pagination
    if (filters.offset) {
      filtered = filtered.slice(filters.offset);
    }

    if (filters.limit) {
      filtered = filtered.slice(0, filters.limit);
    }

    return filtered;
  }

  private calculateStorageSize(): number {
    // Rough estimate of storage size in bytes
    const recommendationsSize = JSON.stringify(Array.from(this.recommendations.values())).length;
    const detailsSize = JSON.stringify(Array.from(this.recommendationDetails.values())).length;
    const outcomesSize = JSON.stringify(Array.from(this.outcomes.values())).length;
    
    return recommendationsSize + detailsSize + outcomesSize;
  }

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('RecommendationStorage must be initialized before use');
    }
  }

  // Additional helper methods for testing and debugging
  async getOutcomes(recommendationId: string): Promise<OutcomeData[]> {
    this.ensureInitialized();
    return this.outcomes.get(recommendationId) || [];
  }

  async clear(): Promise<void> {
    this.ensureInitialized();
    this.recommendations.clear();
    this.recommendationDetails.clear();
    this.outcomes.clear();
    this.userRecommendations.clear();
  }

  async getAllRecommendations(): Promise<Recommendation[]> {
    this.ensureInitialized();
    return Array.from(this.recommendations.values());
  }
}