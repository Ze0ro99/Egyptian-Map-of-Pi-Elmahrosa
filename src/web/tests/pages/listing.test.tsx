/**
 * @fileoverview Comprehensive test suite for marketplace listings page component
 * Focuses on Egyptian market requirements with bilingual support and RTL layout
 * @version 1.0.0
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { setupServer } from 'msw/node';
import { rest } from 'msw';

import ListingsPage from '../../src/pages/listings';
import { ListingStatus, ListingCategory } from '../../src/interfaces/listing.interface';

// Mock service worker for API requests
const server = setupServer(
  // Mock listings endpoint
  rest.get('/api/v1/listings', (req, res, ctx) => {
    return res(
      ctx.json({
        data: mockListings,
        total: mockListings.length,
        page: 1,
        limit: 20
      })
    );
  })
);

// Mock listings data with Egyptian market context
const mockListings = [
  {
    id: '1',
    titleAr: 'هاتف آيفون ١٣ برو',
    titleEn: 'iPhone 13 Pro',
    price: 1200,
    priceEGP: 180000,
    images: ['iphone-image.jpg'],
    location: {
      coordinates: {
        latitude: 30.0444,
        longitude: 31.2357
      },
      address: {
        city: 'Cairo',
        cityAr: 'القاهرة',
        governorate: 'Cairo',
        governorateAr: 'القاهرة'
      }
    },
    category: ListingCategory.ELECTRONICS,
    status: ListingStatus.ACTIVE,
    merchantVerificationStatus: 'VERIFIED'
  }
];

// Mock hooks and providers
jest.mock('../../src/hooks/useListings', () => ({
  useListings: () => ({
    listings: mockListings,
    loading: false,
    error: null,
    totalItems: mockListings.length,
    currentPage: 1,
    setFilter: jest.fn(),
    fetchListings: jest.fn()
  })
}));

describe('ListingsPage', () => {
  beforeEach(() => {
    server.listen();
  });

  afterEach(() => {
    server.close();
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render listings in a grid layout with RTL support', () => {
      render(<ListingsPage initialFilter={{ page: 1 }} />);
      
      const grid = screen.getByRole('grid');
      expect(grid).toHaveAttribute('dir', 'rtl');
      expect(grid).toBeInTheDocument();
    });

    it('should display loading skeletons while fetching data', () => {
      const { container } = render(<ListingsPage initialFilter={{ page: 1 }} />);
      const skeletons = container.querySelectorAll('.MuiSkeleton-root');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should display error message in Arabic when API fails', async () => {
      server.use(
        rest.get('/api/v1/listings', (req, res, ctx) => {
          return res(ctx.status(500));
        })
      );

      render(<ListingsPage initialFilter={{ page: 1 }} />);
      
      const errorMessage = await screen.findByText(/حدث خطأ في تحميل القوائم/i);
      expect(errorMessage).toBeInTheDocument();
    });

    it('should display empty state message in Arabic when no listings', () => {
      server.use(
        rest.get('/api/v1/listings', (req, res, ctx) => {
          return res(ctx.json({ data: [], total: 0, page: 1, limit: 20 }));
        })
      );

      render(<ListingsPage initialFilter={{ page: 1 }} />);
      
      const emptyMessage = screen.getByText(/لا توجد قوائم متاحة/i);
      expect(emptyMessage).toBeInTheDocument();
    });
  });

  describe('Localization', () => {
    it('should display listing titles in Arabic by default', () => {
      render(<ListingsPage initialFilter={{ page: 1 }} />);
      
      const title = screen.getByText('هاتف آيفون ١٣ برو');
      expect(title).toBeInTheDocument();
    });

    it('should switch listing content to English when language changed', async () => {
      render(<ListingsPage initialFilter={{ page: 1 }} />);
      
      const languageButton = screen.getByLabelText(/change language/i);
      fireEvent.click(languageButton);
      
      const englishOption = screen.getByText('English');
      fireEvent.click(englishOption);
      
      const title = await screen.findByText('iPhone 13 Pro');
      expect(title).toBeInTheDocument();
    });

    it('should format prices in Arabic numerals with Pi symbol', () => {
      render(<ListingsPage initialFilter={{ page: 1 }} />);
      
      const price = screen.getByText(/١٢٠٠ π/);
      expect(price).toBeInTheDocument();
    });

    it('should display Egyptian pound equivalent with proper formatting', () => {
      render(<ListingsPage initialFilter={{ page: 1 }} />);
      
      const egpPrice = screen.getByText(/١٨٠٬٠٠٠ ج.م/);
      expect(egpPrice).toBeInTheDocument();
    });
  });

  describe('Interaction', () => {
    it('should navigate to listing detail when card is clicked', async () => {
      const mockRouter = { push: jest.fn() };
      jest.mock('next/router', () => ({
        useRouter: () => mockRouter
      }));

      render(<ListingsPage initialFilter={{ page: 1 }} />);
      
      const listingCard = screen.getByText('هاتف آيفون ١٣ برو').closest('div');
      fireEvent.click(listingCard);
      
      expect(mockRouter.push).toHaveBeenCalledWith('/listings/1');
    });

    it('should update filters when location is changed', async () => {
      const setFilter = jest.fn();
      jest.mock('../../src/hooks/useListings', () => ({
        useListings: () => ({
          ...jest.requireActual('../../src/hooks/useListings').useListings(),
          setFilter
        })
      }));

      render(<ListingsPage initialFilter={{ page: 1 }} />);
      
      const locationButton = screen.getByLabelText(/select location/i);
      fireEvent.click(locationButton);
      
      const cairoOption = screen.getByText('القاهرة');
      fireEvent.click(cairoOption);
      
      expect(setFilter).toHaveBeenCalledWith(expect.objectContaining({
        governorate: 'Cairo'
      }));
    });

    it('should handle pagination with RTL support', async () => {
      const setFilter = jest.fn();
      render(<ListingsPage initialFilter={{ page: 1 }} />);
      
      const nextPageButton = screen.getByLabelText(/next page/i);
      fireEvent.click(nextPageButton);
      
      expect(setFilter).toHaveBeenCalledWith(expect.objectContaining({
        page: 2
      }));
    });

    it('should apply category filters with Arabic labels', async () => {
      const setFilter = jest.fn();
      render(<ListingsPage initialFilter={{ page: 1 }} />);
      
      const filterButton = screen.getByLabelText(/filter/i);
      fireEvent.click(filterButton);
      
      const categoryOption = screen.getByText('الإلكترونيات');
      fireEvent.click(categoryOption);
      
      expect(setFilter).toHaveBeenCalledWith(expect.objectContaining({
        category: ListingCategory.ELECTRONICS
      }));
    });
  });
});