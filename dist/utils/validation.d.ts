/**
 * Validation utilities for TestRail operations
 */
export declare class ValidationUtils {
  /**
   * Validates email address format
   * @param email - Email address to validate
   * @throws {TestRailError} When email is invalid
   */
  static validateEmail(email: string): void;
  /**
   * Validates run name
   * @param runName - Run name to validate
   * @throws {TestRailError} When run name is invalid
   */
  static validateRunName(runName: string): void;
  /**
   * Validates section ID
   * @param sectionId - Section ID to validate
   * @throws {TestRailError} When section ID is invalid
   */
  static validateSectionId(sectionId: number): void;
  /**
   * Validates project ID
   * @param projectId - Project ID to validate
   * @throws {TestRailError} When project ID is invalid
   */
  static validateProjectId(projectId: number): void;
  /**
   * Validates platform ID
   * @param platformId - Platform ID to validate
   * @throws {TestRailError} When platform ID is invalid
   */
  static validatePlatformId(platformId: number): void;
  /**
   * Validates case ID
   * @param caseId - Case ID to validate
   * @throws {TestRailError} When case ID is invalid
   */
  static validateCaseId(caseId: number): void;
  /**
   * Validates test list
   * @param testList - Test list to validate
   * @throws {TestRailError} When test list is invalid
   */
  static validateTestList(testList: any): void;
  /**
   * Validates test case structure
   * @param testCase - Test case to validate
   * @throws {TestRailError} When test case is invalid
   */
  static validateTestCase(testCase: any): void;
  /**
   * Validates test case data for API operations
   * @param testCase - Test case data to validate
   * @throws {TestRailError} When test case data is invalid
   */
  static validateTestCaseData(testCase: Record<string, any>): void;
}
