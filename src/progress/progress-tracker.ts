import { EventEmitter } from 'events';

export interface ProgressUpdate {
  operationId: string;
  stage: string;
  progress: number; // 0-100
  message?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface ProgressStage {
  id: string;
  name: string;
  description?: string;
  weight: number; // Relative weight for calculating overall progress
  estimatedDuration?: number; // in milliseconds
}

export interface OperationProgress {
  operationId: string;
  name: string;
  description?: string;
  stages: ProgressStage[];
  currentStage: string;
  overallProgress: number; // 0-100
  startTime: Date;
  estimatedEndTime?: Date;
  status: OperationStatus;
  cancellationToken?: CancellationToken;
  metadata?: Record<string, any>;
}

export enum OperationStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface CancellationToken {
  isCancelled: boolean;
  reason: string | undefined;
  cancel(reason?: string): void;
  onCancelled(callback: (reason?: string) => void): void;
}

export class SimpleCancellationToken implements CancellationToken {
  private _isCancelled = false;
  private _reason: string | undefined = undefined;
  private _callbacks: Array<(reason?: string) => void> = [];

  get isCancelled(): boolean {
    return this._isCancelled;
  }

  get reason(): string | undefined {
    return this._reason;
  }

  cancel(reason?: string): void {
    if (this._isCancelled) return;
    
    this._isCancelled = true;
    this._reason = reason;
    
    for (const callback of this._callbacks) {
      try {
        callback(reason);
      } catch (error) {
        console.error('Error in cancellation callback:', error);
      }
    }
  }

  onCancelled(callback: (reason?: string) => void): void {
    if (this._isCancelled) {
      callback(this._reason);
    } else {
      this._callbacks.push(callback);
    }
  }
}

export class ProgressTracker extends EventEmitter {
  private operations: Map<string, OperationProgress>;
  private stageProgress: Map<string, Map<string, number>>; // operationId -> stageId -> progress

  constructor() {
    super();
    this.operations = new Map();
    this.stageProgress = new Map();
  }

  /**
   * Start tracking a new operation
   */
  startOperation(
    operationId: string,
    name: string,
    stages: ProgressStage[],
    options?: {
      description?: string;
      metadata?: Record<string, any>;
      cancellationToken?: CancellationToken;
    }
  ): OperationProgress {
    const operation = {
      operationId,
      name,
      stages,
      currentStage: stages[0]?.id || '',
      overallProgress: 0,
      startTime: new Date(),
      status: OperationStatus.PENDING,
      ...(options?.description && { description: options.description }),
      ...(options?.cancellationToken && { cancellationToken: options.cancellationToken }),
      ...(options?.metadata && { metadata: options.metadata })
    } as OperationProgress;

    this.operations.set(operationId, operation);
    this.stageProgress.set(operationId, new Map());

    // Initialize stage progress
    for (const stage of stages) {
      this.stageProgress.get(operationId)!.set(stage.id, 0);
    }

    this.emit('operationStarted', operation);
    return operation;
  }

  /**
   * Update progress for a specific stage
   */
  updateStageProgress(
    operationId: string,
    stageId: string,
    progress: number,
    message?: string,
    metadata?: Record<string, any>
  ): void {
    const operation = this.operations.get(operationId);
    if (!operation) {
      throw new Error(`Operation ${operationId} not found`);
    }

    // Check if operation is cancelled
    if (operation.cancellationToken?.isCancelled) {
      this.cancelOperation(operationId, operation.cancellationToken.reason);
      return;
    }

    // Clamp progress to 0-100
    progress = Math.max(0, Math.min(100, progress));

    // Update stage progress
    this.stageProgress.get(operationId)!.set(stageId, progress);

    // Update current stage if this stage is now active
    if (progress > 0 && operation.currentStage !== stageId) {
      operation.currentStage = stageId;
    }

    // Calculate overall progress
    operation.overallProgress = this.calculateOverallProgress(operationId);

    // Update status
    if (operation.status === OperationStatus.PENDING && progress > 0) {
      operation.status = OperationStatus.RUNNING;
    }

    // Update estimated end time
    this.updateEstimatedEndTime(operation);

    const update = {
      operationId,
      stage: stageId,
      progress,
      timestamp: new Date(),
      ...(message && { message }),
      ...(metadata && { metadata })
    } as ProgressUpdate;

    this.emit('progressUpdate', update);
    this.emit(`progress:${operationId}`, update);

    // Check if operation is complete
    if (operation.overallProgress >= 100) {
      this.completeOperation(operationId);
    }
  }

