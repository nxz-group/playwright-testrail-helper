# Test Tags System

## Overview
The test tagging system provides standardized test categorization for better test management, execution control, and TestRail integration. Tags are automatically extracted from test titles and included in TestRail comments.

## Tag Categories

### 1. Purpose Tags (Required - Every test must have exactly one)
- `@functional` - Functional testing (core feature validation)
- `@regression` - Regression testing (prevent feature breakage)  
- `@smoke` - Smoke testing (critical path validation)
- `@integration` - Integration testing (system component interaction)
- `@e2e` - End-to-end testing (complete user workflows)

### 2. Priority Tags (Required - Every test must have exactly one)
- `@critical` - Critical priority (high business impact when failed)
- `@high` - High priority (significant impact when failed)
- `@medium` - Medium priority (moderate impact when failed)
- `@low` - Low priority (minimal impact when failed)

### 3. Feature Tags (Optional - Use for test organization)
- `@login` - Authentication and login functionality
- `@checkout` - E-commerce checkout process
- `@payment` - Payment processing
- `@search` - Search functionality
- `@navigation` - Site navigation and routing
- `@api` - API-specific tests
- `@ui` - User interface tests

### 4. Status Tags (Optional - Use for test lifecycle management)
- `@update` - Test cases with recent modifications or fixes
- `@new` - Newly created test cases
- `@flaky` - Tests with known stability issues
- `@skip` - Temporarily disabled tests

## Tag Assignment Guidelines

### Purpose Tag Selection:
- **@functional**: Core system functionality, feature validation
- **@regression**: Tests preventing regression bugs, stability checks
- **@smoke**: Essential tests covering critical user paths
- **@integration**: Tests validating component interactions
- **@e2e**: Complete user journey validation

### Priority Tag Selection:
- **@critical**: Core functionality, login, main transactions, system availability
- **@high**: Important features, main data display, primary navigation
- **@medium**: Secondary features, filtering, sorting, UI components  
- **@low**: Edge cases, minor validations, non-critical UI elements

## Implementation Examples

### Playwright Test Implementation
```typescript
// Critical smoke test for login
test("@smoke @functional @critical @login User can login successfully", async ({ page }) => {
  await page.goto('/login');
  await page.fill('#username', 'testuser@example.com');
  await page.fill('#password', 'validpassword');
  await page.click('#login-button');
  
  await expect(page.locator('.welcome-message')).toBeVisible();
});

// Medium priority functional test
test("@functional @regression @medium @search Verify pagination works correctly", async ({ page }) => {
  await page.goto('/search?q=products');
  await page.click('[data-testid="next-page"]');
  
  await expect(page.locator('.page-indicator')).toContainText('Page 2');
});

// Updated test with modifications
test("@update @functional @regression @high @checkout Verify updated filter functionality", async ({ page }) => {
  await page.goto('/products');
  await page.selectOption('#category-filter', 'electronics');
  
  await expect(page.locator('.product-card')).toHaveCount(5);
});

// API integration test
test("@integration @api @high @payment Verify payment API integration", async ({ request }) => {
  const response = await request.post('/api/payments', {
    data: { amount: 100, currency: 'USD' }
  });
  
  expect(response.status()).toBe(200);
});
```

### Manual Test Result Format
```typescript
const testResults = [
  {
    title: "@smoke @functional @critical @login User can login successfully",
    tags: ["@smoke", "@functional", "@critical", "@login"],
    status: "passed",
    duration: 2500,
    _steps: [
      {
        category: "test.step", 
        title: "Navigate to login page",
        error: undefined
      }
    ]
  },
  {
    title: "@e2e @regression @high @checkout Complete checkout process",
    tags: ["@e2e", "@regression", "@high", "@checkout"],
    status: "failed",
    duration: 15000,
    _steps: [
      {
        category: "test.step",
        title: "Add items to cart", 
        error: undefined
      },
      {
        category: "test.step",
        title: "Process payment",
        error: "Payment gateway timeout"
      }
    ]
  }
];
```

## Tag-Based Test Execution

