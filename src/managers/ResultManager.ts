import type { TestRailApiClient } from '../client/TestRailApiClient';
import { STATUS_MAPPING, TEST_RAIL_STATUS } from '../config/constants';
import {
  type TestCase,
  type TestCaseInfo,
  TestRailError,
  type TestResult,
  type TestStatus,
} from '../types';
import { Logger } from '../utils/Logger';

/**
 * Manages TestRail test result processing and submission
 */
export class ResultManager {
  private client: TestRailApiClient;
  private logger: Logger;
  private projectId: number;

  constructor(client: TestRailApiClient, projectId: number) {
    this.client = client;
    this.projectId = projectId;
    this.logger = new Logger('ResultManager');
  }

  /**
   * Process and submit test results to TestRail
   */
  async submitTestResults(
    runId: number,
    testCases: TestCaseInfo[],
    sectionId: number,
    assignedToId?: number
  ): Promise<{ submitted: number; errors: string[] }> {
    this.logger.info('Starting test result submission', {
      runId,
      testCaseCount: testCases.length,
      sectionId,
    });

    const results = {
      submitted: 0,
      errors: [] as string[],
    };

    try {
      // Get existing test cases to map titles to IDs
      const existingCases = await this.getExistingCases(sectionId);
      const caseMap = new Map(
        existingCases.map(testCase => [testCase.title.toLowerCase().trim(), testCase])
      );

      // Convert test cases to TestRail results
      const testRailResults: TestResult[] = [];

      for (const testCase of testCases) {
        try {
          const result = await this.convertToTestRailResult(testCase, caseMap, assignedToId);

          if (result) {
            testRailResults.push(result);
          } else {
            results.errors.push(`Test case "${testCase.title}" not found in TestRail`);
          }
        } catch (error) {
          const errorMessage = `Failed to convert test case "${testCase.title}": ${(error as Error).message}`;
          results.errors.push(errorMessage);
          this.logger.error('Test case conversion error', {
            title: testCase.title,
            error: (error as Error).message,
          });
        }
      }

      if (testRailResults.length > 0) {
        // Submit results in batches
        const batchSize = 50; // TestRail API limit
        for (let i = 0; i < testRailResults.length; i += batchSize) {
          const batch = testRailResults.slice(i, i + batchSize);

          try {
            await this.submitResultBatch(runId, batch);
            results.submitted += batch.length;
            this.logger.debug('Submitted result batch', {
              batchSize: batch.length,
              totalSubmitted: results.submitted,
            });
          } catch (error) {
            const errorMessage = `Failed to submit batch ${Math.floor(i / batchSize) + 1}: ${(error as Error).message}`;
            results.errors.push(errorMessage);
            this.logger.error('Batch submission error', {
              batchIndex: Math.floor(i / batchSize) + 1,
              error: (error as Error).message,
            });
          }
        }
      }

      this.logger.info('Test result submission completed', results);
      return results;
    } catch (error) {
      this.logger.error('Failed to submit test results', {
        runId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Submit a batch of test results
   */
  private async submitResultBatch(runId: number, results: TestResult[]): Promise<void> {
    try {
      const response = await this.client.addResultsForCases(runId, results);

      if (response.statusCode !== 200) {
        throw new TestRailError(
          `Failed to submit results: ${response.statusCode}`,
          response.statusCode,
          response.body
        );
      }
    } catch (error) {
      this.logger.error('Failed to submit result batch', {
        runId,
        resultCount: results.length,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Convert Playwright test case to TestRail result
   */
  private async convertToTestRailResult(
    testCase: TestCaseInfo,
    caseMap: Map<string, TestCase>,
    assignedToId?: number
  ): Promise<TestResult | null> {
    const normalizedTitle = testCase.title.toLowerCase().trim();
    const existingCase = caseMap.get(normalizedTitle);

    if (!existingCase) {
      return null;
    }

    const statusId = this.mapTestStatus(testCase.status);
    const comment = this.generateResultComment(testCase);
    const elapsed = this.convertDurationToSeconds(testCase.duration);

    return {
      case_id: existingCase.id,
      status_id: statusId,
      assignedto_id: assignedToId || 0,
      comment,
      elapsed,
    };
  }

  /**
   * Map Playwright test status to TestRail status ID
   */
  private mapTestStatus(status: TestStatus): number {
    return STATUS_MAPPING[status] || TEST_RAIL_STATUS.FAILED;
  }

  /**
   * Generate result comment based on test execution
   */
  private generateResultComment(testCase: TestCaseInfo): string {
    const parts: string[] = [];

    // Add status information
    parts.push(`Test Status: ${testCase.status.toUpperCase()}`);

    // Add duration
    parts.push(`Execution Time: ${this.formatDuration(testCase.duration)}`);

    // Add error information if test failed
    if (testCase.error) {
      parts.push('');
      parts.push('Error Details:');
      parts.push(testCase.error.message);

      if (testCase.error.stack) {
        parts.push('');
        parts.push('Stack Trace:');
        parts.push(testCase.error.stack);
      }
    }

    // Add step information if available
    if (testCase._steps && testCase._steps.length > 0) {
      parts.push('');
      parts.push('Test Steps:');

      testCase._steps.forEach((step, index) => {
        parts.push(`${index + 1}. ${step.title}`);
        if (step.error) {
          parts.push(`   Error: ${step.error.message}`);
        }
      });
    }

    return parts.join('\n');
  }

  /**
   * Convert duration from milliseconds to seconds (rounded)
   */
  private convertDurationToSeconds(durationMs: number): number {
    return Math.round(durationMs / 1000);
  }

  /**
   * Format duration for display
   */
  private formatDuration(durationMs: number): string {
    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Get existing test cases in a section
   */
  private async getExistingCases(sectionId: number): Promise<TestCase[]> {
    try {
      const response = await this.client.getCases(this.projectId, sectionId);

      if (response.statusCode !== 200) {
        throw new TestRailError(
          `Failed to get test cases: ${response.statusCode}`,
          response.statusCode,
          response.body
        );
      }

      return Array.isArray(response.body) ? (response.body as TestCase[]) : [];
    } catch (error) {
      this.logger.error('Failed to get existing test cases', {
        sectionId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Validate test results before submission
   */
  validateTestResults(testCases: TestCaseInfo[]): { valid: TestCaseInfo[]; invalid: string[] } {
    const valid: TestCaseInfo[] = [];
    const invalid: string[] = [];

    for (const testCase of testCases) {
      const errors: string[] = [];

      if (!testCase.title?.trim()) {
        errors.push('Title is required');
      }

      if (!testCase.status) {
        errors.push('Status is required');
      }

      if (typeof testCase.duration !== 'number' || testCase.duration < 0) {
        errors.push('Duration must be a non-negative number');
      }

      if (!Array.isArray(testCase.tags)) {
        errors.push('Tags must be an array');
      }

      if (errors.length > 0) {
        invalid.push(`Test case "${testCase.title || 'Unknown'}": ${errors.join(', ')}`);
      } else {
        valid.push(testCase);
      }
    }

    return { valid, invalid };
  }

  /**
   * Get result statistics for a test run
   */
  async getResultStatistics(runId: number): Promise<{
    total: number;
    passed: number;
    failed: number;
    blocked: number;
    untested: number;
    retest: number;
    passRate: number;
  }> {
    try {
      // This would typically require getting all test results for the run
      // For now, we'll use the run statistics from TestRunManager
      const response = await this.client.getRun(runId);

      if (response.statusCode !== 200) {
        throw new TestRailError(
          `Failed to get test run: ${response.statusCode}`,
          response.statusCode,
          response.body
        );
      }

      const run = response.body as unknown as {
        passed_count?: number;
        failed_count?: number;
        blocked_count?: number;
        untested_count?: number;
        retest_count?: number;
      };

      const passed = run.passed_count || 0;
      const failed = run.failed_count || 0;
      const blocked = run.blocked_count || 0;
      const untested = run.untested_count || 0;
      const retest = run.retest_count || 0;
      const total = passed + failed + blocked + untested + retest;

      return {
        total,
        passed,
        failed,
        blocked,
        untested,
        retest,
        passRate: total > 0 ? Math.round((passed / total) * 100) : 0,
      };
    } catch (error) {
      this.logger.error('Failed to get result statistics', {
        runId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Update individual test result
   */
  async updateTestResult(
    runId: number,
    caseId: number,
    status: TestStatus,
    comment?: string,
    elapsed?: number,
    assignedToId?: number
  ): Promise<void> {
    const result: TestResult = {
      case_id: caseId,
      status_id: this.mapTestStatus(status),
      assignedto_id: assignedToId || 0,
      comment: comment || `Test ${status}`,
      elapsed: elapsed || 0,
    };

    try {
      await this.submitResultBatch(runId, [result]);
      this.logger.info('Updated individual test result', {
        runId,
        caseId,
        status,
      });
    } catch (error) {
      this.logger.error('Failed to update test result', {
        runId,
        caseId,
        status,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Bulk update test results with retry logic
   */
  async bulkUpdateResults(
    runId: number,
    results: Array<{
      caseId: number;
      status: TestStatus;
      comment?: string;
      elapsed?: number;
      assignedToId?: number;
    }>,
    batchSize = 25
  ): Promise<{ updated: number; errors: string[] }> {
    this.logger.info('Starting bulk result update', {
      runId,
      resultCount: results.length,
      batchSize,
    });

    const updateResults = {
      updated: 0,
      errors: [] as string[],
    };

    // Convert to TestRail format
    const testRailResults: TestResult[] = results.map(result => ({
      case_id: result.caseId,
      status_id: this.mapTestStatus(result.status),
      assignedto_id: result.assignedToId || 0,
      comment: result.comment || `Test ${result.status}`,
      elapsed: result.elapsed || 0,
    }));

    // Process in batches
    for (let i = 0; i < testRailResults.length; i += batchSize) {
      const batch = testRailResults.slice(i, i + batchSize);

      try {
        await this.submitResultBatch(runId, batch);
        updateResults.updated += batch.length;

        // Add delay between batches to respect rate limits
        if (i + batchSize < testRailResults.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        const errorMessage = `Failed to update batch ${Math.floor(i / batchSize) + 1}: ${(error as Error).message}`;
        updateResults.errors.push(errorMessage);
      }
    }

    this.logger.info('Bulk result update completed', updateResults);
    return updateResults;
  }
}
