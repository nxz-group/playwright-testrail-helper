import type {
  APIResponse,
  TestCaseData,
  TestCaseInfo,
  TestRailConfig,
  TestResult,
  TestRunInfo,
  TestStep
} from "../../src/types";

describe("Type Definitions", () => {
  describe("TestCaseInfo", () => {
    it("should accept valid test case info", () => {
      const testCase: TestCaseInfo = {
        title: "Test case",
        tags: ["@smoke"],
        status: "passed",
        duration: 1000
      };

      expect(testCase.title).toBe("Test case");
      expect(testCase.status).toBe("passed");
    });

    it("should accept test case with errors", () => {
      const testCase: TestCaseInfo = {
        title: "Failed test",
        tags: ["@regression"],
        status: "failed",
        duration: 2000,
        errors: [
          {
            message: "Assertion failed",
            stack: "Error stack trace"
          }
        ]
      };

      expect(testCase.errors).toHaveLength(1);
      expect(testCase.errors?.[0].message).toBe("Assertion failed");
    });
  });

  describe("TestStep", () => {
    it("should accept valid test step", () => {
      const step: TestStep = {
        category: "action",
        title: "Click button"
      };

      expect(step.category).toBe("action");
      expect(step.title).toBe("Click button");
    });

    it("should accept test step with error", () => {
      const step: TestStep = {
        category: "assertion",
        title: "Verify element",
        error: { message: "Element not found" }
      };

      expect(step.error?.message).toBe("Element not found");
    });
  });

  describe("TestRailConfig", () => {
    it("should accept valid configuration", () => {
      const config: TestRailConfig = {
        host: "https://test.testrail.io",
        username: "user@test.com",
        password: "password",
        projectId: 123
      };

      expect(config.host).toBe("https://test.testrail.io");
      expect(config.projectId).toBe(123);
    });
  });

  describe("TestResult", () => {
    it("should accept valid test result", () => {
      const result: TestResult = {
        case_id: 456,
        status_id: 1,
        assignedto_id: 789,
        comment: "Test passed",
        elapsed: 1500
      };

      expect(result.case_id).toBe(456);
      expect(result.status_id).toBe(1);
    });
  });

  describe("TestRunInfo", () => {
    it("should accept valid test run info", () => {
      const runInfo: TestRunInfo = {
        name: "Test Run",
        assignedto_id: 123,
        include_all: false,
        case_ids: [1, 2, 3]
      };

      expect(runInfo.name).toBe("Test Run");
      expect(runInfo.include_all).toBe(false);
    });
  });

  describe("APIResponse", () => {
    it("should accept valid API response", () => {
      const response: APIResponse = {
        statusCode: 200,
        body: { success: true }
      };

      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({ success: true });
    });
  });

  describe("TestCaseData", () => {
    it("should accept valid test case data", () => {
      const caseData: TestCaseData = {
        title: "New test case",
        section_id: 123,
        custom_case_custom_automation_type: 3,
        template_id: 1,
        type_id: 6,
        custom_case_custom_platform: 2,
        priority_id: 2,
        custom_steps_separated: [
          {
            content: "Step 1",
            expected: "Expected result 1"
          }
        ],
        assignedto_id: 456
      };

      expect(caseData.title).toBe("New test case");
      expect(caseData.section_id).toBe(123);
      expect(caseData.custom_steps_separated).toHaveLength(1);
    });
  });
});
