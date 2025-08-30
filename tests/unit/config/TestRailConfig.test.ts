import { ConfigManager } from '../../../src/config/TestRailConfig';
import { TestRailConfig, ConfigurationError } from '../../../src/types';

describe('ConfigManager', () => {
  // Reset singleton before each test
  beforeEach(() => {
    // @ts-ignore - Access private static property for testing
    ConfigManager.instance = undefined;
  });

  const validConfig: TestRailConfig = {
    host: 'https://test.testrail.io',
    username: 'test@example.com',
    password: 'test-password',
    projectId: 1,
    timeout: 30000,
    retries: 3,
    enableLogging: true
  };

  describe('getInstance', () => {
    it('should create instance with valid config', () => {
      const manager = ConfigManager.getInstance(validConfig);
      expect(manager).toBeInstanceOf(ConfigManager);
    });

    it('should return same instance on subsequent calls', () => {
      const manager1 = ConfigManager.getInstance(validConfig);
      const manager2 = ConfigManager.getInstance();
      expect(manager1).toBe(manager2);
    });

    it('should throw error if no config provided on first call', () => {
      expect(() => ConfigManager.getInstance()).toThrow(
        'Configuration required for first initialization'
      );
    });
  });

  describe('config validation', () => {
    it('should throw error for missing host', () => {
      const invalidConfig = { ...validConfig, host: '' };
      expect(() => ConfigManager.getInstance(invalidConfig)).toThrow(ConfigurationError);
    });

    it('should throw error for missing username', () => {
      const invalidConfig = { ...validConfig, username: '' };
      expect(() => ConfigManager.getInstance(invalidConfig)).toThrow(ConfigurationError);
    });

    it('should throw error for missing password', () => {
      const invalidConfig = { ...validConfig, password: '' };
      expect(() => ConfigManager.getInstance(invalidConfig)).toThrow(ConfigurationError);
    });

    it('should throw error for invalid projectId', () => {
      const invalidConfig = { ...validConfig, projectId: 0 };
      expect(() => ConfigManager.getInstance(invalidConfig)).toThrow(ConfigurationError);
    });

    it('should throw error for invalid host URL', () => {
      const invalidConfig = { ...validConfig, host: 'not-a-url' };
      expect(() => ConfigManager.getInstance(invalidConfig)).toThrow(ConfigurationError);
    });

    it('should accept valid HTTPS URL', () => {
      const config = { ...validConfig, host: 'https://company.testrail.io' };
      expect(() => ConfigManager.getInstance(config)).not.toThrow();
    });

    it('should accept valid HTTP URL', () => {
      const config = { ...validConfig, host: 'http://localhost:3000' };
      expect(() => ConfigManager.getInstance(config)).not.toThrow();
    });
  });

  describe('getConfig', () => {
    it('should return copy of config', () => {
      const manager = ConfigManager.getInstance(validConfig);
      const config = manager.getConfig();
      
      expect(config).toEqual(validConfig);
      expect(config).not.toBe(validConfig); // Should be a copy
    });
  });

  describe('updateConfig', () => {
    it('should update config with valid changes', () => {
      const manager = ConfigManager.getInstance(validConfig);
      const updates = { timeout: 60000, retries: 5 };
      
      manager.updateConfig(updates);
      const updatedConfig = manager.getConfig();
      
      expect(updatedConfig.timeout).toBe(60000);
      expect(updatedConfig.retries).toBe(5);
      expect(updatedConfig.host).toBe(validConfig.host); // Other values unchanged
    });

    it('should validate updated config', () => {
      const manager = ConfigManager.getInstance(validConfig);
      const invalidUpdates = { projectId: -1 };
      
      expect(() => manager.updateConfig(invalidUpdates)).toThrow(ConfigurationError);
    });

    it('should not update config if validation fails', () => {
      const manager = ConfigManager.getInstance(validConfig);
      const originalConfig = manager.getConfig();
      
      try {
        manager.updateConfig({ host: 'invalid-url' });
      } catch {
        // Expected to throw
      }
      
      const currentConfig = manager.getConfig();
      expect(currentConfig).toEqual(originalConfig);
    });
  });

  describe('default values', () => {
    it('should work with minimal config', () => {
      const minimalConfig = {
        host: 'https://test.testrail.io',
        username: 'test@example.com',
        password: 'test-password',
        projectId: 1
      };
      
      const manager = ConfigManager.getInstance(minimalConfig);
      const config = manager.getConfig();
      
      expect(config.timeout).toBeUndefined();
      expect(config.retries).toBeUndefined();
      expect(config.enableLogging).toBeUndefined();
    });
  });

  describe('resetInstance', () => {
    it('should reset singleton instance', () => {
      ConfigManager.getInstance(validConfig);
      ConfigManager.resetInstance();
      
      expect(() => ConfigManager.getInstance()).toThrow(
        'Configuration required for first initialization'
      );
    });
  });

  describe('fromEnvironment', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should create config from environment variables', () => {
      process.env.TESTRAIL_HOST = 'https://env.testrail.io';
      process.env.TESTRAIL_USERNAME = 'env@example.com';
      process.env.TESTRAIL_PASSWORD = 'env-password';
      process.env.TESTRAIL_PROJECT_ID = '2';
      process.env.TESTRAIL_TIMEOUT = '45000';
      process.env.TESTRAIL_RETRIES = '5';
      process.env.TESTRAIL_ENABLE_LOGGING = 'true';

      const config = ConfigManager.fromEnvironment();

      expect(config.host).toBe('https://env.testrail.io');
      expect(config.username).toBe('env@example.com');
      expect(config.password).toBe('env-password');
      expect(config.projectId).toBe(2);
      expect(config.timeout).toBe(45000);
      expect(config.retries).toBe(5);
      expect(config.enableLogging).toBe(true);
    });

    it('should work with minimal environment variables', () => {
      process.env.TESTRAIL_HOST = 'https://minimal.testrail.io';
      process.env.TESTRAIL_USERNAME = 'minimal@example.com';
      process.env.TESTRAIL_PASSWORD = 'minimal-password';
      process.env.TESTRAIL_PROJECT_ID = '3';

      const config = ConfigManager.fromEnvironment();

      expect(config.host).toBe('https://minimal.testrail.io');
      expect(config.projectId).toBe(3);
      expect(config.timeout).toBeUndefined();
      expect(config.retries).toBeUndefined();
      expect(config.enableLogging).toBeUndefined();
    });

    it('should throw error for missing required environment variables', () => {
      delete process.env.TESTRAIL_HOST;
      delete process.env.TESTRAIL_USERNAME;
      delete process.env.TESTRAIL_PASSWORD;
      delete process.env.TESTRAIL_PROJECT_ID;

      expect(() => ConfigManager.fromEnvironment()).toThrow(
        'Missing required environment variables'
      );
    });

    it('should throw error for invalid project ID', () => {
      process.env.TESTRAIL_HOST = 'https://test.testrail.io';
      process.env.TESTRAIL_USERNAME = 'test@example.com';
      process.env.TESTRAIL_PASSWORD = 'test-password';
      process.env.TESTRAIL_PROJECT_ID = 'invalid';

      expect(() => ConfigManager.fromEnvironment()).toThrow(
        'TESTRAIL_PROJECT_ID must be a valid number'
      );
    });

    it('should handle invalid timeout and retries gracefully', () => {
      process.env.TESTRAIL_HOST = 'https://test.testrail.io';
      process.env.TESTRAIL_USERNAME = 'test@example.com';
      process.env.TESTRAIL_PASSWORD = 'test-password';
      process.env.TESTRAIL_PROJECT_ID = '1';
      process.env.TESTRAIL_TIMEOUT = 'invalid';
      process.env.TESTRAIL_RETRIES = 'invalid';

      const config = ConfigManager.fromEnvironment();

      expect(config.timeout).toBeUndefined();
      expect(config.retries).toBeUndefined();
    });

    it('should handle enableLogging false', () => {
      process.env.TESTRAIL_HOST = 'https://test.testrail.io';
      process.env.TESTRAIL_USERNAME = 'test@example.com';
      process.env.TESTRAIL_PASSWORD = 'test-password';
      process.env.TESTRAIL_PROJECT_ID = '1';
      process.env.TESTRAIL_ENABLE_LOGGING = 'false';

      const config = ConfigManager.fromEnvironment();

      expect(config.enableLogging).toBe(false);
    });
  });

  describe('create', () => {
    it('should create and validate config', () => {
      const config = ConfigManager.create(validConfig);
      expect(config).toEqual(validConfig);
    });

    it('should throw error for invalid config', () => {
      const invalidConfig = { ...validConfig, host: '' };
      expect(() => ConfigManager.create(invalidConfig)).toThrow(ConfigurationError);
    });
  });

  describe('advanced validation', () => {
    it('should validate timeout range', () => {
      const invalidConfig = { ...validConfig, timeout: 400000 };
      expect(() => ConfigManager.getInstance(invalidConfig)).toThrow(
        'timeout must be between 1 and 300000 milliseconds'
      );
    });

    it('should validate retries range', () => {
      const invalidConfig = { ...validConfig, retries: 15 };
      expect(() => ConfigManager.getInstance(invalidConfig)).toThrow(
        'retries must be between 0 and 10'
      );
    });

    it('should validate protocol', () => {
      const invalidConfig = { ...validConfig, host: 'ftp://test.testrail.io' };
      expect(() => ConfigManager.getInstance(invalidConfig)).toThrow(
        'host must use http or https protocol'
      );
    });
  });
});