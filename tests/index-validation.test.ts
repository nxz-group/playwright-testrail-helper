import TestRailHelper from "../src/index";

// Mock environment variables
process.env.TEST_RAIL_HOST = "https://example.testrail.io";
process.env.TEST_RAIL_USERNAME = "test@example.com";
process.env.TEST_RAIL_PASSWORD = "password";
process.env.TEST_RAIL_PROJECT_ID = "1";

describe("TestRailHelper Input Validation", () => {
  let helper: TestRailHelper;

  beforeEach(() => {
    helper = new TestRailHelper();
  });

  describe("updateTestResultSingle", () => {
    it("should throw error when testInfo is an array", async () => {
      await expect(
        helper.updateTestResultSingle("Test Run", 123, 1, [])
      ).rejects.toThrow("testInfo cannot be an array. Use updateTestResult() for arrays of test objects.");
    });

    it("should throw error when testInfo is null", async () => {
      await expect(
        helper.updateTestResultSingle("Test Run", 123, 1, null)
      ).rejects.toThrow("Invalid testInfo at index 0: testInfo cannot be null or undefined");
    });

    it("should throw error when testInfo is undefined", async () => {
      await expect(
        helper.updateTestResultSingle("Test Run", 123, 1, undefined)
      ).rejects.toThrow("Invalid testInfo at index 0: testInfo cannot be null or undefined");
    });

    it("should throw error when testInfo has no title", async () => {
      await expect(
        helper.updateTestResultSingle("Test Run", 123, 1, {})
      ).rejects.toThrow("Invalid testInfo at index 0: testInfo must have a valid non-empty title property");
    });

    it("should throw error when testInfo has empty title", async () => {
      await expect(
        helper.updateTestResultSingle("Test Run", 123, 1, { title: "" })
      ).rejects.toThrow("Invalid testInfo at index 0: testInfo must have a valid non-empty title property");
    });
  });

  describe("updateTestResult", () => {
    it("should throw error when testInfos is not an array", async () => {
      await expect(
        helper.updateTestResult("Test Run", 123, 1, {} as any)
      ).rejects.toThrow("testInfos must be an array. Use updateTestResultSingle() for single test objects.");
    });

    it("should handle empty array gracefully", async () => {
      // Empty array should be handled gracefully and return without error
      await expect(
        helper.updateTestResult("Test Run", 123, 1, [])
      ).resolves.toBeUndefined();
    });

    it("should throw error with index information for invalid testInfo in array", async () => {
      const testInfos = [
        { title: "Valid test", status: "passed", duration: 1000 },
        {}, // Invalid - no title
        { title: "Another valid test", status: "failed", duration: 2000 }
      ];

      await expect(
        helper.updateTestResult("Test Run", 123, 1, testInfos)
      ).rejects.toThrow("Invalid testInfo at index 1: testInfo must have a valid non-empty title property");
    });

    it("should handle mixed valid and invalid testInfos", async () => {
      const testInfos = [
        { title: "Valid test 1", status: "passed", duration: 1000 },
        null, // Invalid
        { title: "Valid test 2", status: "failed", duration: 2000 }
      ];

      await expect(
        helper.updateTestResult("Test Run", 123, 1, testInfos)
      ).rejects.toThrow("Invalid testInfo at index 1: testInfo cannot be null or undefined");
    });
  });
});