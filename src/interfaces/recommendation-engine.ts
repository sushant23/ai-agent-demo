// Recommendation Engine interfaces

import {
  RecommendationEngine,
  Recommendation,
  RecommendationDetail,
  AnalysisType,
  OutcomeData,
  RecommendationStorage,
  RecommendationFilters,
} from '../types/recommendations';
import { BusinessData } from '../types/recommendations';

export interface IRecommendationEngine extends RecommendationEngine {
  initialize(config: RecommendationEngineConfig): Promise<void>;
  shutdown(): Promise<void>;
  getEngineMetrics(): Promise<RecommendationEngineMetrics>;
  cleanupExpiredRecommendations(): Promise<number>;
  archiveOldRecommendations(olderThanDays: number): Promise<number>;
}

export interface RecommendationEngineConfig {
  storage: IRecommendationStorage;
  algorithms: AlgorithmConfig[];
  impactEstimationEnabled: boolean;
  trackingEnabled: boolean;
}

export interface AlgorithmConfig {
  type: AnalysisType;
  enabled: boolean;
  parameters: Record<string, unknown>;
  weight: number;
}

export interface RecommendationEngineMetrics {
  totalRecommendations: number;
  recommendationsByCategory: Record<string, number>;
  averageImpactAccuracy: number;
  implementationRate: number;
  userSatisfactionScore: number;
}

export interface IRecommendationGenerator {
  generate(
    productId: string,
    analysisType: AnalysisType,
    businessData: BusinessData
  ): Promise<Recommendation[]>;

  registerAlgorithm(type: AnalysisType, algorithm: RecommendationAlgorithm): void;
  getAlgorithm(type: AnalysisType): RecommendationAlgorithm | null;
}

export interface RecommendationAlgorithm {
  analyze(productId: string, businessData: BusinessData): Promise<AnalysisResult>;
  generateRecommendations(analysis: AnalysisResult): Promise<Recommendation[]>;
  estimateImpact(
    recommendation: Recommendation,
    businessData: BusinessData
  ): Promise<ImpactEstimate>;
}

export interface AnalysisResult {
  type: AnalysisType;
  productId: string;
  findings: Finding[];
  confidence: number;
  metadata: Record<string, unknown>;
}

export interface Finding {
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence: unknown[];
  suggestedActions: string[];
}

export interface IRecommendationStorage extends RecommendationStorage {
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  getStorageMetrics(): Promise<RecommendationStorageMetrics>;
}

export interface RecommendationStorageMetrics {
  totalRecommendations: number;
  totalOutcomes: number;
  storageSize: number;
  averageRetrievalTime: number;
}

export interface IImpactEstimator {
  estimate(recommendation: Recommendation, businessData: BusinessData): Promise<ImpactEstimate>;
  calibrate(outcomes: OutcomeData[]): Promise<void>;
  getAccuracyMetrics(): Promise<AccuracyMetrics>;
}

export interface AccuracyMetrics {
  overallAccuracy: number;
  accuracyByCategory: Record<string, number>;
  calibrationScore: number;
  sampleSize: number;
}

export interface IRecommendationTracker {
  track(outcome: OutcomeData): Promise<void>;
  getOutcomes(recommendationId: string): Promise<OutcomeData[]>;
  getSuccessRate(filters?: RecommendationFilters): Promise<number>;
  generateReport(filters?: RecommendationFilters): Promise<RecommendationReport>;
}

export interface RecommendationReport {
  period: DateRange;
  totalRecommendations: number;
  implementationRate: number;
  averageImpact: ImpactSummary;
  topPerformingCategories: CategoryPerformance[];
  userFeedbackSummary: FeedbackSummary;
}

export interface ImpactSummary {
  totalRevenueImpact: number;
  averageRevenueImpact: number;
  totalTrafficImpact: number;
  averageConversionImpact: number;
}

export interface CategoryPerformance {
  category: string;
  recommendationCount: number;
  implementationRate: number;
  averageImpact: number;
}

export interface FeedbackSummary {
  averageRating: number;
  totalResponses: number;
  difficultyDistribution: Record<string, number>;
  commonComments: string[];
}

// Import missing types
import { ImpactEstimate } from '../types/common';
import { DateRange } from '../types/common';
