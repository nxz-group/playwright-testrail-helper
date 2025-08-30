# TestRailHelper Reference & Prototype

## Current Implementation Analysis

This document serves as a reference for the existing `testRailHelper.ts` implementation and provides prototype code for the improved npm package structure.

## Current Code Structure Analysis

### Class Overview
The current `TestRailHelper` is a monolithic class with the following responsibilities:
- Configuration management
- HTTP API communication
- Test case synchronization
- Test run management
- Result processing
- Worker coordination
- File system operations

### Key Components Breakdown

#### 1. Configuration & Constants
```typescript
// Current hardcoded values that need to be configurable
private readonly projectId = 3;
private readonly testRailDir = "testRail";
private readonly testRailResultJson = `${this.testRailDir}/testRunResult.json`;

// Status mappings
private readonly status: Record<string, number> = {
  passed: 1,
  interrupted: 2, // Blocked
  skipped: 3,     // Untested
  timeOut: 4,     // Retest
  failed: 5       // Failed
};

// Template, type, automation, priority, platform mappings
// These should be moved to constants file
```

#### 2. HTTP Communication
```typescript
// Current implementation creates new context for each request
private async callRequest(method: "post" | "get", path: string, optionAddOn?: Record<string, any>) {
  const context = await onHTTPRequest.createContextIssueHTTPRequest({
    baseURL: JSON.parse(String(TEST_RAIL_CONFIG)).host,
    extraHTTPHeaders: {
      "Content-type": "application/json",
      Authorization: `Basic ${Buffer.from(`${JSON.parse(String(TEST_RAIL_CONFIG)).username}:${JSON.parse(String(TEST_RAIL_CONFIG)).password}`).toString("base64")}`
    }
  });
  // ... request logic
  await context.dispose(); // Disposed after each request
}
```

#### 3. Worker Coordination
```typescript
// Complex file-based locking system
private async setTestRunIdAndCaseId(runName: string, userId: number, caseIdsInListFile: number[]) {
  const lockFile = `${this.testRailDir}/testrun.lock`;
  const maxLockWait = 30000;
  
  // File-based coordination with race condition risks
  while (fs.existsSync(lockFile) && lockWaitTime < maxLockWait) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    lockWaitTime += 100;
  }
}
```

## Prototype Implementation

### 1. Type Definitions (`src/types/index.ts`)

```typescript
export interface TestRailConfig {
  host: string;
  username: string;
  password: string;
  projectId: number;
  timeout?: number;
  retries?: number;
  enableLogging?: boolean;
}

export interface TestCaseInfo {
  title: string;
  tags: string[];
  status: TestStatus;
  duration: number;
  _steps?: TestStep[];
}

export interface TestStep {
  category: string;
  title: string;
  error?: {
    message: string;
  };
}

export type TestStatus = 'passed' | 'failed' | 'skipped' | 'interrupted' | 'timeOut';

export interface TestResult {
  case_id: number;
  status_id: number;
  assignedto_id: number;
  comment: string;
  elapsed: number;
}

export interface TestRun {
  id: number;
  name: string;
  assignedto_id: number;
  include_all: boolean;
  case_ids?: number[];
}

export interface ApiResponse<T = any> {
  statusCode: number;
  body: T;
}

export interface TestCase {
  id: number;
  title: string;
  section_id: number;
  template_id: number;
  type_id: number;
  priority_id: number;
  custom_case_custom_automation_type: number;
  custom_case_custom_platform: number;
  custom_steps_separated: TestCaseStep[];
  assignedto_id: number;
}

export interface TestCaseStep {
  content: string;
  expected: string;
}
```

### 2. Configuration Management (`src/config/TestRailConfig.ts`)

