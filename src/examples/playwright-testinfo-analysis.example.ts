/**
 * Playwright TestInfo และ TestInfoError Analysis
 *
 * ตัวอย่างการวิเคราะห์โครงสร้างข้อมูลของ Playwright TestInfo และ Error
 * เพื่อเข้าใจวิธีการดึง error message และข้อมูลอื่นๆ
 */

import { test } from "@playwright/test";
import { PlaywrightConverter } from "../utils/playwright-converter";

/**
 * โครงสร้างของ Playwright TestInfo (จริง)
 */
interface PlaywrightTestInfo {
  // Basic test information
  title: string; // "User can login with valid credentials"
  file: string; // "/path/to/test.spec.ts"
  line: number; // 15
  column: number; // 5

  // Test execution status
  status?: "passed" | "failed" | "timedOut" | "skipped" | "interrupted";
  duration?: number; // Duration in milliseconds

  // Timing information
  startTime?: Date;
  endTime?: Date;

  // Test configuration
  project?: {
    name: string; // "chromium", "firefox", "webkit"
    use?: {
      browserName?: string;
      headless?: boolean;
      viewport?: { width: number; height: number };
    };
  };

  // Test annotations and metadata
  annotations?: Array<{
    type: string; // "tag", "slow", "fixme", etc.
    description?: string;
  }>;

  // Test attachments (screenshots, videos, traces)
  attachments?: Array<{
    name: string; // "screenshot", "video", "trace"
    path?: string; // File path
    body?: Buffer; // File content
    contentType?: string; // MIME type
  }>;

  // Test errors (สำคัญสำหรับการดึง error message)
  errors?: Array<{
    message: string; // Error message
    stack?: string; // Stack trace
    location?: {
      file: string;
      line: number;
      column: number;
    };
  }>;

  // Test steps (รายละเอียดการทำงานของ test)
  steps?: Array<{
    title: string; // "Click login button"
    category?: string; // "test.step", "hook", "fixture"
    startTime?: Date;
    duration?: number;
    error?: {
      message: string;
      stack?: string;
    };
    steps?: Array<any>; // Nested steps
  }>;

  // Test result details
  result?: {
    status: "passed" | "failed" | "timedOut" | "skipped" | "interrupted";
    duration: number;
    error?: {
      message: string;
      stack?: string;
    };
  };

  // Worker information
  workerIndex?: number; // 0, 1, 2, etc.
  parallelIndex?: number;

  // Retry information
  retry?: number; // 0 for first attempt, 1+ for retries

  // Timeout configuration
  timeout?: number; // Test timeout in milliseconds
}

/**
 * ตัวอย่างการวิเคราะห์ TestInfo สำหรับ Failed Test
 */
export function analyzeFailedTestInfo() {
  // ตัวอย่าง TestInfo ของ test ที่ failed
  const failedTestInfo: PlaywrightTestInfo = {
    title: "All Clients - User is not on the last page behind login",
    file: "/path/to/test.spec.ts",
    line: 25,
    column: 3,
    status: "failed",
    duration: 33200, // 33.2 seconds
    startTime: new Date("2025-09-02T14:01:31.000Z"),
    endTime: new Date("2025-09-02T14:02:04.200Z"),

    project: {
      name: "chromium",
      use: {
        browserName: "chromium",
        headless: false,
        viewport: { width: 1280, height: 720 }
      }
    },

    // Error information - หลายแหล่งที่เป็นไปได้
    errors: [
      {
        message: "Timeout 30000ms exceeded.",
        stack: "Error: Timeout 30000ms exceeded.\n    at /path/to/test.spec.ts:25:3",
        location: {
          file: "/path/to/test.spec.ts",
          line: 25,
          column: 3
        }
      }
    ],

    // Steps with error details
    steps: [
      {
        title: "Navigate to login page",
        category: "test.step",
        startTime: new Date("2025-09-02T14:01:31.100Z"),
        duration: 1500
      },
      {
        title: "Fill username field",
        category: "test.step",
        startTime: new Date("2025-09-02T14:01:32.600Z"),
        duration: 500
      },
      {
        title: "Click login button",
        category: "test.step",
        startTime: new Date("2025-09-02T14:01:33.100Z"),
        duration: 30000,
        error: {
          message: "locator.click: Timeout 30000ms exceeded.",
          stack: "Error: locator.click: Timeout 30000ms exceeded.\n    at ..."
        }
      }
    ],

    // Test result summary
    result: {
      status: "failed",
      duration: 33200,
      error: {
        message: "Test failed due to timeout",
        stack: "..."
      }
    },

    // Attachments (screenshots, videos, etc.)
    attachments: [
      {
        name: "screenshot",
        path: "/path/to/screenshot.png",
        contentType: "image/png"
      },
      {
        name: "video",
        path: "/path/to/video.webm",
        contentType: "video/webm"
      },
      {
        name: "trace",
        path: "/path/to/trace.zip",
        contentType: "application/zip"
      }
    ],

    workerIndex: 0,
    retry: 0,
    timeout: 30000
  };

  return failedTestInfo;
}

