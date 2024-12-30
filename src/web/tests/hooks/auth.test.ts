/**
 * @fileoverview Comprehensive test suite for useAuth hook with enhanced security features
 * @version 1.0.0
 */

import { renderHook, act } from '@testing-library/react-hooks'; // ^8.0.1
import { Provider } from 'react-redux'; // ^8.1.0
import { configureStore } from '@reduxjs/toolkit'; // ^1.9.0
import { describe, beforeEach, test, expect, jest } from '@jest/globals'; // ^29.0.0

import { useAuth } from '../../src/hooks/useAuth';
import { authApi } from '../../src/api/auth.api';
import { SecurityLevel, KYCStatus } from '../../src/interfaces/auth.interface';
import { EgyptianMarketStatus } from '../../src/store/auth.slice';
import { ErrorCodes } from '../../../backend/shared/constants/error-codes';

// Mock Pi Network SDK
jest.mock('@pi-network/sdk', () => ({
  PiNetwork: jest.fn().mockImplementation(() => ({
    authenticate: jest.fn(),
    getUser: jest.fn()
  }))
}));

// Mock auth API
jest.mock('../../src/api/auth.api', () => ({
  authApi: {
    authenticate: jest.fn(),
    verifyKYC: jest.fn(),
    checkKYCStatus: jest.fn(),
    refreshToken: jest.fn(),
    validateEgyptianMarket: jest.fn()
  }
}));

describe('useAuth hook', () => {
  // Test store setup with enhanced security context
  const createTestStore = () => configureStore({
    reducer: {
      auth: (state = {
        user: null,
        isAuthenticated: false,
        loading: false,
        error: null,
        marketStatus: EgyptianMarketStatus.PENDING,
        securityLevel: SecurityLevel.BASIC,
        lastLoginTimestamp: 0,
        deviceId: null
      }, action) => state
    }
  });

  // Enhanced test wrapper with security context
  const wrapper = ({ children }) => (
    <Provider store={createTestStore()}>{children}</Provider>
  );

  beforeEach(() => {
    // Clear all mocks including security contexts
    jest.clearAllMocks();
  });

  test('initial state should reflect security and market requirements', () => {
    // Render hook with enhanced test wrapper
    const { result } = renderHook(() => useAuth(), { wrapper });

    // Verify initial state with security context
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.securityLevel).toBe(SecurityLevel.BASIC);
    expect(result.current.marketStatus).toBe(EgyptianMarketStatus.PENDING);
  });

  test('successful login should update auth state with market validation', async () => {
    // Mock successful Pi Network authentication
    const mockPiUser = {
      uid: 'test_pi_id',
      accessToken: 'test_access_token'
    };

    // Mock successful API authentication with security level
    const mockAuthUser = {
      piId: 'test_pi_id',
      accessToken: 'test_access_token',
      refreshToken: 'test_refresh_token',
      kycStatus: KYCStatus.PENDING,
      securityLevel: SecurityLevel.BASIC,
      isActive: true,
      roles: ['user']
    };

    // Mock successful market validation
    (authApi.validateEgyptianMarket as jest.Mock).mockResolvedValue(true);
    (authApi.authenticate as jest.Mock).mockResolvedValue(mockAuthUser);

    const { result } = renderHook(() => useAuth(), { wrapper });

    // Perform login with enhanced security
    await act(async () => {
      await result.current.login();
    });

    // Verify auth state with security context
    expect(result.current.user).toEqual(mockAuthUser);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.securityLevel).toBe(SecurityLevel.BASIC);
    expect(result.current.marketStatus).toBe(EgyptianMarketStatus.ELIGIBLE);
  });

  test('failed login should handle errors with bilingual support', async () => {
    // Mock authentication failure
    (authApi.authenticate as jest.Mock).mockRejectedValue(new Error('AUTH_INVALID_CREDENTIALS'));

    const { result } = renderHook(() => useAuth(), { wrapper });

    // Attempt login
    await act(async () => {
      try {
        await result.current.login();
      } catch (error) {
        expect(error.message).toContain('Invalid username or password');
      }
    });

    // Verify error state
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.error).toBeTruthy();
  });

  test('KYC verification should update security level', async () => {
    // Mock successful KYC verification
    (authApi.verifyKYC as jest.Mock).mockResolvedValue({ status: KYCStatus.VERIFIED });

    const { result } = renderHook(() => useAuth(), { wrapper });

    // Perform KYC verification
    await act(async () => {
      await result.current.verifyKYC();
    });

    // Verify security level update
    expect(result.current.securityLevel).toBe(SecurityLevel.ENHANCED);
  });

  test('market validation should update eligibility status', async () => {
    // Mock market validation check
    (authApi.validateEgyptianMarket as jest.Mock).mockResolvedValue(true);

    const { result } = renderHook(() => useAuth(), { wrapper });

    // Validate market access
    await act(async () => {
      await result.current.validateMarketAccess();
    });

    // Verify market status
    expect(result.current.marketStatus).toBe(EgyptianMarketStatus.ELIGIBLE);
  });

  test('token refresh should maintain authentication state', async () => {
    // Mock successful token refresh
    const mockNewTokens = {
      accessToken: 'new_access_token',
      refreshToken: 'new_refresh_token'
    };
    (authApi.refreshToken as jest.Mock).mockResolvedValue(mockNewTokens);

    const { result } = renderHook(() => useAuth(), { wrapper });

    // Refresh tokens
    await act(async () => {
      await result.current.refreshToken();
    });

    // Verify token update
    expect(result.current.user?.accessToken).toBe(mockNewTokens.accessToken);
  });

  test('logout should clear auth state and security context', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    // Perform logout
    await act(async () => {
      result.current.logout();
    });

    // Verify cleared state
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.securityLevel).toBe(SecurityLevel.BASIC);
    expect(result.current.marketStatus).toBe(EgyptianMarketStatus.PENDING);
  });
});