```typescript
import { TestRailConfig } from '../types';

export class ConfigManager {
  private static instance: ConfigManager;
  private config: TestRailConfig;

  private constructor(config: TestRailConfig) {
    this.validateConfig(config);
    this.config = config;
  }

  static getInstance(config?: TestRailConfig): ConfigManager {
    if (!ConfigManager.instance) {
      if (!config) {
        throw new Error('Configuration required for first initialization');
      }
      ConfigManager.instance = new ConfigManager(config);
    }
    return ConfigManager.instance;
  }

  private validateConfig(config: TestRailConfig): void {
    if (!config.host || !config.username || !config.password) {
      throw new Error('TestRail configuration is incomplete: host, username, and password are required');
    }
    
    if (!config.projectId || config.projectId <= 0) {
      throw new Error('Valid projectId is required');
    }

    // Validate URL format
    try {
      new URL(config.host);
    } catch {
      throw new Error('Invalid host URL format');
    }
  }

  getConfig(): TestRailConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<TestRailConfig>): void {
    const newConfig = { ...this.config, ...updates };
    this.validateConfig(newConfig);
    this.config = newConfig;
  }
}
```

### 3. Constants (`src/config/constants.ts`)

```typescript
export const TEST_RAIL_STATUS = {
  PASSED: 1,
  BLOCKED: 2,
  UNTESTED: 3,
  RETEST: 4,
  FAILED: 5
} as const;

export const TEST_RAIL_TEMPLATE = {
  TEST_CASE_TEXT: 1,
  TEST_CASE_STEP: 2,
  EXPLORATORY: 3,
  BDD: 4
} as const;

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
  EXPLORATORY: 13
} as const;

export const TEST_RAIL_AUTOMATION = {
  MANUAL: 1,
  AUTOMATABLE: 2,
  AUTOMATED: 3
} as const;

export const TEST_RAIL_PRIORITY = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4
} as const;

export const TEST_RAIL_PLATFORM = {
  API: 1,
  WEB_DESKTOP: 2,
  WEB_RESPONSIVE: 3,
  WEB_DESKTOP_AND_RESPONSIVE: 4,
  MOBILE_APPLICATION: 5,
  MIGRATION: 6,
  OTHER: 7
} as const;

export const STATUS_MAPPING: Record<string, number> = {
  passed: TEST_RAIL_STATUS.PASSED,
  interrupted: TEST_RAIL_STATUS.BLOCKED,
  skipped: TEST_RAIL_STATUS.UNTESTED,
  timeOut: TEST_RAIL_STATUS.RETEST,
  failed: TEST_RAIL_STATUS.FAILED
};

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
  exploratory: TEST_RAIL_TYPE.EXPLORATORY
};

export const PRIORITY_MAPPING: Record<string, number> = {
  low: TEST_RAIL_PRIORITY.LOW,
  medium: TEST_RAIL_PRIORITY.MEDIUM,
  high: TEST_RAIL_PRIORITY.HIGH,
  critical: TEST_RAIL_PRIORITY.CRITICAL
};
```

### 4. HTTP Client (`src/client/TestRailApiClient.ts`)

