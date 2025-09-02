import type { TestRailClient } from "../api/testrail-client";
import type { TestCaseInfo, TestResult } from "../types/index.js";
import { type CommentEnhancementConfig } from "../utils/comment-enhancer.js";
import { TestStatus } from "../utils/constants";
/**
 * Manages test case synchronization and creation logic
 */
export declare class TestCaseManager {
    private client;
    private readonly playwrightExecuted;
    private readonly commentEnhancer;
    constructor(client: TestRailClient, executedByText?: string, commentConfig?: Partial<CommentEnhancementConfig>);
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
     * @returns TestRail status enum value or null for skipped tests
     */
    getStatusId(status: string): TestStatus | null;
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
     * @returns Test result object or null for skipped tests
     */
    createTestResult(testCase: TestCaseInfo, testCaseId: number, userId: number): TestResult | null;
    /**
     * Updates comment enhancement configuration
     * @param config - New configuration options
     */
    updateCommentConfig(config: Partial<CommentEnhancementConfig>): void;
    /**
     * Gets current comment enhancement configuration
     * @returns Current configuration
     */
    getCommentConfig(): CommentEnhancementConfig;
}
