import type { TestCaseInfo } from "../types/index.js";
/**
 * Configuration options for comment enhancement
 */
export interface CommentEnhancementConfig {
    includeStackTrace: boolean;
    includeDuration: boolean;
    includeTimestamp: boolean;
    maxCommentLength: number;
    customPrefix?: string;
}
/**
 * Default configuration for comment enhancement
 */
export declare const DEFAULT_COMMENT_CONFIG: CommentEnhancementConfig;
/**
 * TestRail status mapping
 */
export declare const STATUS_MAPPING: {
    readonly passed: 1;
    readonly blocked: 2;
    readonly untested: 3;
    readonly retest: 4;
    readonly failed: 5;
};
/**
 * Status names for display
 */
export declare const STATUS_NAMES: {
    readonly 1: "Passed";
    readonly 2: "Blocked";
    readonly 3: "Untested";
    readonly 4: "Retest";
    readonly 5: "Failed";
};
/**
 * Utility class for enhancing TestRail comments with detailed test information
 */
export declare class CommentEnhancer {
    private config;
    constructor(config?: Partial<CommentEnhancementConfig>);
    /**
     * Formats duration from milliseconds to human readable format
     */
    formatDuration(ms: number): string;
    /**
     * Truncates text to specified length with ellipsis
     */
    truncateText(text: string, maxLength?: number): string;
    /**
     * Checks if call log contains useful debugging information
     */
    hasUsefulCallLog(callLog: string): boolean;
    /**
     * Formats failed test comment with error details
     */
    formatFailedComment(testCase: TestCaseInfo): string;
    /**
     * Formats passed test comment
     */
    formatPassedComment(duration: number): string;
    /**
     * Creates TestRail result object from test case
     */
    formatTestResult(testCase: TestCaseInfo): {
        case_id: string;
        status_id: number;
        status_name: string;
        assignedto_id: string;
        comment: string;
        elapsed: number;
        elapsed_readable: string;
    };
    /**
     * Enhances a test result comment with detailed information
     * @param testCase - Test case information
     * @returns Enhanced comment string
     */
    enhanceComment(testCase: TestCaseInfo): string;
    /**
     * Creates a simple comment for passed tests
     */
    createSimplePassedComment(testCase: TestCaseInfo, executedByText?: string): string;
    /**
     * Updates the configuration
     */
    updateConfig(newConfig: Partial<CommentEnhancementConfig>): void;
    /**
     * Gets the current configuration
     */
    getConfig(): CommentEnhancementConfig;
}
