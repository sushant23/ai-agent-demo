// Product Navigation Service - Advanced product resolution and navigation

import { UIControllerImpl } from './ui-controller';
import { ConversationContext } from '../types/context';
import { UIActionResult, ProductResolution, UIPage, UIDrawer, ResolvedProduct } from '../types/ui';
import { Product } from '../types/business';
import { BusinessDataServiceImpl } from '../business/business-data-service';

export interface FuzzyMatchOptions {
  threshold: number;
  maxResults: number;
  includePartialMatches: boolean;
}

export interface ProductNavigationOptions {
  openInNewTab?: boolean;
  highlightRecommendations?: boolean;
  showSEOInsights?: boolean;
  preloadAnalytics?: boolean;
}

export class ProductNavigationService {
  private businessDataService: BusinessDataServiceImpl | undefined;

  constructor(
    private uiController: UIControllerImpl,
    businessDataService?: BusinessDataServiceImpl
  ) {
    this.businessDataService = businessDataService;
  }

  // Enhanced fuzzy product name matching
  async resolveProductByName(
    productName: string,
    options: FuzzyMatchOptions = {
      threshold: 0.3,
      maxResults: 5,
      includePartialMatches: true,
    }
  ): Promise<ProductResolution> {
    try {
      // First try the basic resolver
      const basicResolution = await this.uiController.resolveProductByName(productName);
      
      if (basicResolution.found && basicResolution.confidence > options.threshold) {
        return basicResolution;
      }

      // If basic resolution fails or confidence is low, try advanced matching
      return this.performAdvancedProductMatching(productName, options);
    } catch (error) {
      console.error('Product resolution failed:', error);
      return {
        found: false,
        confidence: 0,
      };
    }
  }

  // Navigate to product page with enhanced context
  async navigateToProduct(
    productIdentifier: string,
    context: ConversationContext,
    options: ProductNavigationOptions = {}
  ): Promise<UIActionResult> {
    try {
      // First resolve the product
      let productResolution: ProductResolution;
      
      // Check if identifier is an ID or name
      if (this.isProductId(productIdentifier)) {
        // Try resolving by ID first, then fall back to name resolution
        productResolution = await this.resolveProductById(productIdentifier);
        if (!productResolution.found) {
          productResolution = await this.resolveProductByName(productIdentifier);
        }
      } else {
        productResolution = await this.resolveProductByName(productIdentifier);
      }

      if (!productResolution.found || !productResolution.product) {
        return this.handleProductNotFound(productIdentifier, context);
      }

      const product = productResolution.product;
      
      // Get full product data for enhanced navigation
      let fullProduct: Product | null = null;
      if (this.businessDataService) {
        try {
          fullProduct = await this.businessDataService.getProduct(product.id);
        } catch (error) {
          console.warn('Failed to fetch full product data:', error);
        }
      }
      
      // Navigate to product page with enhanced parameters
      const result = await this.uiController.navigateToProductPage(product.id, context);
      
      // If navigation successful and options require additional actions
      if (result.success && fullProduct) {
        await this.performPostNavigationActions(fullProduct, context, options);
      }

      // Add resolution metadata
      if (result.success && result.metadata) {
        result.metadata.resolutionConfidence = productResolution.confidence;
        result.metadata.resolutionMethod = this.isProductId(productIdentifier) ? 'id' : 'name';
        result.metadata.hasAlternatives = (productResolution.alternatives?.length || 0) > 0;
      }

      return result;
    } catch (error) {
      console.error('Product navigation failed:', error);
      return {
        success: false,
        actionId: 'nav-error',
        error: {
          code: 'PRODUCT_NAVIGATION_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
          recoverable: true,
          suggestedAction: 'Try searching for the product in the products list',
        },
      };
    }
  }

