import type { TestRailClient } from "@api/testrail-client";
import type { TestResult } from "../types/index.js";
/**
 * Manages TestRail test run operations and file persistence
 */
export declare class TestRunManager {
    private client;
    private readonly testRailDir;
    private readonly testRailResultJson;
    private readonly encode;
    private readonly projectId;
    private existingTestRunId;
    private existingCaseIds;
    private newCaseIds;
    private newTestRunId;
    constructor(client: TestRailClient, projectId: number, testRailDir?: string);
    /**
     * Checks if directory has sufficient space and write permissions
     * @param dirPath - Directory to check
     * @param dataSize - Estimated size of data to write
     */
    private checkDiskSpaceAndPermissions;
    /**
     * Safely writes JSON data to file with atomic operations and file locking
     * @param filePath - Path to the file
     * @param data - Data to write
     */
    private writeJsonSafely;
    /**
     * Ensures TestRail directory and result file exist
     */
    ensureTestRailSetup(): Promise<void>;
    /**
     * Loads existing test run data from JSON file
     */
    loadTestRunFromJson(): Promise<void>;
    /**
     * Resets test run JSON file
     */
    resetTestRunJson(): Promise<void>;
    /**
     * Writes current test run data to JSON file
     */
    writeTestRunJson(): Promise<void>;
    /**
     * Sets test run ID and case IDs with file locking for parallel execution
     * @param runName - Test run name
     * @param userId - User ID for assignment
     * @param caseIds - Array of test case IDs
     */
    setTestRunIdAndCaseId(runName: string, userId: number, caseIds: number[]): Promise<void>;
    /**
     * Gets the current test run ID
     */
    getTestRunId(): number;
    /**
     * Gets the current case IDs
     */
    getCaseIds(): number[];
    /**
     * Updates test run with case IDs and adds results
     * @param testResults - Array of test results
     */
    updateRunAndAddResults(testResults: TestResult[]): Promise<void>;
}
