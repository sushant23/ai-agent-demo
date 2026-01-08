// Error handling utilities

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly timestamp: Date;

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date();

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, field?: string) {
    const code = field ? `VALIDATION_ERROR_${field.toUpperCase()}` : 'VALIDATION_ERROR';
    super(message, code, 400);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} with id ${id} not found` : `${resource} not found`;
    super(message, 'NOT_FOUND', 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized access') {
    super(message, 'UNAUTHORIZED', 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden access') {
    super(message, 'FORBIDDEN', 403);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 'RATE_LIMIT_EXCEEDED', 429);
  }
}

export class ExternalServiceError extends AppError {
  public readonly service: string;

  constructor(service: string, message: string) {
    super(`External service error (${service}): ${message}`, 'EXTERNAL_SERVICE_ERROR', 502);
    this.service = service;
  }
}

export class TimeoutError extends AppError {
  constructor(operation: string, timeout: number) {
    super(`Operation ${operation} timed out after ${timeout}ms`, 'TIMEOUT', 408);
  }
}

export class LLMProviderError extends AppError {
  public readonly provider: string;
  public readonly operation: string;

  constructor(message: string, provider: string, operation: string) {
    super(message, 'LLM_PROVIDER_ERROR', 502);
    this.provider = provider;
    this.operation = operation;
  }
}

export class ToolValidationError extends AppError {
  public readonly validationErrors: Array<{ field: string; message: string; code: string }>;

  constructor(message: string, validationErrors: Array<{ field: string; message: string; code: string }> = []) {
    super(message, 'TOOL_VALIDATION_ERROR', 400);
    this.validationErrors = validationErrors;
  }
}

export class ToolNotFoundError extends AppError {
  public readonly toolId: string;
  public readonly version?: string;

  constructor(message: string, toolId?: string, version?: string) {
    super(message, 'TOOL_NOT_FOUND', 404);
    this.toolId = toolId || 'unknown';
    if (version !== undefined) {
      this.version = version;
    }
  }
}

export class ToolExecutionError extends AppError {
  public readonly toolId: string;
  public readonly details?: Record<string, unknown>;

  constructor(message: string, toolId: string, details?: Record<string, unknown>) {
    super(message, 'TOOL_EXECUTION_ERROR', 500);
    this.toolId = toolId;
    if (details !== undefined) {
      this.details = details;
    }
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function isOperationalError(error: unknown): boolean {
  return isAppError(error) && error.isOperational;
}

export function formatError(error: unknown): string {
  if (isAppError(error)) {
    return `[${error.code}] ${error.message}`;
  } else if (error instanceof Error) {
    return error.message;
  } else {
    return String(error);
  }
}

export function createErrorResponse(error: unknown): {
  message: string;
  code: string;
  statusCode: number;
  timestamp: string;
} {
  if (isAppError(error)) {
    return {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      timestamp: error.timestamp.toISOString(),
    };
  } else if (error instanceof Error) {
    return {
      message: error.message,
      code: 'INTERNAL_ERROR',
      statusCode: 500,
      timestamp: new Date().toISOString(),
    };
  } else {
    return {
      message: 'An unknown error occurred',
      code: 'UNKNOWN_ERROR',
      statusCode: 500,
      timestamp: new Date().toISOString(),
    };
  }
}

// Simple Logger class for application logging
export class Logger {
  private context: string;

  constructor(context: string = 'App') {
    this.context = context;
  }

  private formatMessage(level: string, message: string, ...args: unknown[]): string {
    const timestamp = new Date().toISOString();
    const formattedArgs = args.length > 0 ? ` ${args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ')}` : '';
    return `[${timestamp}] [${level}] [${this.context}] ${message}${formattedArgs}`;
  }

  debug(message: string, ...args: unknown[]): void {
    console.debug(this.formatMessage('DEBUG', message, ...args));
  }

  info(message: string, ...args: unknown[]): void {
    console.info(this.formatMessage('INFO', message, ...args));
  }

  warn(message: string, ...args: unknown[]): void {
    console.warn(this.formatMessage('WARN', message, ...args));
  }

  error(message: string, error?: unknown, ...args: unknown[]): void {
    const errorInfo = error instanceof Error ? error.stack || error.message : error;
    console.error(this.formatMessage('ERROR', message, errorInfo, ...args));
  }
}