  // Open SEO optimization drawer with product context
  async openSEOOptimizationDrawer(
    productIdentifier: string,
    context: ConversationContext
  ): Promise<UIActionResult> {
    try {
      // Resolve product first
      const productResolution = await this.resolveProductByName(productIdentifier);
      
      if (!productResolution.found || !productResolution.product) {
        return this.handleProductNotFound(productIdentifier, context);
      }

      const product = productResolution.product;
      
      // Get additional SEO context if business data service is available
      let seoContext: Record<string, unknown> = {
        productId: product.id,
        productTitle: product.title,
        resolutionConfidence: productResolution.confidence,
      };

      if (this.businessDataService) {
        try {
          const fullProduct = await this.businessDataService.getProduct(product.id);
          if (fullProduct) {
            seoContext = {
              ...seoContext,
              currentSEOScore: fullProduct.seoScore,
              tags: fullProduct.tags,
              category: fullProduct.category,
              description: fullProduct.description,
              marketplace: fullProduct.marketplace.name,
              performanceMetrics: {
                impressions: fullProduct.performanceMetrics?.impressions,
                clicks: fullProduct.performanceMetrics?.clicks,
                conversionRate: fullProduct.performanceMetrics?.conversionRate,
              },
            };
          }
        } catch (error) {
          console.warn('Failed to load full product data for SEO context:', error);
        }
      }

      // Add conversation context for better SEO recommendations
      if (context.currentFlow) {
        seoContext.sourceFlow = context.currentFlow;
      }

      if (context.activeRecommendation && context.recommendations) {
        const activeRecs = context.recommendations.get(context.activeRecommendation);
        if (activeRecs) {
          seoContext.relatedRecommendations = activeRecs
            .filter(rec => rec.category === 'seo_optimization')
            .slice(0, 3) // Limit to top 3 related recommendations
            .map(rec => ({
              id: rec.id,
              title: rec.title,
              priority: rec.priority,
            }));
        }
      }

      // Create extended context with SEO data
      const extendedContext = {
        ...context,
        seoData: seoContext,
      };

      const result = await this.uiController.openSEOOptimizationDrawer(product.id, extendedContext);
      
      // Add enhanced metadata
      if (result.success && result.metadata) {
        result.metadata.seoContextEnhanced = true;
        result.metadata.productResolutionMethod = 'name_resolution';
        result.metadata.hasPerformanceData = !!seoContext.performanceMetrics;
      }

      return result;
    } catch (error) {
      console.error('SEO drawer opening failed:', error);
      return {
        success: false,
        actionId: 'seo-error',
        error: {
          code: 'SEO_DRAWER_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
          recoverable: true,
          suggestedAction: 'Navigate to SEO optimizer page instead',
        },
      };
    }
  }

  // Advanced product search with multiple strategies
  async searchProducts(
    query: string,
    searchStrategies: string[] = ['title', 'description', 'tags', 'sku']
  ): Promise<ProductResolution[]> {
    const results: ProductResolution[] = [];
    
    try {
      // Strategy 1: Title matching
      if (searchStrategies.includes('title')) {
        const titleResults = await this.searchByTitle(query);
        results.push(...titleResults);
      }

      // Strategy 2: Description matching
      if (searchStrategies.includes('description')) {
        const descriptionResults = await this.searchByDescription(query);
        results.push(...descriptionResults);
      }

      // Strategy 3: Tag matching
      if (searchStrategies.includes('tags')) {
        const tagResults = await this.searchByTags(query);
        results.push(...tagResults);
      }

      // Strategy 4: SKU matching
      if (searchStrategies.includes('sku')) {
        const skuResults = await this.searchBySKU(query);
        results.push(...skuResults);
      }

      // Deduplicate and sort by confidence
      return this.deduplicateAndSort(results);
    } catch (error) {
      console.error('Product search failed:', error);
      return [];
    }
  }

  // Helper method to resolve product by ID
  private async resolveProductById(productId: string): Promise<ProductResolution> {
    try {
      if (this.businessDataService) {
        const product = await this.businessDataService.getProduct(productId);
        if (product) {
          return {
            found: true,
            product: {
              id: product.id,
              title: product.title,
              matchScore: 1.0,
              marketplace: product.marketplace.name,
            },
            confidence: 1.0,
          };
        }
      }
      
      // Fallback to UI controller's resolver
      return this.uiController.resolveProductByName(productId);
    } catch (error) {
      console.error('Product resolution by ID failed:', error);
      return {
        found: false,
        confidence: 0,
      };
    }
  }

  // Handle product not found scenarios
  private async handleProductNotFound(
    productIdentifier: string,
    context: ConversationContext
  ): Promise<UIActionResult> {
    // Try to find similar products
    const similarProducts = await this.searchProducts(productIdentifier);
    
    if (similarProducts.length > 0) {
      // Navigate to products page with search results
      return this.uiController.navigateToPage(UIPage.PRODUCTS, {
        searchQuery: productIdentifier,
        suggestedProducts: similarProducts.slice(0, 3),
        error: 'Exact product not found, showing similar products',
      });
    }

    // No similar products found, navigate to products page with search
    return this.uiController.navigateToPage(UIPage.PRODUCTS, {
      searchQuery: productIdentifier,
      error: 'Product not found',
      suggestedAction: 'Try a different search term or browse all products',
    });
  }

  // Advanced product matching with multiple algorithms
  private async performAdvancedProductMatching(
    productName: string,
    options: FuzzyMatchOptions
  ): Promise<ProductResolution> {
    if (!this.businessDataService) {
      return { found: false, confidence: 0 };
    }

    try {
      const allProducts = await this.businessDataService.getProducts();
      const normalizedQuery = this.normalizeSearchTerm(productName);
      
      const matches = allProducts
        .map(product => ({
          product,
          score: this.calculateAdvancedMatchScore(normalizedQuery, product),
        }))
        .filter(match => match.score >= options.threshold)
        .sort((a, b) => b.score - a.score)
        .slice(0, options.maxResults);

      if (matches.length === 0) {
        return { found: false, confidence: 0 };
      }

      const bestMatch = matches[0];
      if (!bestMatch) {
        return { found: false, confidence: 0 };
      }

      return {
        found: true,
        product: {
          id: bestMatch.product.id,
          title: bestMatch.product.title,
          matchScore: bestMatch.score,
          marketplace: bestMatch.product.marketplace.name,
        },
        alternatives: matches.slice(1).map(match => ({
          id: match.product.id,
          title: match.product.title,
          matchScore: match.score,
          marketplace: match.product.marketplace.name,
        })),
        confidence: bestMatch.score,
      };
    } catch (error) {
      console.error('Advanced product matching failed:', error);
      return { found: false, confidence: 0 };
    }
  }

