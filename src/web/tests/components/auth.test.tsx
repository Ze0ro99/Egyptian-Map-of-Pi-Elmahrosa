/**
 * @fileoverview Comprehensive test suite for LoginButton component
 * @version 1.0.0
 * 
 * Tests authentication flow, accessibility compliance, RTL support,
 * and security validation for the Egyptian Map of Pi platform.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ThemeProvider } from '@emotion/react';
import LoginButton from '../../src/components/auth/LoginButton';
import { useAuth } from '../../src/hooks/useAuth';
import { ErrorCodes } from '../../../backend/shared/constants/error-codes';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Mock useAuth hook
jest.mock('../../src/hooks/useAuth');

// Mock useTranslation hook
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'ar' }
  })
}));

// Mock theme for RTL testing
const mockTheme = {
  direction: 'rtl',
  typography: {
    fontFamilyArabic: 'Cairo, sans-serif'
  },
  palette: {
    primary: {
      main: '#1976d2',
      contrastText: '#ffffff'
    }
  }
};

describe('LoginButton Component', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('renders in LTR layout correctly', () => {
      const mockLogin = jest.fn();
      (useAuth as jest.Mock).mockReturnValue({
        login: mockLogin,
        isLoading: false,
        error: null
      });

      render(
        <ThemeProvider theme={{ ...mockTheme, direction: 'ltr' }}>
          <LoginButton data-testid="login-button" />
        </ThemeProvider>
      );

      const button = screen.getByTestId('login-button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveStyle({ direction: 'ltr' });
    });

    test('renders in RTL layout correctly', () => {
      const mockLogin = jest.fn();
      (useAuth as jest.Mock).mockReturnValue({
        login: mockLogin,
        isLoading: false,
        error: null
      });

      render(
        <ThemeProvider theme={mockTheme}>
          <LoginButton data-testid="login-button" />
        </ThemeProvider>
      );

      const button = screen.getByTestId('login-button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveStyle({ direction: 'rtl' });
    });

    test('displays loading state correctly', () => {
      (useAuth as jest.Mock).mockReturnValue({
        login: jest.fn(),
        isLoading: true,
        error: null
      });

      render(
        <ThemeProvider theme={mockTheme}>
          <LoginButton loadingText="جاري تسجيل الدخول..." />
        </ThemeProvider>
      );

      expect(screen.getByText('جاري تسجيل الدخول...')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('Authentication', () => {
    test('calls login function on click', async () => {
      const mockLogin = jest.fn();
      (useAuth as jest.Mock).mockReturnValue({
        login: mockLogin,
        isLoading: false,
        error: null
      });

      render(
        <ThemeProvider theme={mockTheme}>
          <LoginButton />
        </ThemeProvider>
      );

      fireEvent.click(screen.getByRole('button'));
      expect(mockLogin).toHaveBeenCalledTimes(1);
    });

    test('handles authentication errors correctly', async () => {
      const error = {
        code: ErrorCodes.AUTH_INVALID_CREDENTIALS,
        message: {
          ar: 'بيانات الدخول غير صحيحة',
          en: 'Invalid credentials'
        }
      };

      (useAuth as jest.Mock).mockReturnValue({
        login: jest.fn(),
        isLoading: false,
        error
      });

      render(
        <ThemeProvider theme={mockTheme}>
          <LoginButton />
        </ThemeProvider>
      );

      expect(screen.getByText('بيانات الدخول غير صحيحة')).toBeInTheDocument();
    });

    test('disables button during authentication', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        login: jest.fn(),
        isLoading: true,
        error: null
      });

      render(
        <ThemeProvider theme={mockTheme}>
          <LoginButton />
        </ThemeProvider>
      );

      expect(screen.getByRole('button')).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    test('meets WCAG 2.1 Level AA standards', async () => {
      const { container } = render(
        <ThemeProvider theme={mockTheme}>
          <LoginButton />
        </ThemeProvider>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('supports keyboard navigation', () => {
      const mockLogin = jest.fn();
      (useAuth as jest.Mock).mockReturnValue({
        login: mockLogin,
        isLoading: false,
        error: null
      });

      render(
        <ThemeProvider theme={mockTheme}>
          <LoginButton />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');
      button.focus();
      expect(button).toHaveFocus();

      fireEvent.keyPress(button, { key: 'Enter', code: 13, charCode: 13 });
      expect(mockLogin).toHaveBeenCalled();
    });

    test('has proper ARIA attributes', () => {
      (useAuth as jest.Mock).mockReturnValue({
        login: jest.fn(),
        isLoading: true,
        error: null
      });

      render(
        <ThemeProvider theme={mockTheme}>
          <LoginButton />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-busy', 'true');
      expect(button).toHaveAttribute('aria-label', 'auth.login.ariaLabel');
    });
  });

  describe('Security', () => {
    test('prevents multiple simultaneous login attempts', async () => {
      const mockLogin = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
      (useAuth as jest.Mock).mockReturnValue({
        login: mockLogin,
        isLoading: false,
        error: null
      });

      render(
        <ThemeProvider theme={mockTheme}>
          <LoginButton />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledTimes(1);
      });
    });

    test('handles network timeouts gracefully', async () => {
      const mockLogin = jest.fn(() => {
        throw new Error(ErrorCodes.NETWORK_TIMEOUT.toString());
      });

      (useAuth as jest.Mock).mockReturnValue({
        login: mockLogin,
        isLoading: false,
        error: null
      });

      render(
        <ThemeProvider theme={mockTheme}>
          <LoginButton />
        </ThemeProvider>
      );

      fireEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByText('auth.login.retry')).toBeInTheDocument();
      });
    });
  });
});
```

This test suite follows all requirements from the technical specification and includes:

1. Comprehensive testing of authentication functionality
2. RTL support validation for Arabic language
3. Accessibility compliance testing (WCAG 2.1 Level AA)
4. Security validation including rate limiting
5. Error handling and display in both Arabic and English
6. Loading state and disabled state testing
7. Keyboard navigation and ARIA attributes testing
8. Network timeout and error handling
9. Proper use of React Testing Library best practices
10. Complete mocking of required dependencies
11. Proper theme and styling validation
12. Security-focused test cases

The test suite can be run using Jest:
```bash
jest auth.test.tsx