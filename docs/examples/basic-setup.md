# Basic Setup Example

This example shows the simplest way to set up and use the TestRail Playwright Helper.

## 📋 Prerequisites

- TestRail instance with API access
- Playwright project set up
- Node.js 18+ installed

## 🔧 Installation

```bash
npm install @nxz-group/testrail-playwright-helper
```

## ⚙️ Basic Configuration

### 1. Environment Variables

Create a `.env` file in your project root:

```bash
# .env
TESTRAIL_HOST=https://your-company.testrail.io
TESTRAIL_USERNAME=your-email@company.com
TESTRAIL_PASSWORD=your-api-key-or-password
TESTRAIL_PROJECT_ID=1
```

### 2. Configuration File

Create `config/testrail.config.ts`:

```typescript
import { TestRailConfig } from '@nxz-group/testrail-playwright-helper';

export const testRailConfig: TestRailConfig = {
  host: process.env.TESTRAIL_HOST!,
  username: process.env.TESTRAIL_USERNAME!,
  password: process.env.TESTRAIL_PASSWORD!,
  projectId: parseInt(process.env.TESTRAIL_PROJECT_ID!),
  timeout: 30000,
  retries: 3,
  enableLogging: true
};
```

## 🧪 Basic Test Integration

### 1. Simple Test File

```typescript
// tests/example.spec.ts
import { test, expect } from '@playwright/test';
import { TestRailHelper } from '@nxz-group/testrail-playwright-helper';
import { testRailConfig } from '../config/testrail.config';

// Initialize TestRail helper
const testRail = new TestRailHelper(testRailConfig);

// Test results collection
const testResults: any[] = [];

test.describe('Basic Example Tests', () => {
  test.afterEach(async ({}, testInfo) => {
    // Collect test results
    testResults.push(testInfo);
  });

  test.afterAll(async () => {
    // Send results to TestRail
    if (testResults.length > 0) {
      await testRail.updateTestResults({
        runName: 'Basic Example Test Run',
        sectionId: 100, // Your TestRail section ID
        platform: 2,   // Web Desktop platform
        results: testResults
      });
    }
  });

  test('should load homepage', { tag: ['@smoke', '@high'] }, async ({ page }) => {
    await page.goto('https://example.com');
    await expect(page).toHaveTitle(/Example/);
  });

  test('should navigate to about page', { tag: ['@regression', '@medium'] }, async ({ page }) => {
    await page.goto('https://example.com');
    await page.click('a[href="/about"]');
    await expect(page).toHaveURL(/.*about/);
  });
});
```

### 2. Test with Manual TestRail Case IDs

If you want to map specific test cases to TestRail IDs:

```typescript
test('should validate login form', { 
  tag: ['@functional', '@high'],
  annotation: { type: 'testrail', description: 'C123' } // TestRail case ID
}, async ({ page }) => {
  await page.goto('/login');
  
  // Test login validation
  await page.fill('#username', 'invalid@email');
  await page.fill('#password', 'wrongpassword');
  await page.click('#login-button');
  
  await expect(page.locator('.error-message')).toBeVisible();
});
```

## 🎯 Platform and Section Mapping

### Platform IDs
```typescript
const PLATFORMS = {
  API: 1,
  WEB_DESKTOP: 2,
  WEB_RESPONSIVE: 3,
  WEB_DESKTOP_AND_RESPONSIVE: 4,
  MOBILE_APPLICATION: 5,
  MIGRATION: 6,
  OTHER: 7
};
```

### Section IDs
Find your section IDs in TestRail:
1. Go to your TestRail project
2. Navigate to Test Cases
3. Look at the URL when viewing a section: `/cases/view/123` (123 is the section ID)

```typescript
const SECTIONS = {
  LOGIN: 100,
  NAVIGATION: 101,
  FORMS: 102,
  API_TESTS: 103
};
```

## 🚀 Running Tests

```bash
# Run tests normally
npx playwright test

# Run with TestRail integration enabled
TESTRAIL_ENABLE=true npx playwright test

# Run specific test file
npx playwright test tests/example.spec.ts
```

## 📊 Results in TestRail

After running tests, you'll see:
1. **New test run** created with your specified name
2. **Test cases** automatically created/updated based on test titles and tags
3. **Results** uploaded with pass/fail status and execution details
4. **Comments** with error messages for failed tests

## 🔍 Troubleshooting

### Common Issues

1. **Authentication Error**
   ```
   Error: Authentication failed. Check credentials.
   ```
   - Verify your TestRail credentials
   - Ensure API access is enabled for your user

2. **Project Not Found**
   ```
   Error: Project ID 1 not found
   ```
   - Check your project ID in TestRail URL
   - Ensure you have access to the project

3. **Section Not Found**
   ```
   Error: Section ID 100 not found
   ```
   - Verify the section exists in your project
   - Check section ID in TestRail interface

### Debug Mode

Enable detailed logging:

```typescript
const testRail = new TestRailHelper({
  ...testRailConfig,
  enableLogging: true
});
```

## ✅ Best Practices

1. **Use Environment Variables**: Never hardcode credentials
2. **Organize by Sections**: Group related tests in TestRail sections
3. **Use Meaningful Tags**: Tags help categorize tests in TestRail
4. **Handle Errors**: Always wrap TestRail calls in try-catch
5. **Test Locally**: Test integration with a development TestRail project first

## 📝 Next Steps

- [Environment Configuration](./environment-config.md) - Multi-environment setup
- [Playwright Integration](./playwright-integration.md) - Advanced Playwright features
- [Error Handling](./error-handling.md) - Robust error handling patterns