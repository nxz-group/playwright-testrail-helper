import { Platform } from "./constants";
import { TestRailError } from "./errors";

// Type definitions for validation
interface TestCase {
  title: string;
  status?: "passed" | "failed" | "skipped" | "interrupted" | "timeOut";
  duration?: number;
  tags?: string[];
  _steps?: Array<{
    category?: string;
    title?: string;
    error?: unknown;
  }>;
}

interface TestCaseData {
  title: string;
  [key: string]: unknown;
}

/**
 * Validates email address format
 * @param email - Email address to validate
 * @throws {TestRailError} When email is invalid
 */
export function validateEmail(email: string): void {
  if (!email || !email.includes("@")) {
    throw new TestRailError("Valid email address is required");
  }
}

/**
 * Validates run name
 * @param runName - Run name to validate
 * @throws {TestRailError} When run name is invalid
 */
export function validateRunName(runName: string): void {
  if (!runName || runName.trim().length === 0) {
    throw new TestRailError("Run name cannot be empty");
  }
}

/**
 * Validates section ID
 * @param sectionId - Section ID to validate
 * @throws {TestRailError} When section ID is invalid
 */
export function validateSectionId(sectionId: number): void {
  if (sectionId <= 0) {
    throw new TestRailError("Section ID must be greater than 0");
  }
}

/**
 * Validates project ID
 * @param projectId - Project ID to validate
 * @throws {TestRailError} When project ID is invalid
 */
export function validateProjectId(projectId: number): void {
  if (projectId <= 0) {
    throw new TestRailError("Project ID must be greater than 0");
  }
}

/**
 * Validates platform ID
 * @param platformId - Platform ID to validate
 * @throws {TestRailError} When platform ID is invalid
 */
export function validatePlatformId(platformId: number): void {
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
export function validateCaseId(caseId: number): void {
  if (caseId <= 0) {
    throw new TestRailError("Case ID must be greater than 0");
  }
}

/**
 * Validates test list
 * @param testList - Test list to validate
 * @throws {TestRailError} When test list is invalid
 */
export function validateTestList(testList: unknown): void {
  if (!Array.isArray(testList)) {
    throw new TestRailError("Test list must be an array");
  }
}

/**
 * Validates test case structure
 * @param testCase - Test case to validate
 * @throws {TestRailError} When test case is invalid
 */
export function validateTestCase(testCase: unknown): void {
  const tc = testCase as TestCase;

  if (!tc.title || typeof tc.title !== "string") {
    throw new TestRailError("Test case must have a valid title");
  }

  if (!tc.status || !["passed", "failed", "skipped", "interrupted", "timeOut"].includes(tc.status)) {
    throw new TestRailError(
      `Invalid test status: ${tc.status}. Must be one of: passed, failed, skipped, interrupted, timeOut`
    );
  }

  if (typeof tc.duration !== "number" || tc.duration < 0) {
    throw new TestRailError("Test case duration must be a non-negative number");
  }
}

/**
 * Validates test case data for API operations
 * @param testCase - Test case data to validate
 * @throws {TestRailError} When test case data is invalid
 */
export function validateTestCaseData(testCase: TestCaseData): void {
  if (!testCase || !testCase.title) {
    throw new TestRailError("Test case must have a title");
  }
}

// Legacy class export for backward compatibility
export class ValidationUtils {
  static validateEmail = validateEmail;
  static validateRunName = validateRunName;
  static validateSectionId = validateSectionId;
  static validateProjectId = validateProjectId;
  static validatePlatformId = validatePlatformId;
  static validateCaseId = validateCaseId;
  static validateTestList = validateTestList;
  static validateTestCase = validateTestCase;
  static validateTestCaseData = validateTestCaseData;
}
