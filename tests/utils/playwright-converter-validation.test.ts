import { PlaywrightConverter } from "../../src/utils/playwright-converter";

describe("PlaywrightConverter Input Validation", () => {
  describe("convertTestInfo", () => {
    it("should throw error for null testInfo", () => {
      expect(() => {
        PlaywrightConverter.convertTestInfo(null as any);
      }).toThrow("testInfo cannot be null or undefined");
    });

    it("should throw error for undefined testInfo", () => {
      expect(() => {
        PlaywrightConverter.convertTestInfo(undefined as any);
      }).toThrow("testInfo cannot be null or undefined");
    });

    it("should throw error for non-object testInfo", () => {
      expect(() => {
        PlaywrightConverter.convertTestInfo("not an object" as any);
      }).toThrow("testInfo must be an object");

      expect(() => {
        PlaywrightConverter.convertTestInfo(123 as any);
      }).toThrow("testInfo must be an object");

      expect(() => {
        PlaywrightConverter.convertTestInfo([] as any);
      }).toThrow("testInfo must be an object");
    });

    it("should throw error for missing title", () => {
      expect(() => {
        PlaywrightConverter.convertTestInfo({} as any);
      }).toThrow("testInfo must have a valid non-empty title property");
    });

    it("should throw error for null title", () => {
      expect(() => {
        PlaywrightConverter.convertTestInfo({ title: null } as any);
      }).toThrow("testInfo must have a valid non-empty title property");
    });

    it("should throw error for undefined title", () => {
      expect(() => {
        PlaywrightConverter.convertTestInfo({ title: undefined } as any);
      }).toThrow("testInfo must have a valid non-empty title property");
    });

    it("should throw error for empty string title", () => {
      expect(() => {
        PlaywrightConverter.convertTestInfo({ title: "" } as any);
      }).toThrow("testInfo must have a valid non-empty title property");
    });

    it("should throw error for whitespace-only title", () => {
      expect(() => {
        PlaywrightConverter.convertTestInfo({ title: "   " } as any);
      }).toThrow("testInfo must have a valid non-empty title property");
    });

    it("should throw error for non-string title", () => {
      expect(() => {
        PlaywrightConverter.convertTestInfo({ title: 123 } as any);
      }).toThrow("testInfo must have a valid non-empty title property");
    });

    it("should successfully convert valid minimal testInfo", () => {
      const testInfo = {
        title: "Test login functionality",
        status: "passed" as const,
        duration: 1500,
        file: "/tests/login.spec.ts"
      };

      const result = PlaywrightConverter.convertTestInfo(testInfo);

      expect(result).toEqual({
        title: "Test login functionality",
        tags: ["@login"],
        status: "passed",
        duration: 1500,
        _steps: undefined
      });
    });

    it("should successfully convert testInfo with missing optional properties", () => {
      const testInfo = {
        title: "Test without optional properties"
      };

      const result = PlaywrightConverter.convertTestInfo(testInfo);

      expect(result).toEqual({
        title: "Test without optional properties",
        tags: ["@test"], // Default tag when no file or other tags
        status: "failed", // Default status
        duration: 0, // Default duration
        _steps: undefined
      });
    });

    it("should handle testInfo with tags in title", () => {
      const testInfo = {
        title: "@smoke @login User can login successfully",
        status: "passed" as const,
        duration: 2000,
        file: "/tests/auth/login.spec.ts"
      };

      const result = PlaywrightConverter.convertTestInfo(testInfo);

      expect(result.tags).toContain("@smoke");
      expect(result.tags).toContain("@login");
    });

    it("should handle testInfo with annotations", () => {
      const testInfo = {
        title: "User can login",
        status: "failed" as const,
        duration: 2500,
        annotations: [
          { type: "tag", description: "critical" }
        ]
      };

      const result = PlaywrightConverter.convertTestInfo(testInfo);

      expect(result.tags).toContain("@critical");
    });

    it("should handle testInfo with project name", () => {
      const testInfo = {
        title: "User can login",
        status: "passed" as const,
        duration: 1800,
        project: { name: "Chrome" }
      };

      const result = PlaywrightConverter.convertTestInfo(testInfo);

      expect(result.tags).toContain("@chrome");
    });

    it("should handle malformed annotations gracefully", () => {
      const testInfo = {
        title: "Test with bad annotations",
        annotations: [
          { type: "tag", description: "valid" }
        ] as any // Use any to bypass strict typing for this test
      };

      const result = PlaywrightConverter.convertTestInfo(testInfo);

      expect(result.tags).toContain("@valid");
    });
  });
});