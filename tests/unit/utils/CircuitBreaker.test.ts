import { CircuitBreaker, CircuitBreakerState } from '../../../src/utils/CircuitBreaker';

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker('test-service', {
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 1000,
      monitoringPeriod: 5000,
    });
  });

  describe('initial state', () => {
    it('should start in CLOSED state', () => {
      const status = circuitBreaker.getStatus();
      expect(status.state).toBe(CircuitBreakerState.CLOSED);
      expect(status.failureCount).toBe(0);
      expect(status.successCount).toBe(0);
    });

    it('should be closed initially', () => {
      expect(circuitBreaker.isClosed()).toBe(true);
      expect(circuitBreaker.isOpen()).toBe(false);
      expect(circuitBreaker.isHalfOpen()).toBe(false);
    });
  });

  describe('successful execution', () => {
    it('should execute function successfully', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');

      const result = await circuitBreaker.execute(mockFn);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(circuitBreaker.isClosed()).toBe(true);
    });

    it('should reset failure count on success', async () => {
      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce('success');

      // Two failures
      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow('fail');
      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow('fail');

      let status = circuitBreaker.getStatus();
      expect(status.failureCount).toBe(2);

      // Success should reset failure count
      await circuitBreaker.execute(mockFn);

      status = circuitBreaker.getStatus();
      expect(status.failureCount).toBe(0);
    });
  });

  describe('failure handling', () => {
    it('should track failures', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('fail'));

      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow('fail');
      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow('fail');

      const status = circuitBreaker.getStatus();
      expect(status.failureCount).toBe(2);
      expect(circuitBreaker.isClosed()).toBe(true);
    });

    it('should open circuit after threshold failures', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('fail'));

      // Reach failure threshold (3 failures)
      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow('fail');
      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow('fail');
      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow('fail');

      expect(circuitBreaker.isOpen()).toBe(true);
      const status = circuitBreaker.getStatus();
      expect(status.state).toBe(CircuitBreakerState.OPEN);
      expect(status.failureCount).toBe(3);
    });

    it('should reject requests when circuit is open', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('fail'));

      // Open the circuit
      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow('fail');
      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow('fail');
      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow('fail');

      expect(circuitBreaker.isOpen()).toBe(true);

      // Should reject without calling function
      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow('Circuit breaker is OPEN');
      expect(mockFn).toHaveBeenCalledTimes(3); // Not called again
    });
  });

  describe('half-open state', () => {
    beforeEach(async () => {
      // Open the circuit
      const mockFn = jest.fn().mockRejectedValue(new Error('fail'));
      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow('fail');
      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow('fail');
      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow('fail');
      expect(circuitBreaker.isOpen()).toBe(true);
    });

    it('should transition to half-open after timeout', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');

      // Wait for timeout (using fake timers would be better in real scenario)
      await new Promise(resolve => setTimeout(resolve, 1100));

      await circuitBreaker.execute(mockFn);

      expect(circuitBreaker.isHalfOpen()).toBe(true);
    });

    it('should close circuit after successful executions in half-open', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Execute successfully to reach success threshold (2)
      await circuitBreaker.execute(mockFn);
      expect(circuitBreaker.isHalfOpen()).toBe(true);

      await circuitBreaker.execute(mockFn);
      expect(circuitBreaker.isClosed()).toBe(true);

      const status = circuitBreaker.getStatus();
      expect(status.state).toBe(CircuitBreakerState.CLOSED);
      expect(status.successCount).toBe(0); // Reset after closing
    });

    it('should reopen circuit on failure in half-open state', async () => {
      const mockFn = jest
        .fn()
        .mockResolvedValueOnce('success')
        .mockRejectedValueOnce(new Error('fail again'));

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 1100));

      // First success
      await circuitBreaker.execute(mockFn);
      expect(circuitBreaker.isHalfOpen()).toBe(true);

      // Failure should reopen circuit
      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow('fail again');
      expect(circuitBreaker.isOpen()).toBe(true);

      const status = circuitBreaker.getStatus();
      expect(status.successCount).toBe(0); // Reset after reopening
    });
  });

  describe('monitoring period', () => {
    it('should clean old failures outside monitoring period', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('fail'));

      // Create circuit breaker with short monitoring period
      const shortPeriodBreaker = new CircuitBreaker('short-period', {
        failureThreshold: 3,
        monitoringPeriod: 100, // 100ms
      });

      // Add one failure
      await expect(shortPeriodBreaker.execute(mockFn)).rejects.toThrow('fail');
      expect(shortPeriodBreaker.getStatus().failureCount).toBe(1);

      // Wait for monitoring period to pass
      await new Promise(resolve => setTimeout(resolve, 150));

      // Add another failure - old one should be cleaned
      await expect(shortPeriodBreaker.execute(mockFn)).rejects.toThrow('fail');
      expect(shortPeriodBreaker.getStatus().failureCount).toBe(1);
    });
  });

  describe('manual operations', () => {
    it('should reset circuit breaker manually', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('fail'));

      // Open the circuit
      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow('fail');
      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow('fail');
      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow('fail');

      expect(circuitBreaker.isOpen()).toBe(true);

      // Reset manually
      circuitBreaker.reset();

      expect(circuitBreaker.isClosed()).toBe(true);
      const status = circuitBreaker.getStatus();
      expect(status.failureCount).toBe(0);
      expect(status.successCount).toBe(0);
      expect(status.lastFailureTime).toBe(0);
    });
  });

  describe('configuration', () => {
    it('should use default configuration values', () => {
      const defaultBreaker = new CircuitBreaker('default');
      const status = defaultBreaker.getStatus();

      expect(status.config.failureThreshold).toBe(5);
      expect(status.config.successThreshold).toBe(3);
      expect(status.config.timeout).toBe(60000);
      expect(status.config.monitoringPeriod).toBe(300000);
    });

    it('should use custom configuration values', () => {
      const customBreaker = new CircuitBreaker('custom', {
        failureThreshold: 10,
        successThreshold: 5,
        timeout: 30000,
        monitoringPeriod: 120000,
      });

      const status = customBreaker.getStatus();
      expect(status.config.failureThreshold).toBe(10);
      expect(status.config.successThreshold).toBe(5);
      expect(status.config.timeout).toBe(30000);
      expect(status.config.monitoringPeriod).toBe(120000);
    });
  });

  describe('error propagation', () => {
    it('should propagate original error', async () => {
      const originalError = new Error('Original error message');
      const mockFn = jest.fn().mockRejectedValue(originalError);

      await expect(circuitBreaker.execute(mockFn)).rejects.toBe(originalError);
    });

    it('should propagate return value', async () => {
      const returnValue = { data: 'test data' };
      const mockFn = jest.fn().mockResolvedValue(returnValue);

      const result = await circuitBreaker.execute(mockFn);
      expect(result).toBe(returnValue);
    });
  });
});
