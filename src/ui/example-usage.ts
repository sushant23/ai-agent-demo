// UI Controller Example Usage

import { UIControllerImpl } from './ui-controller';
import { UINavigationService } from './navigation-service';
import { ProductNavigationService } from './product-navigation-service';
import { BusinessDataServiceImpl } from '../business/business-data-service';
import { ConversationContext } from '../types/context';
import { UIPage, UIDrawer } from '../types/ui';
import { MarketplaceType } from '../types/business';
import { RecommendationCategory } from '../types/recommendations';
import { Priority } from '../types/common';

async function demonstrateUIController() {
  console.log('=== UI Controller Example Usage ===\n');

  // Initialize business data service (optional)
  const businessDataService = new BusinessDataServiceImpl();
  
  // Initialize UI controller with business data service
  const uiController = new UIControllerImpl(businessDataService);
  await uiController.initialize({
    baseUrl: 'https://app.example.com',
    timeout: 5000,
    retryAttempts: 3,
    enableAnalytics: true,
  });

  // Initialize navigation services
  const navigationService = new UINavigationService(uiController);
  const productNavigationService = new ProductNavigationService(uiController, businessDataService);

  // Example conversation context
  const context: ConversationContext = {
    userId: 'user123',
    sessionId: 'session456',
    activeProduct: 'prod789',
    currentFlow: 'product_management',
    businessData: {
      totalProducts: 150,
      totalRevenue: { amount: 25000.00, currency: 'USD' },
      topPerformingProducts: [
        {
          id: 'prod789',
          title: 'Wireless Bluetooth Headphones',
          description: 'High-quality wireless headphones with noise cancellation',
          price: { amount: 99.99, currency: 'USD' },
          cost: { amount: 45.00, currency: 'USD' },
          seoScore: 75,
          tags: ['electronics', 'audio', 'wireless'],
          marketplace: {
            id: 'shopify-1',
            name: 'My Shopify Store',
            type: MarketplaceType.SHOPIFY,
            apiCredentials: { apiKey: 'test' },
            isActive: true,
          },
          performanceMetrics: {
            revenue: { amount: 2500.00, currency: 'USD' },
            salesCount: 25,
            conversionRate: 0.05,
            impressions: 5000,
            clicks: 250,
            profitMargin: 0.55,
            period: {
              start: new Date('2024-01-01'),
              end: new Date('2024-01-31'),
            },
            trends: [],
          },
          images: [],
          category: 'Electronics',
          sku: 'WBH-001',
          inventory: {
            quantity: 100,
            reserved: 5,
            available: 95,
            lowStockThreshold: 10,
          },
        },
      ],
      recentMetrics: {
        revenue: { amount: 2500.00, currency: 'USD' },
        salesCount: 25,
        conversionRate: 0.05,
        impressions: 5000,
        clicks: 250,
        profitMargin: 0.55,
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
        showAdvancedMetrics: true,
      },
    },
    lastUpdated: new Date(),
  };

  try {
    // Example 1: Basic page navigation
    console.log('1. Basic Navigation:');
    const navResult = await uiController.navigateToPage(UIPage.PRODUCTS, {
      category: 'electronics',
      sortBy: 'revenue',
    });
    console.log('Navigation result:', navResult);

    // Example 2: Product resolution and navigation
    console.log('\n2. Product Resolution:');
    const productResolution = await productNavigationService.resolveProductByName('bluetooth headphones');
    console.log('Product resolution:', productResolution);

    if (productResolution.found) {
      const productNavResult = await productNavigationService.navigateToProduct(
        'bluetooth headphones',
        context,
        {
          showSEOInsights: true,
          preloadAnalytics: true,
        }
      );
      console.log('Product navigation result:', productNavResult);
    }

    // Example 3: SEO optimization drawer
    console.log('\n3. SEO Optimization:');
    const seoResult = await productNavigationService.openSEOOptimizationDrawer(
      'Wireless Bluetooth Headphones',
      context
    );
    console.log('SEO drawer result:', seoResult);

    // Example 4: Form pre-population
    console.log('\n4. Form Pre-population:');
    const formResult = await navigationService.prefillFormBasedOnContext(
      'product-editor',
      context,
      {
        category: 'electronics',
        featured: true,
      }
    );
    console.log('Form prefill result:', formResult);

    // Example 5: Context-aware navigation based on recommendation
    console.log('\n5. Recommendation-based Navigation:');
    const recommendation = {
      id: 'rec123',
      title: 'Optimize product SEO',
      reason: 'Low SEO score detected',
      category: RecommendationCategory.SEO_OPTIMIZATION,
      priority: Priority.HIGH,
      requiredActions: [],
      createdAt: new Date(),
    };

    const recNavResult = await navigationService.navigateBasedOnRecommendation(recommendation, context);
    console.log('Recommendation navigation result:', recNavResult);

    // Example 6: Flow-based navigation
    console.log('\n6. Flow-based Navigation:');
    const flowNavResult = await navigationService.navigateBasedOnFlow('seo_optimization', context);
    console.log('Flow navigation result:', flowNavResult);

    // Example 7: Advanced product search
    console.log('\n7. Advanced Product Search:');
    const searchResults = await productNavigationService.searchProducts(
      'wireless audio',
      ['title', 'description', 'tags']
    );
    console.log('Search results:', searchResults);

    // Example 8: Error handling
    console.log('\n8. Error Handling:');
    const errorResult = await productNavigationService.navigateToProduct(
      'nonexistent product',
      context
    );
    console.log('Error handling result:', errorResult);

    // Example 9: UI Controller metrics
    console.log('\n9. Controller Metrics:');
    const metrics = await uiController.getControllerMetrics();
    console.log('UI Controller metrics:', metrics);

  } catch (error) {
    console.error('Example execution failed:', error);
  } finally {
    // Cleanup
    await uiController.shutdown();
  }
}

// Example of handling navigation failures
async function demonstrateErrorHandling() {
  console.log('\n=== Error Handling Examples ===\n');

  const uiController = new UIControllerImpl();
  const navigationService = new UINavigationService(uiController);

  const context: ConversationContext = {
    userId: 'user123',
    sessionId: 'session456',
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

  // Simulate navigation failure and recovery
  try {
    const recoveryResult = await navigationService.handleNavigationFailure(
      'navigateToProduct',
      new Error('Product not found'),
      context
    );
    console.log('Recovery result:', recoveryResult);
  } catch (error) {
    console.error('Recovery failed:', error);
  }
}

// Example of UI state management
async function demonstrateUIStateManagement() {
  console.log('\n=== UI State Management Examples ===\n');

  const uiController = new UIControllerImpl();
  await uiController.initialize({
    baseUrl: 'https://app.example.com',
    timeout: 5000,
    retryAttempts: 3,
    enableAnalytics: true,
  });

  // Open multiple drawers and panels
  await uiController.openDrawer(UIDrawer.SEO_OPTIMIZATION, { productId: 'prod123' });
  await uiController.openDrawer(UIDrawer.PRODUCT_EDITOR, { mode: 'create' });
  
  // Check metrics after operations
  const finalMetrics = await uiController.getControllerMetrics();
  console.log('Final metrics:', finalMetrics);

  await uiController.shutdown();
}

// Run examples if this file is executed directly
if (require.main === module) {
  demonstrateUIController()
    .then(() => demonstrateErrorHandling())
    .then(() => demonstrateUIStateManagement())
    .catch(console.error);
}

export {
  demonstrateUIController,
  demonstrateErrorHandling,
  demonstrateUIStateManagement,
};