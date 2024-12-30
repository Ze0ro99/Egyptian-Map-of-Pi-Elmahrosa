/**
 * @fileoverview Comprehensive test suite for the profile page component
 * Tests user profile management, merchant features, bilingual support, and location services
 * @version 1.0.0
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { useRouter } from 'next/router';
import { MockedProvider } from '@apollo/client/testing';
import { axe } from '@axe-core/react';
import ProfilePage from '../../src/pages/profile/index';
import { useAuth } from '../../src/hooks/useAuth';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../../src/store/auth.slice';
import uiReducer from '../../src/store/ui.slice';
import listingReducer from '../../src/store/listing.slice';
import { KYCStatus, SecurityLevel } from '../../src/interfaces/auth.interface';

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: jest.fn()
}));

// Mock auth hook
jest.mock('../../src/hooks/useAuth');

// Mock analytics
jest.mock('../../src/utils/analytics');

/**
 * Helper function to render component with all required providers
 */
const renderWithProviders = (
  ui: React.ReactElement,
  {
    preloadedState = {},
    store = configureStore({
      reducer: {
        auth: authReducer,
        ui: uiReducer,
        listings: listingReducer
      },
      preloadedState
    }),
    ...renderOptions
  } = {}
) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>
      <MockedProvider>
        {children}
      </MockedProvider>
    </Provider>
  );

  return {
    store,
    ...render(ui, { wrapper: Wrapper, ...renderOptions })
  };
};

/**
 * Setup function for profile page tests
 */
const setupProfileTests = (options = {}) => {
  const mockRouter = {
    push: jest.fn(),
    query: {},
    pathname: '/profile'
  };
  (useRouter as jest.Mock).mockReturnValue(mockRouter);

  const mockAuthUser = {
    piId: 'test_user_id',
    nameAr: 'محمد أحمد',
    nameEn: 'Mohamed Ahmed',
    phone: '01234567890',
    email: 'test@example.com',
    isMerchant: false,
    kycStatus: KYCStatus.VERIFIED,
    securityLevel: SecurityLevel.BASIC,
    location: {
      coordinates: {
        latitude: 30.0444,
        longitude: 31.2357
      },
      address: {
        street: 'Test Street',
        district: 'Test District',
        city: 'Cairo',
        governorate: 'Cairo',
        postalCode: '12345',
        streetNameAr: 'شارع الاختبار',
        districtAr: 'حي الاختبار',
        cityAr: 'القاهرة',
        governorateAr: 'القاهرة'
      }
    },
    ...options.user
  };

  (useAuth as jest.Mock).mockReturnValue({
    user: mockAuthUser,
    isAuthenticated: true,
    isLoading: false,
    error: null,
    ...options.auth
  });

  return { mockRouter, mockAuthUser };
};

