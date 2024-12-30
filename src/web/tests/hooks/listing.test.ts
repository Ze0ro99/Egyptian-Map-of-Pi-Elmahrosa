/**
 * @fileoverview Comprehensive test suite for useListings hook
 * Tests listing management functionality, bilingual content, location services,
 * real-time updates, caching, and Redux integration
 * @version 1.0.0
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import MockWebSocket from 'jest-websocket-mock';
import { useListings } from '../../src/hooks/useListings';
import { Listing, ListingStatus, ListingCategory } from '../../src/interfaces/listing.interface';
import { LocationType } from '../../src/interfaces/location.interface';
import { Language } from '../../src/interfaces/user.interface';

// Mock WebSocket URL
const WS_URL = 'ws://localhost:8080';

// Configure enhanced mock store
const mockStore = configureStore({
  reducer: {
    listings: (state = { items: [], total: 0, currentPage: 1 }, action) => {
      switch (action.type) {
        case 'listings/fetch':
          return { ...state, items: mockListings };
        case 'listings/handleRealTimeUpdate':
          return {
            ...state,
            items: state.items.map(item =>
              item.id === action.payload.id ? { ...item, ...action.payload } : item
            )
          };
        default:
          return state;
      }
    }
  }
});

// Mock comprehensive test data
const mockListings: Listing[] = [
  {
    id: '1',
    titleAr: 'هاتف ذكي جديد',
    titleEn: 'New Smartphone',
    descriptionAr: 'هاتف ذكي بمواصفات عالية',
    descriptionEn: 'High-spec smartphone',
    category: ListingCategory.ELECTRONICS,
    price: 1000,
    priceEGP: 30000,
    images: ['image1.jpg'],
    location: {
      id: 'loc1',
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
      type: LocationType.STORE,
      isVerified: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    seller: {
      piId: 'seller1',
      nameAr: 'محمد أحمد',
      nameEn: 'Mohamed Ahmed',
      phone: '+201234567890',
      email: 'seller@example.com',
      location: {
        id: 'loc1',
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
        type: LocationType.STORE,
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      kycStatus: 'VERIFIED',
      isMerchant: true,
      language: Language.AR,
      governorate: 'Cairo'
    },
    status: ListingStatus.ACTIVE,
    tags: ['electronics', 'smartphone', 'الكترونيات', 'هاتف ذكي'],
    views: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// Test wrapper component with providers
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <Provider store={mockStore}>{children}</Provider>
);

describe('useListings Hook', () => {
  let mockWsServer: MockWebSocket;

  beforeEach(() => {
    // Set up WebSocket mock server
    mockWsServer = new MockWebSocket(WS_URL);
    // Mock geolocation API
    const mockGeolocation = {
      getCurrentPosition: jest.fn().mockImplementation(success =>
        success({
          coords: {
            latitude: 30.0444,
            longitude: 31.2357
          }
        })
      )
    };
    (global as any).navigator.geolocation = mockGeolocation;
  });

  afterEach(() => {
    // Clean up WebSocket mock
    MockWebSocket.clean();
  });

  it('should handle bilingual content correctly', async () => {
    const { result } = renderHook(() => useListings(), { wrapper });

    // Wait for initial fetch
    await act(async () => {
      await mockWsServer.connected;
    });

    // Verify Arabic content
    expect(result.current.listings[0].titleAr).toBe('هاتف ذكي جديد');
    expect(result.current.listings[0].descriptionAr).toBe('هاتف ذكي بمواصفات عالية');

    // Verify English content
    expect(result.current.listings[0].titleEn).toBe('New Smartphone');
    expect(result.current.listings[0].descriptionEn).toBe('High-spec smartphone');

    // Verify bilingual location data
    expect(result.current.listings[0].location.address.cityAr).toBe('القاهرة');
    expect(result.current.listings[0].location.address.city).toBe('Cairo');
  });

  it('should handle location-based filtering', async () => {
    const { result } = renderHook(
      () =>
        useListings({
          location: {
            latitude: 30.0444,
            longitude: 31.2357
          },
          radius: 10
        }),
      { wrapper }
    );

    await act(async () => {
      await mockWsServer.connected;
    });

    // Verify location filter is applied
    expect(result.current.filter.location).toEqual({
      latitude: 30.0444,
      longitude: 31.2357
    });
    expect(result.current.filter.radius).toBe(10);
  });

  it('should handle real-time updates', async () => {
    const { result } = renderHook(() => useListings(), { wrapper });

    await act(async () => {
      await mockWsServer.connected;
    });

    // Simulate real-time update
    await act(async () => {
      mockWsServer.send(
        JSON.stringify({
          type: 'UPDATE',
          payload: {
            id: '1',
            price: 1100,
            priceEGP: 33000,
            updatedAt: new Date()
          }
        })
      );
    });

    // Verify update was applied
    expect(result.current.listings[0].price).toBe(1100);
    expect(result.current.listings[0].priceEGP).toBe(33000);
  });

  it('should handle offline/online transitions', async () => {
    const { result } = renderHook(() => useListings(), { wrapper });

    // Simulate going offline
    await act(async () => {
      mockWsServer.close();
    });

    expect(result.current.isOnline).toBe(false);

    // Simulate coming back online
    await act(async () => {
      mockWsServer = new MockWebSocket(WS_URL);
      await mockWsServer.connected;
    });

    expect(result.current.isOnline).toBe(true);
  });

  it('should validate Egyptian coordinates', async () => {
    const { result } = renderHook(
      () =>
        useListings({
          location: {
            latitude: 35.0, // Invalid latitude for Egypt
            longitude: 31.2357
          }
        }),
      { wrapper }
    );

    await act(async () => {
      await mockWsServer.connected;
    });

    // Verify error for invalid coordinates
    expect(result.current.error).toBeTruthy();
    expect(result.current.error?.code).toBe('INVALID_LOCATION');
  });

  it('should handle listing creation with optimistic updates', async () => {
    const { result } = renderHook(() => useListings(), { wrapper });

    const newListing = {
      titleAr: 'منتج جديد',
      titleEn: 'New Product',
      price: 500,
      location: mockListings[0].location
    };

    await act(async () => {
      await result.current.createListing(newListing);
    });

    // Verify optimistic update
    expect(result.current.listings).toContainEqual(
      expect.objectContaining({
        titleAr: 'منتج جديد',
        titleEn: 'New Product'
      })
    );
  });
});