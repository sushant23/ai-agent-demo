// Profitability analysis and optimization

import { Product, PerformanceMetrics } from '../../types/business';
import { Money, DateRange } from '../../types/common';

export interface ProfitabilityAnalysis {
  overallProfitability: OverallProfitability;
  productProfitability: ProductProfitability[];
  categoryProfitability: CategoryProfitability[];
  recommendations: ProfitabilityRecommendation[];
  trends: ProfitabilityTrend[];
}

export interface OverallProfitability {
  totalRevenue: Money;
  totalCost: Money;
  grossProfit: Money;
  grossProfitMargin: number;
  netProfit: Money;
  netProfitMargin: number;
  averageProfitPerProduct: Money;
  profitableProductsCount: number;
  unprofitableProductsCount: number;
}

export interface ProductProfitability {
  productId: string;
  productTitle: string;
  revenue: Money;
  cost: Money;
  grossProfit: Money;
  grossProfitMargin: number;
  netProfit: Money;
  netProfitMargin: number;
  profitPerUnit: Money;
  salesVolume: number;
  profitRank: number;
  profitabilityScore: number; // 0-100 score
  issues: ProfitabilityIssue[];
  opportunities: ProfitabilityOpportunity[];
}

export interface CategoryProfitability {
  category: string;
  productCount: number;
  totalRevenue: Money;
  totalProfit: Money;
  averageProfitMargin: number;
  topProduct: string;
  worstProduct: string;
  profitContribution: number; // Percentage of total profit
}

export interface ProfitabilityRecommendation {
  type: 'pricing' | 'cost_reduction' | 'discontinue' | 'promote' | 'optimize';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedProducts: string[];
  estimatedImpact: Money;
  implementationEffort: 'low' | 'medium' | 'high';
  timeframe: 'immediate' | 'short_term' | 'long_term';
}

export interface ProfitabilityTrend {
  metric: 'profit_margin' | 'gross_profit' | 'net_profit' | 'cost_ratio';
  direction: 'improving' | 'declining' | 'stable';
  changePercent: number;
  period: DateRange;
  significance: 'high' | 'medium' | 'low';
}

export interface ProfitabilityIssue {
  type: 'negative_margin' | 'low_margin' | 'high_cost' | 'low_volume' | 'pricing_issue';
  severity: 'critical' | 'warning' | 'minor';
  description: string;
  impact: Money;
  suggestedAction: string;
}

export interface ProfitabilityOpportunity {
  type: 'price_increase' | 'cost_reduction' | 'volume_increase' | 'bundle_opportunity';
  description: string;
  potentialImpact: Money;
  confidence: number; // 0-1
  effort: 'low' | 'medium' | 'high';
}

export class ProfitabilityAnalyzer {
  analyzeProducts(products: Product[], overheadRate = 0.2): ProfitabilityAnalysis {
    const productProfitability = this.calculateProductProfitability(products, overheadRate);
    const overallProfitability = this.calculateOverallProfitability(productProfitability);
    const categoryProfitability = this.calculateCategoryProfitability(products, productProfitability);
    const recommendations = this.generateRecommendations(productProfitability);
    const trends = this.analyzeTrends(products);

    return {
      overallProfitability,
      productProfitability,
      categoryProfitability,
      recommendations,
      trends,
    };
  }

