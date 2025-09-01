# Platform Types Guide

## Overview

Platform types categorize your tests in TestRail based on the testing environment. This helps organize test results and provides better reporting visibility.

## Access Methods

### Method 1: Direct Access (Recommended)
```typescript
import { onTestRailHelper } from 'playwright-testrail-helper';

// Access platforms directly from the helper
await onTestRailHelper.updateTestResult(
  "API Tests",
  100,
  onTestRailHelper.platform.API,           // 1 - API testing
  testResults
);
```

### Method 2: Named Import
```typescript
import { onTestRailHelper, Platform } from 'playwright-testrail-helper';

await onTestRailHelper.updateTestResult(
  "Mobile Tests",
  300, 
  Platform.MOBILE_APPLICATION,             // 5 - Mobile app
  testResults
);
```

## Available Platform Types

| Platform | Value | Use Case | Example |
|----------|-------|----------|---------|
| `API` | 1 | API/Backend testing | REST API, GraphQL tests |
| `WEB_DESKTOP` | 2 | Desktop web browsers | Chrome, Firefox, Safari |
| `WEB_RESPONSIVE` | 3 | Responsive web testing | Mobile viewport, tablet |
| `WEB_DESKTOP_AND_RESPONSIVE` | 4 | Combined web testing | Cross-device testing |
| `MOBILE_APPLICATION` | 5 | Mobile app testing | iOS, Android apps |
| `MIGRATION` | 6 | Data migration testing | Database migrations |
| `OTHER` | 7 | Other test types | Custom test scenarios |

## Practical Usage Examples

### API Testing
```typescript
test.describe('API Tests', () => {
  test.afterEach(async ({ }, testInfo) => {
    await onTestRailHelper.updateTestResultFromPlaywrightSingle(
      "API Regression",
      SECTIONS.api.authentication,
      onTestRailHelper.platform.API,
      testInfo
    );
  });
});
```

### Desktop Web Testing  
```typescript
test.describe('Desktop Tests', () => {
  test.afterEach(async ({ }, testInfo) => {
    await onTestRailHelper.updateTestResultFromPlaywrightSingle(
      "Desktop E2E",
      SECTIONS.web.checkout,
      onTestRailHelper.platform.WEB_DESKTOP,
      testInfo
    );
  });
});
```

### Mobile Testing
```typescript
test.describe('Mobile Tests', () => {
  test.afterEach(async ({ }, testInfo) => {
    await onTestRailHelper.updateTestResultFromPlaywrightSingle(
      "Mobile App Tests",
      SECTIONS.mobile.login,
      onTestRailHelper.platform.MOBILE_APPLICATION,
      testInfo
    );
  });
});
```

### Dynamic Platform Selection
```typescript
function getPlatformForProject(projectName: string) {
  const platformMap = {
    'chromium': onTestRailHelper.platform.WEB_DESKTOP,
    'firefox': onTestRailHelper.platform.WEB_DESKTOP,
    'webkit': onTestRailHelper.platform.WEB_DESKTOP,
    'mobile-chrome': onTestRailHelper.platform.MOBILE_APPLICATION,
    'api': onTestRailHelper.platform.API
  };
  
  return platformMap[projectName] || onTestRailHelper.platform.OTHER;
}

// Usage in test
test.afterEach(async ({ }, testInfo) => {
  const platform = getPlatformForProject(testInfo.project.name);
  
  await onTestRailHelper.updateTestResultFromPlaywrightSingle(
    "Cross-Platform Tests",
    SECTIONS.crossPlatform.core,
    platform,
    testInfo
  );
});
```

## Best Practices

### ✅ Good Platform Selection
```typescript
// Clear platform mapping based on test type
const platformForTest = {
  'api-tests': onTestRailHelper.platform.API,
  'web-desktop': onTestRailHelper.platform.WEB_DESKTOP,
  'mobile-app': onTestRailHelper.platform.MOBILE_APPLICATION
};
```

### ❌ Avoid Magic Numbers
```typescript
// Don't use raw numbers
await onTestRailHelper.updateTestResult("Test", 100, 2, results); // Bad

// Use platform constants instead
await onTestRailHelper.updateTestResult("Test", 100, onTestRailHelper.platform.WEB_DESKTOP, results); // Good
```

## Platform-Specific Configuration

### Environment-Based Platform Selection
```typescript
function getPlatformForEnvironment(env: string, testType: string) {
  if (testType === 'api') return onTestRailHelper.platform.API;
  
  switch (env) {
    case 'mobile':
      return onTestRailHelper.platform.MOBILE_APPLICATION;
    case 'responsive':
      return onTestRailHelper.platform.WEB_RESPONSIVE;
    default:
      return onTestRailHelper.platform.WEB_DESKTOP;
  }
}
```

### Project-Based Platform Mapping
```typescript
// playwright.config.ts
export default defineConfig({
  projects: [
    {
      name: 'api-tests',
      testMatch: '**/api/**/*.spec.ts',
      use: { 
        // Custom property for platform mapping
        platform: 'API'
      }
    },
    {
      name: 'web-desktop',
      testMatch: '**/web/**/*.spec.ts',
      use: { 
        ...devices['Desktop Chrome'],
        platform: 'WEB_DESKTOP'
      }
    }
  ]
});
```