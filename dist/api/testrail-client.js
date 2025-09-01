"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestRailClient = void 0;
const axios_1 = __importDefault(require("axios"));
const errors_1 = require("../utils/errors");
/**
 * HTTP client for TestRail API operations
 */
class TestRailClient {
    constructor(host, username, password) {
        this.axiosInstance = axios_1.default.create({
            baseURL: `${host}/index.php?`,
            timeout: 30000, // 30 second timeout
            headers: {
                "Content-Type": "application/json",
                Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`
            }
        });
        // Add request interceptor
        this.axiosInstance.interceptors.request.use((config) => config, (error) => Promise.reject(error));
        // Add response interceptor
        this.axiosInstance.interceptors.response.use((response) => response, (error) => Promise.reject(error));
    }
    /**
     * Makes HTTP request to TestRail API with retry logic
     * @param method - HTTP method (get or post)
     * @param path - API endpoint path
     * @param data - Request data for POST requests
     * @param retries - Number of retry attempts (default: 3)
     * @returns API response with status code and body
     */
    async request(method, path, data, retries = 3) {
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                const response = method === "get"
                    ? await this.axiosInstance.get(`?${path}`, data)
                    : await this.axiosInstance.post(`?${path}`, data);
                return {
                    statusCode: response.status,
                    body: response.data
                };
            }
            catch (error) {
                const isLastAttempt = attempt === retries;
                const isRetryableError = this.isRetryableError(error);
                if (isLastAttempt || !isRetryableError) {
                    const err = error;
                    const errorStatus = err.response?.status || 500;
                    const errorBody = err.response?.data || { error: err.message };
                    return {
                        statusCode: errorStatus,
                        body: errorBody
                    };
                }
                // Wait before retry (exponential backoff)
                const delay = Math.min(1000 * 2 ** attempt, 5000);
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }
        // Should never reach here, but TypeScript requires it
        throw new errors_1.APIError("Unexpected error in request retry logic", 500);
    }
    /**
     * Determines if an error is retryable
     * @param error - The error to check
     * @returns True if the error should be retried
     */
    isRetryableError(error) {
        // Type guard for error objects
        if (typeof error !== "object" || error === null) {
            return false;
        }
        const err = error;
        // Network errors
        if (err.code === "ECONNRESET" || err.code === "ETIMEDOUT" || err.code === "ENOTFOUND") {
            return true;
        }
        // HTTP status codes that should be retried
        const retryableStatusCodes = [408, 429, 500, 502, 503, 504];
        const response = err.response;
        return Boolean(response?.status && retryableStatusCodes.includes(response.status));
    }
    /**
     * Gets user ID by email address
     * @param email - User email address
     * @returns User ID
     */
    async getUserIdByEmail(email) {
        // Try using axios params instead of URL string
        const response = await this.axiosInstance.get("/api/v2/get_user_by_email", {
            params: { email: email }
        });
        if (response.status !== 200) {
            throw new errors_1.APIError(`Failed to get user by email: ${response.status}`, response.status, response.data);
        }
        return response.data.id;
    }
    /**
     * Gets test cases for a project section
     * @param projectId - Project ID
     * @param sectionId - Section ID
     * @returns Array of test cases
     */
    async getCases(projectId, sectionId) {
        let nextUrl = `/api/v2/get_cases/${projectId}`;
        let cases = [];
        do {
            const response = await this.axiosInstance.get(nextUrl, {
                params: { section_id: sectionId }
            });
            if (response.status !== 200) {
                throw new errors_1.APIError(`Failed to get cases: ${response.status}`, response.status, response.data);
            }
            const body = response.data;
            cases = [...cases, ...body.cases.map(({ id, title }) => ({ id, title }))];
            nextUrl = body._links.next;
        } while (nextUrl !== null);
        return cases;
    }
    /**
     * Adds a new test case
     * @param sectionId - Section ID
     * @param testCase - Test case data
     * @returns Created test case ID
     */
    async addCase(sectionId, testCase) {
        const response = await this.axiosInstance.post(`/api/v2/add_case/${sectionId}`, testCase);
        if (response.status !== 200) {
            throw new errors_1.APIError(`Failed to add case: ${response.status}`, response.status, response.data);
        }
        return response.data.id;
    }
    /**
     * Updates an existing test case
     * @param caseId - Test case ID
     * @param sectionId - Section ID
     * @param testCase - Updated test case data
     */
    async updateCase(caseId, sectionId, testCase) {
        const response = await this.axiosInstance.post(`/api/v2/update_case/${caseId}`, testCase, {
            params: { section_id: sectionId }
        });
        if (response.status !== 200) {
            throw new errors_1.APIError(`Failed to update case: ${response.status}`, response.status, response.data);
        }
    }
    /**
     * Creates a new test run
     * @param projectId - Project ID
     * @param runInfo - Test run information
     * @returns Created test run data
     */
    async addRun(projectId, runInfo) {
        const response = await this.axiosInstance.post(`/api/v2/add_run/${projectId}`, runInfo);
        if (response.status !== 200) {
            throw new errors_1.APIError(`Failed to add run: ${response.status}`, response.status, response.data);
        }
        return response.data;
    }
    /**
     * Gets test run information
     * @param runId - Test run ID
     * @returns Test run data or error status
     */
    async getRun(runId) {
        const response = await this.axiosInstance.get(`/api/v2/get_run/${runId}`);
        return response.status !== 200
            ? { statusCode: response.status }
            : {
                statusCode: response.status,
                is_completed: response.data.is_completed
            };
    }
    /**
     * Updates test run with case IDs
     * @param runId - Test run ID
     * @param caseIds - Array of test case IDs
     */
    async updateRun(runId, caseIds) {
        const response = await this.axiosInstance.post(`/api/v2/update_run/${runId}`, { case_ids: caseIds });
        if (response.status !== 200) {
            throw new errors_1.APIError(`Failed to update run: ${response.status}`, response.status, response.data);
        }
    }
    /**
     * Adds test results to a test run
     * @param runId - Test run ID
     * @param testResults - Array of test results
     */
    async addResultsForCases(runId, testResults) {
        const response = await this.axiosInstance.post(`/api/v2/add_results_for_cases/${runId}`, { results: testResults });
        if (response.status !== 200) {
            throw new errors_1.APIError(`Failed to add results for cases: ${response.status}`, response.status, response.data);
        }
    }
    /**
     * Closes a test run
     * @param runId - Test run ID
     */
    async closeRun(runId) {
        const response = await this.axiosInstance.post(`/api/v2/close_run/${runId}`);
        if (response.status !== 200) {
            throw new errors_1.APIError(`Failed to close run: ${response.status}`, response.status, response.data);
        }
    }
}
exports.TestRailClient = TestRailClient;
