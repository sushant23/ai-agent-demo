// SEO analysis and optimization recommendations

import { Product } from '../../types/business';

export interface SEOAnalysis {
  overallScore: number;
  productAnalyses: ProductSEOAnalysis[];
  recommendations: SEORecommendation[];
  benchmarks: SEOBenchmarks;
}

export interface ProductSEOAnalysis {
  productId: string;
  productTitle: string;
  seoScore: number;
  titleScore: number;
  descriptionScore: number;
  keywordScore: number;
  imageScore: number;
  issues: SEOIssue[];
  opportunities: SEOOpportunity[];
}

export interface SEOIssue {
  type: 'critical' | 'warning' | 'suggestion';
  category: 'title' | 'description' | 'keywords' | 'images' | 'structure';
  message: string;
  impact: 'high' | 'medium' | 'low';
  fix: string;
}

export interface SEOOpportunity {
  category: 'title' | 'description' | 'keywords' | 'images';
  description: string;
  potentialImpact: number; // Estimated score improvement
  effort: 'low' | 'medium' | 'high';
  priority: number; // 1-10 scale
}

export interface SEORecommendation {
  type: 'immediate' | 'short_term' | 'long_term';
  title: string;
  description: string;
  affectedProducts: string[];
  estimatedImpact: number;
  implementationEffort: 'low' | 'medium' | 'high';
}

export interface SEOBenchmarks {
  averageScore: number;
  topPerformers: string[]; // Product IDs
  bottomPerformers: string[]; // Product IDs
  categoryAverages: Record<string, number>;
  industryBenchmark: number;
}

export class SEOAnalyzer {
  analyzeProducts(products: Product[]): SEOAnalysis {
    const productAnalyses: ProductSEOAnalysis[] = [];
    let totalScore = 0;

    for (const product of products) {
      const analysis = this.analyzeProduct(product);
      productAnalyses.push(analysis);
      totalScore += analysis.seoScore;
    }

    const overallScore = products.length > 0 ? totalScore / products.length : 0;
    const recommendations = this.generateRecommendations(productAnalyses);
    const benchmarks = this.calculateBenchmarks(productAnalyses, products);

    return {
      overallScore,
      productAnalyses,
      recommendations,
      benchmarks,
    };
  }

  analyzeProduct(product: Product): ProductSEOAnalysis {
    const titleScore = this.analyzeTitleSEO(product.title);
    const descriptionScore = this.analyzeDescriptionSEO(product.description);
    const keywordScore = this.analyzeKeywordSEO(product.title, product.description, product.tags);
    const imageScore = this.analyzeImageSEO(product.images || []);

    // Calculate weighted overall score
    const seoScore = Math.round(
      titleScore * 0.3 +
      descriptionScore * 0.25 +
      keywordScore * 0.25 +
      imageScore * 0.2
    );

    const issues = this.identifyIssues(product, titleScore, descriptionScore, keywordScore, imageScore);
    const opportunities = this.identifyOpportunities(product, titleScore, descriptionScore, keywordScore, imageScore);

    return {
      productId: product.id,
      productTitle: product.title,
      seoScore,
      titleScore,
      descriptionScore,
      keywordScore,
      imageScore,
      issues,
      opportunities,
    };
  }

  private analyzeTitleSEO(title: string): number {
    let score = 0;

    // Length check (optimal: 50-60 characters)
    if (title.length >= 30 && title.length <= 70) {
      score += 30;
    } else if (title.length >= 20 && title.length <= 80) {
      score += 20;
    } else {
      score += 10;
    }

    // Keyword placement (first words are more important)
    const words = title.toLowerCase().split(' ');
    if (words.length >= 3) {
      score += 20; // Has multiple keywords
    }

    // Avoid keyword stuffing
    const uniqueWords = new Set(words);
    if (uniqueWords.size / words.length > 0.7) {
      score += 20; // Good word diversity
    }

    // Check for power words
    const powerWords = ['best', 'premium', 'professional', 'quality', 'exclusive', 'limited'];
    const hasPowerWords = powerWords.some(word => title.toLowerCase().includes(word));
    if (hasPowerWords) {
      score += 15;
    }

    // Check for numbers (often perform well)
    if (/\d/.test(title)) {
      score += 15;
    }

    return Math.min(score, 100);
  }

  private analyzeDescriptionSEO(description: string): number {
    let score = 0;

    // Length check (optimal: 150-300 characters for meta descriptions, longer for product descriptions)
    if (description.length >= 100 && description.length <= 500) {
      score += 25;
    } else if (description.length >= 50 && description.length <= 800) {
      score += 15;
    } else {
      score += 5;
    }

    // Keyword density (should be natural, not stuffed)
    const words = description.toLowerCase().split(/\s+/);
    const wordCount = words.length;
    if (wordCount >= 20) {
      score += 20; // Sufficient content
    }

    // Check for call-to-action words
    const ctaWords = ['buy', 'order', 'purchase', 'get', 'shop', 'discover'];
    const hasCTA = ctaWords.some(word => description.toLowerCase().includes(word));
    if (hasCTA) {
      score += 15;
    }

    // Check for benefit-focused language
    const benefitWords = ['save', 'improve', 'enhance', 'boost', 'increase', 'reduce'];
    const hasBenefits = benefitWords.some(word => description.toLowerCase().includes(word));
    if (hasBenefits) {
      score += 15;
    }

    // Readability (simple check for sentence structure)
    const sentences = description.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length >= 2) {
      score += 15; // Multiple sentences for better readability
    }

