interface PlaywrightTestInfo {
    title: string;
    file: string;
    status?: "passed" | "failed" | "timedOut" | "skipped" | "interrupted";
    duration?: number;
    startTime?: Date;
    endTime?: Date;
    annotations?: Array<{
        type: string;
        description?: string;
    }>;
    project?: {
        name: string;
    };
    attachments?: Array<{
        name: string;
        [key: string]: unknown;
    }>;
    [key: string]: unknown;
}
interface PlaywrightTestResult {
    status: "passed" | "failed" | "timedOut" | "skipped" | "interrupted";
    duration: number;
    steps?: Array<{
        category?: string;
        title: string;
        error?: Error | {
            message: string;
        };
        [key: string]: unknown;
    }>;
    [key: string]: unknown;
}
import type { TestCaseInfo } from "../types/index.js";
/**
 * Utility functions for converting Playwright test objects to TestRail format
 */
export declare class PlaywrightConverter {
    /**
     * Converts Playwright TestInfo to TestCaseInfo format
     * @param testInfo - Playwright TestInfo object
     * @param testResult - Playwright TestResult object (optional)
     * @returns TestCaseInfo object for TestRail integration
     */
    static convertTestInfo(testInfo: PlaywrightTestInfo, testResult?: PlaywrightTestResult): TestCaseInfo;
    /**
     * Extracts tags from test title, annotations, or project name
     * @param testInfo - Playwright TestInfo object
     * @returns Array of tags
     */
    private static extractTags;
    /**
     * Determines test status from TestInfo and TestResult
     * @param testInfo - Playwright TestInfo object
     * @param testResult - Playwright TestResult object
     * @returns Test status string
     */
    private static getTestStatus;
    /**
     * Gets test duration from TestInfo or TestResult
     * @param testInfo - Playwright TestInfo object
     * @param testResult - Playwright TestResult object
     * @returns Duration in milliseconds
     */
    private static getTestDuration;
    /**
     * Extracts test steps from TestInfo or TestResult
     * @param testInfo - Playwright TestInfo object
     * @param testResult - Playwright TestResult object
     * @returns Array of test steps
     */
    private static extractTestSteps;
    /**
     * Converts multiple Playwright test results to TestCaseInfo array
     * @param testInfos - Array of Playwright TestInfo objects
     * @param testResults - Array of Playwright TestResult objects (optional)
     * @returns Array of TestCaseInfo objects
     */
    static convertMultipleTests(testInfos: PlaywrightTestInfo[], testResults?: PlaywrightTestResult[]): TestCaseInfo[];
    /**
     * Converts Playwright test result from afterEach hook
     * @param testInfo - Playwright TestInfo from afterEach
     * @returns TestCaseInfo object
     */
    static convertFromAfterEach(testInfo: PlaywrightTestInfo): TestCaseInfo;
    /**
     * Converts Playwright test result from teardown
     * @param testInfo - Playwright TestInfo from teardown
     * @param error - Error object if test failed
     * @returns TestCaseInfo object
     */
    static convertFromTeardown(testInfo: PlaywrightTestInfo, error?: Error): TestCaseInfo;
}
export {};
