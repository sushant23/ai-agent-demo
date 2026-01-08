/**
 * Error Handling Module
 * 
 * Provides comprehensive error handling, logging, and monitoring
 * for the LLM Agnostic AI Agent system.
 */

export {
  GlobalErrorHandler,
  globalErrorHandler,
  handleError,
  registerErrorHandler,
  type ErrorMetrics,
  type ErrorLogEntry,
  type ErrorHandlerFunction
} from './global-error-handler';

export {
  UserFriendlyErrorMessages,
  createUserFriendlyMessage,
  getRecoveryActions,
  createContextualErrorMessage
} from './user-friendly-messages';

export {
  ErrorMonitor,
  createErrorMonitor,
  createDefaultMonitoringConfig,
  type ErrorAlert,
  type MonitoringConfig,
  type AlertCondition,
  type AlertAction
} from './error-monitor';

export {
  ErrorLogger,
  createErrorLogger,
  createDefaultErrorLoggingConfig,
  LogLevel,
  ErrorCategory,
  type StructuredErrorLog,
  type ErrorLoggingConfig,
  type LogDestination,
  type LogFilter
} from './error-logger';