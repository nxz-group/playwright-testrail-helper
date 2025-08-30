import { Logger, LogLevel } from '../../../src/utils/Logger';

describe('Logger', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('constructor', () => {
    it('should create logger with context', () => {
      const logger = new Logger('TestContext');
      expect(logger).toBeInstanceOf(Logger);
    });

    it('should create logger with custom log level', () => {
      const logger = new Logger('TestContext', LogLevel.ERROR);
      expect(logger).toBeInstanceOf(Logger);
    });
  });

  describe('logging methods', () => {
    it('should log debug messages when level allows', () => {
      const logger = new Logger('TestContext', LogLevel.DEBUG);
      logger.debug('Debug message', { key: 'value' });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"level":"DEBUG"')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"context":"TestContext"')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"message":"Debug message"')
      );
    });

    it('should not log debug messages when level is higher', () => {
      const logger = new Logger('TestContext', LogLevel.INFO);
      logger.debug('Debug message');

      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should log info messages', () => {
      const logger = new Logger('TestContext', LogLevel.INFO);
      logger.info('Info message');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"level":"INFO"')
      );
    });

    it('should log warn messages', () => {
      const logger = new Logger('TestContext', LogLevel.WARN);
      logger.warn('Warning message');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"level":"WARN"')
      );
    });

    it('should log error messages', () => {
      const logger = new Logger('TestContext', LogLevel.ERROR);
      logger.error('Error message');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"level":"ERROR"')
      );
    });

    it('should include data in log output', () => {
      const logger = new Logger('TestContext');
      const testData = { userId: 123, action: 'test' };
      
      logger.info('Test message', testData);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"data":{"userId":123,"action":"test"}')
      );
    });

    it('should include timestamp in log output', () => {
      const logger = new Logger('TestContext');
      logger.info('Test message');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"timestamp":"')
      );
    });

    it('should handle error objects', () => {
      const logger = new Logger('TestContext');
      const error = new Error('Test error');
      
      logger.error('Error occurred', error);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"message":"Error occurred"')
      );
    });
  });

  describe('log levels', () => {
    it('should respect DEBUG level', () => {
      const logger = new Logger('TestContext', LogLevel.DEBUG);
      
      logger.debug('Debug');
      logger.info('Info');
      logger.warn('Warn');
      logger.error('Error');

      expect(consoleSpy).toHaveBeenCalledTimes(4);
    });

    it('should respect INFO level', () => {
      const logger = new Logger('TestContext', LogLevel.INFO);
      
      logger.debug('Debug');
      logger.info('Info');
      logger.warn('Warn');
      logger.error('Error');

      expect(consoleSpy).toHaveBeenCalledTimes(3);
    });

    it('should respect WARN level', () => {
      const logger = new Logger('TestContext', LogLevel.WARN);
      
      logger.debug('Debug');
      logger.info('Info');
      logger.warn('Warn');
      logger.error('Error');

      expect(consoleSpy).toHaveBeenCalledTimes(2);
    });

    it('should respect ERROR level', () => {
      const logger = new Logger('TestContext', LogLevel.ERROR);
      
      logger.debug('Debug');
      logger.info('Info');
      logger.warn('Warn');
      logger.error('Error');

      expect(consoleSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('JSON output format', () => {
    it('should produce valid JSON', () => {
      const logger = new Logger('TestContext');
      logger.info('Test message', { key: 'value' });

      const logOutput = consoleSpy.mock.calls[0][0];
      expect(() => JSON.parse(logOutput)).not.toThrow();
    });

    it('should include all required fields', () => {
      const logger = new Logger('TestContext');
      logger.info('Test message');

      const logOutput = consoleSpy.mock.calls[0][0];
      const parsed = JSON.parse(logOutput);

      expect(parsed).toHaveProperty('timestamp');
      expect(parsed).toHaveProperty('level', 'INFO');
      expect(parsed).toHaveProperty('context', 'TestContext');
      expect(parsed).toHaveProperty('message', 'Test message');
    });
  });
});