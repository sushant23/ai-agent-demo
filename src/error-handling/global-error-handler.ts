/**
 * Global Error Handler for the LLM Agnostic AI Agent
 * 
 * Provides centralized error handling, logging, and monitoring
 * across all system components.
 */

import { Logger, AppError, isAppError, createErrorResponse } from '../utils/errors';
import type { ErrorResponse } from '../types/agent';
import { AgentError } from '../types/agent';
import type { ConversationContext } from '../types/context';
import type { NextStepAction } from '../types/conversation';
import { ErrorLogger, createErrorLogger, LogLevel, ErrorCategory } from './error-logger';

/**
 * Recovery strategy for error handling
 */
interface RecoveryStrategy {
  type: 'retry_with_backoff' | 'retry_with_delay' | 'fallback_provider' | 'alternative_tool' | 'context_rebuild' | 'cached_fallback';
  delay?: number;
  maxRetries?: number;
  fallbackOptions?: string[];
  strategy?: string;
  cacheTimeout?: number;
}

/**
 * Error monitoring and metrics collection
 */
interface ErrorMetrics {
  totalErrors: number;
  errorsByType: Map<string, number>;
  errorsByComponent: Map<string, number>;
  recentErrors: ErrorLogEntry[];
  errorRate: number;
  lastErrorTime: Date | null;
}

interface ErrorLogEntry {
  timestamp: Date;
  errorCode: string;
  message: string;
  component: string;
  userId?: string | undefined;
  sessionId?: string | undefined;
  stackTrace?: string | undefined;
  context?: Record<string, unknown> | undefined;
}

/**
 * Error handler function type
 */
type ErrorHandlerFunction = (
  error: unknown,
  context?: ConversationContext,
  metadata?: Record<string, unknown>
) => Promise<ErrorResponse>;

/**
 * Global error handler class
 */
export class GlobalErrorHandler {
  private logger: Logger;
  private errorLogger: ErrorLogger;
  private errorHandlers: Map<string, ErrorHandlerFunction> = new Map();
  private metrics: ErrorMetrics;
  private maxRecentErrors = 100;

  constructor() {
    this.logger = new Logger('GlobalErrorHandler');
    this.errorLogger = createErrorLogger({
      enabled: true,
      logLevel: LogLevel.WARN,
      includeStackTrace: true
    });
    this.metrics = {
      totalErrors: 0,
      errorsByType: new Map(),
      errorsByComponent: new Map(),
      recentErrors: [],
      errorRate: 0,
      lastErrorTime: null
    };

    this.initializeDefaultHandlers();
    this.setupGlobalHandlers();
  }

