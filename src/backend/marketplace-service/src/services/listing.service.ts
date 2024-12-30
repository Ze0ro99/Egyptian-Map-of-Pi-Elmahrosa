/**
 * @fileoverview Core service implementing marketplace listing functionality for the Egyptian Map of Pi platform.
 * Provides comprehensive listing management with specialized features for the Egyptian market including
 * bilingual support, location validation, and cultural sensitivity checks.
 * 
 * @version 1.0.0
 * @license MIT
 */

import { injectable, inject } from 'inversify'; // v6.0.1
import { Types } from 'mongoose'; // v6.0.0
import {
  ListingDocument,
  ListingStatus,
  ListingFilter
} from '../interfaces/listing.interface';
import { EGYPTIAN_COORDINATES } from '../constants/location.constants';
import { ServiceError } from '../../../shared/errors/service.error';
import { ImageService } from './image.service';
import { SearchService } from './search.service';
import { CacheManager } from '../../../shared/services/cache.manager';
import { ContentValidator } from '../../../shared/services/content.validator';
import { ListingRepository } from '../repositories/listing.repository';
import { TYPES } from '../../../shared/constants/types';
import { Logger } from '../../../shared/services/logger';

/**
 * Service class implementing core marketplace listing functionality with Egyptian market specialization
 */
