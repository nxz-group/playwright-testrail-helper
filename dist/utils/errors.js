Object.defineProperty(exports, "__esModule", { value: true });
exports.APIError = exports.ConfigurationError = exports.TestRailError = void 0;
/**
 * Custom error class for TestRail operations
 */
class TestRailError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.name = "TestRailError";
  }
}
exports.TestRailError = TestRailError;
/**
 * Error thrown when required environment variables are missing
 */
class ConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ConfigurationError";
  }
}
exports.ConfigurationError = ConfigurationError;
/**
 * Error thrown when TestRail API calls fail
 */
class APIError extends Error {
  constructor(message, statusCode, response) {
    super(message);
    this.statusCode = statusCode;
    this.response = response;
    this.name = "APIError";
  }
}
exports.APIError = APIError;
