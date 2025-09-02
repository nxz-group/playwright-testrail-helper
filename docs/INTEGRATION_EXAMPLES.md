# Integration Examples

> 📚 **Navigation:** [← Back to README](../README.md) | [Examples →](EXAMPLES.md) | [Setup Guide →](SETUP.md)

## CI/CD Pipeline Integration

### GitHub Actions

```yaml
# .github/workflows/playwright-tests.yml
name: Playwright Tests with TestRail Integration

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]
  schedule:
    - cron: '0 2 * * *' # Daily at 2 AM

jobs:
  test:
    timeout-minutes: 60
    runs-on: ubuntu-latest
    strategy:
      matrix:
        shard: [1, 2, 3, 4]
    
    steps:
    - uses: actions/checkout@v4
    
    - uses: actions/setup-node@v4
      with:
        node-version: 18
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Install Playwright Browsers
      run: npx playwright install --with-deps
    
    - name: Run Playwright tests
      env:
        TEST_RAIL_HOST: ${{ secrets.TEST_RAIL_HOST }}
        TEST_RAIL_USERNAME: ${{ secrets.TEST_RAIL_USERNAME }}
        TEST_RAIL_PASSWORD: ${{ secrets.TEST_RAIL_PASSWORD }}
        TEST_RAIL_PROJECT_ID: ${{ secrets.TEST_RAIL_PROJECT_ID }}
        RUN_NAME: "CI Build ${{ github.run_number }} - Shard ${{ matrix.shard }}"
        TEST_RAIL_EXECUTED_BY: "GitHub Actions - ${{ github.actor }}"
      run: npx playwright test --shard=${{ matrix.shard }}/4
    
    - name: Upload test results
      uses: actions/upload-artifact@v4
      if: always()
      with:
        name: playwright-report-${{ matrix.shard }}
        path: |
          playwright-report/
          test-results/
          testRail/
        retention-days: 30

  merge-reports:
    if: always()
    needs: [test]
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: 18
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Download all artifacts
      uses: actions/download-artifact@v4
      with:
        path: all-reports
    
    - name: Merge HTML reports
      run: npx playwright merge-reports --reporter html ./all-reports/playwright-report-*
    
    - name: Upload merged report
      uses: actions/upload-artifact@v4
      with:
        name: merged-playwright-report
        path: playwright-report/
```

### Jenkins Pipeline

```groovy
// Jenkinsfile
pipeline {
    agent any
    
    environment {
        TEST_RAIL_HOST = credentials('testrail-host')
        TEST_RAIL_USERNAME = credentials('testrail-username')
        TEST_RAIL_PASSWORD = credentials('testrail-password')
        TEST_RAIL_PROJECT_ID = credentials('testrail-project-id')
        RUN_NAME = "Jenkins Build ${BUILD_NUMBER}"
        TEST_RAIL_EXECUTED_BY = "Jenkins - ${BUILD_USER}"
    }
    
    stages {
        stage('Setup') {
            steps {
                sh 'npm ci'
                sh 'npx playwright install --with-deps'
            }
        }
        
        stage('Test - Parallel') {
            parallel {
                stage('Chrome Tests') {
                    steps {
                        script {
                            env.TEST_WORKER_INDEX = '0'
                        }
                        sh 'npx playwright test --project=chromium'
                    }
                }
                stage('Firefox Tests') {
                    steps {
                        script {
                            env.TEST_WORKER_INDEX = '1'
                        }
                        sh 'npx playwright test --project=firefox'
                    }
                }
                stage('Safari Tests') {
                    steps {
                        script {
                            env.TEST_WORKER_INDEX = '2'
                        }
                        sh 'npx playwright test --project=webkit'
                    }
                }
            }
        }
    }
    
    post {
        always {
            publishHTML([
                allowMissing: false,
                alwaysLinkToLastBuild: true,
                keepAll: true,
                reportDir: 'playwright-report',
                reportFiles: 'index.html',
                reportName: 'Playwright Test Report'
            ])
            
            archiveArtifacts artifacts: 'testRail/**/*', fingerprint: true
        }
    }
}
```

### Azure DevOps

