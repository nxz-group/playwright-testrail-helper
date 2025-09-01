import type { TestCaseInfo } from "../types/index.js";
import type { FailureInfo } from "./failure-capture.js";
/**
 * Configuration options for comment enhancement
 */
export interface CommentEnhancementConfig {
    includeStackTrace: boolean;
    includeDuration: boolean;
    includeTimestamp: boolean;
    includeEnvironmentInfo: boolean;
    maxCommentLength: number;
    customPrefix?: string;
}
/**
 * Default configuration for comment enhancement
 */
export declare const DEFAULT_COMMENT_CONFIG: CommentEnhancementConfig;
/**
 * Environment information interface
 */
export interface EnvironmentInfo {
    browser?: string;
    browserVersion?: string;
    os?: string;
    nodeVersion?: string;
    playwrightVersion?: string;
    testWorker?: string;
}
/**
 * Utility class for enhancing TestRail comments with detailed test information
 */
export declare class CommentEnhancer {
    private config;
    constructor(config?: Partial<CommentEnhancementConfig>);
    /**
     * Enhances a test result comment with detailed information
     * @param testCase - Test case information
     * @param failureInfo - Failure information (if test failed)
     * @param environmentInfo - Environment information
     * @returns Enhanced comment string
     */
    enhanceComment(testCase: TestCaseInfo, failureInfo?: FailureInfo | null, environmentInfo?: EnvironmentInfo): string;
    /**
     * Formats test status with appropriate emoji and styling
     * @param testCase - Test case information
     * @returns Formatted status string
     */
    private formatTestStatus;
    /**
     * Formats duration from milliseconds to human readable format
     * @param ms - Duration in milliseconds
     * @returns Formatted duration string
     */
    private formatDuration;
    /**
     * Formats environment information
     * @param envInfo - Environment information
     * @returns Formatted environment string
     */
    private formatEnvironmentInfo;
    /**
     * Formats test steps summary
     * @param steps - Array of test steps
     * @returns Formatted steps string
     */
    private formatTestSteps;
    /**
     * Creates a simple comment for passed tests
     * @param testCase - Test case information
     * @param executedByText - Custom executed by text
     * @returns Simple comment string
     */
    createSimplePassedComment(testCase: TestCaseInfo, executedByText?: string): string;
    /**
     * Extracts environment information from test context
     * @param testInfo - Playwright TestInfo object
     * @returns Environment information
     */
    static extractEnvironmentInfo(testInfo: any): EnvironmentInfo;
    /**
     * Updates the configuration
     * @param newConfig - New configuration options
     */
    updateConfig(newConfig: Partial<CommentEnhancementConfig>): void;
    /**
     * Gets the current configuration
     * @returns Current configuration
     */
    getConfig(): CommentEnhancementConfig;
}
