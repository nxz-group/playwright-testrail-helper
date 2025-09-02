import type { TestStep } from "../types/index.js";
/**
 * Interface for Playwright error information
 */
export interface PlaywrightError {
    message: string;
    stack?: string;
    location?: {
        file: string;
        line: number;
        column: number;
    };
}
/**
 * Interface for captured failure information
 */
export interface FailureInfo {
    errorMessage: string;
    errorStack?: string;
    failedStep?: string;
    location?: {
        file: string;
        line: number;
        column: number;
    };
    screenshot?: string;
    video?: string;
    trace?: string;
}
/**
 * Utility class for capturing and processing test failure information from Playwright
 */
export declare class FailureCapture {
    /**
     * Extracts detailed failure information from Playwright test results
     * @param testInfo - Playwright TestInfo object
     * @param testResult - Playwright TestResult object
     * @param steps - Test steps array
     * @returns Detailed failure information
     */
    static extractFailureInfo(testInfo: any, testResult?: any, steps?: TestStep[]): FailureInfo | null;
    /**
     * Cleans and formats error messages for better readability
     * @param message - Raw error message
     * @returns Cleaned and formatted error message
     */
    static cleanErrorMessage(message: string): string;
    /**
     * Formats Playwright error messages into a more readable structure
     * @param message - Cleaned error message
     * @returns Formatted error message
     */
    static formatPlaywrightError(message: string): string;
    /**
     * Formats failure information into a readable comment for TestRail
     * @param failureInfo - Failure information object
     * @param includeStackTrace - Whether to include stack trace (default: false)
     * @returns Formatted comment string
     */
    static formatFailureComment(failureInfo: FailureInfo, includeStackTrace?: boolean): string;
    /**
     * Truncates stack trace to reasonable length for TestRail comments
     * @param stackTrace - Full stack trace
     * @returns Truncated stack trace
     */
    static truncateStackTrace(stackTrace: string): string;
    /**
     * Extracts timeout-specific failure information
     * @param testInfo - Playwright TestInfo object
     * @param testResult - Playwright TestResult object
     * @returns Timeout failure information
     */
    static extractTimeoutFailure(testInfo: any, testResult?: any): FailureInfo | null;
    /**
     * Extracts browser crash or interruption failure information
     * @param testInfo - Playwright TestInfo object
     * @param testResult - Playwright TestResult object
     * @returns Interruption failure information
     */
    static extractInterruptionFailure(testInfo: any, testResult?: any): FailureInfo | null;
}
