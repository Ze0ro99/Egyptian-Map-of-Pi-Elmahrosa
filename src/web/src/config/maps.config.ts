/**
 * @fileoverview Map configuration for the Egyptian Map of Pi web application
 * Defines geographic boundaries, zoom levels, and Mapbox settings for Egypt-specific map rendering
 * @version 1.0.0
 */

// mapbox-gl v2.15.0
import mapboxgl, { LngLatBoundsLike } from 'mapbox-gl';
import { Coordinates } from '../interfaces/location.interface';

/**
 * Geographic boundaries of Egypt for map constraints
 * North: Mediterranean Sea (31.8122°N)
 * South: Sudan border (21.7377°N)
 * East: Red Sea (36.8945°E)
 * West: Libya border (24.7002°E)
 */
export const mapConfig = {
  // Cairo city center as default map center
  defaultCenter: {
    latitude: 30.0444,
    longitude: 31.2357
  } as Coordinates,

  // Default zoom level optimized for mobile viewing
  defaultZoom: 12,

  // Zoom constraints for proper map display
  minZoom: 5,
  maxZoom: 18,

  // Geographic boundaries of Egypt
  bounds: {
    north: 31.8122, // Mediterranean Sea
    south: 21.7377, // Sudan border
    east: 36.8945,  // Red Sea
    west: 24.7002   // Libya border
  },

  // Mapbox style URL for street map view
  style: 'mapbox://styles/mapbox/streets-v11',

  // Maximum bounds to restrict map panning
  maxBounds: [
    [24.7002, 21.7377], // Southwest coordinates [lng, lat]
    [36.8945, 31.8122]  // Northeast coordinates [lng, lat]
  ] as LngLatBoundsLike,

  // Marker clustering settings
  clusterRadius: 50,        // Radius of each cluster when clustering points
  clusterMaxZoom: 14,       // Maximum zoom level where clustering is enabled

  // RTL text plugin for Arabic language support
  rtlTextPlugin: 'https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-rtl-text/v0.2.3/mapbox-gl-rtl-text.js'
};

/**
 * Returns Mapbox configuration with access token and RTL text plugin settings
 * @returns {Object} Mapbox configuration object
 * @throws {Error} If MAPBOX_ACCESS_TOKEN is not defined
 */
export const getMapboxConfig = () => {
  const accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  if (!accessToken) {
    throw new Error('MAPBOX_ACCESS_TOKEN environment variable is not defined');
  }

  return {
    accessToken,
    rtlTextPluginUrl: mapConfig.rtlTextPlugin
  };
};

/**
 * Initialize RTL text plugin for Arabic language support
 * Should be called before rendering the map
 */
export const initializeRTLTextPlugin = () => {
  if (!mapboxgl.getRTLTextPluginStatus()) {
    mapboxgl.setRTLTextPlugin(
      mapConfig.rtlTextPlugin,
      (error: Error) => {
        if (error) {
          console.error('Error loading RTL text plugin:', error);
        }
      },
      // Ensure the plugin is loaded only once
      true
    );
  }
};

/**
 * Validates if coordinates are within Egypt's boundaries
 * @param {Coordinates} coordinates - The coordinates to validate
 * @returns {boolean} True if coordinates are within Egypt's boundaries
 */
export const isWithinEgyptBounds = (coordinates: Coordinates): boolean => {
  const { latitude, longitude } = coordinates;
  const { north, south, east, west } = mapConfig.bounds;

  return (
    latitude >= south &&
    latitude <= north &&
    longitude >= west &&
    longitude <= east
  );
};