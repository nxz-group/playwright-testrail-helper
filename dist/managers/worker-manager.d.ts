/**
 * Manages worker coordination, file locking, and result aggregation for parallel test execution
 */
export declare class WorkerManager {
  private readonly testRailDir;
  private readonly encode;
  constructor(testRailDir: string);
  /**
   * Formats test duration from milliseconds to human readable format
   * @param ms - Duration in milliseconds
   * @returns Formatted duration string
   */
  private formatDuration;
  /**
   * Saves worker test results to individual worker file
   * @param sectionWorkerId - Combined section and worker ID
   * @param testResults - Array of test results to save
   */
  saveWorkerResults(sectionWorkerId: string, testResults: Record<string, any>[]): Promise<void>;
  /**
   * Retrieves test results from all workers for a specific section
   * @param sectionId - Section ID to get results for
   * @returns Combined test results from all workers
   */
  getSectionWorkerResults(sectionId: number): Promise<Record<string, any>[]>;
  /**
   * Retrieves test results from all workers across all sections
   * @returns Combined test results from all workers
   */
  getAllWorkerResults(): Promise<Record<string, any>[]>;
  /**
   * Cleans up worker result files for a specific section
   * @param sectionId - Section ID to clean up files for
   */
  cleanupSectionWorkerResults(sectionId: number): Promise<void>;
  /**
   * Cleans up all worker result files
   */
  cleanupWorkerResults(): Promise<void>;
  /**
   * Manages worker coordination using file locks and completion markers
   * @param workerId - Current worker ID
   * @param testResults - Test results from current worker
   * @param callback - Callback function to execute when coordinator is selected
   * @returns Promise that resolves when coordination is complete
   */
  coordinateWorkers(
    workerId: string,
    testResults: Record<string, any>[],
    callback: (allResults: Record<string, any>[]) => Promise<void>
  ): Promise<void>;
  /**
   * Intelligently waits for all workers to complete with adaptive timeout
   */
  private waitForAllWorkers;
}