  private calculateProductProfitability(products: Product[], overheadRate: number): ProductProfitability[] {
    const profitabilityData: ProductProfitability[] = [];

    for (const product of products) {
      const revenue = product.performanceMetrics.revenue.amount;
      const unitCost = product.cost.amount;
      const salesVolume = product.performanceMetrics.salesCount;
      const totalCost = unitCost * salesVolume;
      
      const grossProfit = revenue - totalCost;
      const grossProfitMargin = revenue > 0 ? grossProfit / revenue : 0;
      
      // Calculate net profit (after overhead)
      const overhead = revenue * overheadRate;
      const netProfit = grossProfit - overhead;
      const netProfitMargin = revenue > 0 ? netProfit / revenue : 0;
      
      const profitPerUnit = salesVolume > 0 ? grossProfit / salesVolume : 0;
      
      // Calculate profitability score (0-100)
      const profitabilityScore = this.calculateProfitabilityScore(
        grossProfitMargin,
        netProfitMargin,
        salesVolume,
        revenue
      );

      const issues = this.identifyProfitabilityIssues(product, grossProfitMargin, netProfitMargin, salesVolume);
      const opportunities = this.identifyProfitabilityOpportunities(product, grossProfitMargin, salesVolume);

      profitabilityData.push({
        productId: product.id,
        productTitle: product.title,
        revenue: { amount: revenue, currency: product.price.currency },
        cost: { amount: totalCost, currency: product.cost.currency },
        grossProfit: { amount: grossProfit, currency: product.price.currency },
        grossProfitMargin,
        netProfit: { amount: netProfit, currency: product.price.currency },
        netProfitMargin,
        profitPerUnit: { amount: profitPerUnit, currency: product.price.currency },
        salesVolume,
        profitRank: 0, // Will be set after sorting
        profitabilityScore,
        issues,
        opportunities,
      });
    }

    // Sort by gross profit and assign ranks
    profitabilityData.sort((a, b) => b.grossProfit.amount - a.grossProfit.amount);
    profitabilityData.forEach((item, index) => {
      item.profitRank = index + 1;
    });

    return profitabilityData;
  }

  private calculateOverallProfitability(productProfitability: ProductProfitability[]): OverallProfitability {
    const totalRevenue = productProfitability.reduce((sum, p) => sum + p.revenue.amount, 0);
    const totalCost = productProfitability.reduce((sum, p) => sum + p.cost.amount, 0);
    const totalGrossProfit = productProfitability.reduce((sum, p) => sum + p.grossProfit.amount, 0);
    const totalNetProfit = productProfitability.reduce((sum, p) => sum + p.netProfit.amount, 0);

    const grossProfitMargin = totalRevenue > 0 ? totalGrossProfit / totalRevenue : 0;
    const netProfitMargin = totalRevenue > 0 ? totalNetProfit / totalRevenue : 0;
    const averageProfitPerProduct = productProfitability.length > 0 ? totalGrossProfit / productProfitability.length : 0;

    const profitableProductsCount = productProfitability.filter(p => p.grossProfit.amount > 0).length;
    const unprofitableProductsCount = productProfitability.length - profitableProductsCount;

    const currency = productProfitability[0]?.revenue.currency || 'USD';

    return {
      totalRevenue: { amount: totalRevenue, currency },
      totalCost: { amount: totalCost, currency },
      grossProfit: { amount: totalGrossProfit, currency },
      grossProfitMargin,
      netProfit: { amount: totalNetProfit, currency },
      netProfitMargin,
      averageProfitPerProduct: { amount: averageProfitPerProduct, currency },
      profitableProductsCount,
      unprofitableProductsCount,
    };
  }

  private calculateCategoryProfitability(
    products: Product[],
    productProfitability: ProductProfitability[]
  ): CategoryProfitability[] {
    const categoryMap = new Map<string, {
      products: string[];
      revenue: number;
      profit: number;
      margins: number[];
    }>();

    // Group by category
    for (const product of products) {
      const profitData = productProfitability.find(p => p.productId === product.id);
      if (!profitData) continue;

      if (!categoryMap.has(product.category)) {
        categoryMap.set(product.category, {
          products: [],
          revenue: 0,
          profit: 0,
          margins: [],
        });
      }

      const categoryData = categoryMap.get(product.category)!;
      categoryData.products.push(product.id);
      categoryData.revenue += profitData.revenue.amount;
      categoryData.profit += profitData.grossProfit.amount;
      categoryData.margins.push(profitData.grossProfitMargin);
    }

    const totalProfit = Array.from(categoryMap.values()).reduce((sum, cat) => sum + cat.profit, 0);
    const currency = productProfitability[0]?.revenue.currency || 'USD';

    return Array.from(categoryMap.entries()).map(([category, data]) => {
      const averageProfitMargin = data.margins.reduce((sum, margin) => sum + margin, 0) / data.margins.length;
      
      // Find top and worst performing products in category
      const categoryProducts = productProfitability.filter(p => 
        data.products.includes(p.productId)
      );
      const topProduct = categoryProducts.reduce((top, current) => 
        current.grossProfit.amount > top.grossProfit.amount ? current : top
      );
      const worstProduct = categoryProducts.reduce((worst, current) => 
        current.grossProfit.amount < worst.grossProfit.amount ? current : worst
      );

      return {
        category,
        productCount: data.products.length,
        totalRevenue: { amount: data.revenue, currency },
        totalProfit: { amount: data.profit, currency },
        averageProfitMargin,
        topProduct: topProduct.productId,
        worstProduct: worstProduct.productId,
        profitContribution: totalProfit > 0 ? (data.profit / totalProfit) * 100 : 0,
      };
    }).sort((a, b) => b.totalProfit.amount - a.totalProfit.amount);
  }

