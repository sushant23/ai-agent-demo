// UI Controller implementation

import {
  UIController,
  UIActionResult,
  ProductResolution,
  UIPage,
  UIDrawer,
  UIPanel,
  FormData,
  UIError,
  ResolvedProduct,
  FormFieldType,
} from '../types/ui';
import {
  IUIController,
  UIControllerConfig,
  UIControllerMetrics,
  IUINavigator,
  IUIDrawerManager,
  IUIPanelManager,
  IFormManager,
  IProductResolver,
  FormValidationResult,
  PanelSize,
} from '../interfaces/ui-controller';
import { ConversationContext } from '../types/context';
import { Product } from '../types/business';
import { IdGenerator } from '../utils/id-generator';
import { BusinessDataServiceImpl } from '../business/business-data-service';

export class UIControllerImpl implements IUIController {
  private config?: UIControllerConfig;
  private navigator: UINavigator;
  private drawerManager: UIDrawerManager;
  private panelManager: UIPanelManager;
  private formManager: UIFormManager;
  private productResolver: ProductResolver;
  private metrics: UIControllerMetrics;
  private initialized: boolean = false;
  private businessDataService: BusinessDataServiceImpl | undefined;

  constructor(businessDataService?: BusinessDataServiceImpl) {
    this.businessDataService = businessDataService;
    this.navigator = new UINavigator();
    this.drawerManager = new UIDrawerManager();
    this.panelManager = new UIPanelManager();
    this.formManager = new UIFormManager();
    this.productResolver = new ProductResolver(businessDataService);
    this.metrics = {
      totalActions: 0,
      successRate: 0,
      averageResponseTime: 0,
      actionsByType: {},
      errorsByType: {},
    };
  }

  async initialize(config: UIControllerConfig): Promise<void> {
    this.config = config;
    this.initialized = true;
  }

  async shutdown(): Promise<void> {
    this.initialized = false;
  }

  async getControllerMetrics(): Promise<UIControllerMetrics> {
    return { ...this.metrics };
  }

  // Core UIController interface methods
  async navigateToPage(page: string, parameters?: Record<string, unknown>): Promise<UIActionResult> {
    return this.executeAction('navigate', async () => {
      return this.navigator.navigate(page, parameters);
    });
  }

  async openDrawer(drawerId: string, context?: Record<string, unknown>): Promise<UIActionResult> {
    return this.executeAction('openDrawer', async () => {
      return this.drawerManager.openDrawer(drawerId, context);
    });
  }

  async openPanel(panelId: string, context?: Record<string, unknown>): Promise<UIActionResult> {
    return this.executeAction('openPanel', async () => {
      return this.panelManager.openPanel(panelId, context);
    });
  }

  async prefillForm(formId: string, data: Record<string, unknown>): Promise<UIActionResult> {
    return this.executeAction('prefillForm', async () => {
      return this.formManager.prefillForm(formId, data);
    });
  }

  async resolveProductByName(productName: string): Promise<ProductResolution> {
    return this.productResolver.resolveByName(productName);
  }

  // Context-aware navigation methods
  async navigateToProductPage(productId: string, context?: ConversationContext): Promise<UIActionResult> {
    try {
      // Enhanced parameter building with better context handling
      const parameters: Record<string, unknown> = { productId };
      
      if (context?.activeRecommendation) {
        parameters.recommendationId = context.activeRecommendation;
      }
      
      if (context?.currentFlow) {
        parameters.sourceFlow = context.currentFlow;
      }

      // Add business context if available
      if (context?.businessData) {
        parameters.businessContext = {
          totalProducts: context.businessData.totalProducts,
          hasAnalytics: context.businessData.recentMetrics !== undefined,
        };
      }

      // Add user preferences for better UX
      if (context?.userPreferences) {
        parameters.userPreferences = {
          theme: context.userPreferences.displaySettings?.theme,
          showAdvancedMetrics: context.userPreferences.displaySettings?.showAdvancedMetrics,
        };
      }

      const result = await this.navigateToPage(UIPage.PRODUCT_DETAIL, parameters);
      
      // Ensure productId is in metadata for testing and tracking
      if (result.success && result.metadata) {
        result.metadata.productId = productId;
        result.metadata.navigationSource = 'product_resolution';
      }
      
      return result;
    } catch (error) {
      return {
        success: false,
        actionId: IdGenerator.generate(),
        error: {
          code: 'PRODUCT_NAVIGATION_FAILED',
          message: error instanceof Error ? error.message : 'Failed to navigate to product page',
          recoverable: true,
          suggestedAction: 'Try navigating to the products list and search for the product',
        },
      };
    }
  }

