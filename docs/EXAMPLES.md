# Usage Examples

> 📚 **Navigation:** [← Back to README](../README.md) | [API Reference →](API.md) | [Quick Start →](QUICK_START.md)

## 🎯 Playwright Examples (Primary Use Cases)

### Example 1: Basic Batch Update (Recommended)

```typescript
import { test } from '@playwright/test';
import { onTestRailHelper } from 'your-testrail-helper';

const testResults: TestInfo[] = [];

test.afterEach(async ({ }, testInfo) => {
  // Collect all test results
  testResults.push(testInfo);
});

test.afterAll(async () => {
  // Batch update to TestRail
  await onTestRailHelper.updateTestResult(
    "Regression Test Run - Chrome",  // Run name
    123,                             // Section ID
    1,                               // Platform ID (Chrome)
    testResults                      // All collected results
  );
});

test('Login functionality', async ({ page }) => {
  // Your test code here
});

test('Dashboard loading', async ({ page }) => {
  // Your test code here
});
```

### Example 2: Single Test Update (Immediate Feedback)

```typescript
import { test } from '@playwright/test';
import { onTestRailHelper } from 'your-testrail-helper';

test.afterEach(async ({ }, testInfo) => {
  // Update TestRail immediately after each test
  await onTestRailHelper.updateTestResultSingle(
    "Live Test Execution",
    123,        // Section ID
    1,          // Platform ID
    testInfo
  );
});

test('Critical payment flow', async ({ page }) => {
  // Your test code here
});
```

### Example 3: Multi-Platform Testing

```typescript
import { test, devices } from '@playwright/test';
import { onTestRailHelper, Platform } from 'your-testrail-helper';

// Configure multiple projects
export default defineConfig({
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});

// In your test file
const testResults: TestInfo[] = [];

test.afterEach(async ({ }, testInfo) => {
  testResults.push(testInfo);
});

test.afterAll(async () => {
  // Determine platform based on project name
  const platformMap = {
    'chromium': Platform.CHROME,
    'firefox': Platform.FIREFOX, 
    'webkit': Platform.SAFARI
  };
  
  const platformId = platformMap[testInfo.project.name] || Platform.CHROME;
  
  await onTestRailHelper.updateTestResult(
    `Cross-Browser Test Run - ${testInfo.project.name}`,
    123,
    platformId,
    testResults
  );
});
```

---

## 🔧 Advanced Examples (Custom Control)

### Example 4: Current Project Pattern (Manual Collection)

```typescript
import { test } from '@playwright/test';
import { onTestRailHelper, TestStatus, type TestCaseInfo } from 'your-testrail-helper';

const testList: TestCaseInfo[] = [];

// Custom status mapping function
function mapPlaywrightStatus(status: string): TestStatus {
  switch (status) {
    case 'passed': return TestStatus.PASSED;
    case 'failed': return TestStatus.FAILED;
    case 'skipped': return TestStatus.SKIPPED;
    case 'timedOut': return TestStatus.FAILED;
    default: return TestStatus.UNTESTED;
  }
}

// Custom error message enhancement
function enhanceErrorMessage(testInfo: TestInfo): string {
  if (!testInfo.error) return '';
  
  return `
    🚨 Test Failed: ${testInfo.error.message}
    
    📍 Location: ${testInfo.location?.file}:${testInfo.location?.line}
    🌐 Browser: ${testInfo.project.name}
    🔄 Retry: ${testInfo.retry}/${testInfo.project.retries}
    ⏱️ Duration: ${testInfo.duration}ms
    🏷️ Environment: ${process.env.TEST_ENV || 'unknown'}
    
    📋 Stack Trace:
    ${testInfo.error.stack}
  `.trim();
}

test.afterEach(async ({ }, testInfo) => {
  // Manual conversion with custom enhancements
  const customTestCase: TestCaseInfo = {
    title: testInfo.title,
    status: mapPlaywrightStatus(testInfo.status),
    comment: enhanceErrorMessage(testInfo),
    duration: testInfo.duration,
    
    // Custom metadata
    browserName: testInfo.project.name,
    retryCount: testInfo.retry,
    environment: process.env.TEST_ENV,
    testFile: testInfo.location?.file,
    executionDate: new Date().toISOString()
  };
  
  testList.push(customTestCase);
});

test.afterAll(async () => {
  await onTestRailHelper.updateTestResultAdvanced(
    "Enhanced Test Run with Custom Data",
    123,
    1,
    testList
  );
});
```

