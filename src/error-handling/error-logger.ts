/**
 * Enhanced Error Logging System
 * 
 * Provides structured logging, error categorization, and integration
 * with monitoring systems for comprehensive error tracking.
 */

import { Logger } from '../utils/errors';
import type { ConversationContext } from '../types/context';

/**
 * Log levels for error categorization
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  CRITICAL = 'critical'
}

/**
 * Error category for better organization
 */
export enum ErrorCategory {
  SYSTEM = 'system',
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  VALIDATION = 'validation',
  BUSINESS_LOGIC = 'business_logic',
  EXTERNAL_SERVICE = 'external_service',
  USER_INPUT = 'user_input',
  CONFIGURATION = 'configuration'
}

/**
 * Structured error log entry
 */
export interface StructuredErrorLog {
  timestamp: Date;
  level: LogLevel;
  category: ErrorCategory;
  errorCode: string;
  message: string;
  component: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  stackTrace?: string;
  context?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  tags?: string[];
  correlationId?: string;
}

/**
 * Error logging configuration
 */
export interface ErrorLoggingConfig {
  enabled: boolean;
  logLevel: LogLevel;
  includeStackTrace: boolean;
  includeSensitiveData: boolean;
  maxLogSize: number; // in bytes
  rotationPolicy: 'daily' | 'weekly' | 'size-based';
  retentionDays: number;
  destinations: LogDestination[];
}

/**
 * Log destination configuration
 */
export interface LogDestination {
  type: 'console' | 'file' | 'database' | 'external';
  config: Record<string, unknown>;
  enabled: boolean;
  filters?: LogFilter[];
}

/**
 * Log filtering configuration
 */
export interface LogFilter {
  field: keyof StructuredErrorLog;
  operator: 'equals' | 'contains' | 'startsWith' | 'regex';
  value: string | RegExp;
  exclude?: boolean;
}

/**
 * Enhanced error logger class
 */
export class ErrorLogger {
  private logger: Logger;
  private config: ErrorLoggingConfig;
  private logBuffer: StructuredErrorLog[] = [];
  private maxBufferSize = 1000;

  constructor(config: ErrorLoggingConfig) {
    this.logger = new Logger('ErrorLogger');
    this.config = config;
  }

  /**
   * Log a structured error
   */
  async logError(
    error: unknown,
    context?: {
      component?: string;
      userId?: string;
      sessionId?: string;
      requestId?: string;
      conversationContext?: ConversationContext;
      metadata?: Record<string, unknown>;
      tags?: string[];
    }
  ): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    const structuredLog = this.createStructuredLog(error, context);
    
    // Check if log level meets threshold
    if (!this.shouldLog(structuredLog.level)) {
      return;
    }

    // Add to buffer
    this.addToBuffer(structuredLog);

