// Performance analysis service for business data

import {
  IPerformanceAnalyzer,
  ProductAnalysis,
  TrendAnalysis,
  ComparisonResult,
  BusinessInsight,
  Trend,
  SeasonalityPattern,
  Forecast,
  ProductRanking,
  ComparisonInsight,
} from '../interfaces/business-data-service';
import {
  Product,
  PerformanceMetrics,
  BusinessDataSnapshot,
} from '../types/business';
import { DateRange } from '../types/common';

export class PerformanceAnalyzer implements IPerformanceAnalyzer {
  async analyzeProduct(product: Product): Promise<ProductAnalysis> {
    const metrics = product.performanceMetrics;
    const profitPerSale = product.price.amount - product.cost.amount;
    const totalProfit = profitPerSale * metrics.salesCount;
    
    // Calculate performance score (0-100)
    let performanceScore = 0;
    
    // Revenue contribution (30%)
    const revenueScore = Math.min((metrics.revenue.amount / 10000) * 100, 100);
    performanceScore += revenueScore * 0.3;
    
    // Profit margin contribution (25%)
    const marginScore = metrics.profitMargin * 100;
    performanceScore += marginScore * 0.25;
    
    // Conversion rate contribution (20%)
    const conversionScore = Math.min(metrics.conversionRate * 100 * 20, 100);
    performanceScore += conversionScore * 0.2;
    
    // SEO score contribution (15%)
    performanceScore += product.seoScore * 0.15;
    
    // Inventory health contribution (10%)
    const inventoryScore = product.inventory.available > product.inventory.lowStockThreshold ? 100 : 50;
    performanceScore += inventoryScore * 0.1;

    // Analyze strengths and weaknesses
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const opportunities: string[] = [];
    const threats: string[] = [];

    // Strengths analysis
    if (metrics.profitMargin > 0.5) {
      strengths.push('High profit margin');
    }
    if (metrics.conversionRate > 0.03) {
      strengths.push('Good conversion rate');
    }
    if (product.seoScore > 80) {
      strengths.push('Excellent SEO optimization');
    }
    if (metrics.revenue.amount > 1000) {
      strengths.push('Strong revenue generation');
    }

    // Weaknesses analysis
    if (metrics.profitMargin < 0.2) {
      weaknesses.push('Low profit margin');
    }
    if (metrics.conversionRate < 0.01) {
      weaknesses.push('Poor conversion rate');
    }
    if (product.seoScore < 50) {
      weaknesses.push('Poor SEO optimization');
    }
    if (product.inventory.available <= product.inventory.lowStockThreshold) {
      weaknesses.push('Low inventory levels');
    }

    // Opportunities analysis
    if (product.seoScore < 80 && product.seoScore > 50) {
      opportunities.push('SEO optimization potential');
    }
    if (metrics.impressions > metrics.clicks * 50) {
      opportunities.push('Improve click-through rate');
    }
    if (profitPerSale > 20 && metrics.salesCount < 10) {
      opportunities.push('Increase marketing to boost sales volume');
    }

    // Threats analysis
    if (product.inventory.available < 5) {
      threats.push('Risk of stockout');
    }
    if (metrics.profitMargin < 0.1) {
      threats.push('Unsustainable profit margins');
    }
    
    // Check for declining trends
    const revenueDecline = metrics.trends.find(t => t.metric === 'revenue' && t.direction === 'down');
    if (revenueDecline && revenueDecline.changePercent < -10) {
      threats.push('Declining revenue trend');
    }

    return {
      productId: product.id,
      performanceScore: Math.round(performanceScore),
      strengths,
      weaknesses,
      opportunities,
      threats,
    };
  }

