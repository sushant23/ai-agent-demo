// Analytics module exports

export { RevenueCalculator } from './revenue-calculator';
export { SEOAnalyzer } from './seo-analyzer';
export { ProfitabilityAnalyzer } from './profitability-analyzer';
export { PerformanceMetricsService } from './performance-metrics-service';

export type {
  RevenueBreakdown,
  ProductRevenue,
  PeriodRevenue,
} from './revenue-calculator';

export type {
  SEOAnalysis,
  ProductSEOAnalysis,
  SEOIssue,
  SEOOpportunity,
  SEORecommendation,
  SEOBenchmarks,
} from './seo-analyzer';

export type {
  ProfitabilityAnalysis,
  OverallProfitability,
  ProductProfitability,
  CategoryProfitability,
  ProfitabilityRecommendation,
  ProfitabilityTrend,
  ProfitabilityIssue,
  ProfitabilityOpportunity,
} from './profitability-analyzer';

export type {
  ComprehensiveMetrics,
  MetricsOverview,
  AggregatedPerformanceData,
  CategoryMetrics,
  MarketplaceMetrics,
  TimeframeMetrics,
  MetricCorrelation,
  MetricsRecommendation,
  ReportSummary,
} from './performance-metrics-service';