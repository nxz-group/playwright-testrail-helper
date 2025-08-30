# Testing Guide

Comprehensive guide for testing the TestRail Playwright Helper package.

## 🎯 Testing Strategy

### Testing Pyramid

```
                    E2E Tests
                   /         \
              Integration Tests
             /                 \
        Unit Tests (Primary Focus)
       /                         \
  Static Analysis              Mocks
```

### Coverage Targets
- **Statements**: 80%+ (Current: 85.92% ✅)
- **Branches**: 80%+ (Current: 78.26% ⚠️)
- **Functions**: 80%+ (Current: 82.22% ✅)
- **Lines**: 80%+ (Current: 86.08% ✅)

## 🧪 Test Categories

### 1. Unit Tests (`tests/unit/`)

**Purpose**: Test individual components in isolation

**Structure**:
```
tests/unit/
├── config/
│   └── TestRailConfig.test.ts
├── client/
│   └── TestRailApiClient.test.ts
├── utils/
│   ├── Logger.test.ts
│   └── FileUtils.test.ts
└── managers/ (Week 2+)
    ├── TestCaseManager.test.ts
    ├── TestRunManager.test.ts
    └── ResultManager.test.ts
```

**Example Unit Test**:
```typescript
describe('ConfigManager', () => {
  beforeEach(() => {
    ConfigManager.resetInstance();
  });

  describe('getInstance', () => {
    it('should create instance with valid config', () => {
      const config = { host: 'https://test.com', /* ... */ };
      const manager = ConfigManager.getInstance(config);
      expect(manager).toBeInstanceOf(ConfigManager);
    });

    it('should throw error for invalid config', () => {
      const invalidConfig = { host: '' };
      expect(() => ConfigManager.getInstance(invalidConfig))
        .toThrow(ConfigurationError);
    });
  });
});
```

### 2. Integration Tests (`tests/integration/`)

**Purpose**: Test component interactions and API integration

**Planned Structure**:
```
tests/integration/
├── api-client.test.ts          # Real TestRail API calls
├── manager-integration.test.ts # Manager class interactions
└── end-to-end.test.ts         # Full workflow tests
```

**Example Integration Test**:
```typescript
describe('TestRail API Integration', () => {
  let client: TestRailApiClient;

  beforeAll(() => {
    // Use test TestRail instance
    client = new TestRailApiClient(testConfig);
  });

  it('should authenticate and fetch project info', async () => {
    const response = await client.getProject(TEST_PROJECT_ID);
    expect(response.statusCode).toBe(200);
    expect(response.body.id).toBe(TEST_PROJECT_ID);
  });
});
```

### 3. Mock Tests (`tests/mocks/`)

**Purpose**: Provide realistic mocks for external dependencies

**Current Mocks**:
- `testRailApi.mock.ts`: TestRail API responses
- `playwright.mock.ts`: Playwright test info (planned)

**Mock Example**:
```typescript
export const createMockFetch = (responses: Record<string, ApiResponse>) => {
  return jest.fn().mockImplementation((url: string, options: RequestInit) => {
    const key = `${options.method}:${getEndpoint(url)}`;
    const response = responses[key];
    
    return Promise.resolve({
      ok: response.statusCode < 400,
      status: response.statusCode,
      json: () => Promise.resolve(response.body)
    });
  });
};
```

## 🛠️ Testing Tools

### Jest Configuration

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/types/**/*'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

### Test Scripts

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:unit": "jest tests/unit",
    "test:integration": "jest tests/integration",
    "test:debug": "node --inspect-brk node_modules/.bin/jest --runInBand"
  }
}
```

## 📝 Writing Tests

### Test Structure (AAA Pattern)

```typescript
it('should do something specific', async () => {
  // Arrange - Set up test data and mocks
  const input = 'test-input';
  const expectedOutput = 'expected-result';
  const mockFn = jest.fn().mockReturnValue(expectedOutput);

  // Act - Execute the code under test
  const result = await componentUnderTest.method(input);

  // Assert - Verify the results
  expect(result).toBe(expectedOutput);
  expect(mockFn).toHaveBeenCalledWith(input);
});
```

### Async Testing

```typescript
// ✅ Good - proper async/await
it('should handle async operations', async () => {
  const result = await asyncFunction();
  expect(result).toBeDefined();
});

// ✅ Good - testing rejections
it('should handle errors', async () => {
  await expect(asyncFunction()).rejects.toThrow('Expected error');
});

