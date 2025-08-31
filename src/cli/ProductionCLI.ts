#!/usr/bin/env node

/**
 * Production CLI Tool for TestRail Playwright Helper
 * 
 * Provides command-line utilities for:
 * - Security auditing
 * - Performance benchmarking
 * - Migration assistance
 * - Production validation
 * - Health checks
 */

import { SecurityAuditor } from '../security/SecurityAuditor';
import { PerformanceBenchmark } from '../performance/PerformanceBenchmark';
import { LegacyMigrator } from '../migration/LegacyMigrator';
import { ProductionValidator } from '../deployment/ProductionValidator';
import { TestRailApiClient } from '../client/TestRailApiClient';
import { ConfigManager } from '../config/TestRailConfig';
import { Logger } from '../utils/Logger';
import { FileUtils } from '../utils/FileUtils';

interface CLIOptions {
  command: string;
  configPath?: string;
  outputPath?: string;
  format?: 'json' | 'markdown' | 'console';
  verbose?: boolean;
  help?: boolean;
}

class ProductionCLI {
  private logger: Logger;
  private fileUtils: FileUtils;

  constructor() {
    this.logger = new Logger('ProductionCLI');
    this.fileUtils = new FileUtils();
  }

  async run(args: string[]): Promise<void> {
    const options = this.parseArgs(args);

    if (options.help || !options.command) {
      this.showHelp();
      return;
    }

    try {
      switch (options.command) {
        case 'audit':
          await this.runSecurityAudit(options);
          break;
        case 'benchmark':
          await this.runPerformanceBenchmark(options);
          break;
        case 'migrate':
          await this.runMigration(options);
          break;
        case 'validate':
          await this.runProductionValidation(options);
          break;
        case 'health':
          await this.runHealthCheck(options);
          break;
        default:
          console.error(`Unknown command: ${options.command}`);
          this.showHelp();
          process.exit(1);
      }
    } catch (error) {
      console.error('CLI Error:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  }

  private parseArgs(args: string[]): CLIOptions {
    const options: CLIOptions = {
      command: args[0] || '',
      format: 'console'
    };

    for (let i = 1; i < args.length; i++) {
      const arg = args[i];
      const nextArg = args[i + 1];

      switch (arg) {
        case '--config':
        case '-c':
          options.configPath = nextArg;
          i++;
          break;
        case '--output':
        case '-o':
          options.outputPath = nextArg;
          i++;
          break;
        case '--format':
        case '-f':
          options.format = nextArg as 'json' | 'markdown' | 'console';
          i++;
          break;
        case '--verbose':
        case '-v':
          options.verbose = true;
          break;
        case '--help':
        case '-h':
          options.help = true;
          break;
      }
    }

    return options;
  }

  private showHelp(): void {
    console.log(`
TestRail Playwright Helper - Production CLI

USAGE:
  testrail-helper <command> [options]

COMMANDS:
  audit      Run security audit on configuration
  benchmark  Run performance benchmarks
  migrate    Migrate from legacy implementation
  validate   Validate production readiness
  health     Run health check

OPTIONS:
  -c, --config <path>     Configuration file path
  -o, --output <path>     Output directory for reports
  -f, --format <format>   Output format (json|markdown|console)
  -v, --verbose           Enable verbose logging
  -h, --help              Show this help message

EXAMPLES:
  testrail-helper audit --config ./testrail.config.json
  testrail-helper benchmark --output ./reports --format markdown
  testrail-helper migrate --config ./legacy-config.js --output ./migrated
  testrail-helper validate --config ./testrail.config.json --verbose
  testrail-helper health

ENVIRONMENT VARIABLES:
  TESTRAIL_HOST           TestRail instance URL
  TESTRAIL_USERNAME       TestRail username (email)
  TESTRAIL_PASSWORD       TestRail API key
  TESTRAIL_PROJECT_ID     TestRail project ID
  NODE_ENV                Environment (development|production)
`);
  }

  private async runSecurityAudit(options: CLIOptions): Promise<void> {
    console.log('🔒 Running security audit...\n');

    const config = await this.loadConfiguration(options.configPath);
    const auditor = new SecurityAuditor();
    
    const result = await auditor.auditConfiguration(config);

    if (options.format === 'json') {
      await this.outputJSON(result, options.outputPath, 'security-audit');
    } else if (options.format === 'markdown') {
      const report = this.generateSecurityReport(result);
      await this.outputMarkdown(report, options.outputPath, 'security-audit');
    } else {
      this.displaySecurityAudit(result);
    }

    if (!result.passed) {
      process.exit(1);
    }
  }

  private async runPerformanceBenchmark(options: CLIOptions): Promise<void> {
    console.log('⚡ Running performance benchmarks...\n');

    const config = await this.loadConfiguration(options.configPath);
    const apiClient = new TestRailApiClient(config);
    const benchmark = new PerformanceBenchmark();
    
    const suite = await benchmark.runBenchmarkSuite(apiClient);

    if (options.format === 'json') {
      await this.outputJSON(suite, options.outputPath, 'performance-benchmark');
    } else if (options.format === 'markdown') {
      const report = benchmark.generateReport(suite);
      await this.outputMarkdown(report, options.outputPath, 'performance-benchmark');
    } else {
      this.displayBenchmarkResults(suite);
    }
  }

  private async runMigration(options: CLIOptions): Promise<void> {
    console.log('🔄 Running legacy migration...\n');

    if (!options.configPath) {
      throw new Error('Configuration path is required for migration');
    }

    if (!options.outputPath) {
      throw new Error('Output path is required for migration');
    }

    const migrator = new LegacyMigrator();
    const result = await migrator.migrateLegacyImplementation(
      options.configPath,
      options.outputPath,
      true // Create backup
    );

    if (options.format === 'json') {
      await this.outputJSON(result, options.outputPath, 'migration-result');
    } else {
      this.displayMigrationResult(result);
    }

    if (!result.success) {
      process.exit(1);
    }
  }

  private async runProductionValidation(options: CLIOptions): Promise<void> {
    console.log('✅ Running production validation...\n');

    const config = await this.loadConfiguration(options.configPath);
    const apiClient = new TestRailApiClient(config);
    const validator = new ProductionValidator();
    
    const result = await validator.validateProductionReadiness(config, apiClient);

    if (options.format === 'json') {
      await this.outputJSON(result, options.outputPath, 'production-validation');
    } else if (options.format === 'markdown') {
      const report = validator.generateReport(result);
      await this.outputMarkdown(report, options.outputPath, 'production-validation');
    } else {
      this.displayValidationResult(result);
    }

    if (!result.ready) {
      process.exit(1);
    }
  }

  private async runHealthCheck(options: CLIOptions): Promise<void> {
    console.log('🏥 Running health check...\n');

    try {
      const config = await this.loadConfiguration(options.configPath);
      const apiClient = new TestRailApiClient(config);

      // Test basic connectivity
      console.log('Testing API connectivity...');
      const startTime = Date.now();
      await apiClient.get('/get_projects');
      const responseTime = Date.now() - startTime;

      console.log(`✅ API connectivity: OK (${responseTime}ms)`);

      // Test authentication
      console.log('Testing authentication...');
      try {
        await apiClient.get('/get_user_by_email/test@example.com');
        console.log('✅ Authentication: OK');
      } catch (error) {
        if (error instanceof Error && error.message.includes('401')) {
          console.log('❌ Authentication: FAILED - Invalid credentials');
        } else {
          console.log('✅ Authentication: OK (user not found is expected)');
        }
      }

      // Test configuration
      console.log('Testing configuration...');
      const auditor = new SecurityAuditor();
      const auditResult = await auditor.auditConfiguration(config);
      
      if (auditResult.passed) {
        console.log('✅ Configuration: OK');
      } else {
        console.log(`⚠️ Configuration: ${auditResult.issues.length} issues found`);
      }

      // Test environment
      console.log('Testing environment...');
      const requiredEnvVars = ['TESTRAIL_HOST', 'TESTRAIL_USERNAME', 'TESTRAIL_PASSWORD'];
      const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
      
      if (missingVars.length === 0) {
        console.log('✅ Environment variables: OK');
      } else {
        console.log(`⚠️ Environment variables: Missing ${missingVars.join(', ')}`);
      }

      console.log('\n🎉 Health check completed');

    } catch (error) {
      console.log(`❌ Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  }

  private async loadConfiguration(configPath?: string): Promise<any> {
    if (configPath) {
      const content = await this.fileUtils.readFile(configPath);
      return JSON.parse(content);
    }

    // Load from environment variables
    return {
      host: process.env.TESTRAIL_HOST,
      username: process.env.TESTRAIL_USERNAME,
      password: process.env.TESTRAIL_PASSWORD,
      projectId: process.env.TESTRAIL_PROJECT_ID ? parseInt(process.env.TESTRAIL_PROJECT_ID) : undefined,
      timeout: process.env.TESTRAIL_TIMEOUT ? parseInt(process.env.TESTRAIL_TIMEOUT) : 30000,
      retryAttempts: process.env.TESTRAIL_RETRY_ATTEMPTS ? parseInt(process.env.TESTRAIL_RETRY_ATTEMPTS) : 3,
      debug: process.env.TESTRAIL_DEBUG === 'true'
    };
  }

  private async outputJSON(data: any, outputPath?: string, filename?: string): Promise<void> {
    const json = JSON.stringify(data, null, 2);
    
    if (outputPath && filename) {
      const filePath = `${outputPath}/${filename}.json`;
      await this.fileUtils.writeFile(filePath, json);
      console.log(`📄 Report saved to: ${filePath}`);
    } else {
      console.log(json);
    }
  }

  private async outputMarkdown(content: string, outputPath?: string, filename?: string): Promise<void> {
    if (outputPath && filename) {
      const filePath = `${outputPath}/${filename}.md`;
      await this.fileUtils.writeFile(filePath, content);
      console.log(`📄 Report saved to: ${filePath}`);
    } else {
      console.log(content);
    }
  }

  private generateSecurityReport(result: any): string {
    let report = `# Security Audit Report\n\n`;
    report += `**Status**: ${result.passed ? '✅ Passed' : '❌ Failed'}\n`;
    report += `**Score**: ${result.score}/100\n`;
    report += `**Date**: ${new Date().toISOString()}\n\n`;

    if (result.issues.length > 0) {
      report += `## Issues Found\n\n`;
      for (const issue of result.issues) {
        const icon = issue.severity === 'critical' ? '🚨' : 
                    issue.severity === 'high' ? '⚠️' : 
                    issue.severity === 'medium' ? '⚡' : '💡';
        report += `${icon} **${issue.severity.toUpperCase()}**: ${issue.description}\n`;
        report += `   *Recommendation*: ${issue.recommendation}\n\n`;
      }
    }

    if (result.recommendations.length > 0) {
      report += `## Recommendations\n\n`;
      for (const recommendation of result.recommendations) {
        report += `- ${recommendation}\n`;
      }
    }

    return report;
  }

  private displaySecurityAudit(result: any): void {
    console.log(`Security Audit Results:`);
    console.log(`Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Score: ${result.score}/100\n`);

    if (result.issues.length > 0) {
      console.log('Issues Found:');
      for (const issue of result.issues) {
        const icon = issue.severity === 'critical' ? '🚨' : 
                    issue.severity === 'high' ? '⚠️' : 
                    issue.severity === 'medium' ? '⚡' : '💡';
        console.log(`${icon} ${issue.severity.toUpperCase()}: ${issue.description}`);
        console.log(`   → ${issue.recommendation}\n`);
      }
    }

    if (result.recommendations.length > 0) {
      console.log('General Recommendations:');
      for (const recommendation of result.recommendations) {
        console.log(`• ${recommendation}`);
      }
    }
  }

  private displayBenchmarkResults(suite: any): void {
    console.log(`Performance Benchmark Results:`);
    console.log(`Suite: ${suite.name}`);
    console.log(`Success Rate: ${suite.summary.successRate.toFixed(1)}%`);
    console.log(`Average Duration: ${suite.summary.averageDuration.toFixed(0)}ms\n`);

    console.log('Individual Test Results:');
    for (const result of suite.results) {
      const status = result.success ? '✅' : '❌';
      console.log(`${status} ${result.testName}: ${result.duration}ms (${result.throughput.toFixed(2)} ops/sec)`);
    }
  }

  private displayMigrationResult(result: any): void {
    console.log(`Migration Results:`);
    console.log(`Status: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}\n`);

    if (result.migratedFiles.length > 0) {
      console.log('Migrated Files:');
      for (const file of result.migratedFiles) {
        console.log(`✅ ${file}`);
      }
      console.log();
    }

    if (result.warnings.length > 0) {
      console.log('Warnings:');
      for (const warning of result.warnings) {
        console.log(`⚠️ ${warning}`);
      }
      console.log();
    }

    if (result.errors.length > 0) {
      console.log('Errors:');
      for (const error of result.errors) {
        console.log(`❌ ${error}`);
      }
    }

    if (result.backupPath) {
      console.log(`💾 Backup created: ${result.backupPath}`);
    }
  }

  private displayValidationResult(result: any): void {
    console.log(`Production Validation Results:`);
    console.log(`Status: ${result.ready ? '✅ READY' : '❌ NOT READY'}`);
    console.log(`Score: ${result.score}/100\n`);

    if (result.blockers.length > 0) {
      console.log('🚫 Blockers (Must Fix):');
      for (const blocker of result.blockers) {
        console.log(`❌ ${blocker}`);
      }
      console.log();
    }

    console.log('Validation Checks:');
    for (const check of result.checks) {
      const icon = check.status === 'pass' ? '✅' : check.status === 'warn' ? '⚠️' : '❌';
      console.log(`${icon} ${check.name}: ${check.message}`);
    }

    if (result.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      for (const recommendation of result.recommendations) {
        console.log(`• ${recommendation}`);
      }
    }
  }
}

// CLI Entry Point
if (require.main === module) {
  const cli = new ProductionCLI();
  const args = process.argv.slice(2);
  
  cli.run(args).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { ProductionCLI };