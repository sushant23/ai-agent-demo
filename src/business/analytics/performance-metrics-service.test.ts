import { PerformanceMetricsService } from './performance-metrics-service';
import { getProgressTracker, SimpleCancellationToken } from '../../progress';
import { Product } from '../../types/business';
import { DateRange } from '../../types/common';

describe('PerformanceMetricsService Progress Integration', () => {
  let service: PerformanceMetricsService;
  let progressTracker: any;

  beforeEach(() => {
    service = new PerformanceMetricsService();
    progressTracker = getProgressTracker();
  });

  afterEach(() => {
    // Clean up any operations
    progressTracker.cleanup();
  });

  const createMockProducts = (): Product[] => [
    {
      id: 'prod1',
      title: 'Test Product 1',
      description: 'A test product',
      price: { amount: 100, currency: 'USD' },
      cost: { amount: 50, currency: 'USD' },
      seoScore: 75,
      tags: ['test'],
      marketplace: { 
        id: 'shopify-1',
        name: 'shopify', 
        type: 'shopify' as any,
        apiCredentials: {
          apiKey: 'test-key',
          secretKey: 'test-secret'
        },
        isActive: true
      },
      performanceMetrics: {
        revenue: { amount: 1000, currency: 'USD' },
        salesCount: 10,
        conversionRate: 0.05,
        impressions: 200,
        clicks: 10,
        profitMargin: 0.5,
        period: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31')
        },
        trends: []
      },
      category: 'electronics',
      images: [],
      sku: 'TEST-SKU-001',
      inventory: {
        quantity: 100,
        reserved: 5,
        available: 95,
        lowStockThreshold: 10
      }
    }
  ];

  const createDateRange = (): DateRange => ({
    start: new Date('2024-01-01'),
    end: new Date('2024-01-31')
  });

  test('should track progress during comprehensive metrics generation', async () => {
    const products = createMockProducts();
    const period = createDateRange();
    const cancellationToken = new SimpleCancellationToken();

    // Start the operation
    const metricsPromise = service.generateComprehensiveMetrics(products, period, undefined, cancellationToken);

    // Wait a bit for progress to start
    await new Promise(resolve => setTimeout(resolve, 200));

    // Check that operation was started
    const activeOperations = progressTracker.getActiveOperations();
    expect(activeOperations.length).toBeGreaterThan(0);

    const operation = activeOperations.find((op: any) => op.name === 'Comprehensive Business Analysis');
    expect(operation).toBeDefined();
    expect(operation.stages).toHaveLength(5);
    expect(operation.stages.map((s: any) => s.id)).toEqual([
      'revenue', 'seo', 'profitability', 'aggregation', 'recommendations'
    ]);

    // Wait for completion
    const result = await metricsPromise;
    expect(result).toBeDefined();
    expect(result.overview).toBeDefined();
    expect(result.revenue).toBeDefined();
    expect(result.seo).toBeDefined();
    expect(result.profitability).toBeDefined();

    // Check that operation completed
    const completedOperation = progressTracker.getOperation(operation.operationId);
    expect(completedOperation?.status).toBe('completed');
  });

  test('should track progress during report generation', async () => {
    const products = createMockProducts();
    const period = createDateRange();
    const cancellationToken = new SimpleCancellationToken();

    // Start the operation
    const reportPromise = service.generatePerformanceReport(products, period, 'summary', cancellationToken);

    // Wait a bit for progress to start
    await new Promise(resolve => setTimeout(resolve, 200));

    // Check that operation was started
    const activeOperations = progressTracker.getActiveOperations();
    expect(activeOperations.length).toBeGreaterThan(0);

    const operation = activeOperations.find((op: any) => op.name === 'Performance Report Generation');
    expect(operation).toBeDefined();
    expect(operation.stages).toHaveLength(2);
    expect(operation.stages.map((s: any) => s.id)).toEqual(['metrics', 'formatting']);

    // Wait for completion
    const result = await reportPromise;
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');

    // Check that operation completed
    const completedOperation = progressTracker.getOperation(operation.operationId);
    expect(completedOperation?.status).toBe('completed');
  });

  test('should support operation cancellation', async () => {
    const products = createMockProducts();
    const period = createDateRange();
    const cancellationToken = new SimpleCancellationToken();

    // Cancel immediately before starting
    cancellationToken.cancel('User requested cancellation');

    // Should throw cancellation error immediately
    await expect(
      service.generateComprehensiveMetrics(products, period, undefined, cancellationToken)
    ).rejects.toThrow('Analysis cancelled: User requested cancellation');
  });

  test('should provide async operation start methods', async () => {
    const products = createMockProducts();
    const period = createDateRange();

    // Test async metrics generation start
    const { operationId: metricsOpId, cancellationToken: metricsToken } = 
      await service.startComprehensiveMetricsGeneration(products, period);

    expect(metricsOpId).toBeDefined();
    expect(metricsToken).toBeDefined();

    // Test async report generation start
    const { operationId: reportOpId, cancellationToken: reportToken } = 
      await service.startPerformanceReportGeneration(products, period, 'summary');

    expect(reportOpId).toBeDefined();
    expect(reportToken).toBeDefined();

    // Clean up
    metricsToken.cancel('Test cleanup');
    reportToken.cancel('Test cleanup');
  });

  test('should provide operation progress monitoring', async () => {
    const products = createMockProducts();
    const period = createDateRange();

    const { operationId, cancellationToken } = 
      await service.startComprehensiveMetricsGeneration(products, period);

    // Wait a bit for operation to start
    await new Promise(resolve => setTimeout(resolve, 100));

    // Check progress monitoring
    const progress = service.getOperationProgress(operationId);
    expect(progress).toBeDefined();
    expect(progress?.operationId).toBe(operationId);

    // Test cancellation
    service.cancelOperation(operationId, 'Test cancellation');
    
    // Wait a bit for cancellation to process
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const cancelledProgress = service.getOperationProgress(operationId);
    expect(cancelledProgress?.status).toBe('cancelled');
  });
});