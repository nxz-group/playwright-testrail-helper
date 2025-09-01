# Quick Reference Guide

## 🚀 Getting Started in 2 Minutes

### 1. Install & Configure
```bash
# SSH (Recommended)
npm install git+ssh://git@github.com/nxz-group/playwright-testrail-helper.git#v1.2.2

# HTTPS (Alternative)
npm install git+https://github.com/nxz-group/playwright-testrail-helper.git#v1.2.2
```

```bash
# Set environment variables
export TEST_RAIL_HOST="https://your-domain.testrail.io"
export TEST_RAIL_USERNAME="your-email@company.com"
export TEST_RAIL_PASSWORD="your-api-key"
export TEST_RAIL_PROJECT_ID="123"
```

### 2. Basic Usage (One Line!)
```typescript
import { onTestRailHelper, Platform } from 'playwright-testrail-helper';

test.afterEach(async ({ }, testInfo) => {
  await onTestRailHelper.updateTestResultFromPlaywrightSingle(
    "My Test Run", 100, Platform.WEB_DESKTOP, testInfo
  );
});
```

**Done!** 🎉 Your tests now automatically report to TestRail with enhanced failure details.

---

## 📋 Cheat Sheet

### Platform IDs
```typescript
Platform.API                           // 1
Platform.WEB_DESKTOP                   // 2  
Platform.WEB_RESPONSIVE                // 3
Platform.WEB_DESKTOP_AND_RESPONSIVE    // 4
Platform.MOBILE_APPLICATION            // 5
Platform.MIGRATION                     // 6
Platform.OTHER                         // 7
```

### Test Status Mapping
```typescript
// Playwright → TestRail
"passed"      → ✅ Passed
"failed"      → ❌ Failed  
"skipped"     → ⏭️ Skipped
"interrupted" → 🚫 Blocked
"timedOut"    → ⏱️ Retest
```

### Environment Variables
| Variable | Required | Example |
|----------|----------|---------|
| `TEST_RAIL_HOST` | ✅ | `https://company.testrail.io` |
| `TEST_RAIL_USERNAME` | ✅ | `test@company.com` |
| `TEST_RAIL_PASSWORD` | ✅ | `your-api-key` |
| `TEST_RAIL_PROJECT_ID` | ✅ | `123` |
| `TEST_RAIL_DIR` | ❌ | `testRail` (default) |
| `RUN_NAME` | ❌ | `Custom Run Name` |

---

## 🎯 Common Use Cases

### Single Test Update
```typescript
// Simplest approach - automatic everything
await onTestRailHelper.updateTestResultFromPlaywrightSingle(
  "Login Tests", 100, Platform.WEB_DESKTOP, testInfo
);
```

### Batch Test Updates
```typescript
// Multiple tests at once
const testResults = [testInfo1, testInfo2, testInfo3];
const converted = PlaywrightConverter.convertMultipleTests(testResults);

await onTestRailHelper.updateTestResult(
  "Batch Tests", 100, Platform.WEB_DESKTOP, converted
);
```

### Custom Section Organization
```typescript
const SECTIONS = {
  login: 100,
  checkout: 200,
  admin: 300
} as const;

// Use in tests
await onTestRailHelper.updateTestResultFromPlaywrightSingle(
  "E2E Tests", SECTIONS.checkout, Platform.WEB_DESKTOP, testInfo
);
```

### Parallel Execution
```typescript
// Playwright automatically sets TEST_WORKER_INDEX
// No additional code needed - library handles coordination!

test.afterEach(async ({ }, testInfo) => {
  // Works automatically with parallel workers
  await onTestRailHelper.updateTestResultFromPlaywrightSingle(
    "Parallel Tests", 100, Platform.WEB_DESKTOP, testInfo
  );
});
```

---

## 🔧 Configuration Examples

### Basic Configuration
```typescript
// playwright.config.ts
export default defineConfig({
  workers: 4, // Parallel execution
  retries: 2,
  use: {
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry'
  }
});
```

### Environment-Specific Setup
```typescript
// config/test-environments.ts
const environments = {
  dev: {
    baseURL: 'https://dev.example.com',
    testRailPrefix: '🔧 Dev',
    includeStackTrace: true
  },
  prod: {
    baseURL: 'https://example.com', 
    testRailPrefix: '🚀 Prod',
    includeStackTrace: false
  }
};

export default environments[process.env.NODE_ENV || 'dev'];
```

