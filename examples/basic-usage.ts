/**
 * Basic Usage Example
 * 
 * This example demonstrates the basic usage of the TestRail Playwright Helper
 * for integrating Playwright tests with TestRail.
 */

import { TestRailHelper } from '@nxz-group/playwright-testrail-helper';
import { test, expect } from '@playwright/test';

// Initialize TestRail Helper with configuration
const testRail = new TestRailHelper({
  host: process.env.TESTRAIL_HOST!,
  username: process.env.TESTRAIL_USERNAME!,
  password: process.env.TESTRAIL_PASSWORD!,
  projectId: parseInt(process.env.TESTRAIL_PROJECT_ID!),
  timeout: 30000,
  retryAttempts: 3,
  debug: process.env.NODE_ENV !== 'production'
});

// Test results collection
const testResults: any[] = [];

test.describe('Basic TestRail Integration', () => {
  
  test('Login functionality - C123', async ({ page }) => {
    // Navigate to login page
    await page.goto('https://example.com/login');
    
    // Fill login form
    await page.fill('#username', 'testuser@example.com');
    await page.fill('#password', 'password123');
    await page.click('#login-button');
    
    // Verify successful login
    await expect(page.locator('.welcome-message')).toBeVisible();
    
    // Record test result
    testResults.push({
      case_id: 123, // TestRail case ID from test title
      status_id: 1, // Pass
      comment: 'Login functionality works correctly',
      elapsed: '15s'
    });
  });

  test('User profile update - C124', async ({ page }) => {
    // Login first
    await page.goto('https://example.com/login');
    await page.fill('#username', 'testuser@example.com');
    await page.fill('#password', 'password123');
    await page.click('#login-button');
    
    // Navigate to profile
    await page.click('#profile-link');
    
    // Update profile information
    await page.fill('#first-name', 'John');
    await page.fill('#last-name', 'Doe');
    await page.click('#save-profile');
    
    // Verify update
    await expect(page.locator('.success-message')).toBeVisible();
    
    // Record test result
    testResults.push({
      case_id: 124,
      status_id: 1, // Pass
      comment: 'Profile update functionality works correctly',
      elapsed: '20s'
    });
  });

  test('Search functionality - C125', async ({ page }) => {
    try {
      await page.goto('https://example.com');
      
      // Perform search
      await page.fill('#search-input', 'test query');
      await page.click('#search-button');
      
      // Verify search results
      await expect(page.locator('.search-results')).toBeVisible();
      const resultCount = await page.locator('.search-result').count();
      expect(resultCount).toBeGreaterThan(0);
      
      // Record successful test result
      testResults.push({
        case_id: 125,
        status_id: 1, // Pass
        comment: `Search returned ${resultCount} results`,
        elapsed: '10s'
      });
      
    } catch (error) {
      // Record failed test result
      testResults.push({
        case_id: 125,
        status_id: 5, // Failed
        comment: `Search functionality failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        elapsed: '10s'
      });
      throw error; // Re-throw to fail the test
    }
  });

  // Submit all test results to TestRail after all tests complete
  test.afterAll(async () => {
    if (testResults.length > 0) {
      try {
        await testRail.updateTestResults({
          runName: `Basic Tests - ${new Date().toISOString().split('T')[0]}`,
          sectionId: 456, // Your TestRail section ID
          platform: 'web',
          results: testResults
        });
        
        console.log(`✅ Successfully submitted ${testResults.length} test results to TestRail`);
      } catch (error) {
        console.error('❌ Failed to submit test results to TestRail:', error);
      }
    }
  });
});

// Example of handling test failures
test.describe('Error Handling Example', () => {
  
  test('Intentional failure example - C126', async ({ page }) => {
    try {
      await page.goto('https://example.com/nonexistent-page');
      
      // This will likely fail
      await expect(page.locator('#nonexistent-element')).toBeVisible({ timeout: 5000 });
      
      // If we get here, the test passed
      testResults.push({
        case_id: 126,
        status_id: 1, // Pass
        comment: 'Unexpected success - page exists',
        elapsed: '5s'
      });
      
    } catch (error) {
      // Record the failure with details
      testResults.push({
        case_id: 126,
        status_id: 5, // Failed
        comment: `Test failed as expected: ${error instanceof Error ? error.message : 'Unknown error'}`,
        elapsed: '5s',
        defects: 'BUG-123' // Optional: link to bug tracker
      });
      
      // Don't re-throw if this failure was expected
      console.log('Test failed as expected');
    }
  });
});