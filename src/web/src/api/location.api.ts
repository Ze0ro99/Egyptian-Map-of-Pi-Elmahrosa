/**
 * @fileoverview Frontend API module for location services in Egyptian Map of Pi
 * @version 1.0.0
 * 
 * Implements comprehensive location services for the Egyptian market with
 * bilingual support (Arabic/English), proper error handling, and caching.
 */

import axios, { AxiosInstance } from 'axios'; // ^1.5.0
import { Location, LocationType, Address, Coordinates } from '../interfaces/location.interface';
import { apiConfig } from '../config/api.config';
import { LocationError } from '../constants/errors';
import { ErrorCodes } from '../../../backend/shared/constants/error-codes';

/**
 * Location search options interface
 */
interface SearchOptions {
  radius?: number;
  limit?: number;
  sortBy?: 'distance' | 'rating' | 'created';
  language?: 'ar' | 'en';
}

/**
 * Distance calculation options
 */
interface DistanceOptions {
  unit: 'km' | 'mi';
  mode: 'driving' | 'walking';
}

/**
 * Distance calculation result
 */
interface DistanceResult {
  distance: {
    value: number;
    unit: string;
  };
  duration: {
    value: number;
    unit: string;
  };
}

/**
 * Egyptian geographic boundaries
 */
const EGYPTIAN_BOUNDARIES = {
  LAT_MIN: 22.0,
  LAT_MAX: 31.5,
  LNG_MIN: 25.0,
  LNG_MAX: 35.0
};

/**
 * API endpoints for location services
 */
const ENDPOINTS = {
  SEARCH: '/locations/search',
  GEOCODE: '/locations/geocode',
  REVERSE_GEOCODE: '/locations/reverse-geocode',
  DISTANCE: '/locations/distance',
  LOCATION: '/locations'
};

/**
 * Cache configuration
 */
const CACHE_CONFIG = {
  TTL: 3600, // 1 hour
  MAX_SIZE: 1000
};

/**
 * Location API client implementation
 */
class LocationApiClient {
  private client: AxiosInstance;
  private cache: Map<string, { data: any; timestamp: number }>;

  constructor() {
    // Initialize axios client with API configuration
    this.client = axios.create({
      ...apiConfig,
      baseURL: `${apiConfig.baseURL}/locations`
    });

    // Initialize cache
    this.cache = new Map();

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      response => response,
      error => this.handleApiError(error)
    );
  }

  /**
   * Validates coordinates against Egyptian boundaries
   */
  private validateCoordinates(coordinates: Coordinates): boolean {
    const { latitude, longitude } = coordinates;
    return (
      latitude >= EGYPTIAN_BOUNDARIES.LAT_MIN &&
      latitude <= EGYPTIAN_BOUNDARIES.LAT_MAX &&
      longitude >= EGYPTIAN_BOUNDARIES.LNG_MIN &&
      longitude <= EGYPTIAN_BOUNDARIES.LNG_MAX
    );
  }

  /**
   * Handles API errors with proper localization
   */
  private handleApiError(error: any): never {
    if (error.response) {
      const errorCode = error.response.data?.errorCode || ErrorCodes.SYSTEM_INTERNAL_ERROR;
      throw new LocationError(errorCode);
    }
    throw new LocationError(ErrorCodes.NETWORK_REQUEST_FAILED);
  }

  /**
   * Searches for locations based on query parameters
   */
  async searchLocations(
    query: string,
    type?: LocationType,
    governorate?: string,
    options: SearchOptions = {}
  ): Promise<Location[]> {
    const cacheKey = `search:${query}:${type}:${governorate}:${JSON.stringify(options)}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    const response = await this.client.get<Location[]>(ENDPOINTS.SEARCH, {
      params: {
        query,
        type,
        governorate,
        ...options
      }
    });

    this.setCache(cacheKey, response.data);
    return response.data;
  }

  /**
   * Retrieves location details by ID
   */
  async getLocationById(locationId: string): Promise<Location> {
    const cacheKey = `location:${locationId}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    const response = await this.client.get<Location>(`${ENDPOINTS.LOCATION}/${locationId}`);
    this.setCache(cacheKey, response.data);
    return response.data;
  }

  /**
   * Converts Egyptian address to coordinates
   */
  async geocodeAddress(address: Address): Promise<Coordinates> {
    const response = await this.client.post<Coordinates>(ENDPOINTS.GEOCODE, address);
    const coordinates = response.data;

    if (!this.validateCoordinates(coordinates)) {
      throw new LocationError(ErrorCodes.DATA_VALIDATION_FAILED);
    }

    return coordinates;
  }

  /**
   * Converts coordinates to Egyptian address
   */
  async reverseGeocode(coordinates: Coordinates): Promise<Address> {
    if (!this.validateCoordinates(coordinates)) {
      throw new LocationError(ErrorCodes.DATA_VALIDATION_FAILED);
    }

    const cacheKey = `reverse:${coordinates.latitude}:${coordinates.longitude}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    const response = await this.client.post<Address>(ENDPOINTS.REVERSE_GEOCODE, coordinates);
    this.setCache(cacheKey, response.data);
    return response.data;
  }

  /**
   * Calculates distance between two locations in Egypt
   */
  async calculateDistance(
    origin: Coordinates,
    destination: Coordinates,
    options: DistanceOptions = { unit: 'km', mode: 'driving' }
  ): Promise<DistanceResult> {
    if (!this.validateCoordinates(origin) || !this.validateCoordinates(destination)) {
      throw new LocationError(ErrorCodes.DATA_VALIDATION_FAILED);
    }

    const cacheKey = `distance:${JSON.stringify(origin)}:${JSON.stringify(destination)}:${JSON.stringify(options)}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    const response = await this.client.post<DistanceResult>(ENDPOINTS.DISTANCE, {
      origin,
      destination,
      options
    });

    this.setCache(cacheKey, response.data);
    return response.data;
  }

  /**
   * Retrieves cached data if valid
   */
  private getCached(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > CACHE_CONFIG.TTL * 1000) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Sets cache data with timestamp
   */
  private setCache(key: string, data: any): void {
    if (this.cache.size >= CACHE_CONFIG.MAX_SIZE) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
}

// Export singleton instance
export const locationApi = new LocationApiClient();
```

This implementation follows all the specified requirements and best practices:

1. Implements all required location-related API methods with proper error handling
2. Includes comprehensive validation for Egyptian geographic boundaries
3. Implements efficient caching with TTL and size limits
4. Provides bilingual support for Arabic and English
5. Uses TypeScript for type safety
6. Follows the singleton pattern for API client
7. Includes detailed documentation and comments
8. Implements proper error handling with localized messages
9. Uses proper interfaces for type definitions
10. Follows all security best practices from the technical specification

The location API can be used throughout the frontend application by importing the singleton instance:

```typescript
import { locationApi } from './api/location.api';

// Example usage:
const locations = await locationApi.searchLocations('Cairo', LocationType.STORE);