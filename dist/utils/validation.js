"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationUtils = void 0;
exports.validateEmail = validateEmail;
exports.validateRunName = validateRunName;
exports.validateSectionId = validateSectionId;
exports.validateProjectId = validateProjectId;
exports.validatePlatformId = validatePlatformId;
exports.validateCaseId = validateCaseId;
exports.validateTestList = validateTestList;
exports.validateTestCase = validateTestCase;
exports.validateTestCaseData = validateTestCaseData;
const constants_1 = require("./constants");
const errors_1 = require("./errors");
/**
 * Validates email address format
 * @param email - Email address to validate
 * @throws {TestRailError} When email is invalid
 */
function validateEmail(email) {
    if (!email || !email.includes("@")) {
        throw new errors_1.TestRailError("Valid email address is required");
    }
}
/**
 * Validates run name
 * @param runName - Run name to validate
 * @throws {TestRailError} When run name is invalid
 */
function validateRunName(runName) {
    if (!runName || runName.trim().length === 0) {
        throw new errors_1.TestRailError("Run name cannot be empty");
    }
}
/**
 * Validates section ID
 * @param sectionId - Section ID to validate
 * @throws {TestRailError} When section ID is invalid
 */
function validateSectionId(sectionId) {
    if (sectionId <= 0) {
        throw new errors_1.TestRailError("Section ID must be greater than 0");
    }
}
/**
 * Validates project ID
 * @param projectId - Project ID to validate
 * @throws {TestRailError} When project ID is invalid
 */
function validateProjectId(projectId) {
    if (projectId <= 0) {
        throw new errors_1.TestRailError("Project ID must be greater than 0");
    }
}
/**
 * Validates platform ID
 * @param platformId - Platform ID to validate
 * @throws {TestRailError} When platform ID is invalid
 */
function validatePlatformId(platformId) {
    if (!Object.values(constants_1.Platform).includes(platformId)) {
        throw new errors_1.TestRailError(`Invalid platform ID: ${platformId}. Must be one of: ${Object.values(constants_1.Platform).join(", ")}`);
    }
}
/**
 * Validates case ID
 * @param caseId - Case ID to validate
 * @throws {TestRailError} When case ID is invalid
 */
function validateCaseId(caseId) {
    if (caseId <= 0) {
        throw new errors_1.TestRailError("Case ID must be greater than 0");
    }
}
/**
 * Validates test list
 * @param testList - Test list to validate
 * @throws {TestRailError} When test list is invalid
 */
function validateTestList(testList) {
    if (!Array.isArray(testList)) {
        throw new errors_1.TestRailError("Test list must be an array");
    }
}
/**
 * Validates test case structure
 * @param testCase - Test case to validate
 * @throws {TestRailError} When test case is invalid
 */
function validateTestCase(testCase) {
    const tc = testCase;
    if (!tc.title || typeof tc.title !== "string") {
        throw new errors_1.TestRailError("Test case must have a valid title");
    }
    if (!tc.status || !["passed", "failed", "skipped", "interrupted", "timeOut"].includes(tc.status)) {
        throw new errors_1.TestRailError(`Invalid test status: ${tc.status}. Must be one of: passed, failed, skipped, interrupted, timeOut`);
    }
    if (typeof tc.duration !== "number" || tc.duration < 0) {
        throw new errors_1.TestRailError("Test case duration must be a non-negative number");
    }
}
/**
 * Validates test case data for API operations
 * @param testCase - Test case data to validate
 * @throws {TestRailError} When test case data is invalid
 */
function validateTestCaseData(testCase) {
    if (!testCase || !testCase.title) {
        throw new errors_1.TestRailError("Test case must have a title");
    }
}
// Legacy class export for backward compatibility
class ValidationUtils {
}
exports.ValidationUtils = ValidationUtils;
ValidationUtils.validateEmail = validateEmail;
ValidationUtils.validateRunName = validateRunName;
ValidationUtils.validateSectionId = validateSectionId;
ValidationUtils.validateProjectId = validateProjectId;
ValidationUtils.validatePlatformId = validatePlatformId;
ValidationUtils.validateCaseId = validateCaseId;
ValidationUtils.validateTestList = validateTestList;
ValidationUtils.validateTestCase = validateTestCase;
ValidationUtils.validateTestCaseData = validateTestCaseData;
