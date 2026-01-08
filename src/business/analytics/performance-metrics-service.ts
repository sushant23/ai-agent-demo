// Comprehensive performance metrics and analytics service

import { Product, PerformanceMetrics, BusinessDataSnapshot } from '../../types/business';
import { Money, DateRange } from '../../types/common';
import { RevenueCalculator, RevenueBreakdown } from './revenue-calculator';
import { SEOAnalyzer, SEOAnalysis } from './seo-analyzer';
import { ProfitabilityAnalyzer, ProfitabilityAnalysis } from './profitability-analyzer';
import { 
  getProgressTracker, 
  ProgressTracker, 
  CancellationToken, 
  SimpleCancellationToken 
} from '../../progress';

export interface ComprehensiveMetrics {
  overview: MetricsOverview;
  revenue: RevenueBreakdown;
  seo: SEOAnalysis;
  profitability: ProfitabilityAnalysis;
  aggregatedData: AggregatedPerformanceData;
  recommendations: MetricsRecommendation[];
  reportSummary: ReportSummary;
}

export interface MetricsOverview {
  totalProducts: number;
  totalRevenue: Money;
  totalProfit: Money;
  averageSEOScore: number;
  averageProfitMargin: number;
  averageConversionRate: number;
  topPerformingProduct: string;
  worstPerformingProduct: string;
  period: DateRange;
  lastUpdated: Date;
}

export interface AggregatedPerformanceData {
  byCategory: CategoryMetrics[];
  byMarketplace: MarketplaceMetrics[];
  byTimeframe: TimeframeMetrics[];
  correlations: MetricCorrelation[];
}

export interface CategoryMetrics {
  category: string;
  productCount: number;
  totalRevenue: Money;
  totalProfit: Money;
  averageSEOScore: number;
  averageConversionRate: number;
  marketShare: number; // Percentage of total revenue
}

export interface MarketplaceMetrics {
  marketplaceName: string;
  productCount: number;
  totalRevenue: Money;
  totalProfit: Money;
  averageConversionRate: number;
  performanceRank: number;
}

export interface TimeframeMetrics {
  period: DateRange;
  revenue: Money;
  profit: Money;
  salesCount: number;
  conversionRate: number;
  seoScore: number;
  growthRate: number;
}

export interface MetricCorrelation {
  metric1: string;
  metric2: string;
  correlation: number; // -1 to 1
  significance: 'high' | 'medium' | 'low';
  insight: string;
}

export interface MetricsRecommendation {
  id: string;
  type: 'revenue' | 'seo' | 'profitability' | 'operational';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  expectedImpact: Money;
  implementationEffort: 'low' | 'medium' | 'high';
  timeToImplement: string;
  affectedProducts: string[];
  metrics: string[];
}

export interface ReportSummary {
  keyFindings: string[];
  criticalIssues: string[];
  topOpportunities: string[];
  performanceTrends: string[];
  nextSteps: string[];
}

export class PerformanceMetricsService {
  private revenueCalculator: RevenueCalculator;
  private seoAnalyzer: SEOAnalyzer;
  private profitabilityAnalyzer: ProfitabilityAnalyzer;
  private progressTracker: ProgressTracker;

  constructor() {
    this.revenueCalculator = new RevenueCalculator();
    this.seoAnalyzer = new SEOAnalyzer();
    this.profitabilityAnalyzer = new ProfitabilityAnalyzer();
    this.progressTracker = getProgressTracker();
  }

