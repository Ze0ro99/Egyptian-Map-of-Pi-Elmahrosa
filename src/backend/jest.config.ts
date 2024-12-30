// @ts-check
import type { Config } from '@jest/types';
import { pathsToModuleNameMapper } from 'ts-jest';
// @ts-expect-error - tsconfig import
import { compilerOptions } from './tsconfig.json';

/**
 * Root Jest configuration for Egyptian Map of Pi backend services
 * Version: Jest 29.6.2, ts-jest 29.1.1
 * 
 * This configuration serves as the base test setup for all microservices
 * and enforces consistent testing standards across the platform.
 */
const jestConfig: Config.InitialOptions = {
  // Use ts-jest preset for TypeScript support
  preset: 'ts-jest',

  // Set Node.js as test environment
  testEnvironment: 'node',

  // Define supported file extensions
  moduleFileExtensions: ['js', 'json', 'ts'],

  // Root directory for test discovery
  rootDir: '.',

  // Test file pattern matching
  testRegex: '.*\\.spec\\.ts$',

  // TypeScript transformation configuration
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },

  // Coverage collection configuration
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/*.config.ts',
    '!**/coverage/**',
    '!**/test/**/*.ts',
    // Exclude test utilities and mocks
    '!**/__mocks__/**',
    '!**/__fixtures__/**',
    '!**/test-utils/**',
  ],

  // Coverage output directory
  coverageDirectory: './coverage',

  // Coverage thresholds enforcement
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },

  // Paths to ignore during test discovery
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
  ],

  // Module path aliases mapping from tsconfig
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, {
    prefix: '<rootDir>/',
  }),

  // Global test timeout (30 seconds)
  testTimeout: 30000,

  // Test setup files
  setupFilesAfterEnv: [
    '<rootDir>/test/jest.setup.ts'
  ],

  // Global setup and teardown
  globalSetup: '<rootDir>/test/global.setup.ts',
  globalTeardown: '<rootDir>/test/global.teardown.ts',

  // Verbose test output
  verbose: true,

  // Clear mock calls between tests
  clearMocks: true,

  // Detect memory leaks
  detectLeaks: true,

  // Maximum number of concurrent workers
  maxWorkers: '50%',

  // Error handling
  bail: 0,
  errorOnDeprecated: true,

  // Test results processor
  testResultsProcessor: 'jest-sonar-reporter',

  // Reporter configuration
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: './reports/junit',
        outputName: 'junit.xml',
        classNameTemplate: '{filepath}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
      },
    ],
  ],
};

export default jestConfig;