  private calculateProfitabilityScore(
    grossMargin: number,
    netMargin: number,
    salesVolume: number,
    revenue: number
  ): number {
    let score = 0;

    // Gross margin contribution (40%)
    if (grossMargin > 0.5) score += 40;
    else if (grossMargin > 0.3) score += 30;
    else if (grossMargin > 0.1) score += 20;
    else if (grossMargin > 0) score += 10;

    // Net margin contribution (30%)
    if (netMargin > 0.3) score += 30;
    else if (netMargin > 0.15) score += 20;
    else if (netMargin > 0.05) score += 10;
    else if (netMargin > 0) score += 5;

    // Sales volume contribution (20%)
    if (salesVolume > 100) score += 20;
    else if (salesVolume > 50) score += 15;
    else if (salesVolume > 10) score += 10;
    else if (salesVolume > 0) score += 5;

    // Revenue contribution (10%)
    if (revenue > 10000) score += 10;
    else if (revenue > 5000) score += 8;
    else if (revenue > 1000) score += 5;
    else if (revenue > 0) score += 2;

    return Math.min(score, 100);
  }

  private identifyProfitabilityIssues(
    product: Product,
    grossMargin: number,
    netMargin: number,
    salesVolume: number
  ): ProfitabilityIssue[] {
    const issues: ProfitabilityIssue[] = [];
    const currency = product.price.currency;

    // Negative margin
    if (grossMargin < 0) {
      issues.push({
        type: 'negative_margin',
        severity: 'critical',
        description: 'Product is selling at a loss',
        impact: { amount: Math.abs(grossMargin * product.performanceMetrics.revenue.amount), currency },
        suggestedAction: 'Increase price or reduce costs immediately',
      });
    }

    // Low margin
    if (grossMargin > 0 && grossMargin < 0.1) {
      issues.push({
        type: 'low_margin',
        severity: 'warning',
        description: 'Profit margin is below 10%',
        impact: { amount: (0.2 - grossMargin) * product.performanceMetrics.revenue.amount, currency },
        suggestedAction: 'Review pricing strategy and cost structure',
      });
    }

    // High cost relative to price
    if (product.cost.amount / product.price.amount > 0.8) {
      issues.push({
        type: 'high_cost',
        severity: 'warning',
        description: 'Cost is more than 80% of selling price',
        impact: { amount: product.cost.amount - (product.price.amount * 0.7), currency },
        suggestedAction: 'Negotiate better supplier rates or find alternative sources',
      });
    }

    // Low sales volume
    if (salesVolume < 5 && grossMargin > 0) {
      issues.push({
        type: 'low_volume',
        severity: 'minor',
        description: 'Low sales volume may indicate market issues',
        impact: { amount: 0, currency },
        suggestedAction: 'Investigate market demand and marketing effectiveness',
      });
    }

    return issues;
  }

  private identifyProfitabilityOpportunities(
    product: Product,
    grossMargin: number,
    salesVolume: number
  ): ProfitabilityOpportunity[] {
    const opportunities: ProfitabilityOpportunity[] = [];
    const currency = product.price.currency;

    // Price increase opportunity
    if (grossMargin > 0.3 && salesVolume > 20) {
      const potentialIncrease = product.price.amount * 0.1; // 10% increase
      const estimatedImpact = potentialIncrease * salesVolume * 0.8; // Assume 20% volume loss
      
      opportunities.push({
        type: 'price_increase',
        description: 'Strong margins and sales suggest room for price increase',
        potentialImpact: { amount: estimatedImpact, currency },
        confidence: 0.7,
        effort: 'low',
      });
    }

    // Volume increase opportunity
    if (grossMargin > 0.4 && salesVolume < 50) {
      const potentialVolume = salesVolume * 2;
      const estimatedImpact = (product.price.amount - product.cost.amount) * potentialVolume;
      
      opportunities.push({
        type: 'volume_increase',
        description: 'High margins suggest potential for increased marketing investment',
        potentialImpact: { amount: estimatedImpact, currency },
        confidence: 0.6,
        effort: 'medium',
      });
    }

    // Cost reduction opportunity
    if (grossMargin < 0.3 && grossMargin > 0) {
      const targetCostReduction = product.cost.amount * 0.15; // 15% cost reduction
      const estimatedImpact = targetCostReduction * salesVolume;
      
      opportunities.push({
        type: 'cost_reduction',
        description: 'Cost optimization could significantly improve margins',
        potentialImpact: { amount: estimatedImpact, currency },
        confidence: 0.5,
        effort: 'high',
      });
    }

    return opportunities.sort((a, b) => b.potentialImpact.amount - a.potentialImpact.amount);
  }

