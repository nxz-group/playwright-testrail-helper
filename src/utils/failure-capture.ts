import type { TestStep } from "../types/index.js";
import { cleanAnsiCodes } from "./ansi-cleaner.js";

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
export class FailureCapture {
  /**
   * Extracts detailed failure information from Playwright test results
   * @param testInfo - Playwright TestInfo object
   * @param testResult - Playwright TestResult object
   * @param steps - Test steps array
   * @returns Detailed failure information
   */
  static extractFailureInfo(testInfo: any, testResult?: any, steps?: TestStep[]): FailureInfo | null {
    // Check if test failed from either testInfo or testResult
    const status = testResult?.status || testInfo?.status;
    if (status !== "failed") {
      return null;
    }

    const failureInfo: FailureInfo = {
      errorMessage: "Test failed",
      errorStack: undefined,
      failedStep: undefined,
      location: undefined,
      screenshot: undefined,
      video: undefined,
      trace: undefined
    };

    // Priority 1: Extract error from testInfo.errors array (real Playwright structure)
    if (testInfo.errors && testInfo.errors.length > 0) {
      const firstError = testInfo.errors[0];
      failureInfo.errorMessage = FailureCapture.cleanErrorMessage(firstError.message);
      failureInfo.errorStack = firstError.stack;

      // Extract location from error if available
      if (firstError.location) {
        failureInfo.location = {
          file: firstError.location.file,
          line: firstError.location.line,
          column: firstError.location.column
        };
      }
    }
    // Priority 2: Extract error from test result (fallback)
    else if (testResult?.error) {
      failureInfo.errorMessage = FailureCapture.cleanErrorMessage(
        testResult.error.message || testResult.error.toString()
      );
      failureInfo.errorStack = testResult.error.stack;
    }

    // Extract error from failed steps
    if (steps && steps.length > 0) {
      const failedStep = steps.find((step) => step.error);
      if (failedStep) {
        failureInfo.failedStep = failedStep.title;
        // Only override error message if we don't have one from errors array
        if (failedStep.error && !testInfo.errors?.length) {
          failureInfo.errorMessage = FailureCapture.cleanErrorMessage(failedStep.error.message);
        }
      }
    }

    // Extract location information (fallback if not from error)
    if (!failureInfo.location && testInfo.location) {
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
        } else if (attachment.name === "video" && attachment.path) {
          failureInfo.video = attachment.path;
        } else if (attachment.name === "trace" && attachment.path) {
          failureInfo.trace = attachment.path;
        }
      }
    }

    return failureInfo;
  }

  /**
   * Cleans and formats error messages for better readability
   * @param message - Raw error message
   * @returns Cleaned and formatted error message
   */
  static cleanErrorMessage(message: string): string {
    if (!message) return "";

    let cleaned = message;

    // Remove ANSI escape codes and control characters
    cleaned = cleanAnsiCodes(cleaned);

    // Parse Playwright error structure and reformat
    cleaned = FailureCapture.formatPlaywrightError(cleaned);

    // Normalize whitespace
    cleaned = cleaned.replace(/\s+/g, " ").trim();

    // Truncate very long messages
    if (cleaned.length > 800) {
      cleaned = cleaned.substring(0, 797) + "...";
    }

    return cleaned;
  }

  /**
   * Formats Playwright error messages into a more readable structure
   * @param message - Cleaned error message
   * @returns Formatted error message
   */
  static formatPlaywrightError(message: string): string {
    // Extract key components from Playwright error
    const locatorMatch = message.match(/Locator: (.+?)(?:\n|Expected|Received|$)/);
    const expectedMatch = message.match(/Expected pattern: (.+?)(?:\n|Received|$)/);
    const receivedMatch = message.match(/Received string: (.+?)(?:\n|Timeout|Call log|$)/);
    const timeoutMatch = message.match(/Timeout: (\d+)ms/);

    // If it's a Playwright assertion error, format it nicely
    if (locatorMatch || expectedMatch || receivedMatch) {
      const parts = [];

      // Add main error type
      if (message.includes("toHaveClass")) {
        parts.push("Element class assertion failed");
      } else if (message.includes("toBeVisible")) {
        parts.push("Element visibility assertion failed");
      } else if (message.includes("toHaveText")) {
        parts.push("Element text assertion failed");
      } else {
        parts.push("Assertion failed");
      }

      // Add locator info
      if (locatorMatch) {
        parts.push(`Locator: ${locatorMatch[1].trim()}`);
      }

      // Add expected vs received
      if (expectedMatch && receivedMatch) {
        parts.push(`Expected: ${expectedMatch[1].trim()}`);
        parts.push(`Received: ${receivedMatch[1].trim()}`);
      }

      // Add timeout info
      if (timeoutMatch) {
        parts.push(`Timeout: ${timeoutMatch[1]}ms`);
      }

      return parts.join(" | ");
    }

    // For other errors, just clean up the format
    return message
      .replace(/\n+/g, " | ")
      .replace(/Call log:.+$/, "")
      .replace(/\s+\|\s+/g, " | ")
      .trim();
  }

  /**
   * Formats failure information into a readable comment for TestRail
   * @param failureInfo - Failure information object
   * @param includeStackTrace - Whether to include stack trace (default: false)
   * @returns Formatted comment string
   */
  static formatFailureComment(failureInfo: FailureInfo, includeStackTrace = false): string {
    const parts: string[] = [];

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
    const attachments: string[] = [];
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
  static truncateStackTrace(stackTrace: string): string {
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
  static extractTimeoutFailure(testInfo: any, testResult?: any): FailureInfo | null {
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
  static extractInterruptionFailure(testInfo: any, testResult?: any): FailureInfo | null {
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
