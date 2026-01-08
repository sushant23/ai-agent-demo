// Example usage of the Business Data Service

import { BusinessDataServiceImpl } from './business-data-service';
import { BusinessDataServiceConfig } from '../interfaces/business-data-service';
import { MarketplaceType, Product } from '../types/business';
import { RevenueCalculator, SEOAnalyzer, ProfitabilityAnalyzer, PerformanceMetricsService } from './analytics';

async function demonstrateBusinessDataService() {
  // Initialize the business data service
  const businessDataService = new BusinessDataServiceImpl();

  // Configure with marketplace connectors
  const config: BusinessDataServiceConfig = {
    marketplaceConnectors: [
      {
        type: MarketplaceType.SHOPIFY,
        enabled: true,
        credentials: {
          apiKey: 'your-shopify-api-key',
          secretKey: 'your-shopify-secret',
          shopDomain: 'your-shop.myshopify.com',
        },
        syncSettings: {
          autoSync: true,
          syncInterval: 3600000, // 1 hour
          batchSize: 100,
          retryAttempts: 3,
        },
      },
      {
        type: MarketplaceType.AMAZON,
        enabled: true,
        credentials: {
          accessKeyId: 'your-amazon-access-key',
          secretAccessKey: 'your-amazon-secret',
          sellerId: 'your-seller-id',
        },
        syncSettings: {
          autoSync: true,
          syncInterval: 7200000, // 2 hours
          batchSize: 50,
          retryAttempts: 3,
        },
      },
    ],
    syncInterval: 3600000, // 1 hour
    cacheEnabled: true,
    cacheTTL: 300000, // 5 minutes
  };

  try {
    // Initialize the service
    await businessDataService.initialize(config);
    console.log('Business Data Service initialized successfully');

    // Get all products
    const products = await businessDataService.getProducts({
      sortBy: 'revenue',
      sortOrder: 'desc',
      limit: 10,
    });
    console.log(`Retrieved ${products.length} products`);

    // Get performance metrics
    const metrics = await businessDataService.getPerformanceMetrics();
    console.log('Performance metrics:', {
      revenue: metrics.revenue,
      salesCount: metrics.salesCount,
      conversionRate: metrics.conversionRate,
    });

    // Demonstrate analytics
    await demonstrateAnalytics(products);

    // Demonstrate comprehensive performance metrics
    await demonstratePerformanceMetrics(products);

    // Get service metrics
    const serviceMetrics = await businessDataService.getServiceMetrics();
    console.log('Service metrics:', serviceMetrics);

  } catch (error) {
    console.error('Error using business data service:', error);
  } finally {
    // Clean up
    await businessDataService.shutdown();
    console.log('Business Data Service shut down');
  }
}

