import { SecurityAuditor } from '../../src/security/SecurityAuditor';
import type { TestRailConfig } from '../../src/types';

describe('SecurityAuditor', () => {
  let auditor: SecurityAuditor;

  beforeEach(() => {
    auditor = new SecurityAuditor();
  });

  describe('auditConfiguration', () => {
    it('should pass audit for secure configuration', async () => {
      // Set up environment variable to simulate secure configuration
      const originalPassword = process.env.TESTRAIL_PASSWORD;
      process.env.TESTRAIL_PASSWORD = 'secure-api-key-123';

      const config: TestRailConfig = {
        host: 'https://secure.testrail.io',
        username: 'user@example.com',
        password: process.env.TESTRAIL_PASSWORD,
        projectId: 1,
        timeout: 30000,
        retries: 3,
        enableLogging: false,
      };

      const result = await auditor.auditConfiguration(config);

      if (!result.passed) {
        console.log('Security issues found:', result.issues);
      }

      expect(result.passed).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(80);
      expect(result.issues).toHaveLength(0);

      // Restore environment
      if (originalPassword) {
        process.env.TESTRAIL_PASSWORD = originalPassword;
      } else {
        delete process.env.TESTRAIL_PASSWORD;
      }
    });

    it('should fail audit for insecure configuration', async () => {
      const config: TestRailConfig = {
        host: 'http://insecure.testrail.io', // HTTP instead of HTTPS
        username: 'user', // Not an email
        password: '123', // Weak password
        projectId: 1,
        timeout: 30000,
        retries: 3,
        enableLogging: true, // Debug in production
      };

      // Mock production environment
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const result = await auditor.auditConfiguration(config);

      expect(result.passed).toBe(false);
      expect(result.score).toBeLessThan(80);
      expect(result.issues.length).toBeGreaterThan(0);

      // Check for specific security issues
      const criticalIssues = result.issues.filter(issue => issue.severity === 'critical');
      expect(criticalIssues.length).toBeGreaterThan(0);

      // Restore environment
      process.env.NODE_ENV = originalEnv;
    });

    it('should detect hardcoded credentials', async () => {
      const config: TestRailConfig = {
        host: 'https://testrail.io',
        username: 'user@example.com',
        password: 'hardcoded-password', // Hardcoded password
        projectId: 1,
      };

      // Clear environment variable to simulate hardcoded credentials
      const originalPassword = process.env.TESTRAIL_PASSWORD;
      delete process.env.TESTRAIL_PASSWORD;

      const result = await auditor.auditConfiguration(config);

      const authIssues = result.issues.filter(issue => issue.category === 'authentication');
      expect(authIssues.some(issue => issue.description.includes('hardcoded'))).toBe(true);

      // Restore environment
      if (originalPassword) {
        process.env.TESTRAIL_PASSWORD = originalPassword;
      }
    });

    it('should warn about debug mode in production', async () => {
      const config: TestRailConfig = {
        host: 'https://testrail.io',
        username: 'user@example.com',
        password: 'secure-password',
        projectId: 1,
        enableLogging: true,
      };

      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const result = await auditor.auditConfiguration(config);

      const debugIssues = result.issues.filter(
        issue => issue.description.includes('debug') || issue.description.includes('Debug')
      );
      expect(debugIssues.length).toBeGreaterThan(0);

      process.env.NODE_ENV = originalEnv;
    });

    it('should validate timeout and retry configurations', async () => {
      const config: TestRailConfig = {
        host: 'https://testrail.io',
        username: 'user@example.com',
        password: 'secure-password',
        projectId: 1,
        timeout: 120000, // Very high timeout
        retries: 10, // Very high retry attempts
      };

      const result = await auditor.auditConfiguration(config);

      const networkIssues = result.issues.filter(issue => issue.category === 'network');
      expect(networkIssues.length).toBeGreaterThan(0);
    });
  });

  describe('validateInput', () => {
    it('should detect XSS attempts', () => {
      const maliciousInput = '<script>alert("xss")</script>';
      const result = auditor.validateInput(maliciousInput);

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Potential XSS attack detected in input');
    });

    it('should detect SQL injection attempts', () => {
      const maliciousInput = "'; DROP TABLE users; --";
      const result = auditor.validateInput(maliciousInput);

      expect(result.valid).toBe(false);
      expect(result.issues.some(issue => issue.includes('SQL injection'))).toBe(true);
    });

    it('should detect path traversal attempts', () => {
      const maliciousInput = '../../../etc/passwd';
      const result = auditor.validateInput(maliciousInput);

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Potential path traversal attack detected');
    });

    it('should allow safe input', () => {
      const safeInput = 'This is a safe test string';
      const result = auditor.validateInput(safeInput);

      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should handle non-string input', () => {
      const numberInput = 12345;
      const result = auditor.validateInput(numberInput);

      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });
  });

  describe('sanitizeForLogging', () => {
    it('should redact sensitive fields', () => {
      const sensitiveData = {
        username: 'user@example.com',
        password: 'secret-password',
        apiKey: 'secret-key',
        token: 'secret-token',
        normalField: 'normal-value',
      };

      const sanitized = auditor.sanitizeForLogging(sensitiveData) as Record<string, any>;

      expect(sanitized.username).toBe('user@example.com'); // Username is not sensitive
      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.apiKey).toBe('[REDACTED]');
      expect(sanitized.token).toBe('[REDACTED]');
      expect(sanitized.normalField).toBe('normal-value');
    });

    it('should handle nested objects', () => {
      const nestedData = {
        config: {
          password: 'secret',
          host: 'https://testrail.io',
        },
        auth: {
          secret: 'secret-value',
          publicKey: 'public-value',
        },
      };

      const sanitized = auditor.sanitizeForLogging(nestedData) as Record<string, any>;

      expect(sanitized.config.password).toBe('[REDACTED]');
      expect(sanitized.config.host).toBe('https://testrail.io');
      expect(sanitized.auth.secret).toBe('[REDACTED]');
      expect(sanitized.auth.publicKey).toBe('public-value');
    });

    it('should handle non-object input', () => {
      const stringInput = 'test string';
      const numberInput = 123;
      const nullInput = null;

      expect(auditor.sanitizeForLogging(stringInput)).toBe('test string');
      expect(auditor.sanitizeForLogging(numberInput)).toBe(123);
      expect(auditor.sanitizeForLogging(nullInput)).toBe(null);
    });

    it('should handle arrays', () => {
      const arrayData = [
        { password: 'secret1', name: 'item1' },
        { password: 'secret2', name: 'item2' },
      ];

      const sanitized = auditor.sanitizeForLogging(arrayData) as any[];

      expect(Array.isArray(sanitized)).toBe(true);
      expect(sanitized[0].password).toBe('[REDACTED]');
      expect(sanitized[0].name).toBe('item1');
      expect(sanitized[1].password).toBe('[REDACTED]');
      expect(sanitized[1].name).toBe('item2');
    });
  });

  describe('security score calculation', () => {
    it('should calculate correct scores for different severity levels', async () => {
      // Test with known issues to verify scoring
      const configWithCriticalIssue: TestRailConfig = {
        host: 'http://insecure.testrail.io', // Critical: HTTP instead of HTTPS
        username: 'user@example.com',
        password: 'secure-password',
        projectId: 1,
      };

      const result = await auditor.auditConfiguration(configWithCriticalIssue);

      // Should have at least one critical issue (HTTP)
      const criticalIssues = result.issues.filter(issue => issue.severity === 'critical');
      expect(criticalIssues.length).toBeGreaterThan(0);

      // Score should be reduced by 25 points per critical issue
      expect(result.score).toBeLessThanOrEqual(75);
    });

    it('should provide appropriate recommendations', async () => {
      const insecureConfig: TestRailConfig = {
        host: 'http://testrail.io',
        username: 'user',
        password: '123',
        projectId: 1,
        enableLogging: true,
      };

      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const result = await auditor.auditConfiguration(insecureConfig);

      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations.some(rec => rec.includes('environment variables'))).toBe(true);
      expect(result.recommendations.some(rec => rec.includes('HTTPS'))).toBe(true);

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('edge cases', () => {
    it('should handle missing configuration fields gracefully', async () => {
      const incompleteConfig = {
        host: 'https://testrail.io',
        // Missing other required fields
      } as TestRailConfig;

      const result = await auditor.auditConfiguration(incompleteConfig);

      expect(result.passed).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it('should handle empty configuration', async () => {
      const emptyConfig = {} as TestRailConfig;

      const result = await auditor.auditConfiguration(emptyConfig);

      expect(result.passed).toBe(false);
      expect(result.score).toBeLessThan(50);
    });

    it('should handle configuration with undefined values', async () => {
      const configWithUndefined: TestRailConfig = {
        host: 'https://testrail.io',
        username: 'user@example.com',
        password: undefined as unknown as string,
        projectId: 1,
      };

      const result = await auditor.auditConfiguration(configWithUndefined);

      const authIssues = result.issues.filter(issue => issue.category === 'authentication');
      expect(authIssues.length).toBeGreaterThan(0);
    });
  });
});
