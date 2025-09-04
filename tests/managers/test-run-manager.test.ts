import fs from "node:fs";
import { TestRailClient } from "../../src/api/testrail-client";
import { TestRunManager } from "../../src/managers/test-run-manager";
import type { TestResult } from "../../src/types";
import { TestRailError } from "../../src/utils/errors";

// Mock dependencies
jest.mock("node:fs");
jest.mock("../../src/api/testrail-client");

const mockFs = fs as jest.Mocked<typeof fs>;

describe("TestRunManager", () => {
  let manager: TestRunManager;
  let mockClient: jest.Mocked<TestRailClient>;
  const projectId = 123;
  const testRailDir = "testRail";

  beforeEach(() => {
    mockClient = new TestRailClient("host", "user", "pass") as jest.Mocked<TestRailClient>;
    manager = new TestRunManager(mockClient, projectId, testRailDir);
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with correct parameters", () => {
      expect(manager).toBeDefined();
    });

    it("should use default testRailDir when not provided", () => {
      const defaultManager = new TestRunManager(mockClient, projectId);
      expect(defaultManager).toBeDefined();
    });
  });

  describe("ensureTestRailSetup", () => {
    it("should create testRail directory if it does not exist", async () => {
      mockFs.existsSync.mockReturnValueOnce(false).mockReturnValueOnce(false);
      mockFs.mkdirSync.mockReturnValue(undefined as any);
      mockFs.writeFileSync.mockReturnValue(undefined);
      mockFs.unlinkSync.mockReturnValue(undefined);
      mockFs.statSync.mockReturnValue({ isDirectory: () => true } as any);

      await manager.ensureTestRailSetup();

      expect(mockFs.mkdirSync).toHaveBeenCalledWith(testRailDir);
    });

    it("should create empty JSON file if it does not exist", async () => {
      mockFs.existsSync.mockReturnValueOnce(true).mockReturnValueOnce(false);
      mockFs.writeFileSync.mockReturnValue(undefined);
      mockFs.unlinkSync.mockReturnValue(undefined);
      mockFs.statSync.mockReturnValue({ isDirectory: () => true } as any);

      await manager.ensureTestRailSetup();

      expect(mockFs.writeFileSync).toHaveBeenCalled();
    });

    it("should handle existing setup gracefully", async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('{"existingTestRunId": 123}');

      await expect(manager.ensureTestRailSetup()).resolves.not.toThrow();
    });
  });

  describe("loadTestRunFromJson", () => {
    it("should load existing test run data", async () => {
      const testRunData = {
        existingTestRunId: 456,
        caseIds: [1, 2, 3]
      };

      mockFs.readFileSync.mockReturnValue(JSON.stringify(testRunData));

      await manager.loadTestRunFromJson();

      expect(mockFs.readFileSync).toHaveBeenCalledWith(`${testRailDir}/testRunResult.json`, "utf-8");
    });

    it("should handle empty JSON file", async () => {
      mockFs.readFileSync.mockReturnValue("{}");

      await expect(manager.loadTestRunFromJson()).resolves.not.toThrow();
    });

    it("should handle corrupted JSON file", async () => {
      mockFs.readFileSync.mockReturnValue("invalid json");

      await expect(manager.loadTestRunFromJson()).rejects.toThrow();
    });
  });

  describe("resetTestRunJson", () => {
    it("should reset JSON file to empty object", async () => {
      mockFs.writeFileSync.mockReturnValue(undefined);
      mockFs.unlinkSync.mockReturnValue(undefined);
      mockFs.statSync.mockReturnValue({ isDirectory: () => true } as any);
      mockFs.existsSync.mockReturnValue(false);
      mockFs.renameSync.mockReturnValue(undefined);

      await manager.resetTestRunJson();

      // Check that writeFileSync was called with temp file containing empty object
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(expect.stringContaining(".tmp"), "{}");
    });
  });

  describe("writeTestRunJson", () => {
    it("should write test run data to JSON file", async () => {
      mockFs.writeFileSync.mockReturnValue(undefined);
      mockFs.unlinkSync.mockReturnValue(undefined);
      mockFs.statSync.mockReturnValue({ isDirectory: () => true } as any);
      mockFs.existsSync.mockReturnValue(false);

      await manager.writeTestRunJson();

      expect(mockFs.writeFileSync).toHaveBeenCalled();
    });
  });

  describe("setTestRunIdAndCaseId", () => {
    beforeEach(() => {
      // Mock file operations
      mockFs.existsSync.mockReturnValue(false);
      mockFs.writeFileSync.mockReturnValue(undefined);
      mockFs.unlinkSync.mockReturnValue(undefined);
      mockFs.statSync.mockReturnValue({ isDirectory: () => true } as any);
      mockFs.readFileSync.mockReturnValue("{}");

      // Mock client methods
      mockClient.addRun.mockResolvedValue({ id: 999 } as any);
      mockClient.getRun.mockResolvedValue({ statusCode: 200, is_completed: false });
    });

    it("should create new test run when none exists", async () => {
      const caseIds = [1, 2, 3];
      const runName = "Test Run";
      const userId = 1;

      await manager.setTestRunIdAndCaseId(runName, userId, caseIds);

      expect(mockClient.addRun).toHaveBeenCalledWith(
        projectId,
        expect.objectContaining({
          name: expect.stringContaining(runName),
          assignedto_id: userId,
          include_all: false
        })
      );
    });

    it("should handle existing valid test run", async () => {
      const existingRunData = {
        existingTestRunId: 456,
        caseIds: [1, 2]
      };

      // Mock the loadTestRunFromJson behavior
      mockFs.readFileSync.mockReturnValue(JSON.stringify(existingRunData));
      mockClient.getRun.mockResolvedValue({ statusCode: 200, is_completed: false });

      const caseIds = [1, 2, 3];
      await manager.setTestRunIdAndCaseId("Test Run", 1, caseIds);

      // The method should call getRun, but the exact ID depends on internal state
      expect(mockClient.getRun).toHaveBeenCalled();
    });

    it("should create new run if existing run is completed", async () => {
      const existingRunData = {
        existingTestRunId: 456,
        caseIds: [1, 2]
      };

      mockFs.readFileSync.mockReturnValue(JSON.stringify(existingRunData));
      mockClient.getRun.mockResolvedValue({ statusCode: 200, is_completed: true });

      await manager.setTestRunIdAndCaseId("Test Run", 1, [1, 2, 3]);

      expect(mockClient.addRun).toHaveBeenCalled();
    });
  });

  describe("getTestRunId", () => {
    it("should return test run ID", () => {
      const runId = manager.getTestRunId();
      expect(typeof runId).toBe("number");
    });
  });

  describe("getCaseIds", () => {
    it("should return case IDs array", () => {
      const caseIds = manager.getCaseIds();
      expect(Array.isArray(caseIds)).toBe(true);
    });
  });

  describe("updateRunAndAddResults", () => {
    beforeEach(() => {
      mockClient.updateRun.mockResolvedValue(undefined);
      mockClient.addResultsForCases.mockResolvedValue(undefined);
    });

    it("should update run and add test results", async () => {
      const testResults: TestResult[] = [
        { case_id: 1, status_id: 1, assignedto_id: 1, comment: "Passed", elapsed: 1000 },
        { case_id: 2, status_id: 5, assignedto_id: 1, comment: "Failed", elapsed: 2000 }
      ];

      await manager.updateRunAndAddResults(testResults);

      expect(mockClient.updateRun).toHaveBeenCalled();
      expect(mockClient.addResultsForCases).toHaveBeenCalledWith(expect.any(Number), testResults);
    });

    it("should throw error for empty test results", async () => {
      await expect(manager.updateRunAndAddResults([])).rejects.toThrow("Cannot update run with empty test results");
    });
  });

  describe("private method testing", () => {
    describe("checkDiskSpaceAndPermissions", () => {
      it("should pass when directory is writable", () => {
        mockFs.writeFileSync.mockReturnValue(undefined);
        mockFs.unlinkSync.mockReturnValue(undefined);
        mockFs.statSync.mockReturnValue({ isDirectory: () => true } as any);

        expect(() => {
          (manager as any).checkDiskSpaceAndPermissions(testRailDir, 1000);
        }).not.toThrow();
      });

      it("should throw TestRailError for permission denied", () => {
        const permissionError = new Error("Permission denied");
        (permissionError as any).code = "EACCES";
        mockFs.writeFileSync.mockImplementation(() => {
          throw permissionError;
        });

        expect(() => {
          (manager as any).checkDiskSpaceAndPermissions(testRailDir, 1000);
        }).toThrow(TestRailError);
      });

      it("should throw TestRailError for insufficient disk space", () => {
        const spaceError = new Error("No space left");
        (spaceError as any).code = "ENOSPC";
        mockFs.writeFileSync.mockImplementation(() => {
          throw spaceError;
        });

        expect(() => {
          (manager as any).checkDiskSpaceAndPermissions(testRailDir, 1000);
        }).toThrow(TestRailError);
      });
    });

    describe("writeJsonSafely", () => {
      beforeEach(() => {
        mockFs.writeFileSync.mockReturnValue(undefined);
        mockFs.unlinkSync.mockReturnValue(undefined);
        mockFs.statSync.mockReturnValue({ isDirectory: () => true } as any);
        mockFs.renameSync.mockReturnValue(undefined);
      });

      it("should write JSON data when no lock exists", async () => {
        mockFs.existsSync.mockReturnValue(false);

        const testData = { test: "data" };
        await (manager as any).writeJsonSafely("test.json", testData);

        expect(mockFs.writeFileSync).toHaveBeenCalledWith("test.json.lock", expect.stringContaining('"pid":'), {
          flag: "wx"
        });
      });

      it("should handle stale lock files", async () => {
        const staleLockInfo = {
          pid: 999,
          timestamp: Date.now() - 40000 // 40 seconds ago (stale)
        };

        mockFs.existsSync.mockReturnValueOnce(true).mockReturnValueOnce(false);
        mockFs.readFileSync.mockReturnValue(JSON.stringify(staleLockInfo));

        const testData = { test: "data" };
        await (manager as any).writeJsonSafely("test.json", testData);

        expect(mockFs.unlinkSync).toHaveBeenCalledWith("test.json.lock");
      });
    });
  });

  describe("error handling", () => {
    it("should handle client errors gracefully", async () => {
      mockClient.addRun.mockRejectedValue(new Error("API Error"));
      mockFs.existsSync.mockReturnValue(false);
      mockFs.writeFileSync.mockReturnValue(undefined);
      mockFs.readFileSync.mockReturnValue("{}");

      await expect(manager.setTestRunIdAndCaseId("Test", 1, [1])).rejects.toThrow("API Error");
    });

    it("should handle file system errors", async () => {
      mockFs.existsSync.mockImplementation(() => {
        throw new Error("FS Error");
      });

      await expect(manager.ensureTestRailSetup()).rejects.toThrow("FS Error");
    });
  });
});
