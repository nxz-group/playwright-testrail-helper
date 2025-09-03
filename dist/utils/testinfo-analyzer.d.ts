/**
 * TestInfo Analyzer - วิเคราะห์และดึงข้อมูล error จาก Playwright TestInfo
 */
import type { TestCaseInfo } from "../types/index";
import type { FailureInfo } from "./failure-capture";
/**
 * Interface สำหรับ Playwright TestInfo (simplified)
 */
export interface PlaywrightTestInfo {
    title: string;
    status?: "passed" | "failed" | "timedOut" | "skipped" | "interrupted";
    duration?: number;
    timeout?: number;
    errors?: Array<{
        message: string;
        stack?: string;
        location?: {
            file: string;
            line: number;
            column: number;
        };
    }>;
    result?: {
        status: "passed" | "failed" | "timedOut" | "skipped" | "interrupted";
        duration: number;
        error?: {
            message: string;
            stack?: string;
        };
    };
    steps?: Array<{
        title: string;
        category?: string;
        error?: {
            message: string;
            stack?: string;
        };
        duration?: number;
    }>;
    attachments?: Array<{
        name: string;
        path?: string;
        contentType?: string;
    }>;
    project?: {
        name: string;
    };
    file?: string;
    line?: number;
    column?: number;
    workerIndex?: number;
    retry?: number;
}
/**
 * Utility class สำหรับวิเคราะห์ Playwright TestInfo
 */
export declare class TestInfoAnalyzer {
    /**
     * ดึง error message จาก TestInfo ตามลำดับความสำคัญ
     */
    static extractErrorMessage(testInfo: PlaywrightTestInfo): string;
    /**
     * สร้าง default error message จาก status และ context
     */
    static generateDefaultErrorMessage(testInfo: PlaywrightTestInfo): string;
    /**
     * ทำความสะอาด error message
     */
    static cleanErrorMessage(message: string): string;
    /**
     * Format duration เป็น human readable
     */
    static formatDuration(ms: number): string;
    /**
     * ดึง failed step information
     */
    static extractFailedStep(testInfo: PlaywrightTestInfo): string | undefined;
    /**
     * ดึง location information
     */
    static extractLocation(testInfo: PlaywrightTestInfo): {
        file: string;
        line: number;
        column: number;
    } | undefined;
    /**
     * ดึง attachment information
     */
    static extractAttachments(testInfo: PlaywrightTestInfo): {
        screenshot?: string;
        video?: string;
        trace?: string;
    };
    /**
     * สร้าง FailureInfo จาก TestInfo
     */
    static createFailureInfo(testInfo: PlaywrightTestInfo): FailureInfo;
    /**
     * แปลง Playwright TestInfo เป็น TestCaseInfo พร้อม error handling ที่ดีขึ้น
     */
    static convertToTestCaseInfo(testInfo: PlaywrightTestInfo): TestCaseInfo;
    /**
     * Normalize status เป็น format ที่ TestCaseInfo ต้องการ
     */
    static normalizeStatus(status: string): TestCaseInfo["status"];
    /**
     * Extract tags จาก TestInfo (simple implementation)
     */
    static extractTags(testInfo: PlaywrightTestInfo): string[];
    /**
     * วิเคราะห์ TestInfo และแสดงข้อมูลสำคัญ (สำหรับ debugging)
     */
    static analyzeTestInfo(testInfo: PlaywrightTestInfo): {
        title: string;
        status: string;
        duration: string;
        errorMessage: string;
        failedStep?: string;
        hasAttachments: boolean;
        workerInfo?: string;
    };
}
/**
 * Helper function สำหรับสร้าง TestCaseInfo จาก error message อย่างง่าย
 */
export declare function createTestCaseFromError(title: string, errorMessage: string, duration?: number, tags?: string[]): TestCaseInfo;
/**
 * Helper function สำหรับสร้าง TestCaseInfo จากข้อมูลพื้นฐาน
 */
export declare function createSimpleFailedTest(title: string, duration: number, executedAt?: Date): TestCaseInfo;
