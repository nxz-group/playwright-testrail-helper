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

This is an internal library. Install it using one of these methods:

```bash
# From internal repository (SSH - Recommended)
npm install git+ssh://git@github.com/nxz-group/playwright-testrail-helper.git#v1.3.0

# From internal repository (HTTPS)
npm install git+https://github.com/nxz-group/playwright-testrail-helper.git#v1.3.0

# Or clone and link locally for development
git clone git@github.com/nxz-group/playwright-testrail-helper.git
cd playwright-testrail-helper
npm install
npm run build
npm link

# In your project
npm link playwright-testrail-helper
```

> 🔑 **SSH**: Requires SSH keys configured for GitHub access  
> 🌐 **HTTPS**: May require GitHub personal access token for private repos  
> 🔗 **Local Link**: Best for active development and testing
> 📌 **Version**: Update the version tag as needed (e.g., #v1.2.3, #main)

## Quick Start

### 1. Environment Setup
```bash
# Required
TEST_RAIL_HOST=https://your-domain.testrail.io
TEST_RAIL_USERNAME=your-email@domain.com
TEST_RAIL_PASSWORD=your-api-key-here
TEST_RAIL_PROJECT_ID=4
```

> 🚀 **Need help fast? Check our [Quick Reference Guide](./docs/QUICK_REFERENCE.md)**

### 2. Basic Usage (One Line Integration!)
```typescript
import { onTestRailHelper } from 'playwright-testrail-helper';

// Define your section IDs
const SECTION_IDS = {
  login: 100,
  dashboard: 101,
  payments: 102
};

// 🎉 One-line integration with automatic failure capture!
test.afterEach(async ({ }, testInfo) => {
  await onTestRailHelper.updateTestResultFromPlaywrightSingle(
    "Login Tests",                           // Run name
    SECTION_IDS.login,                      // Section ID
    onTestRailHelper.platform.WEB_DESKTOP, // Platform
    testInfo                                // Playwright testInfo - automatic!
  );
});
```

### 3. Test Tagging
```typescript
// Proper test tagging for better organization
test("@smoke @functional @critical @login User can login successfully", async ({ page }) => {
  await page.goto('/login');
  await page.fill('#username', 'testuser@example.com');
  await page.fill('#password', 'validpassword');
  await page.click('#login-button');
  
  await expect(page.locator('.welcome-message')).toBeVisible();
});
```

> 📋 **For detailed tagging guidelines, see [Test Tags Guide](./docs/TEST_TAGS.md)**

## Platform Types

Access platform constants directly from the helper:

```typescript
// Recommended approach
onTestRailHelper.platform.API              // 1 - API testing
onTestRailHelper.platform.WEB_DESKTOP      // 2 - Desktop web
onTestRailHelper.platform.MOBILE_APPLICATION // 5 - Mobile app

// Alternative approach
import { Platform } from 'playwright-testrail-helper';
Platform.WEB_DESKTOP
```

> 📊 **For complete platform guide, see [Platform Types](./docs/PLATFORM_TYPES.md)**

## Advanced Usage

### Section Organization
```typescript
export const TEST_SECTIONS = {
  authentication: { login: 100, logout: 101 },
  ecommerce: { cart: 200, checkout: 201 }
} as const;
```

### Batch Updates
```typescript
await onTestRailHelper.updateTestResult(
  "Batch Tests",
  SECTION_IDS.login,
  onTestRailHelper.platform.WEB_DESKTOP,
  testResults // Array of test results
);
```

### Error Handling
```typescript
import { TestRailError, APIError, ConfigurationError } from 'playwright-testrail-helper';

try {
  await onTestRailHelper.updateTestResult(runName, sectionId, platform, results);
} catch (error) {
  if (error instanceof ConfigurationError) {
    console.error('Configuration issue:', error.message);
  } else if (error instanceof APIError) {
    console.error('TestRail API error:', error.statusCode, error.message);
  }
}
```

## Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TEST_RAIL_HOST` | ✅ | - | TestRail instance URL |
| `TEST_RAIL_USERNAME` | ✅ | - | TestRail username/email |
| `TEST_RAIL_PASSWORD` | ✅ | - | TestRail password or API key |
| `TEST_RAIL_PROJECT_ID` | ✅ | - | TestRail project ID |
| `TEST_RAIL_DIR` | ❌ | `testRail` | Directory for coordination files |

> ⚙️ **For complete configuration reference, see [Environment Variables](./docs/ENVIRONMENT_VARIABLES.md)**

## Troubleshooting

### Common Issues

**Missing environment variables**
- Ensure all required variables are set

**File lock timeout**
- Check for stale `.lock` files in TestRail directory

**API rate limiting**
- Reduce concurrent workers or add delays

> 🔍 **For detailed troubleshooting, see [Technical Details](./docs/TECHNICAL_DETAILS.md)**

## 📚 Documentation

| Document | Description |
|----------|-------------|
| **[Quick Reference](./docs/QUICK_REFERENCE.md)** | 🚀 2-minute setup guide & cheat sheet |
| **[Test Tags](./docs/TEST_TAGS.md)** | 🏷️ Test tagging system & best practices |
| **[Platform Types](./docs/PLATFORM_TYPES.md)** | 📊 Platform constants & usage examples |
| **[Visual Guide](./docs/VISUAL_GUIDE.md)** | 📈 Flowcharts, diagrams & decision trees |
| **[Technical Details](./docs/TECHNICAL_DETAILS.md)** | 🔧 Advanced configuration & architecture |
| **[Integration Examples](./docs/INTEGRATION_EXAMPLES.md)** | 🔗 CI/CD, Docker, Kubernetes examples |
| **[Development Setup](./docs/SETUP.md)** | 🛠️ Local development & contribution guide |
| **[Changelog](./docs/CHANGELOG.md)** | 📋 Version history & feature details |
| **[Environment Variables](./docs/ENVIRONMENT_VARIABLES.md)** | ⚙️ Configuration reference |

## License

Internal use only - proprietary to the organization.

## Support

For issues and questions, please contact your internal development team or create an issue in the company repository.
