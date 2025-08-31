import { TestRailError } from "@utils/errors";
import fs from "fs";

/**
 * Manages worker coordination, file locking, and result aggregation for parallel test execution
 */
export class WorkerManager {
  private readonly testRailDir: string;
  private readonly encode = "utf-8";

  constructor(testRailDir: string) {
    this.testRailDir = testRailDir;
  }

  /**
   * Formats test duration from milliseconds to human readable format
   * @param ms - Duration in milliseconds
   * @returns Formatted duration string
   */
  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  }

  /**
   * Saves worker test results to individual worker file
   * @param sectionWorkerId - Combined section and worker ID
   * @param testResults - Array of test results to save
   */
  async saveWorkerResults(sectionWorkerId: string, testResults: Record<string, any>[]): Promise<void> {
    const workerResultFile = `${this.testRailDir}/worker_${sectionWorkerId}_results.json`;
    fs.writeFileSync(workerResultFile, JSON.stringify(testResults), this.encode);
  }

  /**
   * Retrieves test results from all workers for a specific section
   * @param sectionId - Section ID to get results for
   * @returns Combined test results from all workers
   */
  async getSectionWorkerResults(sectionId: number): Promise<Record<string, any>[]> {
    const allResults: Record<string, any>[] = [];
    const files = fs
      .readdirSync(this.testRailDir)
      .filter((f) => f.includes(`_${sectionId}_`) && f.endsWith("_results.json"));

    for (const file of files) {
      const results = JSON.parse(fs.readFileSync(`${this.testRailDir}/${file}`, this.encode));
      allResults.push(...results);
    }

    return allResults;
  }

  /**
   * Retrieves test results from all workers across all sections
   * @returns Combined test results from all workers
   */
  async getAllWorkerResults(): Promise<Record<string, any>[]> {
    const allResults: Record<string, any>[] = [];
    const files = fs
      .readdirSync(this.testRailDir)
      .filter((f) => f.startsWith("worker_") && f.endsWith("_results.json"));

    for (const file of files) {
      try {
        const fileContent = JSON.parse(fs.readFileSync(`${this.testRailDir}/${file}`, this.encode));
        const results = fileContent.results || fileContent; // Handle both old and new format
        if (Array.isArray(results)) {
          allResults.push(...results);
        }
      } catch (error) {
        console.warn(`Failed to read worker result file ${file}:`, error);
      }
    }

    return allResults;
  }

  /**
   * Cleans up worker result files for a specific section
   * @param sectionId - Section ID to clean up files for
   */
  async cleanupSectionWorkerResults(sectionId: number): Promise<void> {
    const files = fs.readdirSync(this.testRailDir);

    // Clean up result files for this section
    files
      .filter((f) => f.includes(`_${sectionId}_`) && f.endsWith("_results.json"))
      .forEach((file) => fs.unlinkSync(`${this.testRailDir}/${file}`));

    // Clean up completion markers for this section
    files
      .filter((f) => f.includes(`_${sectionId}_`) && f.endsWith("_complete.marker"))
      .forEach((file) => fs.unlinkSync(`${this.testRailDir}/${file}`));
  }

  /**
   * Cleans up all worker result files
   */
  async cleanupWorkerResults(): Promise<void> {
    const files = fs
      .readdirSync(this.testRailDir)
      .filter((f) => f.startsWith("worker_") && f.endsWith("_results.json"));
    files.forEach((file) => fs.unlinkSync(`${this.testRailDir}/${file}`));
  }

  /**
   * Manages worker coordination using file locks and completion markers
   * @param workerId - Current worker ID
   * @param testResults - Test results from current worker
   * @param callback - Callback function to execute when coordinator is selected
   * @returns Promise that resolves when coordination is complete
   */
  async coordinateWorkers(
    workerId: string,
    testResults: Record<string, any>[],
    callback: (allResults: Record<string, any>[]) => Promise<void>
  ): Promise<void> {
    // Save worker results with timestamp
    const workerResultFile = `${this.testRailDir}/worker_${workerId}_results.json`;
    fs.writeFileSync(
      workerResultFile,
      JSON.stringify({
        workerId,
        timestamp: Date.now(),
        results: testResults
      }),
      this.encode
    );

    // Create completion marker with more info
    const completionFile = `${this.testRailDir}/worker_${workerId}_complete.marker`;
    fs.writeFileSync(
      completionFile,
      JSON.stringify({
        workerId,
        testCount: testResults.length,
        timestamp: Date.now()
      })
    );

    // Initial wait for other workers to finish their immediate work
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Use global lock for coordinator selection
    const coordinatorLockFile = `${this.testRailDir}/coordinator.lock`;
    const maxCoordinatorLockWait = 30000;
    let coordinatorLockWaitTime = 0;

    // Wait for coordinator lock to be available
    while (fs.existsSync(coordinatorLockFile) && coordinatorLockWaitTime < maxCoordinatorLockWait) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      coordinatorLockWaitTime += 100;
    }

    // Try to become coordinator
    if (!fs.existsSync(coordinatorLockFile)) {
      fs.writeFileSync(
        coordinatorLockFile,
        JSON.stringify({
          coordinatorWorkerId: workerId,
          timestamp: Date.now()
        })
      );

      try {
        // Double check we're still the coordinator
        if (fs.existsSync(coordinatorLockFile)) {
          const lockInfo = JSON.parse(fs.readFileSync(coordinatorLockFile, this.encode));
          if (lockInfo.coordinatorWorkerId === workerId) {
            // Smart wait for all workers with adaptive timeout
            await this.waitForAllWorkers();

            // Collect all worker results
            const allResults = await this.getAllWorkerResults();

            if (allResults.length > 0) {
              await callback(allResults);

              // Cleanup worker files
              await this.cleanupWorkerResults();
              fs.readdirSync(this.testRailDir)
                .filter((f) => f.endsWith("_complete.marker"))
                .forEach((f) => fs.unlinkSync(`${this.testRailDir}/${f}`));
            }
          }
        }
      } finally {
        // Always release coordinator lock
        if (fs.existsSync(coordinatorLockFile)) {
          fs.unlinkSync(coordinatorLockFile);
        }
      }
    }
  }

  /**
   * Intelligently waits for all workers to complete with adaptive timeout
   */
  private async waitForAllWorkers(): Promise<void> {
    const maxWaitTime = 300000; // 5 minutes absolute maximum
    const stableWaitTime = 10000; // Wait 10 seconds after last worker finishes
    const checkInterval = 500;

    let waitTime = 0;
    let lastCompletedCount = 0;
    let stableTime = 0;
    let lastActivityTime = Date.now();

    console.log("Coordinator waiting for all workers to complete...");

    while (waitTime < maxWaitTime) {
      const completedWorkers = fs
        .readdirSync(this.testRailDir)
        .filter((f) => f.startsWith("worker_") && f.endsWith("_complete.marker"));

      const currentCount = completedWorkers.length;

      // Check if we have new activity
      if (currentCount > lastCompletedCount) {
        console.log(`Workers completed: ${currentCount} (new: ${currentCount - lastCompletedCount})`);
        lastCompletedCount = currentCount;
        lastActivityTime = Date.now();
        stableTime = 0; // Reset stable timer
      } else {
        stableTime += checkInterval;
      }

      // If no new workers for stableWaitTime, assume all are done
      if (stableTime >= stableWaitTime) {
        console.log(`No new workers for ${stableWaitTime}ms, proceeding with ${currentCount} workers`);
        break;
      }

      // Check for very old completion markers (workers might have crashed)
      const now = Date.now();
      let hasRecentActivity = false;

      for (const file of completedWorkers) {
        try {
          const markerPath = `${this.testRailDir}/${file}`;
          const markerContent = JSON.parse(fs.readFileSync(markerPath, this.encode));
          const age = now - markerContent.timestamp;

          // If any marker is less than 30 seconds old, consider it recent activity
          if (age < 30000) {
            hasRecentActivity = true;
            break;
          }
        } catch {
          // Ignore corrupted markers
        }
      }

      // If no recent activity and we've waited a reasonable time, proceed
      if (!hasRecentActivity && waitTime > 30000) {
        console.log("No recent worker activity detected, proceeding...");
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, checkInterval));
      waitTime += checkInterval;
    }

    if (waitTime >= maxWaitTime) {
      console.warn(`Coordinator timeout after ${maxWaitTime}ms, proceeding with available results`);
    }

    console.log(`Coordinator finished waiting. Total workers: ${lastCompletedCount}, Wait time: ${waitTime}ms`);
  }
}
