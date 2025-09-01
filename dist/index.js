"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.onTestRailHelper = void 0;
const testrail_client_1 = require("./api/testrail-client");
const test_case_manager_1 = require("./managers/test-case-manager");
const test_run_manager_1 = require("./managers/test-run-manager");
const worker_manager_1 = require("./managers/worker-manager");
const constants_1 = require("./utils/constants");
const errors_1 = require("./utils/errors");
const playwright_converter_1 = require("./utils/playwright-converter");
const validation_1 = require("./utils/validation");
/**
 * Main TestRail integration helper class
 * Orchestrates test case synchronization and result reporting
 */
class TestRailHelper {
    /**
     * Creates a new TestRailHelper instance
     * Initialization is deferred until first method call to avoid environment variable errors at import time
     */
    constructor() {
        this.initialized = false;
        this.platform = constants_1.Platform;
        this.testStatus = constants_1.TestStatus;
        this.testTemplate = constants_1.TestTemplate;
        this.testType = constants_1.TestType;
        this.automationType = constants_1.AutomationType;
        this.priority = constants_1.Priority;
        // Initialization is now lazy - happens on first method call
    }
    /**
     * Initializes the TestRail helper with environment variables
     * @throws {ConfigurationError} When required environment variables are missing
     */
    initialize() {
        if (this.initialized) {
            return;
        }
        const testRailHost = process.env.TEST_RAIL_HOST;
        const testRailUsername = process.env.TEST_RAIL_USERNAME;
        const testRailPassword = process.env.TEST_RAIL_PASSWORD;
        const projectId = process.env.TEST_RAIL_PROJECT_ID;
        if (!testRailHost || !testRailUsername || !testRailPassword || !projectId) {
            throw new errors_1.ConfigurationError("Missing required environment variables: TEST_RAIL_HOST, TEST_RAIL_USERNAME, TEST_RAIL_PASSWORD, TEST_RAIL_PROJECT_ID");
        }
        this.projectId = Number.parseInt(projectId, 10);
        if (Number.isNaN(this.projectId) || this.projectId <= 0) {
            throw new errors_1.ConfigurationError("TEST_RAIL_PROJECT_ID must be a valid positive number");
        }
        // Optional configuration with defaults
        this.testRailDir = process.env.TEST_RAIL_DIR || "testRail";
        const executedByText = process.env.TEST_RAIL_EXECUTED_BY || "Executed by Playwright";
        this.client = new testrail_client_1.TestRailClient(testRailHost, testRailUsername, testRailPassword);
        this.testCaseManager = new test_case_manager_1.TestCaseManager(this.client, executedByText);
        this.testRunManager = new test_run_manager_1.TestRunManager(this.client, this.projectId, this.testRailDir);
        this.workerManager = new worker_manager_1.WorkerManager(this.testRailDir);
        this.initialized = true;
    }
    /**
     * Updates a single test result in TestRail from Playwright TestInfo (simplest usage)
     * @param runName - Name of the test run
     * @param sectionId - TestRail section ID where test cases belong
     * @param platformId - Platform identifier for test execution
     * @param testInfo - Playwright TestInfo object
     * @param isReset - Whether to reset existing test run data (default: false)
     * @throws {TestRailError} When validation fails or TestRail operations fail
     */
    async updateTestResultFromPlaywrightSingle(runName, sectionId, platformId, testInfo, isReset = false) {
        return this.updateTestResultFromPlaywright(runName, sectionId, platformId, [testInfo], isReset);
    }
    /**
     * Updates test results in TestRail from Playwright TestInfo objects (recommended)
     * @param runName - Name of the test run
     * @param sectionId - TestRail section ID where test cases belong
     * @param platformId - Platform identifier for test execution
     * @param testInfos - Array of Playwright TestInfo objects to process
     * @param isReset - Whether to reset existing test run data (default: false)
     * @throws {TestRailError} When validation fails or TestRail operations fail
     */
    async updateTestResultFromPlaywright(runName, sectionId, platformId, testInfos, isReset = false) {
        // Convert Playwright TestInfo objects to TestCaseInfo with automatic enhancement
        const testList = testInfos.map((testInfo) => {
            // Handle both single testInfo and { testInfo, testResult } objects
            if (testInfo.testInfo && testInfo.testResult) {
                return playwright_converter_1.PlaywrightConverter.convertTestInfo(testInfo.testInfo, testInfo.testResult);
            }
            return playwright_converter_1.PlaywrightConverter.convertTestInfo(testInfo);
        });
        // Use existing updateTestResult method
        return this.updateTestResult(runName, sectionId, platformId, testList, isReset);
    }
    /**
     * Updates test results in TestRail by syncing test cases and creating/updating test runs
     * @param runName - Name of the test run
     * @param sectionId - TestRail section ID where test cases belong
     * @param platformId - Platform identifier for test execution
     * @param testList - Array of test case information to process
     * @param isReset - Whether to reset existing test run data (default: false)
     * @throws {TestRailError} When validation fails or TestRail operations fail
     */
    async updateTestResult(runName, sectionId, platformId, testList, isReset = false) {
        // Initialize if not already done
        this.initialize();
        // Validate input parameters
        validation_1.ValidationUtils.validateRunName(runName);
        validation_1.ValidationUtils.validateSectionId(sectionId);
        validation_1.ValidationUtils.validatePlatformId(platformId);
        validation_1.ValidationUtils.validateTestList(testList);
        const workerId = process.env.TEST_WORKER_INDEX || "0";
        const caseIdsInListFile = [];
        const testCaseInfos = [];
        await this.testRunManager.ensureTestRailSetup();
        if (isReset) {
            await this.testRunManager.resetTestRunJson();
        }
        // Skip if no tests to process
        if (testList.length === 0) {
            return;
        }
        const userId = await this.client.getUserIdByEmail(process.env.TEST_RAIL_USERNAME);
        const casesInSection = await this.client.getCases(this.projectId, sectionId);
        // Process test cases and create results
        for (const testCase of testList) {
            validation_1.ValidationUtils.validateTestCase(testCase);
            const testCaseId = await this.testCaseManager.syncTestCase(sectionId, platformId, testCase, casesInSection, userId);
            testCaseInfos.push(testCase);
            caseIdsInListFile.push(testCaseId);
        }
        // Use WorkerManager for coordination
        await this.workerManager.coordinateWorkers(workerId, testCaseInfos, async (allResults) => {
            // Convert TestCaseInfo to TestResult for TestRail API
            const testResults = [];
            const allCaseIds = [];
            for (const testCase of allResults) {
                // Find the corresponding case ID from our processed cases
                const matchingCase = casesInSection.find((c) => c.title === testCase.title);
                if (matchingCase) {
                    const testResult = this.testCaseManager.createTestResult(testCase, matchingCase.id, userId);
                    // Only add to results if not null (skip untested/skipped tests)
                    if (testResult !== null) {
                        testResults.push(testResult);
                        allCaseIds.push(matchingCase.id);
                    }
                }
            }
            // Set test run ID and case IDs
            await this.testRunManager.setTestRunIdAndCaseId(runName, userId, allCaseIds);
            // Write JSON
            await this.testRunManager.writeTestRunJson();
            // Update run and add results
            await this.testRunManager.updateRunAndAddResults(testResults);
        });
    }
}
exports.onTestRailHelper = new TestRailHelper();
exports.default = TestRailHelper;
// Export types and constants for library users
__exportStar(require("./types"), exports);
__exportStar(require("./utils/constants"), exports);
__exportStar(require("./utils/errors"), exports);
__exportStar(require("./utils/playwright-converter"), exports);
__exportStar(require("./utils/failure-capture"), exports);
__exportStar(require("./utils/comment-enhancer"), exports);