  async openSEOOptimizationDrawer(productId: string, context?: ConversationContext): Promise<UIActionResult> {
    try {
      // Enhanced context building for SEO drawer
      const drawerContext: Record<string, unknown> = { productId };
      
      if (context?.businessData) {
        drawerContext.businessData = context.businessData;
        
        // Add specific product data if available
        const targetProduct = context.businessData.topPerformingProducts?.find(p => p.id === productId);
        if (targetProduct) {
          drawerContext.productData = {
            title: targetProduct.title,
            description: targetProduct.description,
            currentSEOScore: targetProduct.seoScore,
            tags: targetProduct.tags,
            category: targetProduct.category,
            marketplace: targetProduct.marketplace.name,
          };
        }
      }

      // Add current flow context for better recommendations
      if (context?.currentFlow) {
        drawerContext.sourceFlow = context.currentFlow;
      }

      // Add user preferences for personalized SEO suggestions
      if (context?.userPreferences) {
        drawerContext.userPreferences = {
          language: context.userPreferences.language,
          showAdvancedMetrics: context.userPreferences.displaySettings?.showAdvancedMetrics,
        };
      }

      // Add active recommendations context
      if (context?.activeRecommendation && context.recommendations) {
        const activeRecs = context.recommendations.get(context.activeRecommendation);
        if (activeRecs) {
          drawerContext.relatedRecommendations = activeRecs
            .filter(rec => rec.category === 'seo_optimization')
            .map(rec => ({
              id: rec.id,
              title: rec.title,
              priority: rec.priority,
            }));
        }
      }

      const result = await this.openDrawer(UIDrawer.SEO_OPTIMIZATION, drawerContext);
      
      // Add enhanced metadata for tracking and testing
      if (result.success && result.metadata) {
        result.metadata.productId = productId;
        result.metadata.drawerType = 'seo_optimization';
        result.metadata.contextEnhanced = true;
      }

      return result;
    } catch (error) {
      return {
        success: false,
        actionId: IdGenerator.generate(),
        error: {
          code: 'SEO_DRAWER_FAILED',
          message: error instanceof Error ? error.message : 'Failed to open SEO optimization drawer',
          recoverable: true,
          suggestedAction: 'Try navigating to the SEO optimizer page directly',
        },
      };
    }
  }

  async prefillProductForm(productData: Partial<Product>, context?: ConversationContext): Promise<UIActionResult> {
    const formData: Record<string, unknown> = {
      title: productData.title,
      description: productData.description,
      price: productData.price,
      tags: productData.tags,
    };

    // Note: BusinessDataSnapshot doesn't have connectedMarketplaces
    // We would need to get this from a business profile or extend the context
    if (context?.businessData?.marketplaceStatus && context.businessData.marketplaceStatus.length > 0) {
      formData.marketplace = context.businessData.marketplaceStatus[0]?.marketplace?.name || 'unknown';
    }

    return this.prefillForm('product-editor', formData);
  }