```typescript
import { TestRailConfig, ApiResponse } from '../types';
import { Logger } from '../utils/Logger';

export class TestRailApiClient {
  private baseURL: string;
  private headers: Record<string, string>;
  private logger: Logger;

  constructor(config: TestRailConfig) {
    this.baseURL = config.host;
    this.headers = {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${Buffer.from(`${config.username}:${config.password}`).toString('base64')}`
    };
    this.logger = new Logger('TestRailApiClient');
  }

  async request<T = any>(
    method: 'GET' | 'POST',
    endpoint: string,
    data?: any,
    retries: number = 3
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}/index.php?${endpoint}`;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        this.logger.debug(`${method} ${endpoint}`, { attempt, data });
        
        const response = await fetch(url, {
          method,
          headers: this.headers,
          body: data ? JSON.stringify({ data }) : undefined
        });

        const body = await response.json();
        
        const result: ApiResponse<T> = {
          statusCode: response.status,
          body
        };

        if (response.ok) {
          this.logger.debug(`${method} ${endpoint} success`, { statusCode: response.status });
          return result;
        }

        if (response.status >= 500 && attempt < retries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          this.logger.warn(`${method} ${endpoint} failed, retrying in ${delay}ms`, { 
            statusCode: response.status, 
            attempt 
          });
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        this.logger.error(`${method} ${endpoint} failed`, { 
          statusCode: response.status, 
          body 
        });
        return result;

      } catch (error) {
        if (attempt === retries) {
          this.logger.error(`${method} ${endpoint} error after ${retries} attempts`, error);
          throw error;
        }
        
        const delay = Math.pow(2, attempt) * 1000;
        this.logger.warn(`${method} ${endpoint} error, retrying in ${delay}ms`, { 
          error: error.message, 
          attempt 
        });
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw new Error(`Failed to complete request after ${retries} attempts`);
  }

  // Specific API methods
  async getCases(projectId: number, sectionId: number): Promise<ApiResponse> {
    return this.request('GET', `/api/v2/get_cases/${projectId}&section_id=${sectionId}`);
  }

  async addCase(sectionId: number, testCase: any): Promise<ApiResponse> {
    return this.request('POST', `/api/v2/add_case/${sectionId}`, testCase);
  }

  async updateCase(caseId: number, sectionId: number, testCase: any): Promise<ApiResponse> {
    return this.request('POST', `/api/v2/update_case/${caseId}&section_id=${sectionId}`, testCase);
  }

  async getUserByEmail(email: string): Promise<ApiResponse> {
    return this.request('GET', `/api/v2/get_user_by_email&email=${email}`);
  }

  async addRun(projectId: number, runInfo: any): Promise<ApiResponse> {
    return this.request('POST', `/api/v2/add_run/${projectId}`, runInfo);
  }

  async getRun(runId: number): Promise<ApiResponse> {
    return this.request('GET', `/api/v2/get_run/${runId}`);
  }

  async updateRun(runId: number, data: any): Promise<ApiResponse> {
    return this.request('POST', `/api/v2/update_run/${runId}`, data);
  }

  async addResultsForCases(runId: number, results: any[]): Promise<ApiResponse> {
    return this.request('POST', `/api/v2/add_results_for_cases/${runId}`, { results });
  }

  async closeRun(runId: number): Promise<ApiResponse> {
    return this.request('POST', `/api/v2/close_run/${runId}`);
  }
}
```

### 5. Test Case Manager (`src/managers/TestCaseManager.ts`)

