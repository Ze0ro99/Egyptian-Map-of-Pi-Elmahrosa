/**
 * @fileoverview Integration tests for marketplace listing functionality with Egyptian market adaptations.
 * Tests CRUD operations, bilingual content, location validation, and market-specific features.
 * 
 * @version 1.0.0
 */

import { describe, test, expect, beforeAll, afterAll, jest } from '@jest/globals'; // v29.0.0
import { MongoMemoryServer } from 'mongodb-memory-server'; // v8.0.0
import mongoose from 'mongoose'; // v6.0.0
import { ListingService } from '../../src/services/listing.service';
import { ListingStatus } from '../../src/interfaces/listing.interface';
import { MerchantVerificationStatus } from '../../src/interfaces/merchant.interface';
import { EGYPTIAN_COORDINATES } from '../../src/constants/location.constants';

describe('Egyptian Market Listing Integration Tests', () => {
  let mongoServer: MongoMemoryServer;
  let listingService: ListingService;
  const mockImageService = {
    optimizeForEgyptianNetwork: jest.fn().mockImplementation((url) => Promise.resolve(url))
  };
  const mockSearchService = {
    indexListing: jest.fn().mockResolvedValue(undefined),
    updateListingIndex: jest.fn().mockResolvedValue(undefined)
  };
  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn()
  };
  const mockContentValidator = {
    validateArabicText: jest.fn().mockResolvedValue(true),
    validateEnglishText: jest.fn().mockResolvedValue(true),
    validateCulturalSensitivity: jest.fn().mockResolvedValue(true)
  };
  const mockLogger = {
    info: jest.fn(),
    error: jest.fn()
  };

  beforeAll(async () => {
    // Initialize MongoDB Memory Server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Initialize ListingService with mocked dependencies
    listingService = new ListingService(
      {} as any, // listingRepository will be initialized by inversify
      mockImageService as any,
      mockSearchService as any,
      mockCacheManager as any,
      mockContentValidator as any,
      mockLogger as any
    );
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe('Listing Creation', () => {
    test('should create listing with valid bilingual content', async () => {
      const validListing = {
        sellerId: new mongoose.Types.ObjectId().toString(),
        titleAr: 'هاتف آيفون ١٣ برو',
        titleEn: 'iPhone 13 Pro',
        descriptionAr: 'هاتف ذكي بحالة ممتازة مع جميع الملحقات',
        descriptionEn: 'Smartphone in excellent condition with all accessories',
        category: 'Electronics',
        price: 1200,
        images: ['https://example.com/image1.jpg'],
        location: {
          type: 'Point',
          coordinates: [31.2357, 30.0444] // Cairo coordinates
        },
        governorate: 'Cairo',
        tags: ['phones', 'apple', 'هواتف'],
        condition: 'Used'
      };

      const result = await listingService.createListing(validListing);

      expect(result).toBeDefined();
      expect(result.titleAr).toBe(validListing.titleAr);
      expect(result.titleEn).toBe(validListing.titleEn);
      expect(result.status).toBe(ListingStatus.DRAFT);
      expect(mockContentValidator.validateArabicText).toHaveBeenCalledWith(validListing.titleAr, 'title');
      expect(mockContentValidator.validateEnglishText).toHaveBeenCalledWith(validListing.titleEn, 'title');
    });

    test('should reject listing with invalid Egyptian location', async () => {
      const invalidLocationListing = {
        // ...listing data with coordinates outside Egypt
        location: {
          type: 'Point',
          coordinates: [35.5, 35.5] // Outside Egypt
        }
      };

      await expect(listingService.createListing(invalidLocationListing))
        .rejects
        .toThrow('Location must be within Egyptian boundaries');
    });
  });

  describe('Location Validation', () => {
    test('should validate coordinates within Egyptian boundaries', async () => {
      const validLocations = [
        [31.2357, 30.0444], // Cairo
        [29.9187, 31.2001], // Giza
        [31.2001, 29.9187]  // Alexandria
      ];

      for (const coordinates of validLocations) {
        const listing = {
          // ...base listing data
          location: {
            type: 'Point',
            coordinates
          }
        };

        expect(() => listingService['validateEgyptianLocation'](listing.location))
          .not.toThrow();
      }
    });

    test('should validate Egyptian governorate names', async () => {
      const validGovernorate = {
        // ...base listing data
        governorate: 'Cairo',
        location: {
          type: 'Point',
          coordinates: [31.2357, 30.0444]
        }
      };

      const result = await listingService.createListing(validGovernorate);
      expect(result.governorate).toBe('Cairo');
    });
  });

  describe('Arabic Search Optimization', () => {
    test('should perform optimized search with Arabic text', async () => {
      const searchTerm = 'آيفون';
      const filter = {
        searchTerm,
        category: 'Electronics',
        governorate: 'Cairo'
      };

      mockCacheManager.get.mockResolvedValueOnce(null);
      
      await listingService.getListings(filter);

      expect(mockSearchService.indexListing).toHaveBeenCalled();
      expect(mockCacheManager.set).toHaveBeenCalled();
    });
  });

  describe('Cultural Sensitivity', () => {
    test('should validate content for cultural sensitivity', async () => {
      const listingWithSensitiveContent = {
        // ...base listing data
        titleAr: 'محتوى حساس',
        descriptionAr: 'وصف حساس'
      };

      await expect(listingService.createListing(listingWithSensitiveContent))
        .resolves
        .toBeDefined();
      
      expect(mockContentValidator.validateCulturalSensitivity)
        .toHaveBeenCalledWith(expect.arrayContaining([
          listingWithSensitiveContent.titleAr,
          listingWithSensitiveContent.descriptionAr
        ]));
    });
  });

  describe('Image Processing', () => {
    test('should optimize images for Egyptian network conditions', async () => {
      const listingWithImages = {
        // ...base listing data
        images: [
          'https://example.com/image1.jpg',
          'https://example.com/image2.jpg'
        ]
      };

      await listingService.createListing(listingWithImages);

      expect(mockImageService.optimizeForEgyptianNetwork)
        .toHaveBeenCalledTimes(listingWithImages.images.length);
    });
  });

  describe('Caching Strategy', () => {
    test('should implement market-specific caching', async () => {
      const filter = {
        governorate: 'Cairo',
        category: 'Electronics'
      };

      // First call - cache miss
      mockCacheManager.get.mockResolvedValueOnce(null);
      await listingService.getListings(filter);

      // Second call - cache hit
      mockCacheManager.get.mockResolvedValueOnce([/* cached listings */]);
      await listingService.getListings(filter);

      expect(mockCacheManager.set).toHaveBeenCalledTimes(1);
      expect(mockCacheManager.get).toHaveBeenCalledTimes(2);
    });
  });
});