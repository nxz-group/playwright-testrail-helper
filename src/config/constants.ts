/**
 * TestRail status constants
 */
export const TEST_RAIL_STATUS = {
  PASSED: 1,
  BLOCKED: 2,
  UNTESTED: 3,
  RETEST: 4,
  FAILED: 5,
} as const;

/**
 * TestRail template constants
 */
export const TEST_RAIL_TEMPLATE = {
  TEST_CASE_TEXT: 1,
  TEST_CASE_STEP: 2,
  EXPLORATORY: 3,
  BDD: 4,
} as const;

/**
 * TestRail test type constants
 */
export const TEST_RAIL_TYPE = {
  ACCEPTANCE: 1,
  ACCESSIBILITY: 2,
  AUTOMATED: 3,
  COMPATIBILITY: 4,
  DESTRUCTIVE: 5,
  FUNCTIONAL: 6,
  OTHER: 7,
  PERFORMANCE: 8,
  REGRESSION: 9,
  SECURITY: 10,
  SMOKE_AND_SANITY: 11,
  USABILITY: 12,
  EXPLORATORY: 13,
} as const;

/**
 * TestRail automation type constants
 */
export const TEST_RAIL_AUTOMATION = {
  MANUAL: 1,
  AUTOMATABLE: 2,
  AUTOMATED: 3,
} as const;

/**
 * TestRail priority constants
 */
export const TEST_RAIL_PRIORITY = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
} as const;

/**
 * TestRail platform constants
 */
export const TEST_RAIL_PLATFORM = {
  API: 1,
  WEB_DESKTOP: 2,
  WEB_RESPONSIVE: 3,
  WEB_DESKTOP_AND_RESPONSIVE: 4,
  MOBILE_APPLICATION: 5,
  MIGRATION: 6,
  OTHER: 7,
} as const;

/**
 * Mapping from test status strings to TestRail status IDs
 */
export const STATUS_MAPPING: Record<string, number> = {
  passed: TEST_RAIL_STATUS.PASSED,
  interrupted: TEST_RAIL_STATUS.BLOCKED,
  skipped: TEST_RAIL_STATUS.UNTESTED,
  timeOut: TEST_RAIL_STATUS.RETEST,
  failed: TEST_RAIL_STATUS.FAILED,
} as const;

/**
 * Mapping from test type tags to TestRail type IDs
 */
export const TYPE_MAPPING: Record<string, number> = {
  acceptance: TEST_RAIL_TYPE.ACCEPTANCE,
  accessibility: TEST_RAIL_TYPE.ACCESSIBILITY,
  automated: TEST_RAIL_TYPE.AUTOMATED,
  compatibility: TEST_RAIL_TYPE.COMPATIBILITY,
  destructive: TEST_RAIL_TYPE.DESTRUCTIVE,
  functional: TEST_RAIL_TYPE.FUNCTIONAL,
  other: TEST_RAIL_TYPE.OTHER,
  performance: TEST_RAIL_TYPE.PERFORMANCE,
  regression: TEST_RAIL_TYPE.REGRESSION,
  security: TEST_RAIL_TYPE.SECURITY,
  smokeAndSanity: TEST_RAIL_TYPE.SMOKE_AND_SANITY,
  usability: TEST_RAIL_TYPE.USABILITY,
  exploratory: TEST_RAIL_TYPE.EXPLORATORY,
} as const;

/**
 * Mapping from priority tags to TestRail priority IDs
 */
export const PRIORITY_MAPPING: Record<string, number> = {
  low: TEST_RAIL_PRIORITY.LOW,
  medium: TEST_RAIL_PRIORITY.MEDIUM,
  high: TEST_RAIL_PRIORITY.HIGH,
  critical: TEST_RAIL_PRIORITY.CRITICAL,
} as const;

/**
 * Default values for various TestRail fields
 */
export const DEFAULTS = {
  TEMPLATE_ID: TEST_RAIL_TEMPLATE.TEST_CASE_STEP,
  TYPE_ID: TEST_RAIL_TYPE.OTHER,
  PRIORITY_ID: TEST_RAIL_PRIORITY.MEDIUM,
  AUTOMATION_TYPE: TEST_RAIL_AUTOMATION.AUTOMATED,
  PLATFORM_ID: TEST_RAIL_PLATFORM.OTHER,
  REQUEST_TIMEOUT: 30000,
  MAX_RETRIES: 3,
  RETRY_DELAY_BASE: 1000,
} as const;

/**
 * API endpoint patterns
 */
export const API_ENDPOINTS = {
  GET_CASES: '/api/v2/get_cases/{project_id}&section_id={section_id}',
  ADD_CASE: '/api/v2/add_case/{section_id}',
  UPDATE_CASE: '/api/v2/update_case/{case_id}&section_id={section_id}',
  GET_USER_BY_EMAIL: '/api/v2/get_user_by_email&email={email}',
  ADD_RUN: '/api/v2/add_run/{project_id}',
  GET_RUN: '/api/v2/get_run/{run_id}',
  UPDATE_RUN: '/api/v2/update_run/{run_id}',
  ADD_RESULTS_FOR_CASES: '/api/v2/add_results_for_cases/{run_id}',
  CLOSE_RUN: '/api/v2/close_run/{run_id}',
  GET_PROJECT: '/api/v2/get_project/{project_id}',
  GET_SECTIONS: '/api/v2/get_sections/{project_id}',
  GET_MILESTONES: '/api/v2/get_milestones/{project_id}',
} as const;

/**
 * HTTP status codes for common responses
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;

/**
 * Retry configuration
 */
export const RETRY_CONFIG = {
  RETRYABLE_STATUS_CODES: [
    HTTP_STATUS.TOO_MANY_REQUESTS,
    HTTP_STATUS.INTERNAL_SERVER_ERROR,
    HTTP_STATUS.BAD_GATEWAY,
    HTTP_STATUS.SERVICE_UNAVAILABLE,
    HTTP_STATUS.GATEWAY_TIMEOUT,
  ],
  EXPONENTIAL_BASE: 2,
  MAX_DELAY: 30000,
  JITTER_FACTOR: 0.1,
} as const;

/**
 * Validation patterns
 */
export const VALIDATION = {
  EMAIL_PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  URL_PATTERN: /^https?:\/\/.+/,
  MAX_TITLE_LENGTH: 250,
  MAX_COMMENT_LENGTH: 1000000,
  MAX_STEP_CONTENT_LENGTH: 1000000,
} as const;
