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
- **Dependency Cleanup**: Removed unused MSW dependency (30 packages reduction)

### Performance
- **Bundle Optimization**: Optimized bundle size through dependency cleanup
- **Compatibility**: Improved compatibility with latest stable versions

## [1.4.0] - 2025-09-02

### 🚀 New Features

#### Smart TestRail Comment Enhancement
- **Intelligent Error Detection**: Auto-detect UI vs API test failures for optimized comment formatting
- **Enhanced Comment Structure**: All comments now include Status + Duration headers for consistency
- **Text Truncation**: Automatic truncation of long error messages (Locator: 80 chars, Expected: 50 chars, Received: 100 chars)
- **Smart Call Log Inclusion**: Call logs included only when they contain useful debugging information
- **ANSI Code Cleaning**: Automatic removal of terminal color codes from error messages

#### Improved Error Formatting
- **UI Test Errors**: Enhanced display of Locator, Expected/Received patterns, and Call logs
- **API Test Errors**: Clean formatting of Expected/Received values with matcher information
- **Consistent Format**: Standardized comment structure across all test types

### 🔧 Technical Improvements
- **Complete CommentEnhancer Rewrite**: Replaced legacy comment logic with new smart formatting system
- **Updated TestCaseInfo Interface**: Changed from `_failureInfo` to `errors` array for better Playwright compatibility
- **Removed EnvironmentInfo**: Simplified codebase by removing unused environment information features
- **Fixed TypeScript Compilation**: Resolved all type errors and interface mismatches
- **Updated TestCaseManager**: Now uses new CommentEnhancer for all test result formatting

### 🐛 Bug Fixes
- **Fixed Error Message Display**: Resolved issue where error messages weren't appearing in TestRail comments
- **Interface Synchronization**: Fixed mismatch between TestCaseInfo interface and actual implementation
- **Build Compilation**: Fixed TypeScript errors in playwright-converter.ts and testinfo-analyzer.ts

### 📊 New Comment Examples

#### Passed Test
```
Status: Passed
Duration: 4.6s

Executed by Playwright
```

#### Failed UI Test
```
Status: Failed
Duration: 38.6s

Error: expect(locator).toHaveClass(expected) failed

Locator: getByTestId('btn-pagination-number').nth(1)
Expected: /selected/
Received: "w-[35px] h-[30px] border-1 border-[#00000033]..."

Call log:
  - Expect "toHaveClass" with timeout 5000ms
  - waiting for getByTestId('btn-pagination-number').nth(1)
```

#### Failed API Test
```
Status: Failed
Duration: 670ms

Error: expect(received).toBe(expected) // Object.is equality

Expected: 400
Received: 200
Matcher: toBe
```

### 🔄 Breaking Changes
- **TestCaseInfo Interface**: Changed `_failureInfo` property to `errors` array
- **CommentEnhancer Methods**: Updated method signatures (removed EnvironmentInfo parameters)

### 📦 Updated Exports
- Enhanced `CommentEnhancer` class with new formatting methods
- Updated `TestCaseInfo` interface structure
- Removed `EnvironmentInfo` interface and related exports

## [1.3.2] - 2025-09-02

### 🚀 Enhanced Features

#### Failed Test Reporting Improvements
- **Automatic Error Message Generation**: Added fallback error message generation for failed tests with smart error detection
- **Enhanced Comment Formatting**: Improved TestRail comment structure to show failed steps and error details
- **TestInfoAnalyzer Utility**: New utility for comprehensive Playwright TestInfo processing and analysis
- **Failed Step Identification**: Automatic detection and highlighting of failed test steps in TestRail comments
- **Error Message Extraction**: Enhanced error extraction from multiple sources (test errors, step errors, timeout messages)

#### New Helper Functions
- **Easy Failed Test Import**: Simplified functions for importing failed tests to TestRail
- **Step-by-Step Breakdown**: Enhanced step analysis with status icons (✅ ❌ ⏭️)
- **Failed Steps Summary**: Dedicated section showing only failed steps for quick debugging
- **Timeout & Interruption Support**: Special handling for timeout and interruption scenarios

#### New Examples Added
- `detailed-failed-steps.example.ts` - Comprehensive failed step analysis examples
- `import-failed-test.example.ts` - Helper functions for failed test imports
- `playwright-testinfo-analysis.example.ts` - TestInfo processing examples
- `your-failed-test.example.ts` - Quick start for failed test debugging

### 🔧 Technical Improvements
- **Enhanced TestCaseManager**: Improved comment generation logic for failed tests
- **CommentEnhancer Updates**: Better formatting for failed step information
- **New Export**: Added `TestInfoAnalyzer` to main exports

## [1.3.0] - 2025-01-09

### 🔄 Major Refactoring

#### Internal Library Conversion
- **Package Configuration**: Converted from public npm package to internal library
- **Private Package**: Added `"private": true` to prevent accidental publishing
- **Simplified Metadata**: Removed npm publishing related fields (keywords, homepage, bugs, repository, license, author, files, publishConfig)
- **Updated Description**: Changed to reflect internal library usage
- **Build Scripts**: Updated `prepublishOnly` to `prebuild` for internal development workflow

#### Documentation Restructure
- **Organized Structure**: Moved all documentation to `docs/` folder for better organization
- **Installation Guide**: Updated installation instructions for internal library usage including git installation and local development setup
- **License Update**: Changed from MIT to internal use only
- **Removed Files**: Cleaned up public-facing documentation files no longer needed for internal use

