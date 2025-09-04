/**
 * Core module - Optimized for serial execution
 * No worker coordination, no file persistence, minimal parsing
 * Target bundle size: ~25k (70% reduction from full version)
 */
export { onTestRailHelper } from './core-helper';
export { TestStatus, Platform, Priority, TestType, TestTemplate, AutomationType } from './utils/constants';
export type { TestCaseInfo, TestResult } from './types';
