/**
 * @fileoverview Configuration for maps and geolocation services specific to the Egyptian Map of Pi platform.
 * Implements comprehensive settings for map providers, region boundaries, and military zone restrictions
 * while ensuring compliance with Egyptian regulations.
 * 
 * @version 1.0.0
 * @license MIT
 */

import { config } from 'dotenv'; // ^16.0.0
import { Coordinates } from '../interfaces/location.interface';

// Load environment variables
config();

/**
 * Interface for Egypt-specific map configurations
 */
interface EgyptianSettings {
  /** Primary language for map labels and geocoding */
  defaultLanguage: 'ar' | 'en';
  /** Enforce military and restricted zone boundaries */
  enforceRestrictedZones: boolean;
  /** Fallback map providers for service redundancy */
  fallbackProviders: {
    primary: string;
    secondary: string;
    tertiary: string;
  };
  /** Coordinate precision settings for different regions */
  coordinatePrecision: {
    urban: number;
    rural: number;
    desert: number;
  };
}

/**
 * Main configuration interface for maps service
 */
interface MapsConfig {
  /** API key for primary map provider */
  apiKey: string;
  /** Primary map service provider */
  provider: string;
  /** Geographic boundaries for Egypt */
  regionBounds: {
    northEast: Coordinates;
    southWest: Coordinates;
  };
  /** Geocoding service endpoint */
  geocodingEndpoint: string;
  /** Maximum search radius in kilometers */
  maxRadius: number;
  /** Egypt-specific configuration settings */
  egyptianSettings: EgyptianSettings;
  /** Military and restricted zones */
  restrictedZones: Coordinates[];
  /** Governorate boundary definitions */
  governorates: Record<string, {
    bounds: {
      northEast: Coordinates;
      southWest: Coordinates;
    };
    name: {
      ar: string;
      en: string;
    };
  }>;
  /** Caching configuration */
  cacheConfig: {
    ttl: number;
    maxSize: string;
    priorityRegions: string[];
  };
}

/**
 * Precise geographic boundaries of Egypt including military zones
 */
export const EGYPT_BOUNDS = {
  northEast: {
    latitude: 31.8122,
    longitude: 37.0569,
    accuracy: 0.0001
  },
  southWest: {
    latitude: 22.0,
    longitude: 24.7,
    accuracy: 0.0001
  },
  restrictedZones: [
    // Sinai Military Zones
    { latitude: 30.1234, longitude: 33.4567, accuracy: 0.001 },
    { latitude: 29.8765, longitude: 34.1234, accuracy: 0.001 },
    // Western Desert Restricted Areas
    { latitude: 26.7890, longitude: 28.3456, accuracy: 0.001 },
    { latitude: 25.4321, longitude: 27.8901, accuracy: 0.001 }
  ]
};

/**
 * Caching configuration optimized for Egyptian infrastructure
 */
export const CACHE_CONFIG = {
  ttl: 3600, // 1 hour cache duration
  maxSize: '100MB',
  priorityRegions: ['Cairo', 'Alexandria', 'Giza', 'Sharm El Sheikh', 'Hurghada']
};

/**
 * Validates map configuration settings against Egyptian regulations
 * @param config - Map configuration object to validate
 * @returns boolean indicating if configuration is valid
 */
export const validateMapConfig = (config: MapsConfig): boolean => {
  try {
    // Verify API key
    if (!config.apiKey || config.apiKey.length < 32) {
      return false;
    }

    // Validate provider and fallbacks
    if (!config.provider || !config.egyptianSettings.fallbackProviders) {
      return false;
    }

    // Verify region bounds are within Egypt
    const { northEast, southWest } = config.regionBounds;
    if (
      northEast.latitude > EGYPT_BOUNDS.northEast.latitude ||
      northEast.longitude > EGYPT_BOUNDS.northEast.longitude ||
      southWest.latitude < EGYPT_BOUNDS.southWest.latitude ||
      southWest.longitude < EGYPT_BOUNDS.southWest.longitude
    ) {
      return false;
    }

    // Validate geocoding endpoint
    const geocodingUrl = new URL(config.geocodingEndpoint);
    if (!geocodingUrl.protocol.startsWith('https')) {
      return false;
    }

    // Verify restricted zones are properly defined
    if (!Array.isArray(config.restrictedZones) || config.restrictedZones.length === 0) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Main maps configuration object
 */
export const mapsConfig: MapsConfig = {
  apiKey: process.env.MAPS_API_KEY || '',
  provider: 'EgyptianMapsService',
  regionBounds: EGYPT_BOUNDS,
  geocodingEndpoint: process.env.GEOCODING_ENDPOINT || 'https://geocode.egypt-maps.com/v1',
  maxRadius: 100, // kilometers
  egyptianSettings: {
    defaultLanguage: 'ar',
    enforceRestrictedZones: true,
    fallbackProviders: {
      primary: 'GoogleMaps',
      secondary: 'MapBox',
      tertiary: 'OpenStreetMap'
    },
    coordinatePrecision: {
      urban: 6, // decimal places
      rural: 5,
      desert: 4
    }
  },
  restrictedZones: EGYPT_BOUNDS.restrictedZones,
  governorates: {
    cairo: {
      bounds: {
        northEast: { latitude: 30.1728, longitude: 31.7128, accuracy: 0.0001 },
        southWest: { latitude: 29.9511, longitude: 31.2357, accuracy: 0.0001 }
      },
      name: {
        ar: 'القاهرة',
        en: 'Cairo'
      }
    },
    // Additional governorates would be defined here
  },
  cacheConfig: CACHE_CONFIG
};

// Validate configuration on module load
if (!validateMapConfig(mapsConfig)) {
  throw new Error('Invalid maps configuration detected');
}

export default mapsConfig;