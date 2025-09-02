# API Documentation

> 📚 **Navigation:** [← Back to README](../README.md) | [Quick Start →](QUICK_START.md) | [Examples →](EXAMPLES.md)

## Overview

TestRail Helper provides a layered API design with three main functions:

```typescript
// 🎯 Primary API - Playwright (most users)
updateTestResult(testInfos[])        // Batch Playwright tests (recommended)
updateTestResultSingle(testInfo)     // Single Playwright test

// 🔧 Advanced API - Custom control  
updateTestResultAdvanced(TestCaseInfo[])  // Full control for power users
```

---

## Primary API (Playwright)

### `updateTestResult(runName, sectionId, platformId, testInfos, isReset?)`

**Purpose:** Batch update test results from Playwright TestInfo objects

**Parameters:**
- `runName` (string) - Name of the test run in TestRail
- `sectionId` (number) - TestRail section ID where test cases belong
- `platformId` (number) - Platform identifier for test execution
- `testInfos` (unknown[]) - Array of Playwright TestInfo objects
- `isReset` (boolean, optional) - Whether to reset existing test run data (default: false)

**Features:**
- ✅ Automatic conversion from Playwright TestInfo to TestRail format
- ✅ Handles parallel worker coordination
- ✅ Built-in error handling and validation
- ✅ Supports both `testInfo` and `{testInfo, testResult}` object formats

**Example:**
```typescript
const testResults: TestInfo[] = [];

test.afterEach(async ({ }, testInfo) => {
  testResults.push(testInfo);
});

test.afterAll(async () => {
  await onTestRailHelper.updateTestResult(
    "Regression Test Run",
    123,           // Section ID
    1,             // Platform ID (e.g., Chrome)
    testResults
  );
});
```

---

### `updateTestResultSingle(runName, sectionId, platformId, testInfo, isReset?)`

**Purpose:** Update a single test result from Playwright TestInfo

**Parameters:**
- `runName` (string) - Name of the test run in TestRail
- `sectionId` (number) - TestRail section ID where test cases belong
- `platformId` (number) - Platform identifier for test execution
- `testInfo` (unknown) - Single Playwright TestInfo object
- `isReset` (boolean, optional) - Whether to reset existing test run data (default: false)

**Use Case:** When you want to update results immediately after each test

**Example:**
```typescript
test.afterEach(async ({ }, testInfo) => {
  await onTestRailHelper.updateTestResultSingle(
    "Live Test Run",
    123,        // Section ID
    1,          // Platform ID
    testInfo
  );
});
```

---

## Advanced API (Any Framework)

### `updateTestResultAdvanced(runName, sectionId, platformId, testList, isReset?)`

**Purpose:** Update test results with full control over test data format

**Parameters:**
- `runName` (string) - Name of the test run in TestRail
- `sectionId` (number) - TestRail section ID where test cases belong
- `platformId` (number) - Platform identifier for test execution
- `testList` (TestCaseInfo[]) - Array of custom test case information
- `isReset` (boolean, optional) - Whether to reset existing test run data (default: false)

**Use Cases:**
- 🔧 Non-Playwright testing frameworks (Jest, Mocha, Cypress)
- 🔧 Custom test data transformation
- 🔧 Advanced error message formatting
- 🔧 Custom field mapping and metadata
- 🔧 Manual test case creation/updates

**TestCaseInfo Interface:**
```typescript
interface TestCaseInfo {
  title: string;
  status: TestStatus;
  comment?: string;
  duration?: number;
  // Add any custom fields you need
  [key: string]: any;
}
```

**Example - Current Project Pattern:**
```typescript
const testList: TestCaseInfo[] = [];

test.afterEach(async ({ }, testInfo) => {
  const customTestCase: TestCaseInfo = {
    title: testInfo.title,
    status: customStatusMapping(testInfo.status),
    comment: enhanceErrorMessage(testInfo.error),
    duration: testInfo.duration,
    // Custom fields
    environment: process.env.TEST_ENV,
    retryCount: testInfo.retry,
    browserName: testInfo.project.name
  };
  testList.push(customTestCase);
});

test.afterAll(async () => {
  await onTestRailHelper.updateTestResultAdvanced(
    "Custom Test Run",
    123,
    1,
    testList
  );
});
```

**Example - Jest Integration:**
```typescript
// Convert Jest results to TestCaseInfo format
const jestResults: TestCaseInfo[] = jestTestResults.map(result => ({
  title: result.fullName,
  status: result.status === 'passed' ? TestStatus.PASSED : TestStatus.FAILED,
  comment: result.failureMessage || '',
  duration: result.duration,
  // Jest-specific fields
  ancestorTitles: result.ancestorTitles,
  location: result.location
}));

await onTestRailHelper.updateTestResultAdvanced(
  "Jest Test Run",
  123,
  1, 
  jestResults
);
```

---

## Constants & Enums

### TestStatus
```typescript
enum TestStatus {
  PASSED = 1,
  BLOCKED = 2,
  UNTESTED = 3,
  RETEST = 4,
  FAILED = 5,
  SKIPPED = 6
}
```

### Platform
```typescript
enum Platform {
  CHROME = 1,
  FIREFOX = 2,
  SAFARI = 3,
  EDGE = 4,
  MOBILE_CHROME = 5,
  MOBILE_SAFARI = 6
}
```

### Priority
```typescript
enum Priority {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  CRITICAL = 4
}
```

---

## Error Handling

All API methods throw `TestRailError` for:
- ❌ Invalid parameters (validation failures)
- ❌ TestRail API failures
- ❌ Network connectivity issues
- ❌ Authentication problems

**Example Error Handling:**
```typescript
try {
  await onTestRailHelper.updateTestResult(runName, sectionId, platformId, testResults);
} catch (error) {
  if (error instanceof TestRailError) {
    console.error('TestRail operation failed:', error.message);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

---

## Best Practices

### 1. Choose the Right API Level
- **Most users:** Use `updateTestResult()` for Playwright
- **Single tests:** Use `updateTestResultSingle()` for immediate updates  
- **Advanced users:** Use `updateTestResultAdvanced()` for custom control

### 2. Batch vs Single Updates
- **Batch (recommended):** Better performance, worker coordination
- **Single:** Immediate feedback, simpler debugging

### 3. Error Handling
- Always wrap API calls in try-catch blocks
- Log errors appropriately for debugging
- Consider retry logic for network failures

### 4. Performance Tips
- Use batch updates when possible
- Avoid unnecessary `isReset=true` calls
- Cache section and platform IDs

### 5. Custom Data Enhancement
```typescript
// Good: Add meaningful context
const enhancedTestCase: TestCaseInfo = {
  title: testInfo.title,
  status: TestStatus.FAILED,
  comment: `
    Error: ${testInfo.error?.message}
    Browser: ${testInfo.project.name}
    Environment: ${process.env.TEST_ENV}
    Retry: ${testInfo.retry}/${testInfo.project.retries}
  `,
  duration: testInfo.duration
};
```
--
-

## 📚 Related Documentation

- **[← Back to README](../README.md)** - Main documentation
- **[Quick Start Guide](QUICK_START.md)** - Get started in minutes
- **[Examples](EXAMPLES.md)** - Comprehensive usage examples
- **[Environment Variables](ENVIRONMENT_VARIABLES.md)** - Configuration guide
- **[Integration Examples](INTEGRATION_EXAMPLES.md)** - CI/CD & framework examples
- **[Quick Reference](QUICK_REFERENCE.md)** - Cheat sheet for common tasks