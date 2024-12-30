/**
 * @fileoverview Unit tests for marketplace service with specialized validation for Egyptian market requirements
 * including bilingual content validation, location boundaries, cultural sensitivity checks, and Pi price validation.
 * 
 * @version 1.0.0
 */

import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { MockInstance } from 'jest-mock';
import { ListingService } from '../../src/services/listing.service';
import { ListingStatus } from '../../src/interfaces/listing.interface';
import { ServiceError } from '../../../shared/errors/service.error';
import { EGYPTIAN_COORDINATES } from '../../src/constants/location.constants';

// Mock dependencies
jest.mock('../../src/repositories/listing.repository');
jest.mock('../../../shared/services/cache.manager');
jest.mock('../../../shared/services/content.validator');
jest.mock('./image.service');
jest.mock('./search.service');
jest.mock('../../../shared/services/logger');

describe('ListingService - Egyptian Market Validation', () => {
  let listingService: ListingService;
  let mockListingRepository: jest.Mocked<any>;
  let mockImageService: jest.Mocked<any>;
  let mockSearchService: jest.Mocked<any>;
  let mockCacheManager: jest.Mocked<any>;
  let mockContentValidator: jest.Mocked<any>;
  let mockLogger: jest.Mocked<any>;

  // Test data with bilingual content
  const testListingData = {
    sellerId: 'test-seller-123',
    titleAr: 'هاتف ذكي جديد',
    titleEn: 'New Smartphone',
    descriptionAr: 'هاتف ذكي بحالة ممتازة مع كامل ملحقاته',
    descriptionEn: 'Smartphone in excellent condition with all accessories',
    price: 100,
    category: 'Electronics',
    images: ['image1.jpg', 'image2.jpg'],
    location: {
      type: 'Point',
      coordinates: [31.2357, 30.0444] // Cairo coordinates
    },
    governorate: 'Cairo',
    status: ListingStatus.DRAFT,
    views: 0,
    tags: ['electronics', 'smartphone'],
    condition: 'New'
  };

  beforeEach(() => {
    // Initialize mocks
    mockListingRepository = {
      create: jest.fn(),
      update: jest.fn(),
      find: jest.fn(),
      findById: jest.fn()
    };

    mockImageService = {
      optimizeForEgyptianNetwork: jest.fn()
    };

    mockSearchService = {
      indexListing: jest.fn(),
      updateListingIndex: jest.fn()
    };

    mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn()
    };

    mockContentValidator = {
      validateArabicText: jest.fn(),
      validateEnglishText: jest.fn(),
      validateCulturalSensitivity: jest.fn()
    };

    mockLogger = {
      info: jest.fn(),
      error: jest.fn()
    };

    // Initialize service with mocks
    listingService = new ListingService(
      mockListingRepository,
      mockImageService,
      mockSearchService,
      mockCacheManager,
      mockContentValidator,
      mockLogger
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createListing', () => {
    test('should successfully create listing with valid bilingual content', async () => {
      // Setup successful validation responses
      mockContentValidator.validateArabicText.mockResolvedValue(true);
      mockContentValidator.validateEnglishText.mockResolvedValue(true);
      mockContentValidator.validateCulturalSensitivity.mockResolvedValue(true);
      mockImageService.optimizeForEgyptianNetwork.mockResolvedValue('optimized-image.jpg');
      mockListingRepository.create.mockResolvedValue({ ...testListingData, id: 'new-listing-123' });

      const result = await listingService.createListing(testListingData);

      expect(result).toBeDefined();
      expect(result.id).toBe('new-listing-123');
      expect(mockContentValidator.validateArabicText).toHaveBeenCalledWith(testListingData.titleAr, 'title');
      expect(mockContentValidator.validateEnglishText).toHaveBeenCalledWith(testListingData.titleEn, 'title');
      expect(mockSearchService.indexListing).toHaveBeenCalled();
    });

    test('should reject invalid Arabic content', async () => {
      mockContentValidator.validateArabicText.mockRejectedValue(
        new ServiceError('INVALID_ARABIC_CONTENT', 'Arabic title must be at least 3 characters')
      );

      await expect(listingService.createListing({
        ...testListingData,
        titleAr: 'ا'
      })).rejects.toThrow('Arabic title must be at least 3 characters');
    });

    test('should reject location outside Egypt boundaries', async () => {
      await expect(listingService.createListing({
        ...testListingData,
        location: {
          type: 'Point',
          coordinates: [35.0, 35.0] // Outside Egypt
        }
      })).rejects.toThrow('Location must be within Egyptian boundaries');
    });
  });

  describe('validateBilingualContent', () => {
    test('should validate both Arabic and English content', async () => {
      mockContentValidator.validateArabicText.mockResolvedValue(true);
      mockContentValidator.validateEnglishText.mockResolvedValue(true);

      await expect(listingService['validateBilingualContent'](testListingData)).resolves.not.toThrow();

      expect(mockContentValidator.validateArabicText).toHaveBeenCalledTimes(2);
      expect(mockContentValidator.validateEnglishText).toHaveBeenCalledTimes(2);
    });

    test('should reject missing Arabic translation', async () => {
      mockContentValidator.validateArabicText.mockRejectedValue(
        new ServiceError('MISSING_ARABIC_CONTENT', 'Arabic content is required')
      );

      await expect(listingService['validateBilingualContent']({
        ...testListingData,
        titleAr: ''
      })).rejects.toThrow('Arabic content is required');
    });
  });

  describe('validateEgyptianLocation', () => {
    test('should accept valid Egyptian coordinates', () => {
      const validLocations = [
        [31.2357, 30.0444], // Cairo
        [29.9187, 31.2001], // Alexandria
        [31.1656, 29.9553]  // Giza
      ];

      validLocations.forEach(coordinates => {
        expect(() => listingService['validateEgyptianLocation']({
          coordinates
        })).not.toThrow();
      });
    });

    test('should reject coordinates outside Egypt', () => {
      const invalidLocations = [
        [35.0, 35.0], // Outside Egypt
        [25.0, 25.0], // Outside Egypt
        [40.0, 40.0]  // Outside Egypt
      ];

      invalidLocations.forEach(coordinates => {
        expect(() => listingService['validateEgyptianLocation']({
          coordinates
        })).toThrow('Location must be within Egyptian boundaries');
      });
    });
  });

  describe('updateListing', () => {
    test('should successfully update listing with valid changes', async () => {
      mockListingRepository.findById.mockResolvedValue(testListingData);
      mockListingRepository.update.mockResolvedValue({
        ...testListingData,
        titleAr: 'عنوان جديد',
        titleEn: 'New Title'
      });

      const updateData = {
        titleAr: 'عنوان جديد',
        titleEn: 'New Title'
      };

      const result = await listingService.updateListing('listing-123', updateData);

      expect(result.titleAr).toBe('عنوان جديد');
      expect(result.titleEn).toBe('New Title');
      expect(mockSearchService.updateListingIndex).toHaveBeenCalled();
    });

    test('should validate cultural sensitivity on content updates', async () => {
      mockListingRepository.findById.mockResolvedValue(testListingData);
      mockContentValidator.validateCulturalSensitivity.mockResolvedValue(true);

      await listingService.updateListing('listing-123', {
        titleAr: 'عنوان محترم',
        titleEn: 'Respectful Title'
      });

      expect(mockContentValidator.validateCulturalSensitivity).toHaveBeenCalled();
    });
  });

  describe('getListings', () => {
    test('should return cached listings when available', async () => {
      const cachedListings = [testListingData];
      mockCacheManager.get.mockResolvedValue(cachedListings);

      const result = await listingService.getListings({ governorate: 'Cairo' });

      expect(result).toEqual(cachedListings);
      expect(mockListingRepository.find).not.toHaveBeenCalled();
    });

    test('should fetch and cache listings when cache miss', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockListingRepository.find.mockResolvedValue([testListingData]);

      const result = await listingService.getListings({ category: 'Electronics' });

      expect(result).toHaveLength(1);
      expect(mockCacheManager.set).toHaveBeenCalled();
    });
  });
});