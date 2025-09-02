import type { TestCaseInfo } from "../types/index.js";
import { cleanAnsiCodes } from "./ansi-cleaner.js";

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
export const DEFAULT_COMMENT_CONFIG: CommentEnhancementConfig = {
  includeStackTrace: false,
  includeDuration: true,
  includeTimestamp: false,
  maxCommentLength: 4000, // TestRail comment limit
  customPrefix: undefined
};

/**
 * TestRail status mapping
 */
export const STATUS_MAPPING = {
  passed: 1,
  blocked: 2,
  untested: 3,
  retest: 4,
  failed: 5
} as const;

/**
 * Status names for display
 */
export const STATUS_NAMES = {
  1: "Passed",
  2: "Blocked",
  3: "Untested",
  4: "Retest",
  5: "Failed"
} as const;

/**
 * Utility class for enhancing TestRail comments with detailed test information
 */
export class CommentEnhancer {
  private config: CommentEnhancementConfig;

  constructor(config: Partial<CommentEnhancementConfig> = {}) {
    this.config = { ...DEFAULT_COMMENT_CONFIG, ...config };
  }

  /**
   * Formats duration from milliseconds to human readable format
   */
  formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  }

  /**
   * Truncates text to specified length with ellipsis
   */
  truncateText(text: string, maxLength = 100): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  }

  /**
   * Checks if call log contains useful debugging information
   */
  hasUsefulCallLog(callLog: string): boolean {
    return (
      callLog.includes("locator resolved to") || callLog.includes("unexpected value") || callLog.includes("waiting for")
    );
  }

  /**
   * Formats failed test comment with error details
   */
  formatFailedComment(testCase: TestCaseInfo): string {
    let comment = `Status: Failed\nDuration: ${this.formatDuration(testCase.duration)}\n\n`;

    if (testCase.errors && testCase.errors.length > 0) {
      const error = testCase.errors[0];
      const errorMessage = error.message;

      // Clean ANSI codes
      const cleanMessage = cleanAnsiCodes(errorMessage);

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
      } else {
        // UI Test - parse from message
        const locatorMatch = cleanMessage.match(/Locator: (.+)/);
        const expectedMatch = cleanMessage.match(/Expected pattern: (.+)/);
        const receivedMatch = cleanMessage.match(/Received string:\s*(.+)/);

        if (locatorMatch) comment += `\n\nLocator: ${this.truncateText(locatorMatch[1], 80)}`;
        if (expectedMatch) comment += `\nExpected: ${this.truncateText(expectedMatch[1], 50)}`;
        if (receivedMatch) comment += `\nReceived: ${this.truncateText(receivedMatch[1], 100)}`;

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
  formatPassedComment(duration: number): string {
    return `Status: Passed\nDuration: ${this.formatDuration(duration)}\n\nExecuted by Playwright`;
  }

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
  } {
    const statusId = testCase.status === "passed" ? STATUS_MAPPING.passed : STATUS_MAPPING.failed;

    return {
      case_id: "[generated_case_id]",
      status_id: statusId,
      status_name: STATUS_NAMES[statusId],
      assignedto_id: "[user_id]",
      comment:
        testCase.status === "passed" ? this.formatPassedComment(testCase.duration) : this.formatFailedComment(testCase),
      elapsed: testCase.duration,
      elapsed_readable: this.formatDuration(testCase.duration)
    };
  }

  /**
   * Enhances a test result comment with detailed information
   * @param testCase - Test case information
   * @returns Enhanced comment string
   */
  enhanceComment(testCase: TestCaseInfo): string {
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
    } else if (testCase.status === "failed") {
      comment += this.formatFailedComment(testCase).split("\n\n").slice(1).join("\n\n"); // Remove duplicate status/duration
    } else if (testCase.status === "timeOut") {
      comment += "⏱️ Test Timed Out\nThe test exceeded the maximum allowed execution time.";
    } else if (testCase.status === "interrupted") {
      comment += "🚫 Test Interrupted\nThe test was interrupted during execution.";
    } else if (testCase.status === "skipped") {
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
  createSimplePassedComment(testCase: TestCaseInfo, executedByText = "Executed by Playwright"): string {
    const parts: string[] = [];

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
  updateConfig(newConfig: Partial<CommentEnhancementConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Gets the current configuration
   */
  getConfig(): CommentEnhancementConfig {
    return { ...this.config };
  }
}