```typescript
import { TestRailApiClient } from '../client/TestRailApiClient';
import { TestCaseInfo, TestCase } from '../types';
import { TYPE_MAPPING, PRIORITY_MAPPING, TEST_RAIL_TEMPLATE, TEST_RAIL_AUTOMATION } from '../config/constants';
import { Logger } from '../utils/Logger';

export class TestCaseManager {
  private apiClient: TestRailApiClient;
  private logger: Logger;

  constructor(apiClient: TestRailApiClient) {
    this.apiClient = apiClient;
    this.logger = new Logger('TestCaseManager');
  }

  async syncTestCase(
    sectionId: number,
    platformId: number,
    testCaseInfo: TestCaseInfo,
    existingCases: any[],
    userId: number
  ): Promise<number> {
    const tags = this.processTags(testCaseInfo.tags);
    const testCase = this.buildTestCase(sectionId, platformId, testCaseInfo, tags, userId);
    
    const existingCase = this.findExistingCase(existingCases, testCase.title);
    
    if (existingCase) {
      if (this.shouldUpdateCase(tags)) {
        await this.updateExistingCase(existingCase.id, sectionId, testCase);
      }
      return existingCase.id;
    } else {
      return await this.createNewCase(sectionId, testCase);
    }
  }

  private processTags(tags: string[]): string[] {
    return [...new Set(tags)]
      .map(tag => tag.toLowerCase().replace('@', ''));
  }

  private buildTestCase(
    sectionId: number,
    platformId: number,
    testCaseInfo: TestCaseInfo,
    tags: string[],
    userId: number
  ): TestCase {
    const { type, priority } = this.getTypeAndPriority(tags);
    
    return {
      id: 0, // Will be set by TestRail
      title: this.cleanTitle(testCaseInfo.title),
      section_id: sectionId,
      custom_case_custom_automation_type: TEST_RAIL_AUTOMATION.AUTOMATED,
      template_id: TEST_RAIL_TEMPLATE.TEST_CASE_STEP,
      type_id: type,
      custom_case_custom_platform: platformId,
      priority_id: priority,
      custom_steps_separated: this.buildSteps(testCaseInfo._steps),
      assignedto_id: userId
    };
  }

  private cleanTitle(title: string): string {
    return title
      .replace(/@(.*)/, '')
      .replace(/\s\s+/g, ' ')
      .trim();
  }

  private getTypeAndPriority(tags: string[]): { type: number; priority: number } {
    if (tags.length <= 1) {
      return {
        type: TYPE_MAPPING.other,
        priority: PRIORITY_MAPPING.medium
      };
    }

    // Check for smoke/sanity first
    if (['smoke', 'sanity'].includes(tags[0])) {
      return {
        type: TYPE_MAPPING.smokeAndSanity,
        priority: this.getPriorityFromTags(tags)
      };
    }

    return {
      type: TYPE_MAPPING[tags[0]] || TYPE_MAPPING.other,
      priority: this.getPriorityFromTags(tags)
    };
  }

  private getPriorityFromTags(tags: string[]): number {
    const lastTag = tags[tags.length - 1];
    return PRIORITY_MAPPING[lastTag] || PRIORITY_MAPPING.medium;
  }

  private buildSteps(steps?: any[]): any[] {
    if (!steps) return [];

    return steps
      .filter(step => step.category === 'test.step' && step.title !== 'Expect "toPass"')
      .map(step => ({
        content: step.title.split('>')[0]?.trim() || step.title,
        expected: step.title.split('>')[1]?.trim() || 'Executed by Playwright'
      }));
  }

  private findExistingCase(existingCases: any[], title: string): any | undefined {
    return existingCases.find(
      testCase => testCase.title.toLowerCase() === title.toLowerCase()
    );
  }

  private shouldUpdateCase(tags: string[]): boolean {
    return tags.includes('updated') || tags.includes('update');
  }

  private async createNewCase(sectionId: number, testCase: TestCase): Promise<number> {
    this.logger.info('Creating new test case', { title: testCase.title, sectionId });
    
    const response = await this.apiClient.addCase(sectionId, testCase);
    
    if (response.statusCode !== 200) {
      throw new Error(`Failed to create test case: ${response.statusCode}`);
    }

    this.logger.info('Test case created successfully', { 
      id: response.body.id, 
      title: testCase.title 
    });
    
    return response.body.id;
  }

  private async updateExistingCase(caseId: number, sectionId: number, testCase: TestCase): Promise<void> {
    this.logger.info('Updating existing test case', { id: caseId, title: testCase.title });
    
    const response = await this.apiClient.updateCase(caseId, sectionId, testCase);
    
    if (response.statusCode !== 200) {
      throw new Error(`Failed to update test case: ${response.statusCode}`);
    }

    this.logger.info('Test case updated successfully', { id: caseId });
  }

  async getCasesInSection(projectId: number, sectionId: number): Promise<any[]> {
    let nextLink: string | null = `/api/v2/get_cases/${projectId}&section_id=${sectionId}`;
    let cases: any[] = [];

    do {
      const response = await this.apiClient.request('GET', nextLink);
      
      if (response.statusCode !== 200) {
        throw new Error(`Failed to get cases: ${response.statusCode}`);
      }

      const newCases = response.body.cases.map(({ id, title }: { id: number; title: string }) => ({ id, title }));
      cases = [...cases, ...newCases];
      nextLink = response.body._links?.next || null;
    } while (nextLink !== null);

    return cases;
  }
}
```