@injectable()
export class ListingService {
  constructor(
    @inject(TYPES.ListingRepository) private listingRepository: ListingRepository,
    @inject(TYPES.ImageService) private imageService: ImageService,
    @inject(TYPES.SearchService) private searchService: SearchService,
    @inject(TYPES.CacheManager) private cacheManager: CacheManager,
    @inject(TYPES.ContentValidator) private contentValidator: ContentValidator,
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  /**
   * Creates a new marketplace listing with Egyptian market validation
   * 
   * @param {ListingDocument} listingData - The listing data to create
   * @returns {Promise<ListingDocument>} Created listing document
   * @throws {ServiceError} If validation fails or creation error occurs
   */
  public async createListing(listingData: ListingDocument): Promise<ListingDocument> {
    try {
      // Validate bilingual content
      await this.validateBilingualContent(listingData);

      // Verify Egyptian location boundaries
      this.validateEgyptianLocation(listingData.location);

      // Validate cultural sensitivity
      await this.validateCulturalSensitivity(listingData);

      // Process and optimize images for Egyptian network conditions
      const optimizedImages = await this.processListingImages(listingData.images);
      listingData.images = optimizedImages;

      // Create listing with validated data
      const createdListing = await this.listingRepository.create({
        ...listingData,
        status: ListingStatus.DRAFT,
        views: 0
      });

      // Index for Arabic search optimization
      await this.searchService.indexListing(createdListing);

      // Clear relevant cache entries
      await this.clearListingCaches(createdListing.sellerId);

      this.logger.info('Created new listing', { listingId: createdListing.id });

      return createdListing;
    } catch (error) {
      this.logger.error('Failed to create listing', { error });
      throw new ServiceError('LISTING_CREATION_FAILED', error.message);
    }
  }

  /**
   * Updates an existing listing with Egyptian market compliance
   * 
   * @param {string} id - Listing ID to update
   * @param {Partial<ListingDocument>} updateData - The data to update
   * @returns {Promise<ListingDocument>} Updated listing document
   * @throws {ServiceError} If validation fails or update error occurs
   */
  public async updateListing(
    id: string,
    updateData: Partial<ListingDocument>
  ): Promise<ListingDocument> {
    try {
      const existingListing = await this.listingRepository.findById(id);
      if (!existingListing) {
        throw new ServiceError('LISTING_NOT_FOUND', 'Listing not found');
      }

      // Validate update permissions and content if changed
      if (updateData.titleAr || updateData.titleEn || updateData.descriptionAr || updateData.descriptionEn) {
        await this.validateBilingualContent(updateData);
        await this.validateCulturalSensitivity(updateData);
      }

      // Process new images if provided
      if (updateData.images) {
        updateData.images = await this.processListingImages(updateData.images);
      }

      // Verify location updates
      if (updateData.location) {
        this.validateEgyptianLocation(updateData.location);
      }

      // Apply update with validation
      const updatedListing = await this.listingRepository.update(id, updateData);

      // Update search indices
      await this.searchService.updateListingIndex(updatedListing);

      // Clear relevant caches
      await this.clearListingCaches(updatedListing.sellerId);

      this.logger.info('Updated listing', { listingId: id });

      return updatedListing;
    } catch (error) {
      this.logger.error('Failed to update listing', { error, listingId: id });
      throw new ServiceError('LISTING_UPDATE_FAILED', error.message);
    }
  }

  /**
   * Retrieves listings based on Egyptian market-specific filters
   * 
   * @param {ListingFilter} filter - Search and filter criteria
   * @returns {Promise<ListingDocument[]>} Array of matching listings
   */
  public async getListings(filter: ListingFilter): Promise<ListingDocument[]> {
    try {
      const cacheKey = this.generateListingCacheKey(filter);
      const cachedListings = await this.cacheManager.get<ListingDocument[]>(cacheKey);

      if (cachedListings) {
        return cachedListings;
      }

      const listings = await this.listingRepository.find(filter);
      await this.cacheManager.set(cacheKey, listings, 300); // Cache for 5 minutes

      return listings;
    } catch (error) {
      this.logger.error('Failed to retrieve listings', { error, filter });
      throw new ServiceError('LISTING_RETRIEVAL_FAILED', error.message);
    }
  }

  /**
   * Validates bilingual content requirements for Egyptian market
   * 
   * @param {Partial<ListingDocument>} listingData - Listing data to validate
   * @private
   */
  private async validateBilingualContent(listingData: Partial<ListingDocument>): Promise<void> {
    const validations = [
      this.contentValidator.validateArabicText(listingData.titleAr, 'title'),
      this.contentValidator.validateEnglishText(listingData.titleEn, 'title'),
      this.contentValidator.validateArabicText(listingData.descriptionAr, 'description'),
      this.contentValidator.validateEnglishText(listingData.descriptionEn, 'description')
    ];

    await Promise.all(validations);
  }

  /**
   * Validates location coordinates are within Egyptian boundaries
   * 
   * @param {Coordinates} location - Location coordinates to validate
   * @private
   */
  private validateEgyptianLocation(location: { coordinates: number[] }): void {
    const [longitude, latitude] = location.coordinates;
    const { minLat, maxLat, minLng, maxLng } = EGYPTIAN_COORDINATES;

    if (latitude < minLat || latitude > maxLat || longitude < minLng || longitude > maxLng) {
      throw new ServiceError('INVALID_LOCATION', 'Location must be within Egyptian boundaries');
    }
  }

  /**
   * Processes and optimizes listing images for Egyptian network conditions
   * 
   * @param {string[]} images - Array of image URLs to process
   * @returns {Promise<string[]>} Array of processed image URLs
   * @private
   */
  private async processListingImages(images: string[]): Promise<string[]> {
    if (!images || images.length === 0) {
      return [];
    }

    const optimizationPromises = images.map(image => 
      this.imageService.optimizeForEgyptianNetwork(image)
    );

    return Promise.all(optimizationPromises);
  }

  /**
   * Validates content for cultural sensitivity and compliance
   * 
   * @param {Partial<ListingDocument>} listingData - Listing data to validate
   * @private
   */
  private async validateCulturalSensitivity(listingData: Partial<ListingDocument>): Promise<void> {
    const textContent = [
      listingData.titleAr,
      listingData.titleEn,
      listingData.descriptionAr,
      listingData.descriptionEn
    ].filter(Boolean);

    await this.contentValidator.validateCulturalSensitivity(textContent);
  }

  /**
   * Clears relevant cache entries after listing updates
   * 
   * @param {string} sellerId - ID of the seller whose listings were modified
   * @private
   */
  private async clearListingCaches(sellerId: string): Promise<void> {
    const cacheKeys = [
      `listings:seller:${sellerId}`,
      'listings:featured',
      'listings:recent'
    ];

    await Promise.all(cacheKeys.map(key => this.cacheManager.delete(key)));
  }

  /**
   * Generates cache key for listing queries
   * 
   * @param {ListingFilter} filter - Filter criteria
   * @returns {string} Cache key
   * @private
   */
  private generateListingCacheKey(filter: ListingFilter): string {
    return `listings:${JSON.stringify(filter)}`;
  }
}