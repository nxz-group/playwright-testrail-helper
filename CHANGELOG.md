# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
