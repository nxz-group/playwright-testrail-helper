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

/*
import { test, expect } from '@playwright/test';
import { onTestRailHelper, PlaywrightConverter, Platform } from 'playwright-testrail-helper';

// Configuration - Update these values for your TestRail instance
const TESTRAIL_CONFIG = {
  sectionId: 1995, // Replace with your section ID
  platform: Platform.WEB_DESKTOP,
  runName: process.env.RUN_NAME || `Playwright Tests - ${new Date().toISOString().split('T')[0]}`
};

// Method 1: Individual test reporting (recommended for real-time feedback)
test.afterEach(async ({ }, testInfo) => {
  try {
    const testCaseInfo = PlaywrightConverter.convertFromAfterEach(testInfo);
    await onTestRailHelper.updateTestResult(
      TESTRAIL_CONFIG.runName,
      TESTRAIL_CONFIG.sectionId,
      TESTRAIL_CONFIG.platform,
      [testCaseInfo]
    );
    console.log(`✅ Synced: ${testInfo.title}`);
  } catch (error) {
    console.error(`❌ Sync failed: ${error}`);
  }
});

// Method 2: Batch reporting (recommended for performance)
const testResults: any[] = [];

test.afterEach(async ({ }, testInfo) => {
  const testCaseInfo = PlaywrightConverter.convertFromAfterEach(testInfo);
  testResults.push(testCaseInfo);
});

test.afterAll(async () => {
  if (testResults.length > 0) {
    try {
      await onTestRailHelper.updateTestResult(
        TESTRAIL_CONFIG.runName,
        TESTRAIL_CONFIG.sectionId,
        TESTRAIL_CONFIG.platform,
        testResults
      );
      console.log(`✅ Batch synced ${testResults.length} test results`);
    } catch (error) {
      console.error(`❌ Batch sync failed: ${error}`);
    }
  }
});

// Example tests with TestRail-friendly naming and tagging
test.describe('Authentication @smoke', () => {
  test('User can login with valid credentials @high', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="username"]', 'testuser');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    await expect(page).toHaveURL('/dashboard');
  });
  
  test('User cannot login with invalid credentials @medium', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="username"]', 'invaliduser');
    await page.fill('[data-testid="password"]', 'wrongpassword');
    await page.click('[data-testid="login-button"]');
    
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
  });
});
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

// Export configuration for reference
export const EXAMPLE_TESTRAIL_CONFIG = {
  sectionId: 1995, // Replace with your section ID
  platform: 2, // Platform.WEB_DESKTOP
  runName: process.env.RUN_NAME || `Playwright Tests - ${new Date().toISOString().split("T")[0]}`
};
