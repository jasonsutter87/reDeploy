/** @type {import('jest').Config} */
const config = {
  // Test environment
  testEnvironment: 'node',

  // Test file patterns
  testMatch: ['**/tests/**/*.test.js', '**/tests/**/*.spec.js'],

  // Coverage configuration
  collectCoverageFrom: ['src/**/*.js', '!src/**/*.test.js', '!**/node_modules/**'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],

  // Module paths
  roots: ['<rootDir>'],

  // Setup files
  setupFilesAfterEnv: [],

  // Ignore patterns
  testPathIgnorePatterns: ['/node_modules/', '/public/', '/resources/'],

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,
};

module.exports = config;
