// Example usage of the Recommendation Engine

import { RecommendationService } from './recommendation-service';
import { RecommendationStorageImpl } from './recommendation-storage';
import {
  AnalysisType,
  RecommendationCategory,
  OutcomeStatus
} from '../types/recommendations';
import { Priority } from '../types/common';
import { MarketplaceType } from '../types/business';

async function demonstrateRecommendationEngine() {
  // Initialize the recommendation service
  const service = new RecommendationService();
  
  await service.initialize({
    storage: new RecommendationStorageImpl(),
    algorithms: [
      {
        type: AnalysisType.SEO_ANALYSIS,
        enabled: true,
        parameters: { threshold: 70 },
        weight: 1.0
      },
      {
        type: AnalysisType.PROFITABILITY_ANALYSIS,
        enabled: true,
        parameters: { minMargin: 20 },
        weight: 0.8
      }
    ],
    impactEstimationEnabled: true,
    trackingEnabled: true
  });

  // Sample business data
  const businessData = {
    totalProducts: 150,
    totalRevenue: { amount: 50000, currency: 'USD' },
    topPerformingProducts: [
      {
        id: 'prod-123',
        title: 'Wireless Headphones',
        description: 'High-quality wireless headphones with noise cancellation',
        price: { amount: 199.99, currency: 'USD' },
        cost: { amount: 120.00, currency: 'USD' },
        seoScore: 45,
        tags: ['electronics', 'audio', 'wireless'],
        marketplace: {
          id: 'shop-1',
          name: 'Main Store',
          type: MarketplaceType.SHOPIFY,
          apiCredentials: { apiKey: 'test-key' },
          isActive: true
        },
        performanceMetrics: {
          revenue: { amount: 5000, currency: 'USD' },
          salesCount: 25,
          conversionRate: 1.5,
          impressions: 2000,
          clicks: 150,
          profitMargin: 15,
          period: {
            start: new Date('2024-01-01'),
            end: new Date('2024-01-31')
          },
          trends: []
        },
        images: [],
        category: 'Electronics',
        sku: 'WH-001',
        inventory: {
          quantity: 5,
          reserved: 2,
          available: 3,
          lowStockThreshold: 10
        }
      }
    ],
    recentMetrics: {
      revenue: { amount: 5000, currency: 'USD' },
      salesCount: 25,
      conversionRate: 1.5,
      impressions: 2000,
      clicks: 150,
      profitMargin: 15,
      period: {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31')
      },
      trends: []
    },
    marketplaceStatus: [],
    lastUpdated: new Date()
  };

  try {
    console.log('🚀 Generating SEO recommendations...');
    
    // Generate SEO recommendations
    const seoRecommendations = await service.generateRecommendations(
      'prod-123',
      AnalysisType.SEO_ANALYSIS,
      businessData
    );
    
    console.log(`Generated ${seoRecommendations.length} SEO recommendations:`);
    seoRecommendations.forEach(rec => {
      console.log(`- ${rec.title}: ${rec.reason} (Priority: ${rec.priority})`);
    });

    // Generate profitability recommendations
    console.log('\n💰 Generating profitability recommendations...');
    const profitRecommendations = await service.generateRecommendations(
      'prod-123',
      AnalysisType.PROFITABILITY_ANALYSIS,
      businessData
    );
    
    console.log(`Generated ${profitRecommendations.length} profitability recommendations:`);
    profitRecommendations.forEach(rec => {
      console.log(`- ${rec.title}: ${rec.reason} (Priority: ${rec.priority})`);
    });

    // Expand a recommendation for detailed information
    if (seoRecommendations.length > 0) {
      console.log('\n📋 Expanding first SEO recommendation...');
      const firstRec = seoRecommendations[0]!;
      const expandedRec = await service.expandRecommendation(firstRec.id);
      
      console.log(`Detailed explanation: ${expandedRec.detailedExplanation}`);
      console.log(`Implementation steps: ${expandedRec.implementationSteps.length}`);
      console.log(`Risk assessment: ${expandedRec.riskAssessment}`);
      console.log(`Time to implement: ${expandedRec.timeToImplement.value} ${expandedRec.timeToImplement.unit}`);
    }

    // Track recommendation outcomes
    if (seoRecommendations.length > 0) {
      console.log('\n📊 Tracking recommendation outcome...');
      
      const firstRec = seoRecommendations[0]!;
      await service.markRecommendationImplemented(
        firstRec.id,
        new Date(),
        'Successfully updated product title and description'
      );
      
      const outcomes = await service.getRecommendationOutcomes(firstRec.id);
      console.log(`Tracked ${outcomes.length} outcomes for recommendation`);
    }

    // Get user recommendations with filters
    console.log('\n🔍 Retrieving user recommendations...');
    const userRecommendations = await service.getUserRecommendations('default-user', {
      category: RecommendationCategory.SEO_OPTIMIZATION,
      limit: 5
    });
    
    console.log(`Found ${userRecommendations.length} SEO recommendations for user`);

    // Search recommendations
    console.log('\n🔎 Searching recommendations...');
    const searchResults = await service.searchRecommendations(
      'default-user',
      'SEO',
      { limit: 3 }
    );
    
    console.log(`Search found ${searchResults.length} recommendations matching "SEO"`);

    // Get active recommendations
    console.log('\n⚡ Getting active recommendations...');
    const activeRecommendations = await service.getActiveRecommendations('default-user');
    console.log(`Found ${activeRecommendations.length} active recommendations`);

    // Get metrics
    console.log('\n📈 Getting recommendation metrics...');
    const metrics = await service.getRecommendationMetrics();
    console.log(`Total recommendations: ${metrics.totalRecommendations}`);
    console.log(`Implementation rate: ${(metrics.implementationRate * 100).toFixed(1)}%`);
    console.log(`User satisfaction: ${metrics.userSatisfactionScore}/5`);

    // Get user statistics
    console.log('\n📊 Getting user statistics...');
    const stats = await service.getRecommendationStatistics('default-user');
    console.log(`Total recommendations: ${stats.totalRecommendations}`);
    console.log(`Active recommendations: ${stats.activeRecommendations}`);
    console.log(`Completion rate: ${(stats.completionRate * 100).toFixed(1)}%`);
    console.log('Category breakdown:', stats.categoryBreakdown);

    // Demonstrate cleanup functionality
    console.log('\n🧹 Testing cleanup functionality...');
    const expiredCount = await service.cleanupExpiredRecommendations();
    console.log(`Cleaned up ${expiredCount} expired recommendations`);
    
    const archivedCount = await service.archiveOldRecommendations(365);
    console.log(`Archived ${archivedCount} old recommendations`);

    console.log('\n✅ Recommendation engine demonstration completed successfully!');

  } catch (error) {
    console.error('❌ Error during recommendation engine demonstration:', error);
  } finally {
    await service.shutdown();
  }
}

// Export for use in tests or other modules
export { demonstrateRecommendationEngine };

// Run demonstration if this file is executed directly
if (require.main === module) {
  demonstrateRecommendationEngine().catch(console.error);
}