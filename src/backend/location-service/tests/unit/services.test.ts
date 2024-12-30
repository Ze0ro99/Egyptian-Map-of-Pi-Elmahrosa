/**
 * @fileoverview Comprehensive unit tests for location service components
 * Testing geocoding, mapping, and Egyptian-specific location requirements
 * 
 * @version 1.0.0
 */

import { GeocodingService } from '../../src/services/geocoding.service';
import { MapsService } from '../../src/services/maps.service';
import { LocationType, Coordinates, BilingualAddress } from '../../src/interfaces/location.interface';
import { mapsConfig } from '../../src/config/maps.config';
import MockAdapter from 'axios-mock-adapter';
import axios from 'axios';

// Mock Redis client
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    on: jest.fn()
  }))
}));

describe('Location Services Tests', () => {
  let geocodingService: GeocodingService;
  let mapsService: MapsService;
  let mockAxios: MockAdapter;

  // Sample test data
  const validCairoAddress: BilingualAddress = {
    streetAr: 'شارع التحرير',
    streetEn: 'Tahrir Street',
    cityAr: 'القاهرة',
    cityEn: 'Cairo',
    governorateAr: 'القاهرة',
    governorateEn: 'Cairo',
    postalCode: '11511'
  };

  const validCairoCoordinates: Coordinates = {
    latitude: 30.0444,
    longitude: 31.2357,
    accuracy: 0.0001
  };

  const militaryZoneCoordinates: Coordinates = {
    latitude: 30.1234,
    longitude: 33.4567,
    accuracy: 0.001
  };

  beforeEach(() => {
    geocodingService = new GeocodingService();
    mapsService = new MapsService();
    mockAxios = new MockAdapter(axios);
  });

  afterEach(() => {
    mockAxios.reset();
    jest.clearAllMocks();
  });

  describe('GeocodingService', () => {
    describe('geocodeAddress', () => {
      it('should successfully geocode a bilingual Cairo address', async () => {
        // Mock geocoding API response
        mockAxios.onGet('/geocode').reply(200, {
          coordinates: validCairoCoordinates,
          precision: 6
        });

        const result = await geocodingService.geocodeAddress(validCairoAddress);

        expect(result).toEqual(expect.objectContaining({
          latitude: expect.any(Number),
          longitude: expect.any(Number),
          accuracy: expect.any(Number)
        }));
        expect(result.latitude).toBeCloseTo(validCairoCoordinates.latitude, 6);
        expect(result.longitude).toBeCloseTo(validCairoCoordinates.longitude, 6);
      });

      it('should reject coordinates in military zones', async () => {
        mockAxios.onGet('/geocode').reply(200, {
          coordinates: militaryZoneCoordinates,
          precision: 6
        });

        await expect(geocodingService.geocodeAddress(validCairoAddress))
          .rejects.toThrow('Location outside Egyptian boundaries or in restricted zone');
      });

      it('should handle Arabic address input correctly', async () => {
        const arabicOnlyAddress = {
          ...validCairoAddress,
          streetEn: '',
          cityEn: '',
          governorateEn: ''
        };

        mockAxios.onGet('/geocode').reply(200, {
          coordinates: validCairoCoordinates,
          precision: 6
        });

        const result = await geocodingService.geocodeAddress(arabicOnlyAddress);
        expect(result).toBeDefined();
        expect(result.accuracy).toBeGreaterThan(0);
      });

      it('should utilize caching for repeated requests', async () => {
        mockAxios.onGet('/geocode').replyOnce(200, {
          coordinates: validCairoCoordinates,
          precision: 6
        });

        // First request
        await geocodingService.geocodeAddress(validCairoAddress);
        
        // Second request should use cache
        const cachedResult = await geocodingService.geocodeAddress(validCairoAddress);
        
        expect(mockAxios.history.get.length).toBe(1);
        expect(cachedResult).toEqual(validCairoCoordinates);
      });
    });

    describe('validateAddress', () => {
      it('should validate addresses within Egyptian boundaries', async () => {
        mockAxios.onGet('/geocode').reply(200, {
          coordinates: validCairoCoordinates,
          precision: 6
        });

        const result = await geocodingService.validateAddress(validCairoAddress);
        expect(result).toBe(true);
      });

      it('should reject addresses outside Egypt', async () => {
        const invalidCoordinates: Coordinates = {
          latitude: 35.0,
          longitude: 35.0,
          accuracy: 0.0001
        };

        mockAxios.onGet('/geocode').reply(200, {
          coordinates: invalidCoordinates,
          precision: 6
        });

        const result = await geocodingService.validateAddress(validCairoAddress);
        expect(result).toBe(false);
      });
    });
  });

  describe('MapsService', () => {
    describe('findNearbyLocations', () => {
      it('should find locations within specified radius considering urban density', async () => {
        const searchRadius = 5; // 5km
        const mockLocations = [
          {
            coordinates: {
              latitude: 30.0445,
              longitude: 31.2358,
              accuracy: 0.0001
            },
            type: LocationType.STORE
          }
        ];

        // Mock geospatial query results
        jest.spyOn(mapsService as any, 'executeGeospatialQuery')
          .mockResolvedValue(mockLocations);

        const results = await mapsService.findNearbyLocations(
          validCairoCoordinates,
          searchRadius,
          LocationType.STORE,
          true
        );

        expect(results).toHaveLength(1);
        expect(results[0].coordinates).toEqual(
          expect.objectContaining({
            latitude: expect.any(Number),
            longitude: expect.any(Number)
          })
        );
      });

      it('should apply urban density factors in Cairo', async () => {
        const searchRadius = 10; // 10km
        jest.spyOn(mapsService as any, 'calculateUrbanDensityFactor')
          .mockResolvedValue(0.7); // High density factor

        await mapsService.findNearbyLocations(
          validCairoCoordinates,
          searchRadius,
          LocationType.STORE,
          true
        );

        // Verify density factor was applied
        expect(mapsService['executeGeospatialQuery']).toHaveBeenCalledWith(
          validCairoCoordinates,
          7, // 10km * 0.7 density factor
          LocationType.STORE
        );
      });

      it('should reject searches in military zones', async () => {
        await expect(
          mapsService.findNearbyLocations(
            militaryZoneCoordinates,
            5,
            LocationType.STORE
          )
        ).rejects.toThrow('Location outside Egypt boundaries');
      });
    });

    describe('isWithinEgypt', () => {
      it('should validate coordinates within Egypt', async () => {
        const result = await mapsService.isWithinEgypt(validCairoCoordinates);
        expect(result).toBe(true);
      });

      it('should reject coordinates in military zones', async () => {
        const result = await mapsService.isWithinEgypt(militaryZoneCoordinates);
        expect(result).toBe(false);
      });

      it('should reject coordinates outside Egypt', async () => {
        const outsideEgypt: Coordinates = {
          latitude: 35.0,
          longitude: 35.0,
          accuracy: 0.0001
        };
        const result = await mapsService.isWithinEgypt(outsideEgypt);
        expect(result).toBe(false);
      });
    });

    describe('calculateUrbanDensityFactor', () => {
      it('should return high density factor for Cairo during rush hour', async () => {
        // Mock rush hour time
        jest.spyOn(Date.prototype, 'getHours').mockReturnValue(9);

        const factor = await (mapsService as any)
          .calculateUrbanDensityFactor(validCairoCoordinates);
        
        expect(factor).toBe(0.7); // High density factor
      });

      it('should return lower density factor for non-rush hours', async () => {
        // Mock non-rush hour time
        jest.spyOn(Date.prototype, 'getHours').mockReturnValue(14);

        const factor = await (mapsService as any)
          .calculateUrbanDensityFactor(validCairoCoordinates);
        
        expect(factor).toBe(0.85); // Medium density factor
      });
    });
  });
});