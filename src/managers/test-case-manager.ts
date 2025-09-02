import type { TestRailClient } from "../api/testrail-client";
import type { TestCaseInfo, TestResult, TestStep } from "../types/index";
import { type CommentEnhancementConfig, CommentEnhancer } from "../utils/comment-enhancer";
import { AutomationType, Priority, TestStatus, TestTemplate, TestType } from "../utils/constants";
import { TestRailError } from "../utils/errors";

/**
 * Manages test case synchronization and creation logic
 */
export class TestCaseManager {
  private readonly playwrightExecuted: string;
  private readonly commentEnhancer: CommentEnhancer;

  constructor(
    private client: TestRailClient,
    executedByText = "Executed by Playwright",
    commentConfig?: Partial<CommentEnhancementConfig>
  ) {
    this.playwrightExecuted = executedByText;
    this.commentEnhancer = new CommentEnhancer({
      customPrefix: executedByText,
      ...commentConfig
    });
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
   * @returns TestRail status enum value or null for skipped tests
   */
  getStatusId(status: string): TestStatus | null {
    switch (status) {
      case "passed":
        return TestStatus.PASSED; // 1
      case "interrupted":
        return TestStatus.BLOCKED; // 2 - Map interrupted to blocked
      case "skipped":
        return null; // Skip untested/skipped tests - don't send to TestRail
      case "timeOut":
        return TestStatus.FAILED; // 5 - Map timeout to failed
      case "failed":
        return TestStatus.FAILED; // 5
      default:
        return TestStatus.FAILED; // 5 - Default to failed for unknown statuses
    }
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
   * @returns Test result object or null for skipped tests
   */
  createTestResult(testCase: TestCaseInfo, testCaseId: number, userId: number): TestResult | null {
    const statusId = this.getStatusId(testCase.status);

    // Skip untested/skipped tests - don't send to TestRail
    if (statusId === null) {
      return null;
    }

    // Generate comment using enhanced CommentEnhancer
    let comment: string;

    if (testCase.status === "passed") {
      comment = this.commentEnhancer.formatPassedComment(testCase.duration);
    } else if (testCase.status === "failed") {
      comment = this.commentEnhancer.formatFailedComment(testCase);
    } else {
      // For other statuses (timeOut, interrupted), use enhanced comment
      comment = this.commentEnhancer.enhanceComment(testCase);
    }

    return {
      case_id: testCaseId,
      status_id: statusId,
      assignedto_id: userId,
      comment,
      elapsed: testCase.duration
    };
  }

  /**
   * Updates comment enhancement configuration
   * @param config - New configuration options
   */
  updateCommentConfig(config: Partial<CommentEnhancementConfig>): void {
    this.commentEnhancer.updateConfig(config);
  }

  /**
   * Gets current comment enhancement configuration
   * @returns Current configuration
   */
  getCommentConfig(): CommentEnhancementConfig {
    return this.commentEnhancer.getConfig();
  }
}