async function demonstrateAnalytics(products: Product[]) {
  console.log('\n--- Analytics Demonstration ---');

  // Revenue Analysis
  const revenueCalculator = new RevenueCalculator();
  const period = {
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    end: new Date(),
  };

  const revenueBreakdown = revenueCalculator.calculateRevenueBreakdown(products, period);
  console.log('\nRevenue Analysis:');
  console.log(`Total Revenue: ${revenueBreakdown.totalRevenue.currency} ${revenueBreakdown.totalRevenue.amount}`);
  console.log(`Gross Profit: ${revenueBreakdown.grossProfit.currency} ${revenueBreakdown.grossProfit.amount}`);
  console.log(`Profit Margin: ${(revenueBreakdown.profitMargin * 100).toFixed(1)}%`);
  console.log(`Growth Rate: ${revenueBreakdown.growthRate.toFixed(1)}%`);

  // Top revenue products
  console.log('\nTop Revenue Products:');
  revenueBreakdown.revenueByProduct.slice(0, 3).forEach((product, index) => {
    console.log(`${index + 1}. ${product.productTitle}: ${product.revenue.currency} ${product.revenue.amount} (${product.revenueShare.toFixed(1)}%)`);
  });

  // SEO Analysis
  const seoAnalyzer = new SEOAnalyzer();
  const seoAnalysis = seoAnalyzer.analyzeProducts(products);
  console.log('\nSEO Analysis:');
  console.log(`Overall SEO Score: ${seoAnalysis.overallScore.toFixed(1)}/100`);
  console.log(`Average Score: ${seoAnalysis.benchmarks.averageScore.toFixed(1)}`);
  console.log(`Products needing attention: ${seoAnalysis.productAnalyses.filter(p => p.seoScore < 50).length}`);

  // SEO Recommendations
  if (seoAnalysis.recommendations.length > 0) {
    console.log('\nTop SEO Recommendations:');
    seoAnalysis.recommendations.slice(0, 2).forEach((rec, index) => {
      console.log(`${index + 1}. ${rec.title}: ${rec.description}`);
    });
  }

  // Profitability Analysis
  const profitabilityAnalyzer = new ProfitabilityAnalyzer();
  const profitabilityAnalysis = profitabilityAnalyzer.analyzeProducts(products);
  console.log('\nProfitability Analysis:');
  console.log(`Gross Profit Margin: ${(profitabilityAnalysis.overallProfitability.grossProfitMargin * 100).toFixed(1)}%`);
  console.log(`Net Profit Margin: ${(profitabilityAnalysis.overallProfitability.netProfitMargin * 100).toFixed(1)}%`);
  console.log(`Profitable Products: ${profitabilityAnalysis.overallProfitability.profitableProductsCount}`);
  console.log(`Unprofitable Products: ${profitabilityAnalysis.overallProfitability.unprofitableProductsCount}`);

  // Category Performance
  console.log('\nCategory Performance:');
  profitabilityAnalysis.categoryProfitability.slice(0, 3).forEach((category, index) => {
    console.log(`${index + 1}. ${category.category}: ${category.totalProfit.currency} ${category.totalProfit.amount} profit (${category.profitContribution.toFixed(1)}% of total)`);
  });

  // Profitability Recommendations
  if (profitabilityAnalysis.recommendations.length > 0) {
    console.log('\nTop Profitability Recommendations:');
    profitabilityAnalysis.recommendations.slice(0, 2).forEach((rec, index) => {
      console.log(`${index + 1}. ${rec.title}: ${rec.description}`);
      console.log(`   Impact: ${rec.estimatedImpact.currency} ${rec.estimatedImpact.amount}`);
    });
  }
}

