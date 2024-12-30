/**
 * @fileoverview Integration tests for the Egyptian Map of Pi location service
 * Tests geocoding, maps functionality, location-based operations, military zone 
 * restrictions, and bilingual support with real MongoDB and external map service integrations.
 * 
 * @version 1.0.0
 */

import { describe, test, expect, beforeAll, afterAll, jest } from '@jest/globals'; // ^29.0.0
import mongoose from 'mongoose'; // ^6.0.0
import supertest from 'supertest'; // ^6.3.0
import nock from 'nock'; // ^13.0.0
import MapsService from '../../src/services/maps.service';
import GeocodingService from '../../src/services/geocoding.service';
import { Coordinates, LocationType } from '../../src/interfaces/location.interface';
import { EGYPT_BOUNDARIES } from '../../src/config/maps.config';

// Test timeout configuration for slower network operations
jest.setTimeout(30000);

// Test data constants
const VALID_CAIRO_COORDINATES: Coordinates = {
  latitude: 30.0444,
  longitude: 31.2357,
  accuracy: 10
};

const VALID_ALEXANDRIA_COORDINATES: Coordinates = {
  latitude: 31.2001,
  longitude: 29.9187,
  accuracy: 10
};

const RESTRICTED_ZONE_COORDINATES: Coordinates = {
  latitude: 30.1234,
  longitude: 33.4567,
  accuracy: 10
};

const TEST_ADDRESS = {
  streetAr: 'شارع التحرير',
  streetEn: 'Tahrir Street',
  cityAr: 'القاهرة',
  cityEn: 'Cairo',
  governorateAr: 'القاهرة',
  governorateEn: 'Cairo',
  postalCode: '11511'
};

describe('Location Service Integration Tests', () => {
  let mapsService: MapsService;
  let geocodingService: GeocodingService;
  let mongoConnection: typeof mongoose;

  beforeAll(async () => {
    // Connect to test MongoDB instance
    mongoConnection = await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/egyptian-map-pi-test');

    // Initialize services
    mapsService = new MapsService();
    geocodingService = new GeocodingService();

    // Configure nock for external service mocking
    nock.disableNetConnect();
    nock.enableNetConnect('127.0.0.1');
  });

  afterAll(async () => {
    await mongoConnection.disconnect();
    nock.cleanAll();
    nock.enableNetConnect();
  });

  describe('MapsService Integration', () => {
    test('should find nearby locations within Cairo with density optimization', async () => {
      const result = await mapsService.findNearbyLocations(
        VALID_CAIRO_COORDINATES,
        5, // 5km radius
        LocationType.STORE,
        true // consider density
      );

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBeTruthy();
      result.forEach(location => {
        expect(location.coordinates).toBeDefined();
        expect(location.type).toBe(LocationType.STORE);
      });
    });

    test('should reject locations in military zones', async () => {
      await expect(
        mapsService.findNearbyLocations(
          RESTRICTED_ZONE_COORDINATES,
          5,
          LocationType.STORE
        )
      ).rejects.toThrow('Location outside Egypt boundaries or in restricted zone');
    });

    test('should validate location within Egypt boundaries', async () => {
      const validResult = await mapsService.isWithinEgypt(VALID_CAIRO_COORDINATES);
      expect(validResult).toBeTruthy();

      const invalidResult = await mapsService.isWithinEgypt({
        latitude: 0,
        longitude: 0,
        accuracy: 10
      });
      expect(invalidResult).toBeFalsy();
    });

    test('should optimize search radius based on urban density', async () => {
      const denseAreaResult = await mapsService.findNearbyLocations(
        VALID_CAIRO_COORDINATES,
        10,
        LocationType.STORE,
        true
      );

      const ruralAreaResult = await mapsService.findNearbyLocations({
        latitude: 29.3,
        longitude: 30.8,
        accuracy: 10
      },
      10,
      LocationType.STORE,
      true
      );

      // Dense areas should have more granular results
      expect(denseAreaResult.length).toBeGreaterThanOrEqual(ruralAreaResult.length);
    });
  });

  describe('GeocodingService Integration', () => {
    test('should geocode Arabic address correctly', async () => {
      const coordinates = await geocodingService.geocodeAddress({
        ...TEST_ADDRESS,
        street: TEST_ADDRESS.streetAr,
        city: TEST_ADDRESS.cityAr,
        governorate: TEST_ADDRESS.governorateAr
      });

      expect(coordinates).toBeDefined();
      expect(coordinates.latitude).toBeCloseTo(VALID_CAIRO_COORDINATES.latitude, 2);
      expect(coordinates.longitude).toBeCloseTo(VALID_CAIRO_COORDINATES.longitude, 2);
    });

    test('should reverse geocode coordinates to bilingual address', async () => {
      const address = await geocodingService.reverseGeocode(VALID_CAIRO_COORDINATES);

      expect(address).toBeDefined();
      expect(address.streetAr).toBeDefined();
      expect(address.streetEn).toBeDefined();
      expect(address.cityAr).toBeDefined();
      expect(address.cityEn).toBeDefined();
      expect(address.governorateAr).toBeDefined();
      expect(address.governorateEn).toBeDefined();
    });

    test('should validate addresses within Egypt', async () => {
      const validResult = await geocodingService.validateAddress(TEST_ADDRESS);
      expect(validResult).toBeTruthy();

      const invalidAddress = {
        ...TEST_ADDRESS,
        cityEn: 'London',
        cityAr: 'لندن'
      };
      const invalidResult = await geocodingService.validateAddress(invalidAddress);
      expect(invalidResult).toBeFalsy();
    });
  });

  describe('Location Service Performance', () => {
    test('should handle concurrent location queries efficiently', async () => {
      const promises = Array(10).fill(null).map(() => 
        mapsService.findNearbyLocations(
          VALID_CAIRO_COORDINATES,
          5,
          LocationType.STORE
        )
      );

      const results = await Promise.all(promises);
      results.forEach(result => {
        expect(Array.isArray(result)).toBeTruthy();
      });
    });

    test('should maintain response times within SLA', async () => {
      const start = Date.now();
      await mapsService.findNearbyLocations(
        VALID_ALEXANDRIA_COORDINATES,
        5,
        LocationType.STORE
      );
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(2000); // 2 second SLA
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle invalid coordinates gracefully', async () => {
      const invalidCoordinates = {
        latitude: 999,
        longitude: 999,
        accuracy: 10
      };

      await expect(
        mapsService.findNearbyLocations(invalidCoordinates, 5)
      ).rejects.toThrow();
    });

    test('should handle network timeouts appropriately', async () => {
      // Mock network timeout
      nock('https://geocode.egypt-maps.com')
        .get('/v1/geocode')
        .delay(5000)
        .reply(408);

      await expect(
        geocodingService.geocodeAddress(TEST_ADDRESS)
      ).rejects.toThrow();
    });

    test('should validate search radius constraints', async () => {
      await expect(
        mapsService.findNearbyLocations(VALID_CAIRO_COORDINATES, 0)
      ).rejects.toThrow('Invalid search radius');

      await expect(
        mapsService.findNearbyLocations(VALID_CAIRO_COORDINATES, 1000)
      ).rejects.toThrow('Invalid search radius');
    });
  });
});