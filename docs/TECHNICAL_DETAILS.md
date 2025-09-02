# Technical Details & Advanced Configuration

> 📚 **Navigation:** [← Back to README](../README.md) | [API Reference →](API.md) | [Setup Guide →](SETUP.md)

## Architecture Overview

### Core Components

```
playwright-testrail-helper/
├── src/
│   ├── api/                    # TestRail API client
│   ├── managers/               # Business logic managers
│   ├── utils/                  # Utility functions
│   ├── types/                  # TypeScript definitions
│   └── examples/               # Usage examples
```

### Data Flow

```
Playwright Test → PlaywrightConverter → TestCaseManager → TestRail API
                       ↓
                 FailureCapture → CommentEnhancer → Enhanced Comments
```

## Advanced Configuration

### Environment-Specific Configurations

```typescript
// config/environments.ts
export const environments = {
  development: {
    testRail: {
      includeStackTrace: true,
      includeEnvironmentInfo: true,
      maxRetries: 3,
      retryDelay: 1000,
      commentPrefix: "🔧 Dev Test"
    }
  },
  staging: {
    testRail: {
      includeStackTrace: true,
      includeEnvironmentInfo: true,
      maxRetries: 5,
      retryDelay: 2000,
      commentPrefix: "🧪 Staging Test"
    }
  },
  production: {
    testRail: {
      includeStackTrace: false,
      includeEnvironmentInfo: false,
      maxRetries: 10,
      retryDelay: 5000,
      commentPrefix: "🚀 Production Test"
    }
  }
};

// Usage
const config = environments[process.env.NODE_ENV || 'development'];
```

### Custom Error Handling

```typescript
import { 
  TestRailError, 
  APIError, 
  ConfigurationError,
  onTestRailHelper 
} from 'playwright-testrail-helper';

class CustomTestRailHandler {
  private retryCount = 0;
  private maxRetries = 3;

  async updateWithRetry(runName: string, sectionId: number, platform: number, results: any[]) {
    while (this.retryCount < this.maxRetries) {
      try {
        await onTestRailHelper.updateTestResult(runName, sectionId, platform, results);
        return;
      } catch (error) {
        this.retryCount++;
        
        if (error instanceof APIError) {
          if (error.statusCode === 429) {
            // Rate limiting - exponential backoff
            const delay = Math.pow(2, this.retryCount) * 1000;
            await this.sleep(delay);
            continue;
          } else if (error.statusCode >= 500) {
            // Server error - retry with delay
            await this.sleep(2000);
            continue;
          }
        }
        
        if (error instanceof ConfigurationError) {
          // Configuration errors shouldn't be retried
          throw error;
        }
        
        if (this.retryCount >= this.maxRetries) {
          throw new Error(`Failed after ${this.maxRetries} retries: ${error.message}`);
        }
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### Performance Optimization

#### Batch Processing

```typescript
import { onTestRailHelper } from 'playwright-testrail-helper';

class BatchTestResultProcessor {
  private batch: any[] = [];
  private batchSize = 10;
  private flushInterval = 5000; // 5 seconds

  constructor() {
    // Auto-flush every 5 seconds
    setInterval(() => this.flush(), this.flushInterval);
  }

  async addResult(runName: string, sectionId: number, platform: number, result: any) {
    this.batch.push({ runName, sectionId, platform, result });
    
    if (this.batch.length >= this.batchSize) {
      await this.flush();
    }
  }

  async flush() {
    if (this.batch.length === 0) return;

    const batches = this.groupByRunAndSection(this.batch);
    
    for (const [key, results] of batches) {
      const [runName, sectionId, platform] = key.split('|');
      try {
        await onTestRailHelper.updateTestResult(
          runName, 
          parseInt(sectionId), 
          parseInt(platform), 
          results.map(r => r.result)
        );
      } catch (error) {
        console.error(`Failed to update batch for ${key}:`, error);
      }
    }
    
    this.batch = [];
  }

