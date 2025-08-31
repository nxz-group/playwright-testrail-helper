/**
 * Advanced Usage Example
 * 
 * This example demonstrates advanced features including:
 * - Custom test result processing
 * - Parallel test execution with worker coordination
 * - Performance monitoring
 * - Error handling and retry logic
 * - Custom reporting
 */

import { TestRailHelper } from '@nxz-group/playwright-testrail-helper';
import { test, expect, devices } from '@playwright/test';

// Advanced configuration with all options
const testRail = new TestRailHelper({
  host: process.env.TESTRAIL_HOST!,
  username: process.env.TESTRAIL_USERNAME!,
  password: process.env.TESTRAIL_PASSWORD!,
  projectId: parseInt(process.env.TESTRAIL_PROJECT_ID!),
  timeout: 45000,
  retryAttempts: 5,
  debug: true,
  coordinationDir: './testrail-coordination',
  cacheEnabled: true,
  cacheTTL: 300000, // 5 minutes
  batchSize: 50,
  rateLimitDelay: 1000
});

// Test results with enhanced metadata
interface EnhancedTestResult {
  case_id: number;
  status_id: number;
  comment: string;
  elapsed: string;
  defects?: string;
  version?: string;
  assignedto_id?: number;
  custom_fields?: Record<string, any>;
}

const testResults: EnhancedTestResult[] = [];

// Multi-browser testing
const browsers = [
  { name: 'chromium', device: 'Desktop Chrome' },
  { name: 'firefox', device: 'Desktop Firefox' },
  { name: 'webkit', device: 'Desktop Safari' }
];

