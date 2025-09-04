/**
 * ตัวอย่างการ import failed test เข้า TestRail
 * สำหรับ test ที่ failed แล้วต้องการส่งข้อมูลเข้า TestRail ทีหลัง
 */

import { createSimpleFailedTest, createTestCaseFromError, onTestRailHelper, TestInfoAnalyzer } from "../index";

/**
 * ตัวอย่างข้อมูล test ที่ failed (จากที่คุณให้มา)
 */
const failedTestData = {
  title: "All Clients - User is not on the last page behind login",
  status: "failed",
  duration: 33200, // 33.2s
  executedAt: new Date("2025-09-02T14:01:31"),
  executedBy: "Executed by Playwright"
};

/**
 * วิธีที่ 1: ใช้ helper function (ง่ายที่สุด)
 */
export async function importFailedTestSimple() {
  const testCaseInfo = createSimpleFailedTest(failedTestData.title, failedTestData.duration, failedTestData.executedAt);

  await onTestRailHelper.updateTestResultAdvanced(
    "Failed Tests Import - 9/2/2025",
    1995, // เปลี่ยนเป็น section ID จริง
    2, // เปลี่ยนเป็น platform ID จริง (2 = Web Desktop)
    [testCaseInfo]
  );

  console.log("✅ Successfully imported failed test to TestRail");
}

/**
 * วิธีที่ 2: สร้าง error message แบบละเอียด
 */
export async function importFailedTestDetailed() {
  const errorMessage = [
    "❌ Test Failed",
    `⏱️ Duration: ${TestInfoAnalyzer.formatDuration(failedTestData.duration)}`,
    `🕐 Executed: ${failedTestData.executedAt.toLocaleString()}`,
    `🤖 ${failedTestData.executedBy}`,
    "",
    "Test execution completed but failed without specific error details."
  ].join("\n");

  const testCaseInfo = createTestCaseFromError(failedTestData.title, errorMessage, failedTestData.duration, [
    "@allClientPage",
    "@failed"
  ]);

  await onTestRailHelper.updateTestResultAdvanced(
    "Failed Tests Import - 9/2/2025",
    1995, // Section ID
    2, // Platform ID
    [testCaseInfo]
  );

  console.log("✅ Successfully imported detailed failed test to TestRail");
}

/**
 * วิธีที่ 3: จำลอง Playwright TestInfo แล้วใช้ analyzer
 */
export async function importFailedTestFromMockTestInfo() {
  // จำลอง Playwright TestInfo
  const mockTestInfo = {
    title: failedTestData.title,
    status: "failed" as const,
    duration: failedTestData.duration,
    timeout: 30000,

    // จำลอง error information
    result: {
      status: "failed" as const,
      duration: failedTestData.duration,
      error: {
        message: "Test execution failed",
        stack: undefined
      }
    },

    // จำลอง steps
    steps: [
      {
        title: "Navigate to client page",
        category: "test.step",
        duration: 2000
      },
      {
        title: "Check user is not on last page",
        category: "test.step",
        duration: 31200,
        error: {
          message: "Test assertion failed or timed out",
          stack: undefined
        }
      }
    ],

    // จำลอง project info
    project: { name: "chromium" },
    file: "/tests/client.spec.ts",
    line: 25,
    column: 3,
    workerIndex: 0,
    retry: 0
  };

  // ใช้ analyzer แปลงเป็น TestCaseInfo
  const testCaseInfo = TestInfoAnalyzer.convertToTestCaseInfo(mockTestInfo);

  // วิเคราะห์ข้อมูล (สำหรับ debugging)
  const analysis = TestInfoAnalyzer.analyzeTestInfo(mockTestInfo);
  console.log("Test Analysis:", analysis);

  await onTestRailHelper.updateTestResultAdvanced(
    "Failed Tests Import - 9/2/2025",
    1995, // Section ID
    2, // Platform ID
    [testCaseInfo]
  );

  console.log("✅ Successfully imported test using TestInfo analyzer");
}

/**
 * วิธีที่ 4: Batch import หลาย failed tests
 */
