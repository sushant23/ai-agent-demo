// Recommendation Generator Implementation

import {
  Recommendation,
  AnalysisType,
  RecommendationCategory,
  BusinessData
} from '../types/recommendations';
import {
  IRecommendationGenerator,
  RecommendationAlgorithm,
  AnalysisResult,
  Finding
} from '../interfaces/recommendation-engine';
import { Priority, ImpactEstimate, RiskLevel, Action } from '../types/common';
import { IdGenerator } from '../utils/id-generator';
import { Product } from '../types/business';

export class RecommendationGenerator implements IRecommendationGenerator {
  private algorithms = new Map<AnalysisType, RecommendationAlgorithm>();

  constructor() {
    this.registerDefaultAlgorithms();
  }

  async generate(
    productId: string,
    analysisType: AnalysisType,
    businessData: BusinessData
  ): Promise<Recommendation[]> {
    const algorithm = this.getAlgorithm(analysisType);
    if (!algorithm) {
      throw new Error(`No algorithm registered for analysis type: ${analysisType}`);
    }

    const analysisResult = await algorithm.analyze(productId, businessData);
    const recommendations = await algorithm.generateRecommendations(analysisResult);

    // Enhance recommendations with impact estimates
    for (const recommendation of recommendations) {
      if (!recommendation.impactEstimate) {
        recommendation.impactEstimate = await algorithm.estimateImpact(recommendation, businessData);
      }
    }

    return recommendations;
  }

  registerAlgorithm(type: AnalysisType, algorithm: RecommendationAlgorithm): void {
    this.algorithms.set(type, algorithm);
  }

  getAlgorithm(type: AnalysisType): RecommendationAlgorithm | null {
    return this.algorithms.get(type) || null;
  }

  private registerDefaultAlgorithms(): void {
    this.registerAlgorithm(AnalysisType.SEO_ANALYSIS, new SEOAnalysisAlgorithm());
    this.registerAlgorithm(AnalysisType.PROFITABILITY_ANALYSIS, new ProfitabilityAnalysisAlgorithm());
    this.registerAlgorithm(AnalysisType.PERFORMANCE_ANALYSIS, new PerformanceAnalysisAlgorithm());
    this.registerAlgorithm(AnalysisType.INVENTORY_ANALYSIS, new InventoryAnalysisAlgorithm());
  }
}

// SEO Analysis Algorithm
class SEOAnalysisAlgorithm implements RecommendationAlgorithm {
  async analyze(productId: string, businessData: BusinessData): Promise<AnalysisResult> {
    const product = this.findProduct(productId, businessData);
    if (!product) {
      throw new Error(`Product not found: ${productId}`);
    }

    const findings: Finding[] = [];

    // Analyze SEO score
    if (product.seoScore < 70) {
      findings.push({
        category: 'seo_score',
        severity: product.seoScore < 40 ? 'critical' : 'medium',
        description: `SEO score is ${product.seoScore}/100, below recommended threshold`,
        evidence: [{ currentScore: product.seoScore, recommendedScore: 80 }],
        suggestedActions: ['Optimize product title', 'Improve product description', 'Add relevant tags']
      });
    }

    // Analyze title length and keywords
    if (product.title.length < 30 || product.title.length > 60) {
      findings.push({
        category: 'title_optimization',
        severity: 'medium',
        description: 'Product title length is not optimal for SEO',
        evidence: [{ currentLength: product.title.length, recommendedRange: '30-60 characters' }],
        suggestedActions: ['Adjust title length', 'Include primary keywords']
      });
    }

    // Analyze description
    if (product.description.length < 150) {
      findings.push({
        category: 'description_optimization',
        severity: 'low',
        description: 'Product description is too short for effective SEO',
        evidence: [{ currentLength: product.description.length, recommendedMinimum: 150 }],
        suggestedActions: ['Expand product description', 'Add feature details', 'Include benefits']
      });
    }

    return {
      type: AnalysisType.SEO_ANALYSIS,
      productId,
      findings,
      confidence: 0.85,
      metadata: { seoScore: product.seoScore, titleLength: product.title.length }
    };
  }

