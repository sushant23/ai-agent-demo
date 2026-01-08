// Business domain types

import { Money, DateRange, Metric } from './common';

export interface BusinessProfile {
  userId: string;
  businessName: string;
  primaryEmail: string;
  timezone: string;
  connectedMarketplaces: Marketplace[];
  subscriptionPlan: SubscriptionPlan;
  businessGoals: BusinessGoal[];
}

export interface Marketplace {
  id: string;
  name: string;
  type: MarketplaceType;
  apiCredentials: ApiCredentials;
  isActive: boolean;
  lastSyncTime?: Date;
}

export enum MarketplaceType {
  SHOPIFY = 'shopify',
  AMAZON = 'amazon',
  EBAY = 'ebay',
  ETSY = 'etsy',
  WALMART = 'walmart',
}

export interface ApiCredentials {
  apiKey: string;
  secretKey?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  tier: 'basic' | 'pro' | 'enterprise';
  features: string[];
  limits: PlanLimits;
}

export interface PlanLimits {
  maxProducts: number;
  maxMarketplaces: number;
  apiCallsPerMonth: number;
  storageGB: number;
}

export interface BusinessGoal {
  id: string;
  title: string;
  description: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  deadline: Date;
  priority: 'low' | 'medium' | 'high';
}

export interface Product {
  id: string;
  title: string;
  description: string;
  price: Money;
  cost: Money;
  seoScore: number;
  tags: string[];
  marketplace: Marketplace;
  performanceMetrics: PerformanceMetrics;
  images: ProductImage[];
  variants?: ProductVariant[];
  category: string;
  brand?: string;
  sku: string;
  inventory: InventoryInfo;
}

export interface ProductImage {
  id: string;
  url: string;
  altText: string;
  isPrimary: boolean;
}

export interface ProductVariant {
  id: string;
  title: string;
  price: Money;
  sku: string;
  inventory: InventoryInfo;
  attributes: Record<string, string>;
}

export interface InventoryInfo {
  quantity: number;
  reserved: number;
  available: number;
  lowStockThreshold: number;
}

export interface PerformanceMetrics {
  revenue: Money;
  salesCount: number;
  conversionRate: number;
  impressions: number;
  clicks: number;
  profitMargin: number;
  period: DateRange;
  trends: MetricTrend[];
}

export interface MetricTrend {
  metric: string;
  direction: 'up' | 'down' | 'stable';
  changePercent: number;
  period: DateRange;
}

// Business Data Service types
export interface BusinessDataService {
  getProducts(filters?: ProductFilters): Promise<Product[]>;
  getProduct(productId: string): Promise<Product | null>;
  getPerformanceMetrics(productId?: string, period?: DateRange): Promise<PerformanceMetrics>;
  syncMarketplaceData(marketplaceId: string): Promise<SyncResult>;
  getBusinessProfile(userId: string): Promise<BusinessProfile>;
}

export interface ProductFilters {
  marketplace?: string;
  category?: string;
  priceRange?: { min: number; max: number };
  tags?: string[];
  lowStock?: boolean;
  sortBy?: 'revenue' | 'profit' | 'sales' | 'seo_score';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface SyncResult {
  success: boolean;
  syncedProducts: number;
  errors: SyncError[];
  lastSyncTime: Date;
}

export interface SyncError {
  productId: string;
  error: string;
  retryable: boolean;
}

export interface BusinessDataSnapshot {
  totalProducts: number;
  totalRevenue: Money;
  topPerformingProducts: Product[];
  recentMetrics: PerformanceMetrics;
  marketplaceStatus: MarketplaceStatus[];
  lastUpdated: Date;
}

export interface MarketplaceStatus {
  marketplace: Marketplace;
  isHealthy: boolean;
  lastError?: string;
  productsCount: number;
}
