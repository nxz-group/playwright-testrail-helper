import { TestRailConfig, ApiResponse, TestRailError } from '../types';
import { Logger } from '../utils/Logger';

/**
 * HTTP client for TestRail API with retry logic and error handling
 */
export class TestRailApiClient {
  private baseURL: string;
  private headers: Record<string, string>;
  private logger: Logger;
  private timeout: number;
  private retries: number;

  constructor(config: TestRailConfig) {
    this.baseURL = config.host.replace(/\/$/, ''); // Remove trailing slash
    this.headers = {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${Buffer.from(`${config.username}:${config.password}`).toString('base64')}`
    };
    this.logger = new Logger('TestRailApiClient');
    this.timeout = config.timeout || 30000;
    this.retries = config.retries || 3;
  }

  /**
   * Make HTTP request with retry logic
   */
  async request<T = unknown>(
    method: 'GET' | 'POST',
    endpoint: string,
    data?: unknown,
    customRetries?: number
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}/index.php?${endpoint}`;
    const retryCount = customRetries ?? this.retries;
    
    for (let attempt = 1; attempt <= retryCount; attempt++) {
      try {
        this.logger.debug(`${method} ${endpoint}`, { attempt, data });
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const requestInit: RequestInit = {
          method,
          headers: this.headers,
          signal: controller.signal
        };

        if (data) {
          requestInit.body = JSON.stringify(data);
        }

        const response = await fetch(url, requestInit);

        clearTimeout(timeoutId);

        let body: T;
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
          body = await response.json() as T;
        } else {
          body = await response.text() as T;
        }
        
        const result: ApiResponse<T> = {
          statusCode: response.status,
          body,
          headers: Object.fromEntries(response.headers.entries())
        };

        if (response.ok) {
          this.logger.debug(`${method} ${endpoint} success`, { 
            statusCode: response.status,
            attempt 
          });
          return result;
        }

        // Handle specific error cases
        if (response.status === 401) {
          throw new TestRailError('Authentication failed. Check credentials.', response.status, body);
        }

        if (response.status === 403) {
          throw new TestRailError('Access forbidden. Check permissions.', response.status, body);
        }

        if (response.status === 404) {
          throw new TestRailError('Resource not found.', response.status, body);
        }

        // Retry on server errors (5xx) and rate limiting (429)
        if ((response.status >= 500 || response.status === 429) && attempt < retryCount) {
          const delay = this.calculateBackoffDelay(attempt);
          this.logger.warn(`${method} ${endpoint} failed, retrying in ${delay}ms`, { 
            statusCode: response.status, 
            attempt,
            body 
          });
          await this.delay(delay);
          continue;
        }

        // Non-retryable error
        this.logger.error(`${method} ${endpoint} failed`, { 
          statusCode: response.status, 
          body,
          attempt 
        });
        
        throw new TestRailError(
          `API request failed with status ${response.status}`,
          response.status,
          body
        );

      } catch (error) {
        if (error instanceof TestRailError) {
          throw error;
        }

        // Handle network errors, timeouts, etc.
        if (attempt === retryCount) {
          this.logger.error(`${method} ${endpoint} error after ${retryCount} attempts`, error);
          throw new TestRailError(
            `Network error after ${retryCount} attempts: ${(error as Error).message}`,
            0,
            error
          );
        }
        
        const delay = this.calculateBackoffDelay(attempt);
        this.logger.warn(`${method} ${endpoint} error, retrying in ${delay}ms`, { 
          error: (error as Error).message, 
          attempt 
        });
        await this.delay(delay);
      }
    }

    throw new TestRailError(`Failed to complete request after ${retryCount} attempts`);
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoffDelay(attempt: number): number {
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds
    const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * delay;
    return Math.floor(delay + jitter);
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Specific API methods

  /**
   * Get test cases in a section
   */
  async getCases(projectId: number, sectionId: number): Promise<ApiResponse> {
    return this.request('GET', `/api/v2/get_cases/${projectId}&section_id=${sectionId}`);
  }

  /**
   * Add a new test case
   */
  async addCase(sectionId: number, testCase: unknown): Promise<ApiResponse> {
    return this.request('POST', `/api/v2/add_case/${sectionId}`, testCase);
  }

  /**
   * Update an existing test case
   */
  async updateCase(caseId: number, testCase: unknown): Promise<ApiResponse> {
    return this.request('POST', `/api/v2/update_case/${caseId}`, testCase);
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<ApiResponse> {
    return this.request('GET', `/api/v2/get_user_by_email&email=${encodeURIComponent(email)}`);
  }

  /**
   * Add a new test run
   */
  async addRun(projectId: number, runInfo: unknown): Promise<ApiResponse> {
    return this.request('POST', `/api/v2/add_run/${projectId}`, runInfo);
  }

  /**
   * Get test run information
   */
  async getRun(runId: number): Promise<ApiResponse> {
    return this.request('GET', `/api/v2/get_run/${runId}`);
  }

  /**
   * Update test run
   */
  async updateRun(runId: number, data: unknown): Promise<ApiResponse> {
    return this.request('POST', `/api/v2/update_run/${runId}`, data);
  }

  /**
   * Add test results for multiple cases
   */
  async addResultsForCases(runId: number, results: unknown[]): Promise<ApiResponse> {
    return this.request('POST', `/api/v2/add_results_for_cases/${runId}`, { results });
  }

  /**
   * Close a test run
   */
  async closeRun(runId: number): Promise<ApiResponse> {
    return this.request('POST', `/api/v2/close_run/${runId}`);
  }

  /**
   * Get test runs for a project
   */
  async getRuns(projectId: number, isCompleted?: boolean): Promise<ApiResponse> {
    let endpoint = `/api/v2/get_runs/${projectId}`;
    if (typeof isCompleted === 'boolean') {
      endpoint += `&is_completed=${isCompleted ? 1 : 0}`;
    }
    return this.request('GET', endpoint);
  }

  /**
   * Get project information
   */
  async getProject(projectId: number): Promise<ApiResponse> {
    return this.request('GET', `/api/v2/get_project/${projectId}`);
  }

  /**
   * Get sections in a project
   */
  async getSections(projectId: number, suiteId?: number): Promise<ApiResponse> {
    let endpoint = `/api/v2/get_sections/${projectId}`;
    if (suiteId) {
      endpoint += `&suite_id=${suiteId}`;
    }
    return this.request('GET', endpoint);
  }
}