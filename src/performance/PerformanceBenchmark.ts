import type { TestRailApiClient } from '../client/TestRailApiClient';
import { Logger } from '../utils/Logger';
import { PerformanceMonitor } from '../utils/PerformanceMonitor';

// Simple interface for benchmarking
interface BenchmarkApiClient {
  getProject(projectId: number): Promise<any>;
  getSections(projectId: number): Promise<any>;
  getCases(projectId: number, sectionId: number): Promise<any>;
  addCase(sectionId: number, testCase: any): Promise<any>;
}

export interface BenchmarkResult {
  testName: string;
  duration: number;
  memoryUsage: {
    before: number;
    after: number;
    peak: number;
  };
  apiCalls: number;
  throughput: number;
  success: boolean;
  error?: string;
}

export interface BenchmarkSuite {
  name: string;
  results: BenchmarkResult[];
  summary: {
    totalDuration: number;
    averageDuration: number;
    totalMemoryUsed: number;
    totalApiCalls: number;
    successRate: number;
  };
}

export class PerformanceBenchmark {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('PerformanceBenchmark');
    this.monitor = PerformanceMonitor.getInstance();
  }

  /**
   * Run comprehensive performance benchmark suite
   */
  async runBenchmarkSuite(
    apiClient: TestRailApiClient | BenchmarkApiClient
  ): Promise<BenchmarkSuite> {
    this.logger.info('Starting performance benchmark suite');

    const results: BenchmarkResult[] = [];

    // API Response Time Benchmarks
    results.push(await this.benchmarkApiResponseTime(apiClient));
    results.push(await this.benchmarkBatchOperations(apiClient));
    results.push(await this.benchmarkConcurrentRequests(apiClient));

    // Memory Usage Benchmarks
    results.push(await this.benchmarkMemoryUsage(apiClient));
    results.push(await this.benchmarkLargeDataProcessing(apiClient));

    // Throughput Benchmarks
    results.push(await this.benchmarkThroughput(apiClient));

    const summary = this.calculateSummary(results);

    const suite: BenchmarkSuite = {
      name: 'TestRail Helper Performance Benchmark',
      results,
      summary,
    };

    this.logger.info('Performance benchmark suite completed', {
      totalTests: results.length,
      successRate: summary.successRate,
      averageDuration: summary.averageDuration,
    });

    return suite;
  }

  private async benchmarkApiResponseTime(
    apiClient: TestRailApiClient | BenchmarkApiClient
  ): Promise<BenchmarkResult> {
    const testName = 'API Response Time';
    let apiCalls = 0;

    try {
      const memoryBefore = process.memoryUsage().heapUsed;
      const startTime = Date.now();

      // Test basic API calls
      await apiClient.getProject(1);
      apiCalls++;

      await apiClient.getSections(1);
      apiCalls++;

      await apiClient.getCases(1, 1);
      apiCalls++;

      const endTime = Date.now();
      const memoryAfter = process.memoryUsage().heapUsed;
      const duration = endTime - startTime;

      return {
        testName,
        duration,
        memoryUsage: {
          before: memoryBefore,
          after: memoryAfter,
          peak: memoryAfter,
        },
        apiCalls,
        throughput: apiCalls / (duration / 1000),
        success: true,
      };
    } catch (error) {
      return {
        testName,
        duration: 0,
        memoryUsage: { before: 0, after: 0, peak: 0 },
        apiCalls,
        throughput: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async benchmarkBatchOperations(
    apiClient: TestRailApiClient | BenchmarkApiClient
  ): Promise<BenchmarkResult> {
    const testName = 'Batch Operations';
    let apiCalls = 0;

    try {
      const memoryBefore = process.memoryUsage().heapUsed;
      const startTime = Date.now();

      // Simulate batch test case creation
      const batchSize = 10;
      const promises = [];

      for (let i = 0; i < batchSize; i++) {
        promises.push(
          apiClient.addCase(1, {
            title: `Benchmark Test Case ${i}`,
            type_id: 1,
            priority_id: 2,
          })
        );
        apiCalls++;
      }

      await Promise.all(promises);

      const endTime = Date.now();
      const memoryAfter = process.memoryUsage().heapUsed;
      const duration = endTime - startTime;

      return {
        testName,
        duration,
        memoryUsage: {
          before: memoryBefore,
          after: memoryAfter,
          peak: memoryAfter,
        },
        apiCalls,
        throughput: apiCalls / (duration / 1000),
        success: true,
      };
    } catch (error) {
      return {
        testName,
        duration: 0,
        memoryUsage: { before: 0, after: 0, peak: 0 },
        apiCalls,
        throughput: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async benchmarkConcurrentRequests(
    apiClient: TestRailApiClient | BenchmarkApiClient
  ): Promise<BenchmarkResult> {
    const testName = 'Concurrent Requests';
    let apiCalls = 0;

    try {
      const memoryBefore = process.memoryUsage().heapUsed;
      const startTime = Date.now();

      // Test concurrent API calls
      const concurrentRequests = 5;
      const promises = [];

      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(apiClient.getProject(1));
        apiCalls++;
      }

      await Promise.all(promises);

      const endTime = Date.now();
      const memoryAfter = process.memoryUsage().heapUsed;
      const duration = endTime - startTime;

      return {
        testName,
        duration,
        memoryUsage: {
          before: memoryBefore,
          after: memoryAfter,
          peak: memoryAfter,
        },
        apiCalls,
        throughput: apiCalls / (duration / 1000),
        success: true,
      };
    } catch (error) {
      return {
        testName,
        duration: 0,
        memoryUsage: { before: 0, after: 0, peak: 0 },
        apiCalls,
        throughput: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async benchmarkMemoryUsage(
    _apiClient: TestRailApiClient | BenchmarkApiClient
  ): Promise<BenchmarkResult> {
    const testName = 'Memory Usage';
    let apiCalls = 0;

    try {
      const memoryBefore = process.memoryUsage().heapUsed;
      const startTime = Date.now();

      // Create large data structures to test memory handling
      const largeArray = new Array(1000).fill(null).map((_, i) => ({
        id: i,
        title: `Test Case ${i}`,
        description: 'A'.repeat(1000),
        steps: new Array(10).fill(null).map((_, j) => ({
          content: `Step ${j}`,
          expected: `Expected result ${j}`,
        })),
      }));

      // Process the data
      const processed = largeArray.map(item => ({
        ...item,
        processed: true,
        timestamp: Date.now(),
      }));

      apiCalls = 1; // Simulated processing

      const endTime = Date.now();
      const memoryAfter = process.memoryUsage().heapUsed;
      const duration = endTime - startTime;

      // Clean up
      largeArray.length = 0;
      processed.length = 0;

      return {
        testName,
        duration,
        memoryUsage: {
          before: memoryBefore,
          after: memoryAfter,
          peak: memoryAfter,
        },
        apiCalls,
        throughput: apiCalls / (duration / 1000),
        success: true,
      };
    } catch (error) {
      return {
        testName,
        duration: 0,
        memoryUsage: { before: 0, after: 0, peak: 0 },
        apiCalls,
        throughput: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async benchmarkLargeDataProcessing(
    _apiClient: TestRailApiClient | BenchmarkApiClient
  ): Promise<BenchmarkResult> {
    const testName = 'Large Data Processing';
    let apiCalls = 0;

    try {
      const memoryBefore = process.memoryUsage().heapUsed;
      const startTime = Date.now();

      // Simulate processing large test result datasets
      const largeResultSet = new Array(5000).fill(null).map((_, i) => ({
        case_id: i + 1,
        status_id: Math.floor(Math.random() * 5) + 1,
        comment: `Test result ${i}`,
        elapsed: `${Math.floor(Math.random() * 300)}s`,
        defects: Math.random() > 0.8 ? `BUG-${i}` : null,
      }));

      // Process results in batches
      const batchSize = 100;
      const batches = [];

      for (let i = 0; i < largeResultSet.length; i += batchSize) {
        batches.push(largeResultSet.slice(i, i + batchSize));
      }

      // Simulate batch processing
      for (const _batch of batches) {
        await new Promise(resolve => setTimeout(resolve, 10)); // Simulate processing time
        apiCalls++;
      }

      const endTime = Date.now();
      const memoryAfter = process.memoryUsage().heapUsed;
      const duration = endTime - startTime;

      return {
        testName,
        duration,
        memoryUsage: {
          before: memoryBefore,
          after: memoryAfter,
          peak: memoryAfter,
        },
        apiCalls,
        throughput: largeResultSet.length / (duration / 1000),
        success: true,
      };
    } catch (error) {
      return {
        testName,
        duration: 0,
        memoryUsage: { before: 0, after: 0, peak: 0 },
        apiCalls,
        throughput: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async benchmarkThroughput(
    apiClient: TestRailApiClient | BenchmarkApiClient
  ): Promise<BenchmarkResult> {
    const testName = 'Throughput Test';
    let apiCalls = 0;

    try {
      const memoryBefore = process.memoryUsage().heapUsed;
      const startTime = Date.now();

      // Test sustained throughput over time
      const duration = 5000; // 5 seconds
      const interval = 100; // 100ms intervals
      const endTime = startTime + duration;

      while (Date.now() < endTime) {
        try {
          await apiClient.getProject(1);
          apiCalls++;
        } catch (_error) {
          // Continue on individual failures
        }
        await new Promise(resolve => setTimeout(resolve, interval));
      }

      const actualDuration = Date.now() - startTime;
      const memoryAfter = process.memoryUsage().heapUsed;

      return {
        testName,
        duration: actualDuration,
        memoryUsage: {
          before: memoryBefore,
          after: memoryAfter,
          peak: memoryAfter,
        },
        apiCalls,
        throughput: apiCalls / (actualDuration / 1000),
        success: true,
      };
    } catch (error) {
      return {
        testName,
        duration: 0,
        memoryUsage: { before: 0, after: 0, peak: 0 },
        apiCalls,
        throughput: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private calculateSummary(results: BenchmarkResult[]) {
    const successfulResults = results.filter(r => r.success);

    return {
      totalDuration: results.reduce((sum, r) => sum + r.duration, 0),
      averageDuration:
        successfulResults.length > 0
          ? successfulResults.reduce((sum, r) => sum + r.duration, 0) / successfulResults.length
          : 0,
      totalMemoryUsed: results.reduce(
        (sum, r) => sum + (r.memoryUsage.after - r.memoryUsage.before),
        0
      ),
      totalApiCalls: results.reduce((sum, r) => sum + r.apiCalls, 0),
      successRate: (successfulResults.length / results.length) * 100,
    };
  }

  /**
   * Generate performance report
   */
  generateReport(suite: BenchmarkSuite): string {
    let report = `# Performance Benchmark Report\n\n`;
    report += `**Suite**: ${suite.name}\n`;
    report += `**Date**: ${new Date().toISOString()}\n\n`;

    report += `## Summary\n`;
    report += `- **Total Duration**: ${suite.summary.totalDuration}ms\n`;
    report += `- **Average Duration**: ${suite.summary.averageDuration.toFixed(2)}ms\n`;
    report += `- **Total Memory Used**: ${(suite.summary.totalMemoryUsed / 1024 / 1024).toFixed(2)}MB\n`;
    report += `- **Total API Calls**: ${suite.summary.totalApiCalls}\n`;
    report += `- **Success Rate**: ${suite.summary.successRate.toFixed(2)}%\n\n`;

    report += `## Individual Test Results\n\n`;

    for (const result of suite.results) {
      report += `### ${result.testName}\n`;
      report += `- **Status**: ${result.success ? '✅ Success' : '❌ Failed'}\n`;
      report += `- **Duration**: ${result.duration}ms\n`;
      report += `- **Memory Usage**: ${((result.memoryUsage.after - result.memoryUsage.before) / 1024 / 1024).toFixed(2)}MB\n`;
      report += `- **API Calls**: ${result.apiCalls}\n`;
      report += `- **Throughput**: ${result.throughput.toFixed(2)} ops/sec\n`;

      if (!result.success && result.error) {
        report += `- **Error**: ${result.error}\n`;
      }

      report += `\n`;
    }

    return report;
  }
}
