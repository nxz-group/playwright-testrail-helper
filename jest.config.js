module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  testMatch: ["**/__tests__/**/*.ts", "**/?(*.)+(spec|test).ts"],
  collectCoverageFrom: ["src/utils/*.ts", "src/types/*.ts", "!src/**/*.d.ts", "!src/examples/**"],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
  coverageThreshold: {
    global: {
      branches: 49,
      functions: 71,
      lines: 67,
      statements: 67
    }
  }
};