### Custom Comment Configuration
```typescript
import { CommentEnhancer } from 'playwright-testrail-helper';

const commentConfig = {
  includeStackTrace: true,
  includeEnvironmentInfo: true,
  customPrefix: "🤖 Automated Test",
  maxCommentLength: 4000
};

const enhancer = new CommentEnhancer(commentConfig);
```

---

## 🚨 Troubleshooting

### Common Errors & Solutions

#### ❌ "Missing required environment variables"
```bash
# Solution: Set all required variables
export TEST_RAIL_HOST="https://your-domain.testrail.io"
export TEST_RAIL_USERNAME="your-email@company.com"  
export TEST_RAIL_PASSWORD="your-api-key"
export TEST_RAIL_PROJECT_ID="123"
```

#### ❌ "File lock timeout"
```bash
# Solution: Clean stale locks
rm -rf testRail/*.lock
```

#### ❌ "API rate limiting (429 errors)"
```typescript
// Solution: Add retry logic or reduce workers
export default defineConfig({
  workers: 2, // Reduce from 4 to 2
  // or add custom retry logic
});
```

#### ❌ "Permission denied writing to file"
```bash
# Solution: Fix permissions
chmod 755 testRail/
# or change directory
export TEST_RAIL_DIR="./my-testrail-dir"
```

### Debug Mode
```bash
# Enable detailed logging
export DEBUG="playwright-testrail-helper:*"

# Run your tests to see detailed logs
npx playwright test
```

### Health Check
```typescript
// Test your configuration
import { onTestRailHelper, Platform } from 'playwright-testrail-helper';

try {
  await onTestRailHelper.updateTestResult(
    "Health Check", 999, Platform.OTHER, []
  );
  console.log("✅ Configuration is valid");
} catch (error) {
  console.error("❌ Configuration error:", error.message);
}
```

---

## 📊 Enhanced Comments Preview

### ✅ Passed Test
```
🤖 Automated Test
✅ Executed by Playwright
Duration: 2.3s
Executed: 15/12/2024, 10:30:45
```

### ❌ Failed Test
```
🤖 Automated Test
❌ **Test Failed**
**Error:** Expected element to be visible
**Failed Step:** Click login button
**Location:** /tests/login.spec.ts:42:10
**Attachments:** 📸 Screenshot, 🎥 Video

⏱️ **Duration:** 5.2s
🕐 **Executed:** 15/12/2024, 10:30:45

🖥️ **Environment:**
• Browser: chromium 119.0.6045.105
• OS: macOS
• Node.js: v18.17.0
• Playwright: 1.40.0
```

---

## 🎨 Best Practices

### ✅ Do This
```typescript
// Centralized section configuration
const SECTIONS = {
  authentication: { login: 100, logout: 101 },
  ecommerce: { cart: 200, checkout: 201 }
} as const;

// Consistent test naming with tags
test("@smoke @login @high User can login with valid credentials", async ({ page }) => {
  // Test implementation
});

// Use afterEach for automatic reporting
test.afterEach(async ({ }, testInfo) => {
  await onTestRailHelper.updateTestResultFromPlaywrightSingle(
    "Login Tests", SECTIONS.authentication.login, Platform.WEB_DESKTOP, testInfo
  );
});
```

### ❌ Avoid This
```typescript
// Magic numbers
await onTestRailHelper.updateTestResult("Test", 100, 2, results);

// Inconsistent naming
test("login test", async ({ page }) => { /* ... */ });
test("User Login Functionality", async ({ page }) => { /* ... */ });

// Manual result conversion (unnecessary in v1.2+)
const converted = PlaywrightConverter.convertTestInfo(testInfo);
// Just pass testInfo directly instead!
```

---

## 🔗 Quick Links

- **[Full Documentation](README.md)** - Complete feature guide
- **[Technical Details](TECHNICAL_DETAILS.md)** - Advanced configuration
- **[Integration Examples](INTEGRATION_EXAMPLES.md)** - CI/CD & framework examples
- **[Enhanced Features](ENHANCED_FEATURES.md)** - New v1.2 features
- **[Environment Variables](ENVIRONMENT_VARIABLES.md)** - Configuration reference

---

## 💡 Pro Tips

1. **Use TypeScript** for better IntelliSense and type safety
2. **Tag your tests** with `@smoke`, `@regression`, etc. for better organization
3. **Set up CI/CD integration** early for continuous reporting
4. **Use centralized section IDs** to avoid magic numbers
5. **Enable debug mode** when troubleshooting issues
6. **Monitor TestRail directory** size in long-running test suites
7. **Use environment-specific configurations** for different deployment stages

---

**Need help?** Check the troubleshooting section above or review the full documentation for detailed examples and advanced usage patterns.