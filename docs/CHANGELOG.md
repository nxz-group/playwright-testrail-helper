# Changelog

All notable changes to this project will be documented in this file.

## [1.3.2] - 2025-09-02

### 🚀 Enhanced Features

#### Failed Test Reporting Improvements
- **Automatic Error Message Generation**: Added fallback error message generation for failed tests without `_failureInfo`
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
- **Enhanced TestCaseInfo**: Added `_failureInfo` and `_environmentInfo` properties

#### TestCaseManager Enhancements
- **Comment enhancement integration**: Uses CommentEnhancer for all test result comments
- **Configurable comment formatting**: Customizable comment enhancement options
- **Backward compatibility**: Existing code continues to work without changes

### 📊 New Comment Formats

#### Passed Tests
```
🤖 Automated Test
✅ Executed by Playwright
Duration: 2.3s
Executed: 12/15/2023, 10:30:45 AM
```

#### Failed Tests
```
🤖 Automated Test
❌ **Test Failed**
**Error:** Expected element to be visible, but it was not found
**Failed Step:** Click login button
**Location:** /tests/login.spec.ts:42:10
**Attachments:** 📸 Screenshot, 🎥 Video, 🔍 Trace

⏱️ **Duration:** 5.2s
🕐 **Executed:** 12/15/2023, 10:30:45 AM

🖥️ **Environment:**
• Browser: chromium 119.0.6045.105
• OS: macOS
• Node.js: v18.17.0
• Playwright: 1.40.0

📋 **Test Steps:**
1. ✅ Navigate to login page
2. ❌ Click login button
```

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
- `FailureInfo` - Interface for failure information
- `EnvironmentInfo` - Interface for environment information

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
