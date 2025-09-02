import { CommentEnhancer } from "../../src/utils/comment-enhancer";

describe("CommentEnhancer", () => {
  let enhancer: CommentEnhancer;

  beforeEach(() => {
    enhancer = new CommentEnhancer();
  });

  describe("enhanceComment", () => {
    it("should enhance passed test comment", () => {
      const testCase = {
        title: "Login test",
        tags: ["@smoke"],
        status: "passed" as const,
        duration: 1000
      };

      const result = enhancer.enhanceComment(testCase);

      expect(result).toContain("Status: Passed");
      expect(result).toContain("1.0s");
      expect(result).toContain("Executed by Playwright");
    });

    it("should enhance failed test comment", () => {
      const testCase = {
        title: "Failed test",
        tags: ["@regression"],
        status: "failed" as const,
        duration: 2000,
        errors: [{ message: "Assertion failed" }]
      };

      const result = enhancer.enhanceComment(testCase);

      expect(result).toContain("Status: Failed");
      expect(result).toContain("Assertion failed");
      expect(result).toContain("2.0s");
    });

    it("should handle skipped test", () => {
      const testCase = {
        title: "Skipped test",
        tags: [],
        status: "skipped" as const,
        duration: 0
      };

      const result = enhancer.enhanceComment(testCase);

      expect(result).toContain("Status: skipped");
      expect(result).toContain("⏭️ Test Skipped");
    });

    it("should handle interrupted test", () => {
      const testCase = {
        title: "Interrupted test",
        tags: [],
        status: "interrupted" as const,
        duration: 500
      };

      const result = enhancer.enhanceComment(testCase);

      expect(result).toContain("Status: interrupted");
    });

    it("should handle timeout test", () => {
      const testCase = {
        title: "Timeout test",
        tags: [],
        status: "timeOut" as const,
        duration: 30000
      };

      const result = enhancer.enhanceComment(testCase);

      expect(result).toContain("Status: timeOut");
    });
  });

  describe("formatDuration", () => {
    it("should format seconds", () => {
      expect(enhancer.formatDuration(1500)).toBe("1.5s");
    });

    it("should format minutes", () => {
      expect(enhancer.formatDuration(125000)).toBe("2.1m");
    });

    it("should format zero duration", () => {
      expect(enhancer.formatDuration(0)).toBe("0ms");
    });
  });
});
