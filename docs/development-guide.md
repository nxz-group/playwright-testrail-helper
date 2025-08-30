# Development Guide

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm 8+
- TypeScript 5+
- Git

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd playwright-testrail-helper

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test
```

## 🏗️ Project Structure

```
playwright-testrail-helper/
├── src/                    # Source code
├── tests/                  # Test files
├── docs/                   # Documentation
├── dist/                   # Built output (generated)
├── coverage/               # Test coverage reports (generated)
├── package.json           # Package configuration
├── tsconfig.json          # TypeScript configuration
├── jest.config.js         # Jest test configuration
├── .eslintrc.js          # ESLint configuration
└── .gitignore            # Git ignore rules
```

## 🛠️ Development Workflow

### 1. **Setup Development Environment**

```bash
# Install dependencies
npm install

# Start development mode (watch for changes)
npm run build -- --watch

# Run tests in watch mode
npm run test:watch
```

### 2. **Code Style and Quality**

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Check TypeScript types
npx tsc --noEmit

# Run all quality checks
npm run build && npm run lint && npm test
```

### 3. **Testing**

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- TestRailConfig.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="should validate config"
```

## 📝 Coding Standards

### TypeScript Guidelines

1. **Strict Type Safety**
   ```typescript
   // ✅ Good - explicit types
   interface TestConfig {
     host: string;
     timeout?: number;
   }

   // ❌ Bad - any types
   function process(data: any): any {
     return data;
   }
   ```

2. **Error Handling**
   ```typescript
   // ✅ Good - custom error types
   throw new TestRailError('API request failed', 500, response);

   // ❌ Bad - generic errors
   throw new Error('Something went wrong');
   ```

3. **Async/Await**
   ```typescript
   // ✅ Good - proper async handling
   async function fetchData(): Promise<ApiResponse> {
     try {
       const response = await client.request('GET', '/api/endpoint');
       return response;
     } catch (error) {
       logger.error('Failed to fetch data', error);
       throw error;
     }
   }
   ```

### Code Organization

1. **File Naming**
   - Use PascalCase for classes: `TestRailConfig.ts`
   - Use camelCase for utilities: `fileUtils.ts`
   - Use kebab-case for test files: `test-rail-config.test.ts`

2. **Import Organization**
   ```typescript
   // 1. Node.js built-ins
   import { promises as fs } from 'fs';
   
   // 2. External packages
   import dayjs from 'dayjs';
   
   // 3. Internal imports (absolute paths)
   import { TestRailConfig } from '../types';
   import { Logger } from '../utils/Logger';
   ```

3. **Export Patterns**
   ```typescript
   // ✅ Good - named exports
   export class TestRailHelper { }
   export { ConfigManager } from './config/TestRailConfig';
   
   // ✅ Good - default export for main class
   export default class TestRailHelper { }
   ```

## 🧪 Testing Guidelines

### Test Structure

```typescript
describe('ComponentName', () => {
  // Setup
  beforeEach(() => {
    // Reset state
  });

  afterEach(() => {
    // Cleanup
  });

  describe('method name', () => {
    it('should do something specific', () => {
      // Arrange
      const input = 'test';
      
      // Act
      const result = component.method(input);
      
      // Assert
      expect(result).toBe('expected');
    });
  });
});
```

### Mock Guidelines

```typescript
// ✅ Good - specific mocks
const mockFetch = jest.fn().mockResolvedValue({
  ok: true,
  status: 200,
  json: () => Promise.resolve({ data: 'test' })
});

// ✅ Good - cleanup mocks
afterEach(() => {
  jest.clearAllMocks();
});
```

### Coverage Requirements

- **Statements**: 80%+
- **Branches**: 80%+
- **Functions**: 80%+
- **Lines**: 80%+

## 🔧 Build and Release

### Build Process

```bash
# Clean build
rm -rf dist/
npm run build

# Verify build
ls -la dist/
```

### Release Checklist

1. **Pre-release**
   - [ ] All tests passing
   - [ ] Coverage targets met
   - [ ] Documentation updated
   - [ ] Version bumped in package.json

2. **Build Verification**
   - [ ] TypeScript compilation successful
   - [ ] Type declarations generated
   - [ ] No build warnings

3. **Testing**
   - [ ] Unit tests pass
   - [ ] Integration tests pass
   - [ ] Manual testing completed

4. **Documentation**
   - [ ] README updated
   - [ ] API documentation current
   - [ ] Examples working

## 🐛 Debugging

### Common Issues

1. **TypeScript Errors**
   ```bash
   # Check TypeScript configuration
   npx tsc --showConfig
   
   # Compile without emit to check types
   npx tsc --noEmit
   ```

2. **Test Failures**
   ```bash
   # Run specific test with verbose output
   npm test -- --verbose TestRailConfig.test.ts
   
   # Debug test with Node.js debugger
   node --inspect-brk node_modules/.bin/jest --runInBand
   ```

3. **Build Issues**
   ```bash
   # Clean and rebuild
   rm -rf dist/ node_modules/
   npm install
   npm run build
   ```

### Logging for Development

```typescript
// Use structured logging
logger.debug('Processing test case', {
  caseId: 123,
  title: 'Test Case Title',
  tags: ['smoke', 'critical']
});
```

## 🤝 Contributing

### Pull Request Process

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Follow coding standards
   - Add tests for new functionality
   - Update documentation

3. **Quality Checks**
   ```bash
   npm run lint
   npm test
   npm run build
   ```

4. **Submit PR**
   - Clear description of changes
   - Link to related issues
   - Include test results

### Commit Message Format

```
type(scope): description

feat(client): add retry logic to HTTP client
fix(config): handle missing environment variables
docs(api): update configuration examples
test(utils): add file utils test cases
```

## 📚 Resources

### Documentation
- [Architecture Overview](./architecture.md)
- [API Documentation](./api/)
- [Usage Examples](./examples/)

### External Resources
- [TestRail API Documentation](https://www.gurock.com/testrail/docs/api)
- [Playwright Documentation](https://playwright.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Jest Testing Framework](https://jestjs.io/docs/getting-started)

### Tools
- [TypeScript Playground](https://www.typescriptlang.org/play)
- [Jest Testing](https://jestjs.io/)
- [ESLint](https://eslint.org/)

## 🆘 Getting Help

1. **Check Documentation**: Start with this guide and API docs
2. **Search Issues**: Look for similar problems in project issues
3. **Create Issue**: Provide detailed reproduction steps
4. **Ask Questions**: Use discussions for general questions

## 🔄 Development Lifecycle

### Daily Development
1. Pull latest changes
2. Run tests to ensure clean state
3. Make changes with tests
4. Run quality checks
5. Commit with clear messages

### Weekly Maintenance
1. Update dependencies
2. Review test coverage
3. Update documentation
4. Performance profiling

This guide ensures consistent, high-quality development practices across the project.