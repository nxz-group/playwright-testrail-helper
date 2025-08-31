/**
 * CI/CD Integration Example
 * 
 * This example demonstrates how to integrate TestRail Playwright Helper
 * with various CI/CD systems including GitHub Actions, Jenkins, and Azure DevOps.
 */

import { TestRailHelper } from '@nxz-group/playwright-testrail-helper';
import { test, expect } from '@playwright/test';

// CI/CD Environment Detection
const CI_ENVIRONMENT = {
  isCI: !!process.env.CI,
  isGitHubActions: !!process.env.GITHUB_ACTIONS,
  isJenkins: !!process.env.JENKINS_URL,
  isAzureDevOps: !!process.env.AZURE_HTTP_USER_AGENT,
  isBuildkite: !!process.env.BUILDKITE,
  branch: process.env.GITHUB_REF_NAME || process.env.GIT_BRANCH || process.env.BUILD_SOURCEBRANCH || 'unknown',
  buildNumber: process.env.GITHUB_RUN_NUMBER || process.env.BUILD_NUMBER || process.env.BUILD_BUILDNUMBER || 'unknown',
  commitSha: process.env.GITHUB_SHA || process.env.GIT_COMMIT || process.env.BUILD_SOURCEVERSION || 'unknown'
};

// Enhanced configuration for CI/CD
const testRail = new TestRailHelper({
  host: process.env.TESTRAIL_HOST!,
  username: process.env.TESTRAIL_USERNAME!,
  password: process.env.TESTRAIL_PASSWORD!,
  projectId: parseInt(process.env.TESTRAIL_PROJECT_ID!),
  timeout: CI_ENVIRONMENT.isCI ? 60000 : 30000, // Longer timeout in CI
  retryAttempts: CI_ENVIRONMENT.isCI ? 5 : 3, // More retries in CI
  debug: !CI_ENVIRONMENT.isCI, // Debug only in local development
  coordinationDir: process.env.TESTRAIL_COORDINATION_DIR || './testrail-coordination',
  cacheEnabled: true,
  cacheTTL: 600000, // 10 minutes cache in CI
  batchSize: 100, // Larger batches in CI
  rateLimitDelay: 500 // Faster rate limit in CI
});

// Test results with CI/CD metadata
interface CITestResult {
  case_id: number;
  status_id: number;
  comment: string;
  elapsed: string;
  defects?: string;
  version?: string;
  custom_fields?: {
    ci_environment?: string;
    build_number?: string;
    branch?: string;
    commit_sha?: string;
    test_environment?: string;
    browser?: string;
    os?: string;
    node_version?: string;
    [key: string]: any;
  };
}

const testResults: CITestResult[] = [];

// Generate run name based on CI environment
function generateRunName(): string {
  const timestamp = new Date().toISOString().split('T')[0];
  const environment = CI_ENVIRONMENT.isGitHubActions ? 'GitHub Actions' :
                     CI_ENVIRONMENT.isJenkins ? 'Jenkins' :
                     CI_ENVIRONMENT.isAzureDevOps ? 'Azure DevOps' :
                     CI_ENVIRONMENT.isBuildkite ? 'Buildkite' :
                     'Local';
  
  return `${environment} - ${CI_ENVIRONMENT.branch} - Build ${CI_ENVIRONMENT.buildNumber} - ${timestamp}`;
}

// Get CI-specific metadata
function getCIMetadata(): Record<string, any> {
  return {
    ci_environment: CI_ENVIRONMENT.isGitHubActions ? 'github_actions' :
                   CI_ENVIRONMENT.isJenkins ? 'jenkins' :
                   CI_ENVIRONMENT.isAzureDevOps ? 'azure_devops' :
                   CI_ENVIRONMENT.isBuildkite ? 'buildkite' :
                   'local',
    build_number: CI_ENVIRONMENT.buildNumber,
    branch: CI_ENVIRONMENT.branch,
    commit_sha: CI_ENVIRONMENT.commitSha.substring(0, 8), // Short SHA
    test_environment: process.env.TEST_ENVIRONMENT || 'staging',
    node_version: process.version,
    os: process.platform,
    timestamp: new Date().toISOString()
  };
}

