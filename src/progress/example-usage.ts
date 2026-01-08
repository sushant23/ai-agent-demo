import { 
  getProgressTracker, 
  getBusinessAnalysisProgressService,
  ProgressIndicator,
  ConsoleProgressIndicator,
  SimpleCancellationToken,
  CancellationToken
} from './index';

/**
 * Example: Basic progress tracking
 */
export async function basicProgressExample(): Promise<void> {
  const progressTracker = getProgressTracker();
  
  // Define operation stages
  const stages = [
    { id: 'setup', name: 'Setup', weight: 10, estimatedDuration: 1000 },
    { id: 'processing', name: 'Processing', weight: 70, estimatedDuration: 5000 },
    { id: 'cleanup', name: 'Cleanup', weight: 20, estimatedDuration: 2000 }
  ];

  // Start operation
  const operationId = 'example-operation-' + Date.now();
  const cancellationToken = new SimpleCancellationToken();
  
  progressTracker.startOperation(operationId, 'Example Operation', stages, {
    description: 'Demonstrating progress tracking',
    cancellationToken: cancellationToken as CancellationToken
  });

  try {
    // Setup phase
    progressTracker.updateStageProgress(operationId, 'setup', 50, 'Initializing...');
    await delay(500);
    progressTracker.updateStageProgress(operationId, 'setup', 100, 'Setup complete');

    // Processing phase
    for (let i = 1; i <= 10; i++) {
      if (cancellationToken.isCancelled) break;
      
      const progress = (i / 10) * 100;
      progressTracker.updateStageProgress(
        operationId, 
        'processing', 
        progress, 
        `Processing item ${i}/10`
      );
      await delay(500);
    }

    // Cleanup phase
    progressTracker.updateStageProgress(operationId, 'cleanup', 50, 'Cleaning up...');
    await delay(1000);
    progressTracker.updateStageProgress(operationId, 'cleanup', 100, 'Cleanup complete');

    progressTracker.completeOperation(operationId);
    console.log('Operation completed successfully');

  } catch (error) {
    progressTracker.failOperation(operationId, error as Error);
    console.error('Operation failed:', error);
  }
}

/**
 * Example: Business analysis with progress tracking
 */
export async function businessAnalysisExample(): Promise<void> {
  const analysisService = getBusinessAnalysisProgressService();
  const progressTracker = getProgressTracker();

  // Start business analysis
  const { operationId, cancellationToken } = await analysisService.startBusinessAnalysis('user123', {
    includeRevenue: true,
    includeSEO: true,
    includeProfitability: true,
    includeProducts: true,
    marketplaces: ['shopify', 'amazon']
  });

  console.log(`Started business analysis: ${operationId}`);

  // Create progress indicator
  const indicator = new ConsoleProgressIndicator(progressTracker);
  indicator.showProgress(operationId);

  // Listen for completion
  return new Promise((resolve, reject) => {
    progressTracker.once(`completed:${operationId}`, (operation) => {
      console.log('Business analysis completed:', operation.metadata?.result);
      indicator.hide();
      resolve();
    });

    progressTracker.once(`failed:${operationId}`, ({ operation, error }) => {
      console.error('Business analysis failed:', error);
      indicator.hide();
      reject(error);
    });

    progressTracker.once(`cancelled:${operationId}`, ({ operation, reason }) => {
      console.log('Business analysis cancelled:', reason);
      indicator.hide();
      resolve();
    });

    // Example: Cancel after 10 seconds
    setTimeout(() => {
      cancellationToken.cancel('User requested cancellation');
    }, 10000);
  });
}

/**
 * Example: Web-based progress indicator (for browser environments)
 */
export function webProgressExample(): void {
  const progressTracker = getProgressTracker();
  const indicator = new ProgressIndicator(progressTracker, {
    showPercentage: true,
    showStages: true,
    showTimeEstimate: true,
    showCancelButton: true,
    autoHide: true,
    autoHideDelay: 5000
  });

  // Listen for progress events
  indicator.on('show', (state) => {
    console.log('Progress indicator shown:', state);
    // In a browser environment, you would update the DOM:
    // document.getElementById('progress-container')!.innerHTML = indicator.toHTML();
  });

  indicator.on('update', (state) => {
    console.log('Progress updated:', state);
    // In a browser environment, you would update the DOM:
    // document.getElementById('progress-container')!.innerHTML = indicator.toHTML();
  });

  indicator.on('hide', () => {
    console.log('Progress indicator hidden');
    // In a browser environment, you would hide the DOM element:
    // document.getElementById('progress-container')!.innerHTML = '';
  });

  // Example: Show progress for any new operation
  progressTracker.on('operationStarted', (operation) => {
    indicator.showProgress(operation.operationId);
  });
}

