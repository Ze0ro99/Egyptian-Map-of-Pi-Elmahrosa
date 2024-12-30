/**
 * @fileoverview Enhanced maps service implementation for the Egyptian Map of Pi platform.
 * Handles location queries, distance calculations, and geospatial operations with
 * validation for Egyptian geographic boundaries, military zones, and urban density optimization.
 * 
 * @version 1.0.0
 * @license MIT
 */

import { createClient, RedisClientType } from 'redis'; // v4.6.0
import mapboxgl from 'mapbox-gl'; // v2.15.0
import { Coordinates, Location, LocationType, EGYPT_BOUNDARIES, SEARCH_RADIUS_CONSTRAINTS } from '../interfaces/location.interface';
import { mapsConfig } from '../config/maps.config';

/**
 * Interface for cached location results
 */
interface CachedLocationResult {
  locations: Location[];
  timestamp: number;
  densityFactor: number;
}

/**
 * Enhanced service class for handling map operations with military zone validation
 * and urban density optimization
 */
export class MapsService {
  private readonly apiKey: string;
  private readonly provider: string;
  private readonly regionBounds: typeof mapsConfig.regionBounds;
  private readonly militaryZones: typeof mapsConfig.restrictedZones;
  private readonly cacheClient: RedisClientType;
  private readonly cacheTTL: number = 3600; // 1 hour
  private readonly urbanDensityFactors: {
    HIGH: number;
    MEDIUM: number;
    LOW: number;
  } = {
    HIGH: 0.7,    // Reduce radius by 30% in high-density areas
    MEDIUM: 0.85, // Reduce radius by 15% in medium-density areas
    LOW: 1.0      // No reduction in low-density areas
  };

