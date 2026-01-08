// Recommendation Engine types

import { Priority, ImpactEstimate, Step, Action, Duration } from './common';
import { BusinessDataSnapshot } from './business';

// Re-export BusinessData type alias for convenience
export type BusinessData = BusinessDataSnapshot;

export interface RecommendationEngine {
  generateRecommendations(
    productId: string,
    analysisType: AnalysisType,
    businessData: BusinessData
  ): Promise<Recommendation[]>;

  expandRecommendation(recommendationId: string): Promise<RecommendationDetail>;
  trackRecommendationOutcome(recommendationId: string, outcome: OutcomeData): Promise<void>;
}

export interface Recommendation {
  id: string;
  title: string;
  reason: string;
  impactEstimate?: ImpactEstimate;
  priority: Priority;
  category: RecommendationCategory;
  requiredActions: Action[];
  createdAt: Date;
  expiresAt?: Date;
}

export interface RecommendationDetail extends Recommendation {
  detailedExplanation: string;
  implementationSteps: Step[];
  riskAssessment: RiskLevel;
  timeToImplement: Duration;
  successMetrics: Metric[];
  prerequisites: string[];
  relatedRecommendations: string[];
}

export enum RecommendationCategory {
  SEO_OPTIMIZATION = 'seo_optimization',
  PRICING_STRATEGY = 'pricing_strategy',
  INVENTORY_MANAGEMENT = 'inventory_management',
  MARKETING_CAMPAIGN = 'marketing_campaign',
  PRODUCT_IMPROVEMENT = 'product_improvement',
  COST_REDUCTION = 'cost_reduction',
  REVENUE_GROWTH = 'revenue_growth',
}

export enum AnalysisType {
  SEO_ANALYSIS = 'seo_analysis',
  PROFITABILITY_ANALYSIS = 'profitability_analysis',
  COMPETITIVE_ANALYSIS = 'competitive_analysis',
  PERFORMANCE_ANALYSIS = 'performance_analysis',
  INVENTORY_ANALYSIS = 'inventory_analysis',
  MARKETING_ANALYSIS = 'marketing_analysis',
}

export interface OutcomeData {
  recommendationId: string;
  status: OutcomeStatus;
  implementedAt?: Date;
  actualImpact?: ImpactMeasurement;
  userFeedback?: UserFeedback;
  notes?: string;
}

export enum OutcomeStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  IMPLEMENTED = 'implemented',
  REJECTED = 'rejected',
  DEFERRED = 'deferred',
}

export interface ImpactMeasurement {
  revenueChange: number;
  trafficChange: number;
  conversionChange: number;
  measurementPeriod: DateRange;
  confidence: number;
}

export interface UserFeedback {
  rating: number; // 1-5
  comment?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  timeSpent?: Duration;
}

// Recommendation persistence and tracking
export interface RecommendationStorage {
  save(recommendation: Recommendation): Promise<void>;
  saveDetail(detail: RecommendationDetail): Promise<void>;
  load(recommendationId: string): Promise<Recommendation | null>;
  loadDetail(recommendationId: string): Promise<RecommendationDetail | null>;
  loadByUser(userId: string, filters?: RecommendationFilters): Promise<Recommendation[]>;
  trackOutcome(outcome: OutcomeData): Promise<void>;
}

export interface RecommendationFilters {
  category?: RecommendationCategory;
  priority?: Priority;
  status?: OutcomeStatus;
  dateRange?: DateRange;
  limit?: number;
  offset?: number;
}

// Import missing types
import { RiskLevel } from './common';
import { Metric } from './common';
import { DateRange } from './common';