  // Helper method to execute actions with metrics tracking
  private async executeAction(
    actionType: string,
    action: () => Promise<UIActionResult>
  ): Promise<UIActionResult> {
    const startTime = Date.now();
    
    try {
      const result = await action();
      
      // Update metrics
      this.updateMetrics(actionType, true, Date.now() - startTime);
      
      return result;
    } catch (error) {
      // Update metrics for error
      this.updateMetrics(actionType, false, Date.now() - startTime);
      
      return {
        success: false,
        actionId: IdGenerator.generate(),
        error: {
          code: 'UI_ACTION_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
          recoverable: true,
          suggestedAction: `Retry ${actionType} action`,
        },
      };
    }
  }

  private updateMetrics(actionType: string, success: boolean, responseTime: number): void {
    this.metrics.totalActions++;
    
    // Update action counts
    this.metrics.actionsByType[actionType] = (this.metrics.actionsByType[actionType] || 0) + 1;
    
    // Update error counts
    if (!success) {
      this.metrics.errorsByType[actionType] = (this.metrics.errorsByType[actionType] || 0) + 1;
    }
    
    // Update success rate
    const totalSuccesses = this.metrics.totalActions - Object.values(this.metrics.errorsByType).reduce((sum, count) => sum + count, 0);
    this.metrics.successRate = totalSuccesses / this.metrics.totalActions;
    
    // Update average response time
    this.metrics.averageResponseTime = (this.metrics.averageResponseTime * (this.metrics.totalActions - 1) + responseTime) / this.metrics.totalActions;
  }
}

// Navigator implementation
class UINavigator implements IUINavigator {
  private currentPage: string = UIPage.DASHBOARD;
  private navigationHistory: string[] = [];

