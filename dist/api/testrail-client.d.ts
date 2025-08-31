/**
 * HTTP client for TestRail API operations
 */
export declare class TestRailClient {
  private axiosInstance;
  constructor(host: string, username: string, password: string);
  /**
   * Makes HTTP request to TestRail API with retry logic
   * @param method - HTTP method (get or post)
   * @param path - API endpoint path
   * @param data - Request data for POST requests
   * @param retries - Number of retry attempts (default: 3)
   * @returns API response with status code and body
   */
  request(
    method: "post" | "get",
    path: string,
    data?: Record<string, any>,
    retries?: number
  ): Promise<{
    statusCode: number;
    body: any;
  }>;
  /**
   * Determines if an error is retryable
   * @param error - The error to check
   * @returns True if the error should be retried
   */
  private isRetryableError;
  /**
   * Gets user ID by email address
   * @param email - User email address
   * @returns User ID
   */
  getUserIdByEmail(email: string): Promise<number>;
  /**
   * Gets test cases for a project section
   * @param projectId - Project ID
   * @param sectionId - Section ID
   * @returns Array of test cases
   */
  getCases(
    projectId: number,
    sectionId: number
  ): Promise<
    Array<{
      id: number;
      title: string;
    }>
  >;
  /**
   * Adds a new test case
   * @param sectionId - Section ID
   * @param testCase - Test case data
   * @returns Created test case ID
   */
  addCase(sectionId: number, testCase: Record<string, any>): Promise<number>;
  /**
   * Updates an existing test case
   * @param caseId - Test case ID
   * @param sectionId - Section ID
   * @param testCase - Updated test case data
   */
  updateCase(caseId: number, sectionId: number, testCase: Record<string, any>): Promise<void>;
  /**
   * Creates a new test run
   * @param projectId - Project ID
   * @param runInfo - Test run information
   * @returns Created test run data
   */
  addRun(projectId: number, runInfo: Record<string, any>): Promise<any>;
  /**
   * Gets test run information
   * @param runId - Test run ID
   * @returns Test run data or error status
   */
  getRun(runId: number): Promise<{
    statusCode: number;
    is_completed?: boolean;
  }>;
  /**
   * Updates test run with case IDs
   * @param runId - Test run ID
   * @param caseIds - Array of test case IDs
   */
  updateRun(runId: number, caseIds: number[]): Promise<void>;
  /**
   * Adds test results to a test run
   * @param runId - Test run ID
   * @param testResults - Array of test results
   */
  addResultsForCases(runId: number, testResults: Record<string, any>[]): Promise<void>;
  /**
   * Closes a test run
   * @param runId - Test run ID
   */
  closeRun(runId: number): Promise<void>;
}
