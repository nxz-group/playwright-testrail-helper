/**
 * TestInfo Analyzer - วิเคราะห์และดึงข้อมูล error จาก Playwright TestInfo
 */

import type { TestCaseInfo } from "../types/index.js";
import type { FailureInfo } from "./failure-capture.js";

/**
 * Interface สำหรับ Playwright TestInfo (simplified)
 */
export interface PlaywrightTestInfo {
  title: string;
  status?: "passed" | "failed" | "timedOut" | "skipped" | "interrupted";
  duration?: number;
  timeout?: number;

  // Error sources
  errors?: Array<{
    message: string;
    stack?: string;
    location?: { file: string; line: number; column: number };
  }>;

  result?: {
    status: "passed" | "failed" | "timedOut" | "skipped" | "interrupted";
    duration: number;
    error?: { message: string; stack?: string };
  };

  steps?: Array<{
    title: string;
    category?: string;
    error?: { message: string; stack?: string };
    duration?: number;
  }>;

  attachments?: Array<{
    name: string;
    path?: string;
    contentType?: string;
  }>;

  project?: { name: string };
  file?: string;
  line?: number;
  column?: number;
  workerIndex?: number;
  retry?: number;
}

/**
 * Utility class สำหรับวิเคราะห์ Playwright TestInfo
 */
export class TestInfoAnalyzer {
  /**
   * ดึง error message จาก TestInfo ตามลำดับความสำคัญ
   */
  static extractErrorMessage(testInfo: PlaywrightTestInfo): string {
    // 1. จาก result.error (ข้อมูลหลักจาก test result)
    if (testInfo.result?.error?.message) {
      return TestInfoAnalyzer.cleanErrorMessage(testInfo.result.error.message);
    }

    // 2. จาก errors array (ข้อมูลรายละเอียดจาก test execution)
    if (testInfo.errors && testInfo.errors.length > 0) {
      return TestInfoAnalyzer.cleanErrorMessage(testInfo.errors[0].message);
    }

    // 3. จาก failed step (ข้อมูลจาก step ที่ล้มเหลว)
    if (testInfo.steps) {
      const failedStep = testInfo.steps.find((step) => step.error);
      if (failedStep?.error?.message) {
        return TestInfoAnalyzer.cleanErrorMessage(failedStep.error.message);
      }
    }

    // 4. สร้าง error message จาก status และ context
    return TestInfoAnalyzer.generateDefaultErrorMessage(testInfo);
  }

  /**
   * สร้าง default error message จาก status และ context
   */
  static generateDefaultErrorMessage(testInfo: PlaywrightTestInfo): string {
    const duration = testInfo.duration || testInfo.result?.duration || 0;
    const timeout = testInfo.timeout || 30000;

    switch (testInfo.status || testInfo.result?.status) {
      case "failed":
        return `Test failed after ${TestInfoAnalyzer.formatDuration(duration)}`;

      case "timedOut":
        return `Test timed out after ${TestInfoAnalyzer.formatDuration(timeout)} (actual: ${TestInfoAnalyzer.formatDuration(duration)})`;

      case "interrupted":
        return `Test was interrupted after ${TestInfoAnalyzer.formatDuration(duration)} (browser crash or external interruption)`;

      default:
        return `Test failed without specific error message (duration: ${TestInfoAnalyzer.formatDuration(duration)})`;
    }
  }

  /**
   * ทำความสะอาด error message
   */
  static cleanErrorMessage(message: string): string {
    if (!message) return "";

    // Remove ANSI escape codes using String.fromCharCode to avoid control character regex
    const escChar = String.fromCharCode(27); // ESC character
    let cleaned = message;

    // Remove common ANSI sequences
    const ansiPatterns = [
      `${escChar}[0m`,
      `${escChar}[1m`,
      `${escChar}[31m`,
      `${escChar}[32m`,
      `${escChar}[33m`,
      `${escChar}[91m`,
      `${escChar}[92m`,
      `${escChar}[93m`
    ];

    for (const pattern of ansiPatterns) {
      cleaned = cleaned.split(pattern).join("");
    }

    // Remove excessive whitespace
    cleaned = cleaned.replace(/\s+/g, " ").trim();

    // Truncate very long messages
    if (cleaned.length > 500) {
      cleaned = cleaned.substring(0, 497) + "...";
    }

    return cleaned;
  }

