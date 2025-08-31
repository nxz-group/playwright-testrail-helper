/**
 * TestRail Playwright Helper - Main exports
 * 
 * This is the development version with core infrastructure components.
 * Full TestRailHelper class and API integration coming in future releases.
 */

// Type definitions
export * from './types';

// Configuration management
export { ConfigManager } from './config/TestRailConfig';

// Constants and mappings
export * from './config/constants';

// HTTP Client
export { TestRailApiClient } from './client/TestRailApiClient';

// Manager classes
export { TestCaseManager } from './managers/TestCaseManager';
export { TestRunManager } from './managers/TestRunManager';
export { ResultManager } from './managers/ResultManager';

// Utilities
export { FileUtils } from './utils/FileUtils';
export { Logger } from './utils/Logger';
export { CircuitBreaker, CircuitBreakerState } from './utils/CircuitBreaker';
export { ErrorHandler, ErrorSeverity, ErrorCategory } from './utils/ErrorHandler';

// Week 3 Advanced Features - Worker Coordination
export { WorkerCoordinator } from './coordination/WorkerCoordinator';

// Week 3 Advanced Features - Performance & Optimization
export { PerformanceMonitor } from './utils/PerformanceMonitor';
export { CacheManager, globalCache } from './utils/CacheManager';
export { BatchProcessor, createBatchProcessor, RateLimitedBatchProcessor } from './utils/BatchProcessor';

// Re-export commonly used constants for convenience
export {
  TEST_RAIL_STATUS,
  TEST_RAIL_PLATFORM,
  TEST_RAIL_TYPE,
  TEST_RAIL_PRIORITY,
  STATUS_MAPPING,
  TYPE_MAPPING,
  PRIORITY_MAPPING
} from './config/constants';