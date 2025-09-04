/**
 * Core TestRail helper for serial execution (no worker coordination, no file persistence)
 * Optimized for single-worker test runs with minimal bundle size
 */
declare class CoreTestRailHelper {
    private client?;
    private projectId?;
    private initialized;
    /**
     * Initializes the core helper with environment variables
     */
    private initialize;
    /**
     * Simple TestInfo to TestCaseInfo conversion (no complex parsing)
     */
    private convertTestInfo;
    /**
     * Simple error comment formatting
     */
    private createComment;
    /**
     * Get or create test case ID from title
     */
    private getOrCreateCaseId;
    /**
     * Core updateTestResult method for serial execution
     * No worker coordination, no file persistence, minimal parsing
     */
    updateTestResult(runName: string, sectionId: number, platformId: number, testInfos: unknown[]): Promise<void>;
    /**
     * Single test result update
     */
    updateTestResultSingle(runName: string, sectionId: number, platformId: number, testInfo: unknown): Promise<void>;
}
export declare const onTestRailHelper: CoreTestRailHelper;
export {};
