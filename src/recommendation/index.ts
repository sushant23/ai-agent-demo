// Recommendation Engine Module Exports

export { RecommendationEngineImpl } from './recommendation-engine';
export { RecommendationGenerator } from './recommendation-generator';
export { RecommendationStorageImpl } from './recommendation-storage';
export { RecommendationService } from './recommendation-service';

// Re-export types for convenience
export type {
  RecommendationEngine,
  Recommendation,
  RecommendationDetail,
  AnalysisType,
  OutcomeData,
  RecommendationCategory,
  BusinessData
} from '../types/recommendations';

export type {
  IRecommendationEngine,
  IRecommendationGenerator,
  IRecommendationStorage,
  RecommendationEngineConfig,
  RecommendationEngineMetrics
} from '../interfaces/recommendation-engine';