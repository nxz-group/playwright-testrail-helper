import { Platform } from "../../src/utils/constants";
import { TestRailError } from "../../src/utils/errors";
import { ValidationUtils } from "../../src/utils/validation";

describe("ValidationUtils", () => {
  describe("validateEmail", () => {
    it("should pass for valid email", () => {
      expect(() => ValidationUtils.validateEmail("test@example.com")).not.toThrow();
    });

    it("should throw for invalid email", () => {
      expect(() => ValidationUtils.validateEmail("invalid")).toThrow(TestRailError);
      expect(() => ValidationUtils.validateEmail("")).toThrow(TestRailError);
    });
  });

  describe("validateRunName", () => {
    it("should pass for valid run name", () => {
      expect(() => ValidationUtils.validateRunName("Test Run")).not.toThrow();
    });

    it("should throw for empty run name", () => {
      expect(() => ValidationUtils.validateRunName("")).toThrow(TestRailError);
      expect(() => ValidationUtils.validateRunName("   ")).toThrow(TestRailError);
    });
  });

  describe("validateSectionId", () => {
    it("should pass for valid section ID", () => {
      expect(() => ValidationUtils.validateSectionId(123)).not.toThrow();
    });

    it("should throw for invalid section ID", () => {
      expect(() => ValidationUtils.validateSectionId(0)).toThrow(TestRailError);
      expect(() => ValidationUtils.validateSectionId(-1)).toThrow(TestRailError);
    });
  });

  describe("validateProjectId", () => {
    it("should pass for valid project ID", () => {
      expect(() => ValidationUtils.validateProjectId(456)).not.toThrow();
    });

    it("should throw for invalid project ID", () => {
      expect(() => ValidationUtils.validateProjectId(0)).toThrow(TestRailError);
      expect(() => ValidationUtils.validateProjectId(-1)).toThrow(TestRailError);
    });
  });

  describe("validatePlatformId", () => {
    it("should pass for valid platform ID", () => {
      expect(() => ValidationUtils.validatePlatformId(Platform.API)).not.toThrow();
      expect(() => ValidationUtils.validatePlatformId(Platform.WEB_DESKTOP)).not.toThrow();
    });

    it("should throw for invalid platform ID", () => {
      expect(() => ValidationUtils.validatePlatformId(999)).toThrow(TestRailError);
    });
  });

  describe("validateCaseId", () => {
    it("should pass for valid case ID", () => {
      expect(() => ValidationUtils.validateCaseId(789)).not.toThrow();
    });

    it("should throw for invalid case ID", () => {
      expect(() => ValidationUtils.validateCaseId(0)).toThrow(TestRailError);
      expect(() => ValidationUtils.validateCaseId(-1)).toThrow(TestRailError);
    });
  });

  describe("validateTestList", () => {
    it("should pass for valid test list", () => {
      expect(() => ValidationUtils.validateTestList([])).not.toThrow();
      expect(() => ValidationUtils.validateTestList([{}])).not.toThrow();
    });

    it("should throw for invalid test list", () => {
      expect(() => ValidationUtils.validateTestList(null)).toThrow(TestRailError);
      expect(() => ValidationUtils.validateTestList("not array")).toThrow(TestRailError);
    });
  });

  describe("validateTestCase", () => {
    const validTestCase = {
      title: "Test Case",
      status: "passed" as const,
      duration: 1000
    };

    it("should pass for valid test case", () => {
      expect(() => ValidationUtils.validateTestCase(validTestCase)).not.toThrow();
    });

    it("should throw for missing title", () => {
      expect(() => ValidationUtils.validateTestCase({ ...validTestCase, title: "" })).toThrow(TestRailError);
    });

    it("should throw for invalid status", () => {
      expect(() => ValidationUtils.validateTestCase({ ...validTestCase, status: "invalid" })).toThrow(TestRailError);
    });

    it("should throw for invalid duration", () => {
      expect(() => ValidationUtils.validateTestCase({ ...validTestCase, duration: -1 })).toThrow(TestRailError);
    });
  });

  describe("validateTestCaseData", () => {
    it("should pass for valid test case data", () => {
      expect(() => ValidationUtils.validateTestCaseData({ title: "Test" })).not.toThrow();
    });

    it("should throw for missing title", () => {
      expect(() => ValidationUtils.validateTestCaseData({} as any)).toThrow(TestRailError);
      expect(() => ValidationUtils.validateTestCaseData({ title: "" })).toThrow(TestRailError);
    });
  });
});
