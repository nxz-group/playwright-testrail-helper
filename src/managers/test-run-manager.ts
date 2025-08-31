import fs from "node:fs";
import type { TestRailClient } from "@api/testrail-client";
import { TestRailError } from "@utils/errors";
import dayjs from "dayjs";
import type { TestResult } from "../types/index.js";

/**
 * Manages TestRail test run operations and file persistence
 */
export class TestRunManager {
  private readonly testRailDir: string;
  private readonly testRailResultJson: string;
  private readonly encode = "utf-8";
  private readonly projectId: number;

  private existingTestRunId = 0;
  private existingCaseIds: number[] = [];
  private newCaseIds: number[] = [];
  private newTestRunId = 0;

  constructor(
    private client: TestRailClient,
    projectId: number,
    testRailDir: string = "testRail"
  ) {
    this.projectId = projectId;
    this.testRailDir = testRailDir;
    this.testRailResultJson = `${this.testRailDir}/testRunResult.json`;
  }

  /**
   * Checks if directory has sufficient space and write permissions
   * @param dirPath - Directory to check
   * @param dataSize - Estimated size of data to write
   */
  private checkDiskSpaceAndPermissions(dirPath: string, _dataSize: number): void {
    try {
      // Check write permissions by creating a test file
      const testFile = `${dirPath}/.write-test-${Date.now()}`;
      fs.writeFileSync(testFile, "test");
      fs.unlinkSync(testFile);

      // Check available space (rough estimate)
      const stats = fs.statSync(dirPath);
      if (stats.isDirectory()) {
        // If we can write a test file, assume we have enough space for JSON
        // More sophisticated space checking would require platform-specific code
        return;
      }
    } catch (error: unknown) {
      const err = error as Record<string, unknown>;
      if (err.code === "EACCES") {
        throw new TestRailError(`No write permission for directory: ${dirPath}`);
      }
      if (err.code === "ENOSPC") {
        throw new TestRailError(`Insufficient disk space in directory: ${dirPath}`);
      }
      throw new TestRailError(`Cannot write to directory: ${dirPath} - ${err.message}`);
    }
  }

