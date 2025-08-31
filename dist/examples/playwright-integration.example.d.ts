/**
 * Example: TestRail integration with Playwright
 * This example shows how to automatically sync test results to TestRail
 *
 * To use this example:
 * 1. Copy this code to your Playwright test files
 * 2. Uncomment the imports and code
 * 3. Configure your TestRail settings below
 * 4. Run your tests - results will automatically sync to TestRail
 */
/**
 * Status Mapping Information:
 * - passed → TestRail Status ID 1 (PASSED)
 * - failed → TestRail Status ID 5 (FAILED)
 * - interrupted → TestRail Status ID 2 (BLOCKED)
 * - timeOut → TestRail Status ID 5 (FAILED)
 * - skipped → SKIPPED (not sent to TestRail)
 *
 * Note: Skipped tests are automatically filtered out and won't be sent to TestRail
 */
export declare const EXAMPLE_TESTRAIL_CONFIG: {
    sectionId: number;
    platform: number;
    runName: string;
};
