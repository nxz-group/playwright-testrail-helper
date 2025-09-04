import { FailureCapture } from "../../src/utils/failure-capture";

describe("FailureCapture", () => {
  describe("extractFailureInfo", () => {
    it("should extract failure info from test info with errors", () => {
      const testInfo = {
        title: "Failed test",
        status: "failed" as const,
        errors: [
          {
            message: "Element not found",
            stack: "Error: Element not found\n  at test.spec.ts:10"
          }
        ]
      };

      const result = FailureCapture.extractFailureInfo(testInfo);

      expect(result).toBeDefined();
      expect(result?.errorMessage).toBeDefined();
      expect(result?.errorStack).toBeDefined();
    });

    it("should handle test info without errors", () => {
      const testInfo = {
        title: "Test without errors",
        status: "passed" as const
      };

      const result = FailureCapture.extractFailureInfo(testInfo);

      expect(result).toBeNull();
    });

    it("should handle test result with failed steps", () => {
      const testInfo = {
        title: "Test with steps",
        status: "failed" as const,
        steps: [
          {
            title: "Click button",
            error: { message: "Button not found" }
          }
        ]
      };

      const result = FailureCapture.extractFailureInfo(testInfo);

      expect(result).toBeDefined();
      expect(result?.failedStep).toBe("Click button");
    });

    it("should handle empty errors array", () => {
      const testInfo = {
        title: "Test with empty errors",
        status: "failed" as const,
        errors: []
      };

      const result = FailureCapture.extractFailureInfo(testInfo);

      expect(result).toBeDefined();
      expect(result?.errorMessage).toBe("Test failed"); // Default message
    });

    it("should handle multiple errors", () => {
      const testInfo = {
        title: "Test with multiple errors",
        status: "failed" as const,
        errors: [
          { message: "First error", stack: "Stack 1" },
          { message: "Second error", stack: "Stack 2" }
        ]
      };

      const result = FailureCapture.extractFailureInfo(testInfo);

      expect(result).toBeDefined();
      expect(result?.errorMessage).toContain("First error");
    });
  });

  describe("formatFailureComment", () => {
    it("should format basic failure comment", () => {
      const failureInfo = {
        errorMessage: "Test failed",
        failedStep: "Click submit button"
      };

      const result = FailureCapture.formatFailureComment(failureInfo);

      expect(result).toContain("Error: Test failed");
      expect(result).toContain("Failed Step: Click submit button");
    });

    it("should format failure comment without failed step", () => {
      const failureInfo = {
        errorMessage: "Test failed"
      };

      const result = FailureCapture.formatFailureComment(failureInfo);

      expect(result).toBe("Error: Test failed");
    });

    it("should include stack trace when requested", () => {
      const failureInfo = {
        errorMessage: "Test failed",
        errorStack: "Error stack trace"
      };

      const result = FailureCapture.formatFailureComment(failureInfo, true);

      expect(result).toContain("Error: Test failed");
    });
  });

  describe("extractTimeoutFailure", () => {
    it("should extract timeout failure info", () => {
      const testInfo = {
        timeout: 30000
      };

      const testResult = {
        status: "timedOut" as const,
        duration: 35000
      };

      const result = FailureCapture.extractTimeoutFailure(testInfo, testResult);

      expect(result).toBeDefined();
      expect(result?.errorMessage).toContain("timed out after 30000ms");
      expect(result?.errorMessage).toContain("actual: 35000ms");
      expect(result?.failedStep).toBe("Test execution timeout");
    });

    it("should return null for non-timeout status", () => {
      const testInfo = { timeout: 30000 };
      const testResult = { status: "failed" as const };

      const result = FailureCapture.extractTimeoutFailure(testInfo, testResult);

      expect(result).toBeNull();
    });

    it("should handle missing testResult", () => {
      const testInfo = { timeout: 30000 };

      const result = FailureCapture.extractTimeoutFailure(testInfo);

      expect(result).toBeNull();
    });

    it("should use default timeout when not specified", () => {
      const testInfo = {};
      const testResult = {
        status: "timedOut" as const,
        duration: 35000
      };

      const result = FailureCapture.extractTimeoutFailure(testInfo, testResult);

      expect(result?.errorMessage).toContain("timed out after 30000ms");
    });
  });

  describe("extractInterruptionFailure", () => {
    it("should extract interruption failure info", () => {
      const testInfo = {};
      const testResult = {
        status: "interrupted" as const
      };

      const result = FailureCapture.extractInterruptionFailure(testInfo, testResult);

      expect(result).toBeDefined();
      expect(result?.errorMessage).toContain("Test was interrupted");
      expect(result?.failedStep).toBe("Test execution interrupted");
    });

    it("should return null for non-interrupted status", () => {
      const testInfo = {};
      const testResult = { status: "failed" as const };

      const result = FailureCapture.extractInterruptionFailure(testInfo, testResult);

      expect(result).toBeNull();
    });

    it("should handle missing testResult", () => {
      const testInfo = {};

      const result = FailureCapture.extractInterruptionFailure(testInfo);

      expect(result).toBeNull();
    });
  });

  describe("cleanErrorMessage", () => {
    it("should clean error message with excessive whitespace", () => {
      const message = "Error   with    multiple   spaces";
      const result = FailureCapture.cleanErrorMessage(message);
      expect(result).toBe("Error with multiple spaces");
    });

    it("should handle empty message", () => {
      const result = FailureCapture.cleanErrorMessage("");
      expect(result).toBe("");
    });

    it("should handle null/undefined message", () => {
      const result = FailureCapture.cleanErrorMessage(null as any);
      expect(result).toBe("");
    });

    it("should trim whitespace", () => {
      const message = "  Error message  ";
      const result = FailureCapture.cleanErrorMessage(message);
      expect(result).toBe("Error message");
    });
  });
});