for (const browser of browsers) {
  test.describe(`E-commerce Tests - ${browser.device}`, () => {
    
    test.use({ 
      ...devices['Desktop Chrome'],
      // Add custom viewport for this browser
      viewport: { width: 1920, height: 1080 }
    });

    test('Complete purchase flow - C201', async ({ page }) => {
      const startTime = Date.now();
      
      try {
        // Step 1: Navigate to product page
        await page.goto('https://example-shop.com/products/laptop');
        await expect(page.locator('h1')).toContainText('Laptop');
        
        // Step 2: Add to cart
        await page.click('#add-to-cart');
        await expect(page.locator('.cart-notification')).toBeVisible();
        
        // Step 3: Go to checkout
        await page.click('#cart-icon');
        await page.click('#checkout-button');
        
        // Step 4: Fill shipping information
        await page.fill('#shipping-name', 'John Doe');
        await page.fill('#shipping-address', '123 Test Street');
        await page.fill('#shipping-city', 'Test City');
        await page.selectOption('#shipping-country', 'US');
        
        // Step 5: Fill payment information
        await page.fill('#card-number', '4111111111111111');
        await page.fill('#card-expiry', '12/25');
        await page.fill('#card-cvc', '123');
        
        // Step 6: Complete purchase
        await page.click('#complete-purchase');
        
        // Step 7: Verify success
        await expect(page.locator('.order-confirmation')).toBeVisible({ timeout: 10000 });
        const orderNumber = await page.locator('#order-number').textContent();
        
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        
        testResults.push({
          case_id: 201,
          status_id: 1, // Pass
          comment: `Purchase completed successfully. Order: ${orderNumber}. Browser: ${browser.device}`,
          elapsed: `${elapsed}s`,
          version: '2.1.0',
          custom_fields: {
            browser: browser.name,
            device: browser.device,
            order_number: orderNumber,
            performance_score: elapsed < 30 ? 'Good' : elapsed < 60 ? 'Average' : 'Poor'
          }
        });
        
      } catch (error) {
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        
        testResults.push({
          case_id: 201,
          status_id: 5, // Failed
          comment: `Purchase flow failed on ${browser.device}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          elapsed: `${elapsed}s`,
          defects: 'BUG-456',
          custom_fields: {
            browser: browser.name,
            device: browser.device,
            failure_step: 'checkout_process',
            error_type: error instanceof Error ? error.constructor.name : 'UnknownError'
          }
        });
        
        throw error;
      }
    });

    test('Product search and filtering - C202', async ({ page }) => {
      const startTime = Date.now();
      
      try {
        await page.goto('https://example-shop.com');
        
        // Search for products
        await page.fill('#search-input', 'laptop');
        await page.click('#search-button');
        
        // Wait for results
        await page.waitForSelector('.product-grid');
        const initialCount = await page.locator('.product-item').count();
        
        // Apply price filter
        await page.click('#price-filter-toggle');
        await page.fill('#min-price', '500');
        await page.fill('#max-price', '1500');
        await page.click('#apply-filters');
        
        // Wait for filtered results
        await page.waitForTimeout(2000);
        const filteredCount = await page.locator('.product-item').count();
        
        // Verify filtering worked
        expect(filteredCount).toBeLessThanOrEqual(initialCount);
        expect(filteredCount).toBeGreaterThan(0);
        
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        
        testResults.push({
          case_id: 202,
          status_id: 1, // Pass
          comment: `Search and filtering works. Initial: ${initialCount}, Filtered: ${filteredCount}. Browser: ${browser.device}`,
          elapsed: `${elapsed}s`,
          custom_fields: {
            browser: browser.name,
            device: browser.device,
            initial_results: initialCount,
            filtered_results: filteredCount,
            filter_effectiveness: Math.round((1 - filteredCount / initialCount) * 100)
          }
        });
        
      } catch (error) {
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        
        testResults.push({
          case_id: 202,
          status_id: 5, // Failed
          comment: `Search/filtering failed on ${browser.device}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          elapsed: `${elapsed}s`,
          custom_fields: {
            browser: browser.name,
            device: browser.device,
            failure_point: 'search_or_filter'
          }
        });
        
        throw error;
      }
    });

    test('User account management - C203', async ({ page }) => {
      const startTime = Date.now();
      
      try {
        // Login
        await page.goto('https://example-shop.com/login');
        await page.fill('#email', 'testuser@example.com');
        await page.fill('#password', 'testpass123');
        await page.click('#login-button');
        
        // Navigate to account settings
        await page.click('#account-menu');
        await page.click('#account-settings');
        
        // Update profile
        await page.fill('#profile-phone', '+1234567890');
        await page.selectOption('#profile-country', 'US');
        await page.check('#newsletter-subscription');
        await page.click('#save-profile');
        
        // Verify success
        await expect(page.locator('.success-message')).toBeVisible();
        
        // Test password change
        await page.click('#change-password-tab');
        await page.fill('#current-password', 'testpass123');
        await page.fill('#new-password', 'newpass123');
        await page.fill('#confirm-password', 'newpass123');
        await page.click('#update-password');
        
        await expect(page.locator('.password-updated')).toBeVisible();
        
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        
        testResults.push({
          case_id: 203,
          status_id: 1, // Pass
          comment: `Account management successful on ${browser.device}`,
          elapsed: `${elapsed}s`,
          custom_fields: {
            browser: browser.name,
            device: browser.device,
            features_tested: ['profile_update', 'password_change'],
            user_flow_completion: 'full'
          }
        });
        
      } catch (error) {
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        
        testResults.push({
          case_id: 203,
          status_id: 5, // Failed
          comment: `Account management failed on ${browser.device}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          elapsed: `${elapsed}s`,
          defects: 'BUG-789',
          custom_fields: {
            browser: browser.name,
            device: browser.device,
            failure_area: 'account_management'
          }
        });
        
        throw error;
      }
    });
  });
}

// Performance testing example
test.describe('Performance Tests', () => {
  
  test('Page load performance - C301', async ({ page }) => {
    const performanceMetrics: any[] = [];
    
    // Enable performance monitoring
    await page.addInitScript(() => {
      window.performance.mark('test-start');
    });
    
    const startTime = Date.now();
    
    try {
      // Navigate and measure
      await page.goto('https://example-shop.com', { waitUntil: 'networkidle' });
      
      // Get performance metrics
      const metrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        return {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
          firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
        };
      });
      
      performanceMetrics.push(metrics);
      
      // Performance thresholds
      const loadTime = Date.now() - startTime;
      const isPerformant = loadTime < 3000 && metrics.domContentLoaded < 2000;
      
      testResults.push({
        case_id: 301,
        status_id: isPerformant ? 1 : 2, // Pass or Retest
        comment: `Page load performance: ${loadTime}ms total, ${metrics.domContentLoaded}ms DOM ready`,
        elapsed: `${Math.round(loadTime / 1000)}s`,
        custom_fields: {
          load_time_ms: loadTime,
          dom_content_loaded_ms: metrics.domContentLoaded,
          first_paint_ms: metrics.firstPaint,
          first_contentful_paint_ms: metrics.firstContentfulPaint,
          performance_grade: isPerformant ? 'A' : loadTime < 5000 ? 'B' : 'C'
        }
      });
      
    } catch (error) {
      testResults.push({
        case_id: 301,
        status_id: 5, // Failed
        comment: `Performance test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        elapsed: '0s',
        custom_fields: {
          error_type: 'performance_test_failure'
        }
      });
      
      throw error;
    }
  });
});

// Custom test result processing
test.afterAll(async () => {
  if (testResults.length > 0) {
    try {
      // Group results by test run
      const runName = `Advanced E-commerce Tests - ${new Date().toISOString().split('T')[0]}`;
      
      // Submit results with enhanced options
      await testRail.updateTestResults({
        runName,
        sectionId: 789, // Your TestRail section ID
        platform: 'multi-browser',
        results: testResults,
        description: `Automated test run covering multiple browsers and performance testing`,
        includeAll: false, // Only include tests that were actually run
        caseIds: testResults.map(r => r.case_id)
      });
      
      // Generate custom report
      const passedTests = testResults.filter(r => r.status_id === 1).length;
      const failedTests = testResults.filter(r => r.status_id === 5).length;
      const retestTests = testResults.filter(r => r.status_id === 2).length;
      
      console.log(`
📊 Test Execution Summary:
✅ Passed: ${passedTests}
❌ Failed: ${failedTests}
🔄 Retest: ${retestTests}
📝 Total: ${testResults.length}

🚀 Results submitted to TestRail run: "${runName}"
      `);
      
      // Log performance insights
      const performanceResults = testResults.filter(r => r.custom_fields?.performance_grade);
      if (performanceResults.length > 0) {
        console.log('\n⚡ Performance Insights:');
        performanceResults.forEach(result => {
          console.log(`- Case ${result.case_id}: ${result.custom_fields.performance_grade} grade (${result.custom_fields.load_time_ms}ms)`);
        });
      }
      
    } catch (error) {
      console.error('❌ Failed to submit test results to TestRail:', error);
      
      // Fallback: save results to file
      const fs = require('fs');
      const fallbackFile = `test-results-${Date.now()}.json`;
      fs.writeFileSync(fallbackFile, JSON.stringify(testResults, null, 2));
      console.log(`💾 Test results saved to ${fallbackFile} for manual upload`);
    }
  }
});