/**
 * วิธีการดึง Error Message จาก TestInfo (ตามลำดับความสำคัญ)
 */
export function extractErrorMessage(testInfo: PlaywrightTestInfo): string {
  // 1. จาก result.error (ข้อมูลหลัก)
  if (testInfo.result?.error?.message) {
    return testInfo.result.error.message;
  }

  // 2. จาก errors array (ข้อมูลรายละเอียด)
  if (testInfo.errors && testInfo.errors.length > 0) {
    return testInfo.errors[0].message;
  }

  // 3. จาก failed step (ข้อมูลจาก step ที่ล้มเหลว)
  if (testInfo.steps) {
    const failedStep = testInfo.steps.find((step) => step.error);
    if (failedStep?.error?.message) {
      return failedStep.error.message;
    }
  }

  // 4. สร้าง error message จาก status และ duration
  if (testInfo.status === "failed") {
    return `Test failed after ${testInfo.duration || 0}ms`;
  }

  if (testInfo.status === "timedOut") {
    return `Test timed out after ${testInfo.timeout || 30000}ms`;
  }

  if (testInfo.status === "interrupted") {
    return "Test was interrupted during execution";
  }

  // 5. Default fallback
  return "Test failed without specific error message";
}

/**
 * ตัวอย่างการใช้งานจริงใน afterEach hook
 */
export function exampleUsageInAfterEach() {
  test.afterEach(async ({}, testInfo) => {
    // วิเคราะห์ TestInfo
    console.log("=== TestInfo Analysis ===");
    console.log("Title:", testInfo.title);
    console.log("Status:", testInfo.status);
    console.log("Duration:", testInfo.duration);

    // ดึง error message
    const errorMessage = extractErrorMessage(testInfo as any);
    console.log("Error Message:", errorMessage);

    // แสดง steps ที่มี error
    if (testInfo.steps) {
      const failedSteps = testInfo.steps.filter((step) => step.error);
      console.log(
        "Failed Steps:",
        failedSteps.map((s) => ({
          title: s.title,
          error: s.error?.message
        }))
      );
    }

    // แสดง attachments
    if (testInfo.attachments) {
      console.log(
        "Attachments:",
        testInfo.attachments.map((a) => ({
          name: a.name,
          path: a.path
        }))
      );
    }

    // Convert เป็น TestCaseInfo สำหรับ TestRail
    const testCaseInfo = PlaywrightConverter.convertTestInfo(testInfo as any);
    console.log("Converted TestCaseInfo:", testCaseInfo);
  });
}

/**
 * ตัวอย่าง TestInfo สำหรับแต่ละ status
 */
export const testInfoExamples = {
  // Passed test
  passed: {
    title: "User can login successfully",
    status: "passed" as const,
    duration: 2500,
    errors: [],
    steps: [
      { title: "Navigate to login", category: "test.step", duration: 800 },
      { title: "Fill credentials", category: "test.step", duration: 500 },
      { title: "Click login", category: "test.step", duration: 1200 }
    ]
  },

  // Failed test
  failed: {
    title: "User cannot login with invalid credentials",
    status: "failed" as const,
    duration: 15000,
    errors: [{ message: "Expected element to be visible, but it was not" }],
    steps: [
      { title: "Navigate to login", category: "test.step", duration: 800 },
      {
        title: "Verify error message",
        category: "test.step",
        duration: 14200,
        error: { message: "locator.toBeVisible: Expected element to be visible" }
      }
    ]
  },

  // Timeout test
  timedOut: {
    title: "Page load test",
    status: "timedOut" as const,
    duration: 30000,
    timeout: 30000,
    errors: [{ message: "Test timeout of 30000ms exceeded" }],
    steps: [
      {
        title: "Wait for page load",
        category: "test.step",
        duration: 30000,
        error: { message: "page.waitForLoadState: Timeout 30000ms exceeded" }
      }
    ]
  },

  // Interrupted test
  interrupted: {
    title: "Browser crash test",
    status: "interrupted" as const,
    duration: 5000,
    errors: [{ message: "Browser process crashed" }],
    steps: [
      { title: "Start test", category: "test.step", duration: 1000 },
      {
        title: "Browser operation",
        category: "test.step",
        duration: 4000,
        error: { message: "Target page, context or browser has been closed" }
      }
    ]
  }
};

/**
 * Helper function สำหรับสร้าง TestCaseInfo จาก error message ง่ายๆ
 */
export function createFailedTestCase(title: string, errorMessage: string, duration = 0) {
  return {
    title,
    status: "failed" as const,
    duration,
    tags: [],
    _failureInfo: {
      errorMessage,
      errorStack: undefined,
      failedStep: undefined,
      location: undefined,
      screenshot: undefined,
      video: undefined,
      trace: undefined
    }
  };
}
