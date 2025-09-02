import type { TestCaseInfo } from "../types/index.js";
import type { FailureInfo } from "./failure-capture.js";
import { FailureCapture } from "./failure-capture.js";

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
export const DEFAULT_COMMENT_CONFIG: CommentEnhancementConfig = {
  includeStackTrace: false,
  includeDuration: true,
  includeTimestamp: true,
  includeEnvironmentInfo: false,
  maxCommentLength: 4000, // TestRail comment limit
  customPrefix: undefined
};

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
export class CommentEnhancer {
  private config: CommentEnhancementConfig;

  constructor(config: Partial<CommentEnhancementConfig> = {}) {
    this.config = { ...DEFAULT_COMMENT_CONFIG, ...config };
  }

  /**
   * Enhances a test result comment with detailed information
   * @param testCase - Test case information
   * @param failureInfo - Failure information (if test failed)
   * @param environmentInfo - Environment information
   * @returns Enhanced comment string
   */
  enhanceComment(testCase: TestCaseInfo, failureInfo?: FailureInfo | null, environmentInfo?: EnvironmentInfo): string {
    const parts: string[] = [];

    // Add custom prefix if provided
    if (this.config.customPrefix) {
      parts.push(this.config.customPrefix);
    }

    // Add test status section
    parts.push(this.formatTestStatus(testCase));

    // Add failure information for failed tests
    if (testCase.status === "failed" && failureInfo) {
      parts.push("");
      parts.push(FailureCapture.formatFailureComment(failureInfo, this.config.includeStackTrace));

      // เพิ่มข้อมูล failed step จาก failureInfo
      if (failureInfo.failedStep) {
        parts.push("");
        parts.push(`🎯 **Failed at Step:** ${failureInfo.failedStep}`);
      }
    }

    // Add timeout information for timed out tests
    if (testCase.status === "timeOut") {
      parts.push("");
      parts.push("⏱️ **Test Timed Out**");
      parts.push("The test exceeded the maximum allowed execution time.");
    }

    // Add interruption information
    if (testCase.status === "interrupted") {
      parts.push("");
      parts.push("🚫 **Test Interrupted**");
      parts.push("The test was interrupted during execution (browser crash or external interruption).");
    }

    // Add duration information
    if (this.config.includeDuration) {
      parts.push("");
      parts.push(`⏱️ **Duration:** ${this.formatDuration(testCase.duration)}`);
    }

    // Add timestamp
    if (this.config.includeTimestamp) {
      parts.push(`🕐 **Executed:** ${new Date().toLocaleString()}`);
    }

    // Add environment information
    if (this.config.includeEnvironmentInfo && environmentInfo) {
      parts.push("");
      parts.push(this.formatEnvironmentInfo(environmentInfo));
    }

    // Add test steps summary if available
    if (testCase._steps && testCase._steps.length > 0) {
      parts.push("");
      parts.push(this.formatTestSteps(testCase._steps));
    }

    let comment = parts.join("\n");

    // Truncate if too long
    if (comment.length > this.config.maxCommentLength) {
      comment = comment.substring(0, this.config.maxCommentLength - 20) + "\n\n... (truncated)";
    }

    return comment;
  }

  /**
   * Formats test status with appropriate emoji and styling
   * @param testCase - Test case information
   * @returns Formatted status string
   */
  private formatTestStatus(testCase: TestCaseInfo): string {
    const statusEmojis = {
      passed: "✅",
      failed: "❌",
      skipped: "⏭️",
      interrupted: "🚫",
      timeOut: "⏱️"
    };

    const emoji = statusEmojis[testCase.status] || "❓";
    const statusText = testCase.status.charAt(0).toUpperCase() + testCase.status.slice(1);

    return `${emoji} **Test ${statusText}**`;
  }

