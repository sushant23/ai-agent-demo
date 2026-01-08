// Example usage of the Tool Registry System

import { ToolRegistry, ToolFactory } from './index';
import { BusinessDataService } from '../types/business';

// Mock business data service for demonstration
class MockBusinessDataService implements BusinessDataService {
  async getProducts() {
    return [
      {
        id: 'prod-1',
        title: 'Sample Product',
        description: 'A sample product for testing',
        price: { amount: 29.99, currency: 'USD' },
        cost: { amount: 15.00, currency: 'USD' },
        seoScore: 75,
        tags: ['electronics', 'gadget'],
        marketplace: {
          id: 'shop-1',
          name: 'Sample Shop',
          type: 'shopify' as any,
          apiCredentials: { apiKey: 'test' },
          isActive: true,
        },
        performanceMetrics: {
          revenue: { amount: 1500, currency: 'USD' },
          salesCount: 50,
          conversionRate: 2.5,
          impressions: 2000,
          clicks: 100,
          profitMargin: 50,
          period: { start: new Date('2024-01-01'), end: new Date('2024-01-31') },
          trends: [],
        },
        images: [],
        category: 'Electronics',
        sku: 'SAMPLE-001',
        inventory: {
          quantity: 100,
          reserved: 5,
          available: 95,
          lowStockThreshold: 10,
        },
      },
    ];
  }

  async getProduct(productId: string) {
    const products = await this.getProducts();
    return products.find(p => p.id === productId) || null;
  }

  async getPerformanceMetrics() {
    return {
      revenue: { amount: 5000, currency: 'USD' },
      salesCount: 150,
      conversionRate: 3.2,
      impressions: 10000,
      clicks: 320,
      profitMargin: 45,
      period: { start: new Date('2024-01-01'), end: new Date('2024-01-31') },
      trends: [
        { metric: 'revenue', direction: 'up' as const, changePercent: 15, period: { start: new Date(), end: new Date() } },
      ],
    };
  }

  async syncMarketplaceData() {
    return {
      success: true,
      syncedProducts: 10,
      errors: [],
      lastSyncTime: new Date(),
    };
  }

  async getBusinessProfile() {
    return {
      userId: 'user-1',
      businessName: 'Sample Business',
      primaryEmail: 'test@example.com',
      timezone: 'UTC',
      connectedMarketplaces: [],
      subscriptionPlan: {
        id: 'basic',
        name: 'Basic Plan',
        tier: 'basic' as const,
        features: ['basic-analytics'],
        limits: {
          maxProducts: 100,
          maxMarketplaces: 1,
          apiCallsPerMonth: 1000,
          storageGB: 1,
        },
      },
      businessGoals: [],
    };
  }
}

// Example usage function
export async function demonstrateToolRegistry(): Promise<void> {
  console.log('🔧 Tool Registry System Demo');
  console.log('============================');

  // 1. Initialize the tool registry
  const registry = new ToolRegistry();
  await registry.initialize();
  console.log('✅ Tool registry initialized');

  // 2. Create mock data service
  const dataService = new MockBusinessDataService();
  console.log('✅ Mock data service created');

  // 3. Create tool factory and register all business tools
  const toolFactory = new ToolFactory(dataService, registry);
  await toolFactory.registerAllBusinessTools();
  console.log('✅ All business tools registered');

  // 4. List available tools
  const allTools = await registry.listAvailableTools();
  console.log(`📋 Available tools: ${allTools.length}`);
  allTools.forEach(tool => {
    console.log(`   - ${tool.name} (${tool.id}) - ${tool.category}`);
  });

  // 5. Execute a product list tool
  console.log('\n🚀 Executing product-list tool...');
  const productListResult = await registry.executeTool('product-list', {
    limit: 5,
    sortBy: 'revenue',
    sortOrder: 'desc',
  });

  if (productListResult.success) {
    console.log('✅ Product list executed successfully');
    console.log(`   Found ${(productListResult.data as any).products.length} products`);
  } else {
    console.log('❌ Product list execution failed:', productListResult.error?.message);
  }

  // 6. Execute a revenue analysis tool
  console.log('\n📊 Executing revenue-analysis tool...');
  const revenueResult = await registry.executeTool('revenue-analysis', {
    period: {
      startDate: '2024-01-01',
      endDate: '2024-01-31',
    },
    groupBy: 'week',
  });

  if (revenueResult.success) {
    console.log('✅ Revenue analysis executed successfully');
    const data = revenueResult.data as any;
    console.log(`   Total revenue: $${data.totalRevenue.amount}`);
    console.log(`   Revenue periods: ${data.revenueByPeriod.length}`);
  } else {
    console.log('❌ Revenue analysis execution failed:', revenueResult.error?.message);
  }

  // 7. Get tool metrics
  console.log('\n📈 Tool execution metrics:');
  try {
    const productListMetrics = await registry.getToolMetrics('product-list');
    console.log(`   product-list: ${productListMetrics.executionCount} executions, ${productListMetrics.successRate * 100}% success rate`);
    
    const revenueMetrics = await registry.getToolMetrics('revenue-analysis');
    console.log(`   revenue-analysis: ${revenueMetrics.executionCount} executions, ${revenueMetrics.successRate * 100}% success rate`);
  } catch (error) {
    console.log('   Metrics not available yet');
  }

  // 8. Shutdown
  await registry.shutdown();
  console.log('\n✅ Tool registry shutdown complete');
}

// Run the demo if this file is executed directly
if (require.main === module) {
  demonstrateToolRegistry().catch(console.error);
}