import { Platform } from "../../src/utils/constants";
import { TestRailError } from "../../src/utils/errors";
import {
  validateCaseId,
  validateEmail,
  validatePlatformId,
  validateProjectId,
  validateRunName,
  validateSectionId,
  validateTestCase,
  validateTestCaseData,
  validateTestList
} from "../../src/utils/validation";

describe("Validation Functions (Extended)", () => {
  describe("validateEmail", () => {
    const validEmails = [
      "test@example.com",
      "user.name@domain.co.uk",
      "test+tag@example.org",
      "user123@test-domain.com"
    ];

    const invalidEmails = ["", "invalid", "test.domain.com", null, undefined];

    validEmails.forEach((email) => {
      it(`should pass for valid email: ${email}`, () => {
        expect(() => validateEmail(email)).not.toThrow();
      });
    });

    invalidEmails.forEach((email) => {
      it(`should throw for invalid email: ${email}`, () => {
        expect(() => validateEmail(email as any)).toThrow(TestRailError);
      });
    });
  });

  describe("validateRunName", () => {
    const validRunNames = [
      "Test Run",
      "Regression Suite 2023",
      "API Tests - v1.2.3",
      "Smoke Tests (Production)",
      "a" // single character
    ];

    const invalidRunNames = ["", "   ", "\t\n", null, undefined];

    validRunNames.forEach((name) => {
      it(`should pass for valid run name: "${name}"`, () => {
        expect(() => validateRunName(name)).not.toThrow();
      });
    });

    invalidRunNames.forEach((name) => {
      it(`should throw for invalid run name: "${name}"`, () => {
        expect(() => validateRunName(name as any)).toThrow(TestRailError);
      });
    });
  });

  describe("validateSectionId", () => {
    const validSectionIds = [1, 100, 999999];
    const invalidSectionIds = [0, -1, -100];

    validSectionIds.forEach((id) => {
      it(`should pass for valid section ID: ${id}`, () => {
        expect(() => validateSectionId(id)).not.toThrow();
      });
    });

    invalidSectionIds.forEach((id) => {
      it(`should throw for invalid section ID: ${id}`, () => {
        expect(() => validateSectionId(id)).toThrow(TestRailError);
      });
    });
  });

  describe("validateProjectId", () => {
    const validProjectIds = [1, 50, 123456];
    const invalidProjectIds = [0, -1, -999];

    validProjectIds.forEach((id) => {
      it(`should pass for valid project ID: ${id}`, () => {
        expect(() => validateProjectId(id)).not.toThrow();
      });
    });

    invalidProjectIds.forEach((id) => {
      it(`should throw for invalid project ID: ${id}`, () => {
        expect(() => validateProjectId(id)).toThrow(TestRailError);
      });
    });
  });

  describe("validatePlatformId", () => {
    const validPlatformIds = Object.values(Platform).filter((v) => typeof v === "number") as number[];
    const invalidPlatformIds = [0, 8, 999, -1];

    validPlatformIds.forEach((id) => {
      it(`should pass for valid platform ID: ${id}`, () => {
        expect(() => validatePlatformId(id)).not.toThrow();
      });
    });

    invalidPlatformIds.forEach((id) => {
      it(`should throw for invalid platform ID: ${id}`, () => {
        expect(() => validatePlatformId(id)).toThrow(TestRailError);
        expect(() => validatePlatformId(id)).toThrow(/Invalid platform ID/);
      });
    });
  });

  describe("validateCaseId", () => {
    const validCaseIds = [1, 42, 999999];
    const invalidCaseIds = [0, -1, -100];

    validCaseIds.forEach((id) => {
      it(`should pass for valid case ID: ${id}`, () => {
        expect(() => validateCaseId(id)).not.toThrow();
      });
    });

    invalidCaseIds.forEach((id) => {
      it(`should throw for invalid case ID: ${id}`, () => {
        expect(() => validateCaseId(id)).toThrow(TestRailError);
      });
    });
  });

  describe("validateTestList", () => {
    const validTestLists = [[], [{}], [{ title: "test" }], new Array(100).fill({ title: "test" })];

    const invalidTestLists = [null, undefined, "not an array", 123, {}];

    validTestLists.forEach((list, index) => {
      it(`should pass for valid test list ${index}`, () => {
        expect(() => validateTestList(list)).not.toThrow();
      });
    });

    invalidTestLists.forEach((list, index) => {
      it(`should throw for invalid test list ${index}`, () => {
        expect(() => validateTestList(list)).toThrow(TestRailError);
      });
    });
  });

  describe("validateTestCase", () => {
    const baseValidTestCase = {
      title: "Valid Test Case",
      status: "passed" as const,
      duration: 1000
    };

    const validTestCases = [
      baseValidTestCase,
      { ...baseValidTestCase, status: "failed" as const },
      { ...baseValidTestCase, status: "skipped" as const },
      { ...baseValidTestCase, status: "interrupted" as const },
      { ...baseValidTestCase, status: "timeOut" as const },
      { ...baseValidTestCase, duration: 0 },
      { ...baseValidTestCase, duration: 999999 }
    ];

    const invalidTestCases = [
      { ...baseValidTestCase, title: "" },
      { ...baseValidTestCase, title: null },
      { ...baseValidTestCase, title: 123 },
      { ...baseValidTestCase, status: "invalid" },
      { ...baseValidTestCase, status: null },
      { ...baseValidTestCase, duration: -1 },
      { ...baseValidTestCase, duration: "invalid" },
      { title: "Test", status: "passed" }, // missing duration
      { title: "Test", duration: 1000 }, // missing status
      { status: "passed", duration: 1000 } // missing title
    ];

    validTestCases.forEach((testCase, index) => {
      it(`should pass for valid test case ${index}`, () => {
        expect(() => validateTestCase(testCase)).not.toThrow();
      });
    });

    invalidTestCases.forEach((testCase, index) => {
      it(`should throw for invalid test case ${index}`, () => {
        expect(() => validateTestCase(testCase as any)).toThrow(TestRailError);
      });
    });
  });

  describe("validateTestCaseData", () => {
    const validTestCaseData = [
      { title: "Test Case" },
      { title: "Test Case", description: "Description" },
      { title: "Test Case", customField: "value" }
    ];

    const invalidTestCaseData = [
      {},
      { title: "" },
      { title: null },
      { title: undefined },
      { description: "No title" },
      null,
      undefined
    ];

    validTestCaseData.forEach((data, index) => {
      it(`should pass for valid test case data ${index}`, () => {
        expect(() => validateTestCaseData(data)).not.toThrow();
      });
    });

    invalidTestCaseData.forEach((data, index) => {
      it(`should throw for invalid test case data ${index}`, () => {
        expect(() => validateTestCaseData(data as any)).toThrow(TestRailError);
      });
    });
  });
});
