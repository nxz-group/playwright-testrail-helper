# Core Module - Optimized for Serial Execution

## 📦 Bundle Size Comparison

| Version | Bundle Size | Reduction | Use Case |
|---------|-------------|-----------|----------|
| **Full** | 85.3k | 0% | Parallel workers, file persistence, complex parsing |
| **Core** | 19.5k | 77% | Serial execution, simple parsing, direct API calls |

## 🚀 Usage

### Migration for Serial Users (77% smaller bundle):

```typescript
// Before (85.3k bundle)
import { onTestRailHelper } from 'playwright-testrail-helper';

// After (19.5k bundle) - just change the import
import { onTestRailHelper } from 'playwright-testrail-helper/core';

// Same API - no code changes needed
await onTestRailHelper.updateTestResult(
  "My Test Run",
  123,               // Section ID
  1,                 // Platform ID
  testResults        // Playwright TestInfo array
);
```

## ✅ What's Included in Core

- ✅ **Basic TestRail API calls** (create runs, add results)
- ✅ **Simple Playwright TestInfo conversion**
- ✅ **Simple rich error comments** (Error + Failed Step + Duration)
- ✅ **Test case creation and management**
- ✅ **Same familiar API** (`updateTestResult`, `updateTestResultSingle`)

## ❌ What's Removed from Core

- ❌ **Worker coordination** (no file locks, no parallel worker support)
- ❌ **File persistence** (no test run state saving)
- ❌ **Complex error parsing** (no ANSI cleaning, attachment parsing)
- ❌ **Advanced TestInfo analysis** (no complex multi-source parsing)

## 🎯 Perfect For

- **CI/CD pipelines** running tests serially
- **Local development** with single test execution
- **Simple test reporting** without complex coordination
- **Smaller bundle requirements** for web applications

## 🔧 Technical Details

### Core Dependencies:
- `testrail-client.js` (8.4k) - TestRail API calls
- `core-helper.js` (5.8k) - Main logic
- `constants.js` (2.9k) - TestRail constants
- `core.js` (1.4k) - Module exports
- `errors.js` (1.0k) - Error handling
- `types/index.js` (0.1k) - TypeScript types

### What Happens:
1. **Direct API Flow:** Create run → Convert tests → Upload results
2. **No File Operations:** Everything in memory, no disk I/O
3. **Simple Conversion:** Basic TestInfo → TestCaseInfo mapping
4. **Immediate Execution:** No waiting for workers or coordination

## 🔄 When to Use Full Version

Use the full version (`playwright-testrail-helper`) if you need:
- Parallel worker coordination
- Test run state persistence
- Complex error analysis with attachments
- Advanced TestInfo parsing features
- File-based result aggregation

## 📊 Performance Impact

- **Bundle Size:** 77% reduction (85k → 19k)
- **Load Time:** ~65k less JavaScript to parse
- **Memory Usage:** No file operations or worker coordination
- **Execution Speed:** Direct API calls without coordination delays
