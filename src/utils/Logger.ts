export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

/**
 * Structured logging utility for TestRail operations
 */
export class Logger {
  private context: string;
  private logLevel: LogLevel;

  constructor(context: string, logLevel: LogLevel = LogLevel.INFO) {
    this.context = context;
    this.logLevel = logLevel;
  }

  debug(message: string, data?: unknown): void {
    if (this.logLevel <= LogLevel.DEBUG) {
      this.log('DEBUG', message, data);
    }
  }

  info(message: string, data?: unknown): void {
    if (this.logLevel <= LogLevel.INFO) {
      this.log('INFO', message, data);
    }
  }

  warn(message: string, data?: unknown): void {
    if (this.logLevel <= LogLevel.WARN) {
      this.log('WARN', message, data);
    }
  }

  error(message: string, error?: unknown): void {
    if (this.logLevel <= LogLevel.ERROR) {
      this.log('ERROR', message, error);
    }
  }

  private log(level: string, message: string, data?: unknown): void {
    const timestamp = new Date().toISOString();
    const logEntry: Record<string, unknown> = {
      timestamp,
      level,
      context: this.context,
      message
    };

    if (data !== undefined) {
      logEntry.data = data;
    }

    console.log(JSON.stringify(logEntry));
  }
}