### Run Tests by Purpose
```bash
# Run only smoke tests
npx playwright test --grep "@smoke"

# Run functional tests
npx playwright test --grep "@functional"

# Run regression tests  
npx playwright test --grep "@regression"
```

### Run Tests by Priority
```bash
# Run critical and high priority tests
npx playwright test --grep "@critical|@high"

# Run only critical tests
npx playwright test --grep "@critical"

# Skip low priority tests
npx playwright test --grep-invert "@low"
```

### Run Tests by Feature
```bash
# Run login-related tests
npx playwright test --grep "@login"

# Run checkout and payment tests
npx playwright test --grep "@checkout|@payment"

# Run API tests only
npx playwright test --grep "@api"
```

### Complex Tag Combinations
```bash
# Run critical smoke tests
npx playwright test --grep "@smoke.*@critical|@critical.*@smoke"

# Run high priority functional tests
npx playwright test --grep "@functional.*@high|@high.*@functional"

# Run updated regression tests
npx playwright test --grep "@update.*@regression|@regression.*@update"
```

## TestRail Integration Benefits

When using proper tags, TestRail comments automatically include:

```
🤖 Automated Test
✅ Executed by Playwright
📋 **Tags:** @smoke, @functional, @critical, @login
⏱️ **Duration:** 2.3s
🕐 **Executed:** 15/12/2024, 10:30:45
```

## Best Practices for Tagging

### ✅ Good Tagging Examples
```typescript
// Clear, descriptive, properly categorized
test("@smoke @functional @critical @login User login with valid credentials", async ({ page }) => {
  // test implementation
});

test("@regression @functional @medium @search Search results pagination", async ({ page }) => {
  // test implementation  
});

test("@e2e @integration @high @checkout Complete purchase workflow", async ({ page }) => {
  // test implementation
});
```

### ❌ Poor Tagging Examples
```typescript
// Missing required tags, unclear purpose
test("@test User login", async ({ page }) => {
  // Missing purpose and priority tags
});

// Too many tags, unclear categorization
test("@smoke @regression @functional @integration @critical @high @login @ui @new @update User login", async ({ page }) => {
  // Conflicting and excessive tags
});

// Inconsistent naming
test("@SMOKE @Login @Critical user can login", async ({ page }) => {
  // Inconsistent case and format
});
```

## Tag Validation Rules

1. **Every test must have exactly one purpose tag** (`@functional`, `@regression`, `@smoke`, `@integration`, `@e2e`)
2. **Every test must have exactly one priority tag** (`@critical`, `@high`, `@medium`, `@low`)
3. **Feature tags are optional** but recommended for organization
4. **Status tags are optional** and used for lifecycle management
5. **Tags should be lowercase** and use consistent naming
6. **Tags should appear at the beginning** of the test title

## Advanced Tagging Strategies

### CI/CD Pipeline Integration
```yaml
# Run different tag combinations in CI
- name: Smoke Tests
  run: npx playwright test --grep "@smoke"
  
- name: Regression Tests  
  run: npx playwright test --grep "@regression"
  if: github.event_name == 'schedule'
  
- name: Critical Tests
  run: npx playwright test --grep "@critical"
  if: github.event_name == 'pull_request'
```

### Dynamic Tag-Based Reporting
```typescript
// Generate reports based on tags
function generateTagReport(testResults: TestResult[]) {
  const tagStats = testResults.reduce((stats, test) => {
    test.tags.forEach(tag => {
      if (!stats[tag]) stats[tag] = { passed: 0, failed: 0 };
      stats[tag][test.status === 'passed' ? 'passed' : 'failed']++;
    });
    return stats;
  }, {});
  
  return tagStats;
}
```

### Tag-Based Test Organization
```typescript
// Organize tests by tags in TestRail
const tagToSectionMap = {
  '@login': SECTIONS.authentication.login,
  '@checkout': SECTIONS.ecommerce.checkout,
  '@api': SECTIONS.api.core,
  '@payment': SECTIONS.ecommerce.payment
};

function getSectionForTags(tags: string[]): number {
  for (const tag of tags) {
    if (tagToSectionMap[tag]) {
      return tagToSectionMap[tag];
    }
  }
  return SECTIONS.general.other;
}
```