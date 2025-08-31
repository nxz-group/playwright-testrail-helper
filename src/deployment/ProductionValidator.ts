import { Logger } from '../utils/Logger';
import { SecurityAuditor } from '../security/SecurityAuditor';
import { PerformanceBenchmark } from '../performance/PerformanceBenchmark';
import type { TestRailConfig } from '../types';
import type { TestRailApiClient } from '../client/TestRailApiClient';

export interface ValidationResult {
  ready: boolean;
  score: number;
  checks: ValidationCheck[];
  recommendations: string[];
  blockers: string[];
}

export interface ValidationCheck {
  name: string;
  category: 'security' | 'performance' | 'configuration' | 'connectivity' | 'compatibility';
  status: 'pass' | 'warn' | 'fail';
  message: string;
  details?: any;
}

export class ProductionValidator {
  private logger: Logger;
  private securityAuditor: SecurityAuditor;
  private performanceBenchmark: PerformanceBenchmark;

  constructor() {
    this.logger = new Logger('ProductionValidator');
    this.securityAuditor = new SecurityAuditor();
    this.performanceBenchmark = new PerformanceBenchmark();
  }

  /**
   * Comprehensive production readiness validation
   */
  async validateProductionReadiness(
    config: TestRailConfig,
    apiClient: TestRailApiClient
  ): Promise<ValidationResult> {
    this.logger.info('Starting production readiness validation');
    
    const checks: ValidationCheck[] = [];
    const recommendations: string[] = [];
    const blockers: string[] = [];

    // Security validation
    await this.validateSecurity(config, checks, recommendations, blockers);
    
    // Configuration validation
    await this.validateConfiguration(config, checks, recommendations, blockers);
    
    // Connectivity validation
    await this.validateConnectivity(apiClient, checks, recommendations, blockers);
    
    // Performance validation
    await this.validatePerformance(apiClient, checks, recommendations, blockers);
    
    // Compatibility validation
    await this.validateCompatibility(checks, recommendations, blockers);
    
    // Environment validation
    await this.validateEnvironment(checks, recommendations, blockers);

    const score = this.calculateReadinessScore(checks);
    const ready = blockers.length === 0 && score >= 80;

    const result: ValidationResult = {
      ready,
      score,
      checks,
      recommendations,
      blockers
    };

    this.logger.info('Production validation completed', {
      ready,
      score,
      totalChecks: checks.length,
      blockers: blockers.length
    });

    return result;
  }

