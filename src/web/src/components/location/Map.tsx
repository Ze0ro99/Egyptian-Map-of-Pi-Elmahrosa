/**
 * @fileoverview Enhanced Map component for Egyptian Map of Pi
 * Implements interactive map interface with RTL support, clustering, and offline capabilities
 * @version 1.0.0
 */

import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import mapboxgl from 'mapbox-gl'; // v2.15.0
import { Box } from '@mui/material'; // v5.14.0

import MapMarker from './MapMarker';
import { mapConfig, getMapboxConfig, initializeRTLTextPlugin, isWithinEgyptBounds } from '../../config/maps.config';
import { GeolocationService } from '../../services/geolocation.service';
import { Location, Coordinates } from '../../interfaces/location.interface';

/**
 * Props interface for the Map component
 */
interface MapProps {
  markers?: Location[];
  interactive?: boolean;
  onLocationSelect?: (location: Location) => void;
  selectedLocation?: Location;
  showUserLocation?: boolean;
  style?: React.CSSProperties;
  enableClustering?: boolean;
  enableOfflineSupport?: boolean;
  onMapError?: (error: Error) => void;
  accessibilityLabels?: {
    mapContainer?: string;
    locationMarker?: string;
    userLocation?: string;
  };
}

/**
 * Enhanced Map component with comprehensive features for Egyptian Map of Pi
 */
const Map: React.FC<MapProps> = React.memo(({
  markers = [],
  interactive = true,
  onLocationSelect,
  selectedLocation,
  showUserLocation = false,
  style = {},
  enableClustering = true,
  enableOfflineSupport = true,
  onMapError,
  accessibilityLabels = {
    mapContainer: 'Interactive map of Egypt',
    locationMarker: 'Location marker',
    userLocation: 'Your current location'
  }
}) => {
  // Refs and state
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const clusterRef = useRef<mapboxgl.Supercluster | null>(null);
  const geolocationService = useRef(new GeolocationService());
  const [userMarker, setUserMarker] = useState<mapboxgl.Marker | null>(null);

  /**
   * Initializes the map with enhanced features
   */
  const initializeMap = useCallback(async () => {
    try {
      if (!mapContainerRef.current) return;

      // Initialize RTL plugin for Arabic support
      await initializeRTLTextPlugin();

      // Configure Mapbox with access token
      const { accessToken } = getMapboxConfig();
      mapboxgl.accessToken = accessToken;

      // Create map instance
      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: mapConfig.style,
        center: [mapConfig.defaultCenter.longitude, mapConfig.defaultCenter.latitude],
        zoom: mapConfig.defaultZoom,
        minZoom: mapConfig.minZoom,
        maxZoom: mapConfig.maxZoom,
        maxBounds: mapConfig.maxBounds,
        attributionControl: false,
        localIdeographFontFamily: "'Noto Sans Arabic', sans-serif",
        dragRotate: false,
        touchZoomRotate: false
      });

      // Add navigation controls with RTL support
      const nav = new mapboxgl.NavigationControl({ showCompass: false });
      map.addControl(nav, 'top-left');

      // Enable offline support if requested
      if (enableOfflineSupport) {
        await map.once('style.load');
        const offlineStorage = new mapboxgl.OfflineStorage();
        await offlineStorage.setMaximumTileCount(10000);
      }

      // Add map event listeners
      map.on('load', () => {
        if (enableClustering) {
          initializeClusterLayer(map);
        }
        updateMarkers();
      });

      if (interactive) {
        map.on('click', handleMapClick);
      }

      // Store map reference
      mapRef.current = map;

      // Initialize user location tracking if enabled
      if (showUserLocation) {
        initializeUserLocation();
      }

    } catch (error) {
      console.error('Map initialization error:', error);
      onMapError?.(error as Error);
    }
  }, [interactive, enableClustering, showUserLocation, enableOfflineSupport]);

  /**
   * Handles map click events with location validation
   */
  const handleMapClick = useCallback((event: mapboxgl.MapMouseEvent) => {
    if (!interactive || !onLocationSelect || !mapRef.current) return;

    const coordinates: Coordinates = {
      longitude: event.lngLat.lng,
      latitude: event.lngLat.lat
    };

    if (!isWithinEgyptBounds(coordinates)) {
      onMapError?.(new Error('Selected location is outside Egypt'));
      return;
    }

    const location: Location = {
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
      type: 'DELIVERY_ADDRESS',
      isVerified: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    onLocationSelect(location);
  }, [interactive, onLocationSelect]);

  /**
   * Initializes user location tracking
   */
  const initializeUserLocation = useCallback(async () => {
    try {
      const location = await geolocationService.current.getCurrentPosition();
      
      if (mapRef.current && userMarker) {
        userMarker.remove();
      }

      const marker = new mapboxgl.Marker({
        color: '#0066FF',
        scale: 0.8
      })
        .setLngLat([location.coordinates.longitude, location.coordinates.latitude])
        .addTo(mapRef.current!);

      setUserMarker(marker);

      // Watch position changes
      geolocationService.current.watchPosition((newLocation) => {
        marker.setLngLat([
          newLocation.coordinates.longitude,
          newLocation.coordinates.latitude
        ]);
      });

    } catch (error) {
      console.error('User location error:', error);
      onMapError?.(error as Error);
    }
  }, []);

  /**
   * Updates markers on the map
   */
  const updateMarkers = useCallback(() => {
    if (!mapRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current.clear();

    // Add new markers
    markers.forEach(location => {
      const marker = new MapMarker({
        location,
        isSelected: selectedLocation?.id === location.id,
        onClick: onLocationSelect
      });

      markersRef.current.set(location.id, marker);
    });
  }, [markers, selectedLocation, onLocationSelect]);

  /**
   * Initializes cluster layer for marker clustering
   */
  const initializeClusterLayer = useCallback((map: mapboxgl.Map) => {
    map.addSource('clusters', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: []
      },
      cluster: true,
      clusterMaxZoom: mapConfig.clusterMaxZoom,
      clusterRadius: mapConfig.clusterRadius
    });

    map.addLayer({
      id: 'clusters',
      type: 'circle',
      source: 'clusters',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': '#51bbd6',
        'circle-radius': 18
      }
    });
  }, []);

  // Initialize map on mount
  useEffect(() => {
    initializeMap();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
      }
      if (showUserLocation) {
        geolocationService.current.stopWatchingPosition();
      }
    };
  }, []);

  // Update markers when props change
  useEffect(() => {
    updateMarkers();
  }, [markers, selectedLocation]);

  return (
    <Box
      ref={mapContainerRef}
      sx={{
        width: '100%',
        height: '100%',
        minHeight: '300px',
        position: 'relative',
        ...style
      }}
      role="region"
      aria-label={accessibilityLabels.mapContainer}
    />
  );
});

Map.displayName = 'Map';

export default Map;