/**
 * ตัวอย่างการสร้าง TestCaseInfo ที่แสดงรายละเอียด failed steps
 * สำหรับการส่งเข้า TestRail พร้อมข้อมูลว่า failed ที่ step ไหนและเพราะอะไร
 */

import { onTestRailHelper, TestInfoAnalyzer } from "../index";
import type { TestCaseInfo } from "../types/index";

/**
 * สร้าง TestCaseInfo พร้อมรายละเอียด failed steps
 */
export function createDetailedFailedTest(): TestCaseInfo {
  return {
    title: "All Clients - User is not on the last page behind login",
    status: "failed",
    duration: 33200,
    tags: ["@allClientPage", "@login"],

    // ข้อมูล failure หลัก
    _failureInfo: {
      errorMessage: "Test failed at step: Check user is not on last page",
      errorStack: "Error: locator.toBeVisible: Expected element to be visible\n    at /tests/client.spec.ts:25:3",
      failedStep: "Check user is not on last page behind login",
      location: {
        file: "/tests/client.spec.ts",
        line: 25,
        column: 3
      },
      screenshot: "/screenshots/failed-test.png",
      video: "/videos/test-recording.webm",
      trace: "/traces/test-trace.zip"
    },

    // รายละเอียด steps ทั้งหมด
    _steps: [
      {
        category: "test.step",
        title: "Navigate to client page"
        // step นี้สำเร็จ - ไม่มี error
      },
      {
        category: "test.step",
        title: "Login with valid credentials"
        // step นี้สำเร็จ - ไม่มี error
      },
      {
        category: "test.step",
        title: "Check user is not on last page behind login",
        error: {
          message: "Expected element '.not-last-page' to be visible, but it was not found"
        }
      },
      {
        category: "test.step",
        title: "Verify page navigation",
        error: {
          message: "Cannot verify navigation - previous step failed"
        }
      }
    ]
  };
}

/**
 * สร้าง TestCaseInfo สำหรับ timeout failure
 */
export function createTimeoutFailedTest(): TestCaseInfo {
  return {
    title: "Page Load - Wait for elements to appear",
    status: "timeOut",
    duration: 30000,
    tags: ["@pageLoad", "@timeout"],

    _failureInfo: {
      errorMessage: "Test timed out waiting for element to appear",
      errorStack: "TimeoutError: Timeout 30000ms exceeded\n    at /tests/pageload.spec.ts:15:5",
      failedStep: "Wait for main content to load",
      location: {
        file: "/tests/pageload.spec.ts",
        line: 15,
        column: 5
      },
      screenshot: "/screenshots/timeout-test.png",
      video: "/videos/timeout-recording.webm",
      trace: "/traces/timeout-trace.zip"
    },

    _steps: [
      {
        category: "test.step",
        title: "Navigate to page"
        // สำเร็จ
      },
      {
        category: "test.step",
        title: "Wait for main content to load",
        error: {
          message: "locator.waitFor: Timeout 30000ms exceeded waiting for element '.main-content' to be visible"
        }
      }
    ]
  };
}

/**
 * สร้าง TestCaseInfo สำหรับ assertion failure
 */
export function createAssertionFailedTest(): TestCaseInfo {
  return {
    title: "Form Validation - Check error messages",
    status: "failed",
    duration: 5500,
    tags: ["@form", "@validation"],

    _failureInfo: {
      errorMessage: "Assertion failed: Expected error message not displayed",
      errorStack:
        "AssertionError: Expected 'Please enter a valid email' but got 'Field is required'\n    at /tests/form.spec.ts:30:8",
      failedStep: "Verify email validation error message",
      location: {
        file: "/tests/form.spec.ts",
        line: 30,
        column: 8
      },
      screenshot: "/screenshots/assertion-failed.png",
      video: undefined,
      trace: undefined
    },

    _steps: [
      {
        category: "test.step",
        title: "Fill form with invalid email"
        // สำเร็จ
      },
      {
        category: "test.step",
        title: "Submit form"
        // สำเร็จ
      },
      {
        category: "test.step",
        title: "Verify email validation error message",
        error: {
          message: "Expected text 'Please enter a valid email' but found 'Field is required'"
        }
      }
    ]
  };
}

/**
 * สร้าง TestCaseInfo จาก mock Playwright TestInfo ที่มี detailed steps
 */