    // Check for specifications or features
    if (description.includes('•') || description.includes('-') || description.includes('*')) {
      score += 10; // Structured information
    }

    return Math.min(score, 100);
  }

  private analyzeKeywordSEO(title: string, description: string, tags: string[]): number {
    let score = 0;

    // Tag count (optimal: 5-15 tags)
    if (tags.length >= 5 && tags.length <= 15) {
      score += 30;
    } else if (tags.length >= 3 && tags.length <= 20) {
      score += 20;
    } else {
      score += 10;
    }

    // Keyword consistency between title, description, and tags
    const titleWords = new Set(title.toLowerCase().split(/\s+/));
    const descWords = new Set(description.toLowerCase().split(/\s+/));
    const tagWords = new Set(tags.map(tag => tag.toLowerCase()));

    let consistency = 0;
    for (const tag of tagWords) {
      if (titleWords.has(tag) || Array.from(titleWords).some(word => word.includes(tag))) {
        consistency += 1;
      }
      if (descWords.has(tag) || Array.from(descWords).some(word => word.includes(tag))) {
        consistency += 1;
      }
    }

    const consistencyScore = Math.min((consistency / tags.length) * 40, 40);
    score += consistencyScore;

    // Long-tail keyword potential
    const longTailTags = tags.filter(tag => tag.split(' ').length >= 2);
    if (longTailTags.length >= 2) {
      score += 20;
    }

    // Brand/category keywords
    const categoryKeywords = ['premium', 'professional', 'deluxe', 'standard', 'basic'];
    const hasCategoryKeywords = tags.some(tag => 
      categoryKeywords.some(keyword => tag.toLowerCase().includes(keyword))
    );
    if (hasCategoryKeywords) {
      score += 10;
    }

    return Math.min(score, 100);
  }

  private analyzeImageSEO(images: Array<{ altText: string; isPrimary: boolean }>): number {
    let score = 0;

    if (images.length === 0) {
      return 0; // No images
    }

    // Has images
    score += 20;

    // Has primary image
    const hasPrimary = images.some(img => img.isPrimary);
    if (hasPrimary) {
      score += 20;
    }

    // Alt text coverage
    const imagesWithAlt = images.filter(img => img.altText && img.altText.trim().length > 0);
    const altCoverage = imagesWithAlt.length / images.length;
    score += altCoverage * 30;

    // Alt text quality
    const goodAltTexts = imagesWithAlt.filter(img => 
      img.altText.length >= 10 && img.altText.length <= 100
    );
    if (goodAltTexts.length > 0) {
      score += 20;
    }

    // Multiple images (good for engagement)
    if (images.length >= 3) {
      score += 10;
    }

    return Math.min(score, 100);
  }

  private identifyIssues(
    product: Product,
    titleScore: number,
    descriptionScore: number,
    keywordScore: number,
    imageScore: number
  ): SEOIssue[] {
    const issues: SEOIssue[] = [];

    // Title issues
    if (titleScore < 50) {
      if (product.title.length < 20) {
        issues.push({
          type: 'critical',
          category: 'title',
          message: 'Title is too short',
          impact: 'high',
          fix: 'Expand title to 30-70 characters with relevant keywords',
        });
      }
      if (product.title.length > 80) {
        issues.push({
          type: 'warning',
          category: 'title',
          message: 'Title may be too long',
          impact: 'medium',
          fix: 'Shorten title to under 70 characters while keeping key information',
        });
      }
    }

    // Description issues
    if (descriptionScore < 50) {
      if (product.description.length < 50) {
        issues.push({
          type: 'critical',
          category: 'description',
          message: 'Description is too short',
          impact: 'high',
          fix: 'Write a detailed description of 100-500 characters',
        });
      }
    }

    // Keyword issues
    if (keywordScore < 50) {
      if (product.tags.length < 3) {
        issues.push({
          type: 'critical',
          category: 'keywords',
          message: 'Insufficient tags/keywords',
          impact: 'high',
          fix: 'Add 5-15 relevant tags that describe the product',
        });
      }
    }

    // Image issues
    if (imageScore < 50) {
      if (!product.images || product.images.length === 0) {
        issues.push({
          type: 'critical',
          category: 'images',
          message: 'No product images',
          impact: 'high',
          fix: 'Add at least one high-quality product image',
        });
      } else {
        const imagesWithoutAlt = product.images.filter(img => !img.altText || img.altText.trim() === '');
        if (imagesWithoutAlt.length > 0) {
          issues.push({
            type: 'warning',
            category: 'images',
            message: 'Some images missing alt text',
            impact: 'medium',
            fix: 'Add descriptive alt text to all product images',
          });
        }
      }
    }

    return issues;
  }

  private identifyOpportunities(
    product: Product,
    titleScore: number,
    descriptionScore: number,
    keywordScore: number,
    imageScore: number
  ): SEOOpportunity[] {
    const opportunities: SEOOpportunity[] = [];

    // Title opportunities
    if (titleScore >= 50 && titleScore < 80) {
      opportunities.push({
        category: 'title',
        description: 'Add power words or numbers to improve title appeal',
        potentialImpact: 15,
        effort: 'low',
        priority: 7,
      });
    }

    // Description opportunities
    if (descriptionScore >= 50 && descriptionScore < 80) {
      opportunities.push({
        category: 'description',
        description: 'Add call-to-action and benefit-focused language',
        potentialImpact: 20,
        effort: 'medium',
        priority: 8,
      });
    }

    // Keyword opportunities
    if (keywordScore >= 50 && keywordScore < 80) {
      opportunities.push({
        category: 'keywords',
        description: 'Add long-tail keywords for better targeting',
        potentialImpact: 25,
        effort: 'medium',
        priority: 9,
      });
    }

    // Image opportunities
    if (imageScore >= 50 && imageScore < 80 && product.images && product.images.length > 0) {
      opportunities.push({
        category: 'images',
        description: 'Optimize alt text with product-specific keywords',
        potentialImpact: 10,
        effort: 'low',
        priority: 6,
      });
    }

    return opportunities.sort((a, b) => b.priority - a.priority);
  }

  private generateRecommendations(analyses: ProductSEOAnalysis[]): SEORecommendation[] {
    const recommendations: SEORecommendation[] = [];

    // Find products with low scores
    const lowScoreProducts = analyses.filter(a => a.seoScore < 50);
    if (lowScoreProducts.length > 0) {
      recommendations.push({
        type: 'immediate',
        title: 'Fix Critical SEO Issues',
        description: `${lowScoreProducts.length} products have SEO scores below 50 and need immediate attention`,
        affectedProducts: lowScoreProducts.map(p => p.productId),
        estimatedImpact: 30,
        implementationEffort: 'high',
      });
    }

    // Find products missing images
    const noImageProducts = analyses.filter(a => a.imageScore === 0);
    if (noImageProducts.length > 0) {
      recommendations.push({
        type: 'immediate',
        title: 'Add Product Images',
        description: `${noImageProducts.length} products are missing images, which severely impacts SEO and conversions`,
        affectedProducts: noImageProducts.map(p => p.productId),
        estimatedImpact: 40,
        implementationEffort: 'medium',
      });
    }

    // Find products with optimization potential
    const mediumScoreProducts = analyses.filter(a => a.seoScore >= 50 && a.seoScore < 80);
    if (mediumScoreProducts.length > 0) {
      recommendations.push({
        type: 'short_term',
        title: 'Optimize Medium-Performing Products',
        description: `${mediumScoreProducts.length} products have good SEO foundation but can be improved further`,
        affectedProducts: mediumScoreProducts.map(p => p.productId),
        estimatedImpact: 20,
        implementationEffort: 'medium',
      });
    }

    return recommendations.sort((a, b) => b.estimatedImpact - a.estimatedImpact);
  }

  private calculateBenchmarks(analyses: ProductSEOAnalysis[], products: Product[]): SEOBenchmarks {
    const scores = analyses.map(a => a.seoScore);
    const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;

    // Top and bottom performers
    const sortedAnalyses = [...analyses].sort((a, b) => b.seoScore - a.seoScore);
    const topCount = Math.max(1, Math.floor(analyses.length * 0.2)); // Top 20%
    const bottomCount = Math.max(1, Math.floor(analyses.length * 0.2)); // Bottom 20%

    const topPerformers = sortedAnalyses.slice(0, topCount).map(a => a.productId);
    const bottomPerformers = sortedAnalyses.slice(-bottomCount).map(a => a.productId);

    // Category averages
    const categoryAverages: Record<string, number> = {};
    const categoryGroups: Record<string, number[]> = {};

    for (const product of products) {
      const analysis = analyses.find(a => a.productId === product.id);
      if (analysis) {
        const category = product.category;
        if (!categoryGroups[category]) {
          categoryGroups[category] = [];
        }
        categoryGroups[category].push(analysis.seoScore);
      }
    }

    for (const [category, scores] of Object.entries(categoryGroups)) {
      categoryAverages[category] = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    }

    return {
      averageScore,
      topPerformers,
      bottomPerformers,
      categoryAverages,
      industryBenchmark: 65, // Mock industry benchmark
    };
  }
}