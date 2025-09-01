/**
 * Simple Usage Example: One-Line TestRail Integration
 *
 * This is the simplest way to use the enhanced TestRail integration.
 * Just one line in afterEach hook - everything else is automatic!
 */

import { expect, test } from "@playwright/test";
import { onTestRailHelper } from "../index.js";

test.describe("Simple TestRail Integration", () => {
  test("@smoke @login @high Login test", async ({ page }) => {
    await page.goto("https://example.com/login");
    await page.fill("#username", "testuser");
    await page.fill("#password", "testpass");
    await page.click("#login-button");
    await expect(page.locator(".welcome-message")).toBeVisible();
  });

  test("@functional @search @medium Search test", async ({ page }) => {
    await page.goto("https://example.com");
    await page.fill("#search-input", "test query");
    await page.click("#search-button");
    await expect(page.locator(".search-results")).toContainText("Results");
  });
});

// 🎉 Simple Integration - Just ONE LINE!
test.afterEach(async ({}, testInfo) => {
  await onTestRailHelper.updateTestResultFromPlaywrightSingle(
    "Simple Test Run",
    123, // Your TestRail section ID
    456, // Your platform ID
    testInfo // That's it! Everything else is automatic
  );
});

/**
 * 🚀 What happens automatically:
 *
 * 1. ✅ TestInfo Conversion - Playwright testInfo → TestRail format
 * 2. ✅ Failure Capture - Error messages, stack traces, failed steps
 * 3. ✅ Environment Detection - Browser, OS, Node.js versions
 * 4. ✅ Enhanced Comments - Rich formatting with emojis and sections
 * 5. ✅ Error Cleaning - Remove ANSI codes, format messages
 * 6. ✅ Attachment Linking - Screenshots, videos, traces
 * 7. ✅ Duration Formatting - Human-readable test duration
 * 8. ✅ Status Mapping - Playwright status → TestRail status
 * 9. ✅ Tag Processing - Extract tags from test titles
 * 10. ✅ Step Extraction - Test steps with error information
 *
 * All of this happens with just one method call! 🎉
 */

// Example: Batch processing (also ultra simple)
export async function batchUpdate(testInfoArray: unknown[]) {
  // Process multiple tests at once - still just one line!
  await onTestRailHelper.updateTestResultFromPlaywright(
    "Batch Test Run",
    123, // Section ID
    456, // Platform ID
    testInfoArray // Array of testInfo objects
  );
}

// Example: Different environments
export async function updateForEnvironment(testInfo: unknown, environment: "dev" | "staging" | "prod") {
  await onTestRailHelper.updateTestResultFromPlaywrightSingle(
    `${environment.toUpperCase()} Test Run`,
    123, // Section ID
    456, // Platform ID
    testInfo
  );
}

/**
 * 📊 Comparison:
 *
 * Old way (v1.1.x):
 * ```typescript
 * const testCaseInfo = PlaywrightConverter.convertTestInfo(testInfo);
 * await onTestRailHelper.updateTestResult("Run", 123, 456, [testCaseInfo]);
 * ```
 *
 * New way (v1.2.0):
 * ```typescript
 * await onTestRailHelper.updateTestResultFromPlaywrightSingle("Run", 123, 456, testInfo);
 * ```
 *
 * Even simpler! No manual conversion needed! 🎉
 */