```yaml
# azure-pipelines.yml
trigger:
- main
- develop

pool:
  vmImage: 'ubuntu-latest'

variables:
  TEST_RAIL_HOST: $(testrail-host)
  TEST_RAIL_USERNAME: $(testrail-username)
  TEST_RAIL_PASSWORD: $(testrail-password)
  TEST_RAIL_PROJECT_ID: $(testrail-project-id)
  RUN_NAME: 'Azure DevOps Build $(Build.BuildNumber)'
  TEST_RAIL_EXECUTED_BY: 'Azure DevOps - $(Build.RequestedFor)'

strategy:
  matrix:
    shard1:
      SHARD: '1/4'
      TEST_WORKER_INDEX: '0'
    shard2:
      SHARD: '2/4'
      TEST_WORKER_INDEX: '1'
    shard3:
      SHARD: '3/4'
      TEST_WORKER_INDEX: '2'
    shard4:
      SHARD: '4/4'
      TEST_WORKER_INDEX: '3'

steps:
- task: NodeTool@0
  inputs:
    versionSpec: '18'
  displayName: 'Install Node.js'

- script: |
    npm ci
    npx playwright install --with-deps
  displayName: 'Install dependencies'

- script: |
    npx playwright test --shard=$(SHARD)
  displayName: 'Run Playwright tests'
  env:
    TEST_RAIL_HOST: $(TEST_RAIL_HOST)
    TEST_RAIL_USERNAME: $(TEST_RAIL_USERNAME)
    TEST_RAIL_PASSWORD: $(TEST_RAIL_PASSWORD)
    TEST_RAIL_PROJECT_ID: $(TEST_RAIL_PROJECT_ID)
    RUN_NAME: $(RUN_NAME)
    TEST_RAIL_EXECUTED_BY: $(TEST_RAIL_EXECUTED_BY)
    TEST_WORKER_INDEX: $(TEST_WORKER_INDEX)

- task: PublishTestResults@2
  condition: always()
  inputs:
    testResultsFormat: 'JUnit'
    testResultsFiles: 'test-results/junit.xml'
    testRunTitle: 'Playwright Tests - Shard $(SHARD)'

- task: PublishHtmlReport@1
  condition: always()
  inputs:
    reportDir: 'playwright-report'
    tabName: 'Playwright Report'
```

## Docker Integration

### Dockerfile for Testing

```dockerfile
# Dockerfile.test
FROM mcr.microsoft.com/playwright:v1.40.0-focal

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build if needed
RUN npm run build

# Set environment variables
ENV TEST_RAIL_DIR=/app/testRail
ENV NODE_ENV=test

# Create testRail directory with proper permissions
RUN mkdir -p /app/testRail && chmod 755 /app/testRail

# Run tests
CMD ["npm", "run", "test"]
```

### Docker Compose for Local Development

```yaml
# docker-compose.test.yml
version: '3.8'

services:
  playwright-tests:
    build:
      context: .
      dockerfile: Dockerfile.test
    environment:
      - TEST_RAIL_HOST=${TEST_RAIL_HOST}
      - TEST_RAIL_USERNAME=${TEST_RAIL_USERNAME}
      - TEST_RAIL_PASSWORD=${TEST_RAIL_PASSWORD}
      - TEST_RAIL_PROJECT_ID=${TEST_RAIL_PROJECT_ID}
      - RUN_NAME=Docker Local Tests
      - TEST_RAIL_EXECUTED_BY=Docker Compose
    volumes:
      - ./test-results:/app/test-results
      - ./testRail:/app/testRail
      - ./playwright-report:/app/playwright-report
    networks:
      - test-network

  # Optional: Run multiple workers
  playwright-worker-1:
    extends: playwright-tests
    environment:
      - TEST_WORKER_INDEX=0
    command: npx playwright test --workers=1

  playwright-worker-2:
    extends: playwright-tests
    environment:
      - TEST_WORKER_INDEX=1
    command: npx playwright test --workers=1

networks:
  test-network:
    driver: bridge
```

### Kubernetes Job

