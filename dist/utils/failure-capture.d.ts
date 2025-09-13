import type { TestStep } from "../types/index";
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
 * Simplified utility class for capturing test failure information
 */
export declare class FailureCapture {
    /**
     * Extracts basic failure information (simplified from complex version)
     */
    static extractFailureInfo(testInfo: any, testResult?: any, _steps?: TestStep[]): FailureInfo | null;
    /**
     * Simple error message cleaning (simplified from complex ANSI handling)
     */
    static cleanErrorMessage(message: string): string;
    /**
     * Simple failure comment formatting with newlines
     */
    static formatFailureComment(failureInfo: FailureInfo, _includeStackTrace?: boolean): string;
    /**
     * Simple timeout failure extraction
     */
    static extractTimeoutFailure(testInfo: any, testResult?: any): FailureInfo | null;
    /**
     * Simple interruption failure extraction
     */
    static extractInterruptionFailure(_testInfo: any, testResult?: any): FailureInfo | null;
}