test.describe('CI/CD Integration Tests', () => {
  
  test('Smoke test - Critical path - C401', async ({ page, browserName }) => {
    const startTime = Date.now();
    const ciMetadata = getCIMetadata();
    
    try {
      // Critical path test for CI/CD
      await page.goto(process.env.TEST_BASE_URL || 'https://example.com');
      
      // Verify page loads
      await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });
      
      // Verify critical functionality
      await page.click('#login-link');
      await expect(page.locator('#login-form')).toBeVisible();
      
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      
      testResults.push({
        case_id: 401,
        status_id: 1, // Pass
        comment: `Smoke test passed in ${ciMetadata.ci_environment} environment`,
        elapsed: `${elapsed}s`,
        custom_fields: {
          ...ciMetadata,
          browser: browserName,
          test_type: 'smoke',
          priority: 'critical'
        }
      });
      
    } catch (error) {
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      
      testResults.push({
        case_id: 401,
        status_id: 5, // Failed
        comment: `Smoke test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        elapsed: `${elapsed}s`,
        defects: 'CRITICAL-001',
        custom_fields: {
          ...ciMetadata,
          browser: browserName,
          test_type: 'smoke',
          priority: 'critical',
          failure_reason: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      
      throw error;
    }
  });

  test('API integration test - C402', async ({ request }) => {
    const startTime = Date.now();
    const ciMetadata = getCIMetadata();
    
    try {
      const baseURL = process.env.API_BASE_URL || 'https://api.example.com';
      
      // Test API health endpoint
      const healthResponse = await request.get(`${baseURL}/health`);
      expect(healthResponse.status()).toBe(200);
      
      // Test authentication
      const authResponse = await request.post(`${baseURL}/auth/login`, {
        data: {
          username: process.env.TEST_USERNAME || 'testuser',
          password: process.env.TEST_PASSWORD || 'testpass'
        }
      });
      expect(authResponse.status()).toBe(200);
      
      const authData = await authResponse.json();
      expect(authData.token).toBeDefined();
      
      // Test authenticated endpoint
      const userResponse = await request.get(`${baseURL}/user/profile`, {
        headers: {
          'Authorization': `Bearer ${authData.token}`
        }
      });
      expect(userResponse.status()).toBe(200);
      
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      
      testResults.push({
        case_id: 402,
        status_id: 1, // Pass
        comment: `API integration test passed - all endpoints responding correctly`,
        elapsed: `${elapsed}s`,
        custom_fields: {
          ...ciMetadata,
          test_type: 'api',
          endpoints_tested: ['health', 'auth', 'profile'],
          api_base_url: baseURL
        }
      });
      
    } catch (error) {
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      
      testResults.push({
        case_id: 402,
        status_id: 5, // Failed
        comment: `API integration test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        elapsed: `${elapsed}s`,
        defects: 'API-001',
        custom_fields: {
          ...ciMetadata,
          test_type: 'api',
          failure_type: 'api_integration'
        }
      });
      
      throw error;
    }
  });

  test('Database connectivity test - C403', async () => {
    const startTime = Date.now();
    const ciMetadata = getCIMetadata();
    
    try {
      // Simulate database connectivity test
      // In real scenario, you would connect to your test database
      const dbConnectionTest = await new Promise((resolve) => {
        setTimeout(() => resolve(true), 1000); // Simulate DB connection
      });
      
      expect(dbConnectionTest).toBe(true);
      
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      
      testResults.push({
        case_id: 403,
        status_id: 1, // Pass
        comment: `Database connectivity test passed`,
        elapsed: `${elapsed}s`,
        custom_fields: {
          ...ciMetadata,
          test_type: 'database',
          db_environment: process.env.DB_ENVIRONMENT || 'test'
        }
      });
      
    } catch (error) {
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      
      testResults.push({
        case_id: 403,
        status_id: 5, // Failed
        comment: `Database connectivity test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        elapsed: `${elapsed}s`,
        defects: 'DB-001',
        custom_fields: {
          ...ciMetadata,
          test_type: 'database',
          failure_type: 'database_connection'
        }
      });
      
      throw error;
    }
  });
});

// Parallel execution test for CI/CD
test.describe.parallel('Parallel CI Tests', () => {
  
  for (let i = 1; i <= 5; i++) {
    test(`Parallel test ${i} - C40${i + 3}`, async ({ page, browserName }) => {
      const startTime = Date.now();
      const ciMetadata = getCIMetadata();
      
      try {
        await page.goto(`${process.env.TEST_BASE_URL || 'https://example.com'}/page${i}`);
        await expect(page.locator('body')).toBeVisible();
        
        // Simulate some test work
        await page.waitForTimeout(Math.random() * 2000 + 1000);
        
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        
        testResults.push({
          case_id: 404 + i - 1,
          status_id: 1, // Pass
          comment: `Parallel test ${i} completed successfully`,
          elapsed: `${elapsed}s`,
          custom_fields: {
            ...ciMetadata,
            browser: browserName,
            test_type: 'parallel',
            worker_id: process.env.PLAYWRIGHT_WORKER_INDEX || '0',
            parallel_index: i
          }
        });
        
      } catch (error) {
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        
        testResults.push({
          case_id: 404 + i - 1,
          status_id: 5, // Failed
          comment: `Parallel test ${i} failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          elapsed: `${elapsed}s`,
          custom_fields: {
            ...ciMetadata,
            browser: browserName,
            test_type: 'parallel',
            worker_id: process.env.PLAYWRIGHT_WORKER_INDEX || '0',
            parallel_index: i,
            failure_reason: error instanceof Error ? error.message : 'Unknown error'
          }
        });
        
        throw error;
      }
    });
  }
});