export function createFromMockPlaywrightTestInfo(): TestCaseInfo {
  const mockTestInfo = {
    title: "All Clients - User is not on the last page behind login",
    status: "failed" as const,
    duration: 33200,
    timeout: 30000,

    result: {
      status: "failed" as const,
      duration: 33200,
      error: {
        message: "Test failed at assertion step",
        stack: "Error: Expected element to be visible\n    at /tests/client.spec.ts:25:3"
      }
    },

    steps: [
      {
        title: "Navigate to client page",
        category: "test.step",
        duration: 2000
        // ไม่มี error = สำเร็จ
      },
      {
        title: "Login with credentials",
        category: "test.step",
        duration: 1500
        // ไม่มี error = สำเร็จ
      },
      {
        title: "Check user is not on last page behind login",
        category: "test.step",
        duration: 29700,
        error: {
          message: "locator.toBeVisible: Expected element '.not-last-page' to be visible but it was not found",
          stack:
            "Error: locator.toBeVisible: Expected element '.not-last-page' to be visible\n    at /tests/client.spec.ts:25:3"
        }
      }
    ],

    attachments: [
      {
        name: "screenshot",
        path: "/screenshots/failed-client-test.png",
        contentType: "image/png"
      },
      {
        name: "video",
        path: "/videos/client-test.webm",
        contentType: "video/webm"
      }
    ],

    project: { name: "chromium" },
    file: "/tests/client.spec.ts",
    line: 25,
    column: 3,
    workerIndex: 0
  };

  return TestInfoAnalyzer.convertToTestCaseInfo(mockTestInfo);
}

/**
 * ตัวอย่างการส่งเข้า TestRail พร้อมรายละเอียด failed steps
 */
export async function importDetailedFailedTests() {
  const testCases = [
    createDetailedFailedTest(),
    createTimeoutFailedTest(),
    createAssertionFailedTest(),
    createFromMockPlaywrightTestInfo()
  ];

  console.log("Importing tests with detailed failure information...");

  for (const testCase of testCases) {
    try {
      await onTestRailHelper.updateTestResultAdvanced(
        "Detailed Failed Tests - 9/2/2025",
        1995, // Section ID
        2, // Platform ID
        [testCase]
      );

      console.log(`✅ Imported: ${testCase.title}`);

      // แสดงข้อมูล failed steps
      if (testCase._steps) {
        const failedSteps = testCase._steps.filter((step) => step.error);
        if (failedSteps.length > 0) {
          console.log(`   Failed Steps: ${failedSteps.length}`);
          failedSteps.forEach((step, index) => {
            console.log(`   ${index + 1}. ${step.title}: ${step.error?.message}`);
          });
        }
      }
    } catch (error) {
      console.error(`❌ Failed to import: ${testCase.title}`, error);
    }
  }
}

/**
 * Helper function สำหรับสร้าง failed test พร้อม step details
 */
export function createFailedTestWithSteps(
  title: string,
  duration: number,
  steps: Array<{
    title: string;
    success: boolean;
    errorMessage?: string;
    duration?: number;
  }>,
  mainErrorMessage?: string
): TestCaseInfo {
  const failedStep = steps.find((step) => !step.success);

  return {
    title,
    status: "failed",
    duration,
    tags: ["@detailed"],

    _failureInfo: {
      errorMessage: mainErrorMessage || failedStep?.errorMessage || "Test failed",
      errorStack: undefined,
      failedStep: failedStep?.title,
      location: undefined,
      screenshot: undefined,
      video: undefined,
      trace: undefined
    },

    _steps: steps.map((step) => ({
      category: "test.step",
      title: step.title,
      error: step.success
        ? undefined
        : {
            message: step.errorMessage || "Step failed"
          }
    }))
  };
}

/**
 * ตัวอย่างการใช้ helper function
 */
export async function exampleUsage() {
  const testCase = createFailedTestWithSteps(
    "All Clients - User is not on the last page behind login",
    33200,
    [
      { title: "Navigate to client page", success: true, duration: 2000 },
      { title: "Login with credentials", success: true, duration: 1500 },
      {
        title: "Check user is not on last page behind login",
        success: false,
        errorMessage: "Expected element '.not-last-page' to be visible but not found",
        duration: 29700
      }
    ],
    "Test failed at step: Check user is not on last page behind login"
  );

  await onTestRailHelper.updateTestResultAdvanced(
    "Example Failed Test - 9/2/2025",
    1995, // Section ID
    2, // Platform ID
    [testCase]
  );

  console.log("✅ Example test imported with detailed step information");
}

/**
 * ตัวอย่าง comment ที่จะปรากฏใน TestRail:
 *
 * Executed by Playwright
 * ❌ Test Failed
 * **Error:** Test failed at step: Check user is not on last page behind login
 * **Failed Step:** Check user is not on last page behind login
 * **Location:** /tests/client.spec.ts:25:3
 * **Attachments:** 📸 Screenshot, 🎥 Video, 🔍 Trace
 *
 * ⏱️ **Duration:** 33.2s
 * 🕐 **Executed:** 9/2/2025, 2:01:31 PM
 *
 * 📋 **Test Steps:**
 * 1. ✅ Navigate to client page
 * 2. ✅ Login with credentials
 * 3. ❌ Check user is not on last page behind login
 *    **❌ Failed:** Expected element '.not-last-page' to be visible but not found
 *    **⏱️ Duration:** 29.7s
 *
 * 🚨 **Failed Steps Summary:** 1 out of 3 steps failed
 * • Step 3: Check user is not on last page behind login - Expected element '.not-last-page' to be visible but not found
 */
