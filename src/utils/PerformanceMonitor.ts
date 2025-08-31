import { Logger } from './Logger';

export interface PerformanceMetrics {
  operationName: string;
  startTime: number;
  endTime: number;
  duration: number;
  success: boolean;
  metadata: Record<string, any> | undefined;
}

export interface PerformanceStats {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  totalDuration: number;
  operationsPerSecond: number;
}

export interface MemoryStats {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  timestamp: number;
}

/**
 * PerformanceMonitor tracks and analyzes performance metrics for TestRail operations
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private readonly logger: Logger;
  private readonly metrics: Map<string, PerformanceMetrics[]> = new Map();
  private readonly activeOperations: Map<string, number> = new Map();
  private memorySnapshots: MemoryStats[] = [];
  private monitoringInterval?: NodeJS.Timeout;

  private constructor() {
    this.logger = new Logger('PerformanceMonitor');
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Start monitoring an operation
   */
  startOperation(operationId: string, operationName: string, metadata?: Record<string, any>): void {
    const startTime = performance.now();
    this.activeOperations.set(operationId, startTime);

    this.logger.debug('Operation started', {
      operationId,
      operationName,
      metadata,
    });
  }

  /**
   * End monitoring an operation
   */
  endOperation(
    operationId: string,
    operationName: string,
    success: boolean = true,
    metadata?: Record<string, any>
  ): PerformanceMetrics | null {
    const endTime = performance.now();
    const startTime = this.activeOperations.get(operationId);

    if (!startTime) {
      this.logger.warn('Operation end called without start', { operationId, operationName });
      return null;
    }

    const duration = endTime - startTime;
    const metric: PerformanceMetrics = {
      operationName,
      startTime,
      endTime,
      duration,
      success,
      metadata,
    };

    // Store metric
    if (!this.metrics.has(operationName)) {
      this.metrics.set(operationName, []);
    }
    this.metrics.get(operationName)!.push(metric);

    // Clean up active operation
    this.activeOperations.delete(operationId);

    this.logger.debug('Operation completed', {
      operationId,
      operationName,
      duration: `${duration.toFixed(2)}ms`,
      success,
      metadata,
    });

    return metric;
  }

  /**
   * Time an async operation
   */
  async timeOperation<T>(
    operationName: string,
    operation: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const operationId = `${operationName}-${Date.now()}-${Math.random()}`;
    this.startOperation(operationId, operationName, metadata);

    try {
      const result = await operation();
      this.endOperation(operationId, operationName, true, metadata);
      return result;
    } catch (error) {
      this.endOperation(operationId, operationName, false, {
        ...metadata,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Time a synchronous operation
   */
  timeSync<T>(operationName: string, operation: () => T, metadata?: Record<string, any>): T {
    const operationId = `${operationName}-${Date.now()}-${Math.random()}`;
    this.startOperation(operationId, operationName, metadata);

    try {
      const result = operation();
      this.endOperation(operationId, operationName, true, metadata);
      return result;
    } catch (error) {
      this.endOperation(operationId, operationName, false, {
        ...metadata,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get performance statistics for an operation
   */
  getStats(operationName: string): PerformanceStats | null {
    const operationMetrics = this.metrics.get(operationName);
    if (!operationMetrics || operationMetrics.length === 0) {
      return null;
    }

    const totalOperations = operationMetrics.length;
    const successfulOperations = operationMetrics.filter(m => m.success).length;
    const failedOperations = totalOperations - successfulOperations;

    const durations = operationMetrics.map(m => m.duration);
    const totalDuration = durations.reduce((sum, d) => sum + d, 0);
    const averageDuration = totalDuration / totalOperations;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);

    // Calculate operations per second based on time span
    const timeSpan =
      (operationMetrics[operationMetrics.length - 1]?.endTime || 0) -
      (operationMetrics[0]?.startTime || 0);
    const operationsPerSecond = timeSpan > 0 ? (totalOperations * 1000) / timeSpan : 0;

    return {
      totalOperations,
      successfulOperations,
      failedOperations,
      averageDuration,
      minDuration,
      maxDuration,
      totalDuration,
      operationsPerSecond,
    };
  }

  /**
   * Get all operation names being tracked
   */
  getTrackedOperations(): string[] {
    return Array.from(this.metrics.keys());
  }

  /**
   * Get comprehensive performance report
   */
  getPerformanceReport(): Record<string, PerformanceStats> {
    const report: Record<string, PerformanceStats> = {};

    for (const operationName of this.getTrackedOperations()) {
      const stats = this.getStats(operationName);
      if (stats) {
        report[operationName] = stats;
      }
    }

    return report;
  }

  /**
   * Start memory monitoring
   */
  startMemoryMonitoring(intervalMs: number = 5000): void {
    if (this.monitoringInterval) {
      this.stopMemoryMonitoring();
    }

    this.monitoringInterval = setInterval(() => {
      this.captureMemorySnapshot();
    }, intervalMs);

    this.logger.info('Memory monitoring started', { intervalMs });
  }

  /**
   * Stop memory monitoring
   */
  stopMemoryMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined as any;
      this.logger.info('Memory monitoring stopped');
    }
  }

  /**
   * Capture current memory usage
   */
  captureMemorySnapshot(): MemoryStats {
    const memUsage = process.memoryUsage();
    const snapshot: MemoryStats = {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      rss: memUsage.rss,
      timestamp: Date.now(),
    };

    this.memorySnapshots.push(snapshot);

    // Keep only last 1000 snapshots to prevent memory leak
    if (this.memorySnapshots.length > 1000) {
      this.memorySnapshots = this.memorySnapshots.slice(-1000);
    }

    return snapshot;
  }

  /**
   * Get memory usage statistics
   */
  getMemoryStats(): {
    current: MemoryStats;
    peak: MemoryStats;
    average: Omit<MemoryStats, 'timestamp'>;
    snapshots: number;
  } | null {
    if (this.memorySnapshots.length === 0) {
      return null;
    }

    const current = this.memorySnapshots[this.memorySnapshots.length - 1];
    const peak = this.memorySnapshots.reduce((max, snapshot) =>
      snapshot.heapUsed > max.heapUsed ? snapshot : max
    );

    const totals = this.memorySnapshots.reduce(
      (acc, snapshot) => ({
        heapUsed: acc.heapUsed + snapshot.heapUsed,
        heapTotal: acc.heapTotal + snapshot.heapTotal,
        external: acc.external + snapshot.external,
        rss: acc.rss + snapshot.rss,
      }),
      { heapUsed: 0, heapTotal: 0, external: 0, rss: 0 }
    );

    const count = this.memorySnapshots.length;
    const average = {
      heapUsed: totals.heapUsed / count,
      heapTotal: totals.heapTotal / count,
      external: totals.external / count,
      rss: totals.rss / count,
    };

    return {
      current: current!,
      peak,
      average,
      snapshots: count,
    };
  }

  /**
   * Clear all metrics and snapshots
   */
  clear(): void {
    this.metrics.clear();
    this.activeOperations.clear();
    this.memorySnapshots = [];
    this.logger.info('Performance metrics cleared');
  }

  /**
   * Get slow operations (above threshold)
   */
  getSlowOperations(thresholdMs: number = 1000): PerformanceMetrics[] {
    const slowOperations: PerformanceMetrics[] = [];

    for (const metrics of this.metrics.values()) {
      for (const metric of metrics) {
        if (metric.duration > thresholdMs) {
          slowOperations.push(metric);
        }
      }
    }

    return slowOperations.sort((a, b) => b.duration - a.duration);
  }

  /**
   * Log performance summary
   */
  logPerformanceSummary(): void {
    const report = this.getPerformanceReport();
    const memoryStats = this.getMemoryStats();
    const slowOps = this.getSlowOperations();

    this.logger.info('Performance Summary', {
      operations: Object.keys(report).length,
      totalMetrics: Object.values(report).reduce((sum, stats) => sum + stats.totalOperations, 0),
      slowOperations: slowOps.length,
      memorySnapshots: memoryStats?.snapshots || 0,
    });

    // Log each operation's stats
    for (const [operationName, stats] of Object.entries(report)) {
      this.logger.info(`Operation: ${operationName}`, {
        total: stats.totalOperations,
        success: stats.successfulOperations,
        failed: stats.failedOperations,
        avgDuration: `${stats.averageDuration.toFixed(2)}ms`,
        minDuration: `${stats.minDuration.toFixed(2)}ms`,
        maxDuration: `${stats.maxDuration.toFixed(2)}ms`,
        opsPerSec: stats.operationsPerSecond.toFixed(2),
      });
    }

    // Log memory stats if available
    if (memoryStats) {
      this.logger.info('Memory Usage', {
        currentHeap: `${(memoryStats.current.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        peakHeap: `${(memoryStats.peak.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        avgHeap: `${(memoryStats.average.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        currentRSS: `${(memoryStats.current.rss / 1024 / 1024).toFixed(2)}MB`,
      });
    }

    // Log slow operations
    if (slowOps.length > 0) {
      this.logger.warn(`Found ${slowOps.length} slow operations`, {
        slowest: {
          operation: slowOps[0]?.operationName || 'unknown',
          duration: `${slowOps[0]?.duration.toFixed(2) || 0}ms`,
        },
      });
    }
  }

  /**
   * Export metrics to JSON
   */
  exportMetrics(): {
    metrics: Record<string, PerformanceMetrics[]>;
    memorySnapshots: MemoryStats[];
    summary: Record<string, PerformanceStats>;
    exportTime: number;
  } {
    return {
      metrics: Object.fromEntries(this.metrics),
      memorySnapshots: [...this.memorySnapshots],
      summary: this.getPerformanceReport(),
      exportTime: Date.now(),
    };
  }
}
