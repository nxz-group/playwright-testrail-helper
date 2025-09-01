"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkerManager = void 0;
const node_fs_1 = __importDefault(require("node:fs"));
/**
 * Manages worker coordination, file locking, and result aggregation for parallel test execution
 */
class WorkerManager {
    constructor(testRailDir) {
        this.encode = "utf-8";
        this.testRailDir = testRailDir;
    }
    /**
     * Saves worker test results to individual worker file
     * @param sectionWorkerId - Combined section and worker ID
     * @param testResults - Array of test results to save
     */
    async saveWorkerResults(sectionWorkerId, testResults) {
        const workerResultFile = `${this.testRailDir}/worker_${sectionWorkerId}_results.json`;
        node_fs_1.default.writeFileSync(workerResultFile, JSON.stringify(testResults), this.encode);
    }
    /**
     * Retrieves test results from all workers for a specific section
     * @param sectionId - Section ID to get results for
     * @returns Combined test results from all workers
     */
    async getSectionWorkerResults(sectionId) {
        const allResults = [];
        const files = node_fs_1.default
            .readdirSync(this.testRailDir)
            .filter((f) => f.includes(`_${sectionId}_`) && f.endsWith("_results.json"));
        for (const file of files) {
            const results = JSON.parse(node_fs_1.default.readFileSync(`${this.testRailDir}/${file}`, this.encode));
            allResults.push(...results);
        }
        return allResults;
    }
    /**
     * Retrieves test results from all workers across all sections
     * @returns Combined test results from all workers
     */
    async getAllWorkerResults() {
        const allResults = [];
        const files = node_fs_1.default
            .readdirSync(this.testRailDir)
            .filter((f) => f.startsWith("worker_") && f.endsWith("_results.json"));
        for (const file of files) {
            try {
                const fileContent = JSON.parse(node_fs_1.default.readFileSync(`${this.testRailDir}/${file}`, this.encode));
                const results = fileContent.results || fileContent; // Handle both old and new format
                if (Array.isArray(results)) {
                    allResults.push(...results);
                }
            }
            catch (error) {
                console.warn(`Failed to read worker result file ${file}:`, error);
            }
        }
        return allResults;
    }
    /**
     * Cleans up worker result files for a specific section
     * @param sectionId - Section ID to clean up files for
     */
    async cleanupSectionWorkerResults(sectionId) {
        const files = node_fs_1.default.readdirSync(this.testRailDir);
        // Clean up result files for this section
        files
            .filter((f) => f.includes(`_${sectionId}_`) && f.endsWith("_results.json"))
            .forEach((file) => {
            node_fs_1.default.unlinkSync(`${this.testRailDir}/${file}`);
        });
        // Clean up completion markers for this section
        files
            .filter((f) => f.includes(`_${sectionId}_`) && f.endsWith("_complete.marker"))
            .forEach((file) => {
            node_fs_1.default.unlinkSync(`${this.testRailDir}/${file}`);
        });
    }
    /**
     * Cleans up all worker result files
     */
    async cleanupWorkerResults() {
        const files = node_fs_1.default
            .readdirSync(this.testRailDir)
            .filter((f) => f.startsWith("worker_") && f.endsWith("_results.json"));
        files.forEach((file) => {
            node_fs_1.default.unlinkSync(`${this.testRailDir}/${file}`);
        });
    }
    /**
     * Manages worker coordination using file locks and completion markers
     * @param workerId - Current worker ID
     * @param testResults - Test results from current worker
     * @param callback - Callback function to execute when coordinator is selected
     * @returns Promise that resolves when coordination is complete
     */
    async coordinateWorkers(workerId, testResults, callback) {
        // Save worker results with timestamp
        const workerResultFile = `${this.testRailDir}/worker_${workerId}_results.json`;
        node_fs_1.default.writeFileSync(workerResultFile, JSON.stringify({
            workerId,
            timestamp: Date.now(),
            results: testResults
        }), this.encode);
        // Create completion marker with more info
        const completionFile = `${this.testRailDir}/worker_${workerId}_complete.marker`;
        node_fs_1.default.writeFileSync(completionFile, JSON.stringify({
            workerId,
            testCount: testResults.length,
            timestamp: Date.now()
        }));
        // Initial wait for other workers to finish their immediate work
        await new Promise((resolve) => setTimeout(resolve, 2000));
        // Use global lock for coordinator selection
        const coordinatorLockFile = `${this.testRailDir}/coordinator.lock`;
        const maxCoordinatorLockWait = 30000;
        let coordinatorLockWaitTime = 0;
        // Wait for coordinator lock to be available
        while (node_fs_1.default.existsSync(coordinatorLockFile) && coordinatorLockWaitTime < maxCoordinatorLockWait) {
            await new Promise((resolve) => setTimeout(resolve, 100));
            coordinatorLockWaitTime += 100;
        }
        // Try to become coordinator
        if (!node_fs_1.default.existsSync(coordinatorLockFile)) {
            node_fs_1.default.writeFileSync(coordinatorLockFile, JSON.stringify({
                coordinatorWorkerId: workerId,
                timestamp: Date.now()
            }));
            try {
                // Double check we're still the coordinator
                if (node_fs_1.default.existsSync(coordinatorLockFile)) {
                    const lockInfo = JSON.parse(node_fs_1.default.readFileSync(coordinatorLockFile, this.encode));
                    if (lockInfo.coordinatorWorkerId === workerId) {
                        // Smart wait for all workers with adaptive timeout
                        await this.waitForAllWorkers();
                        // Collect all worker results
                        const allResults = await this.getAllWorkerResults();
                        if (allResults.length > 0) {
                            await callback(allResults);
                            // Cleanup worker files
                            await this.cleanupWorkerResults();
                            node_fs_1.default.readdirSync(this.testRailDir)
                                .filter((f) => f.endsWith("_complete.marker"))
                                .forEach((f) => {
                                node_fs_1.default.unlinkSync(`${this.testRailDir}/${f}`);
                            });
                        }
                    }
                }
            }
            finally {
                // Always release coordinator lock
                if (node_fs_1.default.existsSync(coordinatorLockFile)) {
                    node_fs_1.default.unlinkSync(coordinatorLockFile);
                }
            }
        }
    }
    /**
     * Intelligently waits for all workers to complete with adaptive timeout
     */
    async waitForAllWorkers() {
        const maxWaitTime = 300000; // 5 minutes absolute maximum
        const stableWaitTime = 10000; // Wait 10 seconds after last worker finishes
        const checkInterval = 500;
        let waitTime = 0;
        let lastCompletedCount = 0;
        let stableTime = 0;
        let _lastActivityTime = Date.now();
        while (waitTime < maxWaitTime) {
            const completedWorkers = node_fs_1.default
                .readdirSync(this.testRailDir)
                .filter((f) => f.startsWith("worker_") && f.endsWith("_complete.marker"));
            const currentCount = completedWorkers.length;
            // Check if we have new activity
            if (currentCount > lastCompletedCount) {
                lastCompletedCount = currentCount;
                _lastActivityTime = Date.now();
                stableTime = 0; // Reset stable timer
            }
            else {
                stableTime += checkInterval;
            }
            // If no new workers for stableWaitTime, assume all are done
            if (stableTime >= stableWaitTime) {
                break;
            }
            // Check for very old completion markers (workers might have crashed)
            const now = Date.now();
            let hasRecentActivity = false;
            for (const file of completedWorkers) {
                try {
                    const markerPath = `${this.testRailDir}/${file}`;
                    const markerContent = JSON.parse(node_fs_1.default.readFileSync(markerPath, this.encode));
                    const age = now - markerContent.timestamp;
                    // If any marker is less than 30 seconds old, consider it recent activity
                    if (age < 30000) {
                        hasRecentActivity = true;
                        break;
                    }
                }
                catch {
                    // Ignore corrupted markers
                }
            }
            // If no recent activity and we've waited a reasonable time, proceed
            if (!hasRecentActivity && waitTime > 30000) {
                break;
            }
            await new Promise((resolve) => setTimeout(resolve, checkInterval));
            waitTime += checkInterval;
        }
        if (waitTime >= maxWaitTime) {
            console.warn(`Coordinator timeout after ${maxWaitTime}ms, proceeding with available results`);
        }
    }
}
exports.WorkerManager = WorkerManager;