  /**
   * Safely writes JSON data to file with atomic operations and file locking
   * @param filePath - Path to the file
   * @param data - Data to write
   */
  private async writeJsonSafely(filePath: string, data: unknown): Promise<void> {
    // Check disk space and permissions first
    const jsonString = JSON.stringify(data, null, 2);
    this.checkDiskSpaceAndPermissions(this.testRailDir, jsonString.length);

    const lockFile = `${filePath}.lock`;
    const maxWaitTime = 5000; // 5 seconds max wait
    const retryInterval = 50; // Check every 50ms
    let waitTime = 0;

    // Check for stale locks and clean them up
    if (fs.existsSync(lockFile)) {
      try {
        const lockContent = fs.readFileSync(lockFile, "utf8");
        const lockInfo = JSON.parse(lockContent);
        const lockAge = Date.now() - lockInfo.timestamp;

        // If lock is older than 30 seconds, consider it stale
        if (lockAge > 30000) {
          console.warn(`Removing stale lock file (age: ${lockAge}ms, pid: ${lockInfo.pid})`);
          fs.unlinkSync(lockFile);
        }
      } catch (_error) {
        // If we can't read lock file, it's probably corrupted - remove it
        console.warn("Removing corrupted lock file");
        fs.unlinkSync(lockFile);
      }
    }

    // Wait for lock to be available
    while (fs.existsSync(lockFile) && waitTime < maxWaitTime) {
      await new Promise((resolve) => setTimeout(resolve, retryInterval));
      waitTime += retryInterval;
    }

    if (waitTime >= maxWaitTime) {
      throw new TestRailError("File lock timeout - another process may have crashed");
    }

    // Create lock with process info
    const lockInfo = {
      pid: process.pid,
      workerId: process.env.TEST_WORKER_INDEX || "0",
      timestamp: Date.now()
    };

    try {
      // Use exclusive flag to prevent race condition
      fs.writeFileSync(lockFile, JSON.stringify(lockInfo), { flag: "wx" });

      // Atomic write: temp file -> rename
      const tempFile = `${filePath}.${Date.now()}.tmp`;
      fs.writeFileSync(tempFile, jsonString);
      fs.renameSync(tempFile, filePath);
    } catch (error: unknown) {
      const err = error as Record<string, unknown>;
      if (err.code === "EEXIST") {
        // Another process created lock simultaneously, retry
        throw new TestRailError("Lock creation race condition - retry needed");
      }
      if (err.code === "ENOSPC") {
        throw new TestRailError("Insufficient disk space to write file");
      }
      if (err.code === "EACCES") {
        throw new TestRailError("Permission denied writing to file");
      }
      throw error;
    } finally {
      // Always cleanup lock and temp files
      if (fs.existsSync(lockFile)) {
        fs.unlinkSync(lockFile);
      }
      // Cleanup any leftover temp files
      try {
        const _tempPattern = `${filePath}.*.tmp`;
        const dir = require("node:path").dirname(filePath);
        const basename = require("node:path").basename(filePath);
        const files = fs.readdirSync(dir);
        files.forEach((file) => {
          if (file.startsWith(`${basename}.`) && file.endsWith(".tmp")) {
            fs.unlinkSync(`${dir}/${file}`);
          }
        });
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Ensures TestRail directory and result file exist
   */
  async ensureTestRailSetup(): Promise<void> {
    if (!fs.existsSync(this.testRailDir)) {
      fs.mkdirSync(this.testRailDir);
    }
    if (!fs.existsSync(this.testRailResultJson) || fs.readFileSync(this.testRailResultJson, this.encode) === "") {
      await this.writeJsonSafely(this.testRailResultJson, {});
    }
  }

  /**
   * Loads existing test run data from JSON file
   */
  async loadTestRunFromJson(): Promise<void> {
    const testRunResultExisting = JSON.parse(fs.readFileSync(this.testRailResultJson, this.encode));
    if (JSON.stringify(testRunResultExisting) !== "{}") {
      this.existingTestRunId = testRunResultExisting.testRunId;
      this.existingCaseIds = [...new Set([...this.existingCaseIds, ...testRunResultExisting.caseIds])];
    }
  }

  /**
   * Resets test run JSON file
   */
  async resetTestRunJson(): Promise<void> {
    await this.writeJsonSafely(this.testRailResultJson, {});
  }

  /**
   * Writes current test run data to JSON file
   */
  async writeTestRunJson(): Promise<void> {
    const data = {
      projectId: this.projectId,
      testRunId: this.newTestRunId,
      caseIds: this.newCaseIds
    };
    await this.writeJsonSafely(this.testRailResultJson, data);
  }

  /**
   * Sets test run ID and case IDs with file locking for parallel execution
   * @param runName - Test run name
   * @param userId - User ID for assignment
   * @param caseIds - Array of test case IDs
   */
  async setTestRunIdAndCaseId(runName: string, userId: number, caseIds: number[]): Promise<void> {
    const lockFile = `${this.testRailDir}/testrun.lock`;
    const maxLockWait = 30000; // 30 seconds max wait for lock
    let lockWaitTime = 0;

    // Wait for lock to be released with timeout
    while (fs.existsSync(lockFile) && lockWaitTime < maxLockWait) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      lockWaitTime += 100;
    }

    // Create lock with worker info
    const lockInfo = {
      pid: process.pid,
      workerId: process.env.TEST_WORKER_INDEX || "0",
      timestamp: Date.now()
    };
    fs.writeFileSync(lockFile, JSON.stringify(lockInfo));

    try {
      // Re-load after acquiring lock
      await this.loadTestRunFromJson();

      const getRunResult = await this.client.getRun(this.existingTestRunId);
      if (
        this.existingTestRunId === 0 ||
        getRunResult.statusCode !== 200 ||
        (getRunResult.statusCode === 200 && getRunResult.is_completed)
      ) {
        const testRunName = process.env.RUN_NAME ?? runName;
        const newRun = await this.client.addRun(this.projectId, {
          name: `${testRunName.trim()} - ${dayjs().format("DD/MM/YYYY HH:mm:ss")}`,
          assignedto_id: userId,
          include_all: false
        });
        this.newTestRunId = (newRun as any).id;
        this.newCaseIds = caseIds;
      } else {
        this.newTestRunId = this.existingTestRunId;
        if (this.existingCaseIds.length === 0) {
          this.newCaseIds = caseIds;
        } else {
          this.newCaseIds = [...new Set([...this.existingCaseIds, ...caseIds])];
        }
      }
    } finally {
      // Release lock
      if (fs.existsSync(lockFile)) {
        fs.unlinkSync(lockFile);
      }
    }
  }

  /**
   * Gets the current test run ID
   */
  getTestRunId(): number {
    return this.newTestRunId;
  }

  /**
   * Gets the current case IDs
   */
  getCaseIds(): number[] {
    return this.newCaseIds;
  }

  /**
   * Updates test run with case IDs and adds results
   * @param testResults - Array of test results
   */
  async updateRunAndAddResults(testResults: TestResult[]): Promise<void> {
    if (testResults.length === 0) {
      throw new TestRailError("Cannot update run with empty test results");
    }

    await this.client.updateRun(this.newTestRunId, this.newCaseIds);
    await this.client.addResultsForCases(this.newTestRunId, testResults);
  }
}
