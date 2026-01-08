import { EventEmitter } from 'events';
import { ProgressTracker, OperationProgress, ProgressUpdate } from './progress-tracker';

export interface ProgressIndicatorOptions {
  showPercentage?: boolean;
  showStages?: boolean;
  showTimeEstimate?: boolean;
  showCancelButton?: boolean;
  autoHide?: boolean;
  autoHideDelay?: number; // milliseconds
  theme?: 'light' | 'dark' | 'auto';
}

export interface ProgressIndicatorState {
  visible: boolean;
  operation?: OperationProgress;
  currentUpdate?: ProgressUpdate;
  formattedTimeRemaining?: string;
  formattedElapsedTime?: string;
}

export class ProgressIndicator extends EventEmitter {
  private progressTracker: ProgressTracker;
  private options: Required<ProgressIndicatorOptions>;
  private state: ProgressIndicatorState;
  private currentOperationId: string | undefined;
  private autoHideTimer: NodeJS.Timeout | undefined;

  constructor(progressTracker: ProgressTracker, options: ProgressIndicatorOptions = {}) {
    super();
    this.progressTracker = progressTracker;
    this.options = {
      showPercentage: options.showPercentage ?? true,
      showStages: options.showStages ?? true,
      showTimeEstimate: options.showTimeEstimate ?? true,
      showCancelButton: options.showCancelButton ?? true,
      autoHide: options.autoHide ?? true,
      autoHideDelay: options.autoHideDelay ?? 3000,
      theme: options.theme ?? 'auto'
    };

    this.state = {
      visible: false
    };

    this.setupEventListeners();
  }

  /**
   * Show progress for a specific operation
   */
  showProgress(operationId: string): void {
    const operation = this.progressTracker.getOperation(operationId);
    if (!operation) {
      throw new Error(`Operation ${operationId} not found`);
    }

    this.currentOperationId = operationId;
    this.state.operation = operation;
    this.state.visible = true;

    this.clearAutoHideTimer();
    this.updateState();
    this.emit('show', this.state);
  }

  /**
   * Hide the progress indicator
   */
  hide(): void {
    this.state.visible = false;
    this.currentOperationId = undefined;
    this.clearAutoHideTimer();
    this.emit('hide', this.state);
  }

  /**
   * Get current state
   */
  getState(): ProgressIndicatorState {
    return { ...this.state };
  }

  /**
   * Update options
   */
  updateOptions(options: Partial<ProgressIndicatorOptions>): void {
    Object.assign(this.options, options);
    this.updateState();
    this.emit('optionsChanged', this.options);
  }

  /**
   * Cancel the current operation
   */
  cancelCurrentOperation(reason?: string): void {
    if (this.currentOperationId) {
      this.progressTracker.cancelOperation(this.currentOperationId, reason);
    }
  }