```yaml
# k8s-playwright-job.yml
apiVersion: batch/v1
kind: Job
metadata:
  name: playwright-testrail-tests
spec:
  parallelism: 4
  completions: 4
  template:
    spec:
      containers:
      - name: playwright-tests
        image: your-registry/playwright-testrail:latest
        env:
        - name: TEST_RAIL_HOST
          valueFrom:
            secretKeyRef:
              name: testrail-secrets
              key: host
        - name: TEST_RAIL_USERNAME
          valueFrom:
            secretKeyRef:
              name: testrail-secrets
              key: username
        - name: TEST_RAIL_PASSWORD
          valueFrom:
            secretKeyRef:
              name: testrail-secrets
              key: password
        - name: TEST_RAIL_PROJECT_ID
          valueFrom:
            configMapKeyRef:
              name: testrail-config
              key: project-id
        - name: TEST_WORKER_INDEX
          value: "$(JOB_COMPLETION_INDEX)"
        - name: RUN_NAME
          value: "Kubernetes Job $(JOB_NAME)"
        command: ["npx", "playwright", "test", "--shard=$(JOB_COMPLETION_INDEX + 1)/4"]
        volumeMounts:
        - name: test-results
          mountPath: /app/test-results
        - name: testrail-data
          mountPath: /app/testRail
      volumes:
      - name: test-results
        emptyDir: {}
      - name: testrail-data
        persistentVolumeClaim:
          claimName: testrail-pvc
      restartPolicy: Never
  backoffLimit: 3
```

## Framework-Specific Examples

### Playwright with TypeScript

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: [
    ['html'],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['json', { outputFile: 'test-results/results.json' }]
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    }
  ]
});
```

```typescript
// tests/global-setup.ts
import { onTestRailHelper, Platform } from 'playwright-testrail-helper';

// Section IDs configuration
export const SECTION_IDS = {
  authentication: {
    login: 100,
    logout: 101,
    registration: 102
  },
  ecommerce: {
    cart: 200,
    checkout: 201,
    payment: 202
  },
  admin: {
    userManagement: 300,
    settings: 301
  }
} as const;

// Platform mapping
export const PLATFORM_MAP = {
  'chromium': Platform.WEB_DESKTOP,
  'firefox': Platform.WEB_DESKTOP,
  'webkit': Platform.WEB_DESKTOP,
  'mobile-chrome': Platform.MOBILE_APPLICATION
} as const;

async function globalSetup() {
  // Validate TestRail configuration
  try {
    console.log('Validating TestRail configuration...');
    // This will throw if configuration is invalid
    await onTestRailHelper.updateTestResult(
      'Configuration Test',
      999, // Non-existent section for validation
      Platform.OTHER,
      []
    );
  } catch (error) {
    if (error.message.includes('Missing required environment variables')) {
      console.error('TestRail configuration is invalid:', error.message);
      process.exit(1);
    }
    // Other errors are expected for validation test
  }
  
  console.log('TestRail configuration validated successfully');
}

export default globalSetup;
```

```typescript
// tests/base-test.ts
import { test as base, expect } from '@playwright/test';
import { onTestRailHelper } from 'playwright-testrail-helper';
import { SECTION_IDS, PLATFORM_MAP } from './global-setup';

type TestFixtures = {
  testRailReporter: {
    updateResult: (sectionId: number, testInfo: any) => Promise<void>;
  };
};

export const test = base.extend<TestFixtures>({
  testRailReporter: async ({ }, use, testInfo) => {
    const reporter = {
      async updateResult(sectionId: number, testInfoParam: any) {
        const projectName = testInfoParam.project.name;
        const platform = PLATFORM_MAP[projectName as keyof typeof PLATFORM_MAP] || Platform.WEB_DESKTOP;
        
        await onTestRailHelper.updateTestResultFromPlaywrightSingle(
          `Automated Tests - ${new Date().toISOString().split('T')[0]}`,
          sectionId,
          platform,
          testInfoParam
        );
      }
    };
    
    await use(reporter);
  }
});

export { expect };
```

```typescript
// tests/auth/login.spec.ts
import { test, expect } from '../base-test';
import { SECTION_IDS } from '../global-setup';

