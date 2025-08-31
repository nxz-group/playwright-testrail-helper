/**
 * Custom error class for TestRail operations
 */
export declare class TestRailError extends Error {
  statusCode?: number | undefined;
  constructor(message: string, statusCode?: number | undefined);
}
/**
 * Error thrown when required environment variables are missing
 */
export declare class ConfigurationError extends Error {
  constructor(message: string);
}
/**
 * Error thrown when TestRail API calls fail
 */
export declare class APIError extends Error {
  statusCode: number;
  response?: any | undefined;
  constructor(message: string, statusCode: number, response?: any | undefined);
}
