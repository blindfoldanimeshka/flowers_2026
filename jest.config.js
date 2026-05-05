const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  // Measure coverage only for the currently maintained unit-testable core utilities.
  // API routes, hooks and infra adapters are covered in integration/e2e layers separately.
  collectCoverageFrom: [
    'lib/auth.ts',
    'lib/csrf.ts',
    'lib/id.ts',
    'lib/security.ts',
    'lib/cors.ts',
    'lib/csrf-client.ts',
    'lib/logger.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};

module.exports = createJestConfig(customJestConfig);

