/**
 * TestRail Playwright Helper - Main exports
 *
 * This is the development version with core infrastructure components.
 * Full TestRailHelper class and API integration coming in future releases.
 */

// HTTP Client
export { TestRailApiClient } from './client/TestRailApiClient';
// Constants and mappings
export * from './config/constants';
// Re-export commonly used constants for convenience
export {
  PRIORITY_MAPPING,
  STATUS_MAPPING,
  TEST_RAIL_PLATFORM,
  TEST_RAIL_PRIORITY,
  TEST_RAIL_STATUS,
  TEST_RAIL_TYPE,
  TYPE_MAPPING,
} from './config/constants';
// Configuration management
export { ConfigManager } from './config/TestRailConfig';
// Week 3 Advanced Features - Worker Coordination
export { WorkerCoordinator } from './coordination/WorkerCoordinator';
export { ResultManager } from './managers/ResultManager';
// Manager classes
export { TestCaseManager } from './managers/TestCaseManager';
export { TestRunManager } from './managers/TestRunManager';
// Type definitions
export * from './types';
export {
  BatchProcessor,
  createBatchProcessor,
  RateLimitedBatchProcessor,
} from './utils/BatchProcessor';
export { CacheManager, globalCache } from './utils/CacheManager';
export { CircuitBreaker, CircuitBreakerState } from './utils/CircuitBreaker';
export { ErrorCategory, ErrorHandler, ErrorSeverity } from './utils/ErrorHandler';
// Utilities
export { FileUtils } from './utils/FileUtils';
export { Logger } from './utils/Logger';
// Week 3 Advanced Features - Performance & Optimization
export { PerformanceMonitor } from './utils/PerformanceMonitor';