  /**
   * Initialize default error handlers for common error types
   */
  private initializeDefaultHandlers(): void {
    // LLM Provider errors
    this.registerErrorHandler('LLM_PROVIDER_ERROR', async (error, context) => {
      this.logger.error('LLM Provider error occurred', error);
      
      return {
        message: 'I\'m experiencing some technical difficulties with my language processing. Let me try a different approach.',
        suggestedActions: [
          {
            id: 'retry_request',
            title: 'Try Again',
            description: 'Retry your request',
            actionType: 'ASK_QUESTION' as any,
            parameters: { retryOriginal: true }
          },
          {
            id: 'simplify_request',
            title: 'Simplify Request',
            description: 'Try asking in a simpler way',
            actionType: 'ASK_QUESTION' as any
          }
        ],
        errorCode: 'LLM_PROVIDER_ERROR'
      };
    });

    // Tool execution errors
    this.registerErrorHandler('TOOL_EXECUTION_ERROR', async (error, context) => {
      this.logger.error('Tool execution error occurred', error);
      
      return {
        message: 'I encountered an issue while trying to access your business data. Some features may be temporarily unavailable.',
        suggestedActions: [
          {
            id: 'check_connections',
            title: 'Check Connections',
            description: 'Verify your marketplace connections',
            actionType: 'UPDATE_PROFILE' as any
          },
          {
            id: 'try_different_action',
            title: 'Try Different Action',
            description: 'Let me help you with something else',
            actionType: 'ASK_QUESTION' as any
          }
        ],
        errorCode: 'TOOL_EXECUTION_ERROR'
      };
    });

    // Context management errors
    this.registerErrorHandler('CONTEXT_ERROR', async (error, context) => {
      this.logger.error('Context management error occurred', error);
      
      return {
        message: 'I\'m having trouble remembering our conversation context. Let me start fresh.',
        suggestedActions: [
          {
            id: 'restart_conversation',
            title: 'Start Fresh',
            description: 'Begin a new conversation',
            actionType: 'ASK_QUESTION' as any
          }
        ],
        errorCode: 'CONTEXT_ERROR'
      };
    });

    // Validation errors
    this.registerErrorHandler('VALIDATION_ERROR', async (error, context) => {
      this.logger.warn('Validation error occurred', error);
      
      return {
        message: 'I need some additional information to help you properly. Could you provide more details?',
        suggestedActions: [
          {
            id: 'provide_details',
            title: 'Provide More Details',
            description: 'Give me more specific information',
            actionType: 'ASK_QUESTION' as any
          }
        ],
        errorCode: 'VALIDATION_ERROR'
      };
    });

    // Network/timeout errors
    this.registerErrorHandler('TIMEOUT_ERROR', async (error, context) => {
      this.logger.error('Timeout error occurred', error);
      
      return {
        message: 'The request is taking longer than expected. This might be due to high system load.',
        suggestedActions: [
          {
            id: 'retry_later',
            title: 'Try Again Later',
            description: 'Retry your request in a few moments',
            actionType: 'ASK_QUESTION' as any,
            parameters: { retryOriginal: true }
          },
          {
            id: 'simpler_request',
            title: 'Ask Something Simpler',
            description: 'Try a less complex request',
            actionType: 'ASK_QUESTION' as any
          }
        ],
        errorCode: 'TIMEOUT_ERROR'
      };
    });

    // Network errors
    this.registerErrorHandler('NETWORK_ERROR', async (error, context) => {
      this.logger.error('Network error occurred', error);
      
      return {
        message: 'I\'m having trouble connecting to external services. This could be a temporary network issue.',
        suggestedActions: [
          {
            id: 'retry_later',
            title: 'Try Again Later',
            description: 'Retry in a few minutes',
            actionType: 'ASK_QUESTION' as any,
            parameters: { retryOriginal: true }
          },
          {
            id: 'offline_help',
            title: 'Get Offline Help',
            description: 'See what I can help with offline',
            actionType: 'ASK_QUESTION' as any
          }
        ],
        errorCode: 'NETWORK_ERROR'
      };
    });

    // Rate limiting errors
    this.registerErrorHandler('RATE_LIMIT_EXCEEDED', async (error, context) => {
      this.logger.warn('Rate limit exceeded', error);
      
      return {
        message: 'I\'m currently handling a lot of requests. Please give me a moment to catch up.',
        suggestedActions: [
          {
            id: 'wait_retry',
            title: 'Wait and Retry',
            description: 'Try again in 30 seconds',
            actionType: 'ASK_QUESTION' as any,
            parameters: { retryOriginal: true, delay: 30000 }
          },
          {
            id: 'different_task',
            title: 'Try Something Else',
            description: 'Let me help you with a different task',
            actionType: 'ASK_QUESTION' as any
          }
        ],
        errorCode: 'RATE_LIMIT_EXCEEDED'
      };
    });

    // Configuration errors
    this.registerErrorHandler('CONFIG_ERROR', async (error, context) => {
      this.logger.error('Configuration error occurred', error);
      
      return {
        message: 'There\'s an issue with the system configuration. This might require administrator attention.',
        suggestedActions: [
          {
            id: 'contact_support',
            title: 'Contact Support',
            description: 'Get help from our support team',
            actionType: 'UPDATE_PROFILE' as any
          },
          {
            id: 'basic_help',
            title: 'Basic Help',
            description: 'Get help with basic features',
            actionType: 'ASK_QUESTION' as any
          }
        ],
        errorCode: 'CONFIG_ERROR'
      };
    });

    // System overload errors
    this.registerErrorHandler('SYSTEM_OVERLOAD', async (error, context) => {
      this.logger.warn('System overload detected', error);
      
      return {
        message: 'The system is currently experiencing high load. Please wait a moment and try again.',
        suggestedActions: [
          {
            id: 'wait_retry',
            title: 'Wait and Retry',
            description: 'Try again in a few minutes',
            actionType: 'ASK_QUESTION' as any,
            parameters: { retryOriginal: true, delay: 120000 }
          },
          {
            id: 'simpler_request',
            title: 'Simplify Request',
            description: 'Try a less complex request',
            actionType: 'ASK_QUESTION' as any
          }
        ],
        errorCode: 'SYSTEM_OVERLOAD'
      };
    });

    // External API errors
    this.registerErrorHandler('EXTERNAL_API_ERROR', async (error, context) => {
      this.logger.error('External API error occurred', error);
      
      return {
        message: 'An external service we depend on is having issues. I can work with cached data or try alternative approaches.',
        suggestedActions: [
          {
            id: 'use_cached_data',
            title: 'Use Recent Data',
            description: 'Work with recently cached information',
            actionType: 'VIEW_ANALYTICS' as any
          },
          {
            id: 'alternative_approach',
            title: 'Try Alternative',
            description: 'Use a different approach',
            actionType: 'ASK_QUESTION' as any
          }
        ],
        errorCode: 'EXTERNAL_API_ERROR'
      };
    });

    // Security errors
    this.registerErrorHandler('SECURITY_ERROR', async (error, context) => {
      this.logger.warn('Security error occurred', error);
      
      return {
        message: 'A security check prevented this action from completing. This helps protect your account and data.',
        suggestedActions: [
          {
            id: 'verify_permissions',
            title: 'Check Permissions',
            description: 'Review your account permissions',
            actionType: 'UPDATE_PROFILE' as any
          },
          {
            id: 'contact_admin',
            title: 'Contact Administrator',
            description: 'Get help from your administrator',
            actionType: 'UPDATE_PROFILE' as any
          }
        ],
        errorCode: 'SECURITY_ERROR'
      };
    });

    // Business data errors
    this.registerErrorHandler('BUSINESS_DATA_ERROR', async (error, context) => {
      this.logger.error('Business data error occurred', error);
      
      return {
        message: 'I\'m having trouble accessing your business data right now. This could be due to a connection issue with your marketplace.',
        suggestedActions: [
          {
            id: 'check_connections',
            title: 'Check Connections',
            description: 'Verify your marketplace connections',
            actionType: 'UPDATE_PROFILE' as any
          },
          {
            id: 'try_cached_data',
            title: 'Use Recent Data',
            description: 'Work with recently cached information',
            actionType: 'VIEW_ANALYTICS' as any
          },
          {
            id: 'manual_input',
            title: 'Provide Data Manually',
            description: 'Tell me about your business manually',
            actionType: 'ASK_QUESTION' as any
          }
        ],
        errorCode: 'BUSINESS_DATA_ERROR'
      };
    });

    // Generic fallback handler
    this.registerErrorHandler('UNKNOWN_ERROR', async (error, context) => {
      this.logger.error('Unknown error occurred', error);
      
      return {
        message: 'I encountered an unexpected issue. Let me try to help you in a different way.',
        suggestedActions: [
          {
            id: 'general_help',
            title: 'Get General Help',
            description: 'See what I can help you with',
            actionType: 'ASK_QUESTION' as any
          },
          {
            id: 'contact_support',
            title: 'Contact Support',
            description: 'Get help from our support team',
            actionType: 'UPDATE_PROFILE' as any
          }
        ],
        errorCode: 'UNKNOWN_ERROR'
      };
    });
  }

