import { TestRailError, ConfigurationError, ValidationError } from '../types';
import { Logger } from './Logger';
import { CircuitBreaker } from './CircuitBreaker';

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

/**
 * Error categories for better classification
 */
export enum ErrorCategory {
  NETWORK = 'NETWORK',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  CONFIGURATION = 'CONFIGURATION',
  API = 'API',
  TIMEOUT = 'TIMEOUT',
  RATE_LIMIT = 'RATE_LIMIT',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Enhanced error information
 */
export interface ErrorInfo {
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  originalError: Error;
  context: Record<string, unknown> | undefined;
  timestamp: number;
  retryable: boolean;
  suggestedAction: string | undefined;
}

/**
 * Error recovery strategy
 */
export interface RecoveryStrategy {
  maxRetries: number;
  backoffMultiplier: number;
  baseDelay: number;
  maxDelay: number;
  retryCondition: (error: ErrorInfo) => boolean;
}

/**
 * Enhanced error handling system with recovery strategies
 */
export class ErrorHandler {
  private logger: Logger;
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private errorHistory: ErrorInfo[] = [];
  private maxHistorySize = 1000;

  constructor() {
    this.logger = new Logger('ErrorHandler');
  }

  /**
   * Process and classify an error
   */
  processError(error: Error, context?: Record<string, unknown>): ErrorInfo {
    const errorInfo: ErrorInfo = {
      category: this.categorizeError(error),
      severity: this.determineSeverity(error),
      message: error.message,
      originalError: error,
      context,
      timestamp: Date.now(),
      retryable: this.isRetryable(error),
      suggestedAction: this.getSuggestedAction(error)
    };

    // Add to error history
    this.addToHistory(errorInfo);

    // Log the error
    this.logError(errorInfo);

    return errorInfo;
  }

  /**
   * Execute function with error handling and recovery
   */
  async executeWithRecovery<T>(
    fn: () => Promise<T>,
    strategy: Partial<RecoveryStrategy> = {},
    context?: Record<string, unknown>
  ): Promise<T> {
    const recoveryStrategy: RecoveryStrategy = {
      maxRetries: strategy.maxRetries || 3,
      backoffMultiplier: strategy.backoffMultiplier || 2,
      baseDelay: strategy.baseDelay || 1000,
      maxDelay: strategy.maxDelay || 30000,
      retryCondition: strategy.retryCondition || ((errorInfo) => errorInfo.retryable),
      ...strategy
    };

    let lastError: ErrorInfo | null = null;

    for (let attempt = 1; attempt <= recoveryStrategy.maxRetries + 1; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = this.processError(error as Error, { 
          ...context, 
          attempt, 
          maxRetries: recoveryStrategy.maxRetries 
        });

        // Don't retry on last attempt or if not retryable
        if (attempt > recoveryStrategy.maxRetries || !recoveryStrategy.retryCondition(lastError)) {
          break;
        }

        // Calculate delay for next attempt
        const delay = Math.min(
          recoveryStrategy.baseDelay * Math.pow(recoveryStrategy.backoffMultiplier, attempt - 1),
          recoveryStrategy.maxDelay
        );

        this.logger.warn('Retrying after error', {
          attempt,
          delay,
          error: lastError.message,
          category: lastError.category
        });

        await this.delay(delay);
      }
    }

    // All retries exhausted, throw the last error
    throw lastError?.originalError || new Error('Unknown error occurred');
  }

  /**
   * Execute function with circuit breaker protection
   */
  async executeWithCircuitBreaker<T>(
    name: string,
    fn: () => Promise<T>,
    context?: Record<string, unknown>
  ): Promise<T> {
    let circuitBreaker = this.circuitBreakers.get(name);
    
    if (!circuitBreaker) {
      circuitBreaker = new CircuitBreaker(name);
      this.circuitBreakers.set(name, circuitBreaker);
    }

    try {
      return await circuitBreaker.execute(fn);
    } catch (error) {
      const errorInfo = this.processError(error as Error, { 
        ...context, 
        circuitBreaker: name,
        circuitState: circuitBreaker.getStatus().state
      });
      throw errorInfo.originalError;
    }
  }

  /**
   * Categorize error based on type and properties
   */
  private categorizeError(error: Error): ErrorCategory {
    if (error instanceof ConfigurationError) {
      return ErrorCategory.CONFIGURATION;
    }

    if (error instanceof ValidationError) {
      return ErrorCategory.VALIDATION;
    }

    if (error instanceof TestRailError) {
      const statusCode = error.statusCode;
      
      if (statusCode === 401) {
        return ErrorCategory.AUTHENTICATION;
      }
      
      if (statusCode === 403) {
        return ErrorCategory.AUTHORIZATION;
      }
      
      if (statusCode === 429) {
        return ErrorCategory.RATE_LIMIT;
      }
      
      if (statusCode && statusCode >= 500) {
        return ErrorCategory.API;
      }
      
      return ErrorCategory.API;
    }

    // Check error message for common patterns
    const message = error.message.toLowerCase();
    
    if (message.includes('timeout') || message.includes('timed out')) {
      return ErrorCategory.TIMEOUT;
    }
    
    if (message.includes('network') || message.includes('connection') || message.includes('fetch')) {
      return ErrorCategory.NETWORK;
    }

    return ErrorCategory.UNKNOWN;
  }

