/**
 * Jest test setup file
 */

// Global test timeout
jest.setTimeout(10000);

// Mock console methods to reduce noise in tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  // Suppress console.error and console.warn during tests unless explicitly needed
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  // Restore original console methods
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Custom Jest matchers
expect.extend({
  toBeValidTimestamp(received: string) {
    const isValid = !isNaN(Date.parse(received));
    return {
      message: () => `expected ${received} to be a valid timestamp`,
      pass: isValid,
    };
  },
});