export async function importMultipleFailedTests() {
  const failedTests = [
    {
      title: "All Clients - User is not on the last page behind login",
      duration: 33200,
      errorMessage: "Test failed - Duration: 33.2s"
    },
    {
      title: "Login - User cannot access protected page",
      duration: 15000,
      errorMessage: "Authentication failed - Duration: 15.0s"
    },
    {
      title: "Navigation - Menu items not visible",
      duration: 8500,
      errorMessage: "UI elements not found - Duration: 8.5s"
    }
  ];

  const testCaseInfos = failedTests.map((test) =>
    createTestCaseFromError(test.title, test.errorMessage, test.duration, ["@failed", "@batch"])
  );

  await onTestRailHelper.updateTestResultAdvanced(
    "Batch Failed Tests Import - 9/2/2025",
    1995, // Section ID
    2, // Platform ID
    testCaseInfos
  );

  console.log(`✅ Successfully imported ${failedTests.length} failed tests to TestRail`);
}

/**
 * วิธีที่ 5: สร้าง custom error message ตาม context
 */
export async function importFailedTestWithContext() {
  const contextInfo = {
    browser: "Chromium",
    os: "macOS",
    environment: "staging",
    buildNumber: "v1.3.1",
    testSuite: "All Clients Suite"
  };

  const errorMessage = [
    "❌ Test Failed",
    "",
    "**Test Details:**",
    `• Title: ${failedTestData.title}`,
    `• Duration: ${TestInfoAnalyzer.formatDuration(failedTestData.duration)}`,
    `• Executed: ${failedTestData.executedAt.toLocaleString()}`,
    "",
    "**Environment:**",
    `• Browser: ${contextInfo.browser}`,
    `• OS: ${contextInfo.os}`,
    `• Environment: ${contextInfo.environment}`,
    `• Build: ${contextInfo.buildNumber}`,
    `• Test Suite: ${contextInfo.testSuite}`,
    "",
    "**Status:** Test execution completed but failed",
    "**Note:** No specific error message available from test execution"
  ].join("\n");

  const testCaseInfo = createTestCaseFromError(failedTestData.title, errorMessage, failedTestData.duration, [
    "@allClientPage",
    "@staging",
    "@chromium"
  ]);

  await onTestRailHelper.updateTestResultAdvanced(
    "Context Failed Tests - 9/2/2025",
    1995, // Section ID
    2, // Platform ID
    [testCaseInfo]
  );

  console.log("✅ Successfully imported failed test with context to TestRail");
}

/**
 * Main function สำหรับทดสอบ
 */
export async function main() {
  try {
    console.log("Starting failed test import examples...");

    // เลือกวิธีที่ต้องการใช้
    await importFailedTestSimple();
    // await importFailedTestDetailed();
    // await importFailedTestFromMockTestInfo();
    // await importMultipleFailedTests();
    // await importFailedTestWithContext();

    console.log("All imports completed successfully!");
  } catch (error) {
    console.error("Import failed:", error);
  }
}

// Export configuration สำหรับใช้งานจริง
export const TESTRAIL_CONFIG = {
  sectionId: 1995, // เปลี่ยนเป็น section ID จริง
  platformId: 2, // เปลี่ยนเป็น platform ID จริง
  runName: "Failed Tests Import - 9/2/2025"
};

/**
 * Quick helper สำหรับ import test เดียว
 */
export async function quickImportFailedTest(
  title: string,
  duration: number,
  errorMessage?: string,
  sectionId: number = TESTRAIL_CONFIG.sectionId,
  platformId: number = TESTRAIL_CONFIG.platformId
) {
  const testCaseInfo = errorMessage
    ? createTestCaseFromError(title, errorMessage, duration)
    : createSimpleFailedTest(title, duration);

  await onTestRailHelper.updateTestResultAdvanced(TESTRAIL_CONFIG.runName, sectionId, platformId, [testCaseInfo]);

  console.log(`✅ Imported: ${title}`);
}

// ตัวอย่างการใช้งาน quick helper
// await quickImportFailedTest(
//   "All Clients - User is not on the last page behind login",
//   33200,
//   "Test Failed - Duration: 33.2s, Executed: 9/2/2025, 2:01:31 PM"
// );