  async analyzeTrends(metrics: PerformanceMetrics[], period: DateRange): Promise<TrendAnalysis> {
    const trends: Trend[] = [];
    const seasonality: SeasonalityPattern[] = [];
    const forecasts: Forecast[] = [];

    if (metrics.length < 2) {
      return { period, trends, seasonality, forecasts };
    }

    // Analyze revenue trend
    const revenueTrend = this.calculateTrend(metrics.map(m => m.revenue.amount));
    trends.push({
      metric: 'revenue',
      direction: revenueTrend.direction,
      strength: revenueTrend.strength,
      significance: revenueTrend.significance,
    });

    // Analyze sales count trend
    const salesTrend = this.calculateTrend(metrics.map(m => m.salesCount));
    trends.push({
      metric: 'sales',
      direction: salesTrend.direction,
      strength: salesTrend.strength,
      significance: salesTrend.significance,
    });

    // Analyze conversion rate trend
    const conversionTrend = this.calculateTrend(metrics.map(m => m.conversionRate));
    trends.push({
      metric: 'conversion_rate',
      direction: conversionTrend.direction,
      strength: conversionTrend.strength,
      significance: conversionTrend.significance,
    });

    // Simple seasonality detection (would be more sophisticated in production)
    if (metrics.length >= 12) {
      seasonality.push({
        metric: 'revenue',
        pattern: 'monthly',
        strength: 0.3, // Mock value
        peaks: [new Date(period.start.getTime() + 15 * 24 * 60 * 60 * 1000)], // Mid-period
        troughs: [new Date(period.start.getTime() + 5 * 24 * 60 * 60 * 1000)], // Early period
      });
    }

    // Generate forecasts
    const revenueValues = metrics.map(m => m.revenue.amount);
    const avgRevenue = revenueValues.reduce((sum, val) => sum + val, 0) / revenueValues.length;
    const revenueGrowth = revenueTrend.direction === 'up' ? 1.1 : revenueTrend.direction === 'down' ? 0.9 : 1.0;

    forecasts.push({
      metric: 'revenue',
      period: {
        start: period.end,
        end: new Date(period.end.getTime() + 30 * 24 * 60 * 60 * 1000), // Next 30 days
      },
      predictedValue: avgRevenue * revenueGrowth,
      confidence: revenueTrend.significance,
      factors: ['historical_trend', 'seasonality'],
    });

    return { period, trends, seasonality, forecasts };
  }

  async compareProducts(products: Product[]): Promise<ComparisonResult> {
    const rankings: ProductRanking[] = [];
    const insights: ComparisonInsight[] = [];

    // Calculate rankings for different categories
    const categories = ['revenue', 'profit', 'conversion', 'seo'];
    
    for (const category of categories) {
      const sortedProducts = [...products].sort((a, b) => {
        let aValue: number, bValue: number;
        
        switch (category) {
          case 'revenue':
            aValue = a.performanceMetrics.revenue.amount;
            bValue = b.performanceMetrics.revenue.amount;
            break;
          case 'profit':
            aValue = (a.price.amount - a.cost.amount) * a.performanceMetrics.salesCount;
            bValue = (b.price.amount - b.cost.amount) * b.performanceMetrics.salesCount;
            break;
          case 'conversion':
            aValue = a.performanceMetrics.conversionRate;
            bValue = b.performanceMetrics.conversionRate;
            break;
          case 'seo':
            aValue = a.seoScore;
            bValue = b.seoScore;
            break;
          default:
            return 0;
        }
        
        return bValue - aValue; // Descending order
      });

      sortedProducts.forEach((product, index) => {
        const score = Math.max(100 - (index * 10), 10); // Score decreases with rank
        rankings.push({
          productId: product.id,
          rank: index + 1,
          score,
          category,
        });
      });
    }

    // Generate insights
    const topRevenueProduct = products.reduce((top, current) => 
      current.performanceMetrics.revenue.amount > top.performanceMetrics.revenue.amount ? current : top
    );

    const lowPerformers = products.filter(p => 
      p.performanceMetrics.conversionRate < 0.01 || p.performanceMetrics.revenue.amount < 100
    );

    if (lowPerformers.length > 0) {
      insights.push({
        type: 'opportunity',
        description: `${lowPerformers.length} products have low performance and could benefit from optimization`,
        affectedProducts: lowPerformers.map(p => p.id),
        impact: 'medium',
      });
    }

    const highMarginProducts = products.filter(p => p.performanceMetrics.profitMargin > 0.6);
    if (highMarginProducts.length > 0) {
      insights.push({
        type: 'strength',
        description: `${highMarginProducts.length} products have excellent profit margins`,
        affectedProducts: highMarginProducts.map(p => p.id),
        impact: 'high',
      });
    }

    const lowStockProducts = products.filter(p => 
      p.inventory.available <= p.inventory.lowStockThreshold
    );
    if (lowStockProducts.length > 0) {
      insights.push({
        type: 'threat',
        description: `${lowStockProducts.length} products are at risk of stockout`,
        affectedProducts: lowStockProducts.map(p => p.id),
        impact: 'high',
      });
    }

    return { products, rankings, insights };
  }