    // Send to configured destinations
    await this.sendToDestinations(structuredLog);
  }

  /**
   * Log an error with specific category and level
   */
  async logCategorizedError(
    error: unknown,
    category: ErrorCategory,
    level: LogLevel,
    context?: {
      component?: string;
      userId?: string;
      sessionId?: string;
      requestId?: string;
      metadata?: Record<string, unknown>;
      tags?: string[];
    }
  ): Promise<void> {
    const structuredLog = this.createStructuredLog(error, context);
    structuredLog.category = category;
    structuredLog.level = level;

    if (!this.shouldLog(level)) {
      return;
    }

    this.addToBuffer(structuredLog);
    await this.sendToDestinations(structuredLog);
  }

  /**
   * Create structured log entry from error
   */
  private createStructuredLog(
    error: unknown,
    context?: {
      component?: string;
      userId?: string;
      sessionId?: string;
      requestId?: string;
      conversationContext?: ConversationContext;
      metadata?: Record<string, unknown>;
      tags?: string[];
    }
  ): StructuredErrorLog {
    const timestamp = new Date();
    const errorCode = this.extractErrorCode(error);
    const message = this.extractErrorMessage(error);
    const category = this.categorizeError(error, errorCode);
    const level = this.determineLogLevel(error, category);

    const structuredLog: StructuredErrorLog = {
      timestamp,
      level,
      category,
      errorCode,
      message,
      component: context?.component || 'unknown',
      requestId: context?.requestId || this.generateRequestId(),
      correlationId: this.generateCorrelationId(context?.conversationContext),
      tags: context?.tags || [],
      metadata: {
        ...context?.metadata,
        errorType: typeof error,
        errorName: error instanceof Error ? error.name : 'Unknown'
      }
    };

    // Add optional properties only if they exist
    if (context?.userId) {
      structuredLog.userId = context.userId;
    }
    if (context?.sessionId) {
      structuredLog.sessionId = context.sessionId;
    }

    // Add stack trace if enabled and available
    if (this.config.includeStackTrace && error instanceof Error && error.stack) {
      structuredLog.stackTrace = error.stack;
    }

    // Add conversation context if available
    if (context?.conversationContext) {
      structuredLog.context = {
        userId: context.conversationContext.userId,
        sessionId: context.conversationContext.sessionId,
        conversationLength: context.conversationContext.conversationHistory.length,
        lastUpdated: context.conversationContext.lastUpdated,
        hasBusinessData: !!context.conversationContext.businessData
      };
    }

    return structuredLog;
  }

  /**
   * Extract error code from error object
   */
  private extractErrorCode(error: unknown): string {
    if (error && typeof error === 'object') {
      if ('code' in error && typeof error.code === 'string') {
        return error.code;
      }
      if ('name' in error && typeof error.name === 'string') {
        return error.name;
      }
    }
    
    if (error instanceof Error) {
      return error.name || 'Error';
    }
    
    return 'UNKNOWN_ERROR';
  }

  /**
   * Extract error message from error object
   */
  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    
    if (typeof error === 'string') {
      return error;
    }
    
    return String(error);
  }

  /**
   * Categorize error based on type and code
   */
  private categorizeError(error: unknown, errorCode: string): ErrorCategory {
    const code = errorCode.toLowerCase();
    const message = this.extractErrorMessage(error).toLowerCase();

    // Network and connectivity
    if (code.includes('network') || code.includes('timeout') || code.includes('connection')) {
      return ErrorCategory.NETWORK;
    }

    // Authentication and authorization
    if (code.includes('auth') || code.includes('unauthorized') || code.includes('forbidden')) {
      return ErrorCategory.AUTHENTICATION;
    }

    // Validation errors
    if (code.includes('validation') || code.includes('invalid') || message.includes('validation')) {
      return ErrorCategory.VALIDATION;
    }

    // External service errors
    if (code.includes('external') || code.includes('api') || code.includes('provider')) {
      return ErrorCategory.EXTERNAL_SERVICE;
    }

    // Configuration errors
    if (code.includes('config') || code.includes('configuration')) {
      return ErrorCategory.CONFIGURATION;
    }

    // Business logic errors
    if (code.includes('business') || code.includes('tool') || code.includes('recommendation')) {
      return ErrorCategory.BUSINESS_LOGIC;
    }

    // User input errors
    if (code.includes('user') || code.includes('input') || message.includes('user')) {
      return ErrorCategory.USER_INPUT;
    }

    // Default to system
    return ErrorCategory.SYSTEM;
  }

  /**
   * Determine appropriate log level
   */
  private determineLogLevel(error: unknown, category: ErrorCategory): LogLevel {
    const errorCode = this.extractErrorCode(error).toLowerCase();
    const message = this.extractErrorMessage(error).toLowerCase();

    // Critical errors
    if (errorCode.includes('critical') || message.includes('critical') || 
        errorCode.includes('fatal') || message.includes('fatal')) {
      return LogLevel.CRITICAL;
    }

    // System and configuration errors are typically errors
    if (category === ErrorCategory.SYSTEM || category === ErrorCategory.CONFIGURATION) {
      return LogLevel.ERROR;
    }

    // Network errors can be warnings (often temporary)
    if (category === ErrorCategory.NETWORK) {
      return LogLevel.WARN;
    }

    // Authentication errors are errors
    if (category === ErrorCategory.AUTHENTICATION) {
      return LogLevel.ERROR;
    }

    // Validation and user input errors are warnings
    if (category === ErrorCategory.VALIDATION || category === ErrorCategory.USER_INPUT) {
      return LogLevel.WARN;
    }

    // External service errors are warnings (often temporary)
    if (category === ErrorCategory.EXTERNAL_SERVICE) {
      return LogLevel.WARN;
    }

    // Business logic errors are errors
    if (category === ErrorCategory.BUSINESS_LOGIC) {
      return LogLevel.ERROR;
    }

    return LogLevel.ERROR; // Default
  }

  /**
   * Check if log should be recorded based on level
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR, LogLevel.CRITICAL];
    const configLevelIndex = levels.indexOf(this.config.logLevel);
    const logLevelIndex = levels.indexOf(level);
    
    return logLevelIndex >= configLevelIndex;
  }

  /**
   * Add log to buffer
   */
  private addToBuffer(log: StructuredErrorLog): void {
    this.logBuffer.push(log);
    
    // Maintain buffer size
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift();
    }
  }

  /**
   * Send log to configured destinations
   */
  private async sendToDestinations(log: StructuredErrorLog): Promise<void> {
    const promises = this.config.destinations
      .filter(dest => dest.enabled)
      .filter(dest => this.passesFilters(log, dest.filters || []))
      .map(dest => this.sendToDestination(log, dest));

    await Promise.allSettled(promises);
  }

  /**
   * Check if log passes destination filters
   */
  private passesFilters(log: StructuredErrorLog, filters: LogFilter[]): boolean {
    return filters.every(filter => {
      const fieldValue = log[filter.field];
      const passes = this.evaluateFilter(fieldValue, filter);
      return filter.exclude ? !passes : passes;
    });
  }

  /**
   * Evaluate a single filter
   */
  private evaluateFilter(fieldValue: unknown, filter: LogFilter): boolean {
    const value = String(fieldValue || '');
    const filterValue = String(filter.value);

    switch (filter.operator) {
      case 'equals':
        return value === filterValue;
      case 'contains':
        return value.includes(filterValue);
      case 'startsWith':
        return value.startsWith(filterValue);
      case 'regex': {
        const regex = filter.value instanceof RegExp ? filter.value : new RegExp(filterValue);
        return regex.test(value);
      }
      default:
        return false;
    }
  }

  /**
   * Send log to specific destination
   */
  private async sendToDestination(log: StructuredErrorLog, destination: LogDestination): Promise<void> {
    try {
      switch (destination.type) {
        case 'console':
          this.sendToConsole(log);
          break;
        case 'file':
          await this.sendToFile(log, destination.config);
          break;
        case 'database':
          await this.sendToDatabase(log, destination.config);
          break;
        case 'external':
          await this.sendToExternal(log, destination.config);
          break;
      }
    } catch (error) {
      this.logger.error(`Failed to send log to ${destination.type}`, error);
    }
  }

  /**
   * Send log to console
   */
  private sendToConsole(log: StructuredErrorLog): void {
    const logMessage = this.formatLogMessage(log);
    
    switch (log.level) {
      case LogLevel.DEBUG:
        console.debug(logMessage);
        break;
      case LogLevel.INFO:
        console.info(logMessage);
        break;
      case LogLevel.WARN:
        console.warn(logMessage);
        break;
      case LogLevel.ERROR:
        console.error(logMessage);
        break;
      case LogLevel.CRITICAL:
        console.error(`[CRITICAL] ${logMessage}`);
        break;
    }
  }

  /**
   * Send log to file (placeholder implementation)
   */
  private async sendToFile(log: StructuredErrorLog, config: Record<string, unknown>): Promise<void> {
    // In a real implementation, this would write to a file
    // For now, just log that it would be written
    this.logger.info(`Would write to file: ${config.filename || 'error.log'}`, log);
  }

  /**
   * Send log to database (placeholder implementation)
   */
  private async sendToDatabase(log: StructuredErrorLog, config: Record<string, unknown>): Promise<void> {
    // In a real implementation, this would write to a database
    this.logger.info(`Would write to database: ${config.table || 'error_logs'}`, log);
  }

  /**
   * Send log to external service (placeholder implementation)
   */
  private async sendToExternal(log: StructuredErrorLog, config: Record<string, unknown>): Promise<void> {
    // In a real implementation, this would send to external logging service
    this.logger.info(`Would send to external service: ${config.endpoint || 'unknown'}`, log);
  }

  /**
   * Format log message for display
   */
  private formatLogMessage(log: StructuredErrorLog): string {
    const parts = [
      `[${log.timestamp.toISOString()}]`,
      `[${log.level.toUpperCase()}]`,
      `[${log.category}]`,
      `[${log.component}]`,
      `${log.errorCode}: ${log.message}`
    ];

    if (log.userId) {
      parts.splice(4, 0, `[User: ${log.userId}]`);
    }

    if (log.requestId) {
      parts.splice(-1, 0, `[Req: ${log.requestId.substring(0, 8)}]`);
    }

    return parts.join(' ');
  }

  /**
   * Generate request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Generate correlation ID from conversation context
   */
  private generateCorrelationId(context?: ConversationContext): string {
    if (context) {
      return `${context.userId}_${context.sessionId}`;
    }
    return `corr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Get recent logs from buffer
   */
  getRecentLogs(limit: number = 50): StructuredErrorLog[] {
    return this.logBuffer.slice(-limit);
  }

  /**
   * Get logs by category
   */
  getLogsByCategory(category: ErrorCategory, limit: number = 50): StructuredErrorLog[] {
    return this.logBuffer
      .filter(log => log.category === category)
      .slice(-limit);
  }

  /**
   * Get logs by level
   */
  getLogsByLevel(level: LogLevel, limit: number = 50): StructuredErrorLog[] {
    return this.logBuffer
      .filter(log => log.level === level)
      .slice(-limit);
  }

  /**
   * Clear log buffer
   */
  clearBuffer(): void {
    this.logBuffer = [];
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ErrorLoggingConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.logger.info('Error logging configuration updated');
  }

  /**
   * Get logging statistics
   */
  getStatistics(): {
    totalLogs: number;
    logsByLevel: Record<LogLevel, number>;
    logsByCategory: Record<ErrorCategory, number>;
    bufferSize: number;
    oldestLog?: Date;
    newestLog?: Date;
  } {
    const logsByLevel = {} as Record<LogLevel, number>;
    const logsByCategory = {} as Record<ErrorCategory, number>;

    // Initialize counters
    Object.values(LogLevel).forEach(level => {
      logsByLevel[level] = 0;
    });
    Object.values(ErrorCategory).forEach(category => {
      logsByCategory[category] = 0;
    });

    // Count logs
    this.logBuffer.forEach(log => {
      logsByLevel[log.level]++;
      logsByCategory[log.category]++;
    });

    const result = {
      totalLogs: this.logBuffer.length,
      logsByLevel,
      logsByCategory,
      bufferSize: this.logBuffer.length
    } as {
      totalLogs: number;
      logsByLevel: Record<LogLevel, number>;
      logsByCategory: Record<ErrorCategory, number>;
      bufferSize: number;
      oldestLog?: Date;
      newestLog?: Date;
    };

    if (this.logBuffer.length > 0) {
      const oldestTimestamp = this.logBuffer[0]?.timestamp;
      const newestTimestamp = this.logBuffer[this.logBuffer.length - 1]?.timestamp;
      
      if (oldestTimestamp) {
        result.oldestLog = oldestTimestamp;
      }
      if (newestTimestamp) {
        result.newestLog = newestTimestamp;
      }
    }

    return result;
  }
}

/**
 * Create default error logging configuration
 */
export function createDefaultErrorLoggingConfig(): ErrorLoggingConfig {
  return {
    enabled: true,
    logLevel: LogLevel.WARN,
    includeStackTrace: true,
    includeSensitiveData: false,
    maxLogSize: 10 * 1024 * 1024, // 10MB
    rotationPolicy: 'daily',
    retentionDays: 30,
    destinations: [
      {
        type: 'console',
        enabled: true,
        config: {},
        filters: []
      }
    ]
  };
}

/**
 * Create error logger with default configuration
 */
export function createErrorLogger(config?: Partial<ErrorLoggingConfig>): ErrorLogger {
  const defaultConfig = createDefaultErrorLoggingConfig();
  const finalConfig = { ...defaultConfig, ...config };
  return new ErrorLogger(finalConfig);
}