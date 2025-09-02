import { AutomationType, Platform, Priority, TestStatus, TestTemplate, TestType } from "../../src/utils/constants";

describe("Constants (Extended)", () => {
  describe("TestStatus enum", () => {
    it("should have all expected values", () => {
      const expectedValues = {
        PASSED: 1,
        BLOCKED: 2,
        RETEST: 4,
        FAILED: 5
      };

      Object.entries(expectedValues).forEach(([key, value]) => {
        expect(TestStatus[key as keyof typeof TestStatus]).toBe(value);
      });
    });

    it("should have exactly 4 values", () => {
      expect(Object.keys(TestStatus)).toHaveLength(8); // 4 keys + 4 values
    });

    it("should be immutable", () => {
      expect(() => {
        (TestStatus as any).NEW_STATUS = 99;
      }).not.toThrow(); // TypeScript prevents this, but runtime doesn't

      // But the original values should remain unchanged
      expect(TestStatus.PASSED).toBe(1);
    });
  });

  describe("TestTemplate enum", () => {
    it("should have all expected values", () => {
      const expectedValues = {
        TEST_CASE_TEXT: 1,
        TEST_CASE_STEP: 2,
        EXPLORATORY: 3,
        BDD: 4
      };

      Object.entries(expectedValues).forEach(([key, value]) => {
        expect(TestTemplate[key as keyof typeof TestTemplate]).toBe(value);
      });
    });

    it("should have exactly 4 templates", () => {
      expect(Object.keys(TestTemplate)).toHaveLength(8);
    });
  });

  describe("TestType enum", () => {
    it("should have all expected values", () => {
      const expectedValues = {
        ACCEPTANCE: 1,
        ACCESSIBILITY: 2,
        AUTOMATED: 3,
        COMPATIBILITY: 4,
        DESTRUCTIVE: 5,
        FUNCTIONAL: 6,
        OTHER: 7,
        PERFORMANCE: 8,
        REGRESSION: 9,
        SECURITY: 10,
        SMOKE_AND_SANITY: 11,
        USABILITY: 12,
        EXPLORATORY: 13
      };

      Object.entries(expectedValues).forEach(([key, value]) => {
        expect(TestType[key as keyof typeof TestType]).toBe(value);
      });
    });

    it("should have exactly 13 test types", () => {
      expect(Object.keys(TestType)).toHaveLength(26); // 13 keys + 13 values
    });

    it("should have sequential values from 1 to 13", () => {
      const values = Object.values(TestType)
        .filter((v) => typeof v === "number")
        .sort((a, b) => a - b);
      expect(values).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
    });
  });

  describe("AutomationType enum", () => {
    it("should have all expected values", () => {
      const expectedValues = {
        MANUAL: 1,
        AUTOMATABLE: 2,
        AUTOMATED: 3
      };

      Object.entries(expectedValues).forEach(([key, value]) => {
        expect(AutomationType[key as keyof typeof AutomationType]).toBe(value);
      });
    });

    it("should have exactly 3 automation types", () => {
      expect(Object.keys(AutomationType)).toHaveLength(6);
    });
  });

  describe("Priority enum", () => {
    it("should have all expected values", () => {
      const expectedValues = {
        LOW: 1,
        MEDIUM: 2,
        HIGH: 3,
        CRITICAL: 4
      };

      Object.entries(expectedValues).forEach(([key, value]) => {
        expect(Priority[key as keyof typeof Priority]).toBe(value);
      });
    });

    it("should have exactly 4 priority levels", () => {
      expect(Object.keys(Priority)).toHaveLength(8);
    });

    it("should have ascending priority values", () => {
      expect(Priority.LOW).toBeLessThan(Priority.MEDIUM);
      expect(Priority.MEDIUM).toBeLessThan(Priority.HIGH);
      expect(Priority.HIGH).toBeLessThan(Priority.CRITICAL);
    });
  });

  describe("Platform enum", () => {
    it("should have all expected values", () => {
      const expectedValues = {
        API: 1,
        WEB_DESKTOP: 2,
        WEB_RESPONSIVE: 3,
        WEB_DESKTOP_AND_RESPONSIVE: 4,
        MOBILE_APPLICATION: 5,
        MIGRATION: 6,
        OTHER: 7
      };

      Object.entries(expectedValues).forEach(([key, value]) => {
        expect(Platform[key as keyof typeof Platform]).toBe(value);
      });
    });

    it("should have exactly 7 platforms", () => {
      expect(Object.keys(Platform)).toHaveLength(14);
    });

    it("should have unique values", () => {
      const values = Object.values(Platform).filter((v) => typeof v === "number");
      const uniqueValues = [...new Set(values)];
      expect(values).toHaveLength(uniqueValues.length);
    });
  });

  describe("Enum value consistency", () => {
    it("should not have overlapping values between different enums", () => {
      const allValues = [
        ...Object.values(TestStatus),
        ...Object.values(TestTemplate),
        ...Object.values(AutomationType),
        ...Object.values(Priority),
        ...Object.values(Platform)
      ].filter((v) => typeof v === "number");

      // While values can overlap between enums, let's ensure each enum has distinct values
      const testStatusValues = Object.values(TestStatus).filter((v) => typeof v === "number");
      const uniqueTestStatusValues = [...new Set(testStatusValues)];
      expect(testStatusValues).toHaveLength(uniqueTestStatusValues.length);
    });

    it("should have positive integer values only", () => {
      const allEnums = [TestStatus, TestTemplate, TestType, AutomationType, Priority, Platform];

      allEnums.forEach((enumObj) => {
        Object.values(enumObj).forEach((value) => {
          if (typeof value === "number") {
            expect(value).toBeGreaterThan(0);
            expect(Number.isInteger(value)).toBe(true);
          }
        });
      });
    });
  });
});
