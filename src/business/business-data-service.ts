// Business Data Service implementation

import {
  IBusinessDataService,
  BusinessDataServiceConfig,
  BusinessDataServiceMetrics,
  IMarketplaceConnector,
  IDataAggregator,
  IDataCache,
  IDataValidator,
  IPerformanceAnalyzer,
} from '../interfaces/business-data-service';
import {
  BusinessDataService,
  Product,
  ProductFilters,
  PerformanceMetrics,
  SyncResult,
  BusinessProfile,
  BusinessDataSnapshot,
  MarketplaceType,
} from '../types/business';
import { DateRange } from '../types/common';
import { ShopifyConnector } from './connectors/shopify-connector';
import { AmazonConnector } from './connectors/amazon-connector';
import { EbayConnector } from './connectors/ebay-connector';
import { DataAggregator } from './data-aggregator';
import { DataCache } from './data-cache';
import { DataValidator } from './data-validator';
import { PerformanceAnalyzer } from './performance-analyzer';

export class BusinessDataServiceImpl implements IBusinessDataService {
  private connectors: Map<string, IMarketplaceConnector> = new Map();
  private aggregator: IDataAggregator;
  private cache: IDataCache;
  private validator: IDataValidator;
  private analyzer: IPerformanceAnalyzer;
  private config?: BusinessDataServiceConfig;
  private syncIntervalId?: NodeJS.Timeout | undefined;

  constructor() {
    this.aggregator = new DataAggregator();
    this.cache = new DataCache();
    this.validator = new DataValidator();
    this.analyzer = new PerformanceAnalyzer();
  }

  async initialize(config: BusinessDataServiceConfig): Promise<void> {
    this.config = config;

    // Initialize marketplace connectors
    for (const connectorConfig of config.marketplaceConnectors) {
      if (!connectorConfig.enabled) continue;

      let connector: IMarketplaceConnector;
      
      switch (connectorConfig.type.toLowerCase()) {
        case MarketplaceType.SHOPIFY:
          connector = new ShopifyConnector();
          break;
        case MarketplaceType.AMAZON:
          connector = new AmazonConnector();
          break;
        case MarketplaceType.EBAY:
          connector = new EbayConnector();
          break;
        default:
          throw new Error(`Unsupported marketplace type: ${connectorConfig.type}`);
      }

      await connector.connect(connectorConfig.credentials);
      this.connectors.set(connectorConfig.type, connector);
    }

    // Start automatic sync if enabled
    if (config.syncInterval > 0) {
      this.startAutoSync();
    }
  }

  async shutdown(): Promise<void> {
    // Stop auto sync
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = undefined;
    }

    // Disconnect all connectors
    for (const connector of Array.from(this.connectors.values())) {
      await connector.disconnect();
    }
    this.connectors.clear();