async function demonstratePerformanceMetrics(products: Product[]) {
  console.log('\n--- Comprehensive Performance Metrics ---');

  const metricsService = new PerformanceMetricsService();
  const period = {
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    end: new Date(),
  };

  try {
    // Generate comprehensive metrics
    const comprehensiveMetrics = await metricsService.generateComprehensiveMetrics(products, period);

    console.log('\nPerformance Overview:');
    console.log(`Total Products: ${comprehensiveMetrics.overview.totalProducts}`);
    console.log(`Total Revenue: ${comprehensiveMetrics.overview.totalRevenue.currency} ${comprehensiveMetrics.overview.totalRevenue.amount.toLocaleString()}`);
    console.log(`Total Profit: ${comprehensiveMetrics.overview.totalProfit.currency} ${comprehensiveMetrics.overview.totalProfit.amount.toLocaleString()}`);
    console.log(`Average SEO Score: ${comprehensiveMetrics.overview.averageSEOScore.toFixed(1)}/100`);
    console.log(`Average Profit Margin: ${(comprehensiveMetrics.overview.averageProfitMargin * 100).toFixed(1)}%`);
    console.log(`Average Conversion Rate: ${(comprehensiveMetrics.overview.averageConversionRate * 100).toFixed(2)}%`);

    // Display key findings
    console.log('\nKey Findings:');
    comprehensiveMetrics.reportSummary.keyFindings.forEach(finding => {
      console.log(`  • ${finding}`);
    });

    // Display critical issues if any
    if (comprehensiveMetrics.reportSummary.criticalIssues.length > 0) {
      console.log('\nCritical Issues:');
      comprehensiveMetrics.reportSummary.criticalIssues.forEach(issue => {
        console.log(`  ⚠️  ${issue}`);
      });
    }

    // Display top opportunities
    console.log('\nTop Opportunities:');
    comprehensiveMetrics.reportSummary.topOpportunities.forEach(opportunity => {
      console.log(`  💡 ${opportunity}`);
    });

    // Display category performance
    console.log('\nCategory Performance:');
    comprehensiveMetrics.aggregatedData.byCategory.slice(0, 5).forEach(category => {
      console.log(`  ${category.category}: ${category.productCount} products, ${category.marketShare.toFixed(1)}% market share`);
    });

    // Display marketplace performance
    if (comprehensiveMetrics.aggregatedData.byMarketplace.length > 0) {
      console.log('\nMarketplace Performance:');
      comprehensiveMetrics.aggregatedData.byMarketplace.forEach(marketplace => {
        console.log(`  ${marketplace.marketplaceName}: Rank #${marketplace.performanceRank}, ${marketplace.productCount} products`);
      });
    }

    // Display top recommendations
    console.log('\nTop Recommendations:');
    comprehensiveMetrics.recommendations.slice(0, 3).forEach((rec, index) => {
      console.log(`  ${index + 1}. ${rec.title} (${rec.priority.toUpperCase()})`);
      console.log(`     Expected Impact: ${rec.expectedImpact.currency} ${rec.expectedImpact.amount.toLocaleString()}`);
      console.log(`     Implementation: ${rec.implementationEffort} effort, ${rec.timeToImplement}`);
    });

    // Display metric correlations
    if (comprehensiveMetrics.aggregatedData.correlations.length > 0) {
      console.log('\nMetric Correlations:');
      comprehensiveMetrics.aggregatedData.correlations.forEach(correlation => {
        const corrValue = correlation.correlation.toFixed(2);
        const strength = Math.abs(correlation.correlation) > 0.7 ? 'Strong' : 
                        Math.abs(correlation.correlation) > 0.4 ? 'Moderate' : 'Weak';
        console.log(`  ${correlation.metric1} ↔ ${correlation.metric2}: ${corrValue} (${strength})`);
      });
    }

    // Generate and display reports
    console.log('\n--- Performance Reports ---');
    
    const summaryReport = await metricsService.generatePerformanceReport(products, period, 'summary');
    console.log('\nSummary Report Generated ✓');
    
    const executiveReport = await metricsService.generatePerformanceReport(products, period, 'executive');
    console.log('Executive Report Generated ✓');
    
    // Show a snippet of the executive report
    console.log('\nExecutive Report Preview:');
    console.log(executiveReport.split('\n').slice(0, 15).join('\n') + '\n...');

  } catch (error) {
    console.error('Error generating performance metrics:', error);
  }
}

// Example of marketplace sync
async function demonstrateMarketplaceSync() {
  const businessDataService = new BusinessDataServiceImpl();
  
  // ... initialize service ...

  try {
    // Sync specific marketplace
    const syncResult = await businessDataService.syncMarketplaceData(MarketplaceType.SHOPIFY);
    
    if (syncResult.success) {
      console.log(`Successfully synced ${syncResult.syncedProducts} products from Shopify`);
    } else {
      console.log('Sync failed:', syncResult.errors);
    }
  } catch (error) {
    console.error('Sync error:', error);
  }
}

// Example of filtering and searching products
async function demonstrateProductFiltering() {
  const businessDataService = new BusinessDataServiceImpl();
  
  // ... initialize service ...

  try {
    // Filter by category and price range
    const filteredProducts = await businessDataService.getProducts({
      category: 'Electronics',
      priceRange: { min: 50, max: 500 },
      sortBy: 'seo_score',
      sortOrder: 'desc',
      limit: 20,
    });

    console.log(`Found ${filteredProducts.length} electronics products in price range $50-$500`);

    // Filter by low stock
    const lowStockProducts = await businessDataService.getProducts({
      lowStock: true,
      sortBy: 'revenue',
      sortOrder: 'desc',
    });

    console.log(`Found ${lowStockProducts.length} products with low stock`);

    // Filter by tags
    const taggedProducts = await businessDataService.getProducts({
      tags: ['premium', 'bestseller'],
      sortBy: 'profit',
      sortOrder: 'desc',
    });

    console.log(`Found ${taggedProducts.length} premium/bestseller products`);

  } catch (error) {
    console.error('Filtering error:', error);
  }
}

// Export demonstration functions
export {
  demonstrateBusinessDataService,
  demonstrateMarketplaceSync,
  demonstrateProductFiltering,
  demonstrateAnalytics,
  demonstratePerformanceMetrics,
};

// Run demonstration if this file is executed directly
if (require.main === module) {
  demonstrateBusinessDataService().catch(console.error);
}