  async navigate(page: string, parameters?: Record<string, unknown>): Promise<UIActionResult> {
    try {
      // Validate page exists
      if (!Object.values(UIPage).includes(page as UIPage)) {
        throw new Error(`Invalid page: ${page}`);
      }

      // Store current page in history
      this.navigationHistory.push(this.currentPage);
      this.currentPage = page;

      // Simulate navigation with parameters
      console.log(`Navigating to ${page}`, parameters);

      return {
        success: true,
        actionId: IdGenerator.generate(),
        metadata: {
          page,
          parameters,
          previousPage: this.navigationHistory[this.navigationHistory.length - 1],
        },
      };
    } catch (error) {
      throw new Error(`Navigation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async goBack(): Promise<UIActionResult> {
    if (this.navigationHistory.length === 0) {
      throw new Error('No previous page in history');
    }

    const previousPage = this.navigationHistory.pop()!;
    return this.navigate(previousPage);
  }

  async goForward(): Promise<UIActionResult> {
    // For simplicity, forward navigation is not implemented
    throw new Error('Forward navigation not supported');
  }

  async refresh(): Promise<UIActionResult> {
    return this.navigate(this.currentPage);
  }

  async getCurrentPage(): Promise<string> {
    return this.currentPage;
  }
}

// Drawer Manager implementation
class UIDrawerManager implements IUIDrawerManager {
  private openDrawers: Set<string> = new Set();

  async openDrawer(drawerId: string, context?: Record<string, unknown>): Promise<UIActionResult> {
    try {
      // Validate drawer exists
      if (!Object.values(UIDrawer).includes(drawerId as UIDrawer)) {
        throw new Error(`Invalid drawer: ${drawerId}`);
      }

      this.openDrawers.add(drawerId);
      
      console.log(`Opening drawer ${drawerId}`, context);

      return {
        success: true,
        actionId: IdGenerator.generate(),
        metadata: {
          drawerId,
          context,
          openDrawers: Array.from(this.openDrawers),
        },
      };
    } catch (error) {
      throw new Error(`Failed to open drawer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async closeDrawer(drawerId: string): Promise<UIActionResult> {
    this.openDrawers.delete(drawerId);
    
    return {
      success: true,
      actionId: IdGenerator.generate(),
      metadata: {
        drawerId,
        openDrawers: Array.from(this.openDrawers),
      },
    };
  }

  async toggleDrawer(drawerId: string): Promise<UIActionResult> {
    if (this.openDrawers.has(drawerId)) {
      return this.closeDrawer(drawerId);
    } else {
      return this.openDrawer(drawerId);
    }
  }

  async getOpenDrawers(): Promise<string[]> {
    return Array.from(this.openDrawers);
  }
}

// Panel Manager implementation
class UIPanelManager implements IUIPanelManager {
  private openPanels: Map<string, PanelSize> = new Map();

  async openPanel(panelId: string, context?: Record<string, unknown>): Promise<UIActionResult> {
    try {
      // Validate panel exists
      if (!Object.values(UIPanel).includes(panelId as UIPanel)) {
        throw new Error(`Invalid panel: ${panelId}`);
      }

      const defaultSize: PanelSize = {
        width: 400,
        height: 300,
        position: 'right',
      };

      this.openPanels.set(panelId, defaultSize);
      
      console.log(`Opening panel ${panelId}`, context);

      return {
        success: true,
        actionId: IdGenerator.generate(),
        metadata: {
          panelId,
          context,
          size: defaultSize,
          openPanels: Array.from(this.openPanels.keys()),
        },
      };
    } catch (error) {
      throw new Error(`Failed to open panel: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async closePanel(panelId: string): Promise<UIActionResult> {
    this.openPanels.delete(panelId);
    
    return {
      success: true,
      actionId: IdGenerator.generate(),
      metadata: {
        panelId,
        openPanels: Array.from(this.openPanels.keys()),
      },
    };
  }

  async resizePanel(panelId: string, size: PanelSize): Promise<UIActionResult> {
    if (!this.openPanels.has(panelId)) {
      throw new Error(`Panel ${panelId} is not open`);
    }

    this.openPanels.set(panelId, size);
    
    return {
      success: true,
      actionId: IdGenerator.generate(),
      metadata: {
        panelId,
        size,
      },
    };
  }

  async getOpenPanels(): Promise<string[]> {
    return Array.from(this.openPanels.keys());
  }
}

// Form Manager implementation
class UIFormManager implements IFormManager {
  private formData: Map<string, FormData> = new Map();

  async prefillForm(formId: string, data: Record<string, unknown>): Promise<UIActionResult> {
    try {
      const formData: FormData = {
        formId,
        fields: Object.entries(data).map(([name, value]) => ({
          name,
          value,
          type: this.inferFieldType(value),
        })),
      };

      this.formData.set(formId, formData);
      
      console.log(`Prefilling form ${formId}`, data);

      return {
        success: true,
        actionId: IdGenerator.generate(),
        metadata: {
          formId,
          fieldCount: formData.fields.length,
        },
      };
    } catch (error) {
      throw new Error(`Failed to prefill form: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async submitForm(formId: string): Promise<UIActionResult> {
    const form = this.formData.get(formId);
    if (!form) {
      throw new Error(`Form ${formId} not found`);
    }

    // Simulate form submission
    console.log(`Submitting form ${formId}`, form);

    return {
      success: true,
      actionId: IdGenerator.generate(),
      metadata: {
        formId,
        submittedData: form,
      },
    };
  }

  async validateForm(formId: string): Promise<FormValidationResult> {
    const form = this.formData.get(formId);
    if (!form) {
      throw new Error(`Form ${formId} not found`);
    }

    // Simple validation logic
    const errors = form.fields
      .filter(field => field.validation?.required && !field.value)
      .map(field => ({
        fieldName: field.name,
        message: `${field.name} is required`,
        code: 'REQUIRED_FIELD',
      }));

    return {
      isValid: errors.length === 0,
      errors,
      warnings: [],
    };
  }

  async clearForm(formId: string): Promise<UIActionResult> {
    this.formData.delete(formId);
    
    return {
      success: true,
      actionId: IdGenerator.generate(),
      metadata: { formId },
    };
  }

  async getFormData(formId: string): Promise<FormData> {
    const form = this.formData.get(formId);
    if (!form) {
      throw new Error(`Form ${formId} not found`);
    }
    return form;
  }

  private inferFieldType(value: unknown): FormFieldType {
    if (typeof value === 'string') {
      if (value.includes('@')) return FormFieldType.EMAIL;
      if (value.startsWith('http')) return FormFieldType.URL;
      return FormFieldType.TEXT;
    }
    if (typeof value === 'number') return FormFieldType.NUMBER;
    if (typeof value === 'boolean') return FormFieldType.CHECKBOX;
    if (Array.isArray(value)) return FormFieldType.MULTISELECT;
    return FormFieldType.TEXT;
  }
}

// Product Resolver implementation
class ProductResolver implements IProductResolver {
  private products: Product[] = []; // This would be injected from business data service
  private businessDataService: BusinessDataServiceImpl | undefined;

  constructor(businessDataService?: BusinessDataServiceImpl) {
    this.businessDataService = businessDataService;
  }

  async resolveByName(productName: string): Promise<ProductResolution> {
    try {
      // Refresh products from business data service if available
      await this.refreshProductsFromService();

      const normalizedName = this.normalizeSearchTerm(productName);
      
      // Find exact matches first
      const exactMatches = this.products.filter(product => 
        this.normalizeSearchTerm(product.title) === normalizedName
      );

      if (exactMatches.length > 0) {
        const exactMatch = exactMatches[0];
        if (exactMatch) {
          return {
            found: true,
            product: this.toResolvedProduct(exactMatch, 1.0),
            confidence: 1.0,
          };
        }
      }

      // Find fuzzy matches with enhanced algorithm
      const fuzzyMatches = this.products
        .map(product => ({
          product,
          score: this.calculateAdvancedMatchScore(normalizedName, product),
        }))
        .filter(match => match.score > 0.3) // Maintain original threshold for compatibility
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      if (fuzzyMatches.length > 0) {
        const bestMatch = fuzzyMatches[0];
        if (bestMatch) {
          return {
            found: true,
            product: this.toResolvedProduct(bestMatch.product, bestMatch.score),
            alternatives: fuzzyMatches.slice(1).map(match => 
              this.toResolvedProduct(match.product, match.score)
            ),
            confidence: bestMatch.score,
          };
        }
      }

      return {
        found: false,
        confidence: 0,
      };
    } catch (error) {
      console.error('Product resolution failed:', error);
      return {
        found: false,
        confidence: 0,
      };
    }
  }

  async resolveById(productId: string): Promise<ProductResolution> {
    try {
      // Try business data service first for fresh data
      if (this.businessDataService) {
        const product = await this.businessDataService.getProduct(productId);
        if (product) {
          return {
            found: true,
            product: this.toResolvedProduct(product, 1.0),
            confidence: 1.0,
          };
        }
      }

      // Fallback to cached products
      const product = this.products.find(p => p.id === productId);
      
      if (product) {
        return {
          found: true,
          product: this.toResolvedProduct(product, 1.0),
          confidence: 1.0,
        };
      }

      return {
        found: false,
        confidence: 0,
      };
    } catch (error) {
      console.error('Product resolution by ID failed:', error);
      return {
        found: false,
        confidence: 0,
      };
    }
  }

  async resolveBySKU(sku: string): Promise<ProductResolution> {
    try {
      await this.refreshProductsFromService();

      // Assuming products have SKU field (would need to be added to Product type)
      const product = this.products.find(p => (p as any).sku === sku);
      
      if (product) {
        return {
          found: true,
          product: this.toResolvedProduct(product, 1.0),
          confidence: 1.0,
        };
      }

      return {
        found: false,
        confidence: 0,
      };
    } catch (error) {
      console.error('Product resolution by SKU failed:', error);
      return {
        found: false,
        confidence: 0,
      };
    }
  }

  async searchProducts(query: string, limit: number = 10): Promise<ProductResolution[]> {
    try {
      await this.refreshProductsFromService();

      const normalizedQuery = this.normalizeSearchTerm(query);
      
      const matches = this.products
        .map(product => ({
          product,
          score: this.calculateAdvancedMatchScore(normalizedQuery, product),
        }))
        .filter(match => match.score > 0.1)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      return matches.map(match => ({
        found: true,
        product: this.toResolvedProduct(match.product, match.score),
        confidence: match.score,
      }));
    } catch (error) {
      console.error('Product search failed:', error);
      return [];
    }
  }

  private async refreshProductsFromService(): Promise<void> {
    if (this.businessDataService) {
      try {
        const freshProducts = await this.businessDataService.getProducts();
        this.products = freshProducts;
      } catch (error) {
        console.warn('Failed to refresh products from business data service:', error);
        // Continue with cached products
      }
    }
  }

  private calculateAdvancedMatchScore(query: string, product: Product): number {
    let score = 0;
    const weights = {
      exactTitle: 1.0,
      titleContains: 0.8,
      titleWords: 0.6,
      descriptionContains: 0.4,
      tagMatch: 0.7,
      skuMatch: 0.9,
      categoryMatch: 0.5,
    };

    const normalizedTitle = this.normalizeSearchTerm(product.title);
    const normalizedDescription = this.normalizeSearchTerm(product.description || '');
    const normalizedCategory = this.normalizeSearchTerm(product.category || '');
    
    // Exact title match
    if (normalizedTitle === query) {
      score += weights.exactTitle;
    }
    // Title contains query
    else if (normalizedTitle.includes(query)) {
      score += weights.titleContains;
    }
    // Word-by-word title matching (more strict)
    else {
      const queryWords = query.split(' ').filter(w => w.length > 2); // Ignore short words
      const titleWords = normalizedTitle.split(' ').filter(w => w.length > 2);
      
      if (queryWords.length > 0) {
        const matchingWords = queryWords.filter(qw => 
          titleWords.some(tw => tw === qw || (tw.length > 3 && qw.length > 3 && (tw.includes(qw) || qw.includes(tw))))
        );
        
        // Require at least 75% of significant words to match for better precision
        const matchRatio = matchingWords.length / queryWords.length;
        if (matchRatio >= 0.75) {
          score += matchRatio * weights.titleWords;
        }
      }
    }

    // Description matching (only for longer queries to avoid false positives)
    if (query.length > 5 && normalizedDescription.includes(query)) {
      score += weights.descriptionContains;
    }

    // Category matching
    if (normalizedCategory.includes(query) || query.includes(normalizedCategory)) {
      score += weights.categoryMatch;
    }

    // Tag matching (more strict - require exact tag match or very close match)
    if (product.tags && product.tags.length > 0) {
      const normalizedTags = product.tags.map(tag => this.normalizeSearchTerm(tag));
      const exactTagMatches = normalizedTags.filter(tag => tag === query);
      const partialTagMatches = normalizedTags.filter(tag => 
        tag.length > 3 && query.length > 3 && (tag.includes(query) || query.includes(tag))
      );
      
      if (exactTagMatches.length > 0) {
        score += weights.tagMatch;
      } else if (partialTagMatches.length > 0) {
        score += (partialTagMatches.length / product.tags.length) * weights.tagMatch * 0.5; // Reduced weight for partial matches
      }
    }

    // SKU matching (if available)
    const sku = (product as any).sku;
    if (sku && this.normalizeSearchTerm(sku).includes(query)) {
      score += weights.skuMatch;
    }

    return Math.min(score, 1.0); // Cap at 1.0
  }

  private toResolvedProduct(product: Product, matchScore: number): ResolvedProduct {
    return {
      id: product.id,
      title: product.title,
      matchScore,
      marketplace: product.marketplace.name,
    };
  }

  private normalizeSearchTerm(term: string): string {
    return term
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' '); // Normalize whitespace
  }

  // Method to inject products (would be called during initialization)
  setProducts(products: Product[]): void {
    this.products = products;
  }
}