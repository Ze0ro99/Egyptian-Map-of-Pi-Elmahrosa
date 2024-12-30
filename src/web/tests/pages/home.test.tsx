/**
 * @fileoverview Comprehensive test suite for the home page component
 * Verifies core functionality, accessibility, responsiveness, and cultural adaptations
 * @version 1.0.0
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { axe, toHaveNoViolations } from 'jest-axe';
import mediaQuery from 'css-mediaquery';
import HomePage from '../../src/pages/index';
import { useListings } from '../../src/hooks/useListings';
import { useAuth } from '../../src/hooks/useAuth';
import { useTheme } from '../../src/hooks/useTheme';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Mock hooks
jest.mock('../../src/hooks/useListings');
jest.mock('../../src/hooks/useAuth');
jest.mock('../../src/hooks/useTheme');
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    pathname: '/'
  })
}));

// Mock listings data
const mockListings = [
  {
    id: '1',
    titleAr: 'منتج تجريبي ١',
    titleEn: 'Test Product 1',
    price: 100,
    location: {
      coordinates: { latitude: 30.0444, longitude: 31.2357 },
      address: { city: 'Cairo', cityAr: 'القاهرة' }
    },
    images: ['test-image-1.jpg'],
    merchantVerificationStatus: 'VERIFIED'
  },
  // Add more mock listings as needed
];

// Helper function to create test store
const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      auth: () => ({ isAuthenticated: false }),
      ui: () => ({ theme: 'light', language: 'ar' }),
      // Add other reducers as needed
    },
    preloadedState: initialState
  });
};

// Helper function to create a custom render with providers
const renderWithProviders = (ui: React.ReactElement, { initialState = {}, ...options } = {}) => {
  const store = createTestStore(initialState);
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  return render(ui, { wrapper: Wrapper, ...options });
};

describe('HomePage', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock useListings hook
    (useListings as jest.Mock).mockReturnValue({
      listings: mockListings,
      loading: false,
      error: null,
      totalItems: mockListings.length,
      filter: { page: 1 },
      setFilter: jest.fn(),
      fetchListings: jest.fn()
    });

    // Mock useAuth hook
    (useAuth as jest.Mock).mockReturnValue({
      isAuthenticated: false,
      user: null
    });

    // Mock useTheme hook
    (useTheme as jest.Mock).mockReturnValue({
      theme: { direction: 'rtl' },
      mode: 'light'
    });
  });

  it('renders loading state correctly', async () => {
    // Mock loading state
    (useListings as jest.Mock).mockReturnValue({
      listings: [],
      loading: true,
      error: null,
      totalItems: 0,
      filter: { page: 1 },
      setFilter: jest.fn(),
      fetchListings: jest.fn()
    });

    renderWithProviders(<HomePage />);

    // Verify loading indicators
    expect(screen.getByTestId('home-categories')).toBeInTheDocument();
    expect(screen.getAllByRole('progressbar')).toHaveLength(2); // Categories and listings skeletons
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
  });

  it('handles location-based filtering', async () => {
    const setFilter = jest.fn();
    (useListings as jest.Mock).mockReturnValue({
      listings: mockListings,
      loading: false,
      error: null,
      totalItems: mockListings.length,
      filter: { page: 1 },
      setFilter,
      fetchListings: jest.fn()
    });

    renderWithProviders(<HomePage />);

    // Verify location filter is applied
    const locationFilter = screen.getByRole('button', { name: /location/i });
    fireEvent.click(locationFilter);

    await waitFor(() => {
      expect(setFilter).toHaveBeenCalledWith(expect.objectContaining({
        location: expect.any(Object)
      }));
    });
  });

  it('meets accessibility requirements', async () => {
    const { container } = renderWithProviders(<HomePage />);

    // Run axe accessibility tests
    const results = await axe(container);
    expect(results).toHaveNoViolations();

    // Verify ARIA landmarks
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('navigation')).toBeInTheDocument();

    // Verify keyboard navigation
    const firstListingCard = screen.getAllByRole('article')[0];
    firstListingCard.focus();
    expect(document.activeElement).toBe(firstListingCard);
  });

  it('adapts to responsive breakpoints', async () => {
    // Mock different screen sizes
    const breakpoints = [
      { width: 320, name: 'mobile' },
      { width: 768, name: 'tablet' },
      { width: 1024, name: 'desktop' }
    ];

    for (const breakpoint of breakpoints) {
      // Update viewport size
      Object.defineProperty(window, 'matchMedia', {
        value: (query: string) => ({
          matches: mediaQuery.match(query, { width: breakpoint.width }),
          addListener: jest.fn(),
          removeListener: jest.fn()
        })
      });

      renderWithProviders(<HomePage />);

      // Verify responsive layout
      const container = screen.getByRole('main');
      const style = window.getComputedStyle(container);

      if (breakpoint.width <= 428) {
        expect(style.paddingBottom).toBe('56px'); // Space for mobile navigation
      } else {
        expect(style.paddingBottom).toBe('0px');
      }

      // Cleanup
      cleanup();
    }
  });

  it('supports RTL layout and Arabic content', () => {
    renderWithProviders(<HomePage />);

    // Verify RTL layout
    const mainContainer = screen.getByRole('main');
    expect(mainContainer).toHaveStyle({ direction: 'rtl' });

    // Verify Arabic content
    const categoryTitles = screen.getAllByRole('heading');
    expect(categoryTitles[0]).toHaveTextContent(/التصنيفات/i);

    // Verify Arabic listing titles
    const listingCards = screen.getAllByRole('article');
    expect(within(listingCards[0]).getByText('منتج تجريبي ١')).toBeInTheDocument();
  });

  it('handles favorite listings correctly', async () => {
    const onFavoriteClick = jest.fn();
    renderWithProviders(<HomePage />);

    const favoriteButtons = screen.getAllByRole('button', { name: /favorite/i });
    fireEvent.click(favoriteButtons[0]);

    await waitFor(() => {
      expect(onFavoriteClick).toHaveBeenCalledWith(mockListings[0].id);
    });
  });

  it('navigates to listing details on card click', async () => {
    const router = require('next/router').useRouter();
    renderWithProviders(<HomePage />);

    const listingCards = screen.getAllByRole('article');
    fireEvent.click(listingCards[0]);

    await waitFor(() => {
      expect(router.push).toHaveBeenCalledWith(`/listings/${mockListings[0].id}`);
    });
  });
});