import type { TestRailConfig } from '../types';
import { FileUtils } from '../utils/FileUtils';
import { Logger } from '../utils/Logger';

export interface MigrationResult {
  success: boolean;
  migratedFiles: string[];
  warnings: string[];
  errors: string[];
  backupPath?: string;
}

export interface LegacyConfig {
  [key: string]: any;
}

export class LegacyMigrator {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('LegacyMigrator');
    this.fileUtils = new FileUtils();
  }

  /**
   * Migrate from legacy TestRailHelper to new package
   */
  async migrateLegacyImplementation(
    legacyConfigPath: string,
    outputPath: string,
    createBackup = true
  ): Promise<MigrationResult> {
    this.logger.info('Starting legacy migration', { legacyConfigPath, outputPath });

    const result: MigrationResult = {
      success: false,
      migratedFiles: [],
      warnings: [],
      errors: [],
    };

    try {
      // Create backup if requested
      if (createBackup) {
        result.backupPath = await this.createBackup(legacyConfigPath);
        this.logger.info('Backup created', { backupPath: result.backupPath });
      }

      // Read legacy configuration
      const legacyConfig = await this.readLegacyConfig(legacyConfigPath);

      // Convert to new configuration format
      const newConfig = this.convertConfiguration(legacyConfig, result);

      // Generate new implementation files
      await this.generateNewImplementation(newConfig, outputPath, result);

      // Generate migration guide
      await this.generateMigrationGuide(outputPath, result);

      result.success = result.errors.length === 0;

      this.logger.info('Legacy migration completed', {
        success: result.success,
        migratedFiles: result.migratedFiles.length,
        warnings: result.warnings.length,
        errors: result.errors.length,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(`Migration failed: ${errorMessage}`);
      this.logger.error('Migration failed', { error: errorMessage });
    }

    return result;
  }

  private async createBackup(configPath: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${configPath}.backup.${timestamp}`;

    await FileUtils.copyFile(configPath, backupPath);
    return backupPath;
  }

  private async readLegacyConfig(configPath: string): Promise<LegacyConfig> {
    try {
      const content = await FileUtils.readFile(configPath);

      // Try to parse as JSON first
      try {
        return JSON.parse(content);
      } catch {
        // If not JSON, try to extract configuration from JavaScript/TypeScript file
        return this.extractConfigFromCode(content);
      }
    } catch (error) {
      throw new Error(
        `Failed to read legacy config: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private extractConfigFromCode(content: string): LegacyConfig {
    const config: LegacyConfig = {};

    // Extract common configuration patterns
    const patterns = [
      { key: 'host', regex: /host[:\s]*['"](https?:\/\/[^'"]+)['"]/i },
      { key: 'username', regex: /username[:\s]*['"]([^'"]+)['"]/i },
      { key: 'password', regex: /password[:\s]*['"]([^'"]+)['"]/i },
      { key: 'projectId', regex: /project[_-]?id[:\s]*(\d+)/i },
      { key: 'timeout', regex: /timeout[:\s]*(\d+)/i },
      { key: 'retryAttempts', regex: /retry[_-]?attempts[:\s]*(\d+)/i },
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern.regex);
      if (match) {
        config[pattern.key] =
          pattern.key === 'projectId' ||
          pattern.key === 'timeout' ||
          pattern.key === 'retryAttempts'
            ? parseInt(match[1] || '0', 10)
            : match[1];
      }
    }

    return config;
  }

  private convertConfiguration(
    legacyConfig: LegacyConfig,
    result: MigrationResult
  ): TestRailConfig {
    const newConfig: Partial<TestRailConfig> = {};

    // Map legacy configuration to new format
    const mappings = [
      { legacy: 'host', new: 'host' },
      { legacy: 'username', new: 'username' },
      { legacy: 'password', new: 'password' },
      { legacy: 'projectId', new: 'projectId' },
      { legacy: 'timeout', new: 'timeout' },
      { legacy: 'retryAttempts', new: 'retryAttempts' },
      { legacy: 'debug', new: 'debug' },
    ];

    for (const mapping of mappings) {
      if (legacyConfig[mapping.legacy] !== undefined) {
        (newConfig as any)[mapping.new] = legacyConfig[mapping.legacy];
      }
    }

    // Add default values for new configuration options
    if (!newConfig.timeout) {
      newConfig.timeout = 30000;
      result.warnings.push('Added default timeout value (30000ms)');
    }

    if (!newConfig.retries) {
      newConfig.retries = 3;
      result.warnings.push('Added default retry attempts (3)');
    }

    // Validate required fields
    if (!newConfig.host) {
      result.errors.push('Missing required field: host');
    }

    if (!newConfig.username) {
      result.errors.push('Missing required field: username');
    }

    if (!newConfig.password) {
      result.errors.push('Missing required field: password');
    }

    if (!newConfig.projectId) {
      result.errors.push('Missing required field: projectId');
    }

    return newConfig as TestRailConfig;
  }

  private async generateNewImplementation(
    config: TestRailConfig,
    outputPath: string,
    result: MigrationResult
  ): Promise<void> {
    // Generate configuration file
    const configFile = `${outputPath}/testrail.config.json`;
    await FileUtils.writeFile(configFile, JSON.stringify(config, null, 2));
    result.migratedFiles.push(configFile);

    // Generate environment variables template
    const envFile = `${outputPath}/.env.example`;
    const envContent = this.generateEnvTemplate(config);
    await FileUtils.writeFile(envFile, envContent);
    result.migratedFiles.push(envFile);

    // Generate new implementation example
    const exampleFile = `${outputPath}/testrail-helper.example.ts`;
    const exampleContent = this.generateImplementationExample(config);
    await FileUtils.writeFile(exampleFile, exampleContent);
    result.migratedFiles.push(exampleFile);

    // Generate package.json updates
    const packageFile = `${outputPath}/package.json.updates`;
    const packageContent = this.generatePackageUpdates();
    await FileUtils.writeFile(packageFile, packageContent);
    result.migratedFiles.push(packageFile);
  }

  private generateEnvTemplate(config: TestRailConfig): string {
    return `# TestRail Configuration
# Copy this file to .env and update with your actual values

TESTRAIL_HOST=${config.host || 'https://your-testrail-instance.testrail.io'}
TESTRAIL_USERNAME=${config.username || 'your-email@company.com'}
TESTRAIL_PASSWORD=${config.password || 'your-api-key'}
TESTRAIL_PROJECT_ID=${config.projectId || '1'}
TESTRAIL_TIMEOUT=${config.timeout || '30000'}
TESTRAIL_RETRY_ATTEMPTS=${config.retries || '3'}
TESTRAIL_DEBUG=${config.enableLogging || 'false'}
`;
  }

  private generateImplementationExample(_config: TestRailConfig): string {
    return `import { TestRailHelper } from '@nxz-group/playwright-testrail-helper';
import { test } from '@playwright/test';

// Initialize TestRail Helper
const testRail = new TestRailHelper({
  host: process.env.TESTRAIL_HOST!,
  username: process.env.TESTRAIL_USERNAME!,
  password: process.env.TESTRAIL_PASSWORD!,
  projectId: parseInt(process.env.TESTRAIL_PROJECT_ID!),
  timeout: parseInt(process.env.TESTRAIL_TIMEOUT || '30000'),
  retryAttempts: parseInt(process.env.TESTRAIL_RETRY_ATTEMPTS || '3'),
  debug: process.env.TESTRAIL_DEBUG === 'true'
});

// Example test with TestRail integration
test.describe('Migrated Test Suite', () => {
  const testResults: any[] = [];

  test('example test case', async ({ page }) => {
    // Your test logic here
    const result = {
      case_id: 123, // Your TestRail case ID
      status_id: 1, // Pass
      comment: 'Test passed successfully',
      elapsed: '30s'
    };
    
    testResults.push(result);
  });

  test.afterAll(async () => {
    // Submit results to TestRail
    await testRail.updateTestResults({
      runName: 'Migrated Test Run',
      sectionId: 456, // Your section ID
      platform: 'web',
      results: testResults
    });
  });
});

// Legacy compatibility layer (if needed)
export class LegacyTestRailHelper {
  private helper: TestRailHelper;

  constructor(config: any) {
    // Convert legacy config format
    this.helper = new TestRailHelper({
      host: config.host,
      username: config.username,
      password: config.password,
      projectId: config.projectId,
      timeout: config.timeout || 30000,
      retryAttempts: config.retryAttempts || 3,
      debug: config.debug || false
    });
  }

  // Legacy method compatibility
  async updateTestResults(runName: string, sectionId: number, platform: string, results: any[]) {
    return this.helper.updateTestResults({
      runName,
      sectionId,
      platform,
      results
    });
  }

  // Add other legacy methods as needed
}
`;
  }

  private generatePackageUpdates(): string {
    return `{
  "dependencies": {
    "@nxz-group/playwright-testrail-helper": "^1.0.0"
  },
  "scripts": {
    "test:testrail": "playwright test --reporter=line",
    "test:testrail:headed": "playwright test --headed --reporter=line"
  }
}

// Add this to your existing package.json dependencies and scripts sections
`;
  }

  private async generateMigrationGuide(outputPath: string, result: MigrationResult): Promise<void> {
    const guideFile = `${outputPath}/MIGRATION_GUIDE.md`;
    const guideContent = `# Migration Guide

## Overview
This guide helps you migrate from the legacy TestRailHelper implementation to the new @nxz-group/playwright-testrail-helper package.

## Migration Steps

### 1. Install the New Package
\`\`\`bash
npm install @nxz-group/playwright-testrail-helper
\`\`\`

### 2. Update Configuration
- Copy \`.env.example\` to \`.env\`
- Update the values with your TestRail credentials
- Use environment variables instead of hardcoded values

### 3. Update Your Test Files
Replace your legacy TestRailHelper usage with the new implementation:

**Before (Legacy):**
\`\`\`typescript
import { TestRailHelper } from './legacy/TestRailHelper';

const helper = new TestRailHelper({
  host: 'https://testrail.com',
  username: 'user@example.com',
  password: 'password',
  projectId: 1
});
\`\`\`

**After (New):**
\`\`\`typescript
import { TestRailHelper } from '@nxz-group/playwright-testrail-helper';

const helper = new TestRailHelper({
  host: process.env.TESTRAIL_HOST!,
  username: process.env.TESTRAIL_USERNAME!,
  password: process.env.TESTRAIL_PASSWORD!,
  projectId: parseInt(process.env.TESTRAIL_PROJECT_ID!)
});
\`\`\`

### 4. Update Method Calls
Most method signatures remain the same, but some have been improved:

**updateTestResults()** - Now accepts a structured options object:
\`\`\`typescript
// New format
await helper.updateTestResults({
  runName: 'My Test Run',
  sectionId: 123,
  platform: 'web',
  results: testResults
});
\`\`\`

### 5. Benefits of Migration
- ✅ Better type safety with TypeScript
- ✅ Improved error handling and retry logic
- ✅ Better performance with caching and batching
- ✅ Comprehensive logging and monitoring
- ✅ Security improvements
- ✅ Better worker coordination for parallel tests

## Migrated Files
${result.migratedFiles.map(file => `- ${file}`).join('\n')}

## Warnings
${result.warnings.length > 0 ? result.warnings.map(warning => `- ⚠️ ${warning}`).join('\n') : '- No warnings'}

## Errors
${result.errors.length > 0 ? result.errors.map(error => `- ❌ ${error}`).join('\n') : '- No errors'}

## Support
If you encounter issues during migration, please check:
1. Environment variables are properly set
2. TestRail credentials are valid
3. Project ID and section IDs are correct
4. Network connectivity to TestRail instance

For additional help, refer to the package documentation or create an issue.
`;

    await FileUtils.writeFile(guideFile, guideContent);
    result.migratedFiles.push(guideFile);
  }

  /**
   * Validate migrated configuration
   */
  async validateMigration(configPath: string): Promise<{ valid: boolean; issues: string[] }> {
    const issues: string[] = [];

    try {
      const content = await FileUtils.readFile(configPath);
      const config = JSON.parse(content);

      // Validate required fields
      const requiredFields = ['host', 'username', 'password', 'projectId'];
      for (const field of requiredFields) {
        if (!config[field]) {
          issues.push(`Missing required field: ${field}`);
        }
      }

      // Validate host format
      if (config.host && !config.host.startsWith('https://')) {
        issues.push('Host should use HTTPS protocol');
      }

      // Validate project ID
      if (config.projectId && (typeof config.projectId !== 'number' || config.projectId <= 0)) {
        issues.push('Project ID should be a positive number');
      }

      // Validate timeout
      if (config.timeout && (typeof config.timeout !== 'number' || config.timeout <= 0)) {
        issues.push('Timeout should be a positive number');
      }
    } catch (error) {
      issues.push(
        `Failed to validate configuration: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }
}