    // Clear cache
    await this.cache.clear();
  }

  async getProducts(filters?: ProductFilters): Promise<Product[]> {
    const cacheKey = `products:${JSON.stringify(filters || {})}`;
    
    // Try cache first
    if (this.config?.cacheEnabled) {
      const cached = await this.cache.get<Product[]>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Fetch from all connectors
    const productSources: Product[][] = [];
    
    for (const [marketplaceType, connector] of Array.from(this.connectors.entries())) {
      try {
        const products = await connector.getProducts(filters);
        productSources.push(products);
      } catch (error) {
        console.error(`Failed to fetch products from ${marketplaceType}:`, error);
        // Continue with other connectors
      }
    }

    // Aggregate results
    const aggregatedProducts = await this.aggregator.aggregateProducts(productSources);
    
    // Validate products
    const validatedProducts = aggregatedProducts.filter(product => {
      const validation = this.validator.validateProduct(product);
      return validation.isValid;
    });

    // Cache results
    if (this.config?.cacheEnabled) {
      await this.cache.set(cacheKey, validatedProducts, this.config.cacheTTL);
    }

    return validatedProducts;
  }

  async getProduct(productId: string): Promise<Product | null> {
    const cacheKey = `product:${productId}`;
    
    // Try cache first
    if (this.config?.cacheEnabled) {
      const cached = await this.cache.get<Product>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Try each connector
    for (const connector of Array.from(this.connectors.values())) {
      try {
        const product = await connector.getProduct(productId);
        if (product) {
          // Validate product
          const validation = this.validator.validateProduct(product);
          if (validation.isValid) {
            // Cache result
            if (this.config?.cacheEnabled) {
              await this.cache.set(cacheKey, product, this.config.cacheTTL);
            }
            return product;
          }
        }
      } catch (error) {
        console.error(`Failed to fetch product ${productId}:`, error);
        // Continue with other connectors
      }
    }

    return null;
  }

  async getPerformanceMetrics(productId?: string, period?: DateRange): Promise<PerformanceMetrics> {
    const cacheKey = `metrics:${productId || 'all'}:${JSON.stringify(period || {})}`;
    
    // Try cache first
    if (this.config?.cacheEnabled) {
      const cached = await this.cache.get<PerformanceMetrics>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Fetch from all connectors
    const metricsSources: PerformanceMetrics[] = [];
    
    for (const connector of Array.from(this.connectors.values())) {
      try {
        const metrics = await connector.getPerformanceMetrics(productId, period);
        metricsSources.push(metrics);
      } catch (error) {
        console.error(`Failed to fetch metrics:`, error);
        // Continue with other connectors
      }
    }

    // Aggregate metrics
    const aggregatedMetrics = await this.aggregator.aggregateMetrics(metricsSources);
    
    // Validate metrics
    const validation = this.validator.validateMetrics(aggregatedMetrics);
    if (!validation.isValid) {
      throw new Error(`Invalid metrics: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // Cache results
    if (this.config?.cacheEnabled) {
      await this.cache.set(cacheKey, aggregatedMetrics, this.config.cacheTTL);
    }

    return aggregatedMetrics;
  }

  async syncMarketplaceData(marketplaceId: string): Promise<SyncResult> {
    const connector = this.connectors.get(marketplaceId);
    if (!connector) {
      return {
        success: false,
        syncedProducts: 0,
        errors: [{
          productId: '',
          error: `No connector found for marketplace: ${marketplaceId}`,
          retryable: false,
        }],
        lastSyncTime: new Date(),
      };
    }

    try {
      const result = await connector.syncProducts();
      
      // Clear relevant cache entries after sync
      if (this.config?.cacheEnabled) {
        // This is a simple implementation - in production you'd want more sophisticated cache invalidation
        await this.cache.clear();
      }

      return result;
    } catch (error) {
      console.error(`Sync failed for marketplace ${marketplaceId}:`, error);
      return {
        success: false,
        syncedProducts: 0,
        errors: [{
          productId: '',
          error: error instanceof Error ? error.message : 'Unknown error',
          retryable: true,
        }],
        lastSyncTime: new Date(),
      };
    }
  }

  async getBusinessProfile(userId: string): Promise<BusinessProfile> {
    const cacheKey = `profile:${userId}`;
    
    // Try cache first
    if (this.config?.cacheEnabled) {
      const cached = await this.cache.get<BusinessProfile>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // In a real implementation, this would fetch from a user database
    // For now, we'll return a mock profile
    const profile: BusinessProfile = {
      userId,
      businessName: 'Sample Business',
      primaryEmail: 'user@example.com',
      timezone: 'UTC',
      connectedMarketplaces: Array.from(this.connectors.keys()).map(type => ({
        id: type,
        name: type.charAt(0).toUpperCase() + type.slice(1),
        type: type as MarketplaceType,
        apiCredentials: { apiKey: '***' },
        isActive: true,
        lastSyncTime: new Date(),
      })),
      subscriptionPlan: {
        id: 'pro',
        name: 'Professional',
        tier: 'pro',
        features: ['unlimited_products', 'advanced_analytics'],
        limits: {
          maxProducts: 10000,
          maxMarketplaces: 5,
          apiCallsPerMonth: 100000,
          storageGB: 100,
        },
      },
      businessGoals: [],
    };

    // Cache result
    if (this.config?.cacheEnabled) {
      await this.cache.set(cacheKey, profile, this.config.cacheTTL);
    }

    return profile;
  }

  async getServiceMetrics(): Promise<BusinessDataServiceMetrics> {
    const products = await this.getProducts();
    const cacheStats = await this.cache.getStats();
    
    return {
      totalProducts: products.length,
      syncedMarketplaces: this.connectors.size,
      lastSyncTime: new Date(), // In real implementation, track actual sync times
      syncSuccessRate: 0.95, // Mock value
      averageResponseTime: 150, // Mock value in ms
      cacheHitRate: cacheStats.hitRate,
    };
  }

  private startAutoSync(): void {
    if (!this.config?.syncInterval) return;

    this.syncIntervalId = setInterval(async () => {
      for (const marketplaceId of Array.from(this.connectors.keys())) {
        try {
          await this.syncMarketplaceData(marketplaceId);
        } catch (error) {
          console.error(`Auto-sync failed for ${marketplaceId}:`, error);
        }
      }
    }, this.config.syncInterval);
  }
}