"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlaywrightConverter = void 0;
const failure_capture_1 = require("./failure-capture");
/**
 * Utility functions for converting Playwright test objects to TestRail format
 */
class PlaywrightConverter {
    /**
     * Converts Playwright TestInfo to TestCaseInfo format
     * @param testInfo - Playwright TestInfo object
     * @param testResult - Playwright TestResult object (optional)
     * @returns TestCaseInfo object for TestRail integration
     * @throws {Error} When testInfo is null, undefined, or missing required properties
     */
    static convertTestInfo(testInfo, testResult) {
        // Validate input
        if (!testInfo) {
            throw new Error("testInfo cannot be null or undefined");
        }
        if (typeof testInfo !== 'object' || Array.isArray(testInfo)) {
            throw new Error("testInfo must be an object");
        }
        if (!testInfo.title || typeof testInfo.title !== 'string' || testInfo.title.trim().length === 0) {
            throw new Error("testInfo must have a valid non-empty title property");
        }
        // Extract tags from test title or annotations
        const tags = PlaywrightConverter.extractTags(testInfo);
        // Determine test status
        const status = PlaywrightConverter.getTestStatus(testInfo, testResult);
        // Get test duration
        const duration = PlaywrightConverter.getTestDuration(testInfo, testResult);
        // Extract test steps if available
        const steps = PlaywrightConverter.extractTestSteps(testInfo, testResult);
        const testCaseInfo = {
            title: testInfo.title,
            tags,
            status,
            duration,
            _steps: steps
        };
        // Only add failure information for failed tests if needed
        if (status === "failed") {
            const failureInfo = failure_capture_1.FailureCapture.extractFailureInfo(testInfo, testResult, steps);
            if (failureInfo) {
                // Convert FailureInfo to errors array format
                testCaseInfo.errors = [
                    {
                        message: failureInfo.errorMessage,
                        stack: failureInfo.errorStack
                    }
                ];
            }
        }
        return testCaseInfo;
    }
    /**
     * Extracts tags from test title, annotations, or project name
     * @param testInfo - Playwright TestInfo object
     * @returns Array of tags
     */
    static extractTags(testInfo) {
        const tags = [];
        // Extract tags from title (e.g., "@smoke @login User can login")
        if (testInfo.title && typeof testInfo.title === 'string') {
            const titleTags = testInfo.title.match(/@\w+/g);
            if (titleTags) {
                tags.push(...titleTags);
            }
        }
        // Extract tags from annotations
        if (testInfo.annotations && Array.isArray(testInfo.annotations)) {
            for (const annotation of testInfo.annotations) {
                if (annotation && annotation.type === "tag" && annotation.description) {
                    tags.push(`@${annotation.description}`);
                }
            }
        }
        // Add project name as tag if available
        if (testInfo.project?.name && typeof testInfo.project.name === 'string') {
            tags.push(`@${testInfo.project.name.toLowerCase()}`);
        }
        // If no tags found, add default based on file path
        if (tags.length === 0 && testInfo.file && typeof testInfo.file === 'string') {
            const fileName = testInfo.file.split("/").pop()?.replace(".spec.ts", "").replace(".test.ts", "");
            if (fileName) {
                tags.push(`@${fileName}`);
            }
        }
        // If still no tags, add a default tag
        if (tags.length === 0) {
            tags.push("@test");
        }
        return tags;
    }
    /**
     * Determines test status from TestInfo and TestResult
     * @param testInfo - Playwright TestInfo object
     * @param testResult - Playwright TestResult object
     * @returns Test status string
     */
    static getTestStatus(testInfo, testResult) {
        // If testResult is provided, use its status
        if (testResult) {
            switch (testResult.status) {
                case "passed":
                    return "passed";
                case "failed":
                    return "failed";
                case "timedOut":
                    return "timeOut";
                case "skipped":
                    return "skipped";
                case "interrupted":
                    return "interrupted";
                default:
                    return "failed";
            }
        }
        // Fallback to testInfo status if available
        if (testInfo.status) {
            switch (testInfo.status) {
                case "passed":
                    return "passed";
                case "failed":
                    return "failed";
                case "timedOut":
                    return "timeOut";
                case "skipped":
                    return "skipped";
                case "interrupted":
                    return "interrupted";
                default:
                    return "failed";
            }
        }
        return "failed"; // Default fallback
    }
    /**
     * Gets test duration from TestInfo or TestResult
     * @param testInfo - Playwright TestInfo object
     * @param testResult - Playwright TestResult object
     * @returns Duration in milliseconds
     */
    static getTestDuration(testInfo, testResult) {
        if (testResult?.duration !== undefined) {
            return testResult.duration;
        }
        if (testInfo.duration !== undefined) {
            return testInfo.duration;
        }
        // Calculate from start/end times if available
        if (testInfo.startTime && testInfo.endTime) {
            return testInfo.endTime.getTime() - testInfo.startTime.getTime();
        }
        return 0; // Default fallback
    }
    /**
     * Extracts test steps from TestInfo or TestResult
     * @param testInfo - Playwright TestInfo object
     * @param testResult - Playwright TestResult object
     * @returns Array of test steps
     */
    static extractTestSteps(testInfo, testResult) {
        const steps = [];
        // Extract from test result steps if available
        if (testResult?.steps) {
            testResult.steps.forEach((step) => {
                steps.push({
                    category: step.category || "test.step",
                    title: step.title,
                    error: step.error ? { message: step.error.message || String(step.error) } : undefined
                });
            });
        }
        // If no steps from testResult but we have errors, create a step from the error
        if (steps.length === 0 && testInfo.errors && testInfo.errors.length > 0) {
            steps.push({
                category: "test.step",
                title: "Test execution failed",
                error: { message: testInfo.errors[0].message }
            });
        }
        // Extract from test info attachments or other sources
        if (testInfo.attachments) {
            testInfo.attachments.forEach((attachment) => {
                if (attachment.name.startsWith("step:")) {
                    steps.push({
                        category: "test.step",
                        title: attachment.name.replace("step:", ""),
                        error: undefined
                    });
                }
            });
        }
        return steps.length > 0 ? steps : undefined;
    }
    /**
     * Converts multiple Playwright test results to TestCaseInfo array
     * @param testInfos - Array of Playwright TestInfo objects
     * @param testResults - Array of Playwright TestResult objects (optional)
     * @returns Array of TestCaseInfo objects
     */
    static convertMultipleTests(testInfos, testResults) {
        return testInfos.map((testInfo, index) => {
            const testResult = testResults?.[index];
            return PlaywrightConverter.convertTestInfo(testInfo, testResult);
        });
    }
    /**
     * Converts Playwright test result from afterEach hook
     * @param testInfo - Playwright TestInfo from afterEach
     * @returns TestCaseInfo object
     */
    static convertFromAfterEach(testInfo) {
        return PlaywrightConverter.convertTestInfo(testInfo);
    }
    /**
     * Converts Playwright test result from teardown
     * @param testInfo - Playwright TestInfo from teardown
     * @param error - Error object if test failed
     * @returns TestCaseInfo object
     */
    static convertFromTeardown(testInfo, error) {
        const testCaseInfo = PlaywrightConverter.convertTestInfo(testInfo);
        // Override status if error is provided
        if (error) {
            testCaseInfo.status = "failed";
            // Add error as a step
            if (!testCaseInfo._steps) {
                testCaseInfo._steps = [];
            }
            testCaseInfo._steps.push({
                category: "test.step",
                title: "Test execution failed",
                error: { message: error.message }
            });
        }
        return testCaseInfo;
    }
}
exports.PlaywrightConverter = PlaywrightConverter;