### Example 5: Jest Integration

```typescript
// jest-testrail-reporter.js
import { onTestRailHelper, TestStatus, type TestCaseInfo } from 'your-testrail-helper';

class TestRailReporter {
  constructor(globalConfig, options) {
    this.testResults = [];
    this.runName = options.runName || 'Jest Test Run';
    this.sectionId = options.sectionId;
    this.platformId = options.platformId || 1;
  }

  onTestResult(test, testResult) {
    // Convert Jest results to TestCaseInfo
    testResult.testResults.forEach(result => {
      const testCase: TestCaseInfo = {
        title: result.fullName,
        status: this.mapJestStatus(result.status),
        comment: this.formatJestError(result),
        duration: result.duration || 0,
        
        // Jest-specific metadata
        ancestorTitles: result.ancestorTitles,
        location: result.location,
        numPassingAsserts: result.numPassingAsserts
      };
      
      this.testResults.push(testCase);
    });
  }

  async onRunComplete() {
    // Send all results to TestRail
    await onTestRailHelper.updateTestResultAdvanced(
      this.runName,
      this.sectionId,
      this.platformId,
      this.testResults
    );
  }

  mapJestStatus(status) {
    switch (status) {
      case 'passed': return TestStatus.PASSED;
      case 'failed': return TestStatus.FAILED;
      case 'skipped': return TestStatus.SKIPPED;
      case 'pending': return TestStatus.UNTESTED;
      default: return TestStatus.UNTESTED;
    }
  }

  formatJestError(result) {
    if (result.status !== 'failed') return '';
    
    return `
      ❌ Jest Test Failed
      
      📝 Failure Messages:
      ${result.failureMessages.join('\n\n')}
      
      ⏱️ Duration: ${result.duration}ms
      📊 Assertions: ${result.numPassingAsserts} passed
    `.trim();
  }
}

module.exports = TestRailReporter;
```

### Example 6: Cypress Integration

```typescript
// cypress/support/testrail.ts
import { onTestRailHelper, TestStatus, type TestCaseInfo } from 'your-testrail-helper';

const testResults: TestCaseInfo[] = [];

// Cypress hooks
afterEach(function() {
  const testCase: TestCaseInfo = {
    title: this.currentTest.title,
    status: this.currentTest.state === 'passed' ? TestStatus.PASSED : TestStatus.FAILED,
    comment: this.currentTest.err ? this.currentTest.err.message : '',
    duration: this.currentTest.duration,
    
    // Cypress-specific data
    browser: Cypress.browser.name,
    viewport: `${Cypress.config('viewportWidth')}x${Cypress.config('viewportHeight')}`,
    baseUrl: Cypress.config('baseUrl')
  };
  
  testResults.push(testCase);
});

after(() => {
  // Send results after all tests in spec
  cy.task('updateTestRail', {
    runName: 'Cypress E2E Tests',
    sectionId: 123,
    platformId: 1,
    testResults: testResults
  });
});

// In cypress/plugins/index.js
module.exports = (on, config) => {
  on('task', {
    async updateTestRail({ runName, sectionId, platformId, testResults }) {
      await onTestRailHelper.updateTestResultAdvanced(
        runName,
        sectionId, 
        platformId,
        testResults
      );
      return null;
    }
  });
};
```

---

## 🛠️ Configuration Examples

### Example 7: Environment-Based Configuration

