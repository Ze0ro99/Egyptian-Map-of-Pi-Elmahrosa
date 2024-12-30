import type { Config } from '@jest/types';
import { setupJestDom, setupGlobalMocks, setupTestEnvironment } from './tests/setup';

// Jest configuration for Egyptian Map of Pi web application
// @jest/types version: ^29.0.0
const jestConfig: Config.InitialOptions = {
  // Use jsdom environment to simulate browser environment
  testEnvironment: 'jsdom',

  // Setup files to run after environment is setup but before tests
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],

  // Module name mapper for path aliases and static assets
  moduleNameMapper: {
    // Path alias mapping
    '^@/(.*)$': '<rootDir>/src/$1',
    
    // Static asset mocks
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/__mocks__/fileMock.js',
    
    // RTL support for Arabic text testing
    '^react-dom$': '@testing-library/react-dom/rtl',
  },

  // Transform configuration for TypeScript and JavaScript files
  transform: {
    // TypeScript files
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.json',
      isolatedModules: true,
    }],
    
    // JavaScript files
    '^.+\\.(js|jsx)$': ['babel-jest', {
      presets: ['@babel/preset-env', '@babel/preset-react'],
    }],
  },

  // Test file patterns
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.[jt]sx?$',

  // File extensions to consider
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // Coverage collection configuration
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/types/**/*',
    '!src/test/**/*',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/index.{ts,tsx}',
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },

  // Global configuration for ts-jest
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.json',
      isolatedModules: true,
    },
  },

  // Test timeout configuration
  testTimeout: 10000,

  // Worker pool configuration
  maxWorkers: '50%',

  // Test environment options
  testEnvironmentOptions: {
    // Base URL for JSDOM
    url: 'http://localhost',
    
    // Enable visual testing features
    pretendToBeVisual: true,
    
    // Configure resource loading behavior
    resources: 'usable',
    
    // RTL support configuration
    defaultView: {
      document: {
        dir: 'rtl',
        documentElement: {
          dir: 'rtl',
        },
      },
    },
  },

  // Watch plugin configuration
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
  ],

  // Reporter configuration
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: 'coverage/junit',
        outputName: 'junit.xml',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true,
      },
    ],
  ],

  // Verbose output for detailed test results
  verbose: true,
};

export default jestConfig;