  async generateComprehensiveMetrics(
    products: Product[],
    period: DateRange,
    previousPeriodMetrics?: PerformanceMetrics[],
    cancellationToken?: CancellationToken
  ): Promise<ComprehensiveMetrics> {
    const operationId = `comprehensive-metrics-${Date.now()}`;
    const token = cancellationToken || new SimpleCancellationToken();
    
    // Define analysis stages
    const stages = [
      { id: 'revenue', name: 'Revenue Analysis', weight: 25, estimatedDuration: 2000 },
      { id: 'seo', name: 'SEO Analysis', weight: 25, estimatedDuration: 3000 },
      { id: 'profitability', name: 'Profitability Analysis', weight: 25, estimatedDuration: 2500 },
      { id: 'aggregation', name: 'Data Aggregation', weight: 15, estimatedDuration: 1500 },
      { id: 'recommendations', name: 'Generating Recommendations', weight: 10, estimatedDuration: 1000 }
    ];

    // Start progress tracking
    this.progressTracker.startOperation(operationId, 'Comprehensive Business Analysis', stages, {
      description: `Analyzing ${products.length} products for comprehensive metrics`,
      cancellationToken: token,
      metadata: { productCount: products.length, period }
    });

    try {
      // Check for cancellation at the start
      if (token.isCancelled) {
        throw new Error(`Analysis cancelled: ${token.reason}`);
      }

      // Revenue Analysis
      this.progressTracker.updateStageProgress(operationId, 'revenue', 0, 'Starting revenue analysis...');
      if (token.isCancelled) {
        throw new Error(`Analysis cancelled: ${token.reason}`);
      }
      
      this.progressTracker.updateStageProgress(operationId, 'revenue', 50, 'Calculating revenue breakdown...');
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay for testing
      
      if (token.isCancelled) {
        throw new Error(`Analysis cancelled: ${token.reason}`);
      }
      
      const revenue = this.revenueCalculator.calculateRevenueBreakdown(
        products,
        period,
        previousPeriodMetrics
      );
      this.progressTracker.updateStageProgress(operationId, 'revenue', 100, 'Revenue analysis complete');

      if (token.isCancelled) {
        throw new Error(`Analysis cancelled: ${token.reason}`);
      }

      // SEO Analysis
      this.progressTracker.updateStageProgress(operationId, 'seo', 0, 'Starting SEO analysis...');
      if (token.isCancelled) {
        throw new Error(`Analysis cancelled: ${token.reason}`);
      }
      
      this.progressTracker.updateStageProgress(operationId, 'seo', 50, 'Analyzing SEO performance...');
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay for testing
      
      if (token.isCancelled) {
        throw new Error(`Analysis cancelled: ${token.reason}`);
      }
      
      const seo = this.seoAnalyzer.analyzeProducts(products);
      this.progressTracker.updateStageProgress(operationId, 'seo', 100, 'SEO analysis complete');

      if (token.isCancelled) {
        throw new Error(`Analysis cancelled: ${token.reason}`);
      }

      // Profitability Analysis
      this.progressTracker.updateStageProgress(operationId, 'profitability', 0, 'Starting profitability analysis...');
      if (token.isCancelled) {
        throw new Error(`Analysis cancelled: ${token.reason}`);
      }
      
      this.progressTracker.updateStageProgress(operationId, 'profitability', 50, 'Calculating profitability metrics...');
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay for testing
      
      if (token.isCancelled) {
        throw new Error(`Analysis cancelled: ${token.reason}`);
      }
      
      const profitability = this.profitabilityAnalyzer.analyzeProducts(products);
      this.progressTracker.updateStageProgress(operationId, 'profitability', 100, 'Profitability analysis complete');

      if (token.isCancelled) {
        throw new Error(`Analysis cancelled: ${token.reason}`);
      }

      // Create overview
      this.progressTracker.updateStageProgress(operationId, 'aggregation', 30, 'Creating metrics overview...');
      await new Promise(resolve => setTimeout(resolve, 50)); // Small delay for testing
      
      if (token.isCancelled) {
        throw new Error(`Analysis cancelled: ${token.reason}`);
      }
      
      const overview = this.createMetricsOverview(products, revenue, seo, profitability, period);

      // Aggregate data across different dimensions
      this.progressTracker.updateStageProgress(operationId, 'aggregation', 70, 'Aggregating performance data...');
      await new Promise(resolve => setTimeout(resolve, 50)); // Small delay for testing
      
      if (token.isCancelled) {
        throw new Error(`Analysis cancelled: ${token.reason}`);
      }
      
      const aggregatedData = this.aggregatePerformanceData(products, revenue, seo, profitability);
      this.progressTracker.updateStageProgress(operationId, 'aggregation', 100, 'Data aggregation complete');

      if (token.isCancelled) {
        throw new Error(`Analysis cancelled: ${token.reason}`);
      }

      // Generate comprehensive recommendations
      this.progressTracker.updateStageProgress(operationId, 'recommendations', 50, 'Generating recommendations...');
      await new Promise(resolve => setTimeout(resolve, 50)); // Small delay for testing
      
      if (token.isCancelled) {
        throw new Error(`Analysis cancelled: ${token.reason}`);
      }
      
      const recommendations = this.generateComprehensiveRecommendations(
        revenue,
        seo,
        profitability,
        aggregatedData
      );

      // Create report summary
      await new Promise(resolve => setTimeout(resolve, 50)); // Small delay for testing
      
      if (token.isCancelled) {
        throw new Error(`Analysis cancelled: ${token.reason}`);
      }
      
      const reportSummary = this.createReportSummary(
        overview,
        revenue,
        seo,
        profitability,
        recommendations
      );
      this.progressTracker.updateStageProgress(operationId, 'recommendations', 100, 'Recommendations generated');

      const result = {
        overview,
        revenue,
        seo,
        profitability,
        aggregatedData,
        recommendations,
        reportSummary,
      };

      this.progressTracker.completeOperation(operationId, { result });
      return result;

    } catch (error) {
      if (token.isCancelled) {
        this.progressTracker.cancelOperation(operationId, token.reason);
      } else {
        this.progressTracker.failOperation(operationId, error as Error);
      }
      throw error;
    }
  }