```typescript
// testrail.config.ts
interface TestRailConfig {
  runName: string;
  sectionId: number;
  platformId: number;
  isReset: boolean;
}

function getTestRailConfig(): TestRailConfig {
  const env = process.env.NODE_ENV || 'development';
  
  const configs = {
    development: {
      runName: `Dev Test Run - ${new Date().toISOString()}`,
      sectionId: 100, // Dev section
      platformId: 1,
      isReset: true
    },
    staging: {
      runName: `Staging Test Run - ${process.env.BUILD_NUMBER}`,
      sectionId: 200, // Staging section  
      platformId: 1,
      isReset: false
    },
    production: {
      runName: `Production Smoke Tests - ${process.env.RELEASE_VERSION}`,
      sectionId: 300, // Production section
      platformId: 1,
      isReset: false
    }
  };
  
  return configs[env] || configs.development;
}

// Usage in tests
test.afterAll(async () => {
  const config = getTestRailConfig();
  
  await onTestRailHelper.updateTestResult(
    config.runName,
    config.sectionId,
    config.platformId,
    testResults,
    config.isReset
  );
});
```

### Example 8: Parallel Worker Coordination

```typescript
// playwright.config.ts
export default defineConfig({
  workers: 4, // Run tests in parallel
  // ... other config
});

// In your test files
const testResults: TestInfo[] = [];

test.afterEach(async ({ }, testInfo) => {
  testResults.push(testInfo);
});

test.afterAll(async () => {
  // TestRail Helper automatically handles worker coordination
  // All workers will contribute their results to the same test run
  await onTestRailHelper.updateTestResult(
    "Parallel Test Execution",
    123,
    1,
    testResults
  );
  
  console.log(`Worker ${process.env.TEST_WORKER_INDEX} completed`);
});
```

---

## 🚨 Error Handling Examples

### Example 9: Robust Error Handling

```typescript
import { TestRailError } from 'your-testrail-helper';

test.afterAll(async () => {
  try {
    await onTestRailHelper.updateTestResult(
      "Test Run with Error Handling",
      123,
      1,
      testResults
    );
    console.log('✅ TestRail update successful');
    
  } catch (error) {
    if (error instanceof TestRailError) {
      console.error('❌ TestRail operation failed:', error.message);
      
      // Log to external monitoring service
      await logToMonitoring('testrail_update_failed', {
        error: error.message,
        runName: "Test Run with Error Handling",
        testCount: testResults.length
      });
      
    } else {
      console.error('❌ Unexpected error:', error);
    }
    
    // Don't fail the test run due to TestRail issues
    console.log('⚠️ Continuing despite TestRail update failure');
  }
});
```

### Example 10: Retry Logic

```typescript
async function updateTestRailWithRetry(
  runName: string,
  sectionId: number, 
  platformId: number,
  testResults: TestInfo[],
  maxRetries = 3
) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await onTestRailHelper.updateTestResult(runName, sectionId, platformId, testResults);
      console.log(`✅ TestRail update successful on attempt ${attempt}`);
      return;
      
    } catch (error) {
      console.log(`❌ Attempt ${attempt} failed:`, error.message);
      
      if (attempt === maxRetries) {
        console.error('❌ All retry attempts failed');
        throw error;
      }
      
      // Wait before retry (exponential backoff)
      const delay = Math.pow(2, attempt) * 1000;
      console.log(`⏳ Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Usage
test.afterAll(async () => {
  await updateTestRailWithRetry("Retry Test Run", 123, 1, testResults);
});
```---


## 📚 Related Documentation

- **[← Back to README](../README.md)** - Main documentation
- **[API Reference](API.md)** - Complete API documentation
- **[Quick Start Guide](QUICK_START.md)** - Get started in minutes
- **[Environment Variables](ENVIRONMENT_VARIABLES.md)** - Configuration guide
- **[Integration Examples](INTEGRATION_EXAMPLES.md)** - CI/CD & framework examples
- **[Quick Reference](QUICK_REFERENCE.md)** - Cheat sheet for common tasks