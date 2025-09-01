/**
 * Test case information structure
 */
export interface TestCaseInfo {
    title: string;
    tags: string[];
    status: "passed" | "failed" | "skipped" | "interrupted" | "timeOut";
    duration: number;
    _steps?: TestStep[];
    _failureInfo?: import("../utils/failure-capture.js").FailureInfo;
    _environmentInfo?: import("../utils/comment-enhancer.js").EnvironmentInfo;
}
/**
 * Test step structure
 */
export interface TestStep {
    category: string;
    title: string;
    error?: {
        message: string;
    };
}
/**
 * TestRail configuration
 */
export interface TestRailConfig {
    host: string;
    username: string;
    password: string;
    projectId: number;
}
/**
 * Test result structure for TestRail API
 */
export interface TestResult {
    case_id: number;
    status_id: number;
    assignedto_id: number;
    comment: string;
    elapsed: number;
}
/**
 * Test run information
 */
export interface TestRunInfo extends Record<string, unknown> {
    name: string;
    assignedto_id: number;
    include_all: boolean;
}
/**
 * TestRail API response structure
 */
export interface APIResponse {
    statusCode: number;
    body: unknown;
}
/**
 * Test case data for TestRail API
 */
export interface TestCaseData extends Record<string, unknown> {
    title: string;
    section_id: number;
    custom_case_custom_automation_type: number;
    template_id: number;
    type_id: number;
    custom_case_custom_platform: number;
    priority_id: number;
    custom_steps_separated: Array<{
        content: string;
        expected: string;
    }>;
    assignedto_id: number;
}
