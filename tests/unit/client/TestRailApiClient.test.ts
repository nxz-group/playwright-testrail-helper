import { TestRailApiClient } from '../../../src/client/TestRailApiClient';
import { type TestRailConfig, TestRailError } from '../../../src/types';

// Mock fetch globally
const originalFetch = global.fetch;

describe('TestRailApiClient', () => {
  const validConfig: TestRailConfig = {
    host: 'https://test.testrail.io',
    username: 'test@example.com',
    password: 'test-password',
    projectId: 1,
    timeout: 5000,
    retries: 2,
  };

  let client: TestRailApiClient;

  beforeEach(() => {
    client = new TestRailApiClient(validConfig);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create client with valid config', () => {
      expect(client).toBeInstanceOf(TestRailApiClient);
    });

    it('should handle host with trailing slash', () => {
      const configWithSlash = { ...validConfig, host: 'https://test.testrail.io/' };
      const clientWithSlash = new TestRailApiClient(configWithSlash);
      expect(clientWithSlash).toBeInstanceOf(TestRailApiClient);
    });
  });

  describe('request method', () => {
    it('should make successful GET request', async () => {
      const mockBody = { cases: [{ id: 1, title: 'Test Case' }] };
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(mockBody),
        text: () => Promise.resolve(JSON.stringify(mockBody)),
        headers: new Map([['content-type', 'application/json']]),
      });

      const result = await client.request('GET', '/api/v2/get_cases/1&section_id=100');

      expect(result.statusCode).toBe(200);
      expect(result.body).toEqual(mockBody);
    });

    it('should make successful POST request', async () => {
      const mockBody = { id: 123, title: 'New Test Case' };
      const testData = { title: 'New Test Case' };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(mockBody),
        text: () => Promise.resolve(JSON.stringify(mockBody)),
        headers: new Map([['content-type', 'application/json']]),
      });

      const result = await client.request('POST', '/api/v2/add_case/100', testData);

      expect(result.statusCode).toBe(200);
      expect(result.body).toEqual(mockBody);
    });

    it('should handle authentication errors', async () => {
      const errorBody = { error: 'Authentication failed' };
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve(errorBody),
        text: () => Promise.resolve(JSON.stringify(errorBody)),
        headers: new Map([['content-type', 'application/json']]),
      });

      await expect(client.request('GET', '/api/v2/get_cases/1&section_id=100')).rejects.toThrow(
        TestRailError
      );
    });

    it('should handle network errors with retries', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      await expect(client.request('GET', '/api/v2/get_cases/1&section_id=100')).rejects.toThrow(
        'Network error after 2 attempts'
      );

      expect(global.fetch).toHaveBeenCalledTimes(2); // Initial + retries
    });

    it('should handle non-JSON responses', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map([['content-type', 'text/plain']]),
        json: () => Promise.resolve({}),
        text: () => Promise.resolve('Plain text response'),
      });

      const result = await client.request('GET', '/api/v2/some_endpoint');

      expect(result.statusCode).toBe(200);
      expect(result.body).toBe('Plain text response');
    });
  });

  describe('specific API methods', () => {
    beforeEach(() => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve({ success: true }),
        text: () => Promise.resolve(JSON.stringify({ success: true })),
        headers: new Map([['content-type', 'application/json']]),
      });
    });

    it('should call getCases endpoint', async () => {
      const result = await client.getCases(1, 100);
      expect(result.statusCode).toBe(200);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://test.testrail.io/index.php?/api/v2/get_cases/1&section_id=100',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: expect.stringContaining('Basic '),
          }),
        })
      );
    });

    it('should call addCase endpoint', async () => {
      const testCase = { title: 'New Test Case' };
      const result = await client.addCase(100, testCase);
      expect(result.statusCode).toBe(200);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://test.testrail.io/index.php?/api/v2/add_case/100',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(testCase),
        })
      );
    });

    it('should call updateCase endpoint', async () => {
      const testCase = { title: 'Updated Test Case' };
      const result = await client.updateCase(123, testCase);
      expect(result.statusCode).toBe(200);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://test.testrail.io/index.php?/api/v2/update_case/123',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(testCase),
        })
      );
    });

    it('should call getUserByEmail endpoint', async () => {
      const result = await client.getUserByEmail('test@example.com');
      expect(result.statusCode).toBe(200);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://test.testrail.io/index.php?/api/v2/get_user_by_email&email=test%40example.com',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should call addRun endpoint', async () => {
      const runInfo = { name: 'Test Run' };
      const result = await client.addRun(1, runInfo);
      expect(result.statusCode).toBe(200);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://test.testrail.io/index.php?/api/v2/add_run/1',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(runInfo),
        })
      );
    });
  });

  describe('error handling', () => {
    it('should preserve original TestRailError', async () => {
      const errorBody = { error: 'Authentication failed' };
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve(errorBody),
        text: () => Promise.resolve(JSON.stringify(errorBody)),
        headers: new Map([['content-type', 'application/json']]),
      });

      try {
        await client.request('GET', '/api/v2/get_cases/1&section_id=100');
      } catch (error) {
        expect(error).toBeInstanceOf(TestRailError);
        expect((error as TestRailError).statusCode).toBe(401);
        expect((error as TestRailError).response).toEqual(errorBody);
      }
    });

    it('should handle custom retry count', async () => {
      let callCount = 0;
      global.fetch = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          statusText: 'OK',
          json: () => Promise.resolve({ success: true }),
          text: () => Promise.resolve(JSON.stringify({ success: true })),
          headers: new Map([['content-type', 'application/json']]),
        });
      });

      const result = await client.request(
        'GET',
        '/api/v2/get_cases/1&section_id=100',
        undefined,
        3
      );

      expect(result.statusCode).toBe(200);
      expect(global.fetch).toHaveBeenCalledTimes(3); // Initial call + 2 retries
    });
  });
});
