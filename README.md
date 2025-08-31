# playwright-testrail-helper

A TypeScript library for seamless TestRail integration with Playwright test automation, designed for parallel execution and enterprise use.

## Features

- 🚀 **Parallel Execution** - Supports up to 10 concurrent workers
- 🔒 **Race Condition Safe** - Atomic file operations and intelligent locking
- 🔄 **Network Resilient** - Automatic retry logic for API failures
- 📊 **Smart Coordination** - Adaptive worker synchronization
- 🛡️ **Production Ready** - Comprehensive error handling and validation
- 📝 **Full TypeScript** - Complete type safety and IntelliSense support

## Installation

```bash
npm install playwright-testrail-helper
```

## Quick Start

### 1. Environment Setup
```bash
# Required
TEST_RAIL_HOST=https://your-domain.testrail.io
TEST_RAIL_USERNAME=your-email@domain.com
TEST_RAIL_PASSWORD=your-password-or-api-key
TEST_RAIL_PROJECT_ID=3

# Optional
TEST_RAIL_DIR=testRail
TEST_RAIL_EXECUTED_BY="Executed by Playwright"
RUN_NAME=optional-run-name-override
TEST_WORKER_INDEX=0
```

### 2. Basic Usage
```typescript
import { onTestRailHelper, Platform } from 'playwright-testrail-helper';

// Define your section IDs
const SECTION_IDS = {
  login: 100,
  dashboard: 101,
  payments: 102
};

// Update test results
await onTestRailHelper.updateTestResult(
  "Login Tests",                    // Run name
  SECTION_IDS.login,               // Section ID
  Platform.WEB_DESKTOP,           // Platform
  testResults,                     // Test results array
  false                           // Reset flag (optional)
);
```

### 3. Test Results Format
```typescript
const testResults = [
  {
    title: "User can login with valid credentials",
    tags: ["@smoke", "@login", "@high"],
    status: "passed", // "passed" | "failed" | "skipped" | "interrupted" | "timeOut"
    duration: 2500,   // milliseconds
    _steps: [         // Optional: test steps
      {
        category: "test.step",
        title: "Navigate to login page",
        error: undefined
      }
    ]
  }
];
```

## Advanced Usage

### Section ID Organization
```typescript
// Create a centralized section configuration
export const TEST_SECTIONS = {
  authentication: {
    login: 100,
    logout: 101,
    registration: 102
  },
  ecommerce: {
    cart: 200,
    checkout: 201,
    payment: 202
  }
} as const;

// Use in tests
await onTestRailHelper.updateTestResult(
  "Authentication Tests",
  TEST_SECTIONS.authentication.login,
  Platform.WEB_DESKTOP,
  testResults
);
```

### Parallel Execution
The library automatically handles parallel execution when `TEST_WORKER_INDEX` is set:

```bash
# Playwright automatically sets this for parallel workers
TEST_WORKER_INDEX=0  # Worker 1
TEST_WORKER_INDEX=1  # Worker 2
# ... up to 10 workers supported
```

### Platform Types
```typescript
import { Platform } from 'playwright-testrail-helper';

Platform.API                           // 1
Platform.WEB_DESKTOP                   // 2  
Platform.WEB_RESPONSIVE                // 3
Platform.WEB_DESKTOP_AND_RESPONSIVE    // 4
Platform.MOBILE_APPLICATION            // 5
Platform.MIGRATION                     // 6
Platform.OTHER                         // 7
```

## Error Handling

```typescript
import { 
  TestRailError, 
  APIError, 
  ConfigurationError 
} from 'playwright-testrail-helper';

try {
  await onTestRailHelper.updateTestResult(runName, sectionId, platform, results);
} catch (error) {
  if (error instanceof ConfigurationError) {
    console.error('Configuration issue:', error.message);
  } else if (error instanceof APIError) {
    console.error('TestRail API error:', error.statusCode, error.message);
  } else if (error instanceof TestRailError) {
    console.error('Library error:', error.message);
  }
}
```

## Configuration Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TEST_RAIL_HOST` | ✅ | - | TestRail instance URL |
| `TEST_RAIL_USERNAME` | ✅ | - | TestRail username/email |
| `TEST_RAIL_PASSWORD` | ✅ | - | TestRail password or API key |
| `TEST_RAIL_PROJECT_ID` | ✅ | - | TestRail project ID |
| `TEST_RAIL_DIR` | ❌ | `testRail` | Directory for coordination files |
| `TEST_RAIL_EXECUTED_BY` | ❌ | `Executed by Playwright` | Comment text for results |
| `RUN_NAME` | ❌ | - | Override test run name |
| `TEST_WORKER_INDEX` | ❌ | `0` | Worker ID for parallel execution |

## Best Practices

### 1. Section ID Management
```typescript
// ✅ Good: Centralized configuration
const SECTIONS = {
  userManagement: 100,
  paymentFlow: 101
} as const;

// ❌ Avoid: Magic numbers in tests
await onTestRailHelper.updateTestResult("Test", 100, Platform.WEB_DESKTOP, results);
```

### 2. Error Handling
```typescript
// ✅ Good: Specific error handling
try {
  await onTestRailHelper.updateTestResult(runName, sectionId, platform, results);
} catch (error) {
  if (error instanceof APIError && error.statusCode === 429) {
    // Handle rate limiting
    await new Promise(resolve => setTimeout(resolve, 5000));
    // Retry logic
  }
}
```

### 3. Test Organization
```typescript
// ✅ Good: Consistent tagging
const testCase = {
  title: "User can complete checkout process",
  tags: ["@e2e", "@checkout", "@critical"],  // Type, Feature, Priority
  status: "passed",
  duration: 15000
};
```

## Troubleshooting

### Common Issues

**1. "Missing required environment variables"**
- Ensure all required environment variables are set
- Check for typos in variable names

**2. "File lock timeout"**
- Usually indicates a crashed worker process
- Check for stale `.lock` files in the TestRail directory
- The library auto-cleans locks older than 30 seconds

**3. "API rate limiting (429 errors)"**
- Reduce concurrent workers or add delays between API calls
- Check TestRail instance rate limits

**4. "Permission denied writing to file"**
- Ensure write permissions for the TestRail directory
- Check available disk space

## Development

### Building
```bash
npm run build        # Build once
npm run build:watch  # Build and watch for changes
```

### Linting
```bash
npm run lint         # Fix linting issues
npm run lint:ci      # Check without fixing (CI mode)
```

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

For issues and questions, please contact your internal development team or create an issue in the company repository.
