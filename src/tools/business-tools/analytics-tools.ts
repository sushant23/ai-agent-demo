import {
  BusinessTool,
  ToolCategory,
  ToolParameters,
  ToolResult,
} from '../../types/tools';
import {
  PerformanceMetrics,
  BusinessDataService,
  Product,
} from '../../types/business';
import { DateRange } from '../../types/common';

// Revenue Analysis Tool
export const createRevenueAnalysisTool = (dataService: BusinessDataService): BusinessTool => ({
  id: 'revenue-analysis',
  name: 'Revenue Analysis',
  description: 'Analyze revenue performance across products and time periods',
  version: '1.0.0',
  category: ToolCategory.BUSINESS_ANALYTICS,
  inputSchema: {
    type: 'object',
    properties: {
      period: {
        type: 'object',
        properties: {
          startDate: { type: 'string', format: 'date' },
          endDate: { type: 'string', format: 'date' },
        },
        description: 'Date range for analysis',
      },
      productId: {
        type: 'string',
        description: 'Optional product ID for product-specific analysis',
      },
      marketplace: {
        type: 'string',
        description: 'Filter by marketplace ID',
      },
      groupBy: {
        type: 'string',
        enum: ['day', 'week', 'month'],
        description: 'Group results by time period',
      },
    },
    required: ['period'],
    additionalProperties: false,
  },
  outputSchema: {
    type: 'object',
    properties: {
      totalRevenue: { type: 'object' },
      revenueByPeriod: { type: 'array' },
      topProducts: { type: 'array' },
      trends: { type: 'object' },
    },
    required: ['totalRevenue', 'revenueByPeriod', 'topProducts', 'trends'],
  },
  execute: async (parameters: ToolParameters): Promise<ToolResult> => {
    try {
      const periodParam = parameters.period as { startDate: string; endDate: string };
      const period: DateRange = {
        start: new Date(periodParam.startDate),
        end: new Date(periodParam.endDate),
      };
      const productId = parameters.productId as string;
      const marketplace = parameters.marketplace as string;
      const groupBy = parameters.groupBy as 'day' | 'week' | 'month' || 'day';

      // Get performance metrics
      const metrics = await dataService.getPerformanceMetrics(productId, period);
      
      // Get products for top performers analysis
      const products = await dataService.getProducts({
        marketplace,
        sortBy: 'revenue',
        sortOrder: 'desc',
        limit: 10,
      });

      // Calculate revenue trends
      const trends = {
        revenueGrowth: calculateGrowthRate(metrics.trends, 'revenue'),
        salesGrowth: calculateGrowthRate(metrics.trends, 'sales'),
        conversionTrend: calculateGrowthRate(metrics.trends, 'conversion'),
      };

      // Group revenue by period (simplified implementation)
      const revenueByPeriod = generateRevenueByPeriod(metrics, period, groupBy);

      return {
        success: true,
        data: {
          totalRevenue: metrics.revenue,
          revenueByPeriod,
          topProducts: products.slice(0, 5),
          trends,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'REVENUE_ANALYSIS_ERROR',
          message: error instanceof Error ? error.message : 'Failed to analyze revenue',
        },
      };
    }
  },
});

// SEO Score Analysis Tool
export const createSEOAnalysisTool = (dataService: BusinessDataService): BusinessTool => ({
  id: 'seo-analysis',
  name: 'SEO Score Analysis',
  description: 'Analyze SEO performance and identify optimization opportunities',
  version: '1.0.0',
  category: ToolCategory.BUSINESS_ANALYTICS,
  inputSchema: {
    type: 'object',
    properties: {
      productId: {
        type: 'string',
        description: 'Optional product ID for product-specific SEO analysis',
      },
      marketplace: {
        type: 'string',
        description: 'Filter by marketplace ID',
      },
      minScore: {
        type: 'number',
        minimum: 0,
        maximum: 100,
        description: 'Minimum SEO score threshold',
      },
      maxScore: {
        type: 'number',
        minimum: 0,
        maximum: 100,
        description: 'Maximum SEO score threshold',
      },
    },
    additionalProperties: false,
  },
  outputSchema: {
    type: 'object',
    properties: {
      averageScore: { type: 'number' },
      scoreDistribution: { type: 'object' },
      lowPerformingProducts: { type: 'array' },
      topPerformingProducts: { type: 'array' },
      recommendations: { type: 'array' },
    },
    required: ['averageScore', 'scoreDistribution', 'lowPerformingProducts', 'topPerformingProducts', 'recommendations'],
  },
  execute: async (parameters: ToolParameters): Promise<ToolResult> => {
    try {
      const productId = parameters.productId as string;
      const marketplace = parameters.marketplace as string;
      const minScore = parameters.minScore as number;
      const maxScore = parameters.maxScore as number;

      let products: Product[];

      if (productId) {
        const product = await dataService.getProduct(productId);
        products = product ? [product] : [];
      } else {
        products = await dataService.getProducts({
          marketplace,
          sortBy: 'seo_score',
          sortOrder: 'desc',
        });
      }

      // Filter by score range if specified
      if (minScore !== undefined || maxScore !== undefined) {
        products = products.filter(product => {
          const score = product.seoScore;
          return (minScore === undefined || score >= minScore) &&
                 (maxScore === undefined || score <= maxScore);
        });
      }

      // Calculate analytics
      const scores = products.map(p => p.seoScore);
      const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length || 0;

      const scoreDistribution = {
        excellent: scores.filter(s => s >= 80).length,
        good: scores.filter(s => s >= 60 && s < 80).length,
        fair: scores.filter(s => s >= 40 && s < 60).length,
        poor: scores.filter(s => s < 40).length,
      };

      const lowPerformingProducts = products
        .filter(p => p.seoScore < 60)
        .slice(0, 10);

      const topPerformingProducts = products
        .filter(p => p.seoScore >= 80)
        .slice(0, 10);

      const recommendations = generateSEORecommendations(lowPerformingProducts);

      return {
        success: true,
        data: {
          averageScore,
          scoreDistribution,
          lowPerformingProducts,
          topPerformingProducts,
          recommendations,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SEO_ANALYSIS_ERROR',
          message: error instanceof Error ? error.message : 'Failed to analyze SEO performance',
        },
      };
    }
  },
});