#### File Cleanup
- **Removed .npmignore**: Not needed since package won't be published to npm
- **Removed LICENSE**: Not required for internal library
- **Removed Public Docs**: Cleaned up various public documentation files (ENHANCED_FEATURES.md, NEW_FEATURES_SUMMARY.md, etc.)

### 📚 Documentation Improvements
- **Installation Methods**: Added multiple installation options including SSH, HTTPS, and local linking
- **Internal Focus**: Updated all documentation to reflect internal library usage
- **Development Setup**: Enhanced local development instructions with npm link workflow

### 🔧 Technical Changes
- **Version Bump**: Updated to 1.3.0 to reflect significant structural changes
- **Build Process**: Streamlined for internal development and distribution
- **Repository Structure**: Cleaner structure focused on internal development needs

## [1.2.0] - 2024-08-31

### 🚀 New Features

#### Automated Failure Reason Capture
- **FailureCapture utility**: Automatically extracts detailed failure information from Playwright test results
- **Error message cleaning**: Removes ANSI escape codes and formats error messages
- **Stack trace processing**: Captures and truncates stack traces for debugging
- **Failed step identification**: Identifies which specific test step failed
- **Location tracking**: Captures file, line, and column information for failures
- **Attachment detection**: Links screenshots, videos, and trace files
- **Timeout handling**: Special processing for timeout failures
- **Interruption detection**: Detects browser crashes and external interruptions

#### Result Comment Enhancement
- **CommentEnhancer utility**: Creates rich, detailed comments for TestRail results
- **Status indicators**: Emoji-based status indicators (✅ ❌ ⏭️ 🚫 ⏱️)
- **Comprehensive failure details**: Formatted failure information with context
- **Duration tracking**: Human-readable test duration formatting
- **Environment information**: Browser, OS, Node.js, and Playwright version tracking
- **Test steps summary**: Overview of executed test steps with status
- **Customizable formatting**: Configurable comment structure and content
- **Length management**: Automatic truncation for TestRail comment limits

### 🔧 Enhanced Integration

#### PlaywrightConverter Improvements
- **Automatic failure capture**: Failure information automatically extracted during conversion
- **Environment detection**: System and browser information automatically captured
- **Enhanced TestCaseInfo**: Added `errors` array for better error handling

#### TestCaseManager Enhancements
- **Comment enhancement integration**: Uses CommentEnhancer for all test result comments
- **Configurable comment formatting**: Customizable comment enhancement options
- **Backward compatibility**: Existing code continues to work without changes

### 📚 New Examples and Documentation
- **Enhanced failure capture example**: Complete example showing new features
- **Configuration examples**: Environment-specific configurations
- **Migration guide**: Backward compatibility and gradual adoption guide
- **Comprehensive documentation**: Detailed feature documentation in ENHANCED_FEATURES.md

### 🔄 Breaking Changes
- None - All changes are backward compatible

### 📦 New Exports
- `FailureCapture` - Utility for capturing failure information
- `CommentEnhancer` - Utility for enhancing TestRail comments
- `CommentEnhancementConfig` - Configuration interface for comment enhancement
- `TestCaseInfo` - Enhanced interface with errors array

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.1] - 2024-08-31

### Fixed
- **Breaking**: Fixed environment variable initialization issue that caused `ConfigurationError` at import time
- Implemented lazy loading for TestRail configuration to prevent errors when importing the library without environment variables set
- Environment variables are now validated only when `updateTestResult()` is called, not at module import time

### Technical Changes
- Moved environment variable validation from constructor to private `initialize()` method
- Added lazy initialization pattern to `TestRailHelper` class
- Maintained backward compatibility - no API changes required for existing users

## [1.1.0] - 2024-08-31

### Added
- New Playwright converter utility (`src/utils/playwright-converter.ts`)
- Playwright integration example (`src/examples/playwright-integration.example.ts`)
- Section IDs example (`src/examples/section-ids.example.ts`)
- Worker manager for better parallel execution handling (`src/managers/worker-manager.ts`)
- Environment variables documentation (`ENVIRONMENT_VARIABLES.md`)
- Setup documentation (`SETUP.md`)

### Enhanced
- Improved test case manager with better error handling
- Enhanced test run manager with more robust coordination
- Updated validation utilities with additional checks
- Better TypeScript type definitions and exports
- Improved constants management

### Technical Improvements
- Enhanced dist build output with new utilities
- Better modular architecture with examples separation
- Improved error handling across all managers
- Enhanced API client with better retry mechanisms

## [1.0.0] - 2024-08-31

### Added
- Initial release of playwright-testrail-helper
- TestRail integration with Playwright test automation
- Support for parallel execution (up to 10 workers)
- Atomic file operations with race condition protection
- Network resilient API calls with retry logic
- Smart worker coordination with adaptive timeouts
- Comprehensive error handling (ConfigurationError, APIError, TestRailError)
- Full TypeScript support with type definitions
- Configurable environment variables
- Automatic test case synchronization
- Test run management with file-based coordination
- Platform support for various test environments

### Features
- **Parallel Execution**: Safe concurrent execution with up to 10 workers
- **Race Condition Safe**: Atomic file operations and intelligent locking
- **Network Resilient**: Automatic retry logic for API failures with exponential backoff
- **Smart Coordination**: Adaptive worker synchronization with intelligent timeout handling
- **Production Ready**: Comprehensive error handling and validation
- **Full TypeScript**: Complete type safety and IntelliSense support

### Technical Details
- Modular architecture with separated concerns
- Path mapping for clean imports (@api, @managers, @utils, @types)
- Stale lock file cleanup (30-second timeout)
- Disk space and permission validation
- API rate limiting protection
- Configurable test result comments and directory structure