  async generateRecommendations(analysis: AnalysisResult): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    for (const finding of analysis.findings) {
      switch (finding.category) {
        case 'seo_score':
          recommendations.push({
            id: IdGenerator.generateRecommendationId(),
            title: 'Improve SEO Score',
            reason: `Current SEO score of ${(finding.evidence[0] as any).currentScore} is below optimal range`,
            priority: finding.severity === 'critical' ? Priority.HIGH : Priority.MEDIUM,
            category: RecommendationCategory.SEO_OPTIMIZATION,
            requiredActions: this.createSEOActions(),
            createdAt: new Date()
          });
          break;

        case 'title_optimization':
          recommendations.push({
            id: IdGenerator.generateRecommendationId(),
            title: 'Optimize Product Title',
            reason: 'Product title length and keyword optimization can improve search visibility',
            priority: Priority.MEDIUM,
            category: RecommendationCategory.SEO_OPTIMIZATION,
            requiredActions: this.createTitleActions(),
            createdAt: new Date()
          });
          break;

        case 'description_optimization':
          recommendations.push({
            id: IdGenerator.generateRecommendationId(),
            title: 'Enhance Product Description',
            reason: 'Longer, more detailed descriptions improve SEO and conversion rates',
            priority: Priority.LOW,
            category: RecommendationCategory.SEO_OPTIMIZATION,
            requiredActions: this.createDescriptionActions(),
            createdAt: new Date()
          });
          break;
      }
    }

    return recommendations;
  }

  async estimateImpact(recommendation: Recommendation, businessData: BusinessData): Promise<ImpactEstimate> {
    return {
      revenueImpact: { amount: 500, currency: 'USD' },
      timeToSeeResults: { value: 2, unit: 'weeks' },
      confidenceLevel: 0.75,
      riskLevel: RiskLevel.LOW
    };
  }

  private createSEOActions(): Action[] {
    return [
      {
        id: IdGenerator.generate(),
        type: 'update_product',
        parameters: { field: 'seo_optimization' },
        description: 'Apply SEO optimization recommendations'
      }
    ];
  }

  private createTitleActions(): Action[] {
    return [
      {
        id: IdGenerator.generate(),
        type: 'update_product',
        parameters: { field: 'title' },
        description: 'Optimize product title for SEO'
      }
    ];
  }

  private createDescriptionActions(): Action[] {
    return [
      {
        id: IdGenerator.generate(),
        type: 'update_product',
        parameters: { field: 'description' },
        description: 'Enhance product description'
      }
    ];
  }

  private findProduct(productId: string, businessData: BusinessData): Product | null {
    return businessData.topPerformingProducts.find(p => p.id === productId) || null;
  }
}

// Profitability Analysis Algorithm
class ProfitabilityAnalysisAlgorithm implements RecommendationAlgorithm {
  async analyze(productId: string, businessData: BusinessData): Promise<AnalysisResult> {
    const product = this.findProduct(productId, businessData);
    if (!product) {
      throw new Error(`Product not found: ${productId}`);
    }

    const findings: Finding[] = [];
    const profitMargin = product.performanceMetrics.profitMargin;

    if (profitMargin < 20) {
      findings.push({
        category: 'low_profit_margin',
        severity: profitMargin < 10 ? 'critical' : 'high',
        description: `Profit margin of ${profitMargin}% is below recommended threshold`,
        evidence: [{ currentMargin: profitMargin, recommendedMargin: 25 }],
        suggestedActions: ['Increase pricing', 'Reduce costs', 'Optimize supplier relationships']
      });
    }

    return {
      type: AnalysisType.PROFITABILITY_ANALYSIS,
      productId,
      findings,
      confidence: 0.90,
      metadata: { profitMargin }
    };
  }

  async generateRecommendations(analysis: AnalysisResult): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    for (const finding of analysis.findings) {
      if (finding.category === 'low_profit_margin') {
        recommendations.push({
          id: IdGenerator.generateRecommendationId(),
          title: 'Improve Profit Margins',
          reason: `Current profit margin of ${(finding.evidence[0] as any).currentMargin}% needs improvement`,
          priority: finding.severity === 'critical' ? Priority.CRITICAL : Priority.HIGH,
          category: RecommendationCategory.PRICING_STRATEGY,
          requiredActions: [{
            id: IdGenerator.generate(),
            type: 'adjust_pricing',
            parameters: { strategy: 'margin_optimization' },
            description: 'Optimize pricing strategy for better margins'
          }],
          createdAt: new Date()
        });
      }
    }

    return recommendations;
  }

  async estimateImpact(recommendation: Recommendation, businessData: BusinessData): Promise<ImpactEstimate> {
    return {
      revenueImpact: { amount: 1200, currency: 'USD' },
      timeToSeeResults: { value: 1, unit: 'weeks' },
      confidenceLevel: 0.85,
      riskLevel: RiskLevel.MEDIUM
    };
  }

  private findProduct(productId: string, businessData: BusinessData): Product | null {
    return businessData.topPerformingProducts.find(p => p.id === productId) || null;
  }
}

