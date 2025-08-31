var __importDefault = (this && this.__importDefault) || ((mod) => (mod && mod.__esModule ? mod : { default: mod }));
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestRunManager = void 0;
const fs_1 = __importDefault(require("fs"));
const dayjs_1 = __importDefault(require("dayjs"));
const errors_1 = require("@utils/errors");
/**
 * Manages TestRail test run operations and file persistence
 */
class TestRunManager {
  constructor(client, projectId, testRailDir = "testRail") {
    this.client = client;
    this.encode = "utf-8";
    this.existingTestRunId = 0;
    this.existingCaseIds = [];
    this.newCaseIds = [];
    this.newTestRunId = 0;
    this.projectId = projectId;
    this.testRailDir = testRailDir;
    this.testRailResultJson = `${this.testRailDir}/testRunResult.json`;
  }
  /**
   * Checks if directory has sufficient space and write permissions
   * @param dirPath - Directory to check
   * @param dataSize - Estimated size of data to write
   */
  checkDiskSpaceAndPermissions(dirPath, dataSize) {
    try {
      // Check write permissions by creating a test file
      const testFile = `${dirPath}/.write-test-${Date.now()}`;
      fs_1.default.writeFileSync(testFile, "test");
      fs_1.default.unlinkSync(testFile);
      // Check available space (rough estimate)
      const stats = fs_1.default.statSync(dirPath);
      if (stats.isDirectory()) {
        // If we can write a test file, assume we have enough space for JSON
        // More sophisticated space checking would require platform-specific code
        return;
      }
    } catch (error) {
      if (error.code === "EACCES") {
        throw new errors_1.TestRailError(`No write permission for directory: ${dirPath}`);
      }
      if (error.code === "ENOSPC") {
        throw new errors_1.TestRailError(`Insufficient disk space in directory: ${dirPath}`);
      }
      throw new errors_1.TestRailError(`Cannot write to directory: ${dirPath} - ${error.message}`);
    }
  }
  /**
   * Safely writes JSON data to file with atomic operations and file locking
   * @param filePath - Path to the file
   * @param data - Data to write
   */
  async writeJsonSafely(filePath, data) {
    // Check disk space and permissions first
    const jsonString = JSON.stringify(data, null, 2);
    this.checkDiskSpaceAndPermissions(this.testRailDir, jsonString.length);
    const lockFile = `${filePath}.lock`;
    const maxWaitTime = 5000; // 5 seconds max wait
    const retryInterval = 50; // Check every 50ms
    let waitTime = 0;
    // Check for stale locks and clean them up
    if (fs_1.default.existsSync(lockFile)) {
      try {
        const lockContent = fs_1.default.readFileSync(lockFile, "utf8");
        const lockInfo = JSON.parse(lockContent);
        const lockAge = Date.now() - lockInfo.timestamp;
        // If lock is older than 30 seconds, consider it stale
        if (lockAge > 30000) {
          console.warn(`Removing stale lock file (age: ${lockAge}ms, pid: ${lockInfo.pid})`);
          fs_1.default.unlinkSync(lockFile);
        }
      } catch (error) {
        // If we can't read lock file, it's probably corrupted - remove it
        console.warn("Removing corrupted lock file");
        fs_1.default.unlinkSync(lockFile);
      }
    }
    // Wait for lock to be available
    while (fs_1.default.existsSync(lockFile) && waitTime < maxWaitTime) {
      await new Promise((resolve) => setTimeout(resolve, retryInterval));
      waitTime += retryInterval;
    }
    if (waitTime >= maxWaitTime) {
      throw new errors_1.TestRailError("File lock timeout - another process may have crashed");
    }
    // Create lock with process info
    const lockInfo = {
      pid: process.pid,
      workerId: process.env.TEST_WORKER_INDEX || "0",
      timestamp: Date.now()
    };
    try {
      // Use exclusive flag to prevent race condition
      fs_1.default.writeFileSync(lockFile, JSON.stringify(lockInfo), { flag: "wx" });
      // Atomic write: temp file -> rename
      const tempFile = `${filePath}.${Date.now()}.tmp`;
      fs_1.default.writeFileSync(tempFile, jsonString);
      fs_1.default.renameSync(tempFile, filePath);
    } catch (error) {
      if (error.code === "EEXIST") {
        // Another process created lock simultaneously, retry
        throw new errors_1.TestRailError("Lock creation race condition - retry needed");
      }
      if (error.code === "ENOSPC") {
        throw new errors_1.TestRailError("Insufficient disk space to write file");
      }
      if (error.code === "EACCES") {
        throw new errors_1.TestRailError("Permission denied writing to file");
      }
      throw error;
    } finally {
      // Always cleanup lock and temp files
      if (fs_1.default.existsSync(lockFile)) {
        fs_1.default.unlinkSync(lockFile);
      }
      // Cleanup any leftover temp files
      try {
        const tempPattern = `${filePath}.*.tmp`;
        const dir = require("path").dirname(filePath);
        const basename = require("path").basename(filePath);
        const files = fs_1.default.readdirSync(dir);
        files.forEach((file) => {
          if (file.startsWith(`${basename}.`) && file.endsWith(".tmp")) {
            fs_1.default.unlinkSync(`${dir}/${file}`);
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
  async ensureTestRailSetup() {
    if (!fs_1.default.existsSync(this.testRailDir)) {
      fs_1.default.mkdirSync(this.testRailDir);
    }
    if (
      !fs_1.default.existsSync(this.testRailResultJson) ||
      fs_1.default.readFileSync(this.testRailResultJson, this.encode) === ""
    ) {
      await this.writeJsonSafely(this.testRailResultJson, {});
    }
  }
  /**
   * Loads existing test run data from JSON file
   */
  async loadTestRunFromJson() {
    const testRunResultExisting = JSON.parse(fs_1.default.readFileSync(this.testRailResultJson, this.encode));
    if (JSON.stringify(testRunResultExisting) !== "{}") {
      this.existingTestRunId = testRunResultExisting.testRunId;
      this.existingCaseIds = [...new Set([...this.existingCaseIds, ...testRunResultExisting.caseIds])];
    }
  }
  /**
   * Resets test run JSON file
   */
  async resetTestRunJson() {
    await this.writeJsonSafely(this.testRailResultJson, {});
  }
  /**
   * Writes current test run data to JSON file
   */
  async writeTestRunJson() {
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
  async setTestRunIdAndCaseId(runName, userId, caseIds) {
    const lockFile = `${this.testRailDir}/testrun.lock`;
    const maxLockWait = 30000; // 30 seconds max wait for lock
    let lockWaitTime = 0;
    // Wait for lock to be released with timeout
    while (fs_1.default.existsSync(lockFile) && lockWaitTime < maxLockWait) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      lockWaitTime += 100;
    }
    // Create lock with worker info
    const lockInfo = {
      pid: process.pid,
      workerId: process.env.TEST_WORKER_INDEX || "0",
      timestamp: Date.now()
    };
    fs_1.default.writeFileSync(lockFile, JSON.stringify(lockInfo));
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
          name: `${testRunName.trim()} - ${(0, dayjs_1.default)().format("DD/MM/YYYY HH:mm:ss")}`,
          assignedto_id: userId,
          include_all: false
        });
        this.newTestRunId = newRun.id;
        this.newCaseIds = caseIds;
      } else {
        this.newTestRunId = this.existingTestRunId;
        this.existingCaseIds.length === 0
          ? (this.newCaseIds = caseIds)
          : (this.newCaseIds = [...new Set([...this.existingCaseIds, ...caseIds])]);
      }
    } finally {
      // Release lock
      if (fs_1.default.existsSync(lockFile)) {
        fs_1.default.unlinkSync(lockFile);
      }
    }
  }
  /**
   * Gets the current test run ID
   */
  getTestRunId() {
    return this.newTestRunId;
  }
  /**
   * Gets the current case IDs
   */
  getCaseIds() {
    return this.newCaseIds;
  }
  /**
   * Updates test run with case IDs and adds results
   * @param testResults - Array of test results
   */
  async updateRunAndAddResults(testResults) {
    if (testResults.length === 0) {
      throw new errors_1.TestRailError("Cannot update run with empty test results");
    }
    await this.client.updateRun(this.newTestRunId, this.newCaseIds);
    await this.client.addResultsForCases(this.newTestRunId, testResults);
  }
}
exports.TestRunManager = TestRunManager;
