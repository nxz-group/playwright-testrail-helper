"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onTestRailHelper = void 0;
const testrail_client_1 = require("./api/testrail-client");
const constants_1 = require("./utils/constants");
const errors_1 = require("./utils/errors");
/**
 * Core TestRail helper for serial execution (no worker coordination, no file persistence)
 * Optimized for single-worker test runs with minimal bundle size
 */
class CoreTestRailHelper {
    constructor() {
        this.initialized = false;
    }
    /**
     * Initializes the core helper with environment variables
     */
    initialize() {
        if (this.initialized)
            return;
        const testRailHost = process.env.TEST_RAIL_HOST || process.env.TEST_RAIL_ENDPOINT;
        const testRailUsername = process.env.TEST_RAIL_USERNAME;
        const testRailPassword = process.env.TEST_RAIL_PASSWORD;
        const projectId = process.env.TEST_RAIL_PROJECT_ID;
        if (!testRailHost || !testRailUsername || !testRailPassword || !projectId) {
            throw new errors_1.ConfigurationError("Missing required environment variables: TEST_RAIL_HOST, TEST_RAIL_USERNAME, TEST_RAIL_PASSWORD, TEST_RAIL_PROJECT_ID");
        }
        this.projectId = Number.parseInt(projectId, 10);
        this.client = new testrail_client_1.TestRailClient(testRailHost, testRailUsername, testRailPassword);
        this.initialized = true;
    }
    /**
     * Simple TestInfo to TestCaseInfo conversion (no complex parsing)
     */
    convertTestInfo(testInfo) {
        const status = testInfo.status === "passed" ? "passed" : testInfo.status === "skipped" ? "skipped" : "failed";
        const errors = testInfo.errors?.length > 0
            ? [
                {
                    message: testInfo.errors[0].message,
                    stack: testInfo.errors[0].stack
                }
            ]
            : undefined;
        return {
            title: testInfo.title,
            status,
            duration: testInfo.duration || 0,
            tags: [],
            errors
        };
    }
    /**
     * Simple error comment formatting
     */
    createComment(testInfo) {
        const parts = [];
        const error = testInfo.errors?.[0]?.message || "Test failed";
        parts.push(`Error: ${error}`);
        const failedStep = testInfo.steps?.find((s) => s.error)?.title;
        if (failedStep) {
            parts.push(`Failed Step: ${failedStep}`);
        }
        if (testInfo.duration) {
            parts.push(`Duration: ${Math.round(testInfo.duration / 1000)}s`);
        }
        return parts.join("\n");
    }
    /**
     * Get or create test case ID from title
     */
    async getOrCreateCaseId(sectionId, platformId, testCase, userId) {
        const cases = await this.client.getCases(this.projectId, sectionId);
        const existing = cases.find((c) => c.title === testCase.title);
        if (existing) {
            return existing.id;
        }
        // Create new test case with required fields
        const testCaseData = {
            title: testCase.title,
            section_id: sectionId,
            custom_case_custom_automation_type: constants_1.AutomationType.AUTOMATED,
            template_id: constants_1.TestTemplate.TEST_CASE_TEXT,
            type_id: constants_1.TestType.AUTOMATED,
            custom_case_custom_platform: platformId,
            priority_id: constants_1.Priority.MEDIUM,
            custom_steps_separated: [],
            assignedto_id: userId
        };
        const newCaseId = await this.client.addCase(sectionId, testCaseData);
        return newCaseId;
    }
    /**
     * Core updateTestResult method for serial execution
     * No worker coordination, no file persistence, minimal parsing
     */
    async updateTestResult(runName, sectionId, platformId, testInfos) {
        this.initialize();
        if (testInfos.length === 0)
            return;
        // Convert TestInfos to TestCaseInfos (simple conversion)
        const testCases = testInfos.map((info) => this.convertTestInfo(info));
        // Get user ID
        const userId = await this.client.getUserIdByEmail(process.env.TEST_RAIL_USERNAME);
        // Create test run
        const run = (await this.client.addRun(this.projectId, {
            name: `${runName} - ${new Date().toLocaleString()}`,
            assignedto_id: userId,
            include_all: false
        }));
        // Process test cases and create results
        const results = [];
        const caseIds = [];
        for (const testCase of testCases) {
            const caseId = await this.getOrCreateCaseId(sectionId, platformId, testCase, userId);
            caseIds.push(caseId);
            // Skip skipped tests
            if (testCase.status === "skipped")
                continue;
            const statusId = testCase.status === "passed" ? constants_1.TestStatus.PASSED : constants_1.TestStatus.FAILED;
            const comment = testCase.status === "failed"
                ? this.createComment(testInfos.find((info) => info.title === testCase.title))
                : "";
            results.push({
                case_id: caseId,
                status_id: statusId,
                assignedto_id: userId,
                comment,
                elapsed: Math.round((testCase.duration || 0) / 1000)
            });
        }
        // Update run with case IDs
        await this.client.updateRun(run.id, caseIds);
        // Add results
        if (results.length > 0) {
            await this.client.addResultsForCases(run.id, results);
        }
    }
    /**
     * Single test result update
     */
    async updateTestResultSingle(runName, sectionId, platformId, testInfo) {
        return this.updateTestResult(runName, sectionId, platformId, [testInfo]);
    }
}
exports.onTestRailHelper = new CoreTestRailHelper();
