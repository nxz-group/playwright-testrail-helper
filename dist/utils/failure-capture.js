"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FailureCapture = void 0;
/**
 * Utility class for capturing and processing test failure information from Playwright
 */
class FailureCapture {
    /**
     * Extracts detailed failure information from Playwright test results
     * @param testInfo - Playwright TestInfo object
     * @param testResult - Playwright TestResult object
     * @param steps - Test steps array
     * @returns Detailed failure information
     */
    static extractFailureInfo(testInfo, testResult, steps) {
        // Only process failed tests
        if (!testResult || testResult.status !== "failed") {
            return null;
        }
        const failureInfo = {
            errorMessage: "Test failed",
            errorStack: undefined,
            failedStep: undefined,
            location: undefined,
            screenshot: undefined,
            video: undefined,
            trace: undefined
        };
        // Extract error from test result
        if (testResult.error) {
            failureInfo.errorMessage = FailureCapture.cleanErrorMessage(testResult.error.message || testResult.error.toString());
            failureInfo.errorStack = testResult.error.stack;
        }
        // Extract error from failed steps
        if (steps && steps.length > 0) {
            const failedStep = steps.find((step) => step.error);
            if (failedStep) {
                failureInfo.failedStep = failedStep.title;
                if (failedStep.error) {
                    failureInfo.errorMessage = FailureCapture.cleanErrorMessage(failedStep.error.message);
                }
            }
        }
        // Extract location information
        if (testInfo.location) {
            failureInfo.location = {
                file: testInfo.location.file,
                line: testInfo.location.line,
                column: testInfo.location.column
            };
        }
        // Extract attachments (screenshots, videos, traces)
        if (testInfo.attachments) {
            for (const attachment of testInfo.attachments) {
                if (attachment.name === "screenshot" && attachment.path) {
                    failureInfo.screenshot = attachment.path;
                }
                else if (attachment.name === "video" && attachment.path) {
                    failureInfo.video = attachment.path;
                }
                else if (attachment.name === "trace" && attachment.path) {
                    failureInfo.trace = attachment.path;
                }
            }
        }
        return failureInfo;
    }
    /**
     * Cleans error messages by removing ANSI escape codes and formatting
     * @param message - Raw error message
     * @returns Cleaned error message
     */
    static cleanErrorMessage(message) {
        if (!message)
            return "";
        // Remove ANSI escape codes using string methods to avoid control character regex issues
        let cleaned = message;
        // Remove common ANSI sequences by character code
        const escChar = String.fromCharCode(27); // ESC character
        const patterns = [
            `${escChar}[0m`,
            `${escChar}[1m`,
            `${escChar}[2m`,
            `${escChar}[3m`,
            `${escChar}[4m`,
            `${escChar}[30m`,
            `${escChar}[31m`,
            `${escChar}[32m`,
            `${escChar}[33m`,
            `${escChar}[34m`,
            `${escChar}[35m`,
            `${escChar}[36m`,
            `${escChar}[37m`,
            `${escChar}[90m`,
            `${escChar}[91m`,
            `${escChar}[92m`,
            `${escChar}[93m`,
            `${escChar}[94m`,
            `${escChar}[95m`,
            `${escChar}[96m`,
            `${escChar}[97m`,
            `${escChar}[2J`,
            `${escChar}[H`
        ];
        for (const pattern of patterns) {
            cleaned = cleaned.split(pattern).join("");
        }
        // Remove excessive whitespace
        cleaned = cleaned.replace(/\s+/g, " ").trim();
        // Truncate very long messages
        if (cleaned.length > 1000) {
            cleaned = cleaned.substring(0, 997) + "...";
        }
        return cleaned;
    }
    /**
     * Formats failure information into a readable comment for TestRail
     * @param failureInfo - Failure information object
     * @param includeStackTrace - Whether to include stack trace (default: false)
     * @returns Formatted comment string
     */
    static formatFailureComment(failureInfo, includeStackTrace = false) {
        const parts = [];
        // Add main error message
        parts.push(`❌ **Test Failed**`);
        parts.push(`**Error:** ${failureInfo.errorMessage}`);
        // Add failed step if available
        if (failureInfo.failedStep) {
            parts.push(`**Failed Step:** ${failureInfo.failedStep}`);
        }
        // Add location information
        if (failureInfo.location) {
            const locationStr = `${failureInfo.location.file}:${failureInfo.location.line}:${failureInfo.location.column}`;
            parts.push(`**Location:** ${locationStr}`);
        }
        // Add attachment information
        const attachments = [];
        if (failureInfo.screenshot) {
            attachments.push("📸 Screenshot");
        }
        if (failureInfo.video) {
            attachments.push("🎥 Video");
        }
        if (failureInfo.trace) {
            attachments.push("🔍 Trace");
        }
        if (attachments.length > 0) {
            parts.push(`**Attachments:** ${attachments.join(", ")}`);
        }
        // Add stack trace if requested and available
        if (includeStackTrace && failureInfo.errorStack) {
            parts.push(`**Stack Trace:**`);
            parts.push("```");
            parts.push(FailureCapture.truncateStackTrace(failureInfo.errorStack));
            parts.push("```");
        }
        return parts.join("\n");
    }
    /**
     * Truncates stack trace to reasonable length for TestRail comments
     * @param stackTrace - Full stack trace
     * @returns Truncated stack trace
     */
    static truncateStackTrace(stackTrace) {
        const lines = stackTrace.split("\n");
        // Keep first 10 lines of stack trace
        if (lines.length > 10) {
            return lines.slice(0, 10).join("\n") + "\n... (truncated)";
        }
        return stackTrace;
    }
    /**
     * Extracts timeout-specific failure information
     * @param testInfo - Playwright TestInfo object
     * @param testResult - Playwright TestResult object
     * @returns Timeout failure information
     */
    static extractTimeoutFailure(testInfo, testResult) {
        if (!testResult || testResult.status !== "timedOut") {
            return null;
        }
        const timeout = testInfo.timeout || 30000; // Default 30s
        const duration = testResult.duration || 0;
        return {
            errorMessage: `Test timed out after ${timeout}ms (actual duration: ${duration}ms)`,
            errorStack: undefined,
            failedStep: "Test execution timeout",
            location: testInfo.location
                ? {
                    file: testInfo.location.file,
                    line: testInfo.location.line,
                    column: testInfo.location.column
                }
                : undefined,
            screenshot: undefined,
            video: undefined,
            trace: undefined
        };
    }
    /**
     * Extracts browser crash or interruption failure information
     * @param testInfo - Playwright TestInfo object
     * @param testResult - Playwright TestResult object
     * @returns Interruption failure information
     */
    static extractInterruptionFailure(testInfo, testResult) {
        if (!testResult || testResult.status !== "interrupted") {
            return null;
        }
        return {
            errorMessage: "Test was interrupted (browser crash or external interruption)",
            errorStack: undefined,
            failedStep: "Test execution interrupted",
            location: testInfo.location
                ? {
                    file: testInfo.location.file,
                    line: testInfo.location.line,
                    column: testInfo.location.column
                }
                : undefined,
            screenshot: undefined,
            video: undefined,
            trace: undefined
        };
    }
}
exports.FailureCapture = FailureCapture;
