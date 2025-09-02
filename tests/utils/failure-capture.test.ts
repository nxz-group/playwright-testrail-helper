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
        status: "failed" as const
      };

      const testResult = {
        status: "failed" as const,
        steps: [
          {
            category: "action",
            title: "Click button",
            error: { message: "Button not found" }
          }
        ]
      };

      const result = FailureCapture.extractFailureInfo(testInfo, testResult, testResult.steps);

      expect(result).toBeDefined();
    });

    it("should handle empty inputs", () => {
      const result = FailureCapture.extractFailureInfo(null as any);

      expect(result).toBeNull();
    });
  });
});
