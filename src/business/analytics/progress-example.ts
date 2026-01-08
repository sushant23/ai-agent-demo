import { PerformanceMetricsService } from './performance-metrics-service';
import { getProgressTracker, ProgressIndicator, ConsoleProgressIndicator } from '../../progress';
import { Product } from '../../types/business';
import { DateRange } from '../../types/common';

/**
 * Example demonstrating progress tracking integration with business analysis
 */
export async function businessAnalysisProgressExample(): Promise<void> {
  console.log('🚀 Starting Business Analysis with Progress Tracking\n');

  const service = new PerformanceMetricsService();
  const progressTracker = getProgressTracker();

  // Create sample products for analysis
  const products: Product[] = [
    {
      id: 'prod1',
      title: 'Premium Wireless Headphones',
      description: 'High-quality wireless headphones with noise cancellation',
      price: { amount: 299, currency: 'USD' },
      cost: { amount: 150, currency: 'USD' },
      seoScore: 85,
      tags: ['electronics', 'audio', 'wireless'],
      marketplace: {
        id: 'shopify-1',
        name: 'Shopify Store',
        type: 'shopify' as any,
        apiCredentials: { apiKey: 'test-key', secretKey: 'test-secret' },
        isActive: true
      },
      performanceMetrics: {
        revenue: { amount: 14950, currency: 'USD' },
        salesCount: 50,
        conversionRate: 0.08,
        impressions: 5000,
        clicks: 400,
        profitMargin: 0.5,
        period: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31')
        },
        trends: []
      },
      category: 'electronics',
      images: [],
      sku: 'WH-001',
      inventory: {
        quantity: 200,
        reserved: 10,
        available: 190,
        lowStockThreshold: 20
      }
    },
    {
      id: 'prod2',
      title: 'Smart Fitness Tracker',
      description: 'Advanced fitness tracker with heart rate monitoring',
      price: { amount: 199, currency: 'USD' },
      cost: { amount: 80, currency: 'USD' },
      seoScore: 72,
      tags: ['fitness', 'wearable', 'health'],
      marketplace: {
        id: 'amazon-1',
        name: 'Amazon Store',
        type: 'amazon' as any,
        apiCredentials: { apiKey: 'test-key', secretKey: 'test-secret' },
        isActive: true
      },
      performanceMetrics: {
        revenue: { amount: 7960, currency: 'USD' },
        salesCount: 40,
        conversionRate: 0.06,
        impressions: 3200,
        clicks: 192,
        profitMargin: 0.6,
        period: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31')
        },
        trends: []
      },
      category: 'fitness',
      images: [],
      sku: 'FT-002',
      inventory: {
        quantity: 150,
        reserved: 5,
        available: 145,
        lowStockThreshold: 15
      }
    }
  ];

  const period: DateRange = {
    start: new Date('2024-01-01'),
    end: new Date('2024-01-31')
  };

  // Example 1: Comprehensive Metrics with Console Progress Indicator
  console.log('📊 Example 1: Comprehensive Metrics Analysis\n');
  
  const { operationId: metricsOpId, cancellationToken: metricsToken } = 
    await service.startComprehensiveMetricsGeneration(products, period);

  // Create console progress indicator
  const consoleIndicator = new ConsoleProgressIndicator(progressTracker);
  consoleIndicator.showProgress(metricsOpId);

  // Wait for completion
  await new Promise((resolve, reject) => {
    progressTracker.once(`completed:${metricsOpId}`, (operation) => {
      console.log('\n✅ Comprehensive metrics analysis completed!');
      console.log(`📈 Analysis Results Summary:`);
      console.log(`   - Operation ID: ${operation.operationId}`);
      console.log(`   - Duration: ${Date.now() - operation.startTime.getTime()}ms`);
      console.log(`   - Products Analyzed: ${operation.metadata?.productCount}`);
      consoleIndicator.hide();
      resolve(undefined);
    });

    progressTracker.once(`failed:${metricsOpId}`, ({ operation, error }) => {
      console.error('\n❌ Analysis failed:', error.message);
      consoleIndicator.hide();
      reject(error);
    });
  });

  // Example 2: Performance Report Generation
  console.log('\n📋 Example 2: Performance Report Generation\n');
  
  const { operationId: reportOpId, cancellationToken: reportToken } = 
    await service.startPerformanceReportGeneration(products, period, 'detailed');

  // Monitor progress manually
  const reportIndicator = new ConsoleProgressIndicator(progressTracker);
  reportIndicator.showProgress(reportOpId);

  await new Promise((resolve, reject) => {
    progressTracker.once(`completed:${reportOpId}`, (operation) => {
      console.log('\n✅ Performance report generated!');
      console.log(`📄 Report Details:`);
      console.log(`   - Operation ID: ${operation.operationId}`);
      console.log(`   - Report Length: ${operation.metadata?.reportLength} characters`);
      console.log(`   - Format: ${operation.metadata?.format}`);
      reportIndicator.hide();
      resolve(undefined);
    });

    progressTracker.once(`failed:${reportOpId}`, ({ operation, error }) => {
      console.error('\n❌ Report generation failed:', error.message);
      reportIndicator.hide();
      reject(error);
    });
  });

  // Example 3: Cancellation Demo
  console.log('\n🛑 Example 3: Operation Cancellation Demo\n');
  
  const { operationId: cancelOpId, cancellationToken: cancelToken } = 
    await service.startComprehensiveMetricsGeneration(products, period);

  const cancelIndicator = new ConsoleProgressIndicator(progressTracker);
  cancelIndicator.showProgress(cancelOpId);

  // Cancel after 2 seconds
  setTimeout(() => {
    console.log('\n⏹️  Cancelling operation...');
    cancelToken.cancel('User requested cancellation for demo');
  }, 2000);

  await new Promise((resolve) => {
    progressTracker.once(`cancelled:${cancelOpId}`, ({ operation, reason }) => {
      console.log('\n🚫 Operation cancelled successfully!');
      console.log(`   - Reason: ${reason}`);
      console.log(`   - Progress at cancellation: ${operation.overallProgress}%`);
      cancelIndicator.hide();
      resolve(undefined);
    });

    progressTracker.once(`completed:${cancelOpId}`, () => {
      console.log('\n⚠️  Operation completed before cancellation');
      cancelIndicator.hide();
      resolve(undefined);
    });
  });

  // Example 4: Multiple Concurrent Operations
  console.log('\n🔄 Example 4: Multiple Concurrent Operations\n');

  const operations = await Promise.all([
    service.startComprehensiveMetricsGeneration(products.slice(0, 1), period),
    service.startPerformanceReportGeneration(products.slice(1, 2), period, 'summary'),
    service.startComprehensiveMetricsGeneration(products, period)
  ]);

  console.log(`🚀 Started ${operations.length} concurrent operations:`);
  operations.forEach((op, index) => {
    console.log(`   ${index + 1}. Operation ID: ${op.operationId}`);
  });

  // Monitor all operations
  const activeOps = progressTracker.getActiveOperations();
  console.log(`\n📊 Active Operations: ${activeOps.length}`);

  // Wait for all to complete
  await Promise.all(operations.map(({ operationId }) => 
    new Promise((resolve) => {
      const checkCompletion = () => {
        const operation = progressTracker.getOperation(operationId);
        if (operation && ['completed', 'failed', 'cancelled'].includes(operation.status)) {
          resolve(undefined);
        } else {
          setTimeout(checkCompletion, 100);
        }
      };
      checkCompletion();
    })
  ));

  console.log('\n✅ All concurrent operations completed!');

  // Clean up old operations
  progressTracker.cleanup();
  console.log('\n🧹 Cleaned up completed operations');

  console.log('\n🎉 Business Analysis Progress Tracking Demo Complete!\n');
}

/**
 * Run the example if this file is executed directly
 */
if (require.main === module) {
  businessAnalysisProgressExample()
    .then(() => {
      console.log('Demo completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Demo failed:', error);
      process.exit(1);
    });
}