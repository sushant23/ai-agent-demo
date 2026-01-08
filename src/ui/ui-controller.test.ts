// UI Controller Tests

import { UIControllerImpl } from './ui-controller';
import { UINavigationService } from './navigation-service';
import { ProductNavigationService } from './product-navigation-service';
import { BusinessDataServiceImpl } from '../business/business-data-service';
import { ConversationContext } from '../types/context';
import { UIPage, UIDrawer, UIPanel } from '../types/ui';
import { MarketplaceType } from '../types/business';

describe('UIController', () => {
  let uiController: UIControllerImpl;
  let businessDataService: BusinessDataServiceImpl;
  let context: ConversationContext;

  beforeEach(async () => {
    businessDataService = new BusinessDataServiceImpl();
    uiController = new UIControllerImpl(businessDataService);
    
    await uiController.initialize({
      baseUrl: 'https://test.example.com',
      timeout: 5000,
      retryAttempts: 3,
      enableAnalytics: true,
    });

    context = {
      userId: 'test-user',
      sessionId: 'test-session',
      activeProduct: 'test-product',
      currentFlow: 'test-flow',
      businessData: {
        totalProducts: 10,
        totalRevenue: { amount: 1000, currency: 'USD' },
        topPerformingProducts: [
          {
            id: 'test-product',
            title: 'Test Product',
            description: 'A test product',
            price: { amount: 99.99, currency: 'USD' },
            cost: { amount: 50.00, currency: 'USD' },
            seoScore: 80,
            tags: ['test', 'product'],
            marketplace: {
              id: 'test-marketplace',
              name: 'Test Marketplace',
              type: MarketplaceType.SHOPIFY,
              apiCredentials: { apiKey: 'test' },
              isActive: true,
            },
            performanceMetrics: {
              revenue: { amount: 500, currency: 'USD' },
              salesCount: 5,
              conversionRate: 0.1,
              impressions: 1000,
              clicks: 100,
              profitMargin: 0.5,
              period: {
                start: new Date('2024-01-01'),
                end: new Date('2024-01-31'),
              },
              trends: [],
            },
            images: [],
            category: 'Test',
            sku: 'TEST-001',
            inventory: {
              quantity: 100,
              reserved: 0,
              available: 100,
              lowStockThreshold: 10,
            },
          },
        ],
        recentMetrics: {
          revenue: { amount: 500, currency: 'USD' },
          salesCount: 5,
          conversionRate: 0.1,
          impressions: 1000,
          clicks: 100,
          profitMargin: 0.5,
          period: {
            start: new Date('2024-01-01'),
            end: new Date('2024-01-31'),
          },
          trends: [],
        },
        marketplaceStatus: [],
        lastUpdated: new Date(),
      },
      recommendations: new Map(),
      conversationHistory: [],
      userPreferences: {
        language: 'en',
        timezone: 'UTC',
        currency: 'USD',
        notificationSettings: {
          emailEnabled: true,
          pushEnabled: false,
          smsEnabled: false,
          frequency: 'daily',
        },
        displaySettings: {
          theme: 'light',
          compactMode: false,
          showAdvancedMetrics: false,
        },
      },
      lastUpdated: new Date(),
    };

    // Set up test products in the business data service
    const testProducts = [
      {
        id: 'test-product',
        title: 'Test Product',
        description: 'A test product',
        price: { amount: 99.99, currency: 'USD' },
        cost: { amount: 50.00, currency: 'USD' },
        seoScore: 80,
        tags: ['test', 'product'],
        marketplace: {
          id: 'test-marketplace',
          name: 'Test Marketplace',
          type: MarketplaceType.SHOPIFY,
          apiCredentials: { apiKey: 'test' },
          isActive: true,
        },
        performanceMetrics: {
          revenue: { amount: 500, currency: 'USD' },
          salesCount: 5,
          conversionRate: 0.1,
          impressions: 1000,
          clicks: 100,
          profitMargin: 0.5,
          period: {
            start: new Date('2024-01-01'),
            end: new Date('2024-01-31'),
          },
          trends: [],
        },
        images: [],
        category: 'Test',
        sku: 'TEST-001',
        inventory: {
          quantity: 100,
          reserved: 0,
          available: 100,
          lowStockThreshold: 10,
        },
      },
    ];

    // Mock the business data service to return test products
    jest.spyOn(businessDataService, 'getProducts').mockResolvedValue(testProducts);
  });

  afterEach(async () => {
    await uiController.shutdown();
  });

  describe('Page Navigation', () => {
    it('should navigate to pages successfully', async () => {
      const result = await uiController.navigateToPage(UIPage.PRODUCTS, {
        category: 'electronics',
      });

      expect(result.success).toBe(true);
      expect(result.actionId).toBeDefined();
      expect(result.metadata?.page).toBe(UIPage.PRODUCTS);
      expect(result.metadata?.parameters).toEqual({ category: 'electronics' });
    });

    it('should handle invalid page navigation', async () => {
      const result = await uiController.navigateToPage('invalid-page');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('UI_ACTION_FAILED');
    });

    it('should navigate to product page with context', async () => {
      const result = await uiController.navigateToProductPage('test-product', context);

      expect(result.success).toBe(true);
      expect(result.metadata?.productId).toBe('test-product');
      expect(result.metadata?.recommendationId).toBeUndefined();
    });
  });

  describe('Drawer Management', () => {
    it('should open drawers successfully', async () => {
      const result = await uiController.openDrawer(UIDrawer.SEO_OPTIMIZATION, {
        productId: 'test-product',
      });

      expect(result.success).toBe(true);
      expect(result.metadata?.drawerId).toBe(UIDrawer.SEO_OPTIMIZATION);
      expect(result.metadata?.context).toEqual({ productId: 'test-product' });
    });

    it('should handle invalid drawer opening', async () => {
      const result = await uiController.openDrawer('invalid-drawer');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should open SEO optimization drawer with context', async () => {
      const result = await uiController.openSEOOptimizationDrawer('test-product', context);

      expect(result.success).toBe(true);
      expect(result.metadata?.drawerId).toBe(UIDrawer.SEO_OPTIMIZATION);
    });
  });

  describe('Panel Management', () => {
    it('should open panels successfully', async () => {
      const result = await uiController.openPanel(UIPanel.RECOMMENDATION_DETAIL, {
        recommendationId: 'test-rec',
      });

      expect(result.success).toBe(true);
      expect(result.metadata?.panelId).toBe(UIPanel.RECOMMENDATION_DETAIL);
    });

    it('should handle invalid panel opening', async () => {
      const result = await uiController.openPanel('invalid-panel');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Form Pre-population', () => {
    it('should prefill forms successfully', async () => {
      const formData = {
        title: 'Test Product',
        price: 99.99,
        category: 'electronics',
      };

      const result = await uiController.prefillForm('product-editor', formData);

      expect(result.success).toBe(true);
      expect(result.metadata?.formId).toBe('product-editor');
      expect(result.metadata?.fieldCount).toBe(3);
    });

    it('should prefill product form with context', async () => {
      const productData = {
        title: 'Test Product',
        description: 'A test product',
        price: { amount: 99.99, currency: 'USD' },
        tags: ['test', 'product'],
      };

      const result = await uiController.prefillProductForm(productData, context);

      expect(result.success).toBe(true);
      expect(result.metadata?.formId).toBe('product-editor');
    });
  });

  describe('Product Resolution', () => {
    it('should resolve products by name', async () => {
      const result = await uiController.resolveProductByName('Test Product');

      expect(result.found).toBe(true);
      expect(result.product).toBeDefined();
      expect(result.product?.title).toBe('Test Product');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should handle product not found', async () => {
      const result = await uiController.resolveProductByName('Nonexistent Product');

      expect(result.found).toBe(false);
      expect(result.confidence).toBe(0);
    });
  });

  describe('Metrics Tracking', () => {
    it('should track action metrics', async () => {
      // Perform several actions
      await uiController.navigateToPage(UIPage.PRODUCTS);
      await uiController.openDrawer(UIDrawer.SEO_OPTIMIZATION);
      await uiController.prefillForm('test-form', { test: 'data' });

      const metrics = await uiController.getControllerMetrics();

      expect(metrics.totalActions).toBeGreaterThan(0);
      expect(metrics.successRate).toBeGreaterThan(0);
      expect(metrics.actionsByType).toBeDefined();
      expect(Object.keys(metrics.actionsByType).length).toBeGreaterThan(0);
    });
  });
});

describe('UINavigationService', () => {
  let uiController: UIControllerImpl;
  let navigationService: UINavigationService;
  let context: ConversationContext;

  beforeEach(async () => {
    uiController = new UIControllerImpl();
    navigationService = new UINavigationService(uiController);
    
    context = {
      userId: 'test-user',
      sessionId: 'test-session',
      businessData: {
        totalProducts: 0,
        totalRevenue: { amount: 0, currency: 'USD' },
        topPerformingProducts: [],
        recentMetrics: {
          revenue: { amount: 0, currency: 'USD' },
          salesCount: 0,
          conversionRate: 0,
          impressions: 0,
          clicks: 0,
          profitMargin: 0,
          period: {
            start: new Date(),
            end: new Date(),
          },
          trends: [],
        },
        marketplaceStatus: [],
        lastUpdated: new Date(),
      },
      recommendations: new Map(),
      conversationHistory: [],
      userPreferences: {
        language: 'en',
        timezone: 'UTC',
        currency: 'USD',
        notificationSettings: {
          emailEnabled: true,
          pushEnabled: false,
          smsEnabled: false,
          frequency: 'daily',
        },
        displaySettings: {
          theme: 'light',
          compactMode: false,
          showAdvancedMetrics: false,
        },
      },
      lastUpdated: new Date(),
    };
  });

  describe('Flow-based Navigation', () => {
    it('should navigate based on flow type', async () => {
      const result = await navigationService.navigateBasedOnFlow('business_performance', context);

      expect(result.success).toBe(true);
      expect(result.metadata?.page).toBe(UIPage.ANALYTICS);
    });

    it('should handle unknown flow types', async () => {
      const result = await navigationService.navigateBasedOnFlow('unknown_flow', context);

      expect(result.success).toBe(true);
      expect(result.metadata?.page).toBe(UIPage.DASHBOARD);
    });
  });

  describe('Error Handling', () => {
    it('should handle navigation failures gracefully', async () => {
      const result = await navigationService.handleNavigationFailure(
        'navigateToProduct',
        new Error('Test error'),
        context
      );

      expect(result.success).toBe(true);
      expect(result.metadata?.page).toBe(UIPage.PRODUCTS);
      expect((result.metadata?.parameters as any)?.error).toBeDefined();
    });
  });
});

describe('ProductNavigationService', () => {
  let uiController: UIControllerImpl;
  let productNavigationService: ProductNavigationService;
  let businessDataService: BusinessDataServiceImpl;

  beforeEach(() => {
    businessDataService = new BusinessDataServiceImpl();
    uiController = new UIControllerImpl(businessDataService);
    productNavigationService = new ProductNavigationService(uiController, businessDataService);
  });

  describe('Product Resolution', () => {
    it('should resolve products with fuzzy matching', async () => {
      const result = await productNavigationService.resolveProductByName('test product', {
        threshold: 0.1,
        maxResults: 5,
        includePartialMatches: true,
      });

      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Advanced Search', () => {
    it('should search products with multiple strategies', async () => {
      const results = await productNavigationService.searchProducts('test', ['title', 'description']);

      expect(Array.isArray(results)).toBe(true);
    });
  });
});