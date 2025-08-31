# Setup Instructions for @nxz-group/playwright-testrail-helper

## GitHub Repository Setup

### 1. Create Repository
1. Go to https://github.com/nxz-group
2. Click "New repository"
3. Repository name: `playwright-testrail-helper`
4. Description: "TypeScript library for seamless TestRail integration with Playwright test automation"
5. Set to **Private** (for organization use only)
6. Don't initialize with README (we already have one)

### 2. Push Code to Repository
```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Initial commit
git commit -m "feat: initial release of playwright-testrail-helper v1.0.0"

# Add remote origin
git remote add origin https://github.com/nxz-group/playwright-testrail-helper.git

# Push to main branch
git branch -M main
git push -u origin main
```

### 3. Configure GitHub Packages
1. Go to repository Settings → Actions → General
2. Under "Workflow permissions", select "Read and write permissions"
3. Enable "Allow GitHub Actions to create and approve pull requests"

## Publishing to GitHub Packages

### 1. Create GitHub Personal Access Token
1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token with these scopes:
   - `write:packages` (to publish packages)
   - `read:packages` (to install packages)
   - `repo` (for private repositories)

### 2. Configure NPM Authentication
```bash
# Login to GitHub Packages
npm login --scope=@nxz-group --registry=https://npm.pkg.github.com

# Or set token directly
echo "//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN" >> ~/.npmrc
```

### 3. Publish Package
```bash
# Publish to GitHub Packages
npm publish
```

## Installation for Team Members

### 1. Configure NPM for @nxz-group scope
```bash
npm config set @nxz-group:registry https://npm.pkg.github.com
```

### 2. Authenticate with GitHub
```bash
npm login --scope=@nxz-group --registry=https://npm.pkg.github.com
```

### 3. Install Package
```bash
npm install @nxz-group/playwright-testrail-helper
```

## Usage in Projects
```typescript
import { onTestRailHelper, Platform } from '@nxz-group/playwright-testrail-helper';

// Set environment variables
process.env.TEST_RAIL_HOST = 'https://your-domain.testrail.io';
process.env.TEST_RAIL_USERNAME = 'your-email@domain.com';
process.env.TEST_RAIL_PASSWORD = 'your-api-key';
process.env.TEST_RAIL_PROJECT_ID = '3';

// Use in tests
await onTestRailHelper.updateTestResult(
  "Test Run Name",
  123, // Section ID
  Platform.WEB_DESKTOP,
  testResults
);
```

## Next Steps
1. ✅ Build completed
2. ✅ Package tested
3. 🔄 Create GitHub repository
4. 🔄 Push code to repository
5. 🔄 Publish to GitHub Packages