// ❌ Bad - missing await
it('should handle async operations', () => {
  const result = asyncFunction(); // Returns Promise, not result
  expect(result).toBeDefined(); // Will always pass
});
```

### Mock Management

```typescript
describe('Component with dependencies', () => {
  let mockDependency: jest.Mocked<Dependency>;

  beforeEach(() => {
    mockDependency = {
      method: jest.fn(),
      asyncMethod: jest.fn().mockResolvedValue('result')
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should use dependency correctly', async () => {
    const component = new Component(mockDependency);
    await component.doSomething();
    
    expect(mockDependency.method).toHaveBeenCalledTimes(1);
  });
});
```

## 🔍 Testing Best Practices

### 1. Test Naming

```typescript
// ✅ Good - descriptive test names
describe('ConfigManager', () => {
  describe('getInstance', () => {
    it('should create instance with valid config', () => {});
    it('should throw ConfigurationError for missing host', () => {});
    it('should return same instance on subsequent calls', () => {});
  });
});

// ❌ Bad - vague test names
describe('ConfigManager', () => {
  it('should work', () => {});
  it('should fail', () => {});
});
```

### 2. Test Independence

```typescript
// ✅ Good - tests are independent
describe('Counter', () => {
  let counter: Counter;

  beforeEach(() => {
    counter = new Counter(); // Fresh instance for each test
  });

  it('should start at zero', () => {
    expect(counter.value).toBe(0);
  });

  it('should increment correctly', () => {
    counter.increment();
    expect(counter.value).toBe(1);
  });
});
```

### 3. Error Testing

```typescript
// ✅ Good - specific error testing
it('should throw ConfigurationError for invalid host', () => {
  const invalidConfig = { host: 'not-a-url' };
  
  expect(() => new ConfigManager(invalidConfig))
    .toThrow(ConfigurationError);
  
  expect(() => new ConfigManager(invalidConfig))
    .toThrow('host must be a valid URL');
});

// ✅ Good - async error testing
it('should handle network errors', async () => {
  mockFetch.mockRejectedValue(new Error('Network error'));
  
  await expect(client.request('GET', '/endpoint'))
    .rejects.toThrow('Network error after 3 attempts');
});
```

### 4. Mock Verification

```typescript
it('should call API with correct parameters', async () => {
  const mockClient = jest.mocked(apiClient);
  mockClient.request.mockResolvedValue({ statusCode: 200, body: {} });

  await manager.createTestCase(testCaseData);

  expect(mockClient.request).toHaveBeenCalledWith(
    'POST',
    '/api/v2/add_case/123',
    expect.objectContaining({
      title: testCaseData.title,
      type_id: expect.any(Number)
    })
  );
});
```

## 📊 Coverage Analysis

### Running Coverage

```bash
# Generate coverage report
npm run test:coverage

# View HTML report
open coverage/lcov-report/index.html

# Check specific file coverage
npm run test:coverage -- --collectCoverageFrom="src/config/**/*.ts"
```

### Coverage Interpretation

```
File                   | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-----------------------|---------|----------|---------|---------|------------------
TestRailConfig.ts      |   100   |   100    |   100   |   100   |
TestRailApiClient.ts   |   66.23 |    52    |  55.55  |  66.21  | 86-113,143,207-257
```

**Understanding Coverage**:
- **Statements**: Lines of code executed
- **Branches**: Conditional paths taken (if/else, switch, ternary)
- **Functions**: Functions called
- **Lines**: Physical lines executed
- **Uncovered Lines**: Specific lines not tested

### Improving Coverage

```typescript
// Low branch coverage example
function processStatus(status: string): number {
  if (status === 'passed') return 1;
  if (status === 'failed') return 5;
  if (status === 'skipped') return 3;
  return 2; // This line might not be covered
}

// Test all branches
describe('processStatus', () => {
  it('should return 1 for passed', () => {
    expect(processStatus('passed')).toBe(1);
  });
  
  it('should return 5 for failed', () => {
    expect(processStatus('failed')).toBe(5);
  });
  
  it('should return 3 for skipped', () => {
    expect(processStatus('skipped')).toBe(3);
  });
  
  it('should return 2 for unknown status', () => {
    expect(processStatus('unknown')).toBe(2);
  });
});
```

## 🚀 Running Tests

### Development Workflow

```bash
# Run tests during development
npm run test:watch

# Run specific test file
npm test -- TestRailConfig.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="should validate"

# Debug specific test
npm run test:debug -- --testNamePattern="should create instance"
```

### CI/CD Integration

```yaml
# GitHub Actions example
- name: Run Tests
  run: |
    npm test
    npm run test:coverage
    
- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    file: ./coverage/lcov.info
```

## 🐛 Debugging Tests

### Common Issues

1. **Async Test Timeouts**
   ```typescript
   // ✅ Fix - increase timeout for slow operations
   it('should handle slow operation', async () => {
     await expect(slowOperation()).resolves.toBeDefined();
   }, 10000); // 10 second timeout
   ```

2. **Mock Not Working**
   ```typescript
   // ✅ Fix - proper mock setup
   jest.mock('../client/TestRailApiClient');
   const mockClient = jest.mocked(TestRailApiClient);
   ```

3. **Test Interference**
   ```typescript
   // ✅ Fix - proper cleanup
   afterEach(() => {
     jest.clearAllMocks();
     ConfigManager.resetInstance();
   });
   ```

### Debug Tools

```bash
# Run with Node.js debugger
node --inspect-brk node_modules/.bin/jest --runInBand

# Verbose output
npm test -- --verbose

# Detect open handles
npm test -- --detectOpenHandles
```

## 📈 Test Metrics

### Current Status (Week 1)
- **Total Tests**: 79
- **Test Suites**: 4
- **Average Test Time**: ~1.5s
- **Coverage**: 85.92% statements

### Quality Gates
- ✅ All tests must pass
- ✅ Coverage thresholds must be met
- ✅ No test timeouts or flaky tests
- ✅ Fast test execution (<5s total)

### Continuous Improvement
- Weekly coverage review
- Test performance monitoring
- Flaky test identification
- Mock accuracy validation

This testing guide ensures high-quality, reliable code through comprehensive testing practices.