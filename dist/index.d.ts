import type { TestCaseInfo } from "@types";
import { Platform } from "@utils/constants";
/**
 * Main TestRail integration helper class
 * Orchestrates test case synchronization and result reporting
 */
declare class TestRailHelper {
    private readonly testRailDir;
    private readonly projectId;
    private readonly client;
    private readonly testCaseManager;
    private readonly testRunManager;
    private readonly workerManager;
    readonly platform: typeof Platform;
    /**
     * Creates a new TestRailHelper instance
     * Initializes all managers and clients with TestRail credentials from environment variables
     * @throws {ConfigurationError} When required environment variables are missing
     */
    constructor();
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
export * from "@types";
export * from "@utils/constants";
export * from "@utils/errors";
