import { TestRailClient } from "./api/testrail-client";
import { TestCaseManager } from "./managers/test-case-manager";
import { TestRunManager } from "./managers/test-run-manager";
import { WorkerManager } from "./managers/worker-manager";
import type { TestCaseInfo, TestResult } from "./types";
import { AutomationType, Platform, Priority, TestStatus, TestTemplate, TestType } from "./utils/constants";
import { ConfigurationError } from "./utils/errors";
import { PlaywrightConverter } from "./utils/playwright-converter";
import { ValidationUtils } from "./utils/validation";

/**
 * Main TestRail integration helper class
 * Orchestrates test case synchronization and result reporting
 */
class TestRailHelper {
  private testRailDir?: string;
  private projectId?: number;
  private client?: TestRailClient;
  private testCaseManager?: TestCaseManager;
  private testRunManager?: TestRunManager;
  private workerManager?: WorkerManager;
  private initialized = false;

  public readonly platform = Platform;
  public readonly testStatus = TestStatus;
  public readonly testTemplate = TestTemplate;
  public readonly testType = TestType;
  public readonly automationType = AutomationType;
  public readonly priority = Priority;

  /**
   * Creates a new TestRailHelper instance
   * Initialization is deferred until first method call to avoid environment variable errors at import time
   */
  constructor() {
    // Initialization is now lazy - happens on first method call
  }

  /**
   * Initializes the TestRail helper with environment variables
   * @throws {ConfigurationError} When required environment variables are missing
   */
  private initialize(): void {
    if (this.initialized) {
      return;
    }

    const testRailHost = process.env.TEST_RAIL_HOST;
    const testRailUsername = process.env.TEST_RAIL_USERNAME;
    const testRailPassword = process.env.TEST_RAIL_PASSWORD;
    const projectId = process.env.TEST_RAIL_PROJECT_ID;

    if (!testRailHost || !testRailUsername || !testRailPassword || !projectId) {
      throw new ConfigurationError(
        "Missing required environment variables: TEST_RAIL_HOST, TEST_RAIL_USERNAME, TEST_RAIL_PASSWORD, TEST_RAIL_PROJECT_ID"
      );
    }

    this.projectId = Number.parseInt(projectId, 10);
    if (Number.isNaN(this.projectId) || this.projectId <= 0) {
      throw new ConfigurationError("TEST_RAIL_PROJECT_ID must be a valid positive number");
    }

    // Optional configuration with defaults
    this.testRailDir = process.env.TEST_RAIL_DIR || "testRail";
    const executedByText = process.env.TEST_RAIL_EXECUTED_BY || "Executed by Playwright";

    this.client = new TestRailClient(testRailHost, testRailUsername, testRailPassword);
    this.testCaseManager = new TestCaseManager(this.client, executedByText);
    this.testRunManager = new TestRunManager(this.client, this.projectId, this.testRailDir);
    this.workerManager = new WorkerManager(this.testRailDir);

    this.initialized = true;
  }

  /**
   * Updates a single test result in TestRail from Playwright TestInfo (simplest usage)
   * @param runName - Name of the test run
   * @param sectionId - TestRail section ID where test cases belong
   * @param platformId - Platform identifier for test execution
   * @param testInfo - Playwright TestInfo object
   * @param isReset - Whether to reset existing test run data (default: false)
   * @throws {TestRailError} When validation fails or TestRail operations fail
   */
  public async updateTestResultFromPlaywrightSingle(
    runName: string,
    sectionId: number,
    platformId: number,
    testInfo: unknown,
    isReset = false
  ): Promise<void> {
    return this.updateTestResultFromPlaywright(runName, sectionId, platformId, [testInfo], isReset);
  }

  /**
   * Updates test results in TestRail from Playwright TestInfo objects (recommended)
   * @param runName - Name of the test run
   * @param sectionId - TestRail section ID where test cases belong
   * @param platformId - Platform identifier for test execution
   * @param testInfos - Array of Playwright TestInfo objects to process
   * @param isReset - Whether to reset existing test run data (default: false)
   * @throws {TestRailError} When validation fails or TestRail operations fail
   */
  public async updateTestResultFromPlaywright(
    runName: string,
    sectionId: number,
    platformId: number,
    testInfos: unknown[],
    isReset = false
  ): Promise<void> {
    // Convert Playwright TestInfo objects to TestCaseInfo with automatic enhancement
    const testList = testInfos.map((testInfo) => {
      // Handle both single testInfo and { testInfo, testResult } objects
      if ((testInfo as any).testInfo && (testInfo as any).testResult) {
        return PlaywrightConverter.convertTestInfo((testInfo as any).testInfo, (testInfo as any).testResult);
      }
      return PlaywrightConverter.convertTestInfo(testInfo as any);
    });

    // Use existing updateTestResult method
    return this.updateTestResult(runName, sectionId, platformId, testList, isReset);
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
    // Initialize if not already done
    this.initialize();

    // Validate input parameters
    ValidationUtils.validateRunName(runName);
    ValidationUtils.validateSectionId(sectionId);
    ValidationUtils.validatePlatformId(platformId);
    ValidationUtils.validateTestList(testList);

    const workerId = process.env.TEST_WORKER_INDEX || "0";
    const caseIdsInListFile: number[] = [];
    const testCaseInfos: TestCaseInfo[] = [];

    await this.testRunManager!.ensureTestRailSetup();
    if (isReset) {
      await this.testRunManager!.resetTestRunJson();
    }

    // Skip if no tests to process
    if (testList.length === 0) {
      return;
    }

    const userId = await this.client!.getUserIdByEmail(process.env.TEST_RAIL_USERNAME as string);
    const casesInSection = await this.client!.getCases(this.projectId!, sectionId);

    // Process test cases and create results
    for (const testCase of testList) {
      ValidationUtils.validateTestCase(testCase);

      const testCaseId = await this.testCaseManager!.syncTestCase(
        sectionId,
        platformId,
        testCase,
        casesInSection,
        userId
      );

      testCaseInfos.push(testCase);
      caseIdsInListFile.push(testCaseId);
    }

    // Use WorkerManager for coordination
    await this.workerManager!.coordinateWorkers(workerId, testCaseInfos, async (allResults) => {
      // Convert TestCaseInfo to TestResult for TestRail API
      const testResults: TestResult[] = [];
      const allCaseIds: number[] = [];

      for (const testCase of allResults) {
        // Find the corresponding case ID from our processed cases
        const matchingCase = casesInSection.find((c) => c.title === testCase.title);
        if (matchingCase) {
          const testResult = this.testCaseManager!.createTestResult(testCase, matchingCase.id, userId);
          // Only add to results if not null (skip untested/skipped tests)
          if (testResult !== null) {
            testResults.push(testResult);
            allCaseIds.push(matchingCase.id);
          }
        }
      }

      // Set test run ID and case IDs
      await this.testRunManager!.setTestRunIdAndCaseId(runName, userId, allCaseIds);

      // Write JSON
      await this.testRunManager!.writeTestRunJson();

      // Update run and add results
      await this.testRunManager!.updateRunAndAddResults(testResults);
    });
  }
}

export const onTestRailHelper: TestRailHelper = new TestRailHelper();
export default TestRailHelper;

// Export types and constants for library users
export * from "./types";
export * from "./utils/constants";
export * from "./utils/errors";
export * from "./utils/playwright-converter";
export * from "./utils/failure-capture";
export * from "./utils/comment-enhancer";
