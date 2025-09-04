# TestRail Helper

A comprehensive TestRail integration library designed primarily for **Playwright** with advanced support for any testing framework.

## 🎯 Primary Framework: Playwright
- **Automatic conversion** from Playwright TestInfo to TestRail format
- **Parallel worker support** for Playwright's parallel execution
- **Built-in error handling** and retry logic

## 🔧 Advanced Framework Support
- **Jest, Mocha, Cypress** and any custom testing framework
- **Full control** over test data transformation
- **Custom field mapping** and metadata enhancement

---



## 📦 Installation

### Git Installation (Recommended)

```bash
# SSH (Recommended)
npm install git+ssh://git@github.com/nxz-group/playwright-testrail-helper.git#v1.4.2

# HTTPS (Alternative)
npm install git+https://github.com/nxz-group/playwright-testrail-helper.git#v1.4.2
```

### Local Development

```bash
# Clone and link locally
git clone git@github.com:nxz-group/playwright-testrail-helper.git
cd playwright-testrail-helper
npm install
npm link

# In your project
npm link playwright-testrail-helper
```

## ⚙️ Environment Setup

Required environment variables:

```bash
TEST_RAIL_HOST=https://your-company.testrail.io
TEST_RAIL_USERNAME=your-email@company.com
TEST_RAIL_PASSWORD=your-api-key
TEST_RAIL_PROJECT_ID=123

# Optional
TEST_RAIL_DIR=testRail                    # Default: "testRail"
TEST_RAIL_EXECUTED_BY="Executed by CI"   # Default: "Executed by Playwright"
```

### 🔄 Migration from Old Library

If you're migrating from an older TestRail library:

```bash
# OLD library (still supported for backward compatibility)
TEST_RAIL_ENDPOINT=https://your-company.testrail.io  # ⚠️ Deprecated

# NEW library (recommended)
TEST_RAIL_HOST=https://your-company.testrail.io      # ✅ Use this
```

**Note:** `TEST_RAIL_ENDPOINT` is still supported but deprecated. You'll see a warning message. Please migrate to `TEST_RAIL_HOST` when convenient.

---

## 🚀 Quick Start

### 📦 **Bundle Size Optimization**

**For Serial Execution (77% smaller bundle):**
```typescript
// 19.5k bundle (77% reduction)
import { onTestRailHelper } from 'playwright-testrail-helper/core';
```

**For Parallel Execution (full features):**
```typescript
// 85.3k bundle (all features)
import { onTestRailHelper } from 'playwright-testrail-helper';
```

**→ [See Core Module Guide](docs/CORE_MODULE.md) for detailed comparison**

---

### Standard Usage (Playwright - Recommended)

```typescript
import { onTestRailHelper } from 'playwright-testrail-helper';

// Collect test results
const testResults: TestInfo[] = [];

test.afterEach(async ({ }, testInfo) => {
  testResults.push(testInfo);
});

test.afterAll(async () => {
  await onTestRailHelper.updateTestResult(
    "My Test Run",     // Run name
    123,               // Section ID
    1,                 // Platform ID
    testResults        // Playwright TestInfo array
  );
});
```

### Single Test Usage (Playwright)

```typescript
test.afterEach(async ({ }, testInfo) => {
  await onTestRailHelper.updateTestResultSingle(
    "My Test Run",
    123,        // Section ID
    1,          // Platform ID
    testInfo    // Single Playwright TestInfo
  );
});
```

---

## 🔧 Advanced Usage

### Custom Framework Integration

For **Jest, Mocha, Cypress** or when you need **full control**:

```typescript
import { onTestRailHelper, TestStatus, type TestCaseInfo } from 'playwright-testrail-helper';

// Manual conversion approach (current project pattern)
const testList: TestCaseInfo[] = [];

test.afterEach(async ({ }, testInfo) => {
  const customTestCase: TestCaseInfo = {
    title: testInfo.title,
    status: customStatusMapping(testInfo.status),
    comment: enhanceErrorMessage(testInfo.error),
    duration: testInfo.duration,
    // Add custom fields
    customField1: "additional data",
    retryCount: testInfo.retry
  };
  testList.push(customTestCase);
});

test.afterAll(async () => {
  await onTestRailHelper.updateTestResultAdvanced(
    "My Test Run",
    123,        // Section ID  
    1,          // Platform ID
    testList    // Custom TestCaseInfo array
  );
});
```

### Jest Integration Example

```typescript
const jestResults: TestCaseInfo[] = jestTestResults.map(result => ({
  title: result.fullName,
  status: result.status === 'passed' ? TestStatus.PASSED : TestStatus.FAILED,
  comment: result.failureMessage || '',
  duration: result.duration
}));

await onTestRailHelper.updateTestResultAdvanced(runName, sectionId, platformId, jestResults);
```

---

## 📚 API Reference

### Primary API (Playwright)

#### `updateTestResult(runName, sectionId, platformId, testInfos, isReset?)`
**Recommended for most Playwright users**
- **Input:** Array of Playwright `TestInfo` objects
- **Features:** Automatic conversion, parallel worker support
- **Use Case:** Batch test execution in `afterAll` hook

#### `updateTestResultSingle(runName, sectionId, platformId, testInfo, isReset?)`
**For single test updates**
- **Input:** Single Playwright `TestInfo` object  
- **Use Case:** Individual test execution in `afterEach` hook

### Advanced API (Any Framework)

