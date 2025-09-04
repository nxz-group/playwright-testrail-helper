import type { TestCaseData, TestResult, TestRunInfo } from "../types/index";
import { APIError } from "../utils/errors";

/**
 * HTTP client for TestRail API operations
 */
export class TestRailClient {
  private baseURL: string;
  private headers: Record<string, string>;

  constructor(host: string, username: string, password: string) {
    this.baseURL = `${host}/index.php?`;
    this.headers = {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`
    };
  }

  /**
   * Makes HTTP request with timeout and retry logic
   */
  private async fetchWithTimeout(url: string, options: RequestInit, timeout = 30000): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Makes HTTP request to TestRail API with retry logic
   */
  async request(
    method: "post" | "get",
    path: string,
    data?: Record<string, unknown>,
    retries = 3
  ): Promise<{ statusCode: number; body: unknown }> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const url = `${this.baseURL}${path}`;
        const options: RequestInit = {
          method: method.toUpperCase(),
          headers: this.headers
        };

        if (method === "post" && data) {
          options.body = JSON.stringify(data);
        }

        const response = await this.fetchWithTimeout(url, options);
        const body = await response.json();

        return {
          statusCode: response.status,
          body
        };
      } catch (error: unknown) {
        const isLastAttempt = attempt === retries;
        const isRetryableError = this.isRetryableError(error);

        if (isLastAttempt || !isRetryableError) {
          return {
            statusCode: 500,
            body: { error: (error as Error).message }
          };
        }

        const delay = Math.min(1000 * 2 ** attempt, 5000);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw new APIError("Unexpected error in request retry logic", 500);
  }

  private isRetryableError(error: unknown): boolean {
    if (typeof error !== "object" || error === null) return false;

    const err = error as { name?: string; code?: string };
    return err.name === "AbortError" || err.code === "ECONNRESET" || err.code === "ETIMEDOUT";
  }

  /**
   * Gets user ID by email address
   */
  async getUserIdByEmail(email: string): Promise<number> {
    const url = `${this.baseURL}/api/v2/get_user_by_email&email=${encodeURIComponent(email)}`;
    const response = await this.fetchWithTimeout(url, { headers: this.headers });

    if (!response.ok) {
      throw new APIError(`Failed to get user by email: ${response.status}`, response.status);
    }

    const data = await response.json();
    return data.id;
  }

  /**
   * Gets test cases for a project section
   */
  async getCases(projectId: number, sectionId: number): Promise<Array<{ id: number; title: string }>> {
    let nextUrl = `${this.baseURL}/api/v2/get_cases/${projectId}&section_id=${sectionId}`;
    let cases: Array<{ id: number; title: string }> = [];

    do {
      const response = await this.fetchWithTimeout(nextUrl, { headers: this.headers });

      if (!response.ok) {
        throw new APIError(`Failed to get cases: ${response.status}`, response.status);
      }

      const body = await response.json();
      cases = [...cases, ...body.cases.map(({ id, title }: { id: number; title: string }) => ({ id, title }))];
      nextUrl = body._links.next;
    } while (nextUrl !== null);

    return cases;
  }

  /**
   * Adds a new test case
   */
  async addCase(sectionId: number, testCase: TestCaseData): Promise<number> {
    const url = `${this.baseURL}/api/v2/add_case/${sectionId}`;
    const response = await this.fetchWithTimeout(url, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(testCase)
    });

    if (!response.ok) {
      throw new APIError(`Failed to add case: ${response.status}`, response.status);
    }

    const data = await response.json();
    return data.id;
  }

  /**
   * Updates an existing test case
   */
  async updateCase(caseId: number, sectionId: number, testCase: TestCaseData): Promise<void> {
    const url = `${this.baseURL}/api/v2/update_case/${caseId}&section_id=${sectionId}`;
    const response = await this.fetchWithTimeout(url, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(testCase)
    });

    if (!response.ok) {
      throw new APIError(`Failed to update case: ${response.status}`, response.status);
    }
  }

  /**
   * Creates a new test run
   */
  async addRun(projectId: number, runInfo: TestRunInfo): Promise<unknown> {
    const url = `${this.baseURL}/api/v2/add_run/${projectId}`;
    const response = await this.fetchWithTimeout(url, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(runInfo)
    });

    if (!response.ok) {
      throw new APIError(`Failed to add run: ${response.status}`, response.status);
    }

    return response.json();
  }

  /**
   * Gets test run information
   */
  async getRun(runId: number): Promise<{ statusCode: number; is_completed?: boolean }> {
    const url = `${this.baseURL}/api/v2/get_run/${runId}`;
    const response = await this.fetchWithTimeout(url, { headers: this.headers });

    if (!response.ok) {
      return { statusCode: response.status };
    }

    const data = await response.json();
    return {
      statusCode: response.status,
      is_completed: data.is_completed
    };
  }

  /**
   * Updates test run with case IDs
   */
  async updateRun(runId: number, caseIds: number[]): Promise<void> {
    const url = `${this.baseURL}/api/v2/update_run/${runId}`;
    const response = await this.fetchWithTimeout(url, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({ case_ids: caseIds })
    });

    if (!response.ok) {
      throw new APIError(`Failed to update run: ${response.status}`, response.status);
    }
  }

  /**
   * Adds test results to a test run
   */
  async addResultsForCases(runId: number, testResults: TestResult[]): Promise<void> {
    const url = `${this.baseURL}/api/v2/add_results_for_cases/${runId}`;
    const response = await this.fetchWithTimeout(url, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({ results: testResults })
    });

    if (!response.ok) {
      throw new APIError(`Failed to add results for cases: ${response.status}`, response.status);
    }
  }

  /**
   * Closes a test run
   */
  async closeRun(runId: number): Promise<void> {
    const url = `${this.baseURL}/api/v2/close_run/${runId}`;
    const response = await this.fetchWithTimeout(url, {
      method: "POST",
      headers: this.headers
    });

    if (!response.ok) {
      throw new APIError(`Failed to close run: ${response.status}`, response.status);
    }
  }
}
