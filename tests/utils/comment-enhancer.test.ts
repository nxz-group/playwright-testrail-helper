import type { TestCaseInfo } from "../../src/types";
import { CommentEnhancer } from "../../src/utils/comment-enhancer";

describe("CommentEnhancer", () => {
  let enhancer: CommentEnhancer;

  beforeEach(() => {
    enhancer = new CommentEnhancer();
  });

  describe("enhanceComment", () => {
    it("should enhance passed test comment", () => {
      const testCase: TestCaseInfo = {
        title: "Test passed",
        status: "passed",
        duration: 1500,
        tags: [],
        errors: []
      };

      const result = enhancer.enhanceComment(testCase);

      expect(result).toContain("Status: Passed");
      expect(result).toContain("Duration: 1.5s");
      expect(result).toContain("Executed by Playwright");
    });

    it("should enhance failed test comment", () => {
      const testCase: TestCaseInfo = {
        title: "Test failed",
        status: "failed",
        duration: 2000,
        tags: [],
        errors: [
          {
            message: "Element not found",
            stack: "Error stack trace"
          }
        ]
      };

      const result = enhancer.enhanceComment(testCase);

      expect(result).toContain("Status: Failed");
      expect(result).toContain("Duration: 2.0s");
    });

    it("should handle skipped test", () => {
      const testCase: TestCaseInfo = {
        title: "Test skipped",
        status: "skipped",
        duration: 0,
        tags: [],
        errors: []
      };

      const result = enhancer.enhanceComment(testCase);

      expect(result).toContain("Status: skipped");
      expect(result).toContain("⏭️ Test Skipped");
    });

    it("should handle interrupted test", () => {
      const testCase: TestCaseInfo = {
        title: "Test interrupted",
        status: "interrupted",
        duration: 1000,
        tags: [],
        errors: []
      };

      const result = enhancer.enhanceComment(testCase);

      expect(result).toContain("Status: interrupted");
      expect(result).toContain("🚫 Test Interrupted");
    });

    it("should handle timeout test", () => {
      const testCase: TestCaseInfo = {
        title: "Test timeout",
        status: "timeOut",
        duration: 30000,
        tags: [],
        errors: []
      };

      const result = enhancer.enhanceComment(testCase);

      expect(result).toContain("Status: timeOut");
      expect(result).toContain("⏱️ Test Timed Out");
    });

    it("should include custom prefix when configured", () => {
      enhancer = new CommentEnhancer({ customPrefix: "Custom Execution" });

      const testCase: TestCaseInfo = {
        title: "Test",
        status: "passed",
        duration: 1000,
        tags: [],
        errors: []
      };

      const result = enhancer.enhanceComment(testCase);

      expect(result).toContain("Custom Execution");
    });

    it("should include timestamp when configured", () => {
      enhancer = new CommentEnhancer({ includeTimestamp: true });

      const testCase: TestCaseInfo = {
        title: "Test",
        status: "passed",
        duration: 1000,
        tags: [],
        errors: []
      };

      const result = enhancer.enhanceComment(testCase);

      expect(result).toContain("Executed:");
    });

    it("should truncate long comments", () => {
      enhancer = new CommentEnhancer({ maxCommentLength: 50 });

      const testCase: TestCaseInfo = {
        title: "Test with very long error message",
        status: "failed",
        duration: 1000,
        tags: [],
        errors: [
          {
            message:
              "This is a very long error message that should be truncated because it exceeds the maximum comment length configured for the enhancer",
            stack: "Long stack trace"
          }
        ]
      };

      const result = enhancer.enhanceComment(testCase);

      expect(result.length).toBeLessThanOrEqual(50);
      expect(result).toContain("... (truncated)");
    });
  });

  describe("formatDuration", () => {
    it("should format seconds", () => {
      const result = enhancer.formatDuration(1500);
      expect(result).toBe("1.5s");
    });

    it("should format minutes", () => {
      const result = enhancer.formatDuration(65000);
      expect(result).toBe("1.1m");
    });

    it("should format zero duration", () => {
      const result = enhancer.formatDuration(0);
      expect(result).toBe("0ms");
    });

    it("should format milliseconds", () => {
      const result = enhancer.formatDuration(500);
      expect(result).toBe("500ms");
    });
  });

  describe("truncateText", () => {
    it("should truncate long text", () => {
      const longText = "This is a very long text that should be truncated";
      const result = enhancer.truncateText(longText, 20);

      expect(result).toBe("This is a very long ...");
      expect(result.length).toBe(23); // 20 + "..."
    });

    it("should not truncate short text", () => {
      const shortText = "Short text";
      const result = enhancer.truncateText(shortText, 20);

      expect(result).toBe("Short text");
    });

    it("should use default max length", () => {
      const longText = "a".repeat(150);
      const result = enhancer.truncateText(longText);

      expect(result.length).toBe(103); // 100 + "..."
    });
  });

  describe("hasUsefulCallLog", () => {
    it("should detect useful call log with locator resolved", () => {
      const callLog = "locator resolved to <button>Click me</button>";
      const result = enhancer.hasUsefulCallLog(callLog);

      expect(result).toBe(true);
    });

    it("should detect useful call log with unexpected value", () => {
      const callLog = "unexpected value found in element";
      const result = enhancer.hasUsefulCallLog(callLog);

      expect(result).toBe(true);
    });

    it("should detect useful call log with waiting for", () => {
      const callLog = "waiting for element to be visible";
      const result = enhancer.hasUsefulCallLog(callLog);

      expect(result).toBe(true);
    });

    it("should not detect useless call log", () => {
      const callLog = "some generic log message";
      const result = enhancer.hasUsefulCallLog(callLog);

      expect(result).toBe(false);
    });
  });

  describe("formatFailedComment", () => {
    it("should format failed comment with error", () => {
      const testCase: TestCaseInfo = {
        title: "Failed test",
        status: "failed",
        duration: 2000,
        tags: [],
        errors: [
          {
            message: "Element not found: button",
            stack: "Error stack"
          }
        ]
      };

      const result = enhancer.formatFailedComment(testCase);

      expect(result).toContain("Status: Failed");
      expect(result).toContain("Duration: 2.0s");
      expect(result).toContain("Element not found: button");
    });

    it("should handle failed comment without errors", () => {
      const testCase: TestCaseInfo = {
        title: "Failed test",
        status: "failed",
        duration: 1000,
        tags: [],
        errors: []
      };

      const result = enhancer.formatFailedComment(testCase);

      expect(result).toContain("Status: Failed");
      expect(result).toContain("Duration: 1.0s");
    });
  });

  describe("formatPassedComment", () => {
    it("should format passed comment", () => {
      const result = enhancer.formatPassedComment(1500);

      expect(result).toContain("Status: Passed");
      expect(result).toContain("Duration: 1.5s");
      expect(result).toContain("Executed by Playwright");
    });
  });

  describe("formatTestResult", () => {
    it("should format test result for passed test", () => {
      const testCase: TestCaseInfo = {
        title: "Passed test",
        status: "passed",
        duration: 1000,
        tags: [],
        errors: []
      };

      const result = enhancer.formatTestResult(testCase);

      expect(result.status_id).toBe(1); // PASSED
      expect(result.status_name).toBe("Passed");
      expect(result.elapsed).toBe(1000);
      expect(result.elapsed_readable).toBe("1.0s");
      expect(result.comment).toContain("Status: Passed");
    });

    it("should format test result for failed test", () => {
      const testCase: TestCaseInfo = {
        title: "Failed test",
        status: "failed",
        duration: 2000,
        tags: [],
        errors: [{ message: "Test failed", stack: "Stack" }]
      };

      const result = enhancer.formatTestResult(testCase);

      expect(result.status_id).toBe(5); // FAILED
      expect(result.status_name).toBe("Failed");
      expect(result.elapsed).toBe(2000);
      expect(result.comment).toContain("Status: Failed");
    });
  });

  describe("createSimplePassedComment", () => {
    it("should create simple passed comment", () => {
      const testCase: TestCaseInfo = {
        title: "Test",
        status: "passed",
        duration: 1000,
        tags: [],
        errors: []
      };

      const result = enhancer.createSimplePassedComment(testCase);

      expect(result).toContain("Status: Passed");
      expect(result).toContain("Duration: 1.0s");
      expect(result).toContain("Executed by Playwright");
    });

    it("should use custom executed by text", () => {
      const testCase: TestCaseInfo = {
        title: "Test",
        status: "passed",
        duration: 1000,
        tags: [],
        errors: []
      };

      const result = enhancer.createSimplePassedComment(testCase, "Custom Execution");

      expect(result).toContain("Custom Execution");
    });

    it("should include custom prefix when configured", () => {
      enhancer = new CommentEnhancer({ customPrefix: "CI Pipeline" });

      const testCase: TestCaseInfo = {
        title: "Test",
        status: "passed",
        duration: 1000,
        tags: [],
        errors: []
      };

      const result = enhancer.createSimplePassedComment(testCase);

      expect(result).toContain("CI Pipeline");
    });
  });

  describe("updateConfig", () => {
    it("should update configuration", () => {
      enhancer.updateConfig({ customPrefix: "Updated Prefix" });

      const config = enhancer.getConfig();
      expect(config.customPrefix).toBe("Updated Prefix");
    });

    it("should merge with existing configuration", () => {
      enhancer.updateConfig({ includeTimestamp: true });
      enhancer.updateConfig({ customPrefix: "New Prefix" });

      const config = enhancer.getConfig();
      expect(config.includeTimestamp).toBe(true);
      expect(config.customPrefix).toBe("New Prefix");
    });
  });

  describe("getConfig", () => {
    it("should return current configuration", () => {
      const config = enhancer.getConfig();

      expect(config).toBeDefined();
      expect(typeof config.maxCommentLength).toBe("number");
      expect(typeof config.includeTimestamp).toBe("boolean");
    });

    it("should return copy of configuration", () => {
      const config1 = enhancer.getConfig();
      const config2 = enhancer.getConfig();

      expect(config1).not.toBe(config2); // Different objects
      expect(config1).toEqual(config2); // Same content
    });
  });
});