#### `updateTestResultAdvanced(runName, sectionId, platformId, testList, isReset?)`
**For power users and custom frameworks**
- **Input:** Array of `TestCaseInfo` objects (your custom format)
- **Features:** Full control over test data, custom field mapping
- **Use Case:** Non-Playwright frameworks, advanced customization

---

## 🏗️ Advanced Customizations

When using `updateTestResultAdvanced()`, you have full control over:

- ✅ **Custom test status mapping**
- ✅ **Custom error message formatting**  
- ✅ **Custom test metadata and fields**
- ✅ **Manual test case creation/updates**
- ✅ **Custom retry logic and failure handling**
- ✅ **Integration with non-Playwright test runners**
- ✅ **Custom test execution timing and duration**
- ✅ **Advanced filtering and test selection**

---

## 🛠️ Constants & Types

```typescript
import { 
  TestStatus, 
  Platform, 
  Priority, 
  TestTemplate, 
  TestType,
  AutomationType,
  type TestCaseInfo,
  type TestResult,
  type TestStep,
  type TestRailConfig,
  type TestRunInfo,
  type TestCaseData
} from 'playwright-testrail-helper';
```

### Test Status
```typescript
TestStatus.PASSED = 1
TestStatus.BLOCKED = 2  
TestStatus.RETEST = 4
TestStatus.FAILED = 5
```

### Platform Types
```typescript
Platform.API = 1
Platform.WEB_DESKTOP = 2
Platform.WEB_RESPONSIVE = 3
Platform.WEB_DESKTOP_AND_RESPONSIVE = 4
Platform.MOBILE_APPLICATION = 5
Platform.MIGRATION = 6
Platform.OTHER = 7
```

### Test Types
```typescript
TestType.ACCEPTANCE = 1
TestType.ACCESSIBILITY = 2
TestType.AUTOMATED = 3
TestType.COMPATIBILITY = 4
TestType.DESTRUCTIVE = 5
TestType.FUNCTIONAL = 6
TestType.OTHER = 7
TestType.PERFORMANCE = 8
TestType.REGRESSION = 9
TestType.SECURITY = 10
TestType.SMOKE_AND_SANITY = 11
TestType.USABILITY = 12
TestType.EXPLORATORY = 13
```

### Test Templates
```typescript
TestTemplate.TEST_CASE_TEXT = 1
TestTemplate.TEST_CASE_STEP = 2
TestTemplate.EXPLORATORY = 3
TestTemplate.BDD = 4
```

### Automation Types
```typescript
AutomationType.MANUAL = 1
AutomationType.AUTOMATABLE = 2
AutomationType.AUTOMATED = 3
```

### Priority Levels
```typescript
Priority.LOW = 1
Priority.MEDIUM = 2
Priority.HIGH = 3
Priority.CRITICAL = 4
```

### Key Interfaces

#### TestCaseInfo
```typescript
interface TestCaseInfo {
  title: string;
  tags: string[];
  status: "passed" | "failed" | "skipped" | "interrupted" | "timeOut";
  duration: number;
  errors?: Array<{ message: string; stack?: string }>;
  comment?: string;
}
```

#### TestResult
```typescript
interface TestResult {
  case_id: number;
  status_id: number;
  assignedto_id: number;
  comment: string;
  elapsed: number;
}
```

#### TestStep
```typescript
interface TestStep {
  category: string;
  title: string;
  error?: { message: string };
}
```

---

---

## 📚 Documentation

### 🚀 Getting Started
- **[Quick Start Guide](docs/QUICK_START.md)** - Get started in minutes
- **[Core Module Guide](docs/CORE_MODULE.md)** - 77% smaller bundle for serial execution
- **[Setup Guide](docs/SETUP.md)** - Development setup instructions
- **[Environment Variables](docs/ENVIRONMENT_VARIABLES.md)** - Configuration guide

### 📖 Reference
- **[API Documentation](docs/API.md)** - Complete API reference
- **[Examples](docs/EXAMPLES.md)** - Comprehensive usage examples
- **[Quick Reference](docs/QUICK_REFERENCE.md)** - Cheat sheet for common tasks

### 🔧 Advanced
- **[Integration Examples](docs/INTEGRATION_EXAMPLES.md)** - CI/CD & framework examples
- **[Technical Details](docs/TECHNICAL_DETAILS.md)** - Advanced configuration
- **[Platform Types](docs/PLATFORM_TYPES.md)** - Platform configuration guide

---

## 🚨 Troubleshooting

### Common Issues

#### Environment Variables Not Found
```bash
# Make sure all required variables are set
echo $TEST_RAIL_HOST
echo $TEST_RAIL_USERNAME
echo $TEST_RAIL_PROJECT_ID
```

#### TestRail API Connection Issues
```typescript
// Test your connection
try {
  await onTestRailHelper.updateTestResult(runName, sectionId, platformId, []);
} catch (error) {
  console.error('TestRail connection failed:', error.message);
}
```

#### Parallel Worker Issues
```bash
# Check worker coordination
TEST_WORKER_INDEX=0 npm test  # Manual worker index
```

---

## 🔗 Quick Links

- **[GitHub Repository](https://github.com/nxz-group/playwright-testrail-helper)**
- **[Latest Release](https://github.com/nxz-group/playwright-testrail-helper/releases)**
- **[Changelog](docs/CHANGELOG.md)**

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow conventional commit messages (`feat:`, `fix:`, `docs:`, etc.)
- Update documentation for new features
- Ensure all tests pass
- Add examples for new functionality