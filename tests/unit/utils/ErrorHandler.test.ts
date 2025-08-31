import { ErrorHandler, ErrorSeverity, ErrorCategory } from '../../../src/utils/ErrorHandler';
import { TestRailError, ConfigurationError, ValidationError } from '../../../src/types';

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler;

  beforeEach(() => {
    errorHandler = new ErrorHandler();
  });

  describe('processError', () => {
    it('should categorize TestRail authentication error', () => {
      const error = new TestRailError('Authentication failed', 401);
      const errorInfo = errorHandler.processError(error);

      expect(errorInfo.category).toBe(ErrorCategory.AUTHENTICATION);
      expect(errorInfo.severity).toBe(ErrorSeverity.HIGH);
      expect(errorInfo.retryable).toBe(false);
      expect(errorInfo.suggestedAction).toContain('credentials');
    });

    it('should categorize TestRail authorization error', () => {
      const error = new TestRailError('Access forbidden', 403);
      const errorInfo = errorHandler.processError(error);

      expect(errorInfo.category).toBe(ErrorCategory.AUTHORIZATION);
      expect(errorInfo.severity).toBe(ErrorSeverity.HIGH);
      expect(errorInfo.retryable).toBe(false);
      expect(errorInfo.suggestedAction).toContain('permissions');
    });

    it('should categorize rate limit error', () => {
      const error = new TestRailError('Rate limit exceeded', 429);
      const errorInfo = errorHandler.processError(error);

      expect(errorInfo.category).toBe(ErrorCategory.RATE_LIMIT);
      expect(errorInfo.severity).toBe(ErrorSeverity.LOW);
      expect(errorInfo.retryable).toBe(true);
      expect(errorInfo.suggestedAction).toContain('rate');
    });

    it('should categorize server error', () => {
      const error = new TestRailError('Internal server error', 500);
      const errorInfo = errorHandler.processError(error);

      expect(errorInfo.category).toBe(ErrorCategory.API);
      expect(errorInfo.severity).toBe(ErrorSeverity.MEDIUM);
      expect(errorInfo.retryable).toBe(true);
      expect(errorInfo.suggestedAction).toContain('server error');
    });

    it('should categorize configuration error', () => {
      const error = new ConfigurationError('Invalid configuration');
      const errorInfo = errorHandler.processError(error);

      expect(errorInfo.category).toBe(ErrorCategory.CONFIGURATION);
      expect(errorInfo.severity).toBe(ErrorSeverity.HIGH);
      expect(errorInfo.retryable).toBe(false);
      expect(errorInfo.suggestedAction).toContain('configuration');
    });

    it('should categorize validation error', () => {
      const error = new ValidationError('Invalid input');
      const errorInfo = errorHandler.processError(error);

      expect(errorInfo.category).toBe(ErrorCategory.VALIDATION);
      expect(errorInfo.retryable).toBe(false);
      expect(errorInfo.suggestedAction).toContain('validation');
    });

    it('should categorize network error', () => {
      const error = new Error('Network connection failed');
      const errorInfo = errorHandler.processError(error);

      expect(errorInfo.category).toBe(ErrorCategory.NETWORK);
      expect(errorInfo.retryable).toBe(true);
      expect(errorInfo.suggestedAction).toContain('network');
    });

    it('should categorize timeout error', () => {
      const error = new Error('Request timed out');
      const errorInfo = errorHandler.processError(error);

      expect(errorInfo.category).toBe(ErrorCategory.TIMEOUT);
      expect(errorInfo.severity).toBe(ErrorSeverity.MEDIUM);
      expect(errorInfo.retryable).toBe(true);
      expect(errorInfo.suggestedAction).toContain('timeout');
    });

    it('should include context information', () => {
      const error = new Error('Test error');
      const context = { operation: 'test', userId: 123 };
      const errorInfo = errorHandler.processError(error, context);

      expect(errorInfo.context).toEqual(context);
      expect(errorInfo.timestamp).toBeGreaterThan(0);
      expect(errorInfo.originalError).toBe(error);
    });
  });

  describe('executeWithRecovery', () => {
    it('should execute function successfully without retry', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');

      const result = await errorHandler.executeWithRecovery(mockFn);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable errors', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce('success');

      const result = await errorHandler.executeWithRecovery(mockFn, {
        maxRetries: 3,
        baseDelay: 10 // Short delay for testing
      });

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should not retry on non-retryable errors', async () => {
      const mockFn = jest.fn().mockRejectedValue(new ConfigurationError('Config error'));

      await expect(
        errorHandler.executeWithRecovery(mockFn, { maxRetries: 3 })
      ).rejects.toThrow('Config error');

      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should respect max retries', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Network error'));

      await expect(
        errorHandler.executeWithRecovery(mockFn, { 
          maxRetries: 2,
          baseDelay: 10
        })
      ).rejects.toThrow('Network error');

      expect(mockFn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should use custom retry condition', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Custom error'));

      await expect(
        errorHandler.executeWithRecovery(mockFn, {
          maxRetries: 2,
          retryCondition: () => false // Never retry
        })
      ).rejects.toThrow('Custom error');

      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should calculate exponential backoff delay', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Network error'));
      const startTime = Date.now();

      await expect(
        errorHandler.executeWithRecovery(mockFn, {
          maxRetries: 2,
          baseDelay: 100,
          backoffMultiplier: 2
        })
      ).rejects.toThrow('Network error');

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should have waited at least 100ms + 200ms = 300ms
      expect(totalTime).toBeGreaterThan(250);
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should respect max delay', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Network error'));

      await expect(
        errorHandler.executeWithRecovery(mockFn, {
          maxRetries: 1,
          baseDelay: 1000,
          backoffMultiplier: 10,
          maxDelay: 500 // Should cap the delay
        })
      ).rejects.toThrow('Network error');

      expect(mockFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('executeWithCircuitBreaker', () => {
    it('should execute function with circuit breaker', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');

      const result = await errorHandler.executeWithCircuitBreaker(
        'test-service',
        mockFn
      );

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should reuse circuit breaker for same service', async () => {
      const mockFn1 = jest.fn().mockResolvedValue('success1');
      const mockFn2 = jest.fn().mockResolvedValue('success2');

      await errorHandler.executeWithCircuitBreaker('test-service', mockFn1);
      await errorHandler.executeWithCircuitBreaker('test-service', mockFn2);

      const status = errorHandler.getCircuitBreakerStatus();
      expect(Object.keys(status)).toHaveLength(1);
      expect(status['test-service']).toBeDefined();
    });

    it('should handle circuit breaker failures', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Service error'));

      await expect(
        errorHandler.executeWithCircuitBreaker('test-service', mockFn)
      ).rejects.toThrow('Service error');

      const status = errorHandler.getCircuitBreakerStatus();
      expect(status['test-service']?.failureCount).toBe(1);
    });
  });

  describe('error statistics', () => {
    beforeEach(async () => {
      // Generate some test errors
      await expect(
        errorHandler.executeWithRecovery(
          () => Promise.reject(new TestRailError('Auth error', 401)),
          { maxRetries: 0 }
        )
      ).rejects.toThrow();

      await expect(
        errorHandler.executeWithRecovery(
          () => Promise.reject(new Error('Network error')),
          { maxRetries: 0 }
        )
      ).rejects.toThrow();

      await expect(
        errorHandler.executeWithRecovery(
          () => Promise.reject(new ConfigurationError('Config error')),
          { maxRetries: 0 }
        )
      ).rejects.toThrow();
    });

    it('should provide error statistics', () => {
      const stats = errorHandler.getErrorStats();

      expect(stats.total).toBe(3);
      expect(stats.byCategory[ErrorCategory.AUTHENTICATION]).toBe(1);
      expect(stats.byCategory[ErrorCategory.NETWORK]).toBe(1);
      expect(stats.byCategory[ErrorCategory.CONFIGURATION]).toBe(1);
      expect(stats.bySeverity[ErrorSeverity.HIGH]).toBe(2);
      expect(stats.retryableCount).toBe(1); // Only network error is retryable
    });

    it('should filter by time window', async () => {
      // Wait a bit to ensure errors are outside the window
      await new Promise(resolve => setTimeout(resolve, 10));
      const stats = errorHandler.getErrorStats(1); // 1ms window
      expect(stats.total).toBe(0); // All errors should be outside the window
    });
  });

  describe('circuit breaker management', () => {
    beforeEach(async () => {
      // Create some circuit breakers
      await errorHandler.executeWithCircuitBreaker(
        'service1',
        () => Promise.resolve('ok')
      );
      await errorHandler.executeWithCircuitBreaker(
        'service2',
        () => Promise.resolve('ok')
      );
    });

    it('should get circuit breaker status', () => {
      const status = errorHandler.getCircuitBreakerStatus();

      expect(Object.keys(status)).toHaveLength(2);
      expect(status['service1']).toBeDefined();
      expect(status['service2']).toBeDefined();
    });

    it('should reset all circuit breakers', () => {
      errorHandler.resetAllCircuitBreakers();

      const status = errorHandler.getCircuitBreakerStatus();
      Object.values(status).forEach(breakerStatus => {
        expect(breakerStatus.failureCount).toBe(0);
        expect(breakerStatus.successCount).toBe(0);
      });
    });
  });

  describe('error history management', () => {
    it('should maintain error history', async () => {
      await expect(
        errorHandler.executeWithRecovery(
          () => Promise.reject(new Error('Test error')),
          { maxRetries: 0 }
        )
      ).rejects.toThrow();

      const stats = errorHandler.getErrorStats();
      expect(stats.total).toBe(1);
    });

    it('should clear error history', async () => {
      await expect(
        errorHandler.executeWithRecovery(
          () => Promise.reject(new Error('Test error')),
          { maxRetries: 0 }
        )
      ).rejects.toThrow();

      errorHandler.clearErrorHistory();

      const stats = errorHandler.getErrorStats();
      expect(stats.total).toBe(0);
    });
  });

  describe('severity determination', () => {
    it('should assign critical severity for critical errors', () => {
      const error = new Error('Critical system failure');
      const errorInfo = errorHandler.processError(error);

      expect(errorInfo.severity).toBe(ErrorSeverity.CRITICAL);
    });

    it('should assign appropriate severity for different error types', () => {
      const configError = new ConfigurationError('Config error');
      const authError = new TestRailError('Auth error', 401);
      const serverError = new TestRailError('Server error', 500);
      const rateLimitError = new TestRailError('Rate limit', 429);

      expect(errorHandler.processError(configError).severity).toBe(ErrorSeverity.HIGH);
      expect(errorHandler.processError(authError).severity).toBe(ErrorSeverity.HIGH);
      expect(errorHandler.processError(serverError).severity).toBe(ErrorSeverity.MEDIUM);
      expect(errorHandler.processError(rateLimitError).severity).toBe(ErrorSeverity.LOW);
    });
  });
});