/**
 * @fileoverview Comprehensive test suite for marketplace listing components
 * Tests rendering, interactions, responsiveness, accessibility, and bilingual content
 * @version 1.0.0
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import ListingCard from '../../src/components/listing/ListingCard';
import ListingGrid from '../../src/components/listing/ListingGrid';
import ListingForm from '../../src/components/listing/ListingForm';
import { Listing, ListingCategory } from '../../src/interfaces/listing.interface';

// Mock data for testing
const mockListing: Listing = {
  id: 'test-listing-1',
  titleAr: 'هاتف آيفون ١٣ برو',
  titleEn: 'iPhone 13 Pro',
  descriptionAr: 'هاتف ذكي بحالة ممتازة',
  descriptionEn: 'Smartphone in excellent condition',
  category: ListingCategory.ELECTRONICS,
  price: 1200,
  priceEGP: 180000,
  images: ['https://cdn.egyptianmapofpi.com/test-image.jpg'],
  location: {
    id: 'loc-1',
    coordinates: {
      latitude: 30.0444,
      longitude: 31.2357
    },
    address: {
      street: 'Tahrir Square',
      district: 'Downtown',
      city: 'Cairo',
      governorate: 'Cairo',
      postalCode: '11511',
      streetNameAr: 'ميدان التحرير',
      districtAr: 'وسط البلد',
      cityAr: 'القاهرة',
      governorateAr: 'القاهرة'
    },
    type: 'STORE',
    isVerified: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  status: 'ACTIVE',
  views: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  tags: ['electronics', 'mobile']
};

// Test utilities
const renderWithProviders = (ui: React.ReactElement, { rtl = true } = {}) => {
  return render(
    <div dir={rtl ? 'rtl' : 'ltr'}>
      {ui}
    </div>
  );
};

describe('ListingCard', () => {
  const mockHandlers = {
    onClick: vi.fn(),
    onFavoriteClick: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Arabic content correctly in RTL mode', () => {
    renderWithProviders(
      <ListingCard
        listing={mockListing}
        onClick={mockHandlers.onClick}
        onFavoriteClick={mockHandlers.onFavoriteClick}
        isFavorite={false}
        isRTL={true}
      />
    );

    expect(screen.getByText(mockListing.titleAr)).toBeInTheDocument();
    expect(screen.getByText(mockListing.location.address.cityAr)).toBeInTheDocument();
  });

  it('renders English content correctly in LTR mode', () => {
    renderWithProviders(
      <ListingCard
        listing={mockListing}
        onClick={mockHandlers.onClick}
        onFavoriteClick={mockHandlers.onFavoriteClick}
        isFavorite={false}
        isRTL={false}
      />,
      { rtl: false }
    );

    expect(screen.getByText(mockListing.titleEn)).toBeInTheDocument();
    expect(screen.getByText(mockListing.location.address.city)).toBeInTheDocument();
  });

  it('handles favorite button click correctly', async () => {
    renderWithProviders(
      <ListingCard
        listing={mockListing}
        onClick={mockHandlers.onClick}
        onFavoriteClick={mockHandlers.onFavoriteClick}
        isFavorite={false}
        isRTL={true}
      />
    );

    const favoriteButton = screen.getByLabelText(/favorite/i);
    await userEvent.click(favoriteButton);

    expect(mockHandlers.onFavoriteClick).toHaveBeenCalledTimes(1);
    expect(mockHandlers.onClick).not.toHaveBeenCalled();
  });

  it('displays correct price in Pi with EGP equivalent', () => {
    renderWithProviders(
      <ListingCard
        listing={mockListing}
        onClick={mockHandlers.onClick}
        onFavoriteClick={mockHandlers.onFavoriteClick}
        isFavorite={false}
        isRTL={true}
      />
    );

    expect(screen.getByText(/1,200/)).toBeInTheDocument(); // Pi price
    expect(screen.getByText(/180,000/)).toBeInTheDocument(); // EGP equivalent
  });

  it('meets accessibility requirements', async () => {
    const { container } = renderWithProviders(
      <ListingCard
        listing={mockListing}
        onClick={mockHandlers.onClick}
        onFavoriteClick={mockHandlers.onFavoriteClick}
        isFavorite={false}
        isRTL={true}
      />
    );

    expect(container).toHaveAttribute('role', 'article');
    expect(screen.getByLabelText(/favorite/i)).toHaveAttribute('aria-label');
    
    // Test keyboard navigation
    await userEvent.tab();
    expect(container.querySelector(':focus')).toBeTruthy();
  });
});

describe('ListingGrid', () => {
  const mockListings = [mockListing];
  const mockHandlers = {
    onPageChange: vi.fn(),
    onListingClick: vi.fn(),
    onFavoriteClick: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders grid with correct responsive layout', () => {
    const { container } = renderWithProviders(
      <ListingGrid
        listings={mockListings}
        loading={false}
        totalItems={1}
        page={1}
        onPageChange={mockHandlers.onPageChange}
        onListingClick={mockHandlers.onListingClick}
        onFavoriteClick={mockHandlers.onFavoriteClick}
        favoriteListings={[]}
        isRTL={true}
        language="ar"
        error={null}
      />
    );

    expect(container.querySelector('.MuiGrid-container')).toBeInTheDocument();
  });

  it('displays loading skeletons while fetching data', () => {
    renderWithProviders(
      <ListingGrid
        listings={[]}
        loading={true}
        totalItems={0}
        page={1}
        onPageChange={mockHandlers.onPageChange}
        onListingClick={mockHandlers.onListingClick}
        onFavoriteClick={mockHandlers.onFavoriteClick}
        favoriteListings={[]}
        isRTL={true}
        language="ar"
        error={null}
      />
    );

    expect(screen.getAllByTestId('skeleton')).toHaveLength(20); // Default items per page
  });

  it('handles empty state with correct language', () => {
    renderWithProviders(
      <ListingGrid
        listings={[]}
        loading={false}
        totalItems={0}
        page={1}
        onPageChange={mockHandlers.onPageChange}
        onListingClick={mockHandlers.onListingClick}
        onFavoriteClick={mockHandlers.onFavoriteClick}
        favoriteListings={[]}
        isRTL={true}
        language="ar"
        error={null}
      />
    );

    expect(screen.getByText(/لا توجد قوائم متاحة/)).toBeInTheDocument();
  });
});

describe('ListingForm', () => {
  const mockSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('validates required fields in both languages', async () => {
    renderWithProviders(
      <ListingForm
        onSubmit={mockSubmit}
        language="ar"
      />
    );

    const submitButton = screen.getByRole('button', { name: /نشر الإعلان/i });
    await userEvent.click(submitButton);

    expect(screen.getByText(/العنوان مطلوب/)).toBeInTheDocument();
    expect(screen.getByText(/Title is required/)).toBeInTheDocument();
  });

  it('handles image upload with preview', async () => {
    renderWithProviders(
      <ListingForm
        onSubmit={mockSubmit}
        language="ar"
      />
    );

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByLabelText(/upload/i);
    
    await userEvent.upload(input, file);
    
    expect(await screen.findByAltText(/preview/i)).toBeInTheDocument();
  });

  it('supports autosave in edit mode', async () => {
    vi.useFakeTimers();
    
    renderWithProviders(
      <ListingForm
        initialValues={mockListing}
        onSubmit={mockSubmit}
        mode="edit"
        language="ar"
      />
    );

    const titleInput = screen.getByLabelText(/العنوان بالعربية/i);
    await userEvent.type(titleInput, 'تحديث العنوان');
    
    vi.advanceTimersByTime(3000);
    
    expect(mockSubmit).toHaveBeenCalledTimes(1);
    
    vi.useRealTimers();
  });
});