test.describe('Authentication', () => {
  test('User can login with valid credentials @smoke @login @high', async ({ 
    page, 
    testRailReporter 
  }, testInfo) => {
    await page.goto('/login');
    
    await test.step('Fill login form', async () => {
      await page.fill('#username', 'testuser@example.com');
      await page.fill('#password', 'validpassword');
    });
    
    await test.step('Submit login', async () => {
      await page.click('#login-button');
    });
    
    await test.step('Verify successful login', async () => {
      await expect(page.locator('.welcome-message')).toBeVisible();
      await expect(page.locator('.user-menu')).toBeVisible();
    });
    
    // Report to TestRail
    await testRailReporter.updateResult(SECTION_IDS.authentication.login, testInfo);
  });

  test('User cannot login with invalid credentials @login @negative', async ({ 
    page, 
    testRailReporter 
  }, testInfo) => {
    await page.goto('/login');
    
    await page.fill('#username', 'invalid@example.com');
    await page.fill('#password', 'wrongpassword');
    await page.click('#login-button');
    
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('Invalid credentials');
    
    await testRailReporter.updateResult(SECTION_IDS.authentication.login, testInfo);
  });
});
```

### Jest Integration

```typescript
// jest-testrail-reporter.ts
import { onTestRailHelper, Platform } from 'playwright-testrail-helper';

class JestTestRailReporter {
  onTestResult(test: any, testResult: any) {
    // Convert Jest test result to TestRail format
    const testCases = testResult.testResults.map((result: any) => ({
      title: result.fullName,
      tags: this.extractTags(result.fullName),
      status: this.mapJestStatus(result.status),
      duration: result.duration || 0,
      _steps: result.failureMessages?.map((msg: string, index: number) => ({
        category: 'test.step',
        title: `Step ${index + 1}`,
        error: msg
      })) || []
    }));

    // Update TestRail
    onTestRailHelper.updateTestResult(
      'Jest Test Run',
      100, // Section ID
      Platform.API,
      testCases
    ).catch(console.error);
  }

  private extractTags(testName: string): string[] {
    const tagRegex = /@(\w+)/g;
    const matches = testName.match(tagRegex);
    return matches || [];
  }

  private mapJestStatus(jestStatus: string): string {
    const statusMap: Record<string, string> = {
      'passed': 'passed',
      'failed': 'failed',
      'skipped': 'skipped',
      'pending': 'skipped',
      'todo': 'skipped'
    };
    return statusMap[jestStatus] || 'failed';
  }
}

export default JestTestRailReporter;
```

### Cypress Integration

```typescript
// cypress/support/testrail-reporter.ts
import { onTestRailHelper, Platform } from 'playwright-testrail-helper';

Cypress.on('test:after:run', (test, runnable) => {
  const testCase = {
    title: test.title,
    tags: extractTagsFromTitle(test.title),
    status: mapCypressStatus(test.state),
    duration: test.duration || 0,
    _steps: test.err ? [{
      category: 'test.step',
      title: 'Test execution',
      error: test.err.message
    }] : []
  };

  onTestRailHelper.updateTestResult(
    'Cypress Test Run',
    200, // Section ID
    Platform.WEB_DESKTOP,
    [testCase]
  ).catch(console.error);
});

function extractTagsFromTitle(title: string): string[] {
  const tagRegex = /@(\w+)/g;
  return title.match(tagRegex) || [];
}

function mapCypressStatus(cypressState: string): string {
  const statusMap: Record<string, string> = {
    'passed': 'passed',
    'failed': 'failed',
    'skipped': 'skipped',
    'pending': 'skipped'
  };
  return statusMap[cypressState] || 'failed';
}
```

## Monitoring & Alerting

### Slack Integration

```typescript
// utils/slack-notifier.ts
import axios from 'axios';

export class SlackNotifier {
  private webhookUrl: string;

  constructor(webhookUrl: string) {
    this.webhookUrl = webhookUrl;
  }

  async notifyTestResults(runName: string, results: any[]) {
    const passed = results.filter(r => r.status === 'passed').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const total = results.length;
    
    const color = failed === 0 ? 'good' : failed > total * 0.1 ? 'danger' : 'warning';
    
    const message = {
      attachments: [{
        color,
        title: `Test Results: ${runName}`,
        fields: [
          { title: 'Total Tests', value: total.toString(), short: true },
          { title: 'Passed', value: passed.toString(), short: true },
          { title: 'Failed', value: failed.toString(), short: true },
          { title: 'Success Rate', value: `${((passed / total) * 100).toFixed(1)}%`, short: true }
        ],
        footer: 'TestRail Integration',
        ts: Math.floor(Date.now() / 1000)
      }]
    };

    try {
      await axios.post(this.webhookUrl, message);
    } catch (error) {
      console.error('Failed to send Slack notification:', error);
    }
  }
}

// Usage in test setup
const slackNotifier = new SlackNotifier(process.env.SLACK_WEBHOOK_URL!);

