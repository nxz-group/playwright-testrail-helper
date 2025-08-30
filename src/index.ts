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

// Utilities
export { FileUtils } from './utils/FileUtils';
export { Logger } from './utils/Logger';

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