  /**
   * Format progress as HTML string for web display
   */
  toHTML(): string {
    if (!this.state.visible || !this.state.operation) {
      return '';
    }

    const { operation, formattedTimeRemaining, formattedElapsedTime } = this.state;
    const currentStage = operation.stages.find(s => s.id === operation.currentStage);

    return `
      <div class="progress-indicator ${this.options.theme}">
        <div class="progress-header">
          <h3 class="progress-title">${operation.name}</h3>
          ${this.options.showCancelButton ? `
            <button class="progress-cancel" onclick="cancelProgress()">×</button>
          ` : ''}
        </div>
        
        ${operation.description ? `
          <p class="progress-description">${operation.description}</p>
        ` : ''}
        
        <div class="progress-bar-container">
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${operation.overallProgress}%"></div>
          </div>
          ${this.options.showPercentage ? `
            <span class="progress-percentage">${operation.overallProgress}%</span>
          ` : ''}
        </div>
        
        ${this.options.showStages && currentStage ? `
          <div class="progress-stage">
            <span class="stage-name">${currentStage.name}</span>
            ${currentStage.description ? `
              <span class="stage-description">${currentStage.description}</span>
            ` : ''}
          </div>
        ` : ''}
        
        ${this.state.currentUpdate?.message ? `
          <div class="progress-message">${this.state.currentUpdate.message}</div>
        ` : ''}
        
        ${this.options.showTimeEstimate ? `
          <div class="progress-time">
            ${formattedElapsedTime ? `<span>Elapsed: ${formattedElapsedTime}</span>` : ''}
            ${formattedTimeRemaining ? `<span>Remaining: ${formattedTimeRemaining}</span>` : ''}
          </div>
        ` : ''}
        
        <div class="progress-stages-list">
          ${operation.stages.map(stage => `
            <div class="stage-item ${stage.id === operation.currentStage ? 'active' : ''}">
              <span class="stage-indicator"></span>
              <span class="stage-label">${stage.name}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Format progress as plain text for console display
   */
  toText(): string {
    if (!this.state.visible || !this.state.operation) {
      return '';
    }

    const { operation, formattedTimeRemaining, formattedElapsedTime } = this.state;
    const currentStage = operation.stages.find(s => s.id === operation.currentStage);
    
    const progressBar = this.createTextProgressBar(operation.overallProgress);
    
    let text = `${operation.name}\n`;
    if (operation.description) {
      text += `${operation.description}\n`;
    }
    
    text += `${progressBar} ${operation.overallProgress}%\n`;
    
    if (currentStage) {
      text += `Current: ${currentStage.name}\n`;
    }
    
    if (this.state.currentUpdate?.message) {
      text += `Status: ${this.state.currentUpdate.message}\n`;
    }
    
    if (formattedElapsedTime) {
      text += `Elapsed: ${formattedElapsedTime}`;
    }
    
    if (formattedTimeRemaining) {
      text += ` | Remaining: ${formattedTimeRemaining}`;
    }
    
    return text;
  }

  /**
   * Setup event listeners for progress updates
   */
  private setupEventListeners(): void {
    this.progressTracker.on('progressUpdate', (update: ProgressUpdate) => {
      if (update.operationId === this.currentOperationId) {
        this.handleProgressUpdate(update);
      }
    });

    this.progressTracker.on('operationCompleted', (operation: OperationProgress) => {
      if (operation.operationId === this.currentOperationId) {
        this.handleOperationCompleted(operation);
      }
    });

    this.progressTracker.on('operationFailed', ({ operation }: { operation: OperationProgress }) => {
      if (operation.operationId === this.currentOperationId) {
        this.handleOperationFailed(operation);
      }
    });

    this.progressTracker.on('operationCancelled', ({ operation }: { operation: OperationProgress }) => {
      if (operation.operationId === this.currentOperationId) {
        this.handleOperationCancelled(operation);
      }
    });
  }

  /**
   * Handle progress update
   */
  private handleProgressUpdate(update: ProgressUpdate): void {
    this.state.currentUpdate = update;
    const operation = this.progressTracker.getOperation(update.operationId);
    if (operation) {
      this.state.operation = operation;
    }
    this.updateState();
    this.emit('update', this.state);
  }

  /**
   * Handle operation completion
   */
  private handleOperationCompleted(operation: OperationProgress): void {
    this.state.operation = operation;
    this.updateState();
    this.emit('completed', this.state);
    
    if (this.options.autoHide) {
      this.scheduleAutoHide();
    }
  }

  /**
   * Handle operation failure
   */
  private handleOperationFailed(operation: OperationProgress): void {
    this.state.operation = operation;
    this.updateState();
    this.emit('failed', this.state);
    
    if (this.options.autoHide) {
      this.scheduleAutoHide();
    }
  }

  /**
   * Handle operation cancellation
   */
  private handleOperationCancelled(operation: OperationProgress): void {
    this.state.operation = operation;
    this.updateState();
    this.emit('cancelled', this.state);
    
    if (this.options.autoHide) {
      this.scheduleAutoHide();
    }
  }

  /**
   * Update internal state with calculated values
   */
  private updateState(): void {
    if (!this.state.operation) return;

    const operation = this.state.operation;
    const now = new Date();
    
    // Calculate elapsed time
    const elapsed = now.getTime() - operation.startTime.getTime();
    this.state.formattedElapsedTime = this.formatDuration(elapsed);
    
    // Calculate remaining time
    if (operation.estimatedEndTime) {
      const remaining = Math.max(0, operation.estimatedEndTime.getTime() - now.getTime());
      this.state.formattedTimeRemaining = this.formatDuration(remaining);
    }
  }

  /**
   * Format duration in milliseconds to human-readable string
   */
  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Create text-based progress bar
   */
  private createTextProgressBar(progress: number, width: number = 30): string {
    const filled = Math.round((progress / 100) * width);
    const empty = width - filled;
    return `[${'█'.repeat(filled)}${' '.repeat(empty)}]`;
  }

  /**
   * Schedule auto-hide timer
   */
  private scheduleAutoHide(): void {
    this.clearAutoHideTimer();
    this.autoHideTimer = setTimeout(() => {
      this.hide();
    }, this.options.autoHideDelay);
  }

  /**
   * Clear auto-hide timer
   */
  private clearAutoHideTimer(): void {
    if (this.autoHideTimer) {
      clearTimeout(this.autoHideTimer);
      this.autoHideTimer = undefined;
    }
  }
}

/**
 * Create a progress indicator for console/terminal display
 */
export class ConsoleProgressIndicator extends ProgressIndicator {
  private lastOutput: string = '';

  constructor(progressTracker: ProgressTracker, options: ProgressIndicatorOptions = {}) {
    super(progressTracker, { ...options, showCancelButton: false });
    
    this.on('update', () => this.renderToConsole());
    this.on('completed', () => this.renderToConsole());
    this.on('failed', () => this.renderToConsole());
    this.on('cancelled', () => this.renderToConsole());
  }

  private renderToConsole(): void {
    const output = this.toText();
    if (output !== this.lastOutput) {
      // Clear previous output
      if (this.lastOutput) {
        const lines = this.lastOutput.split('\n').length;
        process.stdout.write(`\x1b[${lines}A\x1b[2K`);
      }
      
      // Write new output
      process.stdout.write(output + '\n');
      this.lastOutput = output;
    }
  }
}