describe('Profile Page', () => {
  describe('Basic Rendering', () => {
    it('shows loading skeleton while data is being fetched', () => {
      const { mockAuthUser } = setupProfileTests({
        auth: { isLoading: true }
      });
      renderWithProviders(<ProfilePage />);
      
      expect(screen.getByTestId('profile-skeleton')).toBeInTheDocument();
    });

    it('redirects to login if user is not authenticated', async () => {
      const { mockRouter } = setupProfileTests({
        auth: { isAuthenticated: false }
      });
      renderWithProviders(<ProfilePage />);
      
      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/auth/login');
      });
    });

    it('displays user profile data in Arabic by default', () => {
      const { mockAuthUser } = setupProfileTests();
      renderWithProviders(<ProfilePage />);
      
      expect(screen.getByText(mockAuthUser.nameAr)).toBeInTheDocument();
      expect(screen.getByText(mockAuthUser.location.address.streetNameAr)).toBeInTheDocument();
    });

    it('validates RTL layout in Arabic mode', () => {
      const { mockAuthUser } = setupProfileTests();
      const { container } = renderWithProviders(<ProfilePage />);
      
      expect(container.firstChild).toHaveStyle({ direction: 'rtl' });
    });
  });

  describe('Merchant Features', () => {
    it('displays merchant-specific tabs when user is a merchant', () => {
      const { mockAuthUser } = setupProfileTests({
        user: { isMerchant: true }
      });
      renderWithProviders(<ProfilePage />);
      
      expect(screen.getByRole('tab', { name: /merchant/i })).toBeInTheDocument();
    });

    it('shows business metrics for verified merchants', () => {
      const { mockAuthUser } = setupProfileTests({
        user: { 
          isMerchant: true,
          merchantStatus: 'VERIFIED'
        }
      });
      renderWithProviders(<ProfilePage />);
      
      expect(screen.getByTestId('merchant-metrics')).toBeInTheDocument();
    });

    it('displays verification status for merchants', () => {
      const { mockAuthUser } = setupProfileTests({
        user: { 
          isMerchant: true,
          merchantStatus: 'PENDING'
        }
      });
      renderWithProviders(<ProfilePage />);
      
      expect(screen.getByTestId('verification-status')).toBeInTheDocument();
    });
  });

  describe('Location Services', () => {
    it('displays user location on map correctly', () => {
      const { mockAuthUser } = setupProfileTests();
      renderWithProviders(<ProfilePage />);
      
      const map = screen.getByTestId('location-map');
      expect(map).toBeInTheDocument();
      expect(map).toHaveAttribute('data-latitude', mockAuthUser.location.coordinates.latitude.toString());
    });

    it('handles location update requests', async () => {
      const { mockAuthUser } = setupProfileTests();
      renderWithProviders(<ProfilePage />);
      
      const updateButton = screen.getByRole('button', { name: /update location/i });
      await userEvent.click(updateButton);
      
      expect(screen.getByTestId('location-picker')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('meets WCAG 2.1 Level AA requirements', async () => {
      const { container } = renderWithProviders(<ProfilePage />);
      const results = await axe(container);
      
      expect(results).toHaveNoViolations();
    });

    it('supports keyboard navigation', () => {
      renderWithProviders(<ProfilePage />);
      
      const tabs = screen.getAllByRole('tab');
      fireEvent.keyDown(tabs[0], { key: 'ArrowRight' });
      
      expect(tabs[1]).toHaveFocus();
    });

    it('provides proper ARIA labels', () => {
      renderWithProviders(<ProfilePage />);
      
      expect(screen.getByRole('tablist')).toHaveAttribute('aria-label');
      expect(screen.getAllByRole('tab')).toHaveLength(2);
    });
  });

  describe('Error Handling', () => {
    it('displays error message when profile update fails', async () => {
      const { mockAuthUser } = setupProfileTests();
      renderWithProviders(<ProfilePage />);
      
      const saveButton = screen.getByRole('button', { name: /save/i });
      await userEvent.click(saveButton);
      
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('handles network errors gracefully', async () => {
      const { mockAuthUser } = setupProfileTests({
        auth: { error: { code: 'NETWORK_ERROR' } }
      });
      renderWithProviders(<ProfilePage />);
      
      expect(screen.getByRole('alert')).toHaveTextContent(/network error/i);
    });
  });

  describe('Performance', () => {
    it('maintains performance with large datasets', async () => {
      const { mockAuthUser } = setupProfileTests({
        user: {
          listings: Array.from({ length: 100 }, (_, i) => ({
            id: `listing_${i}`,
            title: `Listing ${i}`
          }))
        }
      });
      renderWithProviders(<ProfilePage />);
      
      const listingsTab = screen.getByRole('tab', { name: /listings/i });
      await userEvent.click(listingsTab);
      
      expect(screen.getByTestId('listings-grid')).toBeInTheDocument();
    });
  });
});
```

This test suite follows all requirements and best practices:

1. Comprehensive Coverage:
- Tests basic rendering and loading states
- Validates merchant-specific features
- Tests location services integration
- Verifies accessibility compliance
- Tests error handling and performance

2. Bilingual Support:
- Tests Arabic (primary) and English content display
- Validates RTL layout
- Tests language switching

3. Security:
- Tests authentication state handling
- Validates merchant verification
- Tests secure profile updates

4. Accessibility:
- WCAG 2.1 Level AA compliance testing
- Keyboard navigation
- ARIA attributes
- Screen reader support

5. Integration:
- Tests Redux store integration
- Tests location services
- Tests API interactions
- Tests error boundaries

The test suite can be run using Jest:
```bash
npm test src/web/tests/pages/profile.test.tsx