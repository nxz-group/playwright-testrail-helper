"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestCaseManager = void 0;
const constants_1 = require("@utils/constants");
const errors_1 = require("@utils/errors");
/**
 * Manages test case synchronization and creation logic
 */
class TestCaseManager {
    constructor(client, executedByText = "Executed by Playwright") {
        this.client = client;
        this.playwrightExecuted = executedByText;
    }
    /**
     * Processes and normalizes tag list by removing duplicates and @ symbols
     * @param tagList - Array of tag strings
     * @returns Normalized tag array
     */
    normalizeTags(tagList) {
        return [...new Set(tagList)].map((value) => value.toLowerCase().replace("@", ""));
    }
    /**
     * Determines TestRail test type based on tags
     * @param tags - Array of normalized tags
     * @returns TestType enum value
     */
    getTestType(tags) {
        if (tags.length <= 1) {
            return constants_1.TestType.OTHER;
        }
        if (["smoke", "sanity"].includes(tags[0])) {
            return constants_1.TestType.SMOKE_AND_SANITY;
        }
        switch (tags[0]) {
            case "acceptance":
                return constants_1.TestType.ACCEPTANCE;
            case "accessibility":
                return constants_1.TestType.ACCESSIBILITY;
            case "automated":
                return constants_1.TestType.AUTOMATED;
            case "compatibility":
                return constants_1.TestType.COMPATIBILITY;
            case "destructive":
                return constants_1.TestType.DESTRUCTIVE;
            case "functional":
                return constants_1.TestType.FUNCTIONAL;
            case "performance":
                return constants_1.TestType.PERFORMANCE;
            case "regression":
                return constants_1.TestType.REGRESSION;
            case "security":
                return constants_1.TestType.SECURITY;
            case "usability":
                return constants_1.TestType.USABILITY;
            case "exploratory":
                return constants_1.TestType.EXPLORATORY;
            default:
                return constants_1.TestType.OTHER;
        }
    }
    /**
     * Determines TestRail priority based on last tag
     * @param tags - Array of normalized tags
     * @returns Priority enum value
     */
    getPriority(tags) {
        if (tags.length <= 1) {
            return constants_1.Priority.MEDIUM;
        }
        switch (tags[tags.length - 1]) {
            case "low":
                return constants_1.Priority.LOW;
            case "medium":
                return constants_1.Priority.MEDIUM;
            case "high":
                return constants_1.Priority.HIGH;
            case "critical":
                return constants_1.Priority.CRITICAL;
            default:
                return constants_1.Priority.MEDIUM;
        }
    }
    /**
     * Maps test status string to TestRail status ID
     * @param status - Test status string
     * @returns TestRail status enum value
     */
    getStatusId(status) {
        switch (status) {
            case "passed":
                return constants_1.TestStatus.PASSED;
            case "interrupted":
                return constants_1.TestStatus.INTERRUPTED;
            case "skipped":
                return constants_1.TestStatus.SKIPPED;
            case "timeOut":
                return constants_1.TestStatus.TIMEOUT;
            case "failed":
                return constants_1.TestStatus.FAILED;
            default:
                return constants_1.TestStatus.FAILED;
        }
    }
    /**
     * Formats test duration from milliseconds to human readable format
     * @param ms - Duration in milliseconds
     * @returns Formatted duration string
     */
    formatDuration(ms) {
        if (ms < 1000)
            return `${ms}ms`;
        if (ms < 60000)
            return `${(ms / 1000).toFixed(1)}s`;
        return `${(ms / 60000).toFixed(1)}m`;
    }
    /**
     * Validates test case data structure
     * @param testCase - Test case to validate
     * @throws {TestRailError} When validation fails
     */
    validateTestCase(testCase) {
        if (!testCase.title || typeof testCase.title !== "string") {
            throw new errors_1.TestRailError("Test case must have a valid title");
        }
        if (!testCase.status || !["passed", "failed", "skipped", "interrupted", "timeOut"].includes(testCase.status)) {
            throw new errors_1.TestRailError(`Invalid test status: ${testCase.status}. Must be one of: passed, failed, skipped, interrupted, timeOut`);
        }
        if (typeof testCase.duration !== "number" || testCase.duration < 0) {
            throw new errors_1.TestRailError("Test case duration must be a non-negative number");
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
    async syncTestCase(sectionId, platformId, testCaseInfo, existingCases, userId) {
        const tags = this.normalizeTags(testCaseInfo.tags || []);
        const testCase = {
            title: testCaseInfo.title.replace(/@(.*)/, "").replace(/\s\s+/g, " ").trim(),
            section_id: sectionId,
            custom_case_custom_automation_type: constants_1.AutomationType.AUTOMATED,
            template_id: constants_1.TestTemplate.TEST_CASE_STEP,
            type_id: this.getTestType(tags),
            custom_case_custom_platform: platformId,
            priority_id: this.getPriority(tags),
            custom_steps_separated: testCaseInfo._steps
                ? testCaseInfo._steps
                    .filter((step) => step.category === "test.step" && step.title !== 'Expect "toPass"')
                    .map((step) => ({
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
        }
        else {
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
    createTestResult(testCase, testCaseId, userId) {
        let errorComment = "";
        if (testCase.status === "failed" && testCase._steps) {
            const errorStep = testCase._steps.filter((step) => step.category === "test.step" && step.error !== undefined);
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
            comment: testCase.status === "failed"
                ? errorComment
                : `${this.playwrightExecuted}\nDuration: ${this.formatDuration(testCase.duration)}`,
            elapsed: testCase.duration
        };
    }
}
exports.TestCaseManager = TestCaseManager;