test.afterAll(async () => {
  // Collect all test results and notify
  const results = await collectTestResults();
  await slackNotifier.notifyTestResults('Nightly Tests', results);
});
```

### Email Reporting

```typescript
// utils/email-reporter.ts
import nodemailer from 'nodemailer';

export class EmailReporter {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  async sendTestReport(runName: string, results: any[], reportUrl?: string) {
    const passed = results.filter(r => r.status === 'passed').length;
    const failed = results.filter(r => r.status === 'failed').length;
    
    const html = `
      <h2>Test Execution Report: ${runName}</h2>
      <table border="1" style="border-collapse: collapse;">
        <tr>
          <th>Metric</th>
          <th>Value</th>
        </tr>
        <tr>
          <td>Total Tests</td>
          <td>${results.length}</td>
        </tr>
        <tr>
          <td>Passed</td>
          <td style="color: green;">${passed}</td>
        </tr>
        <tr>
          <td>Failed</td>
          <td style="color: red;">${failed}</td>
        </tr>
        <tr>
          <td>Success Rate</td>
          <td>${((passed / results.length) * 100).toFixed(1)}%</td>
        </tr>
      </table>
      
      ${reportUrl ? `<p><a href="${reportUrl}">View Full Report</a></p>` : ''}
      
      <h3>Failed Tests</h3>
      <ul>
        ${results
          .filter(r => r.status === 'failed')
          .map(r => `<li>${r.title}</li>`)
          .join('')}
      </ul>
    `;

    await this.transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: process.env.REPORT_RECIPIENTS,
      subject: `Test Report: ${runName} - ${failed === 0 ? 'PASSED' : 'FAILED'}`,
      html
    });
  }
}
```

## Custom Integrations

### Database Logging

```typescript
// utils/database-logger.ts
import { Pool } from 'pg';

export class DatabaseLogger {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
  }

  async logTestExecution(runName: string, results: any[]) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Insert test run
      const runResult = await client.query(
        'INSERT INTO test_runs (name, executed_at, total_tests, passed_tests, failed_tests) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [
          runName,
          new Date(),
          results.length,
          results.filter(r => r.status === 'passed').length,
          results.filter(r => r.status === 'failed').length
        ]
      );
      
      const runId = runResult.rows[0].id;
      
      // Insert individual test results
      for (const result of results) {
        await client.query(
          'INSERT INTO test_results (run_id, test_name, status, duration, error_message) VALUES ($1, $2, $3, $4, $5)',
          [runId, result.title, result.status, result.duration, result.error || null]
        );
      }
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
```

### Metrics Collection

```typescript
// utils/metrics-collector.ts
import { StatsD } from 'node-statsd';

export class MetricsCollector {
  private statsd: StatsD;

  constructor() {
    this.statsd = new StatsD({
      host: process.env.STATSD_HOST || 'localhost',
      port: parseInt(process.env.STATSD_PORT || '8125')
    });
  }

  recordTestMetrics(runName: string, results: any[]) {
    const tags = [`run:${runName.replace(/\s+/g, '_')}`];
    
    // Count metrics
    this.statsd.gauge('tests.total', results.length, tags);
    this.statsd.gauge('tests.passed', results.filter(r => r.status === 'passed').length, tags);
    this.statsd.gauge('tests.failed', results.filter(r => r.status === 'failed').length, tags);
    
    // Duration metrics
    const durations = results.map(r => r.duration || 0);
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    
    this.statsd.gauge('tests.avg_duration', avgDuration, tags);
    this.statsd.gauge('tests.max_duration', Math.max(...durations), tags);
    
    // Success rate
    const successRate = (results.filter(r => r.status === 'passed').length / results.length) * 100;
    this.statsd.gauge('tests.success_rate', successRate, tags);
  }
}
```--
-

## 📚 Related Documentation

- **[← Back to README](../README.md)** - Main documentation
- **[Examples](EXAMPLES.md)** - Comprehensive usage examples
- **[Setup Guide](SETUP.md)** - Development setup instructions
- **[Environment Variables](ENVIRONMENT_VARIABLES.md)** - Configuration guide
- **[API Reference](API.md)** - Complete API documentation
- **[Quick Reference](QUICK_REFERENCE.md)** - Cheat sheet for common tasks