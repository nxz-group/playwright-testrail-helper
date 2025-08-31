// Note: @playwright/test types are available when this package is used in a Playwright project
// These interfaces match Playwright's TestInfo and TestResult structures
interface PlaywrightTestInfo {
  title: string;
  file: string;
  status?: "passed" | "failed" | "timedOut" | "skipped" | "interrupted";
  duration?: number;
  startTime?: Date;
  endTime?: Date;
  annotations?: Array<{ type: string; description?: string }>;
  project?: { name: string };
  attachments?: Array<{ name: string; [key: string]: any }>;
  [key: string]: any;
}

interface PlaywrightTestResult {
  status: "passed" | "failed" | "timedOut" | "skipped" | "interrupted";
  duration: number;
  steps?: Array<{
    category?: string;
    title: string;
    error?: Error | { message: string };
    [key: string]: any;
  }>;
  [key: string]: any;
}

import type { TestCaseInfo, TestStep } from "../types/index.js";

/**
 * Utility functions for converting Playwright test objects to TestRail format
 */
export class PlaywrightConverter {
  /**
   * Converts Playwright TestInfo to TestCaseInfo format
   * @param testInfo - Playwright TestInfo object
   * @param testResult - Playwright TestResult object (optional)
   * @returns TestCaseInfo object for TestRail integration
   */
  static convertTestInfo(testInfo: PlaywrightTestInfo, testResult?: PlaywrightTestResult): TestCaseInfo {
    // Extract tags from test title or annotations
    const tags = PlaywrightConverter.extractTags(testInfo);

    // Determine test status
    const status = PlaywrightConverter.getTestStatus(testInfo, testResult);

    // Get test duration
    const duration = PlaywrightConverter.getTestDuration(testInfo, testResult);

    // Extract test steps if available
    const steps = PlaywrightConverter.extractTestSteps(testInfo, testResult);

    return {
      title: testInfo.title,
      tags,
      status,
      duration,
      _steps: steps
    };
  }

  /**
   * Extracts tags from test title, annotations, or project name
   * @param testInfo - Playwright TestInfo object
   * @returns Array of tags
   */
  private static extractTags(testInfo: PlaywrightTestInfo): string[] {
    const tags: string[] = [];

    // Extract tags from title (e.g., "@smoke @login User can login")
    const titleTags = testInfo.title.match(/@\w+/g);
    if (titleTags) {
      tags.push(...titleTags);
    }

    // Extract tags from annotations
    if (testInfo.annotations) {
      testInfo.annotations.forEach((annotation) => {
        if (annotation.type === "tag") {
          tags.push(`@${annotation.description}`);
        }
      });
    }

    // Add project name as tag if available
    if (testInfo.project?.name) {
      tags.push(`@${testInfo.project.name.toLowerCase()}`);
    }

    // If no tags found, add default based on file path
    if (tags.length === 0) {
      const fileName = testInfo.file.split("/").pop()?.replace(".spec.ts", "").replace(".test.ts", "");
      if (fileName) {
        tags.push(`@${fileName}`);
      }
    }

    return tags;
  }

  /**
   * Determines test status from TestInfo and TestResult
   * @param testInfo - Playwright TestInfo object
   * @param testResult - Playwright TestResult object
   * @returns Test status string
   */
  private static getTestStatus(
    testInfo: PlaywrightTestInfo,
    testResult?: PlaywrightTestResult
  ): TestCaseInfo["status"] {
    // If testResult is provided, use its status
    if (testResult) {
      switch (testResult.status) {
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

    // Fallback to testInfo status if available
    if (testInfo.status) {
      switch (testInfo.status) {
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

    return "failed"; // Default fallback
  }

  /**
   * Gets test duration from TestInfo or TestResult
   * @param testInfo - Playwright TestInfo object
   * @param testResult - Playwright TestResult object
   * @returns Duration in milliseconds
   */
  private static getTestDuration(testInfo: PlaywrightTestInfo, testResult?: PlaywrightTestResult): number {
    if (testResult?.duration !== undefined) {
      return testResult.duration;
    }

    if (testInfo.duration !== undefined) {
      return testInfo.duration;
    }

    // Calculate from start/end times if available
    if (testInfo.startTime && testInfo.endTime) {
      return testInfo.endTime.getTime() - testInfo.startTime.getTime();
    }

    return 0; // Default fallback
  }

  /**
   * Extracts test steps from TestInfo or TestResult
   * @param testInfo - Playwright TestInfo object
   * @param testResult - Playwright TestResult object
   * @returns Array of test steps
   */
  private static extractTestSteps(
    testInfo: PlaywrightTestInfo,
    testResult?: PlaywrightTestResult
  ): TestStep[] | undefined {
    const steps: TestStep[] = [];

    // Extract from test result steps if available
    if (testResult?.steps) {
      testResult.steps.forEach((step) => {
        steps.push({
          category: step.category || "test.step",
          title: step.title,
          error: step.error ? { message: step.error.message || String(step.error) } : undefined
        });
      });
    }

    // Extract from test info attachments or other sources
    if (testInfo.attachments) {
      testInfo.attachments.forEach((attachment) => {
        if (attachment.name.startsWith("step:")) {
          steps.push({
            category: "test.step",
            title: attachment.name.replace("step:", ""),
            error: undefined
          });
        }
      });
    }

    return steps.length > 0 ? steps : undefined;
  }

  /**
   * Converts multiple Playwright test results to TestCaseInfo array
   * @param testInfos - Array of Playwright TestInfo objects
   * @param testResults - Array of Playwright TestResult objects (optional)
   * @returns Array of TestCaseInfo objects
   */
  static convertMultipleTests(testInfos: PlaywrightTestInfo[], testResults?: PlaywrightTestResult[]): TestCaseInfo[] {
    return testInfos.map((testInfo, index) => {
      const testResult = testResults?.[index];
      return PlaywrightConverter.convertTestInfo(testInfo, testResult);
    });
  }

  /**
   * Converts Playwright test result from afterEach hook
   * @param testInfo - Playwright TestInfo from afterEach
   * @returns TestCaseInfo object
   */
  static convertFromAfterEach(testInfo: PlaywrightTestInfo): TestCaseInfo {
    return PlaywrightConverter.convertTestInfo(testInfo);
  }

  /**
   * Converts Playwright test result from teardown
   * @param testInfo - Playwright TestInfo from teardown
   * @param error - Error object if test failed
   * @returns TestCaseInfo object
   */
  static convertFromTeardown(testInfo: PlaywrightTestInfo, error?: Error): TestCaseInfo {
    const testCaseInfo = PlaywrightConverter.convertTestInfo(testInfo);

    // Override status if error is provided
    if (error) {
      testCaseInfo.status = "failed";
      // Add error as a step
      if (!testCaseInfo._steps) {
        testCaseInfo._steps = [];
      }
      testCaseInfo._steps.push({
        category: "test.step",
        title: "Test execution failed",
        error: { message: error.message }
      });
    }

    return testCaseInfo;
  }
}
