/**
 * @fileoverview Enhanced geocoding service for Egyptian Map of Pi platform.
 * Handles address-to-coordinates and coordinates-to-address conversions with
 * validation for Egyptian geographic boundaries, military zones, and bilingual support.
 * 
 * @version 1.0.0
 */

import axios, { AxiosInstance } from 'axios'; // ^1.5.0
import { Coordinates, Address } from '../interfaces/location.interface';
import { mapsConfig } from '../config/maps.config';
import { validateEgyptianCoordinates } from '../utils/distance.util';

/**
 * Cache interface for geocoding results
 */
interface GeocodingCache {
  address: Map<string, Coordinates>;
  coordinates: Map<string, Address>;
  timestamp: Map<string, number>;
}

/**
 * Enhanced geocoding service for Egyptian locations with military zone validation
 * and bilingual support
 */
export class GeocodingService {
  private readonly apiKey: string;
  private readonly geocodingEndpoint: string;
  private readonly militaryZones: Coordinates[];
  private readonly urbanAreaPrecision: Record<string, number>;
  private readonly addressCache: GeocodingCache;
  private readonly axiosInstance: AxiosInstance;
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // 1 second

  constructor() {
    this.apiKey = mapsConfig.apiKey;
    this.geocodingEndpoint = mapsConfig.geocodingEndpoint;
    this.militaryZones = mapsConfig.restrictedZones;
    this.urbanAreaPrecision = mapsConfig.egyptianSettings.coordinatePrecision;
    
    // Initialize cache
    this.addressCache = {
      address: new Map(),
      coordinates: new Map(),
      timestamp: new Map()
    };

    // Configure axios instance with Egyptian infrastructure optimizations
    this.axiosInstance = axios.create({
      baseURL: this.geocodingEndpoint,
      timeout: 10000,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Accept-Language': 'ar,en'
      }
    });

    this.validateConfiguration();
  }

  /**
   * Validates service configuration
   * @throws Error if configuration is invalid
   */
  private validateConfiguration(): void {
    if (!this.apiKey || !this.geocodingEndpoint) {
      throw new Error('Invalid geocoding service configuration');
    }
  }

  /**
   * Generates cache key for address or coordinates
   */
  private generateCacheKey(input: Address | Coordinates): string {
    return JSON.stringify(input);
  }

  /**
   * Checks if cached result is still valid
   */
  private isCacheValid(key: string): boolean {
    const timestamp = this.addressCache.timestamp.get(key);
    return timestamp ? (Date.now() - timestamp) < this.CACHE_TTL : false;
  }

  /**
   * Handles API request with retry logic optimized for Egyptian infrastructure
   */
  private async makeRequest<T>(
    url: string,
    params: Record<string, any>,
    retries = this.MAX_RETRIES
  ): Promise<T> {
    try {
      const response = await this.axiosInstance.get<T>(url, { params });
      return response.data;
    } catch (error) {
      if (retries > 0 && axios.isAxiosError(error)) {
        await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
        return this.makeRequest<T>(url, params, retries - 1);
      }
      throw error;
    }
  }

  /**
   * Converts an Egyptian address to geographic coordinates
   * @param address Address to geocode
   * @returns Promise resolving to validated coordinates
   * @throws Error if address is invalid or in restricted zone
   */
  public async geocodeAddress(address: Address): Promise<Coordinates> {
    const cacheKey = this.generateCacheKey(address);
    
    // Check cache
    if (this.isCacheValid(cacheKey)) {
      const cached = this.addressCache.address.get(cacheKey);
      if (cached) return cached;
    }

    // Prepare bilingual address string
    const addressString = [
      address.streetAr || address.street,
      address.cityAr || address.city,
      address.governorateAr || address.governorate
    ].filter(Boolean).join('، ');

    try {
      const result = await this.makeRequest<{
        coordinates: Coordinates;
        precision: number;
      }>('/geocode', {
        address: addressString,
        country: 'EG',
        format: 'json'
      });

      // Validate coordinates
      if (!validateEgyptianCoordinates(result.coordinates)) {
        throw new Error('Location outside Egyptian boundaries or in restricted zone');
      }

      // Apply urban area precision
      const precision = this.urbanAreaPrecision[address.governorate] || 
        this.urbanAreaPrecision.rural;
      
      const coordinates: Coordinates = {
        latitude: Number(result.coordinates.latitude.toFixed(precision)),
        longitude: Number(result.coordinates.longitude.toFixed(precision)),
        accuracy: result.precision
      };

      // Cache result
      this.addressCache.address.set(cacheKey, coordinates);
      this.addressCache.timestamp.set(cacheKey, Date.now());

      return coordinates;
    } catch (error) {
      throw new Error(`Geocoding failed: ${error.message}`);
    }
  }

  /**
   * Converts geographic coordinates to a bilingual Egyptian address
   * @param coordinates Coordinates to reverse geocode
   * @returns Promise resolving to bilingual address
   * @throws Error if coordinates are invalid or in restricted zone
   */
  public async reverseGeocode(coordinates: Coordinates): Promise<Address> {
    if (!validateEgyptianCoordinates(coordinates)) {
      throw new Error('Coordinates outside Egyptian boundaries or in restricted zone');
    }

    const cacheKey = this.generateCacheKey(coordinates);

    // Check cache
    if (this.isCacheValid(cacheKey)) {
      const cached = this.addressCache.coordinates.get(cacheKey);
      if (cached) return cached;
    }

    try {
      const result = await this.makeRequest<{
        address: {
          street: { ar: string; en: string; };
          city: { ar: string; en: string; };
          governorate: { ar: string; en: string; };
          postal_code: string;
        };
      }>('/reverse', {
        lat: coordinates.latitude,
        lon: coordinates.longitude,
        format: 'json'
      });

      const address: Address = {
        street: result.address.street.en,
        streetAr: result.address.street.ar,
        city: result.address.city.en,
        cityAr: result.address.city.ar,
        governorate: result.address.governorate.en,
        governorateAr: result.address.governorate.ar,
        postalCode: result.address.postal_code
      };

      // Cache result
      this.addressCache.coordinates.set(cacheKey, address);
      this.addressCache.timestamp.set(cacheKey, Date.now());

      return address;
    } catch (error) {
      throw new Error(`Reverse geocoding failed: ${error.message}`);
    }
  }

  /**
   * Validates if an address is within Egyptian boundaries and not in restricted zones
   * @param address Address to validate
   * @returns Promise resolving to validation status
   */
  public async validateAddress(address: Address): Promise<boolean> {
    try {
      const coordinates = await this.geocodeAddress(address);
      return validateEgyptianCoordinates(coordinates);
    } catch (error) {
      return false;
    }
  }
}

export default GeocodingService;