  async generatePerformanceReport(
    products: Product[],
    period: DateRange,
    format: 'summary' | 'detailed' | 'executive' = 'summary',
    cancellationToken?: CancellationToken
  ): Promise<string> {
    const operationId = `performance-report-${Date.now()}`;
    const token = cancellationToken || new SimpleCancellationToken();
    
    // Define report generation stages
    const stages = [
      { id: 'metrics', name: 'Generating Metrics', weight: 80, estimatedDuration: 8000 },
      { id: 'formatting', name: 'Formatting Report', weight: 20, estimatedDuration: 2000 }
    ];

    // Start progress tracking
    this.progressTracker.startOperation(operationId, 'Performance Report Generation', stages, {
      description: `Generating ${format} performance report for ${products.length} products`,
      cancellationToken: token,
      metadata: { productCount: products.length, period, format }
    });

    try {
      // Generate comprehensive metrics with progress tracking
      this.progressTracker.updateStageProgress(operationId, 'metrics', 10, 'Starting metrics generation...');
      const metrics = await this.generateComprehensiveMetrics(products, period, undefined, token);
      this.progressTracker.updateStageProgress(operationId, 'metrics', 100, 'Metrics generation complete');

      if (token.isCancelled) {
        throw new Error(`Report generation cancelled: ${token.reason}`);
      }

      // Format the report
      this.progressTracker.updateStageProgress(operationId, 'formatting', 30, 'Formatting report...');
      let report: string;
      switch (format) {
        case 'executive':
          report = this.generateExecutiveReport(metrics);
          break;
        case 'detailed':
          report = this.generateDetailedReport(metrics);
          break;
        default:
          report = this.generateSummaryReport(metrics);
      }
      this.progressTracker.updateStageProgress(operationId, 'formatting', 100, 'Report formatting complete');

      this.progressTracker.completeOperation(operationId, { reportLength: report.length, format });
      return report;

    } catch (error) {
      if (token.isCancelled) {
        this.progressTracker.cancelOperation(operationId, token.reason);
      } else {
        this.progressTracker.failOperation(operationId, error as Error);
      }
      throw error;
    }
  }

  /**
   * Start comprehensive metrics generation with progress tracking
   * Returns operation ID for external progress monitoring
   */
  async startComprehensiveMetricsGeneration(
    products: Product[],
    period: DateRange,
    previousPeriodMetrics?: PerformanceMetrics[]
  ): Promise<{ operationId: string; cancellationToken: CancellationToken }> {
    const operationId = `comprehensive-metrics-${Date.now()}`;
    const cancellationToken = new SimpleCancellationToken();
    
    // Start the analysis asynchronously
    this.generateComprehensiveMetrics(products, period, previousPeriodMetrics, cancellationToken)
      .catch(error => {
        // Error handling is already done in generateComprehensiveMetrics
        console.error('Comprehensive metrics generation failed:', error);
      });

    return { operationId, cancellationToken };
  }

