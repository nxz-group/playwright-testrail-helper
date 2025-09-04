import { TestRailClient } from "../../src/api/testrail-client";
import { TestCaseManager } from "../../src/managers/test-case-manager";
import type { TestCaseInfo } from "../../src/types";
import { TestStatus } from "../../src/utils/constants";

// Mock dependencies
jest.mock("../../src/api/testrail-client");
jest.mock("../../src/utils/comment-enhancer", () => ({
  CommentEnhancer: jest.fn().mockImplementation(() => ({
    formatPassedComment: jest.fn().mockReturnValue("Test passed"),
    formatFailedComment: jest.fn().mockReturnValue("Test failed"),
    enhanceComment: jest.fn().mockReturnValue("Test comment")
  }))
}));

describe("TestCaseManager", () => {
  let manager: TestCaseManager;
  let mockClient: jest.Mocked<TestRailClient>;

  beforeEach(() => {
    mockClient = new TestRailClient("host", "user", "pass") as jest.Mocked<TestRailClient>;
    manager = new TestCaseManager(mockClient);
  });

  describe("constructor", () => {
    it("should initialize with default executed text", () => {
      expect(manager).toBeDefined();
    });

    it("should initialize with custom executed text", () => {
      const customManager = new TestCaseManager(mockClient, "Custom Execution");
      expect(customManager).toBeDefined();
    });
  });

  describe("createTestResult", () => {
    it("should create test result for passed test", () => {
      const mockTestCase: TestCaseInfo = {
        title: "Test Case",
        status: "passed",
        duration: 5000,
        tags: [],
        errors: []
      };

      const result = manager.createTestResult(mockTestCase, 123, 1);

      expect(result).toEqual({
        case_id: 123,
        status_id: TestStatus.PASSED,
        assignedto_id: 1,
        comment: "Test passed",
        elapsed: 5000
      });
    });

    it("should create test result for failed test", () => {
      const failedTest: TestCaseInfo = {
        title: "Test Case",
        status: "failed",
        duration: 5000,
        tags: [],
        errors: [{ message: "Test failed", stack: "Error stack" }]
      };

      const result = manager.createTestResult(failedTest, 123, 1);

      expect(result).toEqual({
        case_id: 123,
        status_id: TestStatus.FAILED,
        assignedto_id: 1,
        comment: "Test failed",
        elapsed: 5000
      });
    });

    it("should return null for skipped test", () => {
      const skippedTest: TestCaseInfo = {
        title: "Test Case",
        status: "skipped",
        duration: 0,
        tags: [],
        errors: []
      };

      const result = manager.createTestResult(skippedTest, 123, 1);
      expect(result).toBeNull();
    });

    it("should handle timeout status", () => {
      const timeoutTest: TestCaseInfo = {
        title: "Test Case",
        status: "timeOut",
        duration: 30000,
        tags: [],
        errors: []
      };

      const result = manager.createTestResult(timeoutTest, 123, 1);
      expect(result?.status_id).toBe(TestStatus.FAILED);
      expect(result?.comment).toBe("Test comment");
    });
  });

  describe("syncTestCase", () => {
    const mockTestCase: TestCaseInfo = {
      title: "New Test Case",
      status: "passed",
      duration: 1000,
      tags: ["smoke", "api"],
      errors: []
    };

    it("should return existing case ID if found", async () => {
      const existingCases = [
        { id: 1, title: "New Test Case" },
        { id: 2, title: "Another Test" }
      ];

      const result = await manager.syncTestCase(1, 2, mockTestCase, existingCases, 1);
      expect(result).toBe(1);
    });

    it("should create new case if not found", async () => {
      const mockExistingCases = [
        { id: 1, title: "Existing Test" },
        { id: 2, title: "Another Test" }
      ];

      mockClient.addCase.mockResolvedValue(123);

      const result = await manager.syncTestCase(1, 2, mockTestCase, mockExistingCases, 1);

      expect(result).toBe(123);
      expect(mockClient.addCase).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          title: "New Test Case",
          section_id: 1,
          assignedto_id: 1
        })
      );
    });
  });

  describe("error handling", () => {
    it("should handle client errors gracefully", async () => {
      const mockTestCase: TestCaseInfo = {
        title: "Test",
        status: "passed",
        duration: 1000,
        tags: [],
        errors: []
      };

      mockClient.addCase.mockRejectedValue(new Error("API Error"));

      await expect(manager.syncTestCase(1, 2, mockTestCase, [], 1)).rejects.toThrow("API Error");
    });
  });
});
