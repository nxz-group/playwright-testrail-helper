# Changelog

All notable changes to this project will be documented in this file.

## [1.4.3] - 2025-09-13

### 🐛 Bug Fixes
- **Fixed Input Validation Errors**: Resolved cryptic TypeError when testInfo is null, undefined, or missing required properties
- **Improved Error Messages**: Enhanced error messages for invalid testInfo inputs to provide clear guidance on how to fix issues
- **Enhanced Type Safety**: Added proper input validation in PlaywrightConverter to prevent runtime errors

### 🔧 Technical Improvements
- **Better Error Handling**: Clear error messages now indicate whether to use `updateTestResult()` vs `updateTestResultSingle()`
- **Comprehensive Validation**: Added validation for null/undefined inputs, empty objects, missing titles, and incorrect data types
- **Test Coverage**: Added comprehensive test suite for input validation edge cases

### 📝 Error Message Examples
- `testInfo cannot be null or undefined`
- `testInfo must have a valid non-empty title property`
- `testInfo cannot be an array. Use updateTestResult() for arrays of test objects`
- `testInfos must be an array. Use updateTestResultSingle() for single test objects`

## [1.4.2] - 2025-09-04

### Changed
- **Node.js Requirement**: Updated from >=16.0.0 to >=18.0.0 for better performance and security
- **Playwright Compatibility**: Updated @playwright/test peer dependency from >=1.40.0 to >=1.55.0
- **DevDependencies Update**: Updated all devDependencies to latest stable versions:
  - @biomejs/biome: 1.4.0 → 2.2.2
  - @types/jest: 29.5.0 → 30.0.0
  - @types/node: 20.0.0 → 24.3.0
  - jest: 29.5.0 → 30.1.3
  - typescript: 5.0.0 → 5.9.2

### Removed
- **Dependency Cleanup**: Removed unused MSW dependency (30 packages reduction)

### Performance
- **Bundle Optimization**: Optimized bundle size through dependency cleanup
- **Compatibility**: Improved compatibility with latest stable versions

## [1.4.1] - 2025-09-03

### 🚀 Performance Improvements
- **Package Size Optimization**: Reduced package size from 100.1kB to 30.9kB (69% reduction)
- **Bundle Optimization**: Optimized dependencies and build output for smaller footprint

### 🧪 Testing Enhancements
- **Comprehensive Unit Test Suite**: Added extensive unit test coverage (67% coverage)
- **Test Infrastructure**: Enhanced testing framework with better coverage reporting
- **Quality Assurance**: Improved code reliability through comprehensive testing

### 📚 Documentation Updates
- **Installation Instructions**: Updated version references to v1.4.1
- **Package Information**: Updated documentation to reflect optimized package size
