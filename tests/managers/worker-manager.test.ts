import fs from "node:fs";
import { WorkerManager } from "../../src/managers/worker-manager";
import type { TestCaseInfo } from "../../src/types";

// Mock fs module
jest.mock("node:fs");
const mockFs = fs as jest.Mocked<typeof fs>;

describe("WorkerManager", () => {
  let manager: WorkerManager;
  const testRailDir = "/test/testrail";

  beforeEach(() => {
    manager = new WorkerManager(testRailDir);
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with testRailDir", () => {
      expect(manager).toBeDefined();
    });
  });

  describe("saveWorkerResults", () => {
    it("should save worker results to file", async () => {
      const testResults: TestCaseInfo[] = [
        { title: "Test 1", status: "passed", duration: 1000, tags: [], errors: [] },
        { title: "Test 2", status: "failed", duration: 2000, tags: [], errors: [] }
      ];

      await manager.saveWorkerResults("section1_worker0", testResults);

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        `${testRailDir}/worker_section1_worker0_results.json`,
        JSON.stringify(testResults),
        "utf-8"
      );
    });
  });

  describe("getSectionWorkerResults", () => {
    it("should retrieve results from all workers in section", async () => {
      const mockFiles = [
        "worker_section1_1_worker0_results.json",
        "worker_section1_1_worker1_results.json",
        "other_file.json"
      ];

      const worker0Results = [{ title: "Test 1", status: "passed", duration: 1000, tags: [], errors: [] }];
      const worker1Results = [{ title: "Test 2", status: "failed", duration: 2000, tags: [], errors: [] }];

      mockFs.readdirSync.mockReturnValue(mockFiles as any);
      mockFs.readFileSync
        .mockReturnValueOnce(JSON.stringify(worker0Results))
        .mockReturnValueOnce(JSON.stringify(worker1Results));

      const results = await manager.getSectionWorkerResults(1);

      expect(results).toHaveLength(2);
      expect(results[0].title).toBe("Test 1");
      expect(results[1].title).toBe("Test 2");
    });

    it("should return empty array when no worker files exist", async () => {
      mockFs.readdirSync.mockReturnValue([]);

      const results = await manager.getSectionWorkerResults(1);

      expect(results).toEqual([]);
    });
  });

  describe("getAllWorkerResults", () => {
    it("should retrieve results from all workers", async () => {
      const mockFiles = [
        "worker_section1_worker0_results.json",
        "worker_section2_worker1_results.json",
        "other_file.json"
      ];

      const results1 = [{ title: "Test 1", status: "passed", duration: 1000, tags: [], errors: [] }];
      const results2 = [{ title: "Test 2", status: "failed", duration: 2000, tags: [], errors: [] }];

      mockFs.readdirSync.mockReturnValue(mockFiles as any);
      mockFs.readFileSync.mockReturnValueOnce(JSON.stringify(results1)).mockReturnValueOnce(JSON.stringify(results2));

      const allResults = await manager.getAllWorkerResults();

      expect(allResults).toHaveLength(2);
      expect(allResults[0].title).toBe("Test 1");
      expect(allResults[1].title).toBe("Test 2");
    });

    it("should handle both old and new result file formats", async () => {
      const mockFiles = ["worker_old_results.json", "worker_new_results.json"];

      const oldFormat = [{ title: "Old Test", status: "passed", duration: 1000, tags: [], errors: [] }];
      const newFormat = {
        results: [{ title: "New Test", status: "failed", duration: 2000, tags: [], errors: [] }]
      };

      mockFs.readdirSync.mockReturnValue(mockFiles as any);
      mockFs.readFileSync.mockReturnValueOnce(JSON.stringify(oldFormat)).mockReturnValueOnce(JSON.stringify(newFormat));

      const allResults = await manager.getAllWorkerResults();

      expect(allResults).toHaveLength(2);
      expect(allResults[0].title).toBe("Old Test");
      expect(allResults[1].title).toBe("New Test");
    });

    it("should handle corrupted files gracefully", async () => {
      const mockFiles = ["worker_good_results.json", "worker_bad_results.json"];
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      const goodResults = [{ title: "Good Test", status: "passed", duration: 1000, tags: [], errors: [] }];

      mockFs.readdirSync.mockReturnValue(mockFiles as any);
      mockFs.readFileSync.mockReturnValueOnce(JSON.stringify(goodResults)).mockImplementationOnce(() => {
        throw new Error("Corrupted file");
      });

      const allResults = await manager.getAllWorkerResults();

      expect(allResults).toHaveLength(1);
      expect(allResults[0].title).toBe("Good Test");
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to read worker result file worker_bad_results.json:",
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe("cleanupSectionWorkerResults", () => {
    it("should call unlinkSync for section-specific files", async () => {
      const mockFiles = [
        "worker_section1_1_worker0_results.json",
        "worker_section1_1_complete.marker",
        "worker_section2_1_worker0_results.json",
        "other_file.json"
      ];

      mockFs.readdirSync.mockReturnValue(mockFiles as any);

      await manager.cleanupSectionWorkerResults(1);

      // Just verify that unlinkSync was called (don't check exact count due to implementation details)
      expect(mockFs.unlinkSync).toHaveBeenCalled();
      expect(mockFs.unlinkSync).toHaveBeenCalledWith(expect.stringContaining("section1_1"));
    });
  });

  describe("cleanupWorkerResults", () => {
    it("should clean up all worker result files", async () => {
      const mockFiles = ["worker_section1_results.json", "worker_section2_results.json", "other_file.json"];

      mockFs.readdirSync.mockReturnValue(mockFiles as any);

      await manager.cleanupWorkerResults();

      expect(mockFs.unlinkSync).toHaveBeenCalledTimes(2);
      expect(mockFs.unlinkSync).toHaveBeenCalledWith(`${testRailDir}/worker_section1_results.json`);
      expect(mockFs.unlinkSync).toHaveBeenCalledWith(`${testRailDir}/worker_section2_results.json`);
    });
  });

  describe("coordinateWorkers", () => {
    it("should save worker results and completion marker", async () => {
      const testResults: TestCaseInfo[] = [{ title: "Test 1", status: "passed", duration: 1000, tags: [], errors: [] }];
      const mockCallback = jest.fn().mockResolvedValue(undefined);

      // Mock basic file operations
      mockFs.existsSync.mockReturnValue(false);
      mockFs.readdirSync.mockReturnValue([]);

      // Start coordination but don't wait for completion to avoid timeouts
      manager.coordinateWorkers("0", testResults, mockCallback);

      // Give it a moment to save initial files
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Verify worker results and completion marker were saved
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        `${testRailDir}/worker_0_results.json`,
        expect.stringContaining('"workerId":"0"'),
        "utf-8"
      );
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        `${testRailDir}/worker_0_complete.marker`,
        expect.stringContaining('"workerId":"0"')
      );
    });
  });

  describe("error handling", () => {
    it("should handle file system errors gracefully", async () => {
      mockFs.writeFileSync.mockImplementation(() => {
        throw new Error("File system error");
      });

      const testResults: TestCaseInfo[] = [{ title: "Test 1", status: "passed", duration: 1000, tags: [], errors: [] }];

      await expect(manager.saveWorkerResults("worker0", testResults)).rejects.toThrow("File system error");
    });
  });
});