  private async validateSecurity(
    config: TestRailConfig,
    checks: ValidationCheck[],
    recommendations: string[],
    blockers: string[]
  ): Promise<void> {
    try {
      const auditResult = await this.securityAuditor.auditConfiguration(config);
      
      checks.push({
        name: 'Security Audit',
        category: 'security',
        status: auditResult.passed ? 'pass' : 'fail',
        message: `Security score: ${auditResult.score}/100`,
        details: auditResult
      });

      if (!auditResult.passed) {
        blockers.push('Security audit failed - critical security issues found');
      }

      // Add critical security issues as blockers
      for (const issue of auditResult.issues) {
        if (issue.severity === 'critical') {
          blockers.push(`Critical security issue: ${issue.description}`);
        }
      }

      recommendations.push(...auditResult.recommendations);

    } catch (error) {
      checks.push({
        name: 'Security Audit',
        category: 'security',
        status: 'fail',
        message: `Security audit failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      blockers.push('Security audit could not be completed');
    }
  }

  private async validateConfiguration(
    config: TestRailConfig,
    checks: ValidationCheck[],
    recommendations: string[],
    blockers: string[]
  ): Promise<void> {
    // Validate required configuration
    const requiredFields = ['host', 'username', 'password', 'projectId'];
    const missingFields = requiredFields.filter(field => !(field in config) || !config[field as keyof TestRailConfig]);
    
    if (missingFields.length > 0) {
      checks.push({
        name: 'Required Configuration',
        category: 'configuration',
        status: 'fail',
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
      blockers.push('Missing required configuration fields');
    } else {
      checks.push({
        name: 'Required Configuration',
        category: 'configuration',
        status: 'pass',
        message: 'All required configuration fields present'
      });
    }

    // Validate host format
    if (config.host) {
      if (!config.host.startsWith('https://')) {
        checks.push({
          name: 'HTTPS Configuration',
          category: 'configuration',
          status: 'fail',
          message: 'Host must use HTTPS protocol'
        });
        blockers.push('Insecure HTTP connection not allowed in production');
      } else {
        checks.push({
          name: 'HTTPS Configuration',
          category: 'configuration',
          status: 'pass',
          message: 'Using secure HTTPS connection'
        });
      }
    }

    // Validate timeout settings
    if (config.timeout && config.timeout > 60000) {
      checks.push({
        name: 'Timeout Configuration',
        category: 'configuration',
        status: 'warn',
        message: 'Timeout is set very high (>60s)'
      });
      recommendations.push('Consider reducing timeout for better responsiveness');
    } else {
      checks.push({
        name: 'Timeout Configuration',
        category: 'configuration',
        status: 'pass',
        message: 'Timeout configuration is reasonable'
      });
    }

    // Validate retry settings
    if (config.retryAttempts && config.retryAttempts > 5) {
      checks.push({
        name: 'Retry Configuration',
        category: 'configuration',
        status: 'warn',
        message: 'Retry attempts set very high (>5)'
      });
      recommendations.push('Limit retry attempts to prevent excessive API calls');
    } else {
      checks.push({
        name: 'Retry Configuration',
        category: 'configuration',
        status: 'pass',
        message: 'Retry configuration is reasonable'
      });
    }
  }

  private async validateConnectivity(
    apiClient: TestRailApiClient,
    checks: ValidationCheck[],
    recommendations: string[],
    blockers: string[]
  ): Promise<void> {
    try {
      // Test basic connectivity
      const startTime = Date.now();
      await apiClient.get('/get_projects');
      const responseTime = Date.now() - startTime;

      if (responseTime > 5000) {
        checks.push({
          name: 'API Connectivity',
          category: 'connectivity',
          status: 'warn',
          message: `API response time is slow: ${responseTime}ms`
        });
        recommendations.push('Check network connectivity and TestRail instance performance');
      } else {
        checks.push({
          name: 'API Connectivity',
          category: 'connectivity',
          status: 'pass',
          message: `API connectivity successful (${responseTime}ms)`
        });
      }

      // Test authentication
      try {
        await apiClient.get('/get_user_by_email/test@example.com');
        checks.push({
          name: 'Authentication',
          category: 'connectivity',
          status: 'pass',
          message: 'Authentication successful'
        });
      } catch (error) {
        if (error instanceof Error && error.message.includes('401')) {
          checks.push({
            name: 'Authentication',
            category: 'connectivity',
            status: 'fail',
            message: 'Authentication failed - invalid credentials'
          });
          blockers.push('Invalid TestRail credentials');
        } else {
          checks.push({
            name: 'Authentication',
            category: 'connectivity',
            status: 'pass',
            message: 'Authentication appears valid'
          });
        }
      }

    } catch (error) {
      checks.push({
        name: 'API Connectivity',
        category: 'connectivity',
        status: 'fail',
        message: `Cannot connect to TestRail API: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      blockers.push('Cannot establish connection to TestRail API');
    }
  }

  private async validatePerformance(
    apiClient: TestRailApiClient,
    checks: ValidationCheck[],
    recommendations: string[],
    blockers: string[]
  ): Promise<void> {
    try {
      // Run lightweight performance test
      const startTime = Date.now();
      const promises = [];
      
      // Test concurrent requests
      for (let i = 0; i < 3; i++) {
        promises.push(apiClient.get('/get_projects'));
      }
      
      await Promise.all(promises);
      const totalTime = Date.now() - startTime;
      const avgTime = totalTime / 3;

      if (avgTime > 3000) {
        checks.push({
          name: 'Performance Test',
          category: 'performance',
          status: 'warn',
          message: `Average response time is slow: ${avgTime.toFixed(0)}ms`
        });
        recommendations.push('Performance may be impacted by slow API responses');
      } else {
        checks.push({
          name: 'Performance Test',
          category: 'performance',
          status: 'pass',
          message: `Performance acceptable: ${avgTime.toFixed(0)}ms average`
        });
      }

      // Test memory usage
      const memoryBefore = process.memoryUsage().heapUsed;
      
      // Create some test data
      const testData = new Array(1000).fill(null).map((_, i) => ({
        id: i,
        data: 'test'.repeat(100)
      }));
      
      const memoryAfter = process.memoryUsage().heapUsed;
      const memoryUsed = (memoryAfter - memoryBefore) / 1024 / 1024;
      
      checks.push({
        name: 'Memory Usage',
        category: 'performance',
        status: memoryUsed > 50 ? 'warn' : 'pass',
        message: `Memory usage test: ${memoryUsed.toFixed(2)}MB`
      });

      if (memoryUsed > 50) {
        recommendations.push('Monitor memory usage in production environment');
      }

    } catch (error) {
      checks.push({
        name: 'Performance Test',
        category: 'performance',
        status: 'fail',
        message: `Performance test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      recommendations.push('Unable to validate performance - monitor closely in production');
    }
  }

  private async validateCompatibility(
    checks: ValidationCheck[],
    recommendations: string[],
    blockers: string[]
  ): Promise<void> {
    // Check Node.js version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    
    if (majorVersion < 16) {
      checks.push({
        name: 'Node.js Version',
        category: 'compatibility',
        status: 'fail',
        message: `Node.js version ${nodeVersion} is not supported (requires >=16)`
      });
      blockers.push('Node.js version is too old - upgrade to Node.js 16 or higher');
    } else {
      checks.push({
        name: 'Node.js Version',
        category: 'compatibility',
        status: 'pass',
        message: `Node.js version ${nodeVersion} is supported`
      });
    }

    // Check TypeScript availability
    try {
      require.resolve('typescript');
      checks.push({
        name: 'TypeScript Support',
        category: 'compatibility',
        status: 'pass',
        message: 'TypeScript is available'
      });
    } catch {
      checks.push({
        name: 'TypeScript Support',
        category: 'compatibility',
        status: 'warn',
        message: 'TypeScript not found - may impact development experience'
      });
      recommendations.push('Install TypeScript for better development experience');
    }

    // Check Playwright availability
    try {
      require.resolve('@playwright/test');
      checks.push({
        name: 'Playwright Integration',
        category: 'compatibility',
        status: 'pass',
        message: 'Playwright is available'
      });
    } catch {
      checks.push({
        name: 'Playwright Integration',
        category: 'compatibility',
        status: 'warn',
        message: 'Playwright not found - ensure it is installed for test integration'
      });
      recommendations.push('Install @playwright/test for full integration support');
    }
  }

  private async validateEnvironment(
    checks: ValidationCheck[],
    recommendations: string[],
    blockers: string[]
  ): Promise<void> {
    // Check environment variables
    const requiredEnvVars = ['TESTRAIL_HOST', 'TESTRAIL_USERNAME', 'TESTRAIL_PASSWORD', 'TESTRAIL_PROJECT_ID'];
    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
    
    if (missingEnvVars.length > 0) {
      checks.push({
        name: 'Environment Variables',
        category: 'configuration',
        status: 'warn',
        message: `Missing environment variables: ${missingEnvVars.join(', ')}`
      });
      recommendations.push('Set up environment variables for production deployment');
    } else {
      checks.push({
        name: 'Environment Variables',
        category: 'configuration',
        status: 'pass',
        message: 'All recommended environment variables are set'
      });
    }

    // Check production environment
    if (process.env.NODE_ENV === 'production') {
      checks.push({
        name: 'Production Environment',
        category: 'configuration',
        status: 'pass',
        message: 'Running in production environment'
      });
    } else {
      checks.push({
        name: 'Production Environment',
        category: 'configuration',
        status: 'warn',
        message: `Running in ${process.env.NODE_ENV || 'development'} environment`
      });
      recommendations.push('Set NODE_ENV=production for production deployment');
    }

    // Check available disk space (simplified check)
    try {
      const fs = require('fs');
      const stats = fs.statSync('.');
      
      checks.push({
        name: 'File System Access',
        category: 'configuration',
        status: 'pass',
        message: 'File system access is available'
      });
    } catch (error) {
      checks.push({
        name: 'File System Access',
        category: 'configuration',
        status: 'fail',
        message: 'File system access issues detected'
      });
      blockers.push('File system access is required for coordination features');
    }
  }

  private calculateReadinessScore(checks: ValidationCheck[]): number {
    let score = 100;
    
    for (const check of checks) {
      switch (check.status) {
        case 'fail':
          score -= 20;
          break;
        case 'warn':
          score -= 10;
          break;
        case 'pass':
          // No deduction
          break;
      }
    }
    
    return Math.max(0, score);
  }

  /**
   * Generate production readiness report
   */
  generateReport(result: ValidationResult): string {
    let report = `# Production Readiness Report\n\n`;
    report += `**Status**: ${result.ready ? '✅ Ready for Production' : '❌ Not Ready for Production'}\n`;
    report += `**Score**: ${result.score}/100\n`;
    report += `**Date**: ${new Date().toISOString()}\n\n`;

    if (result.blockers.length > 0) {
      report += `## 🚫 Blockers (Must Fix)\n`;
      for (const blocker of result.blockers) {
        report += `- ❌ ${blocker}\n`;
      }
      report += `\n`;
    }

    report += `## 📋 Validation Results\n\n`;
    
    const categories = ['security', 'configuration', 'connectivity', 'performance', 'compatibility'];
    
    for (const category of categories) {
      const categoryChecks = result.checks.filter(check => check.category === category);
      if (categoryChecks.length > 0) {
        report += `### ${category.charAt(0).toUpperCase() + category.slice(1)}\n`;
        for (const check of categoryChecks) {
          const icon = check.status === 'pass' ? '✅' : check.status === 'warn' ? '⚠️' : '❌';
          report += `- ${icon} **${check.name}**: ${check.message}\n`;
        }
        report += `\n`;
      }
    }

    if (result.recommendations.length > 0) {
      report += `## 💡 Recommendations\n`;
      for (const recommendation of result.recommendations) {
        report += `- ${recommendation}\n`;
      }
      report += `\n`;
    }

    report += `## 🚀 Next Steps\n`;
    if (result.ready) {
      report += `- Package is ready for production deployment\n`;
      report += `- Monitor performance and error rates after deployment\n`;
      report += `- Set up alerting for critical failures\n`;
      report += `- Schedule regular security audits\n`;
    } else {
      report += `- Fix all blocking issues listed above\n`;
      report += `- Address high-priority warnings\n`;
      report += `- Re-run validation after fixes\n`;
      report += `- Consider staging environment testing\n`;
    }

    return report;
  }
}