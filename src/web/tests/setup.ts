// @testing-library/jest-dom version: ^5.16.5
import '@testing-library/jest-dom';
// jest-environment-jsdom version: ^29.0.0
import 'jest-environment-jsdom';
// @testing-library/react version: ^14.0.0
import { cleanup } from '@testing-library/react';
// @jest/globals version: ^29.0.0
import { jest } from '@jest/globals';

/**
 * Configures and extends Jest with DOM testing utilities and custom matchers
 */
export function setupJestDom(): void {
  // Extend Jest matchers with DOM-specific assertions
  expect.extend({
    toBeAccessible: (element) => ({
      message: () => 'expected element to be accessible',
      pass: !element.querySelector('[role="presentation"]'),
    }),
    toHaveValidAriaLabels: (element) => ({
      message: () => 'expected element to have valid ARIA labels',
      pass: Boolean(element.getAttribute('aria-label') || element.getAttribute('aria-labelledby')),
    }),
  });

  // Configure automatic cleanup after each test
  afterEach(() => {
    cleanup();
  });
}

/**
 * Implements comprehensive mocks for browser APIs and Pi Network functionality
 */
export function setupGlobalMocks(): void {
  // Mock window.matchMedia
  window.matchMedia = jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));

  // Mock ResizeObserver
  global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));

  // Mock Pi Network API
  global.piNetwork = {
    authenticate: jest.fn().mockResolvedValue({ accessToken: 'mock-token' }),
    createPayment: jest.fn().mockResolvedValue({ paymentId: 'mock-payment' }),
    onPaymentComplete: jest.fn(),
    getUserProfile: jest.fn().mockResolvedValue({ username: 'test-user' }),
  };

  // Mock fetch API
  global.fetch = jest.fn().mockImplementation(() => 
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(''),
      blob: () => Promise.resolve(new Blob()),
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
      headers: new Headers(),
      status: 200,
      statusText: 'OK',
    })
  );

  // Mock IntersectionObserver
  global.IntersectionObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));

  // Mock Storage APIs
  const mockStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
    key: jest.fn(),
    length: 0,
  };
  Object.defineProperty(window, 'localStorage', { value: mockStorage });
  Object.defineProperty(window, 'sessionStorage', { value: mockStorage });

  // Mock Geolocation API
  const mockGeolocation = {
    getCurrentPosition: jest.fn().mockImplementation(success => 
      success({
        coords: {
          latitude: 30.0444,  // Cairo coordinates
          longitude: 31.2357,
          accuracy: 10,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      })
    ),
    watchPosition: jest.fn(),
    clearWatch: jest.fn(),
  };
  Object.defineProperty(global.navigator, 'geolocation', { value: mockGeolocation });

  // Mock WebSocket
  global.WebSocket = jest.fn().mockImplementation(() => ({
    send: jest.fn(),
    close: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    readyState: WebSocket.CONNECTING,
  }));
}

/**
 * Establishes comprehensive test environment configuration and protocols
 */
export function setupTestEnvironment(): void {
  // Configure test timeouts
  jest.setTimeout(10000);

  // Use modern fake timers
  jest.useFakeTimers({
    doNotFake: ['nextTick', 'setImmediate'],
    now: Date.now(),
  });

  // Set up error boundary handling
  const originalError = console.error;
  console.error = (...args) => {
    if (/Warning.*not wrapped in act/.test(args[0])) {
      return;
    }
    originalError.call(console, ...args);
  };

  // Configure memory leak detection
  const originalWarn = console.warn;
  console.warn = (...args) => {
    if (/Warning.*memory leak/.test(args[0])) {
      throw new Error('Memory leak detected');
    }
    originalWarn.call(console, ...args);
  };

  // Set up performance monitoring
  if (!window.performance) {
    window.performance = {
      mark: jest.fn(),
      measure: jest.fn(),
      getEntriesByType: jest.fn().mockReturnValue([]),
      clearMarks: jest.fn(),
      clearMeasures: jest.fn(),
    } as unknown as Performance;
  }

  // Configure internationalization testing
  if (!global.Intl) {
    global.Intl = require('intl');
  }

  // Set up security testing protocols
  Object.defineProperty(window, 'crypto', {
    value: {
      subtle: {
        digest: jest.fn().mockResolvedValue(new ArrayBuffer(32)),
        encrypt: jest.fn().mockResolvedValue(new ArrayBuffer(32)),
        decrypt: jest.fn().mockResolvedValue(new ArrayBuffer(32)),
      },
      getRandomValues: jest.fn().mockImplementation(arr => {
        return arr.map(() => Math.floor(Math.random() * 256));
      }),
    },
  });
}

// Initialize all setup functions
setupJestDom();
setupGlobalMocks();
setupTestEnvironment();