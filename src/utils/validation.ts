import { Platform } from "@utils/constants";
import { TestRailError } from "@utils/errors";

/**
 * Validation utilities for TestRail operations
 */
export class ValidationUtils {
  /**
   * Validates email address format
   * @param email - Email address to validate
   * @throws {TestRailError} When email is invalid
   */
  static validateEmail(email: string): void {
    if (!email || !email.includes("@")) {
      throw new TestRailError("Valid email address is required");
    }
  }

  /**
   * Validates run name
   * @param runName - Run name to validate
   * @throws {TestRailError} When run name is invalid
   */
  static validateRunName(runName: string): void {
    if (!runName || runName.trim().length === 0) {
      throw new TestRailError("Run name cannot be empty");
    }
  }

  /**
   * Validates section ID
   * @param sectionId - Section ID to validate
   * @throws {TestRailError} When section ID is invalid
   */
  static validateSectionId(sectionId: number): void {
    if (sectionId <= 0) {
      throw new TestRailError("Section ID must be greater than 0");
    }
  }

  /**
   * Validates project ID
   * @param projectId - Project ID to validate
   * @throws {TestRailError} When project ID is invalid
   */
  static validateProjectId(projectId: number): void {
    if (projectId <= 0) {
      throw new TestRailError("Project ID must be greater than 0");
    }
  }

  /**
   * Validates platform ID
   * @param platformId - Platform ID to validate
   * @throws {TestRailError} When platform ID is invalid
   */
  static validatePlatformId(platformId: number): void {
    if (!Object.values(Platform).includes(platformId)) {
      throw new TestRailError(
        `Invalid platform ID: ${platformId}. Must be one of: ${Object.values(Platform).join(", ")}`
      );
    }
  }

  /**
   * Validates case ID
   * @param caseId - Case ID to validate
   * @throws {TestRailError} When case ID is invalid
   */
  static validateCaseId(caseId: number): void {
    if (caseId <= 0) {
      throw new TestRailError("Case ID must be greater than 0");
    }
  }

  /**
   * Validates test list
   * @param testList - Test list to validate
   * @throws {TestRailError} When test list is invalid
   */
  static validateTestList(testList: any): void {
    if (!Array.isArray(testList)) {
      throw new TestRailError("Test list must be an array");
    }
  }

  /**
   * Validates test case structure
   * @param testCase - Test case to validate
   * @throws {TestRailError} When test case is invalid
   */
  static validateTestCase(testCase: any): void {
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
   * Validates test case data for API operations
   * @param testCase - Test case data to validate
   * @throws {TestRailError} When test case data is invalid
   */
  static validateTestCaseData(testCase: Record<string, any>): void {
    if (!testCase || !testCase.title) {
      throw new TestRailError("Test case must have a title");
    }
  }
}
