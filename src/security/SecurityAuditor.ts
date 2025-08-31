import type { TestRailConfig } from '../types';
import { Logger } from '../utils/Logger';

export interface SecurityAuditResult {
  passed: boolean;
  issues: SecurityIssue[];
  score: number;
  recommendations: string[];
}

export interface SecurityIssue {
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'authentication' | 'configuration' | 'network' | 'data';
  description: string;
  recommendation: string;
}

export class SecurityAuditor {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('SecurityAuditor');
  }

  /**
   * Perform comprehensive security audit
   */
  async auditConfiguration(config: TestRailConfig): Promise<SecurityAuditResult> {
    this.logger.info('Starting security audit');

    const issues: SecurityIssue[] = [];

    // Check authentication security
    issues.push(...this.auditAuthentication(config));

    // Check configuration security
    issues.push(...this.auditConfigurationSecurity(config));

    // Check network security
    issues.push(...this.auditNetworkSecurity(config));

    // Check data handling security
    issues.push(...this.auditDataSecurity(config));

    const score = this.calculateSecurityScore(issues);
    const recommendations = this.generateRecommendations(issues);

    const result: SecurityAuditResult = {
      passed: score >= 80,
      issues,
      score,
      recommendations,
    };

    this.logger.info(`Security audit completed with score: ${score}`, {
      issueCount: issues.length,
      passed: result.passed,
    });

    return result;
  }

  private auditAuthentication(config: TestRailConfig): SecurityIssue[] {
    const issues: SecurityIssue[] = [];

    // Check for missing credentials
    if (!config.password) {
      issues.push({
        severity: 'critical',
        category: 'authentication',
        description: 'API key is missing',
        recommendation: 'Provide a valid API key from TestRail user settings',
      });
    } else if (config.password.length < 8) {
      issues.push({
        severity: 'high',
        category: 'authentication',
        description: 'API key appears to be too short',
        recommendation: 'Use a strong API key from TestRail user settings',
      });
    }

    if (!config.username) {
      issues.push({
        severity: 'critical',
        category: 'authentication',
        description: 'Username is missing',
        recommendation: 'Provide a valid TestRail username (email address)',
      });
    } else if (!config.username.includes('@')) {
      issues.push({
        severity: 'medium',
        category: 'authentication',
        description: 'Username should be an email address for TestRail API',
        recommendation: 'Use email address as username for TestRail authentication',
      });
    }

    // Check for hardcoded credentials (only if password exists)
    if (config.password && !config.password.startsWith('$') && !process.env.TESTRAIL_PASSWORD) {
      issues.push({
        severity: 'critical',
        category: 'authentication',
        description: 'Credentials may be hardcoded instead of using environment variables',
        recommendation: 'Store credentials in environment variables or secure vault',
      });
    }

    return issues;
  }

  private auditConfigurationSecurity(config: TestRailConfig): SecurityIssue[] {
    const issues: SecurityIssue[] = [];

    // Check for missing host
    if (!config.host) {
      issues.push({
        severity: 'critical',
        category: 'configuration',
        description: 'TestRail host is missing',
        recommendation: 'Provide a valid TestRail instance URL',
      });
    } else if (!config.host.startsWith('https://')) {
      issues.push({
        severity: 'critical',
        category: 'configuration',
        description: 'TestRail host is not using HTTPS',
        recommendation: 'Always use HTTPS for TestRail connections',
      });
    } else if (config.host.includes('localhost') || config.host.includes('127.0.0.1')) {
      issues.push({
        severity: 'medium',
        category: 'configuration',
        description: 'Using localhost/development host configuration',
        recommendation: 'Ensure production configuration uses proper TestRail instance',
      });
    }

    // Check for missing project ID
    if (!config.projectId) {
      issues.push({
        severity: 'critical',
        category: 'configuration',
        description: 'TestRail project ID is missing',
        recommendation: 'Provide a valid TestRail project ID',
      });
    }

    // Check for debug mode in production
    if (config.enableLogging && process.env.NODE_ENV === 'production') {
      issues.push({
        severity: 'medium',
        category: 'configuration',
        description: 'Debug mode is enabled in production environment',
        recommendation: 'Disable debug mode in production to prevent information leakage',
      });
    }

    return issues;
  }

  private auditNetworkSecurity(config: TestRailConfig): SecurityIssue[] {
    const issues: SecurityIssue[] = [];

    // Check timeout configurations
    if (config.timeout && config.timeout > 60000) {
      issues.push({
        severity: 'low',
        category: 'network',
        description: 'Network timeout is set very high',
        recommendation: 'Consider reducing timeout to prevent hanging connections',
      });
    }

    // Check retry configurations
    if (config.retries && config.retries > 5) {
      issues.push({
        severity: 'low',
        category: 'network',
        description: 'Retry attempts set very high',
        recommendation: 'Limit retry attempts to prevent excessive API calls',
      });
    }

    return issues;
  }

  private auditDataSecurity(config: TestRailConfig): SecurityIssue[] {
    const issues: SecurityIssue[] = [];

    // Check for sensitive data in logs
    if (config.enableLogging) {
      issues.push({
        severity: 'medium',
        category: 'data',
        description: 'Debug mode may log sensitive information',
        recommendation: 'Ensure sensitive data is not logged in debug mode',
      });
    }

    // Note: Coordination directory security is handled by WorkerCoordinator
    // No additional checks needed here for basic TestRailConfig

    return issues;
  }

  private calculateSecurityScore(issues: SecurityIssue[]): number {
    let score = 100;

    for (const issue of issues) {
      switch (issue.severity) {
        case 'critical':
          score -= 25;
          break;
        case 'high':
          score -= 15;
          break;
        case 'medium':
          score -= 10;
          break;
        case 'low':
          score -= 5;
          break;
      }
    }

    return Math.max(0, score);
  }

  private generateRecommendations(issues: SecurityIssue[]): string[] {
    const recommendations = new Set<string>();

    // Add general recommendations
    recommendations.add('Use environment variables for all sensitive configuration');
    recommendations.add('Enable HTTPS for all TestRail connections');
    recommendations.add('Regularly rotate API keys and credentials');
    recommendations.add('Monitor and audit API usage patterns');

    // Add specific recommendations from issues
    for (const issue of issues) {
      recommendations.add(issue.recommendation);
    }

    return Array.from(recommendations);
  }

  /**
   * Validate input data for security issues
   */
  validateInput(data: unknown): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    if (typeof data === 'string') {
      // Check for potential injection attacks
      if (data.includes('<script>') || data.includes('javascript:')) {
        issues.push('Potential XSS attack detected in input');
      }

      // Check for SQL injection patterns
      if (/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)\b)/i.test(data)) {
        issues.push('Potential SQL injection pattern detected');
      }

      // Check for path traversal
      if (data.includes('../') || data.includes('..\\')) {
        issues.push('Potential path traversal attack detected');
      }
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  /**
   * Sanitize sensitive data for logging
   */
  sanitizeForLogging(data: unknown): unknown {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeForLogging(item));
    }

    const sanitized = { ...data } as Record<string, any>;
    const sensitiveKeys = ['password', 'token', 'secret', 'credential'];
    const sensitiveKeyPatterns = ['apikey', 'api_key']; // Exact patterns

    for (const key of Object.keys(sanitized)) {
      const keyLower = key.toLowerCase();
      const isSensitiveKey = sensitiveKeys.some(sensitive => keyLower.includes(sensitive));
      const isSensitivePattern = sensitiveKeyPatterns.some(pattern => keyLower === pattern);
      const isKeyButNotPublic = keyLower.includes('key') && !keyLower.includes('public');

      if (isSensitiveKey || isSensitivePattern || isKeyButNotPublic) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitizeForLogging(sanitized[key]);
      }
    }

    return sanitized;
  }
}
