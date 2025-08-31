import type { TestRailApiClient } from '../client/TestRailApiClient';
import { type TestCase, TestRailError, type TestRun, ValidationError } from '../types';
import { Logger } from '../utils/Logger';

/**
 * Manages TestRail test run lifecycle operations
 */
export class TestRunManager {
  private client: TestRailApiClient;
  private logger: Logger;
  private projectId: number;

  constructor(client: TestRailApiClient, projectId: number) {
    this.client = client;
    this.projectId = projectId;
    this.logger = new Logger('TestRunManager');
  }

  /**
   * Create a new test run
   */
  async createTestRun(options: {
    name: string;
    description?: string;
    sectionId?: number;
    caseIds?: number[];
    assignedToId?: number;
    milestoneId?: number;
    includeAll?: boolean;
  }): Promise<TestRun> {
    this.validateCreateRunOptions(options);

    const runData: Partial<TestRun> = {
      name: options.name,
      include_all: options.includeAll ?? false,
    };

    if (options.description !== undefined) {
      runData.description = options.description;
    }
    if (options.assignedToId !== undefined) {
      runData.assignedto_id = options.assignedToId;
    }
    if (options.milestoneId !== undefined) {
      runData.milestone_id = options.milestoneId;
    }

    // If not including all cases, specify which cases to include
    if (!runData.include_all && options.caseIds && options.caseIds.length > 0) {
      runData.case_ids = options.caseIds;
    } else if (!runData.include_all && options.sectionId) {
      // Get all cases in the section
      const cases = await this.getCasesInSection(options.sectionId);
      runData.case_ids = cases.map(testCase => testCase.id);
    }

    try {
      this.logger.info('Creating test run', {
        name: options.name,
        caseCount: runData.case_ids?.length || 'all',
      });

      const response = await this.client.addRun(this.projectId, runData);

      if (response.statusCode !== 200) {
        throw new TestRailError(
          `Failed to create test run: ${response.statusCode}`,
          response.statusCode,
          response.body
        );
      }

      const testRun = response.body as TestRun;
      this.logger.info('Test run created successfully', {
        runId: testRun.id,
        name: testRun.name,
      });

      return testRun;
    } catch (error) {
      this.logger.error('Failed to create test run', {
        name: options.name,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get test run by ID
   */
  async getTestRun(runId: number): Promise<TestRun> {
    try {
      const response = await this.client.getRun(runId);

      if (response.statusCode === 404) {
        throw new TestRailError(`Test run ${runId} not found`, 404);
      }

      if (response.statusCode !== 200) {
        throw new TestRailError(
          `Failed to get test run: ${response.statusCode}`,
          response.statusCode,
          response.body
        );
      }

      return response.body as TestRun;
    } catch (error) {
      this.logger.error('Failed to get test run', {
        runId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Update test run information
   */
  async updateTestRun(
    runId: number,
    updates: {
      name?: string;
      description?: string;
      assignedToId?: number;
      milestoneId?: number;
    }
  ): Promise<TestRun> {
    const updateData: Record<string, unknown> = {};

    if (updates.name) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.assignedToId) updateData.assignedto_id = updates.assignedToId;
    if (updates.milestoneId) updateData.milestone_id = updates.milestoneId;

    if (Object.keys(updateData).length === 0) {
      throw new ValidationError('At least one field must be provided for update');
    }

    try {
      this.logger.info('Updating test run', { runId, updates: Object.keys(updateData) });

      const response = await this.client.updateRun(runId, updateData);

      if (response.statusCode !== 200) {
        throw new TestRailError(
          `Failed to update test run: ${response.statusCode}`,
          response.statusCode,
          response.body
        );
      }

      const testRun = response.body as TestRun;
      this.logger.info('Test run updated successfully', { runId, name: testRun.name });

      return testRun;
    } catch (error) {
      this.logger.error('Failed to update test run', {
        runId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Close a test run
   */
  async closeTestRun(runId: number): Promise<TestRun> {
    try {
      this.logger.info('Closing test run', { runId });

      const response = await this.client.closeRun(runId);

      if (response.statusCode !== 200) {
        throw new TestRailError(
          `Failed to close test run: ${response.statusCode}`,
          response.statusCode,
          response.body
        );
      }

      const testRun = response.body as TestRun;
      this.logger.info('Test run closed successfully', { runId, name: testRun.name });

      return testRun;
    } catch (error) {
      this.logger.error('Failed to close test run', {
        runId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get all test runs for the project
   */
  async getTestRuns(options?: {
    isCompleted?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<TestRun[]> {
    try {
      const response = await this.client.getRuns(this.projectId, options?.isCompleted);

      if (response.statusCode !== 200) {
        throw new TestRailError(
          `Failed to get test runs: ${response.statusCode}`,
          response.statusCode,
          response.body
        );
      }

      let runs = response.body as TestRun[];

      // Apply client-side pagination if needed
      if (options?.offset || options?.limit) {
        const start = options.offset || 0;
        const end = options.limit ? start + options.limit : undefined;
        runs = runs.slice(start, end);
      }

      return runs;
    } catch (error) {
      this.logger.error('Failed to get test runs', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Find test run by name
   */
  async findTestRunByName(name: string, isCompleted?: boolean): Promise<TestRun | null> {
    try {
      const runs = await this.getTestRuns(isCompleted !== undefined ? { isCompleted } : undefined);
      return runs.find(run => run.name === name) || null;
    } catch (error) {
      this.logger.error('Failed to find test run by name', {
        name,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get or create test run (find existing or create new)
   */
  async getOrCreateTestRun(options: {
    name: string;
    description?: string;
    sectionId?: number;
    caseIds?: number[];
    assignedToId?: number;
    milestoneId?: number;
    includeAll?: boolean;
    resetIfExists?: boolean;
  }): Promise<{ run: TestRun; created: boolean }> {
    // First, try to find existing run
    const existingRun = await this.findTestRunByName(options.name, false);

    if (existingRun && !options.resetIfExists) {
      this.logger.info('Using existing test run', {
        runId: existingRun.id,
        name: existingRun.name,
      });
      return { run: existingRun, created: false };
    }

    if (existingRun && options.resetIfExists) {
      // Close existing run and create new one
      await this.closeTestRun(existingRun.id);
      this.logger.info('Closed existing test run for reset', {
        runId: existingRun.id,
        name: existingRun.name,
      });
    }

    // Create new run
    const newRun = await this.createTestRun(options);
    return { run: newRun, created: true };
  }

  /**
   * Get test cases in a section
   */
  private async getCasesInSection(sectionId: number): Promise<TestCase[]> {
    try {
      const response = await this.client.getCases(this.projectId, sectionId);

      if (response.statusCode !== 200) {
        throw new TestRailError(
          `Failed to get cases in section: ${response.statusCode}`,
          response.statusCode,
          response.body
        );
      }

      return Array.isArray(response.body) ? (response.body as TestCase[]) : [];
    } catch (error) {
      this.logger.error('Failed to get cases in section', {
        sectionId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Validate create run options
   */
  private validateCreateRunOptions(options: {
    name: string;
    sectionId?: number;
    caseIds?: number[];
    includeAll?: boolean;
  }): void {
    if (!options.name?.trim()) {
      throw new ValidationError('Run name is required and cannot be empty');
    }

    if (
      !options.includeAll &&
      !options.sectionId &&
      (!options.caseIds || options.caseIds.length === 0)
    ) {
      throw new ValidationError(
        'Either includeAll must be true, or sectionId or caseIds must be provided'
      );
    }

    if (options.caseIds?.some(id => !Number.isInteger(id) || id <= 0)) {
      throw new ValidationError('All case IDs must be positive integers');
    }
  }

  /**
   * Check if test run is completed
   */
  async isTestRunCompleted(runId: number): Promise<boolean> {
    try {
      const run = await this.getTestRun(runId);
      // TestRail runs have a completed_on field when closed
      return !!(run as unknown as { completed_on?: number }).completed_on;
    } catch (error) {
      this.logger.error('Failed to check if test run is completed', {
        runId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get test run statistics
   */
  async getTestRunStats(runId: number): Promise<{
    totalTests: number;
    passedTests: number;
    failedTests: number;
    blockedTests: number;
    untestedTests: number;
    retestTests: number;
  }> {
    try {
      const run = await this.getTestRun(runId);
      const runWithStats = run as unknown as {
        passed_count?: number;
        failed_count?: number;
        blocked_count?: number;
        untested_count?: number;
        retest_count?: number;
      };

      return {
        totalTests:
          (runWithStats.passed_count || 0) +
          (runWithStats.failed_count || 0) +
          (runWithStats.blocked_count || 0) +
          (runWithStats.untested_count || 0) +
          (runWithStats.retest_count || 0),
        passedTests: runWithStats.passed_count || 0,
        failedTests: runWithStats.failed_count || 0,
        blockedTests: runWithStats.blocked_count || 0,
        untestedTests: runWithStats.untested_count || 0,
        retestTests: runWithStats.retest_count || 0,
      };
    } catch (error) {
      this.logger.error('Failed to get test run statistics', {
        runId,
        error: (error as Error).message,
      });
      throw error;
    }
  }
}
