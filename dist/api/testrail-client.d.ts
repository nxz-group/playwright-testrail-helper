import type { TestCaseData, TestResult, TestRunInfo } from "../types/index";
/**
 * HTTP client for TestRail API operations
 */
export declare class TestRailClient {
    private baseURL;
    private headers;
    constructor(host: string, username: string, password: string);
    /**
     * Makes HTTP request with timeout and retry logic
     */
    private fetchWithTimeout;
    /**
     * Makes HTTP request to TestRail API with retry logic
     */
    request(method: "post" | "get", path: string, data?: Record<string, unknown>, retries?: number): Promise<{
        statusCode: number;
        body: unknown;
    }>;
    private isRetryableError;
    /**
     * Gets user ID by email address
     */
    getUserIdByEmail(email: string): Promise<number>;
    /**
     * Gets test cases for a project section
     */
    getCases(projectId: number, sectionId: number): Promise<Array<{
        id: number;
        title: string;
    }>>;
    /**
     * Adds a new test case
     */
    addCase(sectionId: number, testCase: TestCaseData): Promise<number>;
    /**
     * Updates an existing test case
     */
    updateCase(caseId: number, sectionId: number, testCase: TestCaseData): Promise<void>;
    /**
     * Creates a new test run
     */
    addRun(projectId: number, runInfo: TestRunInfo): Promise<unknown>;
    /**
     * Gets test run information
     */
    getRun(runId: number): Promise<{
        statusCode: number;
        is_completed?: boolean;
    }>;
    /**
     * Updates test run with case IDs
     */
    updateRun(runId: number, caseIds: number[]): Promise<void>;
    /**
     * Adds test results to a test run
     */
    addResultsForCases(runId: number, testResults: TestResult[]): Promise<void>;
    /**
     * Closes a test run
     */
    closeRun(runId: number): Promise<void>;
}
