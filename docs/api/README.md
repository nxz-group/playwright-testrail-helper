# API Documentation

Complete API reference for the TestRail Playwright Helper package.

## 📚 API Reference

### Core Classes
- [`TestRailHelper`](./TestRailHelper.md) - Main helper class
- [`ConfigManager`](./ConfigManager.md) - Configuration management
- [`TestRailApiClient`](./TestRailApiClient.md) - HTTP client for TestRail API

### Managers (Week 2+)
- [`TestCaseManager`](./TestCaseManager.md) - Test case operations
- [`TestRunManager`](./TestRunManager.md) - Test run management  
- [`ResultManager`](./ResultManager.md) - Result processing

### Utilities
- [`Logger`](./Logger.md) - Structured logging utility
- [`FileUtils`](./FileUtils.md) - File operation utilities

### Types and Interfaces
- [`Types`](./types.md) - TypeScript type definitions
- [`Constants`](./constants.md) - TestRail constants and mappings

## 🚀 Quick Reference

### Main Class Usage

```typescript
import { TestRailHelper } from '@nxz-group/testrail-playwright-helper';

const testRail = new TestRailHelper({
  host: 'https://your-testrail.com',
  username: 'user@example.com', 
  password: 'api-key',
  projectId: 1
});

await testRail.updateTestResults({
  runName: 'My Test Run',
  sectionId: 123,
  platform: 2,
  results: testResults
});
```

### Configuration

```typescript
import { ConfigManager } from '@nxz-group/testrail-playwright-helper';

// From environment variables
const config = ConfigManager.fromEnvironment();

// Manual configuration
const manager = ConfigManager.getInstance({
  host: 'https://testrail.com',
  username: 'user@example.com',
  password: 'password',
  projectId: 1
});
```

### HTTP Client

```typescript
import { TestRailApiClient } from '@nxz-group/testrail-playwright-helper';

const client = new TestRailApiClient(config);
const response = await client.getCases(projectId, sectionId);
```

## 📖 Documentation Conventions

### Method Signatures
```typescript
methodName(param1: Type1, param2?: Type2): Promise<ReturnType>
```

### Parameters
- **Required parameters** are listed first
- **Optional parameters** are marked with `?`
- **Default values** are documented where applicable

### Return Types
- All async methods return `Promise<T>`
- Error conditions are documented
- Response types are fully specified

### Examples
Each method includes:
- Basic usage example
- Advanced usage (if applicable)
- Error handling example
- Related methods

## 🔍 Search and Navigation

- Use the sidebar to navigate between classes
- Each class page includes method index
- Cross-references link to related types
- Examples are provided throughout

## 📝 Contributing to Documentation

When adding new APIs:
1. Follow the existing format
2. Include complete examples
3. Document all parameters and return types
4. Add error handling examples
5. Update this index page