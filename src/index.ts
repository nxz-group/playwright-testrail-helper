/**
 * TestRail Playwright Helper - Main exports
 *
 * Production-ready TestRail integration package with comprehensive features:
 * - Type-safe API client with retry logic and error handling
 * - Multi-worker coordination and synchronization
 * - Performance monitoring and optimization
 * - Security auditing and validation
 * - Migration tools and backward compatibility
 * - Production deployment utilities
 */

// HTTP Client
export { TestRailApiClient } from './client/TestRailApiClient';
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
// Worker Coordination
export { WorkerCoordinator } from './coordination/WorkerCoordinator';
export type { ValidationCheck, ValidationResult } from './deployment/ProductionValidator';
// Week 4 Production Features - Deployment Validation
export { ProductionValidator } from './deployment/ProductionValidator';
export { ResultManager } from './managers/ResultManager';
// Manager classes
export { TestCaseManager } from './managers/TestCaseManager';
export { TestRunManager } from './managers/TestRunManager';
export type { LegacyConfig, MigrationResult } from './migration/LegacyMigrator';
// Week 4 Production Features - Migration Tools
export { LegacyMigrator } from './migration/LegacyMigrator';
export type { BenchmarkResult, BenchmarkSuite } from './performance/PerformanceBenchmark';
// Week 4 Production Features - Performance Benchmarking
export { PerformanceBenchmark } from './performance/PerformanceBenchmark';
export type { SecurityAuditResult, SecurityIssue } from './security/SecurityAuditor';
// Week 4 Production Features - Security
export { SecurityAuditor } from './security/SecurityAuditor';
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
export { PerformanceMonitor } from './utils/PerformanceMonitor';
