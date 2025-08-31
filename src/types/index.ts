/**
 * Core configuration interface for TestRail connection
 */
export interface TestRailConfig {
  /** TestRail instance URL (e.g., https://company.testrail.io) */
  host: string;
  /** TestRail username or email */
  username: string;
  /** TestRail password or API key */
  password: string;
  /** TestRail project ID */
  projectId: number;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Number of retry attempts for failed requests (default: 3) */
  retries?: number;
  /** Enable detailed logging (default: false) */
  enableLogging?: boolean;
}

/**
 * Test case information from Playwright test execution
 */
export interface TestCaseInfo {
  /** Test case title */
  title: string;
  /** Test tags for categorization */
  tags: string[];
  /** Test execution status */
  status: TestStatus;
  /** Test execution duration in milliseconds */
  duration: number;
  /** Test steps (optional) */
  _steps?: TestStep[];
  /** Error information if test failed */
  error?: {
    message: string;
    stack?: string;
  };
}

/**
 * Individual test step information
 */
export interface TestStep {
  /** Step category (e.g., 'test.step') */
  category: string;
  /** Step title/description */
  title: string;
  /** Error information if step failed */
  error?: {
    message: string;
    stack?: string;
  };
}

/**
 * Test execution status types
 */
export type TestStatus = 'passed' | 'failed' | 'skipped' | 'interrupted' | 'timeOut';

/**
 * TestRail test result structure
 */
export interface TestResult {
  /** TestRail test case ID */
  case_id: number;
  /** TestRail status ID (1=passed, 2=blocked, 3=untested, 4=retest, 5=failed) */
  status_id: number;
  /** Assigned user ID */
  assignedto_id: number;
  /** Result comment/description */
  comment: string;
  /** Test execution time in seconds */
  elapsed: number;
}

/**
 * TestRail test run structure
 */
export interface TestRun {
  /** TestRail run ID */
  id: number;
  /** Run name */
  name: string;
  /** Assigned user ID */
  assignedto_id: number;
  /** Include all test cases in project */
  include_all: boolean;
  /** Specific case IDs to include (if include_all is false) */
  case_ids?: number[];
  /** Run description */
  description?: string;
  /** Milestone ID */
  milestone_id?: number;
  /** Suite ID */
  suite_id?: number;
}

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T = unknown> {
  /** HTTP status code */
  statusCode: number;
  /** Response body */
  body: T;
  /** Response headers */
  headers?: Record<string, string>;
}

/**
 * TestRail test case structure
 */
export interface TestCase {
  /** TestRail case ID */
  id: number;
  /** Case title */
  title: string;
  /** Section ID where case belongs */
  section_id: number;
  /** Template ID (1=text, 2=steps, etc.) */
  template_id: number;
  /** Test type ID */
  type_id: number;
  /** Priority ID */
  priority_id: number;
  /** Custom automation type field */
  custom_case_custom_automation_type: number;
  /** Custom platform field */
  custom_case_custom_platform: number;
  /** Test steps (for step-based templates) */
  custom_steps_separated: TestCaseStep[];
  /** Assigned user ID */
  assignedto_id: number;
  /** Case description */
  custom_preconds?: string;
  /** Expected result */
  custom_expected?: string;
}

/**
 * TestRail test case step
 */
export interface TestCaseStep {
  /** Step content/action */
  content: string;
  /** Expected result */
  expected: string;
}

/**
 * TestRail user information
 */
export interface TestRailUser {
  /** User ID */
  id: number;
  /** User email */
  email: string;
  /** User name */
  name: string;
  /** User is active */
  is_active: boolean;
}

/**
 * TestRail section information
 */
export interface TestRailSection {
  /** Section ID */
  id: number;
  /** Section name */
  name: string;
  /** Parent section ID */
  parent_id?: number;
  /** Section depth */
  depth: number;
  /** Display order */
  display_order: number;
}

/**
 * TestRail project information
 */
export interface TestRailProject {
  /** Project ID */
  id: number;
  /** Project name */
  name: string;
  /** Project announcement */
  announcement?: string;
  /** Show announcement */
  show_announcement: boolean;
  /** Project is completed */
  is_completed: boolean;
  /** Completed timestamp */
  completed_on?: number;
  /** Suite mode (1=single, 2=single+baselines, 3=multiple) */
  suite_mode: number;
  /** Default role ID */
  default_role_id: number;
}

/**
 * Options for updating test results
 */
export interface UpdateTestResultsOptions {
  /** Test run name */
  runName: string;
  /** Section ID where tests belong */
  sectionId: number;
  /** Platform ID for test execution */
  platform: number;
  /** Test results to process */
  results: TestCaseInfo[];
  /** Reset existing run if it exists */
  isReset?: boolean;
  /** Custom run description */
  runDescription?: string;
  /** Milestone ID to associate with run */
  milestoneId?: number;
}

/**
 * Error types for better error handling
 */
export class TestRailError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: unknown
  ) {
    super(message);
    this.name = 'TestRailError';
  }
}

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Pagination information for API responses
 */
export interface PaginationInfo {
  /** Offset for pagination */
  offset: number;
  /** Limit for pagination */
  limit: number;
  /** Total count of items */
  size: number;
  /** Links for pagination */
  _links: {
    next?: string;
    prev?: string;
  };
}

/**
 * Paginated API response
 */
export interface PaginatedResponse<T> extends PaginationInfo {
  /** Array of items */
  [key: string]: T[] | number | { next?: string; prev?: string };
}
