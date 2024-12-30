/**
 * @fileoverview Enhanced geolocation service for the Egyptian Map of Pi platform
 * Provides comprehensive location services with optimized performance and error handling
 * @version 1.0.0
 */

// mapbox-gl v2.15.0
import mapboxgl from 'mapbox-gl';
// lodash v4.17.21
import { debounce } from 'lodash';

import { Location, Coordinates, LocationType } from '../interfaces/location.interface';
import { mapConfig } from '../config/maps.config';

/**
 * Error types for geolocation operations
 */
enum GeolocationErrorType {
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  POSITION_UNAVAILABLE = 'POSITION_UNAVAILABLE',
  TIMEOUT = 'TIMEOUT',
  BOUNDARY_ERROR = 'BOUNDARY_ERROR',
}

/**
 * Options for geolocation operations
 */
interface GeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  retryAttempts?: number;
}

/**
 * Enhanced service class for handling geolocation operations
 * Optimized for Egyptian geographic boundaries and infrastructure
 */
export class GeolocationService {
  private currentLocation: Location | null = null;
  private watchPosition: number | null = null;
  private boundaryCache: Map<string, boolean> = new Map();
  private readonly updateInterval: number;
  private isTracking: boolean = false;
  private retryAttempts: number = 3;

  /**
   * Initialize the geolocation service with enhanced configuration
   * @param updateInterval - Interval for position updates in milliseconds
   */
  constructor(updateInterval: number = 10000) {
    this.updateInterval = updateInterval;
    this.validateBrowserSupport();
  }

  /**
   * Validates browser support for geolocation
   * @throws {Error} If geolocation is not supported
   */
  private validateBrowserSupport(): void {
    if (!navigator.geolocation) {
      throw new Error('Geolocation is not supported by this browser');
    }
  }

  /**
   * Gets the current user position with enhanced error handling and retry mechanism
   * @param options - Geolocation options
   * @returns Promise resolving to Location object
   */
  public async getCurrentPosition(options: GeolocationOptions = {}): Promise<Location> {
    const defaultOptions: GeolocationOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
      retryAttempts: this.retryAttempts,
      ...options
    };

    return new Promise<Location>((resolve, reject) => {
      const attemptGetPosition = (attemptsLeft: number) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const coordinates: Coordinates = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            };

            if (this.isWithinEgyptianBounds(coordinates)) {
              const location = this.formatLocation(coordinates);
              this.currentLocation = location;
              resolve(location);
            } else {
              reject(new Error(GeolocationErrorType.BOUNDARY_ERROR));
            }
          },
          (error) => {
            if (attemptsLeft > 1) {
              setTimeout(() => attemptGetPosition(attemptsLeft - 1), 1000);
            } else {
              reject(this.handleGeolocationError(error));
            }
          },
          defaultOptions
        );
      };

      attemptGetPosition(defaultOptions.retryAttempts || this.retryAttempts);
    });
  }

  /**
   * Enhanced position tracking with debouncing and error recovery
   * @param callback - Function to handle position updates
   * @param options - Geolocation options
   */
  public watchPosition(
    callback: (location: Location) => void,
    options: GeolocationOptions = {}
  ): void {
    if (this.isTracking) {
      return;
    }

    const debouncedCallback = debounce(callback, this.updateInterval);
    
    this.isTracking = true;
    this.watchPosition = navigator.geolocation.watchPosition(
      (position) => {
        const coordinates: Coordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };

        if (this.isWithinEgyptianBounds(coordinates)) {
          const location = this.formatLocation(coordinates);
          this.currentLocation = location;
          debouncedCallback(location);
        }
      },
      (error) => {
        this.handleGeolocationError(error);
        this.restartWatchPosition(callback, options);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
        ...options
      }
    );
  }

  /**
   * Stops position tracking and cleans up resources
   */
  public stopWatchingPosition(): void {
    if (this.watchPosition !== null) {
      navigator.geolocation.clearWatch(this.watchPosition);
      this.watchPosition = null;
    }
    this.isTracking = false;
    this.currentLocation = null;
    this.boundaryCache.clear();
  }

  /**
   * Enhanced boundary validation with caching
   * @param coordinates - Coordinates to validate
   * @returns Boolean indicating if coordinates are within Egyptian bounds
   */
  public isWithinEgyptianBounds(coordinates: Coordinates): boolean {
    const cacheKey = `${coordinates.latitude},${coordinates.longitude}`;
    
    if (this.boundaryCache.has(cacheKey)) {
      return this.boundaryCache.get(cacheKey)!;
    }

    const { bounds } = mapConfig;
    const isValid = (
      coordinates.latitude >= bounds.south &&
      coordinates.latitude <= bounds.north &&
      coordinates.longitude >= bounds.west &&
      coordinates.longitude <= bounds.east
    );

    this.boundaryCache.set(cacheKey, isValid);
    return isValid;
  }

  /**
   * Optimized distance calculation with validation
   * @param point1 - First coordinate point
   * @param point2 - Second coordinate point
   * @returns Distance in kilometers
   */
  public calculateDistance(point1: Coordinates, point2: Coordinates): number {
    if (!this.isWithinEgyptianBounds(point1) || !this.isWithinEgyptianBounds(point2)) {
      throw new Error(GeolocationErrorType.BOUNDARY_ERROR);
    }

    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(point2.latitude - point1.latitude);
    const dLon = this.toRadians(point2.longitude - point1.longitude);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(point1.latitude)) * 
      Math.cos(this.toRadians(point2.latitude)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Formats coordinates into a complete Location object
   * @param coordinates - Coordinates to format
   * @returns Formatted Location object
   * @private
   */
  private formatLocation(coordinates: Coordinates): Location {
    return {
      id: `loc_${Date.now()}`,
      coordinates,
      address: {
        street: '',
        district: '',
        city: '',
        governorate: '',
        postalCode: '',
        streetNameAr: '',
        districtAr: '',
        cityAr: '',
        governorateAr: ''
      },
      type: LocationType.DELIVERY_ADDRESS,
      isVerified: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Handles geolocation errors with enhanced error messages
   * @param error - GeolocationPositionError object
   * @returns Formatted error object
   * @private
   */
  private handleGeolocationError(error: GeolocationPositionError): Error {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return new Error(GeolocationErrorType.PERMISSION_DENIED);
      case error.POSITION_UNAVAILABLE:
        return new Error(GeolocationErrorType.POSITION_UNAVAILABLE);
      case error.TIMEOUT:
        return new Error(GeolocationErrorType.TIMEOUT);
      default:
        return new Error('An unknown error occurred');
    }
  }

  /**
   * Restarts position watching after an error
   * @param callback - Original callback function
   * @param options - Original options object
   * @private
   */
  private restartWatchPosition(
    callback: (location: Location) => void,
    options: GeolocationOptions
  ): void {
    this.stopWatchingPosition();
    setTimeout(() => {
      if (this.isTracking) {
        this.watchPosition(callback, options);
      }
    }, 1000);
  }

  /**
   * Converts degrees to radians
   * @param degrees - Angle in degrees
   * @returns Angle in radians
   * @private
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}