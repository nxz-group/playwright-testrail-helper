import { AutomationType, Platform, Priority, TestStatus, TestTemplate, TestType } from "../../src/utils/constants";

describe("Constants", () => {
  describe("TestStatus", () => {
    it("should have correct values", () => {
      expect(TestStatus.PASSED).toBe(1);
      expect(TestStatus.BLOCKED).toBe(2);
      expect(TestStatus.RETEST).toBe(4);
      expect(TestStatus.FAILED).toBe(5);
    });
  });

  describe("TestTemplate", () => {
    it("should have correct values", () => {
      expect(TestTemplate.TEST_CASE_TEXT).toBe(1);
      expect(TestTemplate.TEST_CASE_STEP).toBe(2);
      expect(TestTemplate.EXPLORATORY).toBe(3);
      expect(TestTemplate.BDD).toBe(4);
    });
  });

  describe("TestType", () => {
    it("should have correct values", () => {
      expect(TestType.ACCEPTANCE).toBe(1);
      expect(TestType.ACCESSIBILITY).toBe(2);
      expect(TestType.AUTOMATED).toBe(3);
      expect(TestType.FUNCTIONAL).toBe(6);
      expect(TestType.EXPLORATORY).toBe(13);
    });
  });

  describe("AutomationType", () => {
    it("should have correct values", () => {
      expect(AutomationType.MANUAL).toBe(1);
      expect(AutomationType.AUTOMATABLE).toBe(2);
      expect(AutomationType.AUTOMATED).toBe(3);
    });
  });

  describe("Priority", () => {
    it("should have correct values", () => {
      expect(Priority.LOW).toBe(1);
      expect(Priority.MEDIUM).toBe(2);
      expect(Priority.HIGH).toBe(3);
      expect(Priority.CRITICAL).toBe(4);
    });
  });

  describe("Platform", () => {
    it("should have correct values", () => {
      expect(Platform.API).toBe(1);
      expect(Platform.WEB_DESKTOP).toBe(2);
      expect(Platform.WEB_RESPONSIVE).toBe(3);
      expect(Platform.MOBILE_APPLICATION).toBe(5);
      expect(Platform.OTHER).toBe(7);
    });
  });
});
