interface TestCaseData {
    title: string;
    [key: string]: unknown;
}
/**
 * Validates email address format
 * @param email - Email address to validate
 * @throws {TestRailError} When email is invalid
 */
export declare function validateEmail(email: string): void;
/**
 * Validates run name
 * @param runName - Run name to validate
 * @throws {TestRailError} When run name is invalid
 */
export declare function validateRunName(runName: string): void;
/**
 * Validates section ID
 * @param sectionId - Section ID to validate
 * @throws {TestRailError} When section ID is invalid
 */
export declare function validateSectionId(sectionId: number): void;
/**
 * Validates project ID
 * @param projectId - Project ID to validate
 * @throws {TestRailError} When project ID is invalid
 */
export declare function validateProjectId(projectId: number): void;
/**
 * Validates platform ID
 * @param platformId - Platform ID to validate
 * @throws {TestRailError} When platform ID is invalid
 */
export declare function validatePlatformId(platformId: number): void;
/**
 * Validates case ID
 * @param caseId - Case ID to validate
 * @throws {TestRailError} When case ID is invalid
 */
export declare function validateCaseId(caseId: number): void;
/**
 * Validates test list
 * @param testList - Test list to validate
 * @throws {TestRailError} When test list is invalid
 */
export declare function validateTestList(testList: unknown): void;
/**
 * Validates test case structure
 * @param testCase - Test case to validate
 * @throws {TestRailError} When test case is invalid
 */
export declare function validateTestCase(testCase: unknown): void;
/**
 * Validates test case data for API operations
 * @param testCase - Test case data to validate
 * @throws {TestRailError} When test case data is invalid
 */
export declare function validateTestCaseData(testCase: TestCaseData): void;
export declare class ValidationUtils {
    static validateEmail: typeof validateEmail;
    static validateRunName: typeof validateRunName;
    static validateSectionId: typeof validateSectionId;
    static validateProjectId: typeof validateProjectId;
    static validatePlatformId: typeof validatePlatformId;
    static validateCaseId: typeof validateCaseId;
    static validateTestList: typeof validateTestList;
    static validateTestCase: typeof validateTestCase;
    static validateTestCaseData: typeof validateTestCaseData;
}
export {};
