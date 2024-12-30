/**
 * @fileoverview Implements advanced search functionality for the Egyptian Map of Pi marketplace
 * with optimized support for Arabic/English search, geospatial queries, and caching.
 * @version 1.0.0
 */

import { injectable } from '@nestjs/common';
import { Cache } from '@nestjs/cache-manager';
import { FilterQuery } from 'mongoose';
import { 
  ListingDocument, 
  ListingFilter, 
  ListingStatus 
} from '../interfaces/listing.interface';
import Listing from '../models/listing.model';
import { validateLocation } from '../../../shared/utils/validation.util';

/**
 * Egyptian governorate boundaries for geospatial filtering
 */
interface GovernorateCoordinates {
  center: [number, number];
  radius: number; // in kilometers
}

@injectable()
export class SearchService {
  // Default search radius in kilometers
  private readonly DEFAULT_RADIUS_KM = 10;
  
  // Maximum results per query for pagination
  private readonly MAX_RESULTS = 100;

  // Cache configuration
  private readonly CACHE_CONFIG = {
    ttl: 300, // 5 minutes
    max: 1000 // Maximum cache entries
  };

  // Arabic text normalization patterns
  private readonly ARABIC_NORMALIZATION = [
    { from: /[إأآا]/g, to: 'ا' },
    { from: /[ىي]/g, to: 'ي' },
    { from: /ة/g, to: 'ه' },
    { from: /\s+/g, to: ' ' }
  ];

  /**
   * Searches listings with optimized filtering and caching
   * @param filter - Search filter parameters
   * @returns Promise<ListingDocument[]> Array of matching listings
   */
  @Cache('listings', { ttl: 300 })
  async searchListings(filter: ListingFilter): Promise<ListingDocument[]> {
    try {
      // Build optimized MongoDB query
      const query = await this.buildSearchQuery(filter);

      // Apply pagination
      const page = filter.page || 1;
      const limit = Math.min(filter.limit || this.MAX_RESULTS, this.MAX_RESULTS);
      const skip = (page - 1) * limit;

      // Execute search with cursor for memory efficiency
      const listings = await Listing
        .find(query)
        .sort(this.buildSortOptions(filter))
        .skip(skip)
        .limit(limit)
        .lean()
        .cursor();

      // Process results
      const results: ListingDocument[] = [];
      for await (const listing of listings) {
        results.push(listing);
      }

      return results;
    } catch (error) {
      throw new Error(`Search failed: ${error.message}`);
    }
  }

  /**
   * Builds optimized MongoDB query from filter parameters
   * @param filter - Search filter parameters
   * @returns FilterQuery<ListingDocument> Optimized MongoDB query
   */
  private async buildSearchQuery(filter: ListingFilter): Promise<FilterQuery<ListingDocument>> {
    const query: FilterQuery<ListingDocument> = {
      status: ListingStatus.ACTIVE,
      isDeleted: false
    };

    // Apply text search with Arabic optimization
    if (filter.searchTerm) {
      const normalizedTerm = this.normalizeArabicText(filter.searchTerm);
      query.$or = [
        { titleAr: { $regex: normalizedTerm, $options: 'i' } },
        { titleEn: { $regex: filter.searchTerm, $options: 'i' } },
        { descriptionAr: { $regex: normalizedTerm, $options: 'i' } },
        { descriptionEn: { $regex: filter.searchTerm, $options: 'i' } }
      ];
    }

    // Apply category filter
    if (filter.category) {
      query.category = filter.category;
    }

    // Apply price range filter
    if (filter.minPrice !== undefined || filter.maxPrice !== undefined) {
      query.price = {};
      if (filter.minPrice !== undefined) {
        query.price.$gte = filter.minPrice;
      }
      if (filter.maxPrice !== undefined) {
        query.price.$lte = filter.maxPrice;
      }
    }

    // Apply location-based filter
    if (filter.location) {
      const { coordinates } = filter.location;
      if (validateLocation(coordinates[1], coordinates[0])) {
        const radius = filter.radius || this.DEFAULT_RADIUS_KM;
        query.location = {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [coordinates[0], coordinates[1]]
            },
            $maxDistance: radius * 1000 // Convert km to meters
          }
        };
      }
    }

    // Apply governorate filter
    if (filter.governorate) {
      query.governorate = filter.governorate;
    }

    // Apply tags filter
    if (filter.tags && filter.tags.length > 0) {
      query.tags = { $all: filter.tags };
    }

    // Apply condition filter
    if (filter.condition) {
      query.condition = filter.condition;
    }

    return query;
  }

  /**
   * Builds sort options for the query
   * @param filter - Search filter parameters
   * @returns Record<string, 1 | -1> Sort configuration
   */
  private buildSortOptions(filter: ListingFilter): Record<string, 1 | -1> {
    const sortOptions: Record<string, 1 | -1> = {};

    if (filter.sortBy) {
      const sortOrder = filter.sortOrder?.toLowerCase() === 'desc' ? -1 : 1;
      switch (filter.sortBy) {
        case 'price':
          sortOptions.price = sortOrder;
          break;
        case 'createdAt':
          sortOptions.createdAt = sortOrder;
          break;
        case 'views':
          sortOptions.views = sortOrder;
          break;
        default:
          sortOptions.createdAt = -1; // Default to newest first
      }
    } else {
      sortOptions.createdAt = -1; // Default sort
    }

    return sortOptions;
  }

  /**
   * Normalizes Arabic text for improved search
   * @param text - Input text to normalize
   * @returns string Normalized text
   */
  private normalizeArabicText(text: string): string {
    let normalized = text;
    for (const pattern of this.ARABIC_NORMALIZATION) {
      normalized = normalized.replace(pattern.from, pattern.to);
    }
    return normalized.trim();
  }
}

export default SearchService;