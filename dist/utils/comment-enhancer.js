"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommentEnhancer = exports.DEFAULT_COMMENT_CONFIG = void 0;
const failure_capture_js_1 = require("./failure-capture.js");
/**
 * Default configuration for comment enhancement
 */
exports.DEFAULT_COMMENT_CONFIG = {
    includeStackTrace: false,
    includeDuration: true,
    includeTimestamp: true,
    includeEnvironmentInfo: false,
    maxCommentLength: 4000, // TestRail comment limit
    customPrefix: undefined
};
/**
 * Utility class for enhancing TestRail comments with detailed test information
 */
class CommentEnhancer {
    constructor(config = {}) {
        this.config = { ...exports.DEFAULT_COMMENT_CONFIG, ...config };
    }
    /**
     * Enhances a test result comment with detailed information
     * @param testCase - Test case information
     * @param failureInfo - Failure information (if test failed)
     * @param environmentInfo - Environment information
     * @returns Enhanced comment string
     */
    enhanceComment(testCase, failureInfo, environmentInfo) {
        const parts = [];
        // Add custom prefix if provided
        if (this.config.customPrefix) {
            parts.push(this.config.customPrefix);
        }
        // Add test status section
        parts.push(this.formatTestStatus(testCase));
        // Add failure information for failed tests
        if (testCase.status === "failed" && failureInfo) {
            parts.push("");
            parts.push(failure_capture_js_1.FailureCapture.formatFailureComment(failureInfo, this.config.includeStackTrace));
        }
        // Add timeout information for timed out tests
        if (testCase.status === "timeOut") {
            parts.push("");
            parts.push("⏱️ **Test Timed Out**");
            parts.push("The test exceeded the maximum allowed execution time.");
        }
        // Add interruption information
        if (testCase.status === "interrupted") {
            parts.push("");
            parts.push("🚫 **Test Interrupted**");
            parts.push("The test was interrupted during execution (browser crash or external interruption).");
        }
        // Add duration information
        if (this.config.includeDuration) {
            parts.push("");
            parts.push(`⏱️ **Duration:** ${this.formatDuration(testCase.duration)}`);
        }
        // Add timestamp
        if (this.config.includeTimestamp) {
            parts.push(`🕐 **Executed:** ${new Date().toLocaleString()}`);
        }
        // Add environment information
        if (this.config.includeEnvironmentInfo && environmentInfo) {
            parts.push("");
            parts.push(this.formatEnvironmentInfo(environmentInfo));
        }
        // Add test steps summary if available
        if (testCase._steps && testCase._steps.length > 0) {
            parts.push("");
            parts.push(this.formatTestSteps(testCase._steps));
        }
        let comment = parts.join("\n");
        // Truncate if too long
        if (comment.length > this.config.maxCommentLength) {
            comment = comment.substring(0, this.config.maxCommentLength - 20) + "\n\n... (truncated)";
        }
        return comment;
    }
    /**
     * Formats test status with appropriate emoji and styling
     * @param testCase - Test case information
     * @returns Formatted status string
     */
    formatTestStatus(testCase) {
        const statusEmojis = {
            passed: "✅",
            failed: "❌",
            skipped: "⏭️",
            interrupted: "🚫",
            timeOut: "⏱️"
        };
        const emoji = statusEmojis[testCase.status] || "❓";
        const statusText = testCase.status.charAt(0).toUpperCase() + testCase.status.slice(1);
        return `${emoji} **Test ${statusText}**`;
    }
    /**
     * Formats duration from milliseconds to human readable format
     * @param ms - Duration in milliseconds
     * @returns Formatted duration string
     */
    formatDuration(ms) {
        if (ms < 1000)
            return `${ms}ms`;
        if (ms < 60000)
            return `${(ms / 1000).toFixed(1)}s`;
        if (ms < 3600000)
            return `${(ms / 60000).toFixed(1)}m`;
        return `${(ms / 3600000).toFixed(1)}h`;
    }
    /**
     * Formats environment information
     * @param envInfo - Environment information
     * @returns Formatted environment string
     */
    formatEnvironmentInfo(envInfo) {
        const parts = ["🖥️ **Environment:**"];
        if (envInfo.browser) {
            parts.push(`• Browser: ${envInfo.browser}${envInfo.browserVersion ? ` ${envInfo.browserVersion}` : ""}`);
        }
        if (envInfo.os) {
            parts.push(`• OS: ${envInfo.os}`);
        }
        if (envInfo.nodeVersion) {
            parts.push(`• Node.js: ${envInfo.nodeVersion}`);
        }
        if (envInfo.playwrightVersion) {
            parts.push(`• Playwright: ${envInfo.playwrightVersion}`);
        }
        if (envInfo.testWorker) {
            parts.push(`• Worker: ${envInfo.testWorker}`);
        }
        return parts.join("\n");
    }
    /**
     * Formats test steps summary
     * @param steps - Array of test steps
     * @returns Formatted steps string
     */
    formatTestSteps(steps) {
        const parts = ["📋 **Test Steps:**"];
        const relevantSteps = steps.filter((step) => step.category === "test.step" &&
            step.title !== 'Expect "toPass"' &&
            !step.title.includes("Before Hooks") &&
            !step.title.includes("After Hooks"));
        if (relevantSteps.length === 0) {
            return "";
        }
        relevantSteps.forEach((step, index) => {
            const stepNumber = index + 1;
            const status = step.error ? "❌" : "✅";
            parts.push(`${stepNumber}. ${status} ${step.title}`);
            if (step.error && this.config.includeStackTrace) {
                parts.push(`   Error: ${step.error.message}`);
            }
        });
        return parts.join("\n");
    }
    /**
     * Creates a simple comment for passed tests
     * @param testCase - Test case information
     * @param executedByText - Custom executed by text
     * @returns Simple comment string
     */
    createSimplePassedComment(testCase, executedByText = "Executed by Playwright") {
        const parts = [];
        if (this.config.customPrefix) {
            parts.push(this.config.customPrefix);
        }
        parts.push(`✅ ${executedByText}`);
        if (this.config.includeDuration) {
            parts.push(`Duration: ${this.formatDuration(testCase.duration)}`);
        }
        if (this.config.includeTimestamp) {
            parts.push(`Executed: ${new Date().toLocaleString()}`);
        }
        return parts.join("\n");
    }
    /**
     * Extracts environment information from test context
     * @param testInfo - Playwright TestInfo object
     * @returns Environment information
     */
    static extractEnvironmentInfo(testInfo) {
        const envInfo = {};
        // Extract browser information
        if (testInfo.project) {
            envInfo.browser = testInfo.project.name;
            if (testInfo.project.use?.browserName) {
                envInfo.browser = testInfo.project.use.browserName;
            }
        }
        // Extract OS information
        if (process.platform) {
            const osMap = {
                win32: "Windows",
                darwin: "macOS",
                linux: "Linux"
            };
            envInfo.os = osMap[process.platform] || process.platform;
        }
        // Extract Node.js version
        if (process.version) {
            envInfo.nodeVersion = process.version;
        }
        // Extract test worker information
        if (process.env.TEST_WORKER_INDEX) {
            envInfo.testWorker = `Worker ${process.env.TEST_WORKER_INDEX}`;
        }
        // Try to extract Playwright version (this might not always be available)
        try {
            const playwrightPackage = require("@playwright/test/package.json");
            envInfo.playwrightVersion = playwrightPackage.version;
        }
        catch {
            // Playwright version not available
        }
        return envInfo;
    }
    /**
     * Updates the configuration
     * @param newConfig - New configuration options
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }
    /**
     * Gets the current configuration
     * @returns Current configuration
     */
    getConfig() {
        return { ...this.config };
    }
}
exports.CommentEnhancer = CommentEnhancer;
