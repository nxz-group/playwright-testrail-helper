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
export class FailureCapture {
  /**
   * Extracts basic failure information (simplified from complex version)
   */
  static extractFailureInfo(testInfo: any, testResult?: any, steps?: TestStep[]): FailureInfo | null {
    const status = testResult?.status || testInfo?.status;
    if (status !== "failed") {
      return null;
    }

    // Simple error extraction
    const errorMessage =
      testInfo.errors?.[0]?.message || testResult?.error?.message || testInfo.result?.error?.message || "Test failed";

    const failedStep = testInfo.steps?.find((s: any) => s.error)?.title;

    return {
      errorMessage: FailureCapture.cleanErrorMessage(errorMessage),
      errorStack: testInfo.errors?.[0]?.stack,
      failedStep,
      location: undefined, // Simplified - no complex location parsing
      screenshot: undefined, // Simplified - no attachment parsing
      video: undefined,
      trace: undefined
    };
  }

  /**
   * Simple error message cleaning (simplified from complex ANSI handling)
   */
  static cleanErrorMessage(message: string): string {
    if (!message) return "";

    // Basic cleanup only - remove excessive whitespace
    return message.replace(/\s+/g, " ").trim();
  }

  /**
   * Simple failure comment formatting with newlines
   */
  static formatFailureComment(failureInfo: FailureInfo, includeStackTrace = false): string {
    const parts = [];

    parts.push(`Error: ${failureInfo.errorMessage}`);

    if (failureInfo.failedStep) {
      parts.push(`Failed Step: ${failureInfo.failedStep}`);
    }

    // Add duration if available (basic implementation)
    return parts.join("\n");
  }

  /**
   * Simple timeout failure extraction
   */
  static extractTimeoutFailure(testInfo: any, testResult?: any): FailureInfo | null {
    if (!testResult || testResult.status !== "timedOut") {
      return null;
    }

    const timeout = testInfo.timeout || 30000;
    const duration = testResult.duration || 0;

    return {
      errorMessage: `Test timed out after ${timeout}ms (actual: ${duration}ms)`,
      failedStep: "Test execution timeout"
    };
  }

  /**
   * Simple interruption failure extraction
   */
  static extractInterruptionFailure(testInfo: any, testResult?: any): FailureInfo | null {
    if (!testResult || testResult.status !== "interrupted") {
      return null;
    }

    return {
      errorMessage: "Test was interrupted (browser crash or external interruption)",
      failedStep: "Test execution interrupted"
    };
  }
}