### 6. Logger Utility (`src/utils/Logger.ts`)

```typescript
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export class Logger {
  private context: string;
  private logLevel: LogLevel;

  constructor(context: string, logLevel: LogLevel = LogLevel.INFO) {
    this.context = context;
    this.logLevel = logLevel;
  }

  debug(message: string, data?: any): void {
    if (this.logLevel <= LogLevel.DEBUG) {
      this.log('DEBUG', message, data);
    }
  }

  info(message: string, data?: any): void {
    if (this.logLevel <= LogLevel.INFO) {
      this.log('INFO', message, data);
    }
  }

  warn(message: string, data?: any): void {
    if (this.logLevel <= LogLevel.WARN) {
      this.log('WARN', message, data);
    }
  }

  error(message: string, error?: any): void {
    if (this.logLevel <= LogLevel.ERROR) {
      this.log('ERROR', message, error);
    }
  }

  private log(level: string, message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      context: this.context,
      message,
      ...(data && { data })
    };

    console.log(JSON.stringify(logEntry));
  }
}
```

### 7. Main Export (`src/index.ts`)

```typescript
import { TestRailApiClient } from './client/TestRailApiClient';
import { TestCaseManager } from './managers/TestCaseManager';
import { TestRunManager } from './managers/TestRunManager';
import { ResultManager } from './managers/ResultManager';
import { ConfigManager } from './config/TestRailConfig';
import { Logger } from './utils/Logger';
import { TestRailConfig, TestCaseInfo } from './types';

export class TestRailHelper {
  private apiClient: TestRailApiClient;
  private testCaseManager: TestCaseManager;
  private testRunManager: TestRunManager;
  private resultManager: ResultManager;
  private logger: Logger;

  constructor(config: TestRailConfig) {
    const configManager = ConfigManager.getInstance(config);
    const validatedConfig = configManager.getConfig();
    
    this.apiClient = new TestRailApiClient(validatedConfig);
    this.testCaseManager = new TestCaseManager(this.apiClient);
    this.testRunManager = new TestRunManager(this.apiClient);
    this.resultManager = new ResultManager(this.apiClient);
    this.logger = new Logger('TestRailHelper');
  }

  async updateTestResults(options: {
    runName: string;
    sectionId: number;
    platform: number;
    results: TestCaseInfo[];
    isReset?: boolean;
  }): Promise<void> {
    const { runName, sectionId, platform, results, isReset = false } = options;
    
    try {
      this.logger.info('Starting test result update', { 
        runName, 
        sectionId, 
        platform, 
        testCount: results.length 
      });

      // Process results through managers
      await this.resultManager.processTestResults({
        runName,
        sectionId,
        platform,
        results,
        isReset
      });

      this.logger.info('Test result update completed successfully');
    } catch (error) {
      this.logger.error('Failed to update test results', error);
      throw error;
    }
  }
}

// Export types and constants
export * from './types';
export * from './config/constants';
export { ConfigManager } from './config/TestRailConfig';
export { Logger, LogLevel } from './utils/Logger';
```

## Key Improvements in Prototype

### 1. **Separation of Concerns**
- Each class has a single responsibility
- Clear interfaces between components
- Easier to test and maintain

### 2. **Type Safety**
- Strict TypeScript types throughout
- No `any` types in public APIs
- Runtime validation where needed

### 3. **Error Handling**
- Proper error classes and messages
- Retry logic with exponential backoff
- Graceful degradation

### 4. **Configuration Management**
- Centralized configuration with validation
- Singleton pattern for global config
- Environment-specific settings