// Profitability Analysis Tool
export const createProfitabilityAnalysisTool = (dataService: BusinessDataService): BusinessTool => ({
  id: 'profitability-analysis',
  name: 'Profitability Analysis',
  description: 'Analyze profit margins and identify most profitable products',
  version: '1.0.0',
  category: ToolCategory.BUSINESS_ANALYTICS,
  inputSchema: {
    type: 'object',
    properties: {
      period: {
        type: 'object',
        properties: {
          startDate: { type: 'string', format: 'date' },
          endDate: { type: 'string', format: 'date' },
        },
        description: 'Date range for analysis',
      },
      marketplace: {
        type: 'string',
        description: 'Filter by marketplace ID',
      },
      minMargin: {
        type: 'number',
        minimum: 0,
        maximum: 100,
        description: 'Minimum profit margin percentage',
      },
    },
    required: ['period'],
    additionalProperties: false,
  },
  outputSchema: {
    type: 'object',
    properties: {
      totalProfit: { type: 'object' },
      averageMargin: { type: 'number' },
      mostProfitableProducts: { type: 'array' },
      leastProfitableProducts: { type: 'array' },
      marginDistribution: { type: 'object' },
    },
    required: ['totalProfit', 'averageMargin', 'mostProfitableProducts', 'leastProfitableProducts', 'marginDistribution'],
  },
  execute: async (parameters: ToolParameters): Promise<ToolResult> => {
    try {
      const periodParam = parameters.period as { startDate: string; endDate: string };
      const period: DateRange = {
        start: new Date(periodParam.startDate),
        end: new Date(periodParam.endDate),
      };
      const marketplace = parameters.marketplace as string;
      const minMargin = parameters.minMargin as number;

      // Get products and performance metrics
      const products = await dataService.getProducts({
        marketplace,
        sortBy: 'profit',
        sortOrder: 'desc',
      });

      const metrics = await dataService.getPerformanceMetrics(undefined, period);

      // Filter by minimum margin if specified
      const filteredProducts = minMargin !== undefined
        ? products.filter(p => p.performanceMetrics.profitMargin >= minMargin)
        : products;

      // Calculate profitability analytics
      const margins = filteredProducts.map(p => p.performanceMetrics.profitMargin);
      const averageMargin = margins.reduce((sum, margin) => sum + margin, 0) / margins.length || 0;

      const totalProfit = {
        amount: filteredProducts.reduce((sum, p) => {
          const profit = (p.price.amount - p.cost.amount) * p.performanceMetrics.salesCount;
          return sum + profit;
        }, 0),
        currency: products[0]?.price.currency || 'USD',
      };

      const marginDistribution = {
        high: margins.filter(m => m >= 50).length,
        medium: margins.filter(m => m >= 20 && m < 50).length,
        low: margins.filter(m => m >= 0 && m < 20).length,
        negative: margins.filter(m => m < 0).length,
      };

      return {
        success: true,
        data: {
          totalProfit,
          averageMargin,
          mostProfitableProducts: filteredProducts.slice(0, 10),
          leastProfitableProducts: filteredProducts.slice(-10).reverse(),
          marginDistribution,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'PROFITABILITY_ANALYSIS_ERROR',
          message: error instanceof Error ? error.message : 'Failed to analyze profitability',
        },
      };
    }
  },
});

// Helper functions
function calculateGrowthRate(trends: any[], metric: string): number {
  // Simplified growth rate calculation
  const relevantTrends = trends.filter(t => t.metric === metric);
  if (relevantTrends.length === 0) return 0;
  
  return relevantTrends.reduce((sum, trend) => sum + trend.changePercent, 0) / relevantTrends.length;
}

function generateRevenueByPeriod(metrics: PerformanceMetrics, period: DateRange, groupBy: string): any[] {
  // Simplified implementation - in reality, this would query historical data
  const days = Math.ceil((period.end.getTime() - period.start.getTime()) / (1000 * 60 * 60 * 24));
  const periods = groupBy === 'day' ? days : groupBy === 'week' ? Math.ceil(days / 7) : Math.ceil(days / 30);
  
  const revenuePerPeriod = metrics.revenue.amount / periods;
  
  return Array.from({ length: Math.min(periods, 30) }, (_, i) => ({
    period: i + 1,
    revenue: revenuePerPeriod,
    sales: Math.floor(metrics.salesCount / periods),
  }));
}

function generateSEORecommendations(lowPerformingProducts: Product[]): any[] {
  const recommendations = [];
  
  for (const product of lowPerformingProducts.slice(0, 5)) {
    const issues = [];
    
    if (product.title.length < 20) {
      issues.push('Title too short - consider adding more descriptive keywords');
    }
    
    if (product.description.length < 100) {
      issues.push('Description too brief - add more detailed product information');
    }
    
    if (product.tags.length < 3) {
      issues.push('Insufficient tags - add more relevant keywords');
    }
    
    if (product.images.length < 3) {
      issues.push('Add more product images with descriptive alt text');
    }
    
    recommendations.push({
      productId: product.id,
      productTitle: product.title,
      currentScore: product.seoScore,
      issues,
      potentialImprovement: Math.min(20, 80 - product.seoScore),
    });
  }
  
  return recommendations;
}