/**
 * Example: Multiple concurrent operations
 */
export async function concurrentOperationsExample(): Promise<void> {
  const progressTracker = getProgressTracker();
  
  // Start multiple operations
  const operations = [
    startExampleOperation('Operation 1', 3000),
    startExampleOperation('Operation 2', 5000),
    startExampleOperation('Operation 3', 2000)
  ];

  // Monitor all operations
  const activeOperations = progressTracker.getActiveOperations();
  console.log(`Started ${activeOperations.length} operations`);

  // Wait for all to complete
  await Promise.all(operations);
  console.log('All operations completed');
}

/**
 * Helper function to start an example operation
 */
async function startExampleOperation(name: string, duration: number): Promise<void> {
  const progressTracker = getProgressTracker();
  const operationId = `${name.toLowerCase().replace(' ', '-')}-${Date.now()}`;
  
  const stages = [
    { id: 'start', name: 'Starting', weight: 20, estimatedDuration: duration * 0.2 },
    { id: 'work', name: 'Working', weight: 60, estimatedDuration: duration * 0.6 },
    { id: 'finish', name: 'Finishing', weight: 20, estimatedDuration: duration * 0.2 }
  ];

  progressTracker.startOperation(operationId, name, stages);

  try {
    // Simulate work with progress updates
    for (const stage of stages) {
      const stageSteps = 5;
      for (let i = 1; i <= stageSteps; i++) {
        const progress = (i / stageSteps) * 100;
        progressTracker.updateStageProgress(
          operationId, 
          stage.id, 
          progress, 
          `${stage.name} step ${i}/${stageSteps}`
        );
        await delay(stage.estimatedDuration! / stageSteps);
      }
    }

    progressTracker.completeOperation(operationId);
  } catch (error) {
    progressTracker.failOperation(operationId, error as Error);
  }
}

/**
 * Utility function for delays
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Example: Progress tracking with cancellation
 */
export async function cancellationExample(): Promise<void> {
  const progressTracker = getProgressTracker();
  const cancellationToken = new SimpleCancellationToken();
  
  const operationId = 'cancellable-operation-' + Date.now();
  const stages = [
    { id: 'phase1', name: 'Phase 1', weight: 50, estimatedDuration: 5000 },
    { id: 'phase2', name: 'Phase 2', weight: 50, estimatedDuration: 5000 }
  ];

  progressTracker.startOperation(operationId, 'Cancellable Operation', stages, {
    cancellationToken: cancellationToken as CancellationToken
  });

  // Set up cancellation after 3 seconds
  setTimeout(() => {
    cancellationToken.cancel('User requested cancellation');
  }, 3000);

  // Listen for cancellation
  cancellationToken.onCancelled((reason) => {
    console.log('Operation was cancelled:', reason);
  });

  try {
    // Simulate long-running work
    for (let i = 1; i <= 100; i++) {
      if (cancellationToken.isCancelled) {
        console.log('Work interrupted due to cancellation');
        break;
      }

      const stage = i <= 50 ? 'phase1' : 'phase2';
      const stageProgress = i <= 50 ? (i / 50) * 100 : ((i - 50) / 50) * 100;
      
      progressTracker.updateStageProgress(
        operationId, 
        stage, 
        stageProgress, 
        `Processing step ${i}/100`
      );
      
      await delay(100);
    }

    if (!cancellationToken.isCancelled) {
      progressTracker.completeOperation(operationId);
    }
  } catch (error) {
    progressTracker.failOperation(operationId, error as Error);
  }
}

// Export all examples for easy testing
export const examples = {
  basic: basicProgressExample,
  businessAnalysis: businessAnalysisExample,
  web: webProgressExample,
  concurrent: concurrentOperationsExample,
  cancellation: cancellationExample
};