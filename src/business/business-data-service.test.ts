// Business Data Service tests

import { BusinessDataServiceImpl } from './business-data-service';
import { BusinessDataServiceConfig } from '../interfaces/business-data-service';
import { MarketplaceType } from '../types/business';

describe('BusinessDataService', () => {
  let service: BusinessDataServiceImpl;
  let config: BusinessDataServiceConfig;

  beforeEach(() => {
    service = new BusinessDataServiceImpl();
    config = {
      marketplaceConnectors: [
        {
          type: MarketplaceType.SHOPIFY,
          enabled: true,
          credentials: {
            apiKey: 'test-key',
            secretKey: 'test-secret',
            shopDomain: 'test-shop.myshopify.com',
          },
          syncSettings: {
            autoSync: true,
            syncInterval: 60000,
            batchSize: 100,
            retryAttempts: 3,
          },
        },
        {
          type: MarketplaceType.AMAZON,
          enabled: true,
          credentials: {
            accessKeyId: 'test-access-key',
            secretAccessKey: 'test-secret-key',
            sellerId: 'test-seller-id',
          },
          syncSettings: {
            autoSync: true,
            syncInterval: 60000,
            batchSize: 50,
            retryAttempts: 3,
          },
        },
      ],
      syncInterval: 300000, // 5 minutes
      cacheEnabled: true,
      cacheTTL: 300000, // 5 minutes
    };
  });

  afterEach(async () => {
    await service.shutdown();
  });

  describe('initialization', () => {
    it('should initialize successfully with valid config', async () => {
      await expect(service.initialize(config)).resolves.not.toThrow();
    });

    it('should throw error for unsupported marketplace type', async () => {
      const invalidConfig = {
        ...config,
        marketplaceConnectors: [
          {
            type: 'unsupported' as any,
            enabled: true,
            credentials: {},
            syncSettings: {
              autoSync: false,
              syncInterval: 60000,
              batchSize: 100,
              retryAttempts: 3,
            },
          },
        ],
      };

      await expect(service.initialize(invalidConfig)).rejects.toThrow('Unsupported marketplace type');
    });
  });

  describe('product operations', () => {
    beforeEach(async () => {
      await service.initialize(config);
    });

    it('should fetch products from all connectors', async () => {
      const products = await service.getProducts();
      expect(products).toBeDefined();
      expect(Array.isArray(products)).toBe(true);
      expect(products.length).toBeGreaterThan(0);
    });

    it('should fetch products with filters', async () => {
      const products = await service.getProducts({
        category: 'Electronics',
        priceRange: { min: 50, max: 200 },
        sortBy: 'revenue',
        sortOrder: 'desc',
        limit: 10,
      });
      
      expect(products).toBeDefined();
      expect(Array.isArray(products)).toBe(true);
    });

    it('should fetch individual product by ID', async () => {
      const product = await service.getProduct('shopify_1');
      expect(product).toBeDefined();
      if (product) {
        expect(product.id).toBe('shopify_1');
        expect(product.title).toBeDefined();
        expect(product.price).toBeDefined();
      }
    });

    it('should return null for non-existent product', async () => {
      const product = await service.getProduct('non-existent-id');
      expect(product).toBeNull();
    });
  });

  describe('performance metrics', () => {
    beforeEach(async () => {
      await service.initialize(config);
    });

    it('should fetch aggregated performance metrics', async () => {
      const metrics = await service.getPerformanceMetrics();
      expect(metrics).toBeDefined();
      expect(metrics.revenue).toBeDefined();
      expect(metrics.salesCount).toBeGreaterThanOrEqual(0);
      expect(metrics.conversionRate).toBeGreaterThanOrEqual(0);
      expect(metrics.period).toBeDefined();
    });

    it('should fetch metrics for specific product', async () => {
      const metrics = await service.getPerformanceMetrics('shopify_1');
      expect(metrics).toBeDefined();
      expect(metrics.revenue.amount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('marketplace synchronization', () => {
    beforeEach(async () => {
      await service.initialize(config);
    });

    it('should sync marketplace data successfully', async () => {
      const result = await service.syncMarketplaceData(MarketplaceType.SHOPIFY);
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.syncedProducts).toBeGreaterThanOrEqual(0);
      expect(result.lastSyncTime).toBeInstanceOf(Date);
    });

    it('should handle sync errors gracefully', async () => {
      const result = await service.syncMarketplaceData('non-existent-marketplace');
      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('business profile', () => {
    beforeEach(async () => {
      await service.initialize(config);
    });

    it('should fetch business profile', async () => {
      const profile = await service.getBusinessProfile('test-user-id');
      expect(profile).toBeDefined();
      expect(profile.userId).toBe('test-user-id');
      expect(profile.businessName).toBeDefined();
      expect(profile.primaryEmail).toBeDefined();
      expect(profile.connectedMarketplaces).toBeDefined();
      expect(profile.subscriptionPlan).toBeDefined();
    });
  });

  describe('service metrics', () => {
    beforeEach(async () => {
      await service.initialize(config);
    });

    it('should provide service metrics', async () => {
      const metrics = await service.getServiceMetrics();
      expect(metrics).toBeDefined();
      expect(metrics.totalProducts).toBeGreaterThanOrEqual(0);
      expect(metrics.syncedMarketplaces).toBeGreaterThanOrEqual(0);
      expect(metrics.lastSyncTime).toBeInstanceOf(Date);
      expect(metrics.syncSuccessRate).toBeGreaterThanOrEqual(0);
      expect(metrics.averageResponseTime).toBeGreaterThanOrEqual(0);
      expect(metrics.cacheHitRate).toBeGreaterThanOrEqual(0);
    });
  });
});