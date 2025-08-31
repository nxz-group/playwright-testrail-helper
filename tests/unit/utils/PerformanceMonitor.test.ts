import { PerformanceMonitor, PerformanceMetrics, PerformanceStats } from '../../../src/utils/PerformanceMonitor';

// Mock Logger
jest.mock('../../../src/utils/Logger');

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = PerformanceMonitor.getInstance();
    monitor.clear(); // Clear any existing metrics
  });

  afterEach(() => {
    monitor.stopMemoryMonitoring();
    monitor.clear();
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = PerformanceMonitor.getInstance();
      const instance2 = PerformanceMonitor.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('operation timing', () => {
    it('should track operation start and end', () => {
      const operationId = 'test-op-1';
      const operationName = 'test-operation';

      monitor.startOperation(operationId, operationName, { userId: 123 });
      
      // Simulate some work
      const start = performance.now();
      while (performance.now() - start < 10) {
        // Wait ~10ms
      }

      const metric = monitor.endOperation(operationId, operationName, true, { result: 'success' });

      expect(metric).toBeDefined();
      expect(metric!.operationName).toBe(operationName);
      expect(metric!.success).toBe(true);
      expect(metric!.duration).toBeGreaterThan(0);
      expect(metric!.metadata).toEqual({ result: 'success' });
    });

    it('should handle end operation without start', () => {
      const metric = monitor.endOperation('non-existent', 'test-operation');

      expect(metric).toBeNull();
    });

    it('should track failed operations', () => {
      const operationId = 'test-op-fail';
      const operationName = 'failing-operation';

      monitor.startOperation(operationId, operationName);
      const metric = monitor.endOperation(operationId, operationName, false, { error: 'Test error' });

      expect(metric).toBeDefined();
      expect(metric!.success).toBe(false);
      expect(metric!.metadata).toEqual({ error: 'Test error' });
    });
  });

  describe('async operation timing', () => {
    it('should time async operations successfully', async () => {
      const operationName = 'async-operation';
      const expectedResult = 'async-result';

      const result = await monitor.timeOperation(
        operationName,
        async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
          return expectedResult;
        },
        { type: 'async' }
      );

      expect(result).toBe(expectedResult);

      const stats = monitor.getStats(operationName);
      expect(stats).toBeDefined();
      expect(stats!.totalOperations).toBe(1);
      expect(stats!.successfulOperations).toBe(1);
      expect(stats!.failedOperations).toBe(0);
    });

    it('should handle async operation failures', async () => {
      const operationName = 'failing-async-operation';
      const error = new Error('Async operation failed');

      await expect(
        monitor.timeOperation(
          operationName,
          async () => {
            throw error;
          }
        )
      ).rejects.toThrow('Async operation failed');

      const stats = monitor.getStats(operationName);
      expect(stats).toBeDefined();
      expect(stats!.totalOperations).toBe(1);
      expect(stats!.successfulOperations).toBe(0);
      expect(stats!.failedOperations).toBe(1);
    });
  });

  describe('synchronous operation timing', () => {
    it('should time sync operations successfully', () => {
      const operationName = 'sync-operation';
      const expectedResult = 42;

      const result = monitor.timeSync(
        operationName,
        () => {
          // Simulate some work
          let sum = 0;
          for (let i = 0; i < 1000; i++) {
            sum += i;
          }
          return expectedResult;
        },
        { type: 'sync' }
      );

      expect(result).toBe(expectedResult);

      const stats = monitor.getStats(operationName);
      expect(stats).toBeDefined();
      expect(stats!.totalOperations).toBe(1);
      expect(stats!.successfulOperations).toBe(1);
    });

    it('should handle sync operation failures', () => {
      const operationName = 'failing-sync-operation';
      const error = new Error('Sync operation failed');

      expect(() => {
        monitor.timeSync(operationName, () => {
          throw error;
        });
      }).toThrow('Sync operation failed');

      const stats = monitor.getStats(operationName);
      expect(stats).toBeDefined();
      expect(stats!.failedOperations).toBe(1);
    });
  });

  describe('statistics calculation', () => {
    beforeEach(() => {
      // Add some test metrics
      const operationName = 'test-stats';
      
      // Simulate multiple operations with different durations
      monitor.startOperation('op1', operationName);
      monitor.endOperation('op1', operationName, true); // ~0ms
      
      monitor.startOperation('op2', operationName);
      const start = performance.now();
      while (performance.now() - start < 5) {} // ~5ms
      monitor.endOperation('op2', operationName, true);
      
      monitor.startOperation('op3', operationName);
      monitor.endOperation('op3', operationName, false); // Failed operation
    });

    it('should calculate correct statistics', () => {
      const stats = monitor.getStats('test-stats');

      expect(stats).toBeDefined();
      expect(stats!.totalOperations).toBe(3);
      expect(stats!.successfulOperations).toBe(2);
      expect(stats!.failedOperations).toBe(1);
      expect(stats!.averageDuration).toBeGreaterThanOrEqual(0);
      expect(stats!.minDuration).toBeGreaterThanOrEqual(0);
      expect(stats!.maxDuration).toBeGreaterThanOrEqual(stats!.minDuration);
      expect(stats!.totalDuration).toBeGreaterThanOrEqual(0);
      expect(stats!.operationsPerSecond).toBeGreaterThanOrEqual(0);
    });

    it('should return null for non-existent operation', () => {
      const stats = monitor.getStats('non-existent-operation');
      expect(stats).toBeNull();
    });

    it('should track multiple operations', () => {
      monitor.timeSync('operation-a', () => 'result-a');
      monitor.timeSync('operation-b', () => 'result-b');

      const trackedOps = monitor.getTrackedOperations();
      expect(trackedOps).toContain('operation-a');
      expect(trackedOps).toContain('operation-b');
      expect(trackedOps).toContain('test-stats'); // From beforeEach
    });
  });

  describe('performance report', () => {
    beforeEach(() => {
      monitor.timeSync('op-1', () => 'result-1');
      monitor.timeSync('op-2', () => 'result-2');
    });

    it('should generate comprehensive performance report', () => {
      const report = monitor.getPerformanceReport();

      expect(Object.keys(report)).toContain('op-1');
      expect(Object.keys(report)).toContain('op-2');
      
      expect(report['op-1']?.totalOperations).toBe(1);
      expect(report['op-2']?.totalOperations).toBe(1);
    });

    it('should log performance summary', () => {
      // This test mainly ensures the method doesn't throw
      expect(() => monitor.logPerformanceSummary()).not.toThrow();
    });
  });

  describe('memory monitoring', () => {
    it('should capture memory snapshots', () => {
      const snapshot = monitor.captureMemorySnapshot();

      expect(snapshot).toBeDefined();
      expect(snapshot.heapUsed).toBeGreaterThan(0);
      expect(snapshot.heapTotal).toBeGreaterThan(0);
      expect(snapshot.rss).toBeGreaterThan(0);
      expect(snapshot.timestamp).toBeGreaterThan(0);
    });

    it('should start and stop memory monitoring', () => {
      monitor.startMemoryMonitoring(100); // 100ms interval
      
      // Wait a bit to capture some snapshots
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          monitor.stopMemoryMonitoring();
          
          const stats = monitor.getMemoryStats();
          expect(stats).toBeDefined();
          expect(stats!.snapshots).toBeGreaterThan(0);
          
          resolve();
        }, 250);
      });
    });

    it('should calculate memory statistics', () => {
      // Capture a few snapshots manually
      monitor.captureMemorySnapshot();
      monitor.captureMemorySnapshot();
      monitor.captureMemorySnapshot();

      const stats = monitor.getMemoryStats();

      expect(stats).toBeDefined();
      expect(stats!.snapshots).toBe(3);
      expect(stats!.current).toBeDefined();
      expect(stats!.peak).toBeDefined();
      expect(stats!.average).toBeDefined();
      expect(stats!.average.heapUsed).toBeGreaterThan(0);
    });

    it('should return null memory stats when no snapshots', () => {
      const stats = monitor.getMemoryStats();
      expect(stats).toBeNull();
    });

    it('should limit memory snapshots to prevent memory leak', () => {
      // Capture more than 1000 snapshots
      for (let i = 0; i < 1100; i++) {
        monitor.captureMemorySnapshot();
      }

      const stats = monitor.getMemoryStats();
      expect(stats!.snapshots).toBe(1000); // Should be limited to 1000
    });
  });

  describe('slow operations detection', () => {
    beforeEach(() => {
      // Add operations with different durations
      monitor.startOperation('fast-op', 'fast-operation');
      monitor.endOperation('fast-op', 'fast-operation', true);

      monitor.startOperation('slow-op', 'slow-operation');
      const start = performance.now();
      while (performance.now() - start < 15) {} // ~15ms
      monitor.endOperation('slow-op', 'slow-operation', true);
    });

    it('should identify slow operations', () => {
      const slowOps = monitor.getSlowOperations(10); // 10ms threshold

      expect(slowOps.length).toBeGreaterThan(0);
      expect(slowOps[0]?.operationName).toBe('slow-operation');
      expect(slowOps[0]?.duration).toBeGreaterThan(10);
    });

    it('should sort slow operations by duration descending', () => {
      // Add another slow operation
      monitor.startOperation('slower-op', 'slower-operation');
      const start = performance.now();
      while (performance.now() - start < 25) {} // ~25ms
      monitor.endOperation('slower-op', 'slower-operation', true);

      const slowOps = monitor.getSlowOperations(10);

      expect(slowOps.length).toBeGreaterThanOrEqual(2);
      expect(slowOps[0]?.duration).toBeGreaterThanOrEqual(slowOps[1]?.duration || 0);
    });

    it('should return empty array when no slow operations', () => {
      const slowOps = monitor.getSlowOperations(1000); // Very high threshold

      expect(slowOps).toEqual([]);
    });
  });

  describe('data management', () => {
    beforeEach(() => {
      monitor.timeSync('test-op', () => 'result');
      monitor.captureMemorySnapshot();
    });

    it('should clear all metrics and snapshots', () => {
      expect(monitor.getTrackedOperations().length).toBeGreaterThan(0);
      expect(monitor.getMemoryStats()).toBeDefined();

      monitor.clear();

      expect(monitor.getTrackedOperations()).toEqual([]);
      expect(monitor.getMemoryStats()).toBeNull();
    });

    it('should export metrics to JSON', () => {
      const exported = monitor.exportMetrics();

      expect(exported).toBeDefined();
      expect(exported.metrics).toBeDefined();
      expect(exported.memorySnapshots).toBeDefined();
      expect(exported.summary).toBeDefined();
      expect(exported.exportTime).toBeGreaterThan(0);
      expect(Object.keys(exported.metrics)).toContain('test-op');
    });
  });

  describe('edge cases', () => {
    it('should handle multiple start operations with same ID', () => {
      const operationId = 'duplicate-id';
      const operationName = 'test-operation';

      monitor.startOperation(operationId, operationName);
      monitor.startOperation(operationId, operationName); // Duplicate

      const metric = monitor.endOperation(operationId, operationName, true);

      expect(metric).toBeDefined();
      // Should use the last start time
    });

    it('should handle operations with zero duration', () => {
      const operationId = 'zero-duration';
      const operationName = 'instant-operation';

      monitor.startOperation(operationId, operationName);
      const metric = monitor.endOperation(operationId, operationName, true);

      expect(metric).toBeDefined();
      expect(metric!.duration).toBeGreaterThanOrEqual(0);
    });

    it('should handle operations with metadata', () => {
      const metadata = { userId: 123, action: 'test', nested: { value: 'test' } };

      const result = monitor.timeSync('metadata-op', () => 'result', metadata);

      expect(result).toBe('result');

      const stats = monitor.getStats('metadata-op');
      expect(stats).toBeDefined();
    });
  });
});