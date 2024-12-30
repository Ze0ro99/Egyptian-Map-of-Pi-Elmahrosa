/**
 * @fileoverview MapMarker component for Egyptian Map of Pi
 * Implements accessible, RTL-aware map markers with type-specific styling
 * @version 1.0.0
 */

import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import mapboxgl from 'mapbox-gl'; // v2.15.0
import { Tooltip } from '@mui/material'; // v5.14.0
import { Location, LocationType } from '../../interfaces/location.interface';

/**
 * Custom styling interface for marker appearance
 */
interface MarkerStyle {
  color: string;
  size: string;
  animation: string;
}

/**
 * Props interface for the MapMarker component
 */
interface MapMarkerProps {
  location: Location;
  isSelected?: boolean;
  onClick?: (location: Location) => void;
  style?: Partial<MarkerStyle>;
}

/**
 * Default marker styles by location type
 */
const DEFAULT_MARKER_STYLES: Record<LocationType, MarkerStyle> = {
  [LocationType.STORE]: {
    color: '#2196F3',
    size: '44px',
    animation: 'bounce',
  },
  [LocationType.PICKUP_POINT]: {
    color: '#4CAF50',
    size: '44px',
    animation: 'pulse',
  },
  [LocationType.DELIVERY_ADDRESS]: {
    color: '#FFC107',
    size: '44px',
    animation: 'none',
  },
  [LocationType.MARKETPLACE]: {
    color: '#9C27B0',
    size: '48px',
    animation: 'pulse',
  },
  [LocationType.SERVICE_LOCATION]: {
    color: '#FF5722',
    size: '44px',
    animation: 'none',
  },
};

/**
 * Memoized map marker component with accessibility and RTL support
 */
const MapMarker: React.FC<MapMarkerProps> = React.memo(({ 
  location, 
  isSelected = false, 
  onClick, 
  style = {} 
}) => {
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const elementRef = useRef<HTMLDivElement | null>(null);

  /**
   * Creates styled marker element with accessibility attributes
   */
  const createMarkerElement = useCallback(() => {
    const element = document.createElement('div');
    const defaultStyle = DEFAULT_MARKER_STYLES[location.type];
    const markerStyle = { ...defaultStyle, ...style };

    // Apply base styles with proper touch target size
    element.style.width = markerStyle.size;
    element.style.height = markerStyle.size;
    element.style.backgroundColor = markerStyle.color;
    element.style.borderRadius = '50%';
    element.style.cursor = 'pointer';
    element.style.touchAction = 'manipulation';
    element.style.transform = 'translate(-50%, -50%)';
    element.style.transition = 'all 0.3s ease';

    // Add accessibility attributes
    element.setAttribute('role', 'button');
    element.setAttribute('aria-label', `${location.address.streetAr}, ${location.address.cityAr}`);
    element.setAttribute('dir', 'rtl');
    element.setAttribute('tabindex', '0');

    // Add selected state styling
    if (isSelected) {
      element.style.boxShadow = `0 0 0 4px ${markerStyle.color}40`;
      element.style.transform = 'translate(-50%, -50%) scale(1.1)';
    }

    // Add animation if specified
    if (markerStyle.animation !== 'none') {
      element.style.animation = `${markerStyle.animation} 2s infinite`;
    }

    // Add high contrast mode support
    element.style.border = '2px solid currentColor';

    elementRef.current = element;
    return element;
  }, [location, isSelected, style]);

  /**
   * Initializes or updates marker with new position and styling
   */
  const updateMarker = useCallback(() => {
    if (markerRef.current) {
      markerRef.current.remove();
    }

    const marker = new mapboxgl.Marker({
      element: createMarkerElement(),
      anchor: 'center',
      draggable: false,
      rotationAlignment: 'auto',
    })
      .setLngLat([location.coordinates.longitude, location.coordinates.latitude]);

    // Add click handler with proper touch event handling
    if (onClick) {
      marker.getElement().addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick(location);
      });

      // Add keyboard support
      marker.getElement().addEventListener('keypress', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(location);
        }
      });
    }

    markerRef.current = marker;
    return marker;
  }, [location, onClick, createMarkerElement]);

  // Initialize marker on mount and update on prop changes
  useEffect(() => {
    const marker = updateMarker();
    return () => {
      marker.remove();
      markerRef.current = null;
    };
  }, [updateMarker]);

  // Memoize tooltip content for performance
  const tooltipContent = useMemo(() => (
    <div dir="rtl">
      <div>{location.address.streetAr}</div>
      <div>{location.address.districtAr}</div>
      <div>{location.address.cityAr}</div>
    </div>
  ), [location.address]);

  // Render marker with tooltip
  return elementRef.current ? (
    <Tooltip
      title={tooltipContent}
      placement="top"
      arrow
      enterDelay={500}
      leaveDelay={200}
      PopperProps={{
        modifiers: [{
          name: 'offset',
          options: {
            offset: [0, -10],
          },
        }],
      }}
    >
      <div ref={elementRef} />
    </Tooltip>
  ) : null;
});

MapMarker.displayName = 'MapMarker';

// Define keyframe animations
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes bounce {
    0%, 100% { transform: translate(-50%, -50%) scale(1); }
    50% { transform: translate(-50%, -60%) scale(1.1); }
  }
  
  @keyframes pulse {
    0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
    50% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.8; }
    100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
  }
`;
document.head.appendChild(styleSheet);

export default MapMarker;