// Performance Analysis Algorithm
class PerformanceAnalysisAlgorithm implements RecommendationAlgorithm {
  async analyze(productId: string, businessData: BusinessData): Promise<AnalysisResult> {
    const product = this.findProduct(productId, businessData);
    if (!product) {
      throw new Error(`Product not found: ${productId}`);
    }

    const findings: Finding[] = [];
    const conversionRate = product.performanceMetrics.conversionRate;

    if (conversionRate < 2.0) {
      findings.push({
        category: 'low_conversion',
        severity: conversionRate < 1.0 ? 'high' : 'medium',
        description: `Conversion rate of ${conversionRate}% is below industry average`,
        evidence: [{ currentRate: conversionRate, industryAverage: 2.5 }],
        suggestedActions: ['Improve product images', 'Optimize pricing', 'Enhance product description']
      });
    }

    return {
      type: AnalysisType.PERFORMANCE_ANALYSIS,
      productId,
      findings,
      confidence: 0.80,
      metadata: { conversionRate }
    };
  }

  async generateRecommendations(analysis: AnalysisResult): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    for (const finding of analysis.findings) {
      if (finding.category === 'low_conversion') {
        recommendations.push({
          id: IdGenerator.generateRecommendationId(),
          title: 'Boost Conversion Rate',
          reason: `Conversion rate of ${(finding.evidence[0] as any).currentRate}% can be improved`,
          priority: Priority.HIGH,
          category: RecommendationCategory.PRODUCT_IMPROVEMENT,
          requiredActions: [{
            id: IdGenerator.generate(),
            type: 'optimize_product',
            parameters: { focus: 'conversion_optimization' },
            description: 'Optimize product for better conversion'
          }],
          createdAt: new Date()
        });
      }
    }

    return recommendations;
  }

  async estimateImpact(recommendation: Recommendation, businessData: BusinessData): Promise<ImpactEstimate> {
    return {
      revenueImpact: { amount: 800, currency: 'USD' },
      timeToSeeResults: { value: 3, unit: 'weeks' },
      confidenceLevel: 0.70,
      riskLevel: RiskLevel.LOW
    };
  }

  private findProduct(productId: string, businessData: BusinessData): Product | null {
    return businessData.topPerformingProducts.find(p => p.id === productId) || null;
  }
}

// Inventory Analysis Algorithm
class InventoryAnalysisAlgorithm implements RecommendationAlgorithm {
  async analyze(productId: string, businessData: BusinessData): Promise<AnalysisResult> {
    const product = this.findProduct(productId, businessData);
    if (!product) {
      throw new Error(`Product not found: ${productId}`);
    }

    const findings: Finding[] = [];
    const inventory = product.inventory;

    if (inventory.quantity <= inventory.lowStockThreshold) {
      findings.push({
        category: 'low_stock',
        severity: inventory.quantity === 0 ? 'critical' : 'high',
        description: `Stock level of ${inventory.quantity} is at or below threshold`,
        evidence: [{ currentStock: inventory.quantity, threshold: inventory.lowStockThreshold }],
        suggestedActions: ['Reorder inventory', 'Adjust reorder points', 'Review demand forecasting']
      });
    }

    return {
      type: AnalysisType.INVENTORY_ANALYSIS,
      productId,
      findings,
      confidence: 0.95,
      metadata: { stockLevel: inventory.quantity, threshold: inventory.lowStockThreshold }
    };
  }

  async generateRecommendations(analysis: AnalysisResult): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    for (const finding of analysis.findings) {
      if (finding.category === 'low_stock') {
        recommendations.push({
          id: IdGenerator.generateRecommendationId(),
          title: 'Replenish Inventory',
          reason: `Stock level is critically low and needs immediate attention`,
          priority: finding.severity === 'critical' ? Priority.CRITICAL : Priority.HIGH,
          category: RecommendationCategory.INVENTORY_MANAGEMENT,
          requiredActions: [{
            id: IdGenerator.generate(),
            type: 'reorder_inventory',
            parameters: { urgency: finding.severity },
            description: 'Place inventory reorder'
          }],
          createdAt: new Date()
        });
      }
    }

    return recommendations;
  }

  async estimateImpact(recommendation: Recommendation, businessData: BusinessData): Promise<ImpactEstimate> {
    return {
      revenueImpact: { amount: 2000, currency: 'USD' },
      timeToSeeResults: { value: 1, unit: 'days' },
      confidenceLevel: 0.95,
      riskLevel: RiskLevel.LOW
    };
  }

  private findProduct(productId: string, businessData: BusinessData): Product | null {
    return businessData.topPerformingProducts.find(p => p.id === productId) || null;
  }
}