  private generateRecommendations(productProfitability: ProductProfitability[]): ProfitabilityRecommendation[] {
    const recommendations: ProfitabilityRecommendation[] = [];
    const currency = productProfitability[0]?.revenue.currency || 'USD';

    // Critical: Products with negative margins
    const negativeMarginProducts = productProfitability.filter(p => p.grossProfitMargin < 0);
    if (negativeMarginProducts.length > 0) {
      const totalLoss = negativeMarginProducts.reduce((sum, p) => sum + Math.abs(p.grossProfit.amount), 0);
      
      recommendations.push({
        type: 'pricing',
        priority: 'high',
        title: 'Fix Loss-Making Products',
        description: `${negativeMarginProducts.length} products are losing money and need immediate price or cost adjustments`,
        affectedProducts: negativeMarginProducts.map(p => p.productId),
        estimatedImpact: { amount: totalLoss, currency },
        implementationEffort: 'medium',
        timeframe: 'immediate',
      });
    }

    // High opportunity: Products with good margins but low volume
    const lowVolumeHighMargin = productProfitability.filter(p => 
      p.grossProfitMargin > 0.4 && p.salesVolume < 20
    );
    if (lowVolumeHighMargin.length > 0) {
      const potentialImpact = lowVolumeHighMargin.reduce((sum, p) => 
        sum + (p.profitPerUnit.amount * p.salesVolume), 0
      );
      
      recommendations.push({
        type: 'promote',
        priority: 'high',
        title: 'Promote High-Margin Products',
        description: `${lowVolumeHighMargin.length} products have excellent margins but low sales volume`,
        affectedProducts: lowVolumeHighMargin.map(p => p.productId),
        estimatedImpact: { amount: potentialImpact, currency },
        implementationEffort: 'medium',
        timeframe: 'short_term',
      });
    }

    // Optimization: Products with room for price increases
    const priceIncreaseOpportunity = productProfitability.filter(p => 
      p.grossProfitMargin > 0.3 && p.salesVolume > 50
    );
    if (priceIncreaseOpportunity.length > 0) {
      const potentialImpact = priceIncreaseOpportunity.reduce((sum, p) => 
        sum + (p.revenue.amount * 0.05), 0 // 5% price increase
      );
      
      recommendations.push({
        type: 'pricing',
        priority: 'medium',
        title: 'Strategic Price Increases',
        description: `${priceIncreaseOpportunity.length} products may support modest price increases`,
        affectedProducts: priceIncreaseOpportunity.map(p => p.productId),
        estimatedImpact: { amount: potentialImpact, currency },
        implementationEffort: 'low',
        timeframe: 'short_term',
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  private analyzeTrends(products: Product[]): ProfitabilityTrend[] {
    // This is a simplified implementation - in production would analyze historical data
    const trends: ProfitabilityTrend[] = [];
    
    const avgMargin = products.reduce((sum, p) => sum + p.performanceMetrics.profitMargin, 0) / products.length;
    
    // Mock trend analysis
    const period: DateRange = {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: new Date(),
    };

    trends.push({
      metric: 'profit_margin',
      direction: avgMargin > 0.3 ? 'improving' : avgMargin > 0.15 ? 'stable' : 'declining',
      changePercent: (Math.random() - 0.5) * 20, // Mock change
      period,
      significance: avgMargin > 0.3 ? 'high' : 'medium',
    });

    return trends;
  }
}