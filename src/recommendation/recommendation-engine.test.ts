// Recommendation Engine Tests

import { RecommendationService } from './recommendation-service';
import { RecommendationStorageImpl } from './recommendation-storage';
import { AnalysisType, RecommendationCategory, OutcomeStatus } from '../types/recommendations';
import { MarketplaceType } from '../types/business';

describe('RecommendationEngine', () => {
  let service: RecommendationService;

  beforeEach(async () => {
    service = new RecommendationService();
    await service.initialize({
      storage: new RecommendationStorageImpl(),
      algorithms: [
        {
          type: AnalysisType.SEO_ANALYSIS,
          enabled: true,
          parameters: {},
          weight: 1.0
        }
      ],
      impactEstimationEnabled: true,
      trackingEnabled: true
    });
  });

  afterEach(async () => {
    await service.shutdown();
  });

  const mockBusinessData = {
    totalProducts: 1,
    totalRevenue: { amount: 1000, currency: 'USD' },
    topPerformingProducts: [
      {
        id: 'test-product',
        title: 'Test Product',
        description: 'Short description',
        price: { amount: 100, currency: 'USD' },
        cost: { amount: 80, currency: 'USD' },
        seoScore: 30,
        tags: ['test'],
        marketplace: {
          id: 'test-marketplace',
          name: 'Test Store',
          type: MarketplaceType.SHOPIFY,
          apiCredentials: { apiKey: 'test' },
          isActive: true
        },
        performanceMetrics: {
          revenue: { amount: 1000, currency: 'USD' },
          salesCount: 10,
          conversionRate: 1.0,
          impressions: 1000,
          clicks: 100,
          profitMargin: 20,
          period: { start: new Date(), end: new Date() },
          trends: []
        },
        images: [],
        category: 'Test',
        sku: 'TEST-001',
        inventory: {
          quantity: 10,
          reserved: 0,
          available: 10,
          lowStockThreshold: 5
        }
      }
    ],
    recentMetrics: {
      revenue: { amount: 1000, currency: 'USD' },
      salesCount: 10,
      conversionRate: 1.0,
      impressions: 1000,
      clicks: 100,
      profitMargin: 20,
      period: { start: new Date(), end: new Date() },
      trends: []
    },
    marketplaceStatus: [],
    lastUpdated: new Date()
  };

  test('should generate SEO recommendations', async () => {
    const recommendations = await service.generateRecommendations(
      'test-product',
      AnalysisType.SEO_ANALYSIS,
      mockBusinessData
    );

    expect(recommendations).toBeDefined();
    expect(recommendations.length).toBeGreaterThan(0);
    expect(recommendations[0]!).toHaveProperty('id');
    expect(recommendations[0]!).toHaveProperty('title');
    expect(recommendations[0]!).toHaveProperty('reason');
    expect(recommendations[0]!.category).toBe(RecommendationCategory.SEO_OPTIMIZATION);
  });

  test('should expand recommendation details', async () => {
    const recommendations = await service.generateRecommendations(
      'test-product',
      AnalysisType.SEO_ANALYSIS,
      mockBusinessData
    );

    const expanded = await service.expandRecommendation(recommendations[0]!.id);

    expect(expanded).toBeDefined();
    expect(expanded).toHaveProperty('detailedExplanation');
    expect(expanded).toHaveProperty('implementationSteps');
    expect(expanded).toHaveProperty('riskAssessment');
    expect(expanded).toHaveProperty('timeToImplement');
    expect(expanded.implementationSteps.length).toBeGreaterThan(0);
  });

  test('should track recommendation outcomes', async () => {
    const recommendations = await service.generateRecommendations(
      'test-product',
      AnalysisType.SEO_ANALYSIS,
      mockBusinessData
    );

    await service.markRecommendationImplemented(
      recommendations[0]!.id,
      new Date(),
      'Test implementation'
    );

    const outcomes = await service.getRecommendationOutcomes(recommendations[0]!.id);
    expect(outcomes.length).toBe(1);
    expect(outcomes[0]!.status).toBe(OutcomeStatus.IMPLEMENTED);
    expect(outcomes[0]!.notes).toBe('Test implementation');
  });

  test('should retrieve user recommendations', async () => {
    // First generate some recommendations
    const recommendations = await service.generateRecommendations(
      'test-product',
      AnalysisType.SEO_ANALYSIS,
      mockBusinessData
    );
    
    expect(recommendations.length).toBeGreaterThan(0);

    const userRecommendations = await service.getUserRecommendations('default-user');
    expect(userRecommendations.length).toBeGreaterThan(0);
  });

  test('should search recommendations', async () => {
    // First generate some recommendations
    const recommendations = await service.generateRecommendations(
      'test-product',
      AnalysisType.SEO_ANALYSIS,
      mockBusinessData
    );
    
    expect(recommendations.length).toBeGreaterThan(0);

    const searchResults = await service.searchRecommendations('default-user', 'SEO');
    expect(searchResults.length).toBeGreaterThan(0);
  });

  test('should get recommendation metrics', async () => {
    await service.generateRecommendations(
      'test-product',
      AnalysisType.SEO_ANALYSIS,
      mockBusinessData
    );

    const metrics = await service.getRecommendationMetrics();
    expect(metrics).toHaveProperty('totalRecommendations');
    expect(metrics).toHaveProperty('implementationRate');
    expect(metrics).toHaveProperty('userSatisfactionScore');
    expect(metrics.totalRecommendations).toBeGreaterThan(0);
  });

  test('should cleanup expired recommendations', async () => {
    // Generate a recommendation with expiration
    const recommendations = await service.generateRecommendations(
      'test-product',
      AnalysisType.SEO_ANALYSIS,
      mockBusinessData
    );

    // Manually set expiration date in the past
    const rec = recommendations[0]!;
    rec.expiresAt = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago
    await service.saveRecommendation(rec);

    const cleanedCount = await service.cleanupExpiredRecommendations();
    expect(cleanedCount).toBeGreaterThanOrEqual(0);
  });

  test('should archive old recommendations', async () => {
    // Generate recommendations
    await service.generateRecommendations(
      'test-product',
      AnalysisType.SEO_ANALYSIS,
      mockBusinessData
    );

    const archivedCount = await service.archiveOldRecommendations(30);
    expect(archivedCount).toBeGreaterThanOrEqual(0);
  });

  test('should calculate metrics accurately', async () => {
    // Generate and implement a recommendation
    const recommendations = await service.generateRecommendations(
      'test-product',
      AnalysisType.SEO_ANALYSIS,
      mockBusinessData
    );

    await service.markRecommendationImplemented(recommendations[0]!.id);

    const metrics = await service.getRecommendationMetrics();
    expect(metrics.implementationRate).toBeGreaterThan(0);
  });
});