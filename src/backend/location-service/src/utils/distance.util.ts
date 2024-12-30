/**
 * @fileoverview Utility module for calculating distances between geographic coordinates
 * with specialized optimizations for Egyptian geography. Includes validation for Egyptian
 * boundaries and enhanced precision for urban areas.
 * 
 * @version 1.0.0
 */

import { Coordinates, EGYPT_BOUNDARIES } from '../interfaces/location.interface';

/**
 * Earth's radius in kilometers
 */
const EARTH_RADIUS_KM = 6371;

/**
 * Urban density correction factors for major Egyptian cities
 * Adjusts distance calculations to account for dense urban environments
 */
const URBAN_DENSITY_FACTORS = {
  cairo: { // Greater Cairo
    center: { latitude: 30.0444, longitude: 31.2357 },
    radius: 30,
    factor: 1.1
  },
  alexandria: {
    center: { latitude: 31.2001, longitude: 29.9187 },
    radius: 20,
    factor: 1.05
  },
  giza: {
    center: { latitude: 30.0131, longitude: 31.2089 },
    radius: 25,
    factor: 1.08
  }
};

/**
 * Restricted military and sensitive zones in Egypt
 * Used for coordinate validation
 */
const RESTRICTED_ZONES = [
  {
    name: 'Sinai Military Zone',
    bounds: {
      north: 31.2,
      south: 28.2,
      east: 34.9,
      west: 32.8
    }
  }
  // Additional restricted zones can be added here
];

/**
 * Required decimal precision for coordinate validation
 */
const COORDINATE_PRECISION = 6;

/**
 * Converts degrees to radians
 * @param degrees - Angle in degrees
 * @returns Angle in radians
 */
const toRadians = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};

/**
 * Checks if coordinates are within a major urban area
 * @param point - Geographic coordinates to check
 * @returns Urban density factor if in urban area, 1.0 otherwise
 */
const getUrbanDensityFactor = (point: Coordinates): number => {
  for (const city of Object.values(URBAN_DENSITY_FACTORS)) {
    const distance = calculateBasicDistance(
      city.center,
      point
    );
    if (distance <= city.radius) {
      return city.factor;
    }
  }
  return 1.0;
};

/**
 * Basic distance calculation without optimizations
 * Used internally for urban area checks
 */
const calculateBasicDistance = (point1: Coordinates, point2: Coordinates): number => {
  const lat1 = toRadians(point1.latitude);
  const lon1 = toRadians(point1.longitude);
  const lat2 = toRadians(point2.latitude);
  const lon2 = toRadians(point2.longitude);

  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
};

/**
 * Calculates the distance between two geographic coordinates using the Haversine formula
 * with optimizations for Egyptian geographic scale and urban density considerations.
 * 
 * @param point1 - First geographic coordinate
 * @param point2 - Second geographic coordinate
 * @returns Distance in kilometers between the two points
 * @throws Error if coordinates are invalid or outside Egyptian boundaries
 */
export const calculateDistance = (point1: Coordinates, point2: Coordinates): number => {
  // Validate coordinates
  if (!validateEgyptianCoordinates(point1) || !validateEgyptianCoordinates(point2)) {
    throw new Error('Coordinates must be within Egyptian boundaries');
  }

  // Apply urban density factor
  const urbanFactor = Math.max(
    getUrbanDensityFactor(point1),
    getUrbanDensityFactor(point2)
  );

  // Calculate basic distance
  const distance = calculateBasicDistance(point1, point2);

  // Apply urban correction and return with enhanced precision
  return Number((distance * urbanFactor).toFixed(3));
};

/**
 * Checks if a point is within a specified radius of a center point,
 * with optimizations for dense urban areas.
 * 
 * @param center - Center point coordinates
 * @param point - Point to check
 * @param radiusKm - Radius in kilometers
 * @returns Boolean indicating if point is within radius
 * @throws Error if coordinates are invalid or outside Egyptian boundaries
 */
export const isWithinRadius = (
  center: Coordinates,
  point: Coordinates,
  radiusKm: number
): boolean => {
  if (radiusKm <= 0) {
    throw new Error('Radius must be greater than 0');
  }

  // Validate coordinates
  if (!validateEgyptianCoordinates(center) || !validateEgyptianCoordinates(point)) {
    throw new Error('Coordinates must be within Egyptian boundaries');
  }

  // Apply urban density correction to radius
  const urbanFactor = getUrbanDensityFactor(center);
  const adjustedRadius = radiusKm * urbanFactor;

  // Calculate distance and compare with adjusted radius
  const distance = calculateDistance(center, point);
  return distance <= adjustedRadius;
};

/**
 * Validates if coordinates are within Egyptian geographic boundaries
 * with additional checks for restricted zones.
 * 
 * @param coordinates - Geographic coordinates to validate
 * @returns Boolean indicating if coordinates are valid
 */
export const validateEgyptianCoordinates = (coordinates: Coordinates): boolean => {
  // Check coordinate precision
  const latPrecision = coordinates.latitude.toString().split('.')[1]?.length || 0;
  const lonPrecision = coordinates.longitude.toString().split('.')[1]?.length || 0;
  
  if (latPrecision > COORDINATE_PRECISION || lonPrecision > COORDINATE_PRECISION) {
    return false;
  }

  // Check if within Egypt's boundaries
  if (coordinates.latitude < EGYPT_BOUNDARIES.minLatitude ||
      coordinates.latitude > EGYPT_BOUNDARIES.maxLatitude ||
      coordinates.longitude < EGYPT_BOUNDARIES.minLongitude ||
      coordinates.longitude > EGYPT_BOUNDARIES.maxLongitude) {
    return false;
  }

  // Check restricted zones
  for (const zone of RESTRICTED_ZONES) {
    if (coordinates.latitude >= zone.bounds.south &&
        coordinates.latitude <= zone.bounds.north &&
        coordinates.longitude >= zone.bounds.west &&
        coordinates.longitude <= zone.bounds.east) {
      return false;
    }
  }

  return true;
};