  /**
   * Complete an operation
   */
  completeOperation(operationId: string, metadata?: Record<string, any>): void {
    const operation = this.operations.get(operationId);
    if (!operation) {
      throw new Error(`Operation ${operationId} not found`);
    }

    operation.status = OperationStatus.COMPLETED;
    operation.overallProgress = 100;
    if (metadata) {
      operation.metadata = { ...operation.metadata, ...metadata };
    }

    this.emit('operationCompleted', operation);
    this.emit(`completed:${operationId}`, operation);
  }

  /**
   * Fail an operation
   */
  failOperation(operationId: string, error: Error, metadata?: Record<string, any>): void {
    const operation = this.operations.get(operationId);
    if (!operation) {
      throw new Error(`Operation ${operationId} not found`);
    }

    operation.status = OperationStatus.FAILED;
    if (metadata) {
      operation.metadata = { ...operation.metadata, ...metadata };
    }

    this.emit('operationFailed', { operation, error });
    this.emit(`failed:${operationId}`, { operation, error });
  }

  /**
   * Cancel an operation
   */
  cancelOperation(operationId: string, reason?: string): void {
    const operation = this.operations.get(operationId);
    if (!operation) {
      throw new Error(`Operation ${operationId} not found`);
    }

    operation.status = OperationStatus.CANCELLED;
    
    if (operation.cancellationToken && !operation.cancellationToken.isCancelled) {
      operation.cancellationToken.cancel(reason);
    }

    this.emit('operationCancelled', { operation, reason });
    this.emit(`cancelled:${operationId}`, { operation, reason });
  }

  /**
   * Get operation progress
   */
  getOperation(operationId: string): OperationProgress | undefined {
    return this.operations.get(operationId);
  }

  /**
   * Get all active operations
   */
  getActiveOperations(): OperationProgress[] {
    return Array.from(this.operations.values()).filter(
      op => op.status === OperationStatus.PENDING || op.status === OperationStatus.RUNNING
    );
  }

  /**
   * Get all operations
   */
  getAllOperations(): OperationProgress[] {
    return Array.from(this.operations.values());
  }

  /**
   * Clean up completed operations
   */
  cleanup(olderThan?: Date): void {
    const cutoff = olderThan || new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    
    for (const [operationId, operation] of this.operations) {
      if (operation.status !== OperationStatus.PENDING && 
          operation.status !== OperationStatus.RUNNING &&
          operation.startTime < cutoff) {
        this.operations.delete(operationId);
        this.stageProgress.delete(operationId);
      }
    }
  }

  /**
   * Calculate overall progress based on stage weights and progress
   */
  private calculateOverallProgress(operationId: string): number {
    const operation = this.operations.get(operationId)!;
    const stageProgressMap = this.stageProgress.get(operationId)!;
    
    let totalWeight = 0;
    let weightedProgress = 0;

    for (const stage of operation.stages) {
      const stageProgress = stageProgressMap.get(stage.id) || 0;
      totalWeight += stage.weight;
      weightedProgress += (stageProgress / 100) * stage.weight;
    }

    return totalWeight > 0 ? Math.round((weightedProgress / totalWeight) * 100) : 0;
  }

  /**
   * Update estimated end time based on current progress
   */
  private updateEstimatedEndTime(operation: OperationProgress): void {
    if (operation.overallProgress <= 0) return;

    const elapsed = Date.now() - operation.startTime.getTime();
    const estimatedTotal = (elapsed / operation.overallProgress) * 100;
    operation.estimatedEndTime = new Date(operation.startTime.getTime() + estimatedTotal);
  }
}

// Singleton instance
let progressTrackerInstance: ProgressTracker | null = null;

/**
 * Get the global progress tracker instance
 */
export function getProgressTracker(): ProgressTracker {
  if (!progressTrackerInstance) {
    progressTrackerInstance = new ProgressTracker();
  }
  return progressTrackerInstance;
}