  /**
   * Determine error severity
   */
  private determineSeverity(error: Error): ErrorSeverity {
    if (error instanceof ConfigurationError) {
      return ErrorSeverity.HIGH;
    }

    if (error instanceof TestRailError) {
      const statusCode = error.statusCode;
      
      if (statusCode === 401 || statusCode === 403) {
        return ErrorSeverity.HIGH;
      }
      
      if (statusCode && statusCode >= 500) {
        return ErrorSeverity.MEDIUM;
      }
      
      if (statusCode === 429) {
        return ErrorSeverity.LOW;
      }
    }

    const message = error.message.toLowerCase();
    
    if (message.includes('critical') || message.includes('fatal')) {
      return ErrorSeverity.CRITICAL;
    }
    
    if (message.includes('timeout') || message.includes('timed out')) {
      return ErrorSeverity.MEDIUM;
    }

    return ErrorSeverity.LOW;
  }

  /**
   * Check if error is retryable
   */
  private isRetryable(error: Error): boolean {
    if (error instanceof ConfigurationError || error instanceof ValidationError) {
      return false;
    }

    if (error instanceof TestRailError) {
      const statusCode = error.statusCode;
      
      // Don't retry authentication/authorization errors
      if (statusCode === 401 || statusCode === 403) {
        return false;
      }
      
      // Don't retry client errors (4xx except 429)
      if (statusCode && statusCode >= 400 && statusCode < 500 && statusCode !== 429) {
        return false;
      }
      
      // Retry server errors and rate limiting
      return true;
    }

    // Retry network and timeout errors
    const message = error.message.toLowerCase();
    return message.includes('network') || 
           message.includes('timeout') || 
           message.includes('timed out') ||
           message.includes('connection') ||
           message.includes('fetch');
  }

  /**
   * Get suggested action for error
   */
  private getSuggestedAction(error: Error): string {
    if (error instanceof ConfigurationError) {
      return 'Check configuration settings and environment variables';
    }

    if (error instanceof ValidationError) {
      return 'Validate input data and fix validation errors';
    }

    if (error instanceof TestRailError) {
      const statusCode = error.statusCode;
      
      if (statusCode === 401) {
        return 'Check TestRail credentials and API key';
      }
      
      if (statusCode === 403) {
        return 'Check user permissions in TestRail';
      }
      
      if (statusCode === 404) {
        return 'Verify resource exists in TestRail';
      }
      
      if (statusCode === 429) {
        return 'Reduce request rate or wait before retrying';
      }
      
      if (statusCode && statusCode >= 500) {
        return 'TestRail server error - retry or contact support';
      }
    }

    const message = error.message.toLowerCase();
    
    if (message.includes('timeout') || message.includes('timed out')) {
      return 'Increase timeout value or check network connectivity';
    }
    
    if (message.includes('network') || message.includes('connection')) {
      return 'Check network connectivity and TestRail server status';
    }

    return 'Review error details and check logs for more information';
  }

  /**
   * Add error to history
   */
  private addToHistory(errorInfo: ErrorInfo): void {
    this.errorHistory.push(errorInfo);
    
    // Maintain history size limit
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Log error with appropriate level
   */
  private logError(errorInfo: ErrorInfo): void {
    const logData = {
      category: errorInfo.category,
      severity: errorInfo.severity,
      message: errorInfo.message,
      context: errorInfo.context,
      retryable: errorInfo.retryable,
      suggestedAction: errorInfo.suggestedAction
    };

    switch (errorInfo.severity) {
      case ErrorSeverity.CRITICAL:
        this.logger.error('Critical error occurred', logData);
        break;
      case ErrorSeverity.HIGH:
        this.logger.error('High severity error', logData);
        break;
      case ErrorSeverity.MEDIUM:
        this.logger.warn('Medium severity error', logData);
        break;
      case ErrorSeverity.LOW:
        this.logger.info('Low severity error', logData);
        break;
    }
  }

  /**
   * Get error statistics
   */
  getErrorStats(timeWindowMs = 3600000): { // 1 hour default
    total: number;
    byCategory: Record<ErrorCategory, number>;
    bySeverity: Record<ErrorSeverity, number>;
    retryableCount: number;
  } {
    const cutoff = Date.now() - timeWindowMs;
    const recentErrors = this.errorHistory.filter(error => error.timestamp >= cutoff);

    const stats = {
      total: recentErrors.length,
      byCategory: {} as Record<ErrorCategory, number>,
      bySeverity: {} as Record<ErrorSeverity, number>,
      retryableCount: 0
    };

    // Initialize counters
    Object.values(ErrorCategory).forEach(category => {
      stats.byCategory[category] = 0;
    });
    
    Object.values(ErrorSeverity).forEach(severity => {
      stats.bySeverity[severity] = 0;
    });

    // Count errors
    recentErrors.forEach(error => {
      stats.byCategory[error.category]++;
      stats.bySeverity[error.severity]++;
      if (error.retryable) {
        stats.retryableCount++;
      }
    });

    return stats;
  }

  /**
   * Get circuit breaker status for all breakers
   */
  getCircuitBreakerStatus(): Record<string, ReturnType<CircuitBreaker['getStatus']>> {
    const status: Record<string, ReturnType<CircuitBreaker['getStatus']>> = {};
    
    this.circuitBreakers.forEach((breaker, name) => {
      status[name] = breaker.getStatus();
    });

    return status;
  }

  /**
   * Reset all circuit breakers
   */
  resetAllCircuitBreakers(): void {
    this.circuitBreakers.forEach(breaker => breaker.reset());
    this.logger.info('All circuit breakers reset');
  }

  /**
   * Clear error history
   */
  clearErrorHistory(): void {
    this.errorHistory = [];
    this.logger.info('Error history cleared');
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}