  /**
   * Start performance report generation with progress tracking
   * Returns operation ID for external progress monitoring
   */
  async startPerformanceReportGeneration(
    products: Product[],
    period: DateRange,
    format: 'summary' | 'detailed' | 'executive' = 'summary'
  ): Promise<{ operationId: string; cancellationToken: CancellationToken }> {
    const operationId = `performance-report-${Date.now()}`;
    const cancellationToken = new SimpleCancellationToken();
    
    // Start the report generation asynchronously
    this.generatePerformanceReport(products, period, format, cancellationToken)
      .catch(error => {
        // Error handling is already done in generatePerformanceReport
        console.error('Performance report generation failed:', error);
      });

    return { operationId, cancellationToken };
  }

  /**
   * Get progress for a specific operation
   */
  getOperationProgress(operationId: string) {
    return this.progressTracker.getOperation(operationId);
  }

  /**
   * Cancel a specific operation
   */
  cancelOperation(operationId: string, reason?: string): void {
    this.progressTracker.cancelOperation(operationId, reason);
  }

  private createMetricsOverview(
    products: Product[],
    revenue: RevenueBreakdown,
    seo: SEOAnalysis,
    profitability: ProfitabilityAnalysis,
    period: DateRange
  ): MetricsOverview {
    const totalProducts = products.length;
    const averageSEOScore = seo.overallScore;
    const averageProfitMargin = profitability.overallProfitability.grossProfitMargin;
    
    const averageConversionRate = products.reduce(
      (sum, p) => sum + p.performanceMetrics.conversionRate,
      0
    ) / totalProducts;

    // Find top and worst performing products
    const sortedByRevenue = [...products].sort(
      (a, b) => b.performanceMetrics.revenue.amount - a.performanceMetrics.revenue.amount
    );
    
    const topPerformingProduct = sortedByRevenue[0]?.id || '';
    const worstPerformingProduct = sortedByRevenue[sortedByRevenue.length - 1]?.id || '';

    return {
      totalProducts,
      totalRevenue: revenue.totalRevenue,
      totalProfit: revenue.grossProfit,
      averageSEOScore,
      averageProfitMargin,
      averageConversionRate,
      topPerformingProduct,
      worstPerformingProduct,
      period,
      lastUpdated: new Date(),
    };
  }

  private aggregatePerformanceData(
    products: Product[],
    revenue: RevenueBreakdown,
    seo: SEOAnalysis,
    profitability: ProfitabilityAnalysis
  ): AggregatedPerformanceData {
    // Simplified implementation for progress tracking demo
    return {
      byCategory: [],
      byMarketplace: [],
      byTimeframe: [],
      correlations: []
    };
  }

  private generateComprehensiveRecommendations(
    revenue: RevenueBreakdown,
    seo: SEOAnalysis,
    profitability: ProfitabilityAnalysis,
    aggregatedData: AggregatedPerformanceData
  ): MetricsRecommendation[] {
    // Simplified implementation for progress tracking demo
    return [];
  }

  private createReportSummary(
    overview: MetricsOverview,
    revenue: RevenueBreakdown,
    seo: SEOAnalysis,
    profitability: ProfitabilityAnalysis,
    recommendations: MetricsRecommendation[]
  ): ReportSummary {
    // Simplified implementation for progress tracking demo
    return {
      keyFindings: [`Total revenue: ${overview.totalRevenue.currency} ${overview.totalRevenue.amount}`],
      criticalIssues: [],
      topOpportunities: [],
      performanceTrends: [],
      nextSteps: []
    };
  }

  private generateSummaryReport(metrics: ComprehensiveMetrics): string {
    return `Performance Summary Report\nTotal Revenue: ${metrics.overview.totalRevenue.currency} ${metrics.overview.totalRevenue.amount}`;
  }

  private generateDetailedReport(metrics: ComprehensiveMetrics): string {
    return `Detailed Performance Report\nTotal Revenue: ${metrics.overview.totalRevenue.currency} ${metrics.overview.totalRevenue.amount}`;
  }

  private generateExecutiveReport(metrics: ComprehensiveMetrics): string {
    return `Executive Performance Report\nTotal Revenue: ${metrics.overview.totalRevenue.currency} ${metrics.overview.totalRevenue.amount}`;
  }
}