  private groupByRunAndSection(batch: any[]): Map<string, any[]> {
    const groups = new Map();
    
    for (const item of batch) {
      const key = `${item.runName}|${item.sectionId}|${item.platform}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(item);
    }
    
    return groups;
  }
}
```

#### Memory Management

```typescript
// config/memory-optimization.ts
export class MemoryOptimizedTestRail {
  private static instance: MemoryOptimizedTestRail;
  private cache = new Map<string, any>();
  private maxCacheSize = 1000;

  static getInstance(): MemoryOptimizedTestRail {
    if (!this.instance) {
      this.instance = new MemoryOptimizedTestRail();
    }
    return this.instance;
  }

  cacheResult(key: string, result: any) {
    if (this.cache.size >= this.maxCacheSize) {
      // Remove oldest entries
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, result);
  }

  getCachedResult(key: string): any {
    return this.cache.get(key);
  }

  clearCache() {
    this.cache.clear();
  }
}
```

## Parallel Execution Deep Dive

### Worker Coordination

```typescript
// Advanced worker coordination
import { WorkerManager } from 'playwright-testrail-helper';

class AdvancedWorkerCoordination {
  private workerManager: WorkerManager;
  private workerResults = new Map<number, any[]>();

  constructor() {
    this.workerManager = new WorkerManager();
  }

  async coordinateWorkers(testInfo: any) {
    const workerId = parseInt(process.env.TEST_WORKER_INDEX || '0');
    
    // Store results per worker
    if (!this.workerResults.has(workerId)) {
      this.workerResults.set(workerId, []);
    }
    
    this.workerResults.get(workerId)!.push(testInfo);
    
    // Check if this is the last test for this worker
    if (this.isLastTestForWorker(testInfo)) {
      await this.flushWorkerResults(workerId);
    }
  }

  private isLastTestForWorker(testInfo: any): boolean {
    // Implementation depends on your test structure
    return testInfo.parallelIndex === testInfo.workerIndex;
  }

  private async flushWorkerResults(workerId: number) {
    const results = this.workerResults.get(workerId) || [];
    
    // Process all results for this worker
    await onTestRailHelper.updateTestResult(
      `Worker ${workerId} Results`,
      100, // section ID
      2,   // platform
      results
    );
    
    // Clear worker results
    this.workerResults.delete(workerId);
  }
}
```

### Lock File Management

```typescript
// Advanced lock file handling
import fs from 'fs';
import path from 'path';

class LockFileManager {
  private lockDir: string;
  private lockTimeout = 30000; // 30 seconds

  constructor(lockDir = 'testRail') {
    this.lockDir = lockDir;
  }

  async acquireLock(lockName: string): Promise<boolean> {
    const lockFile = path.join(this.lockDir, `${lockName}.lock`);
    
    try {
      // Check for existing lock
      if (fs.existsSync(lockFile)) {
        const stats = fs.statSync(lockFile);
        const age = Date.now() - stats.mtime.getTime();
        
        if (age > this.lockTimeout) {
          // Stale lock, remove it
          fs.unlinkSync(lockFile);
        } else {
          return false; // Lock is active
        }
      }
      
      // Create lock file with process info
      const lockInfo = {
        pid: process.pid,
        workerId: process.env.TEST_WORKER_INDEX || '0',
        timestamp: new Date().toISOString()
      };
      
      fs.writeFileSync(lockFile, JSON.stringify(lockInfo, null, 2));
      return true;
      
    } catch (error) {
      console.error(`Failed to acquire lock ${lockName}:`, error);
      return false;
    }
  }

  releaseLock(lockName: string): void {
    const lockFile = path.join(this.lockDir, `${lockName}.lock`);
    
    try {
      if (fs.existsSync(lockFile)) {
        fs.unlinkSync(lockFile);
      }
    } catch (error) {
      console.error(`Failed to release lock ${lockName}:`, error);
    }
  }

  cleanupStaleLocks(): void {
    try {
      if (!fs.existsSync(this.lockDir)) return;
      
      const files = fs.readdirSync(this.lockDir);
      const lockFiles = files.filter(f => f.endsWith('.lock'));
      
      for (const lockFile of lockFiles) {
        const filePath = path.join(this.lockDir, lockFile);
        const stats = fs.statSync(filePath);
        const age = Date.now() - stats.mtime.getTime();
        
        if (age > this.lockTimeout) {
          fs.unlinkSync(filePath);
          console.log(`Cleaned up stale lock: ${lockFile}`);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup stale locks:', error);
    }
  }
}
```

## API Rate Limiting & Resilience

### Intelligent Rate Limiting

```typescript
class RateLimitedTestRailClient {
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessing = false;
  private requestsPerMinute = 60;
  private requestInterval = 60000 / this.requestsPerMinute; // ~1 second

  async makeRequest<T>(requestFn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await requestFn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.isProcessing || this.requestQueue.length === 0) return;
    
    this.isProcessing = true;
    
    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift()!;
      
      try {
        await request();
      } catch (error) {
        console.error('Request failed:', error);
      }
      
      // Wait before next request
      if (this.requestQueue.length > 0) {
        await this.sleep(this.requestInterval);
      }
    }
    
    this.isProcessing = false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

## Debugging & Monitoring

### Debug Mode

```typescript
// Enable debug logging
process.env.DEBUG = 'playwright-testrail-helper:*';

// Or specific modules
process.env.DEBUG = 'playwright-testrail-helper:api,playwright-testrail-helper:manager';
```

### Performance Monitoring

```typescript
class PerformanceMonitor {
  private metrics = new Map<string, number[]>();

  startTimer(operation: string): () => void {
    const start = performance.now();
    
    return () => {
      const duration = performance.now() - start;
      this.recordMetric(operation, duration);
    };
  }

  recordMetric(operation: string, duration: number) {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }
    this.metrics.get(operation)!.push(duration);
  }

  getStats(operation: string) {
    const durations = this.metrics.get(operation) || [];
    if (durations.length === 0) return null;

    const sorted = durations.sort((a, b) => a - b);
    return {
      count: durations.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: durations.reduce((a, b) => a + b, 0) / durations.length,
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    };
  }

  printStats() {
    console.log('\n=== Performance Stats ===');
    for (const [operation, _] of this.metrics) {
      const stats = this.getStats(operation);
      if (stats) {
        console.log(`${operation}:`, {
          count: stats.count,
          avg: `${stats.avg.toFixed(2)}ms`,
          p95: `${stats.p95.toFixed(2)}ms`,
          max: `${stats.max.toFixed(2)}ms`
        });
      }
    }
  }
}

// Usage
const monitor = new PerformanceMonitor();

test.afterEach(async ({ }, testInfo) => {
  const endTimer = monitor.startTimer('testRailUpdate');
  
  await onTestRailHelper.updateTestResult(
    "Test Run",
    100,
    2,
    [testInfo]
  );
  
  endTimer();
});

// Print stats at the end
process.on('exit', () => {
  monitor.printStats();
});
```

## Security Best Practices

### Credential Management

```typescript
// config/security.ts
export class SecureCredentialManager {
  private static validateCredentials() {
    const required = [
      'TEST_RAIL_HOST',
      'TEST_RAIL_USERNAME', 
      'TEST_RAIL_PASSWORD',
      'TEST_RAIL_PROJECT_ID'
    ];

    for (const env of required) {
      if (!process.env[env]) {
        throw new Error(`Missing required environment variable: ${env}`);
      }
      
      // Validate format
      if (env === 'TEST_RAIL_HOST' && !process.env[env]!.startsWith('https://')) {
        throw new Error('TEST_RAIL_HOST must use HTTPS');
      }
      
      if (env === 'TEST_RAIL_PASSWORD' && process.env[env]!.length < 10) {
        console.warn('TEST_RAIL_PASSWORD appears to be too short for an API key');
      }
    }
  }

  static sanitizeForLogs(data: any): any {
    const sanitized = { ...data };
    
    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'key', 'secret'];
    
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '***REDACTED***';
      }
    }
    
    return sanitized;
  }
}
```

### Network Security

```typescript
// config/network-security.ts
import https from 'https';

export const secureAxiosConfig = {
  httpsAgent: new https.Agent({
    rejectUnauthorized: true,
    minVersion: 'TLSv1.2'
  }),
  timeout: 30000,
  maxRedirects: 3,
  validateStatus: (status: number) => status < 500
};
```---


## 📚 Related Documentation

- **[← Back to README](../README.md)** - Main documentation
- **[API Reference](API.md)** - Complete API documentation
- **[Setup Guide](SETUP.md)** - Development setup instructions
- **[Environment Variables](ENVIRONMENT_VARIABLES.md)** - Configuration guide
- **[Examples](EXAMPLES.md)** - Comprehensive usage examples
- **[Integration Examples](INTEGRATION_EXAMPLES.md)** - CI/CD & framework examples