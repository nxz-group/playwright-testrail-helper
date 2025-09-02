# Environment Variables

> 📚 **Navigation:** [← Back to README](../README.md) | [Quick Start →](QUICK_START.md) | [Setup Guide →](SETUP.md)

This document describes all environment variables used by `playwright-testrail-helper`.

## Required Environment Variables

These variables **must** be set for the library to function:

### `TEST_RAIL_HOST`
- **Description**: Your TestRail instance URL
- **Example**: `https://your-company.testrail.io`
- **Required**: ✅ Yes
- **Legacy Support**: Also accepts `TEST_RAIL_ENDPOINT` (deprecated with warning)

### `TEST_RAIL_USERNAME`
- **Description**: Your TestRail username (email address)
- **Example**: `your-email@company.com`
- **Required**: ✅ Yes

### `TEST_RAIL_PASSWORD`
- **Description**: Your TestRail API key (not your login password)
- **Example**: `your-api-key-here`
- **Required**: ✅ Yes
- **Note**: Generate this from TestRail → My Settings → API Keys

### `TEST_RAIL_PROJECT_ID`
- **Description**: Your TestRail project ID (numeric)
- **Example**: `4`
- **Required**: ✅ Yes
- **Note**: Find this in your TestRail project URL

## Optional Environment Variables

These variables have default values and are optional:

### `TEST_RAIL_DIR`
- **Description**: Directory name for TestRail coordination files
- **Default**: `testRail`
- **Example**: `testrail-results`
- **Required**: ❌ No

### `TEST_RAIL_EXECUTED_BY`
- **Description**: Text to show in test result comments
- **Default**: `Executed by Playwright`
- **Example**: `Automated by CI/CD Pipeline`
- **Required**: ❌ No

### `RUN_NAME`
- **Description**: Custom test run name prefix
- **Default**: `Playwright Tests - YYYY-MM-DD`
- **Example**: `Nightly Regression Tests`
- **Required**: ❌ No

### `TEST_WORKER_INDEX`
- **Description**: Worker ID for parallel execution (usually set by Playwright)
- **Default**: `0`
- **Example**: `1`, `2`, `3`
- **Required**: ❌ No
- **Note**: Automatically set by Playwright when running in parallel

## Setup Examples

### Using .env file (recommended)
```bash
# .env file
TEST_RAIL_HOST=https://your-company.testrail.io
TEST_RAIL_USERNAME=your-email@company.com
TEST_RAIL_PASSWORD=your-api-key-here
TEST_RAIL_PROJECT_ID=4

# Optional
TEST_RAIL_DIR=testrail-results
TEST_RAIL_EXECUTED_BY=Automated by CI/CD
RUN_NAME=Nightly Regression Tests
```

### Using shell export
```bash
export TEST_RAIL_HOST="https://your-company.testrail.io"
export TEST_RAIL_USERNAME="your-email@company.com"
export TEST_RAIL_PASSWORD="your-api-key-here"
export TEST_RAIL_PROJECT_ID="4"
```

### Using Playwright config
```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    // Your test configuration
  },
  // Set environment variables
  globalSetup: './global-setup.ts',
});
```

```typescript
// global-setup.ts
async function globalSetup() {
  process.env.TEST_RAIL_HOST = 'https://your-company.testrail.io';
  process.env.TEST_RAIL_USERNAME = 'your-email@company.com';
  process.env.TEST_RAIL_PASSWORD = 'your-api-key-here';
  process.env.TEST_RAIL_PROJECT_ID = '4';
}

export default globalSetup;
```

### Using CI/CD (GitHub Actions example)
```yaml
# .github/workflows/tests.yml
env:
  TEST_RAIL_HOST: ${{ secrets.TEST_RAIL_HOST }}
  TEST_RAIL_USERNAME: ${{ secrets.TEST_RAIL_USERNAME }}
  TEST_RAIL_PASSWORD: ${{ secrets.TEST_RAIL_PASSWORD }}
  TEST_RAIL_PROJECT_ID: ${{ secrets.TEST_RAIL_PROJECT_ID }}
  RUN_NAME: "CI Build ${{ github.run_number }}"
```

## Migration from Legacy Variables

### Backward Compatibility

This library supports legacy environment variable names for smooth migration:

```bash
# ✅ NEW (Recommended)
TEST_RAIL_HOST=https://your-company.testrail.io

# ⚠️ LEGACY (Still works but shows warning)
TEST_RAIL_ENDPOINT=https://your-company.testrail.io
```

### Migration Steps

1. **Immediate**: Both variables work, no code changes needed
2. **Warning**: You'll see a deprecation warning when using `TEST_RAIL_ENDPOINT`
3. **Migration**: Update your environment configuration when convenient
4. **Future**: `TEST_RAIL_ENDPOINT` support may be removed in future versions

### Warning Message

When using the legacy variable, you'll see:

```
⚠️  WARNING: TEST_RAIL_ENDPOINT is deprecated. Please use TEST_RAIL_HOST instead.
```

## Error Messages

If required environment variables are missing, you'll see:

```
ConfigurationError: Missing required environment variables: TEST_RAIL_HOST (or legacy TEST_RAIL_ENDPOINT), TEST_RAIL_USERNAME, TEST_RAIL_PASSWORD, TEST_RAIL_PROJECT_ID
```

Make sure all required variables are set before running your tests.

## Security Notes

- **Never commit API keys to version control**
- Use `.env` files and add them to `.gitignore`
- In CI/CD, use encrypted secrets
- TestRail API keys can be regenerated if compromised
---

##
 📚 Related Documentation

- **[← Back to README](../README.md)** - Main documentation
- **[Quick Start Guide](QUICK_START.md)** - Get started in minutes
- **[Setup Guide](SETUP.md)** - Development setup instructions
- **[API Reference](API.md)** - Complete API documentation
- **[Examples](EXAMPLES.md)** - Comprehensive usage examples
- **[Integration Examples](INTEGRATION_EXAMPLES.md)** - CI/CD & framework examples