  /**
   * Setup global error handlers for unhandled errors
   */
  private setupGlobalHandlers(): void {
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      this.logger.error('Unhandled Promise Rejection', reason);
      this.recordError('UNHANDLED_REJECTION', String(reason), 'process');
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      this.logger.error('Uncaught Exception', error);
      this.recordError('UNCAUGHT_EXCEPTION', error.message, 'process');
      
      // In production, you might want to gracefully shutdown
      // process.exit(1);
    });
  }

  /**
   * Register a custom error handler for a specific error code
   */
  registerErrorHandler(errorCode: string, handler: ErrorHandlerFunction): void {
    this.errorHandlers.set(errorCode, handler);
    this.logger.info(`Registered error handler for: ${errorCode}`);
  }

  /**
   * Enhanced error handler with recovery mechanisms
   */
  async handleError(
    error: unknown,
    context?: ConversationContext,
    metadata?: Record<string, unknown>
  ): Promise<ErrorResponse> {
    const errorCode = this.getErrorCode(error);
    const component = metadata?.component as string || 'unknown';
    
    // Record error metrics
    this.recordError(errorCode, this.getErrorMessage(error), component, context, error);
    
    // Check for error recovery patterns
    const recoveryStrategy = this.determineRecoveryStrategy(errorCode, error, metadata);
    
    // Apply recovery strategy if available
    if (recoveryStrategy) {
      try {
        const recoveredResponse = await this.applyRecoveryStrategy(recoveryStrategy, error, context, metadata);
        if (recoveredResponse) {
          this.logger.info(`Successfully recovered from error: ${errorCode} using strategy: ${recoveryStrategy.type}`);
          return recoveredResponse;
        }
      } catch (recoveryError) {
        this.logger.warn(`Recovery strategy failed for error: ${errorCode}`, recoveryError);
        // Continue to normal error handling
      }
    }
    
    // Get appropriate handler
    const handler = this.errorHandlers.get(errorCode) || this.errorHandlers.get('UNKNOWN_ERROR');
    
    if (!handler) {
      // Fallback response if no handler is found
      return {
        message: 'I encountered an unexpected issue. Please try again.',
        suggestedActions: [],
        errorCode: 'HANDLER_NOT_FOUND'
      };
    }

    try {
      return await handler(error, context, metadata);
    } catch (handlerError) {
      this.logger.error('Error in error handler', handlerError);
      
      // Return basic fallback response
      return {
        message: 'I\'m experiencing technical difficulties. Please try again later.',
        suggestedActions: [
          {
            id: 'retry_later',
            title: 'Try Again Later',
            description: 'Retry your request in a few minutes',
            actionType: 'ASK_QUESTION' as any
          }
        ],
        errorCode: 'ERROR_HANDLER_FAILED'
      };
    }
  }

  /**
   * Determine appropriate recovery strategy for an error
   */
  private determineRecoveryStrategy(
    errorCode: string, 
    error: unknown, 
    metadata?: Record<string, unknown>
  ): RecoveryStrategy | null {
    const retryCount = metadata?.retryCount as number || 0;
    const maxRetries = 3;
    
    // Don't retry if we've exceeded max attempts
    if (retryCount >= maxRetries) {
      return null;
    }

    // Don't apply recovery strategies in test environment
    if (process.env.NODE_ENV === 'test') {
      return null;
    }
    
    switch (errorCode) {
      case 'TIMEOUT_ERROR':
      case 'NETWORK_ERROR':
        return {
          type: 'retry_with_backoff',
          delay: Math.min(1000 * Math.pow(2, retryCount), 10000), // Exponential backoff
          maxRetries: maxRetries
        };
        
      case 'RATE_LIMIT_EXCEEDED':
        return {
          type: 'retry_with_delay',
          delay: 60000, // Wait 1 minute for rate limits
          maxRetries: 2
        };
        
      case 'LLM_PROVIDER_ERROR':
        return {
          type: 'fallback_provider',
          fallbackOptions: ['anthropic', 'openai', 'local']
        };
        
      case 'TOOL_EXECUTION_ERROR':
        return {
          type: 'alternative_tool',
          fallbackOptions: ['cached_data', 'manual_input', 'simplified_approach']
        };
        
      case 'CONTEXT_ERROR':
        return {
          type: 'context_rebuild',
          strategy: 'from_history'
        };
        
      case 'EXTERNAL_API_ERROR':
      case 'INTEGRATION_ERROR':
        return {
          type: 'cached_fallback',
          cacheTimeout: 300000 // 5 minutes
        };
        
      default:
        return null;
    }
  }

  /**
   * Apply recovery strategy
   */
  private async applyRecoveryStrategy(
    strategy: RecoveryStrategy,
    error: unknown,
    context?: ConversationContext,
    metadata?: Record<string, unknown>
  ): Promise<ErrorResponse | null> {
    switch (strategy.type) {
      case 'retry_with_backoff':
      case 'retry_with_delay':
        // For now, just return a response suggesting retry
        // In a full implementation, this would actually retry the operation
        return {
          message: `I encountered a temporary issue. I'll try again automatically in ${Math.round(strategy.delay! / 1000)} seconds.`,
          suggestedActions: [
            {
              id: 'auto_retry',
              title: 'Retrying...',
              description: 'Please wait while I retry your request',
              actionType: 'ASK_QUESTION' as any,
              parameters: { autoRetry: true, delay: strategy.delay }
            }
          ],
          errorCode: 'AUTO_RETRY_SCHEDULED'
        };
        
      case 'fallback_provider':
        return {
          message: 'I\'m switching to a backup AI service to handle your request.',
          suggestedActions: [
            {
              id: 'continue_with_fallback',
              title: 'Continue',
              description: 'Proceed with backup service',
              actionType: 'ASK_QUESTION' as any,
              parameters: { useFallbackProvider: true }
            }
          ],
          errorCode: 'PROVIDER_FALLBACK_ACTIVE'
        };
        
      case 'cached_fallback':
        return {
          message: 'I\'ll use recently cached data while the external service recovers.',
          suggestedActions: [
            {
              id: 'use_cached_data',
              title: 'Use Recent Data',
              description: 'Work with cached information',
              actionType: 'VIEW_ANALYTICS' as any,
              parameters: { useCachedData: true }
            },
            {
              id: 'wait_for_service',
              title: 'Wait for Service',
              description: 'Wait for the external service to recover',
              actionType: 'ASK_QUESTION' as any,
              parameters: { waitForService: true }
            }
          ],
          errorCode: 'CACHED_DATA_FALLBACK'
        };
        
      default:
        return null;
    }
  }

  /**
   * Record error for metrics and monitoring with enhanced logging
   */
  private recordError(
    errorCode: string,
    message: string,
    component: string,
    context?: ConversationContext,
    originalError?: unknown
  ): void {
    const now = new Date();
    
    // Update metrics
    this.metrics.totalErrors++;
    this.metrics.errorsByType.set(errorCode, (this.metrics.errorsByType.get(errorCode) || 0) + 1);
    this.metrics.errorsByComponent.set(component, (this.metrics.errorsByComponent.get(component) || 0) + 1);
    this.metrics.lastErrorTime = now;
    
    // Calculate error rate (errors per minute over last 10 minutes)
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
    const recentErrorCount = this.metrics.recentErrors.filter(e => e.timestamp > tenMinutesAgo).length;
    this.metrics.errorRate = recentErrorCount / 10; // errors per minute

    // Create error log entry
    const logEntry: ErrorLogEntry = {
      timestamp: now,
      errorCode,
      message,
      component,
      userId: context?.userId,
      sessionId: context?.sessionId,
      stackTrace: originalError instanceof Error ? originalError.stack : undefined,
      context: {
        ...context ? { contextId: context.userId + ':' + context.sessionId } : {},
        errorType: typeof originalError,
        ...(originalError && typeof originalError === 'object' ? { errorDetails: originalError } : {})
      }
    };

    // Add to recent errors (keep only last N errors)
    this.metrics.recentErrors.push(logEntry);
    if (this.metrics.recentErrors.length > this.maxRecentErrors) {
      this.metrics.recentErrors.shift();
    }

    // Log using enhanced error logger
    this.errorLogger.logError(originalError, {
      component,
      ...(context?.userId && { userId: context.userId }),
      ...(context?.sessionId && { sessionId: context.sessionId }),
      ...(context && { conversationContext: context }),
      metadata: {
        errorCode,
        message,
        errorType: typeof originalError
      },
      tags: [component, errorCode]
    });

    // Log the error using basic logger as well
    this.logger.error(`[${component}] ${errorCode}: ${message}`, originalError);
  }

  /**
   * Get error code from error object with enhanced categorization
   */
  private getErrorCode(error: unknown): string {
    if (isAppError(error)) {
      return error.code;
    }
    
    if (error instanceof AgentError) {
      return error.code;
    }
    
    if (error instanceof Error) {
      // Enhanced error code inference
      const errorName = error.name.toLowerCase();
      const errorMessage = error.message.toLowerCase();
      
      // Network and connectivity errors
      if (errorName.includes('timeout') || errorMessage.includes('timeout')) return 'TIMEOUT_ERROR';
      if (errorName.includes('network') || errorMessage.includes('network')) return 'NETWORK_ERROR';
      if (errorMessage.includes('econnrefused') || errorMessage.includes('connection refused')) return 'NETWORK_ERROR';
      if (errorMessage.includes('enotfound') || errorMessage.includes('dns')) return 'NETWORK_ERROR';
      
      // Authentication and authorization errors
      if (errorMessage.includes('unauthorized') || errorMessage.includes('401')) return 'UNAUTHORIZED_ERROR';
      if (errorMessage.includes('forbidden') || errorMessage.includes('403')) return 'FORBIDDEN_ERROR';
      if (errorMessage.includes('invalid token') || errorMessage.includes('expired token')) return 'UNAUTHORIZED_ERROR';
      
      // Rate limiting errors
      if (errorMessage.includes('rate limit') || errorMessage.includes('429')) return 'RATE_LIMIT_EXCEEDED';
      if (errorMessage.includes('too many requests')) return 'RATE_LIMIT_EXCEEDED';
      
      // Validation and input errors
      if (errorName.includes('validation') || errorMessage.includes('validation')) return 'VALIDATION_ERROR';
      if (errorMessage.includes('invalid input') || errorMessage.includes('bad request')) return 'VALIDATION_ERROR';
      if (errorMessage.includes('missing required')) return 'VALIDATION_ERROR';
      
      // System and configuration errors
      if (errorMessage.includes('configuration') || errorMessage.includes('config')) return 'CONFIG_ERROR';
      if (errorMessage.includes('system overload') || errorMessage.includes('service unavailable')) return 'SYSTEM_OVERLOAD';
      if (errorMessage.includes('dependency') || errorMessage.includes('service down')) return 'DEPENDENCY_ERROR';
      
      // Data and content errors
      if (errorMessage.includes('not found') || errorMessage.includes('404')) return 'CONTENT_NOT_FOUND';
      if (errorMessage.includes('data corruption') || errorMessage.includes('corrupt')) return 'DATA_CORRUPTION';
      if (errorMessage.includes('parse error') || errorMessage.includes('malformed')) return 'DATA_CORRUPTION';
      
      // LLM and AI service errors
      if (errorMessage.includes('provider') || errorMessage.includes('llm')) return 'LLM_PROVIDER_ERROR';
      if (errorMessage.includes('model') && errorMessage.includes('unavailable')) return 'LLM_PROVIDER_ERROR';
      if (errorMessage.includes('openai') || errorMessage.includes('anthropic')) return 'LLM_PROVIDER_ERROR';
      
      // Tool and business logic errors
      if (errorMessage.includes('tool') && errorMessage.includes('execution')) return 'TOOL_EXECUTION_ERROR';
      if (errorMessage.includes('business data') || errorMessage.includes('marketplace')) return 'BUSINESS_DATA_ERROR';
      if (errorMessage.includes('context') && errorMessage.includes('unavailable')) return 'CONTEXT_ERROR';
      
      // External service errors
      if (errorMessage.includes('external') || errorMessage.includes('api')) return 'EXTERNAL_API_ERROR';
      if (errorMessage.includes('integration') || errorMessage.includes('connector')) return 'INTEGRATION_ERROR';
      
      // Security errors
      if (errorMessage.includes('security') || errorMessage.includes('csrf')) return 'SECURITY_ERROR';
      if (errorMessage.includes('permission denied')) return 'SECURITY_ERROR';
    }
    
    return 'UNKNOWN_ERROR';
  }

  /**
   * Get error message from error object
   */
  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    
    return String(error);
  }

  /**
   * Get current error metrics
   */
  getMetrics(): ErrorMetrics {
    return { ...this.metrics };
  }

  /**
   * Get recent errors for monitoring
   */
  getRecentErrors(limit: number = 10): ErrorLogEntry[] {
    return this.metrics.recentErrors.slice(-limit);
  }

  /**
   * Clear error metrics (useful for testing)
   */
  clearMetrics(): void {
    this.metrics = {
      totalErrors: 0,
      errorsByType: new Map(),
      errorsByComponent: new Map(),
      recentErrors: [],
      errorRate: 0,
      lastErrorTime: null
    };
  }

  /**
   * Check if system is healthy based on error metrics
   */
  isSystemHealthy(): boolean {
    const maxErrorRate = 5; // errors per minute
    const maxRecentErrors = 20;
    
    return this.metrics.errorRate < maxErrorRate && 
           this.metrics.recentErrors.length < maxRecentErrors;
  }

  /**
   * Get system health status
   */
  getHealthStatus(): {
    isHealthy: boolean;
    errorRate: number;
    totalErrors: number;
    recentErrorCount: number;
    lastErrorTime: Date | null;
  } {
    return {
      isHealthy: this.isSystemHealthy(),
      errorRate: this.metrics.errorRate,
      totalErrors: this.metrics.totalErrors,
      recentErrorCount: this.metrics.recentErrors.length,
      lastErrorTime: this.metrics.lastErrorTime
    };
  }

  /**
   * Get enhanced error logger for direct access
   */
  getErrorLogger(): ErrorLogger {
    return this.errorLogger;
  }

  /**
   * Get detailed error statistics
   */
  getDetailedStatistics(): {
    basicMetrics: ErrorMetrics;
    enhancedStats: ReturnType<ErrorLogger['getStatistics']>;
    healthStatus: ReturnType<GlobalErrorHandler['getHealthStatus']>;
  } {
    return {
      basicMetrics: this.getMetrics(),
      enhancedStats: this.errorLogger.getStatistics(),
      healthStatus: this.getHealthStatus()
    };
  }

  /**
   * Update error logging configuration
   */
  updateLoggingConfig(config: Parameters<ErrorLogger['updateConfig']>[0]): void {
    this.errorLogger.updateConfig(config);
    this.logger.info('Error logging configuration updated');
  }
}

/**
 * Global instance of the error handler
 */
export const globalErrorHandler = new GlobalErrorHandler();

/**
 * Convenience function to handle errors
 */
export async function handleError(
  error: unknown,
  context?: ConversationContext,
  metadata?: Record<string, unknown>
): Promise<ErrorResponse> {
  return globalErrorHandler.handleError(error, context, metadata);
}

/**
 * Convenience function to register error handlers
 */
export function registerErrorHandler(errorCode: string, handler: ErrorHandlerFunction): void {
  globalErrorHandler.registerErrorHandler(errorCode, handler);
}

/**
 * Export types for use in other modules
 */
export type { ErrorMetrics, ErrorLogEntry, ErrorHandlerFunction };