  /**
   * Format duration เป็น human readable
   */
  static formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  }

  /**
   * ดึง failed step information
   */
  static extractFailedStep(testInfo: PlaywrightTestInfo): string | undefined {
    if (!testInfo.steps) return undefined;

    const failedStep = testInfo.steps.find((step) => step.error);
    return failedStep?.title;
  }

  /**
   * ดึง location information
   */
  static extractLocation(testInfo: PlaywrightTestInfo): { file: string; line: number; column: number } | undefined {
    // จาก errors array
    if (testInfo.errors && testInfo.errors.length > 0 && testInfo.errors[0].location) {
      return testInfo.errors[0].location;
    }

    // จาก testInfo properties
    if (testInfo.file && testInfo.line && testInfo.column) {
      return {
        file: testInfo.file,
        line: testInfo.line,
        column: testInfo.column
      };
    }

    return undefined;
  }

  /**
   * ดึง attachment information
   */
  static extractAttachments(testInfo: PlaywrightTestInfo): {
    screenshot?: string;
    video?: string;
    trace?: string;
  } {
    const attachments = {
      screenshot: undefined as string | undefined,
      video: undefined as string | undefined,
      trace: undefined as string | undefined
    };

    if (!testInfo.attachments) return attachments;

    for (const attachment of testInfo.attachments) {
      if (attachment.name === "screenshot" && attachment.path) {
        attachments.screenshot = attachment.path;
      } else if (attachment.name === "video" && attachment.path) {
        attachments.video = attachment.path;
      } else if (attachment.name === "trace" && attachment.path) {
        attachments.trace = attachment.path;
      }
    }

    return attachments;
  }

  /**
   * สร้าง FailureInfo จาก TestInfo
   */
  static createFailureInfo(testInfo: PlaywrightTestInfo): FailureInfo {
    const errorMessage = TestInfoAnalyzer.extractErrorMessage(testInfo);
    const failedStep = TestInfoAnalyzer.extractFailedStep(testInfo);
    const location = TestInfoAnalyzer.extractLocation(testInfo);
    const attachments = TestInfoAnalyzer.extractAttachments(testInfo);

    // ดึง stack trace จากแหล่งต่างๆ
    let errorStack: string | undefined;
    if (testInfo.result?.error?.stack) {
      errorStack = testInfo.result.error.stack;
    } else if (testInfo.errors && testInfo.errors.length > 0) {
      errorStack = testInfo.errors[0].stack;
    } else if (testInfo.steps) {
      const failedStepWithStack = testInfo.steps.find((step) => step.error?.stack);
      errorStack = failedStepWithStack?.error?.stack;
    }

    return {
      errorMessage,
      errorStack,
      failedStep,
      location,
      screenshot: attachments.screenshot,
      video: attachments.video,
      trace: attachments.trace
    };
  }

  /**
   * แปลง Playwright TestInfo เป็น TestCaseInfo พร้อม error handling ที่ดีขึ้น
   */
  static convertToTestCaseInfo(testInfo: PlaywrightTestInfo): TestCaseInfo {
    // Extract basic info
    const title = testInfo.title;
    const status = TestInfoAnalyzer.normalizeStatus(testInfo.status || testInfo.result?.status || "failed");
    const duration = testInfo.duration || testInfo.result?.duration || 0;

    // Extract tags (simple implementation)
    const tags = TestInfoAnalyzer.extractTags(testInfo);

    // Create base test case info
    const testCaseInfo: TestCaseInfo = {
      title,
      tags,
      status,
      duration
    };

    // Add failure info for failed tests
    if (status === "failed" || status === "timeOut" || status === "interrupted") {
      const failureInfo = TestInfoAnalyzer.createFailureInfo(testInfo);
      (testCaseInfo as any)._failureInfo = failureInfo;
    }

    // Add steps if available
    if (testInfo.steps && testInfo.steps.length > 0) {
      (testCaseInfo as any)._steps = testInfo.steps.map((step) => ({
        category: step.category || "test.step",
        title: step.title,
        error: step.error ? { message: step.error.message } : undefined
      }));
    }

    return testCaseInfo;
  }

  /**
   * Normalize status เป็น format ที่ TestCaseInfo ต้องการ
   */
  static normalizeStatus(status: string): TestCaseInfo["status"] {
    switch (status) {
      case "passed":
        return "passed";
      case "failed":
        return "failed";
      case "timedOut":
        return "timeOut";
      case "skipped":
        return "skipped";
      case "interrupted":
        return "interrupted";
      default:
        return "failed";
    }
  }

  /**
   * Extract tags จาก TestInfo (simple implementation)
   */
  static extractTags(testInfo: PlaywrightTestInfo): string[] {
    const tags: string[] = [];

    // Extract from title
    const titleTags = testInfo.title.match(/@\w+/g);
    if (titleTags) {
      tags.push(...titleTags);
    }

    // Add project name as tag
    if (testInfo.project?.name) {
      tags.push(`@${testInfo.project.name}`);
    }

    // Default tag if none found
    if (tags.length === 0) {
      tags.push("@test");
    }

    return tags;
  }

  /**
   * วิเคราะห์ TestInfo และแสดงข้อมูลสำคัญ (สำหรับ debugging)
   */
  static analyzeTestInfo(testInfo: PlaywrightTestInfo): {
    title: string;
    status: string;
    duration: string;
    errorMessage: string;
    failedStep?: string;
    hasAttachments: boolean;
    workerInfo?: string;
  } {
    return {
      title: testInfo.title,
      status: testInfo.status || testInfo.result?.status || "unknown",
      duration: TestInfoAnalyzer.formatDuration(testInfo.duration || testInfo.result?.duration || 0),
      errorMessage: TestInfoAnalyzer.extractErrorMessage(testInfo),
      failedStep: TestInfoAnalyzer.extractFailedStep(testInfo),
      hasAttachments: Boolean(testInfo.attachments && testInfo.attachments.length > 0),
      workerInfo: testInfo.workerIndex !== undefined ? `Worker ${testInfo.workerIndex}` : undefined
    };
  }
}

/**
 * Helper function สำหรับสร้าง TestCaseInfo จาก error message อย่างง่าย
 */
export function createTestCaseFromError(
  title: string,
  errorMessage: string,
  duration = 0,
  tags: string[] = []
): TestCaseInfo {
  return {
    title,
    status: "failed",
    duration,
    tags,
    _failureInfo: {
      errorMessage,
      errorStack: undefined,
      failedStep: undefined,
      location: undefined,
      screenshot: undefined,
      video: undefined,
      trace: undefined
    }
  };
}

/**
 * Helper function สำหรับสร้าง TestCaseInfo จากข้อมูลพื้นฐาน
 */
export function createSimpleFailedTest(title: string, duration: number, executedAt: Date = new Date()): TestCaseInfo {
  const errorMessage = `Test Failed\nDuration: ${TestInfoAnalyzer.formatDuration(duration)}\nExecuted: ${executedAt.toLocaleString()}`;

  return createTestCaseFromError(title, errorMessage, duration);
}