  // Calculate advanced match score using multiple factors
  private calculateAdvancedMatchScore(query: string, product: Product): number {
    let score = 0;
    const weights = {
      exactTitle: 1.0,
      titleContains: 0.8,
      titleWords: 0.6,
      descriptionContains: 0.4,
      tagMatch: 0.7,
      skuMatch: 0.9,
    };

    const normalizedTitle = this.normalizeSearchTerm(product.title);
    const normalizedDescription = this.normalizeSearchTerm(product.description || '');
    
    // Exact title match
    if (normalizedTitle === query) {
      score += weights.exactTitle;
    }
    // Title contains query
    else if (normalizedTitle.includes(query)) {
      score += weights.titleContains;
    }
    // Word-by-word title matching
    else {
      const queryWords = query.split(' ');
      const titleWords = normalizedTitle.split(' ');
      const matchingWords = queryWords.filter(qw => 
        titleWords.some(tw => tw.includes(qw) || qw.includes(tw))
      );
      score += (matchingWords.length / queryWords.length) * weights.titleWords;
    }

    // Description matching
    if (normalizedDescription.includes(query)) {
      score += weights.descriptionContains;
    }

    // Tag matching
    if (product.tags) {
      const normalizedTags = product.tags.map(tag => this.normalizeSearchTerm(tag));
      const tagMatches = normalizedTags.filter(tag => 
        tag.includes(query) || query.includes(tag)
      );
      score += (tagMatches.length / product.tags.length) * weights.tagMatch;
    }

    // SKU matching (if available)
    const sku = (product as any).sku;
    if (sku && this.normalizeSearchTerm(sku).includes(query)) {
      score += weights.skuMatch;
    }

    return Math.min(score, 1.0); // Cap at 1.0
  }

  // Normalize search terms for better matching
  private normalizeSearchTerm(term: string): string {
    return term
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' '); // Normalize whitespace
  }

  // Check if identifier looks like a product ID
  private isProductId(identifier: string): boolean {
    // Simple heuristic: IDs are typically shorter and contain numbers/special chars
    return identifier.length < 20 && /[0-9\-_]/.test(identifier);
  }

  // Build navigation parameters with context
  private buildNavigationParameters(
    product: Product | ResolvedProduct,
    context: ConversationContext,
    options: ProductNavigationOptions
  ): Record<string, unknown> {
    const params: Record<string, unknown> = {
      productId: product.id,
    };

    if (context.activeRecommendation) {
      params.recommendationId = context.activeRecommendation;
    }

    if (context.currentFlow) {
      params.sourceFlow = context.currentFlow;
    }

    if (options.highlightRecommendations && context.recommendations) {
      params.highlightRecommendations = true;
    }

    if (options.showSEOInsights) {
      params.showSEOInsights = true;
    }

    if (options.preloadAnalytics) {
      params.preloadAnalytics = true;
    }

    return params;
  }

  // Perform actions after successful navigation
  private async performPostNavigationActions(
    product: Product,
    context: ConversationContext,
    options: ProductNavigationOptions
  ): Promise<void> {
    try {
      // Open SEO drawer if requested
      if (options.showSEOInsights) {
        await this.uiController.openSEOOptimizationDrawer(product.id, context);
      }

      // Preload analytics panel if requested
      if (options.preloadAnalytics && this.businessDataService) {
        // const analytics = await this.businessDataService.getProductAnalytics(product.id);
        // Could open analytics panel or prefill data
      }
    } catch (error) {
      console.warn('Post-navigation actions failed:', error);
    }
  }

  // Search strategies implementation
  private async searchByTitle(query: string): Promise<ProductResolution[]> {
    // Implementation would use business data service
    return [];
  }

  private async searchByDescription(query: string): Promise<ProductResolution[]> {
    // Implementation would use business data service
    return [];
  }

  private async searchByTags(query: string): Promise<ProductResolution[]> {
    // Implementation would use business data service
    return [];
  }

  private async searchBySKU(query: string): Promise<ProductResolution[]> {
    // Implementation would use business data service
    return [];
  }

  // Deduplicate and sort results
  private deduplicateAndSort(results: ProductResolution[]): ProductResolution[] {
    const seen = new Set<string>();
    const deduplicated = results.filter((result: ProductResolution) => {
      if (result.product && !seen.has(result.product.id)) {
        seen.add(result.product.id);
        return true;
      }
      return false;
    });

    return deduplicated.sort((a: ProductResolution, b: ProductResolution) => 
      (b.confidence || 0) - (a.confidence || 0)
    );
  }
}