// CI/CD specific test result submission
test.afterAll(async () => {
  if (testResults.length > 0) {
    try {
      const runName = generateRunName();
      
      console.log(`🚀 Submitting ${testResults.length} test results to TestRail...`);
      console.log(`📋 Run Name: ${runName}`);
      console.log(`🌿 Branch: ${CI_ENVIRONMENT.branch}`);
      console.log(`🔨 Build: ${CI_ENVIRONMENT.buildNumber}`);
      console.log(`📝 Commit: ${CI_ENVIRONMENT.commitSha.substring(0, 8)}`);
      
      await testRail.updateTestResults({
        runName,
        sectionId: parseInt(process.env.TESTRAIL_SECTION_ID || '999'),
        platform: `ci-${CI_ENVIRONMENT.isGitHubActions ? 'github' : CI_ENVIRONMENT.isJenkins ? 'jenkins' : 'other'}`,
        results: testResults,
        description: `Automated CI/CD test run from ${CI_ENVIRONMENT.branch} branch`,
        includeAll: false,
        caseIds: testResults.map(r => r.case_id)
      });
      
      // Generate CI-friendly summary
      const summary = {
        total: testResults.length,
        passed: testResults.filter(r => r.status_id === 1).length,
        failed: testResults.filter(r => r.status_id === 5).length,
        retest: testResults.filter(r => r.status_id === 2).length,
        blocked: testResults.filter(r => r.status_id === 3).length
      };
      
      console.log(`
📊 CI/CD Test Summary:
✅ Passed: ${summary.passed}
❌ Failed: ${summary.failed}
🔄 Retest: ${summary.retest}
🚫 Blocked: ${summary.blocked}
📝 Total: ${summary.total}
📈 Success Rate: ${Math.round((summary.passed / summary.total) * 100)}%

🎯 TestRail Run: "${runName}"
      `);
      
      // Set CI environment variables for downstream jobs
      if (CI_ENVIRONMENT.isGitHubActions) {
        console.log(`::set-output name=testrail-run-name::${runName}`);
        console.log(`::set-output name=test-success-rate::${Math.round((summary.passed / summary.total) * 100)}`);
        console.log(`::set-output name=tests-passed::${summary.passed}`);
        console.log(`::set-output name=tests-failed::${summary.failed}`);
      }
      
      // Fail the build if critical tests failed
      const criticalFailures = testResults.filter(r => 
        r.status_id === 5 && r.custom_fields?.priority === 'critical'
      );
      
      if (criticalFailures.length > 0) {
        console.error(`❌ ${criticalFailures.length} critical test(s) failed - failing the build`);
        process.exit(1);
      }
      
    } catch (error) {
      console.error('❌ Failed to submit test results to TestRail:', error);
      
      // In CI, we might want to fail the build if TestRail submission fails
      if (CI_ENVIRONMENT.isCI && process.env.FAIL_ON_TESTRAIL_ERROR === 'true') {
        console.error('🚨 Failing build due to TestRail submission error');
        process.exit(1);
      }
      
      // Save results for manual processing
      const fs = require('fs');
      const resultsFile = `ci-test-results-${CI_ENVIRONMENT.buildNumber}-${Date.now()}.json`;
      fs.writeFileSync(resultsFile, JSON.stringify({
        metadata: CI_ENVIRONMENT,
        results: testResults,
        summary: {
          total: testResults.length,
          passed: testResults.filter(r => r.status_id === 1).length,
          failed: testResults.filter(r => r.status_id === 5).length
        }
      }, null, 2));
      
      console.log(`💾 Test results saved to ${resultsFile} for manual processing`);
    }
  }
});

// Export CI metadata for use in other files
export { CI_ENVIRONMENT, getCIMetadata, generateRunName };