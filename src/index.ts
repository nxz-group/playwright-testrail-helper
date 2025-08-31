import { TestRailClient } from "@api/testrail-client";
import { TestCaseManager } from "@managers/test-case-manager";
import { TestRunManager } from "@managers/test-run-manager";
import { WorkerManager } from "@managers/worker-manager";
import type { TestCaseInfo } from "@types";
import { Platform } from "@utils/constants";
import { ConfigurationError } from "@utils/errors";
import { ValidationUtils } from "@utils/validation";

/**
 * Main TestRail integration helper class
 * Orchestrates test case synchronization and result reporting
 */
class TestRailHelper {
  private readonly testRailDir: string;
  private readonly projectId: number;
  private readonly client: TestRailClient;
  private readonly testCaseManager: TestCaseManager;
  private readonly testRunManager: TestRunManager;
  private readonly workerManager: WorkerManager;

  public readonly platform = Platform;

  /**
   * Creates a new TestRailHelper instance
   * Initializes all managers and clients with TestRail credentials from environment variables
   * @throws {ConfigurationError} When required environment variables are missing
   */
  constructor() {
    const testRailHost = process.env.TEST_RAIL_HOST!;
    const testRailUsername = process.env.TEST_RAIL_USERNAME!;
    const testRailPassword = process.env.TEST_RAIL_PASSWORD!;
    const projectId = process.env.TEST_RAIL_PROJECT_ID;

    if (!testRailHost || !testRailUsername || !testRailPassword || !projectId) {
      throw new ConfigurationError(
        "Missing required environment variables: TEST_RAIL_HOST, TEST_RAIL_USERNAME, TEST_RAIL_PASSWORD, TEST_RAIL_PROJECT_ID"
      );
    }

    this.projectId = parseInt(projectId, 10);
    if (isNaN(this.projectId) || this.projectId <= 0) {
      throw new ConfigurationError("TEST_RAIL_PROJECT_ID must be a valid positive number");
    }

    // Optional configuration with defaults
    this.testRailDir = process.env.TEST_RAIL_DIR || "testRail";
    const executedByText = process.env.TEST_RAIL_EXECUTED_BY || "Executed by Playwright";

    this.client = new TestRailClient(testRailHost, testRailUsername, testRailPassword);
    this.testCaseManager = new TestCaseManager(this.client, executedByText);
    this.testRunManager = new TestRunManager(this.client, this.projectId, this.testRailDir);
    this.workerManager = new WorkerManager(this.testRailDir);
  }

  /**
   * Updates test results in TestRail by syncing test cases and creating/updating test runs
   * @param runName - Name of the test run
   * @param sectionId - TestRail section ID where test cases belong
   * @param platformId - Platform identifier for test execution
   * @param testList - Array of test case information to process
   * @param isReset - Whether to reset existing test run data (default: false)
   * @throws {TestRailError} When validation fails or TestRail operations fail
   */
  public async updateTestResult(
    runName: string,
    sectionId: number,
    platformId: number,
    testList: TestCaseInfo[],
    isReset = false
  ): Promise<void> {
    // Validate input parameters
    ValidationUtils.validateRunName(runName);
    ValidationUtils.validateSectionId(sectionId);
    ValidationUtils.validatePlatformId(platformId);
    ValidationUtils.validateTestList(testList);

    const workerId = process.env.TEST_WORKER_INDEX || "0";
    const caseIdsInListFile: number[] = [];
    const testResults: Record<string, any>[] = [];

    await this.testRunManager.ensureTestRailSetup();
    if (isReset) {
      await this.testRunManager.resetTestRunJson();
    }

    // Skip if no tests to process
    if (testList.length === 0) {
      return;
    }

    const userId = await this.client.getUserIdByEmail(process.env.TEST_RAIL_USERNAME!);
    const casesInSection = await this.client.getCases(this.projectId, sectionId);

    // Process test cases and create results
    for (const testCase of testList) {
      ValidationUtils.validateTestCase(testCase);

      const testCaseId = await this.testCaseManager.syncTestCase(
        sectionId,
        platformId,
        testCase,
        casesInSection,
        userId
      );

      const testResult = this.testCaseManager.createTestResult(testCase, testCaseId, userId);
      testResults.push(testResult);
      caseIdsInListFile.push(testCaseId);
    }

    // Use WorkerManager for coordination
    await this.workerManager.coordinateWorkers(workerId, testResults, async (allResults) => {
      const allCaseIds = [...new Set(allResults.map((r) => r.case_id))];

      // Set test run ID and case IDs
      await this.testRunManager.setTestRunIdAndCaseId(runName, userId, allCaseIds);

      // Write JSON
      await this.testRunManager.writeTestRunJson();

      // Update run and add results
      await this.testRunManager.updateRunAndAddResults(allResults);
    });
  }
}

export const onTestRailHelper: TestRailHelper = new TestRailHelper();
export default TestRailHelper;

// Export types and constants for library users
export * from "@types";
export * from "@utils/constants";
export * from "@utils/errors";
