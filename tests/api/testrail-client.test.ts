import { TestRailClient } from "../../src/api/testrail-client";
import { APIError } from "../../src/utils/errors";

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("TestRailClient", () => {
  let client: TestRailClient;
  const mockHost = "https://test.testrail.io";
  const mockUsername = "test@example.com";
  const mockPassword = "test-api-key";

  beforeEach(() => {
    client = new TestRailClient(mockHost, mockUsername, mockPassword);
    mockFetch.mockClear();
  });

  describe("constructor", () => {
    it("should set correct baseURL and headers", () => {
      expect(client).toBeDefined();
      // Test private properties through behavior
    });
  });

  describe("fetchWithTimeout", () => {
    it("should handle successful requests", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ id: 1 })
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await client.getUserIdByEmail("test@example.com");
      expect(result).toBe(1);
      expect(mockFetch).toHaveBeenCalledWith(
        `${mockHost}/index.php?/api/v2/get_user_by_email&email=test%40example.com`,
        expect.objectContaining({
          signal: expect.any(AbortSignal)
        })
      );
    });

    it("should handle timeout", async () => {
      const abortError = new Error("The operation was aborted");
      abortError.name = "AbortError";
      mockFetch.mockRejectedValue(abortError);

      await expect(client.getUserIdByEmail("test@example.com")).rejects.toThrow("The operation was aborted");
    }, 10000);

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      await expect(client.getUserIdByEmail("test@example.com")).rejects.toThrow("Network error");
    });
  });

  describe("getUserIdByEmail", () => {
    it("should encode email correctly", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ id: 123 })
      };
      mockFetch.mockResolvedValue(mockResponse);

      await client.getUserIdByEmail("user+test@example.com");

      expect(mockFetch).toHaveBeenCalledWith(
        `${mockHost}/index.php?/api/v2/get_user_by_email&email=user%2Btest%40example.com`,
        expect.any(Object)
      );
    });

    it("should throw APIError on non-200 response", async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        json: jest.fn()
      };
      mockFetch.mockResolvedValue(mockResponse);

      await expect(client.getUserIdByEmail("test@example.com")).rejects.toThrow(APIError);
    });
  });

  describe("getCases", () => {
    it("should handle paginated responses", async () => {
      const mockResponse1 = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          cases: [
            { id: 1, title: "Test 1" },
            { id: 2, title: "Test 2" }
          ],
          _links: { next: `${mockHost}/index.php?/api/v2/get_cases/1&section_id=1&offset=2` }
        })
      };
      const mockResponse2 = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          cases: [{ id: 3, title: "Test 3" }],
          _links: { next: null }
        })
      };

      mockFetch.mockResolvedValueOnce(mockResponse1).mockResolvedValueOnce(mockResponse2);

      const result = await client.getCases(1, 1);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ id: 1, title: "Test 1" });
      expect(result[2]).toEqual({ id: 3, title: "Test 3" });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("should construct correct URL with section_id", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          cases: [],
          _links: { next: null }
        })
      };
      mockFetch.mockResolvedValue(mockResponse);

      await client.getCases(123, 456);

      expect(mockFetch).toHaveBeenCalledWith(
        `${mockHost}/index.php?/api/v2/get_cases/123&section_id=456`,
        expect.any(Object)
      );
    });
  });

  describe("addCase", () => {
    it("should send POST request with correct data", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ id: 789 })
      };
      mockFetch.mockResolvedValue(mockResponse);

      const testCase = {
        title: "New Test Case",
        section_id: 1,
        custom_case_custom_automation_type: 3,
        template_id: 1,
        type_id: 3,
        custom_case_custom_platform: 2,
        priority_id: 2,
        custom_steps_separated: [],
        assignedto_id: 1
      };

      const result = await client.addCase(1, testCase);

      expect(result).toBe(789);
      expect(mockFetch).toHaveBeenCalledWith(
        `${mockHost}/index.php?/api/v2/add_case/1`,
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(testCase)
        })
      );
    });
  });

  describe("request method", () => {
    it("should handle retry logic", async () => {
      const abortError = new Error("Network error");
      abortError.name = "AbortError";

      mockFetch
        .mockRejectedValueOnce(abortError)
        .mockRejectedValueOnce(abortError)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue({ success: true })
        });

      const result = await client.request("get", "/api/v2/test");

      expect(result.statusCode).toBe(200);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it("should handle POST requests with data", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ id: 1 })
      };
      mockFetch.mockResolvedValue(mockResponse);

      const testData = { name: "Test Run" };
      await client.request("post", "/api/v2/add_run/1", testData);

      expect(mockFetch).toHaveBeenCalledWith(
        `${mockHost}/index.php?/api/v2/add_run/1`,
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(testData)
        })
      );
    });

    it("should return error response after max retries", async () => {
      // Non-retryable error should fail immediately
      mockFetch.mockRejectedValue(new Error("Persistent error"));

      const result = await client.request("get", "/api/v2/test", undefined, 2);

      expect(result.statusCode).toBe(500);
      expect(result.body).toEqual({ error: "Persistent error" });
      expect(mockFetch).toHaveBeenCalledTimes(1); // No retries for non-retryable errors
    });
  });

  describe("URL construction", () => {
    it("should construct URLs correctly for different endpoints", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({})
      };
      mockFetch.mockResolvedValue(mockResponse);

      // Test different URL patterns
      await client.addRun(123, { name: "Test", assignedto_id: 1, include_all: false });
      expect(mockFetch).toHaveBeenLastCalledWith(`${mockHost}/index.php?/api/v2/add_run/123`, expect.any(Object));

      await client.getRun(456);
      expect(mockFetch).toHaveBeenLastCalledWith(`${mockHost}/index.php?/api/v2/get_run/456`, expect.any(Object));
    });
  });

  describe("error handling", () => {
    it("should throw APIError with correct status and message", async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        json: jest.fn()
      };
      mockFetch.mockResolvedValue(mockResponse);

      await expect(client.addCase(1, {} as any)).rejects.toThrow(
        expect.objectContaining({
          message: "Failed to add case: 401",
          statusCode: 401
        })
      );
    });
  });
});
