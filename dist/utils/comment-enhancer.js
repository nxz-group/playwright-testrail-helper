"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommentEnhancer = exports.STATUS_NAMES = exports.STATUS_MAPPING = exports.DEFAULT_COMMENT_CONFIG = void 0;
const ansi_cleaner_1 = require("./ansi-cleaner");
/**
 * Default configuration for comment enhancement
 */
exports.DEFAULT_COMMENT_CONFIG = {
    includeStackTrace: false,
    includeDuration: true,
    includeTimestamp: false,
    maxCommentLength: 4000, // TestRail comment limit
    customPrefix: undefined
};
/**
 * TestRail status mapping
 */
exports.STATUS_MAPPING = {
    passed: 1,
    blocked: 2,
    untested: 3,
    retest: 4,
    failed: 5
};
/**
 * Status names for display
 */
exports.STATUS_NAMES = {
    1: "Passed",
    2: "Blocked",
    3: "Untested",
    4: "Retest",
    5: "Failed"
};
/**
 * Utility class for enhancing TestRail comments with detailed test information
 */
class CommentEnhancer {
    constructor(config = {}) {
        this.config = { ...exports.DEFAULT_COMMENT_CONFIG, ...config };
    }
    /**
     * Formats duration from milliseconds to human readable format
     */
    formatDuration(ms) {
        if (ms < 1000)
            return `${ms}ms`;
        if (ms < 60000)
            return `${(ms / 1000).toFixed(1)}s`;
        return `${(ms / 60000).toFixed(1)}m`;
    }
    /**
     * Truncates text to specified length with ellipsis
     */
    truncateText(text, maxLength = 100) {
        if (text.length <= maxLength)
            return text;
        return text.substring(0, maxLength) + "...";
    }
    /**
     * Checks if call log contains useful debugging information
     */
    hasUsefulCallLog(callLog) {
        return (callLog.includes("locator resolved to") || callLog.includes("unexpected value") || callLog.includes("waiting for"));
    }
    /**
     * Formats failed test comment with error details
     */
    formatFailedComment(testCase) {
        let comment = `Status: Failed\nDuration: ${this.formatDuration(testCase.duration)}\n\n`;
        if (testCase.errors && testCase.errors.length > 0) {
            const error = testCase.errors[0];
            const errorMessage = error.message;
            // Clean ANSI codes
            const cleanMessage = (0, ansi_cleaner_1.cleanAnsiCodes)(errorMessage);
            // Split into sections
            const sections = cleanMessage.split("\n\n");
            const mainError = sections[0]; // Error: expect(locator)... or expect(received).toBe(expected)
            comment += mainError;
            // Handle different error types
            if (error.matcherResult) {
                // API Test - has matcherResult object
                comment += `\n\nExpected: ${error.matcherResult.expected}`;
                comment += `\nReceived: ${error.matcherResult.actual}`;
                comment += `\nMatcher: ${error.matcherResult.name}`;
            }
            else {
                // UI Test - parse from message
                const locatorMatch = cleanMessage.match(/Locator: (.+)/);
                const expectedMatch = cleanMessage.match(/Expected pattern: (.+)/);
                const receivedMatch = cleanMessage.match(/Received string:\s*(.+)/);
                if (locatorMatch)
                    comment += `\n\nLocator: ${this.truncateText(locatorMatch[1], 80)}`;
                if (expectedMatch)
                    comment += `\nExpected: ${this.truncateText(expectedMatch[1], 50)}`;
                if (receivedMatch)
                    comment += `\nReceived: ${this.truncateText(receivedMatch[1], 100)}`;
                // Optional: Add call log only if it has useful info
                const callLogSection = cleanMessage.match(/Call log:\n([\s\S]*?)(?:\n\nCall Log:|$)/);
                if (callLogSection && this.hasUsefulCallLog(callLogSection[1])) {
                    comment += `\n\nCall log:\n${callLogSection[1]}`;
                }
            }
        }
        return comment;
    }
    /**
     * Formats passed test comment
     */
    formatPassedComment(duration) {
        return `Status: Passed\nDuration: ${this.formatDuration(duration)}\n\nExecuted by Playwright`;
    }
    /**
     * Creates TestRail result object from test case
     */
    formatTestResult(testCase) {
        const statusId = testCase.status === "passed" ? exports.STATUS_MAPPING.passed : exports.STATUS_MAPPING.failed;
        return {
            case_id: "[generated_case_id]",
            status_id: statusId,
            status_name: exports.STATUS_NAMES[statusId],
            assignedto_id: "[user_id]",
            comment: testCase.status === "passed" ? this.formatPassedComment(testCase.duration) : this.formatFailedComment(testCase),
            elapsed: testCase.duration,
            elapsed_readable: this.formatDuration(testCase.duration)
        };
    }
    /**
     * Enhances a test result comment with detailed information
     * @param testCase - Test case information
     * @returns Enhanced comment string
     */
    enhanceComment(testCase) {
        let comment = "";
        // Add status and duration at the top (always included)
        comment += `Status: ${testCase.status === "passed" ? "Passed" : testCase.status === "failed" ? "Failed" : testCase.status}\n`;
        comment += `Duration: ${this.formatDuration(testCase.duration)}\n\n`;
        // Add custom prefix if provided
        if (this.config.customPrefix) {
            comment += `${this.config.customPrefix}\n\n`;
        }
        // Handle different test statuses
        if (testCase.status === "passed") {
            comment += "Executed by Playwright";
        }
        else if (testCase.status === "failed") {
            comment += this.formatFailedComment(testCase).split("\n\n").slice(1).join("\n\n"); // Remove duplicate status/duration
        }
        else if (testCase.status === "timeOut") {
            comment += "⏱️ Test Timed Out\nThe test exceeded the maximum allowed execution time.";
        }
        else if (testCase.status === "interrupted") {
            comment += "🚫 Test Interrupted\nThe test was interrupted during execution.";
        }
        else if (testCase.status === "skipped") {
            comment += "⏭️ Test Skipped";
        }
        // Add timestamp if enabled
        if (this.config.includeTimestamp) {
            comment += `\n\nExecuted: ${new Date().toLocaleString()}`;
        }
        // Truncate if too long
        if (comment.length > this.config.maxCommentLength) {
            comment = comment.substring(0, this.config.maxCommentLength - 20) + "\n\n... (truncated)";
        }
        return comment;
    }
    /**
     * Creates a simple comment for passed tests
     */
    createSimplePassedComment(testCase, executedByText = "Executed by Playwright") {
        const parts = [];
        // Always include status and duration at the top
        parts.push("Status: Passed");
        parts.push(`Duration: ${this.formatDuration(testCase.duration)}`);
        parts.push(""); // Empty line separator
        if (this.config.customPrefix) {
            parts.push(this.config.customPrefix);
            parts.push("");
        }
        parts.push(executedByText);
        if (this.config.includeTimestamp) {
            parts.push("");
            parts.push(`Executed: ${new Date().toLocaleString()}`);
        }
        return parts.join("\n");
    }
    /**
     * Updates the configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }
    /**
     * Gets the current configuration
     */
    getConfig() {
        return { ...this.config };
    }
}
exports.CommentEnhancer = CommentEnhancer;