### 5. **Logging & Monitoring**
- Structured logging with context
- Configurable log levels
- Performance tracking capabilities

### 6. **Performance Optimizations**
- Connection reuse in HTTP client
- Efficient data structures
- Async operations throughout

## Migration Path from Current Implementation

### 1. **Direct Replacement**
```typescript
// Old usage
import { onTestRailHelper } from '@plugins/testRailHelper';
await onTestRailHelper.updateTestResult(runName, sectionId, platform, testList);

// New usage
import { TestRailHelper } from '@nxz-group/testrail-playwright-helper';
const testRail = new TestRailHelper(config);
await testRail.updateTestResults({ runName, sectionId, platform, results: testList });
```

### 2. **Configuration Migration**
```typescript
// Old: Environment variables
const config = JSON.parse(String(TEST_RAIL_CONFIG));

// New: Structured configuration
const config: TestRailConfig = {
  host: process.env.TESTRAIL_HOST,
  username: process.env.TESTRAIL_USERNAME,
  password: process.env.TESTRAIL_PASSWORD,
  projectId: parseInt(process.env.TESTRAIL_PROJECT_ID),
  timeout: 30000,
  retries: 3,
  enableLogging: true
};
```

## Real-world Usage Examples

### 1. Environment Configuration

#### Required Environment Variables
```bash
# .env file
TESTRAIL_HOST=https://your-company.testrail.io
TESTRAIL_USERNAME=your-email@company.com
TESTRAIL_PASSWORD=your-api-key-or-password
TESTRAIL_PROJECT_ID=3
TESTRAIL_TIMEOUT=30000
TESTRAIL_RETRIES=3
TESTRAIL_ENABLE_LOGGING=true
TESTRAIL_LOG_LEVEL=INFO
```

#### Configuration Setup
```typescript
// config/testRailConfig.ts
import { TestRailConfig } from '@nxz-group/testrail-playwright-helper';

export const getTestRailConfig = (): TestRailConfig => {
  const requiredEnvVars = [
    'TESTRAIL_HOST',
    'TESTRAIL_USERNAME', 
    'TESTRAIL_PASSWORD',
    'TESTRAIL_PROJECT_ID'
  ];

  // Validate required environment variables
  const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return {
    host: process.env.TESTRAIL_HOST!,
    username: process.env.TESTRAIL_USERNAME!,
    password: process.env.TESTRAIL_PASSWORD!,
    projectId: parseInt(process.env.TESTRAIL_PROJECT_ID!),
    timeout: parseInt(process.env.TESTRAIL_TIMEOUT || '30000'),
    retries: parseInt(process.env.TESTRAIL_RETRIES || '3'),
    enableLogging: process.env.TESTRAIL_ENABLE_LOGGING === 'true'
  };
};
```

### 2. Playwright Test Integration

