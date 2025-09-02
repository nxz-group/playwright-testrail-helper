import { APIError, ConfigurationError, TestRailError } from "../../src/utils/errors";

describe("Error Classes", () => {
  describe("TestRailError", () => {
    it("should create error with message only", () => {
      const error = new TestRailError("Test error");
      expect(error.message).toBe("Test error");
      expect(error.name).toBe("TestRailError");
      expect(error.statusCode).toBeUndefined();
    });

    it("should create error with message and status code", () => {
      const error = new TestRailError("API failed", 500);
      expect(error.message).toBe("API failed");
      expect(error.name).toBe("TestRailError");
      expect(error.statusCode).toBe(500);
    });
  });

  describe("ConfigurationError", () => {
    it("should create configuration error", () => {
      const error = new ConfigurationError("Missing env vars");
      expect(error.message).toBe("Missing env vars");
      expect(error.name).toBe("ConfigurationError");
    });
  });

  describe("APIError", () => {
    it("should create API error with required fields", () => {
      const error = new APIError("Request failed", 404);
      expect(error.message).toBe("Request failed");
      expect(error.name).toBe("APIError");
      expect(error.statusCode).toBe(404);
      expect(error.response).toBeUndefined();
    });

    it("should create API error with response data", () => {
      const response = { error: "Not found" };
      const error = new APIError("Request failed", 404, response);
      expect(error.response).toEqual(response);
    });
  });
});
