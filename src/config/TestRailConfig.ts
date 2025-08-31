import { ConfigurationError, type TestRailConfig } from '../types';

// Node.js globals
declare const process: {
  env: Record<string, string | undefined>;
};

declare const URL: {
  new (
    url: string
  ): {
    protocol: string;
  };
};

/**
 * Configuration manager using singleton pattern for TestRail settings
 */
export class ConfigManager {
  private static instance: ConfigManager;
  private config: TestRailConfig;

  private constructor(config: TestRailConfig) {
    this.validateConfig(config);
    this.config = { ...config };
  }

  /**
   * Get or create the singleton instance
   */
  static getInstance(config?: TestRailConfig): ConfigManager {
    if (!ConfigManager.instance) {
      if (!config) {
        throw new ConfigurationError('Configuration required for first initialization');
      }
      ConfigManager.instance = new ConfigManager(config);
    }
    return ConfigManager.instance;
  }

  /**
   * Reset the singleton instance (useful for testing)
   */
  static resetInstance(): void {
    ConfigManager.instance = undefined as unknown as ConfigManager;
  }

  /**
   * Validate configuration object
   */
  private validateConfig(config: TestRailConfig): void {
    const errors: string[] = [];

    // Required fields validation
    if (!config.host?.trim()) {
      errors.push('host is required and cannot be empty');
    }

    if (!config.username?.trim()) {
      errors.push('username is required and cannot be empty');
    }

    if (!config.password?.trim()) {
      errors.push('password is required and cannot be empty');
    }

    if (!config.projectId || config.projectId <= 0) {
      errors.push('projectId must be a positive number');
    }

    // URL format validation
    if (config.host) {
      try {
        const url = new URL(config.host);
        if (!['http:', 'https:'].includes(url.protocol)) {
          errors.push('host must use http or https protocol');
        }
      } catch {
        errors.push('host must be a valid URL');
      }
    }

    // Optional fields validation
    if (config.timeout !== undefined && (config.timeout <= 0 || config.timeout > 300000)) {
      errors.push('timeout must be between 1 and 300000 milliseconds');
    }

    if (config.retries !== undefined && (config.retries < 0 || config.retries > 10)) {
      errors.push('retries must be between 0 and 10');
    }

    if (errors.length > 0) {
      throw new ConfigurationError(`Configuration validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Get a copy of the current configuration
   */
  getConfig(): TestRailConfig {
    const result: TestRailConfig = {
      host: this.config.host,
      username: this.config.username,
      password: this.config.password,
      projectId: this.config.projectId,
    };

    // Only include optional fields if they are defined
    if (this.config.timeout !== undefined) {
      result.timeout = this.config.timeout;
    }
    if (this.config.retries !== undefined) {
      result.retries = this.config.retries;
    }
    if (this.config.enableLogging !== undefined) {
      result.enableLogging = this.config.enableLogging;
    }

    return result;
  }

  /**
   * Update configuration with new values
   */
  updateConfig(updates: Partial<TestRailConfig>): void {
    const newConfig = { ...this.config, ...updates };
    this.validateConfig(newConfig);
    this.config = newConfig;
  }

  /**
   * Get configuration from environment variables
   */
  static fromEnvironment(): TestRailConfig {
    const requiredEnvVars = [
      'TESTRAIL_HOST',
      'TESTRAIL_USERNAME',
      'TESTRAIL_PASSWORD',
      'TESTRAIL_PROJECT_ID',
    ];

    const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);
    if (missing.length > 0) {
      throw new ConfigurationError(`Missing required environment variables: ${missing.join(', ')}`);
    }

    const projectId = parseInt(process.env.TESTRAIL_PROJECT_ID!, 10);
    if (Number.isNaN(projectId)) {
      throw new ConfigurationError('TESTRAIL_PROJECT_ID must be a valid number');
    }

    const config: TestRailConfig = {
      host: process.env.TESTRAIL_HOST!,
      username: process.env.TESTRAIL_USERNAME!,
      password: process.env.TESTRAIL_PASSWORD!,
      projectId,
    };

    // Only add optional fields if they are defined
    if (process.env.TESTRAIL_TIMEOUT) {
      const timeout = parseInt(process.env.TESTRAIL_TIMEOUT, 10);
      if (!Number.isNaN(timeout)) {
        config.timeout = timeout;
      }
    }

    if (process.env.TESTRAIL_RETRIES) {
      const retries = parseInt(process.env.TESTRAIL_RETRIES, 10);
      if (!Number.isNaN(retries)) {
        config.retries = retries;
      }
    }

    if (process.env.TESTRAIL_ENABLE_LOGGING) {
      config.enableLogging = process.env.TESTRAIL_ENABLE_LOGGING === 'true';
    }

    return config;
  }

  /**
   * Create configuration with validation
   */
  static create(config: TestRailConfig): TestRailConfig {
    const manager = new ConfigManager(config);
    return manager.getConfig();
  }
}