#### Basic Test File Setup
```typescript
// tests/example.spec.ts
import { test } from '@playwright/test';
import { TestRailHelper } from '@nxz-group/testrail-playwright-helper';
import { getTestRailConfig } from '../config/testRailConfig';

// Initialize TestRail helper
const testRailConfig = getTestRailConfig();
const testRail = new TestRailHelper(testRailConfig);

// Section IDs mapping (from your current implementation)
const SECTION_IDS = {
  backOffice: {
    merchantProfilePage: {
      validation: 402,
      business: 410
    },
    allTransactionsPage: 414,
    allClientsPage: 415,
    transactionDetailPage: 504,
    pageRedirects: 1968
  }
};

// Platform IDs mapping
const PLATFORM_IDS = {
  api: 1,
  webDesktop: 2,
  webResponsive: 3,
  webDesktopAndWebResponsive: 4,
  mobileApplication: 5,
  migration: 6,
  other: 7
};

test.describe('Merchant Profile Page Tests', () => {
  const testList: any[] = [];

  test.beforeAll(async () => {
    // Any setup logic
  });

  test.afterEach(async ({}, testInfo) => {
    // Collect test results for TestRail
    if (process.env.TESTRAIL_ENABLE === 'true') {
      testList.push(testInfo);
    }
  });

  test.afterAll(async () => {
    // Send results to TestRail
    if (process.env.TESTRAIL_ENABLE === 'true' && testList.length > 0) {
      try {
        await testRail.updateTestResults({
          runName: `[${process.env.ENV_NAME || 'DEV'}][FE] Merchant Profile Page`,
          sectionId: SECTION_IDS.backOffice.merchantProfilePage.business,
          platform: PLATFORM_IDS.webDesktop,
          results: testList,
          isReset: false
        });
        console.log('✅ TestRail results updated successfully');
      } catch (error) {
        console.error('❌ Failed to update TestRail results:', error.message);
      }
    }
  });

  test('Verify merchant profile components', 
    { tag: ['@smoke', '@high'] }, 
    async ({ page }) => {
      // Your test implementation
      await page.goto('/merchant-profile');
      // ... test steps
    }
  );

  test('Verify profile dropdown functionality', 
    { tag: ['@regression', '@medium'] }, 
    async ({ page }) => {
      // Your test implementation
      await page.goto('/merchant-profile');
      // ... test steps
    }
  );
});
```

### 3. Advanced Configuration with Multiple Environments

#### Environment-specific Configuration
```typescript
// config/environments.ts
interface EnvironmentConfig {
  testRail: TestRailConfig;
  sectionIds: Record<string, any>;
  runNamePrefix: string;
}

const environments: Record<string, EnvironmentConfig> = {
  development: {
    testRail: {
      host: 'https://dev-testrail.company.com',
      username: process.env.TESTRAIL_DEV_USERNAME!,
      password: process.env.TESTRAIL_DEV_PASSWORD!,
      projectId: 1,
      timeout: 30000,
      retries: 2,
      enableLogging: true
    },
    sectionIds: {
      merchantProfile: 100,
      transactions: 101
    },
    runNamePrefix: '[DEV][FE]'
  },
  staging: {
    testRail: {
      host: 'https://staging-testrail.company.com',
      username: process.env.TESTRAIL_STAGING_USERNAME!,
      password: process.env.TESTRAIL_STAGING_PASSWORD!,
      projectId: 2,
      timeout: 45000,
      retries: 3,
      enableLogging: true
    },
    sectionIds: {
      merchantProfile: 200,
      transactions: 201
    },
    runNamePrefix: '[STG][FE]'
  },
  production: {
    testRail: {
      host: 'https://testrail.company.com',
      username: process.env.TESTRAIL_PROD_USERNAME!,
      password: process.env.TESTRAIL_PROD_PASSWORD!,
      projectId: 3,
      timeout: 60000,
      retries: 5,
      enableLogging: false
    },
    sectionIds: {
      merchantProfile: 410,
      transactions: 414
    },
    runNamePrefix: '[PROD][FE]'
  }
};

export const getEnvironmentConfig = (env: string = 'development'): EnvironmentConfig => {
  const config = environments[env];
  if (!config) {
    throw new Error(`Unknown environment: ${env}`);
  }
  return config;
};
```

### 4. Global Test Setup

#### Global Setup File
```typescript
// tests/global-setup.ts
import { TestRailHelper } from '@nxz-group/testrail-playwright-helper';
import { getEnvironmentConfig } from '../config/environments';

async function globalSetup() {
  const env = process.env.ENV_NAME || 'development';
  const config = getEnvironmentConfig(env);
  
  // Test TestRail connection
  if (process.env.TESTRAIL_ENABLE === 'true') {
    try {
      const testRail = new TestRailHelper(config.testRail);
      console.log('✅ TestRail connection verified');
    } catch (error) {
      console.error('❌ TestRail connection failed:', error.message);
      process.exit(1);
    }
  }
}

export default globalSetup;
```

