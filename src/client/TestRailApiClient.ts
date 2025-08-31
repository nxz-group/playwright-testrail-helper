import { type ApiResponse, type TestRailConfig, TestRailError } from '../types';
import { Logger } from '../utils/Logger';

/**
 * Rate limiter for API requests
 */
class RateLimiter {
  private requests: number[] = [];
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests = 100, windowMs = 60000) {
    // 100 requests per minute by default
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  async waitForSlot(): Promise<void> {
    const now = Date.now();

    // Remove old requests outside the window
    this.requests = this.requests.filter(time => now - time < this.windowMs);

    if (this.requests.length >= this.maxRequests) {
      // Wait until the oldest request is outside the window
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.windowMs - (now - oldestRequest) + 100; // Add 100ms buffer

      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return this.waitForSlot(); // Recursive call to check again
      }
    }

    this.requests.push(now);
  }
}

/**
 * Connection pool for managing HTTP connections
 */
class ConnectionPool {
  private activeConnections = 0;
  private maxConnections: number;
  private waitingQueue: Array<() => void> = [];

  constructor(maxConnections = 10) {
    this.maxConnections = maxConnections;
  }

  async acquire(): Promise<void> {
    if (this.activeConnections < this.maxConnections) {
      this.activeConnections++;
      return;
    }

    // Wait for a connection to be released
    return new Promise<void>(resolve => {
      this.waitingQueue.push(resolve);
    });
  }

  release(): void {
    this.activeConnections--;

    if (this.waitingQueue.length > 0) {
      const next = this.waitingQueue.shift();
      if (next) {
        this.activeConnections++;
        next();
      }
    }
  }

  getStats(): { active: number; waiting: number; max: number } {
    return {
      active: this.activeConnections,
      waiting: this.waitingQueue.length,
      max: this.maxConnections,
    };
  }
}

/**
 * HTTP client for TestRail API with retry logic, rate limiting, and connection pooling
 */
export class TestRailApiClient {
  private baseURL: string;
  private headers: Record<string, string>;
  private logger: Logger;
  private timeout: number;
  private retries: number;
  private rateLimiter: RateLimiter;
  private connectionPool: ConnectionPool;
  private requestCache: Map<string, { data: unknown; timestamp: number }> = new Map();

  constructor(config: TestRailConfig) {
    this.baseURL = config.host.replace(/\/$/, ''); // Remove trailing slash
    this.headers = {
      'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(`${config.username}:${config.password}`).toString('base64')}`,
    };
    this.logger = new Logger('TestRailApiClient');
    this.timeout = config.timeout || 30000;
    this.retries = config.retries || 3;
    this.rateLimiter = new RateLimiter(100, 60000); // 100 requests per minute
    this.connectionPool = new ConnectionPool(10); // Max 10 concurrent connections
  }

  /**
   * Make HTTP request with retry logic, rate limiting, and caching
   */
  async request<T = unknown>(
    method: 'GET' | 'POST',
    endpoint: string,
    data?: unknown,
    customRetries?: number,
    useCache = false
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}/index.php?${endpoint}`;
    const retryCount = customRetries ?? this.retries;
    const cacheKey = `${method}:${endpoint}:${JSON.stringify(data)}`;

    // Check cache for GET requests
    if (method === 'GET' && useCache) {
      const cached = this.requestCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < 300000) {
        // 5 minute cache
        this.logger.debug('Returning cached response', { endpoint });
        return cached.data as ApiResponse<T>;
      }
    }

    for (let attempt = 1; attempt <= retryCount; attempt++) {
      try {
        // Wait for rate limiter
        await this.rateLimiter.waitForSlot();

        // Acquire connection from pool
        await this.connectionPool.acquire();

        this.logger.debug(`${method} ${endpoint}`, {
          attempt,
          data,
          connectionStats: this.connectionPool.getStats(),
        });

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const requestInit: RequestInit = {
          method,
          headers: this.headers,
          signal: controller.signal,
        };

        if (data) {
          requestInit.body = JSON.stringify(data);
        }

        const response = await fetch(url, requestInit);

        clearTimeout(timeoutId);
        this.connectionPool.release(); // Release connection

        let body: T;
        const contentType = response.headers.get('content-type');

        if (contentType?.includes('application/json')) {
          body = (await response.json()) as T;
        } else {
          body = (await response.text()) as T;
        }

        const result: ApiResponse<T> = {
          statusCode: response.status,
          body,
          headers: Object.fromEntries(response.headers.entries()),
        };

        if (response.ok) {
          this.logger.debug(`${method} ${endpoint} success`, {
            statusCode: response.status,
            attempt,
          });

          // Cache GET responses
          if (method === 'GET' && useCache) {
            this.requestCache.set(cacheKey, { data: result, timestamp: Date.now() });
          }

          return result;
        }

        // Handle specific error cases
        if (response.status === 401) {
          throw new TestRailError(
            'Authentication failed. Check credentials.',
            response.status,
            body
          );
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
            body,
          });
          await this.delay(delay);
          continue;
        }

        // Non-retryable error
        this.logger.error(`${method} ${endpoint} failed`, {
          statusCode: response.status,
          body,
          attempt,
        });

        throw new TestRailError(
          `API request failed with status ${response.status}`,
          response.status,
          body
        );
      } catch (error) {
        this.connectionPool.release(); // Always release connection on error

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
          attempt,
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
    const delay = Math.min(baseDelay * 2 ** (attempt - 1), maxDelay);

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
   * Clear request cache
   */
  clearCache(): void {
    this.requestCache.clear();
    this.logger.debug('Request cache cleared');
  }

  /**
   * Get connection pool statistics
   */
  getConnectionStats(): { active: number; waiting: number; max: number } {
    return this.connectionPool.getStats();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.requestCache.size,
      entries: Array.from(this.requestCache.keys()),
    };
  }

  // Specific API methods with caching support

  /**
   * Get test cases in a section (with caching)
   */
  async getCases(projectId: number, sectionId: number, useCache = true): Promise<ApiResponse> {
    return this.request(
      'GET',
      `/api/v2/get_cases/${projectId}&section_id=${sectionId}`,
      undefined,
      undefined,
      useCache
    );
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
   * Get user by email (with caching)
   */
  async getUserByEmail(email: string, useCache = true): Promise<ApiResponse> {
    return this.request(
      'GET',
      `/api/v2/get_user_by_email&email=${encodeURIComponent(email)}`,
      undefined,
      undefined,
      useCache
    );
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
   * Get project information (with caching)
   */
  async getProject(projectId: number, useCache = true): Promise<ApiResponse> {
    return this.request('GET', `/api/v2/get_project/${projectId}`, undefined, undefined, useCache);
  }

  /**
   * Get sections in a project (with caching)
   */
  async getSections(projectId: number, suiteId?: number, useCache = true): Promise<ApiResponse> {
    let endpoint = `/api/v2/get_sections/${projectId}`;
    if (suiteId) {
      endpoint += `&suite_id=${suiteId}`;
    }
    return this.request('GET', endpoint, undefined, undefined, useCache);
  }
}
