/**
 * ตัวอย่างการส่ง failed test ของคุณเข้า TestRail
 * พร้อมรายละเอียดว่า failed ที่ step ไหนและเพราะอะไร
 */

import { onTestRailHelper } from "../index.js";
import type { TestCaseInfo } from "../types/index.js";

/**
 * สร้าง TestCaseInfo สำหรับ test ที่คุณต้องการส่ง
 * "All Clients - User is not on the last page behind login"
 */
export function createYourFailedTest(): TestCaseInfo {
  return {
    title: "All Clients - User is not on the last page behind login",
    status: "failed",
    duration: 33200, // 33.2 seconds
    tags: ["@allClientPage", "@login"],

    // ข้อมูล failure หลัก
    _failureInfo: {
      errorMessage: "Test failed at step: Check user is not on last page behind login",
      errorStack: undefined, // ใส่ stack trace ถ้ามี
      failedStep: "Check user is not on last page behind login",
      location: undefined, // ใส่ location ถ้ามี
      screenshot: undefined, // ใส่ path ของ screenshot ถ้ามี
      video: undefined, // ใส่ path ของ video ถ้ามี
      trace: undefined // ใส่ path ของ trace ถ้ามี
    },

    // รายละเอียด steps ทั้งหมด (สมมติ)
    _steps: [
      {
        category: "test.step",
        title: "Navigate to All Clients page"
        // step นี้สำเร็จ - ไม่มี error
      },
      {
        category: "test.step",
        title: "Perform login authentication"
        // step นี้สำเร็จ - ไม่มี error
      },
      {
        category: "test.step",
        title: "Check user is not on last page behind login",
        error: {
          message: "Expected condition not met - user appears to be on last page or login state unclear"
        }
      }
    ]
  };
}

/**
 * ส่ง test เข้า TestRail
 */
export async function importYourFailedTest() {
  const testCase = createYourFailedTest();

  try {
    await onTestRailHelper.updateTestResultAdvanced(
      "Failed Tests Import - 9/2/2025", // ชื่อ run
      YOUR_SECTION_ID, // เปลี่ยนเป็น section ID จริง
      YOUR_PLATFORM_ID, // เปลี่ยนเป็น platform ID จริง
      [testCase]
    );

    console.log("✅ Successfully imported your failed test to TestRail");
    console.log("📋 Test Details:");
    console.log(`   Title: ${testCase.title}`);
    console.log(`   Duration: ${testCase.duration}ms (33.2s)`);
    console.log(`   Failed Step: ${testCase._failureInfo?.failedStep}`);
    console.log(`   Error: ${testCase._failureInfo?.errorMessage}`);
  } catch (error) {
    console.error("❌ Failed to import test:", error);
  }
}

/**
 * ตัวอย่าง comment ที่จะปรากฏใน TestRail:
 *
 * Executed by Playwright
 * ❌ Test Failed
 * **Error:** Test failed at step: Check user is not on last page behind login
 *
 * 🎯 **Failed at Step:** Check user is not on last page behind login
 *
 * ⏱️ **Duration:** 33.2s
 * 🕐 **Executed:** 9/2/2025, 2:01:31 PM
 *
 * 📋 **Test Steps:**
 * 1. ✅ Navigate to All Clients page
 * 2. ✅ Perform login authentication
 * 3. ❌ Check user is not on last page behind login
 *    **❌ Failed:** Expected condition not met - user appears to be on last page or login state unclear
 *
 * 🚨 **Failed Steps Summary:** 1 out of 3 steps failed
 * • Step 3: Check user is not on last page behind login - Expected condition not met - user appears to be on last page or login state unclear
 */

/**
 * Configuration - เปลี่ยนค่าเหล่านี้ให้ตรงกับ TestRail ของคุณ
 */
const YOUR_SECTION_ID = 1995; // เปลี่ยนเป็น section ID จริง
const YOUR_PLATFORM_ID = 2; // เปลี่ยนเป็น platform ID จริง (2 = Web Desktop)

/**
 * Quick import function
 */
export async function quickImportYourTest() {
  await importYourFailedTest();
}

// ใช้งาน:
// import { quickImportYourTest } from './src/examples/your-failed-test.example.js';
// await quickImportYourTest();
