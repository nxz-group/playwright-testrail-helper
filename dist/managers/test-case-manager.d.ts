import type { TestRailClient } from "@api/testrail-client";
import { TestStatus } from "@utils/constants";
import type { TestCaseInfo, TestResult } from "../types/index.js";
/**
 * Manages test case synchronization and creation logic
 */
export declare class TestCaseManager {
    private client;
    private readonly playwrightExecuted;
    constructor(client: TestRailClient, executedByText?: string);
    /**
     * Processes and normalizes tag list by removing duplicates and @ symbols
     * @param tagList - Array of tag strings
     * @returns Normalized tag array
     */
    private normalizeTags;
    /**
     * Determines TestRail test type based on tags
     * @param tags - Array of normalized tags
     * @returns TestType enum value
     */
    private getTestType;
    /**
     * Determines TestRail priority based on last tag
     * @param tags - Array of normalized tags
     * @returns Priority enum value
     */
    private getPriority;
    /**
     * Maps test status string to TestRail status ID
     * @param status - Test status string
     * @returns TestRail status enum value
     */
    getStatusId(status: string): TestStatus;
    /**
     * Formats test duration from milliseconds to human readable format
     * @param ms - Duration in milliseconds
     * @returns Formatted duration string
     */
    formatDuration(ms: number): string;
    /**
     * Validates test case data structure
     * @param testCase - Test case to validate
     * @throws {TestRailError} When validation fails
     */
    validateTestCase(testCase: TestCaseInfo): void;
    /**
     * Synchronizes test case with TestRail (creates or updates)
     * @param sectionId - TestRail section ID
     * @param platformId - Platform identifier
     * @param testCaseInfo - Test case information
     * @param existingCases - Existing test cases in section
     * @param userId - User ID for assignment
     * @returns Test case ID
     */
    syncTestCase(sectionId: number, platformId: number, testCaseInfo: TestCaseInfo, existingCases: Array<{
        id: number;
        title: string;
    }>, userId: number): Promise<number>;
    /**
     * Creates test result object for TestRail
     * @param testCase - Test case information
     * @param testCaseId - TestRail test case ID
     * @param userId - User ID for assignment
     * @returns Test result object
     */
    createTestResult(testCase: TestCaseInfo, testCaseId: number, userId: number): TestResult;
}
