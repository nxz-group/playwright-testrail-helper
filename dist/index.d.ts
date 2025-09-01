import type { TestCaseInfo } from "./types";
import { AutomationType, Platform, Priority, TestStatus, TestTemplate, TestType } from "./utils/constants";
/**
 * Main TestRail integration helper class
 * Orchestrates test case synchronization and result reporting
 */
declare class TestRailHelper {
    private testRailDir?;
    private projectId?;
    private client?;
    private testCaseManager?;
    private testRunManager?;
    private workerManager?;
    private initialized;
    readonly platform: typeof Platform;
    readonly testStatus: typeof TestStatus;
    readonly testTemplate: typeof TestTemplate;
    readonly testType: typeof TestType;
    readonly automationType: typeof AutomationType;
    readonly priority: typeof Priority;
    /**
     * Creates a new TestRailHelper instance
     * Initialization is deferred until first method call to avoid environment variable errors at import time
     */
    constructor();
    /**
     * Initializes the TestRail helper with environment variables
     * @throws {ConfigurationError} When required environment variables are missing
     */
    private initialize;
    /**
     * Updates a single test result in TestRail from Playwright TestInfo (simplest usage)
     * @param runName - Name of the test run
     * @param sectionId - TestRail section ID where test cases belong
     * @param platformId - Platform identifier for test execution
     * @param testInfo - Playwright TestInfo object
     * @param isReset - Whether to reset existing test run data (default: false)
     * @throws {TestRailError} When validation fails or TestRail operations fail
     */
    updateTestResultFromPlaywrightSingle(runName: string, sectionId: number, platformId: number, testInfo: unknown, isReset?: boolean): Promise<void>;
    /**
     * Updates test results in TestRail from Playwright TestInfo objects (recommended)
     * @param runName - Name of the test run
     * @param sectionId - TestRail section ID where test cases belong
     * @param platformId - Platform identifier for test execution
     * @param testInfos - Array of Playwright TestInfo objects to process
     * @param isReset - Whether to reset existing test run data (default: false)
     * @throws {TestRailError} When validation fails or TestRail operations fail
     */
    updateTestResultFromPlaywright(runName: string, sectionId: number, platformId: number, testInfos: unknown[], isReset?: boolean): Promise<void>;
    /**
     * Updates test results in TestRail by syncing test cases and creating/updating test runs
     * @param runName - Name of the test run
     * @param sectionId - TestRail section ID where test cases belong
     * @param platformId - Platform identifier for test execution
     * @param testList - Array of test case information to process
     * @param isReset - Whether to reset existing test run data (default: false)
     * @throws {TestRailError} When validation fails or TestRail operations fail
     */
    updateTestResult(runName: string, sectionId: number, platformId: number, testList: TestCaseInfo[], isReset?: boolean): Promise<void>;
}
export declare const onTestRailHelper: TestRailHelper;
export default TestRailHelper;
export * from "./types";
export * from "./utils/constants";
export * from "./utils/errors";
export * from "./utils/playwright-converter";
export * from "./utils/failure-capture";
export * from "./utils/comment-enhancer";
