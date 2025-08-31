# Usage Examples

This directory contains practical examples of how to use the TestRail Playwright Helper in different scenarios.

## 📁 Example Categories

### Basic Usage
- [`basic-setup.md`](./basic-setup.md) - Simple setup and configuration
- [`environment-config.md`](./environment-config.md) - Environment-based configuration

### Playwright Integration
- [`playwright-integration.md`](./playwright-integration.md) - Complete Playwright test integration
- [`test-organization.md`](./test-organization.md) - Organizing tests with TestRail sections

### Advanced Usage
- [`multi-environment.md`](./multi-environment.md) - Multi-environment setup
- [`custom-configuration.md`](./custom-configuration.md) - Advanced configuration options
- [`error-handling.md`](./error-handling.md) - Error handling and recovery

### CI/CD Integration
- [`github-actions.md`](./github-actions.md) - GitHub Actions integration
- [`jenkins.md`](./jenkins.md) - Jenkins pipeline integration

## 🚀 Quick Start Example

```typescript
import { TestRailHelper } from '@nxz-group/testrail-playwright-helper';

// Basic configuration
const testRail = new TestRailHelper({
  host: 'https://your-company.testrail.io',
  username: 'your-email@company.com',
  password: 'your-api-key',
  projectId: 1
});

// In your test file
test.afterAll(async () => {
  await testRail.updateTestResults({
    runName: 'My Test Run',
    sectionId: 123,
    platform: 2, // Web Desktop
    results: testResults
  });
});
```

## 📖 How to Use Examples

1. **Choose your scenario** from the categories above
2. **Copy the example code** and adapt it to your needs
3. **Update configuration** with your TestRail details
4. **Run and test** the integration

## 🔧 Example Structure

Each example includes:
- **Setup instructions**
- **Complete code examples**
- **Configuration options**
- **Common troubleshooting**
- **Best practices**

## 💡 Contributing Examples

Have a useful example? Please contribute:
1. Create a new markdown file
2. Follow the existing format
3. Include complete, working code
4. Add troubleshooting section
5. Submit a pull request