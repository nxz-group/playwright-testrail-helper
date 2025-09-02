# Development Setup Instructions

> 📚 **Navigation:** [← Back to README](../README.md) | [Environment Variables →](ENVIRONMENT_VARIABLES.md) | [Quick Start →](QUICK_START.md)

## Prerequisites

- Node.js 16+ 
- npm or yarn
- TypeScript knowledge
- Playwright test framework

## Local Development Setup

### 1. Clone Repository
```bash
git clone <repository-url>
cd playwright-testrail-helper
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory:
```bash
# Required for testing
TEST_RAIL_HOST=https://your-domain.testrail.io
TEST_RAIL_USERNAME=your-email@domain.com
TEST_RAIL_PASSWORD=your-api-key
TEST_RAIL_PROJECT_ID=123

# Optional
TEST_RAIL_DIR=testRail
TEST_RAIL_EXECUTED_BY="Development Testing"
```

### 4. Build the Project
```bash
# Build once
npm run build

# Build and watch for changes
npm run build:watch
```

## Development Workflow

### Code Quality
```bash
# Run linting
npm run lint

# Fix linting issues
npm run fix

# Format code
npm run format
```

### Testing
```bash
# Test enhanced features
npm run test:features

# Run all tests (if available)
npm test
```

### Project Structure
```
src/
├── api/                    # TestRail API client
├── managers/               # Business logic managers
├── utils/                  # Utility functions
├── types/                  # TypeScript definitions
├── examples/               # Usage examples
└── index.ts               # Main exports

docs/                      # Documentation
tests/                     # Test files (if any)
dist/                      # Built output
```

## Contributing Guidelines

### Code Standards
- Use TypeScript for all new code
- Follow existing code style and patterns
- Add JSDoc comments for public APIs
- Ensure backward compatibility

### Commit Messages
Follow conventional commit format:
```bash
feat: add new feature
fix: resolve bug
docs: update documentation
refactor: improve code structure
test: add or update tests
```

### Pull Request Process
1. Create feature branch from main
2. Make changes with appropriate tests
3. Update documentation if needed
4. Ensure all checks pass
5. Submit pull request with clear description

## Debugging

### Enable Debug Logging
```bash
export DEBUG="playwright-testrail-helper:*"
npm run build
```

### Common Development Issues

**Build Errors**
```bash
# Clean and rebuild
npm run clean
npm run build
```

**Type Errors**
```bash
# Check TypeScript compilation
npx tsc --noEmit
```

**Linting Issues**
```bash
# Auto-fix most issues
npm run fix
```

## Release Process

### Version Management
```bash
# Update version in package.json
npm version patch|minor|major

# Build the project
npm run build
```

### Documentation Updates
- Update CHANGELOG.md with new features
- Review and update README.md if needed
- Ensure all documentation is current
---

## 📚 Related Documentation

- **[← Back to README](../README.md)** - Main documentation
- **[Environment Variables](ENVIRONMENT_VARIABLES.md)** - Configuration guide
- **[Quick Start Guide](QUICK_START.md)** - Get started in minutes
- **[API Reference](API.md)** - Complete API documentation
- **[Examples](EXAMPLES.md)** - Comprehensive usage examples
- **[Integration Examples](INTEGRATION_EXAMPLES.md)** - CI/CD & framework examples