  /**
   * Initializes the maps service with required configuration
   */
  constructor() {
    this.apiKey = mapsConfig.apiKey;
    this.provider = mapsConfig.provider;
    this.regionBounds = mapsConfig.regionBounds;
    this.militaryZones = mapsConfig.restrictedZones;

    // Initialize Redis client with optimal configuration
    this.cacheClient = createClient({
      url: process.env.REDIS_URL,
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 50, 1000)
      }
    });

    this.initializeCache();
    this.validateConfiguration();
  }

  /**
   * Initializes Redis cache connection
   */
  private async initializeCache(): Promise<void> {
    try {
      await this.cacheClient.connect();
    } catch (error) {
      console.error('Failed to initialize cache:', error);
      // Continue without cache if connection fails
    }
  }

  /**
   * Validates service configuration
   */
  private validateConfiguration(): void {
    if (!this.apiKey || !this.provider) {
      throw new Error('Invalid maps service configuration');
    }
  }

  /**
   * Calculates urban density factor based on location and time
   * @param coordinates - Location coordinates
   * @returns Promise resolving to density factor
   */
  private async calculateUrbanDensityFactor(coordinates: Coordinates): Promise<number> {
    try {
      // Check cache first
      const cacheKey = `density:${coordinates.latitude.toFixed(4)}:${coordinates.longitude.toFixed(4)}`;
      const cachedDensity = await this.cacheClient.get(cacheKey);
      
      if (cachedDensity) {
        return parseFloat(cachedDensity);
      }

      // Calculate density based on location and time of day
      const hour = new Date().getHours();
      const isRushHour = (hour >= 8 && hour <= 10) || (hour >= 16 && hour <= 19);
      
      // Check if location is in a known high-density area
      const isUrbanCenter = this.isInUrbanCenter(coordinates);
      
      let densityFactor = this.urbanDensityFactors.LOW;
      
      if (isUrbanCenter && isRushHour) {
        densityFactor = this.urbanDensityFactors.HIGH;
      } else if (isUrbanCenter || isRushHour) {
        densityFactor = this.urbanDensityFactors.MEDIUM;
      }

      // Cache the result
      await this.cacheClient.set(cacheKey, densityFactor.toString(), {
        EX: 1800 // 30 minutes cache
      });

      return densityFactor;
    } catch (error) {
      console.error('Error calculating density factor:', error);
      return this.urbanDensityFactors.LOW; // Default to low density on error
    }
  }

  /**
   * Checks if coordinates are within a major urban center
   * @param coordinates - Location coordinates
   * @returns boolean indicating if location is in urban center
   */
  private isInUrbanCenter(coordinates: Coordinates): boolean {
    const urbanCenters = Object.values(mapsConfig.governorates)
      .filter(gov => ['cairo', 'alexandria', 'giza'].includes(gov.name.en.toLowerCase()));

    return urbanCenters.some(center => {
      const { northEast, southWest } = center.bounds;
      return coordinates.latitude <= northEast.latitude &&
             coordinates.latitude >= southWest.latitude &&
             coordinates.longitude <= northEast.longitude &&
             coordinates.longitude >= southWest.longitude;
    });
  }

  /**
   * Finds nearby locations with urban density consideration
   * @param center - Center coordinates for search
   * @param radiusKm - Search radius in kilometers
   * @param type - Optional location type filter
   * @param considerDensity - Whether to apply density-based adjustments
   * @returns Promise resolving to array of nearby locations
   */
  public async findNearbyLocations(
    center: Coordinates,
    radiusKm: number,
    type?: LocationType,
    considerDensity: boolean = true
  ): Promise<Location[]> {
    try {
      // Validate input parameters
      if (!await this.isWithinEgypt(center)) {
        throw new Error('Location outside Egypt boundaries');
      }

      if (radiusKm < SEARCH_RADIUS_CONSTRAINTS.MIN_RADIUS_KM || 
          radiusKm > SEARCH_RADIUS_CONSTRAINTS.MAX_RADIUS_KM) {
        throw new Error('Invalid search radius');
      }

      // Check cache
      const cacheKey = `locations:${center.latitude}:${center.longitude}:${radiusKm}:${type || 'all'}`;
      const cachedResult = await this.cacheClient.get(cacheKey);

      if (cachedResult) {
        const parsed: CachedLocationResult = JSON.parse(cachedResult);
        if (Date.now() - parsed.timestamp < this.cacheTTL * 1000) {
          return parsed.locations;
        }
      }

      // Apply density-based radius adjustment if enabled
      let adjustedRadius = radiusKm;
      if (considerDensity) {
        const densityFactor = await this.calculateUrbanDensityFactor(center);
        adjustedRadius *= densityFactor;
      }

      // Construct and execute geospatial query
      const locations = await this.executeGeospatialQuery(center, adjustedRadius, type);

      // Cache results
      const cacheData: CachedLocationResult = {
        locations,
        timestamp: Date.now(),
        densityFactor: adjustedRadius / radiusKm
      };

      await this.cacheClient.set(cacheKey, JSON.stringify(cacheData), {
        EX: this.cacheTTL
      });

      return locations;
    } catch (error) {
      console.error('Error finding nearby locations:', error);
      throw error;
    }
  }

  /**
   * Executes geospatial query for nearby locations
   * @param center - Center coordinates
   * @param radiusKm - Search radius in kilometers
   * @param type - Optional location type filter
   * @returns Promise resolving to array of locations
   */
  private async executeGeospatialQuery(
    center: Coordinates,
    radiusKm: number,
    type?: LocationType
  ): Promise<Location[]> {
    // Implementation would integrate with your chosen database
    // This is a placeholder for the actual database query
    return [];
  }

  /**
   * Validates if coordinates are within Egypt and not in restricted zones
   * @param coordinates - Coordinates to validate
   * @returns Promise resolving to boolean indicating validity
   */
  public async isWithinEgypt(coordinates: Coordinates): Promise<boolean> {
    try {
      // Check basic geographic bounds
      const withinBounds = coordinates.latitude >= EGYPT_BOUNDARIES.minLatitude &&
                          coordinates.latitude <= EGYPT_BOUNDARIES.maxLatitude &&
                          coordinates.longitude >= EGYPT_BOUNDARIES.minLongitude &&
                          coordinates.longitude <= EGYPT_BOUNDARIES.maxLongitude;

      if (!withinBounds) {
        return false;
      }

      // Check military zones
      const inMilitaryZone = this.militaryZones.some(zone => {
        const distance = this.calculateDistance(coordinates, zone);
        return distance < 1; // Within 1km of military zone
      });

      return !inMilitaryZone;
    } catch (error) {
      console.error('Error validating location:', error);
      return false;
    }
  }

  /**
   * Calculates distance between two coordinates using Haversine formula
   * @param point1 - First coordinate
   * @param point2 - Second coordinate
   * @returns Distance in kilometers
   */
  private calculateDistance(point1: Coordinates, point2: Coordinates): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(point2.latitude - point1.latitude);
    const dLon = this.toRad(point2.longitude - point1.longitude);
    const lat1 = this.toRad(point1.latitude);
    const lat2 = this.toRad(point2.latitude);

    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  /**
   * Converts degrees to radians
   * @param degrees - Angle in degrees
   * @returns Angle in radians
   */
  private toRad(degrees: number): number {
    return degrees * Math.PI / 180;
  }
}

export default MapsService;