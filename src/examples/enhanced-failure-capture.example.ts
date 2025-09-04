/**
 * Example: Enhanced Failure Capture and Comment Enhancement
 *
 * This example demonstrates how to use the new failure capture and comment enhancement features
 * with Playwright tests and TestRail integration.
 */

import { expect, test } from "@playwright/test";
import {
  type CommentEnhancementConfig,
  CommentEnhancer,
  FailureCapture,
  onTestRailHelper,
  PlaywrightConverter
} from "../index";

// Configure enhanced comments
const commentConfig: Partial<CommentEnhancementConfig> = {
  includeStackTrace: true,
  includeDuration: true,
  includeTimestamp: true,
  includeEnvironmentInfo: true,
  maxCommentLength: 3000,
  customPrefix: "🤖 Automated Test Execution"
};

// Example test with enhanced failure capture
test.describe("Enhanced TestRail Integration Examples", () => {
  test("@smoke @login @high Successful login test", async ({ page }) => {
    await page.goto("https://example.com/login");
    await page.fill("#username", "testuser");
    await page.fill("#password", "testpass");
    await page.click("#login-button");

    await expect(page.locator(".welcome-message")).toBeVisible();
  });

  test("@functional @search @medium Search functionality test", async ({ page }) => {
    await page.goto("https://example.com");
    await page.fill("#search-input", "test query");
    await page.click("#search-button");

    // This will fail to demonstrate failure capture
    await expect(page.locator(".search-results")).toContainText("Expected Result");
  });

  test("@performance @timeout @low Timeout test example", async ({ page }) => {
    // Set a very short timeout to demonstrate timeout handling
    test.setTimeout(1000);

    await page.goto("https://httpbin.org/delay/5"); // This will timeout
    await expect(page.locator("body")).toBeVisible();
  });
});

// Enhanced afterEach hook with automatic failure capture
test.afterEach(async ({}, testInfo) => {
  // 🎉 ไม่ต้อง convert เอง! ส่ง testInfo เข้าไปตรงๆ
  // failure capture และ environment info จะถูกดึงอัตโนมัติภายใน

  try {
    await onTestRailHelper.updateTestResultFromPlaywrightSingle(
      "Enhanced Integration Test Run",
      123, // Your section ID
      456, // Your platform ID
      testInfo // ส่ง testInfo เข้าไปตรงๆ
    );
  } catch (error) {
    console.error("Failed to update TestRail:", error);
  }
});

// Example: Manual failure capture and comment enhancement
export async function demonstrateFailureCapture() {
  // Simulate a test failure
  const mockTestInfo = {
    title: "Example failed test",
    status: "failed",
    duration: 5000,
    location: {
      file: "/tests/example.spec.ts",
      line: 42,
      column: 10
    },
    attachments: [
      { name: "screenshot", path: "/screenshots/failure.png" },
      { name: "video", path: "/videos/test-recording.webm" }
    ]
  };

  const mockTestResult = {
    status: "failed",
    duration: 5000,
    error: {
      message: "Expected element to be visible, but it was not found",
      stack: "Error: Expected element to be visible\n    at test (/tests/example.spec.ts:42:10)"
    }
  };

  // Extract failure information
  const failureInfo = FailureCapture.extractFailureInfo(mockTestInfo, mockTestResult, [
    {
      category: "test.step",
      title: "Navigate to login page",
      error: undefined
    },
    {
      category: "test.step",
      title: "Fill username field",
      error: undefined
    },
    {
      category: "test.step",
      title: "Click login button",
      error: { message: "Element not found: #login-button" }
    }
  ]);

  // Create enhanced comment
  const commentEnhancer = new CommentEnhancer(commentConfig);
  const testCaseInfo = {
    title: "Example failed test",
    tags: ["@smoke", "@login", "@high"],
    status: "failed" as const,
    duration: 5000,
    _steps: [
      {
        category: "test.step",
        title: "Navigate to login page",
        error: undefined
      },
      {
        category: "test.step",
        title: "Click login button",
        error: { message: "Element not found: #login-button" }
      }
    ]
  };

  const enhancedComment = commentEnhancer.enhanceComment(testCaseInfo, failureInfo, {
    browser: "chromium",
    browserVersion: "119.0.6045.105",
    os: "macOS",
    nodeVersion: "v18.17.0",
    playwrightVersion: "1.40.0",
    testWorker: "Worker 0"
  });

  console.log("Enhanced Comment:");
  console.log(enhancedComment);

  return {
    failureInfo,
    enhancedComment
  };
}

// Example: Configuring comment enhancement for different environments
export function configureCommentEnhancement(environment: "dev" | "staging" | "prod") {
  const baseConfig: Partial<CommentEnhancementConfig> = {
    includeDuration: true,
    includeTimestamp: true,
    maxCommentLength: 4000
  };

  switch (environment) {
    case "dev":
      return {
        ...baseConfig,
        includeStackTrace: true,
        includeEnvironmentInfo: true,
        customPrefix: "🔧 Development Test"
      };

    case "staging":
      return {
        ...baseConfig,
        includeStackTrace: false,
        includeEnvironmentInfo: true,
        customPrefix: "🧪 Staging Test"
      };

    case "prod":
      return {
        ...baseConfig,
        includeStackTrace: false,
        includeEnvironmentInfo: false,
        customPrefix: "🚀 Production Test"
      };

    default:
      return baseConfig;
  }
}

// Example: Batch processing with enhanced failure capture
export async function batchProcessTestResults(testResults: Array<{ testInfo: unknown; result: unknown }>) {
  const processedResults = [];

  for (const testResult of testResults) {
    // Convert with automatic failure capture และ environment detection
    const testCaseInfo = PlaywrightConverter.convertTestInfo(testResult.testInfo as any, testResult.result as any);
    // ไม่ต้องทำอะไรเพิ่ม - failure info จะถูกดึงอัตโนมัติ

    processedResults.push(testCaseInfo);
  }

  // Update TestRail with all results
  try {
    await onTestRailHelper.updateTestResult(
      "Batch Test Run with Enhanced Failure Capture",
      123, // Section ID
      456, // Platform ID
      processedResults,
      false
    );

    console.log(`Successfully updated ${processedResults.length} test results with enhanced failure capture`);
  } catch (error) {
    console.error("Batch update failed:", error);
  }
}