  /**
   * Formats duration from milliseconds to human readable format
   * @param ms - Duration in milliseconds
   * @returns Formatted duration string
   */
  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
    return `${(ms / 3600000).toFixed(1)}h`;
  }

  /**
   * Formats environment information
   * @param envInfo - Environment information
   * @returns Formatted environment string
   */
  private formatEnvironmentInfo(envInfo: EnvironmentInfo): string {
    const parts: string[] = ["🖥️ **Environment:**"];

    if (envInfo.browser) {
      parts.push(`• Browser: ${envInfo.browser}${envInfo.browserVersion ? ` ${envInfo.browserVersion}` : ""}`);
    }
    if (envInfo.os) {
      parts.push(`• OS: ${envInfo.os}`);
    }
    if (envInfo.nodeVersion) {
      parts.push(`• Node.js: ${envInfo.nodeVersion}`);
    }
    if (envInfo.playwrightVersion) {
      parts.push(`• Playwright: ${envInfo.playwrightVersion}`);
    }
    if (envInfo.testWorker) {
      parts.push(`• Worker: ${envInfo.testWorker}`);
    }

    return parts.join("\n");
  }

  /**
   * Formats test steps summary with detailed failure information
   * @param steps - Array of test steps
   * @returns Formatted steps string
   */
  private formatTestSteps(steps: any[]): string {
    const parts: string[] = ["📋 **Test Steps:**"];

    const relevantSteps = steps.filter(
      (step) =>
        step.category === "test.step" &&
        step.title !== 'Expect "toPass"' &&
        !step.title.includes("Before Hooks") &&
        !step.title.includes("After Hooks")
    );

    if (relevantSteps.length === 0) {
      return "";
    }

    let hasFailedStep = false;
    relevantSteps.forEach((step, index) => {
      const stepNumber = index + 1;
      const status = step.error ? "❌" : "✅";
      parts.push(`${stepNumber}. ${status} ${step.title}`);

      // แสดง error message สำหรับ step ที่ failed
      if (step.error) {
        hasFailedStep = true;
        parts.push(`   **❌ Failed:** ${step.error.message}`);

        // แสดง duration ถ้ามี
        if (step.duration) {
          parts.push(`   **⏱️ Duration:** ${this.formatDuration(step.duration)}`);
        }

        // แสดง stack trace ถ้าเปิดใช้งาน
        if (step.error.stack && this.config.includeStackTrace) {
          parts.push(`   **Stack:** ${step.error.stack.split("\n")[0]}`);
        }
      }
    });

    // เพิ่มสรุป failed step
    if (hasFailedStep) {
      const failedSteps = relevantSteps.filter((step) => step.error);
      parts.push("");
      parts.push(`🚨 **Failed Steps Summary:** ${failedSteps.length} out of ${relevantSteps.length} steps failed`);

      failedSteps.forEach((step, index) => {
        parts.push(`• Step ${relevantSteps.indexOf(step) + 1}: ${step.title} - ${step.error.message}`);
      });
    }

    return parts.join("\n");
  }

  /**
   * Creates a simple comment for passed tests
   * @param testCase - Test case information
   * @param executedByText - Custom executed by text
   * @returns Simple comment string
   */
  createSimplePassedComment(testCase: TestCaseInfo, executedByText = "Executed by Playwright"): string {
    const parts: string[] = [];

    if (this.config.customPrefix) {
      parts.push(this.config.customPrefix);
    }

    parts.push(`✅ ${executedByText}`);

    if (this.config.includeDuration) {
      parts.push(`Duration: ${this.formatDuration(testCase.duration)}`);
    }

    if (this.config.includeTimestamp) {
      parts.push(`Executed: ${new Date().toLocaleString()}`);
    }

    return parts.join("\n");
  }

  /**
   * Extracts environment information from test context
   * @param testInfo - Playwright TestInfo object
   * @returns Environment information
   */
  static extractEnvironmentInfo(testInfo: any): EnvironmentInfo {
    const envInfo: EnvironmentInfo = {};

    // Extract browser information
    if (testInfo.project) {
      envInfo.browser = testInfo.project.name;
      if (testInfo.project.use?.browserName) {
        envInfo.browser = testInfo.project.use.browserName;
      }
    }

    // Extract OS information
    if (process.platform) {
      const osMap: Record<string, string> = {
        win32: "Windows",
        darwin: "macOS",
        linux: "Linux"
      };
      envInfo.os = osMap[process.platform] || process.platform;
    }

    // Extract Node.js version
    if (process.version) {
      envInfo.nodeVersion = process.version;
    }

    // Extract test worker information
    if (process.env.TEST_WORKER_INDEX) {
      envInfo.testWorker = `Worker ${process.env.TEST_WORKER_INDEX}`;
    }

    // Try to extract Playwright version (this might not always be available)
    try {
      const playwrightPackage = require("@playwright/test/package.json");
      envInfo.playwrightVersion = playwrightPackage.version;
    } catch {
      // Playwright version not available
    }

    return envInfo;
  }

  /**
   * Updates the configuration
   * @param newConfig - New configuration options
   */
  updateConfig(newConfig: Partial<CommentEnhancementConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Gets the current configuration
   * @returns Current configuration
   */
  getConfig(): CommentEnhancementConfig {
    return { ...this.config };
  }
}