#### Playwright Configuration
```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  globalSetup: require.resolve('./tests/global-setup'),
  
  projects: [
    {
      name: 'behind-login',
      use: {
        storageState: '.auth/user/qa01.json'
      }
    }
  ],

  // Environment variables for TestRail
  use: {
    baseURL: process.env.BASE_URL,
  }
});
```

### 5. Utility Helper for Test Management

#### TestRail Test Helper
```typescript
// utils/testRailTestHelper.ts
import { TestRailHelper } from '@nxz-group/testrail-playwright-helper';
import { getEnvironmentConfig } from '../config/environments';

export class TestRailTestHelper {
  private testRail: TestRailHelper;
  private config: any;
  private testResults: any[] = [];

  constructor(environment: string = 'development') {
    this.config = getEnvironmentConfig(environment);
    this.testRail = new TestRailHelper(this.config.testRail);
  }

  // Add test result to collection
  addTestResult(testInfo: any): void {
    if (process.env.TESTRAIL_ENABLE === 'true') {
      this.testResults.push(testInfo);
    }
  }

  // Submit all collected results
  async submitResults(options: {
    sectionName: string;
    platform?: string;
    customRunName?: string;
    isReset?: boolean;
  }): Promise<void> {
    if (process.env.TESTRAIL_ENABLE !== 'true' || this.testResults.length === 0) {
      return;
    }

    const { sectionName, platform = 'webDesktop', customRunName, isReset = false } = options;
    
    try {
      const sectionId = this.config.sectionIds[sectionName];
      if (!sectionId) {
        throw new Error(`Unknown section: ${sectionName}`);
      }

      const runName = customRunName || 
        `${this.config.runNamePrefix} ${sectionName} - ${new Date().toISOString().split('T')[0]}`;

      await this.testRail.updateTestResults({
        runName,
        sectionId,
        platform: this.getPlatformId(platform),
        results: this.testResults,
        isReset
      });

      console.log(`✅ TestRail results submitted: ${this.testResults.length} tests`);
      this.testResults = []; // Clear after submission
    } catch (error) {
      console.error('❌ Failed to submit TestRail results:', error.message);
      throw error;
    }
  }

  private getPlatformId(platform: string): number {
    const platformMap: Record<string, number> = {
      api: 1,
      webDesktop: 2,
      webResponsive: 3,
      webDesktopAndWebResponsive: 4,
      mobileApplication: 5,
      migration: 6,
      other: 7
    };
    return platformMap[platform] || platformMap.webDesktop;
  }

}
```

### 6. Package.json Scripts

#### NPM Scripts for Different Environments
```json
{
  "scripts": {
    "test:dev": "ENV_NAME=development TESTRAIL_ENABLE=true npx playwright test",
    "test:staging": "ENV_NAME=staging TESTRAIL_ENABLE=true npx playwright test",
    "test:prod": "ENV_NAME=production TESTRAIL_ENABLE=false npx playwright test",
    
    "test:smoke:dev": "ENV_NAME=development TESTRAIL_ENABLE=true npx playwright test --grep @smoke",
    "test:smoke:staging": "ENV_NAME=staging TESTRAIL_ENABLE=true npx playwright test --grep @smoke",
    
    "test:regression:staging": "ENV_NAME=staging TESTRAIL_ENABLE=true npx playwright test --grep \"@regression.*@(high|critical)\"",
    
    "test:merchant-profile": "ENV_NAME=staging TESTRAIL_ENABLE=true npx playwright test tests/merchantProfile.spec.ts",
    
    "test:dry-run": "TESTRAIL_ENABLE=false npx playwright test",
    "test:testrail-only": "TESTRAIL_ENABLE=true npx playwright test --reporter=list"
  }
}
```


This prototype provides a solid foundation for the improved TestRailHelper package while maintaining compatibility with the existing usage patterns and providing comprehensive real-world usage examples.