  async generateInsights(data: BusinessDataSnapshot): Promise<BusinessInsight[]> {
    const insights: BusinessInsight[] = [];

    // Revenue insights
    if (data.totalRevenue.amount > 10000) {
      insights.push({
        id: 'high_revenue',
        type: 'trend',
        title: 'Strong Revenue Performance',
        description: `Total revenue of ${data.totalRevenue.currency} ${data.totalRevenue.amount.toLocaleString()} indicates strong business performance`,
        confidence: 0.9,
        impact: 'high',
        actionable: false,
        relatedProducts: data.topPerformingProducts.map(p => p.id),
      });
    }

    // Product portfolio insights
    if (data.totalProducts > 100) {
      insights.push({
        id: 'large_catalog',
        type: 'opportunity',
        title: 'Large Product Catalog',
        description: `With ${data.totalProducts} products, consider implementing advanced categorization and search features`,
        confidence: 0.8,
        impact: 'medium',
        actionable: true,
        relatedProducts: [],
      });
    }

    // Marketplace health insights
    const unhealthyMarketplaces = data.marketplaceStatus.filter(m => !m.isHealthy);
    if (unhealthyMarketplaces.length > 0) {
      insights.push({
        id: 'marketplace_issues',
        type: 'risk',
        title: 'Marketplace Connection Issues',
        description: `${unhealthyMarketplaces.length} marketplace(s) have connection issues that may affect data accuracy`,
        confidence: 0.95,
        impact: 'high',
        actionable: true,
        relatedProducts: [],
      });
    }

    // Performance insights based on top products
    const avgConversion = data.topPerformingProducts.reduce((sum, p) => 
      sum + p.performanceMetrics.conversionRate, 0) / data.topPerformingProducts.length;
    
    if (avgConversion > 0.05) {
      insights.push({
        id: 'high_conversion',
        type: 'trend',
        title: 'Excellent Conversion Rates',
        description: `Top products show strong conversion rates averaging ${(avgConversion * 100).toFixed(1)}%`,
        confidence: 0.85,
        impact: 'high',
        actionable: false,
        relatedProducts: data.topPerformingProducts.map(p => p.id),
      });
    }

    return insights;
  }

  private calculateTrend(values: number[]): { direction: 'up' | 'down' | 'stable'; strength: number; significance: number } {
    if (values.length < 2) {
      return { direction: 'stable', strength: 0, significance: 0 };
    }

    // Simple linear regression to determine trend
    const n = values.length;
    const sumX = (n * (n - 1)) / 2; // Sum of indices 0, 1, 2, ...
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, index) => sum + (index * val), 0);
    const sumXX = (n * (n - 1) * (2 * n - 1)) / 6; // Sum of squares of indices

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const avgY = sumY / n;
    
    // Determine direction
    let direction: 'up' | 'down' | 'stable' = 'stable';
    if (Math.abs(slope) > avgY * 0.01) { // Threshold: 1% of average value
      direction = slope > 0 ? 'up' : 'down';
    }

    // Calculate strength (normalized slope)
    const strength = Math.min(Math.abs(slope) / (avgY || 1), 1);
    
    // Calculate significance (R-squared approximation)
    const yMean = avgY;
    const ssTotal = values.reduce((sum, val) => sum + Math.pow(val - yMean, 2), 0);
    const ssRes = values.reduce((sum, val, index) => {
      const predicted = yMean + slope * (index - (n - 1) / 2);
      return sum + Math.pow(val - predicted, 2);
    }, 0);
    
    const significance = ssTotal > 0 ? Math.max(0, 1 - (ssRes / ssTotal)) : 0;

    return { direction, strength, significance };
  }
}