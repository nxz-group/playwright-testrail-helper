import type { TestRailClient } from "@api/testrail-client";
import { AutomationType, Priority, TestStatus, TestTemplate, TestType } from "@utils/constants";
import { TestRailError } from "@utils/errors";
import type { TestCaseInfo, TestResult, TestStep } from "../types/index.js";

/**
 * Manages test case synchronization and creation logic
 */
export class TestCaseManager {
  private readonly playwrightExecuted: string;

  constructor(
    private client: TestRailClient,
    executedByText: string = "Executed by Playwright"
  ) {
    this.playwrightExecuted = executedByText;
  }

  /**
   * Processes and normalizes tag list by removing duplicates and @ symbols
   * @param tagList - Array of tag strings
   * @returns Normalized tag array
   */
  private normalizeTags(tagList: string[]): string[] {
    return [...new Set(tagList)].map((value: string) => value.toLowerCase().replace("@", ""));
  }

  /**
   * Determines TestRail test type based on tags
   * @param tags - Array of normalized tags
   * @returns TestType enum value
   */
  private getTestType(tags: string[]): TestType {
    if (tags.length <= 1) {
      return TestType.OTHER;
    }
    if (["smoke", "sanity"].includes(tags[0])) {
      return TestType.SMOKE_AND_SANITY;
    }
    switch (tags[0]) {
      case "acceptance":
        return TestType.ACCEPTANCE;
      case "accessibility":
        return TestType.ACCESSIBILITY;
      case "automated":
        return TestType.AUTOMATED;
      case "compatibility":
        return TestType.COMPATIBILITY;
      case "destructive":
        return TestType.DESTRUCTIVE;
      case "functional":
        return TestType.FUNCTIONAL;
      case "performance":
        return TestType.PERFORMANCE;
      case "regression":
        return TestType.REGRESSION;
      case "security":
        return TestType.SECURITY;
      case "usability":
        return TestType.USABILITY;
      case "exploratory":
        return TestType.EXPLORATORY;
      default:
        return TestType.OTHER;
    }
  }

  /**
   * Determines TestRail priority based on last tag
   * @param tags - Array of normalized tags
   * @returns Priority enum value
   */
  private getPriority(tags: string[]): Priority {
    if (tags.length <= 1) {
      return Priority.MEDIUM;
    }
    switch (tags[tags.length - 1]) {
      case "low":
        return Priority.LOW;
      case "medium":
        return Priority.MEDIUM;
      case "high":
        return Priority.HIGH;
      case "critical":
        return Priority.CRITICAL;
      default:
        return Priority.MEDIUM;
    }
  }

  /**
   * Maps test status string to TestRail status ID
   * @param status - Test status string
   * @returns TestRail status enum value
   */
  getStatusId(status: string): TestStatus {
    switch (status) {
      case "passed":
        return TestStatus.PASSED;
      case "interrupted":
        return TestStatus.INTERRUPTED;
      case "skipped":
        return TestStatus.SKIPPED;
      case "timeOut":
        return TestStatus.TIMEOUT;
      case "failed":
        return TestStatus.FAILED;
      default:
        return TestStatus.FAILED;
    }
  }

  /**
   * Formats test duration from milliseconds to human readable format
   * @param ms - Duration in milliseconds
   * @returns Formatted duration string
   */
  formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  }

  /**
   * Validates test case data structure
   * @param testCase - Test case to validate
   * @throws {TestRailError} When validation fails
   */
  validateTestCase(testCase: TestCaseInfo): void {
    if (!testCase.title || typeof testCase.title !== "string") {
      throw new TestRailError("Test case must have a valid title");
    }

    if (!testCase.status || !["passed", "failed", "skipped", "interrupted", "timeOut"].includes(testCase.status)) {
      throw new TestRailError(
        `Invalid test status: ${testCase.status}. Must be one of: passed, failed, skipped, interrupted, timeOut`
      );
    }

    if (typeof testCase.duration !== "number" || testCase.duration < 0) {
      throw new TestRailError("Test case duration must be a non-negative number");
    }
  }

  /**
   * Synchronizes test case with TestRail (creates or updates)
   * @param sectionId - TestRail section ID
   * @param platformId - Platform identifier
   * @param testCaseInfo - Test case information
   * @param existingCases - Existing test cases in section
   * @param userId - User ID for assignment
   * @returns Test case ID
   */
  async syncTestCase(
    sectionId: number,
    platformId: number,
    testCaseInfo: TestCaseInfo,
    existingCases: Array<{ id: number; title: string }>,
    userId: number
  ): Promise<number> {
    const tags = this.normalizeTags(testCaseInfo.tags || []);
    const testCase = {
      title: testCaseInfo.title.replace(/@(.*)/, "").replace(/\s\s+/g, " ").trim(),
      section_id: sectionId,
      custom_case_custom_automation_type: AutomationType.AUTOMATED,
      template_id: TestTemplate.TEST_CASE_STEP,
      type_id: this.getTestType(tags),
      custom_case_custom_platform: platformId,
      priority_id: this.getPriority(tags),
      custom_steps_separated: testCaseInfo._steps
        ? testCaseInfo._steps
            .filter((step: TestStep) => step.category === "test.step" && step.title !== 'Expect "toPass"')
            .map((step: TestStep) => ({
              content: step.title.split(">")[0].trim(),
              expected: step.title.split(">")[1] ? step.title.split(">")[1].trim() : this.playwrightExecuted
            }))
        : [],
      assignedto_id: userId
    };

    const foundExistingCase = existingCases.find((cases) => cases.title.toLowerCase() === testCase.title.toLowerCase());

    if (foundExistingCase) {
      if (tags.includes("updated") || tags.includes("update")) {
        await this.client.updateCase(foundExistingCase.id, sectionId, testCase);
      }
      return foundExistingCase.id;
    } else {
      return await this.client.addCase(sectionId, testCase);
    }
  }

  /**
   * Creates test result object for TestRail
   * @param testCase - Test case information
   * @param testCaseId - TestRail test case ID
   * @param userId - User ID for assignment
   * @returns Test result object
   */
  createTestResult(testCase: TestCaseInfo, testCaseId: number, userId: number): TestResult {
    let errorComment = "";

    if (testCase.status === "failed" && testCase._steps) {
      const errorStep = testCase._steps.filter(
        (step: TestStep) => step.category === "test.step" && step.error !== undefined
      );
      if (errorStep.length > 0) {
        // Remove ANSI escape codes from error message
        const ansiPattern = `${String.fromCharCode(27)}\\[[0-9;]*[mG]`;
        const cleanMessage = errorStep[0].error?.message?.replace(new RegExp(ansiPattern, "g"), "") || "";
        errorComment = `Error step: ${errorStep[0].title}\n\n${cleanMessage}`;
      }
    }

    return {
      case_id: testCaseId,
      status_id: this.getStatusId(testCase.status),
      assignedto_id: userId,
      comment:
        testCase.status === "failed"
          ? errorComment
          : `${this.playwrightExecuted}\nDuration: ${this.formatDuration(testCase.duration)}`,
      elapsed: testCase.duration
    };
  }
}
