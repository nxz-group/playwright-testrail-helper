import type { TestCaseInfo } from "../types/index.js";
/**
 * Manages worker coordination, file locking, and result aggregation for parallel test execution
 */
export declare class WorkerManager {
    private readonly testRailDir;
    private readonly encode;
    constructor(testRailDir: string);
    /**
     * Saves worker test results to individual worker file
     * @param sectionWorkerId - Combined section and worker ID
     * @param testResults - Array of test results to save
     */
    saveWorkerResults(sectionWorkerId: string, testResults: TestCaseInfo[]): Promise<void>;
    /**
     * Retrieves test results from all workers for a specific section
     * @param sectionId - Section ID to get results for
     * @returns Combined test results from all workers
     */
    getSectionWorkerResults(sectionId: number): Promise<TestCaseInfo[]>;
    /**
     * Retrieves test results from all workers across all sections
     * @returns Combined test results from all workers
     */
    getAllWorkerResults(): Promise<TestCaseInfo[]>;
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
    coordinateWorkers(workerId: string, testResults: TestCaseInfo[], callback: (allResults: TestCaseInfo[]) => Promise<void>): Promise<void>;
    /**
     * Intelligently waits for all workers to complete with adaptive timeout
     */
    private waitForAllWorkers;
}
