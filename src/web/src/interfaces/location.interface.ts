/**
 * @fileoverview Location-related interfaces and types for the Egyptian Map of Pi
 * Defines core data structures for handling geographic locations within Egypt's boundaries
 * @version 1.0.0
 */

/**
 * Geographic coordinates interface with validation for Egyptian boundaries
 * Latitude range: 22°N to 31.5°N
 * Longitude range: 25°E to 35°E
 */
export interface Coordinates {
  /** Latitude in decimal degrees (22°N to 31.5°N) */
  latitude: number;
  
  /** Longitude in decimal degrees (25°E to 35°E) */
  longitude: number;
}

/**
 * Comprehensive Egyptian address structure with bilingual support
 * Includes both English and Arabic representations of address components
 */
export interface Address {
  /** Street name in English */
  street: string;
  
  /** District/neighborhood name in English */
  district: string;
  
  /** City name in English */
  city: string;
  
  /** Governorate name in English */
  governorate: string;
  
  /** Egyptian postal code (5 digits) */
  postalCode: string;
  
  /** Street name in Arabic */
  streetNameAr: string;
  
  /** District/neighborhood name in Arabic */
  districtAr: string;
  
  /** City name in Arabic */
  cityAr: string;
  
  /** Governorate name in Arabic */
  governorateAr: string;
}

/**
 * Enumeration of location types in the Egyptian marketplace system
 * Defines different categories of locations for business logic
 */
export enum LocationType {
  /** Physical retail store location */
  STORE = 'STORE',
  
  /** Designated pickup point for orders */
  PICKUP_POINT = 'PICKUP_POINT',
  
  /** Customer delivery address */
  DELIVERY_ADDRESS = 'DELIVERY_ADDRESS',
  
  /** Marketplace hub location */
  MARKETPLACE = 'MARKETPLACE',
  
  /** Service provider location */
  SERVICE_LOCATION = 'SERVICE_LOCATION'
}

/**
 * Complete location interface combining coordinates, address, and metadata
 * Core data structure for location-based features in the application
 */
export interface Location {
  /** Unique identifier for the location */
  id: string;
  
  /** Geographic coordinates with Egyptian boundary validation */
  coordinates: Coordinates;
  
  /** Structured address information in both English and Arabic */
  address: Address;
  
  /** Category/type of the location */
  type: LocationType;
  
  /** Verification status of the location */
  isVerified: boolean;
  
  /** Timestamp of location creation */
  createdAt: Date;
  
  /** Timestamp of last location update */
  updatedAt: Date;
}