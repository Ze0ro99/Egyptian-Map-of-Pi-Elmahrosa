/**
 * @fileoverview Controller handling marketplace listing operations for the Egyptian Map of Pi platform.
 * Implements specialized support for Arabic content, Egyptian location services, and cultural
 * sensitivity validation.
 * 
 * @version 1.0.0
 */

import { 
  controller, httpGet, httpPost, httpPut, httpDelete, 
  request, response, locale 
} from 'inversify-express-utils'; // v6.4.3
import { inject } from 'inversify'; // v6.0.1
import { Request, Response } from 'express';
import { ListingService } from '../services/listing.service';
import { 
  ListingDocument, ListingStatus, ListingFilter, EgyptianGovernorate 
} from '../interfaces/listing.interface';
import {
  createBilingualResponse,
  createErrorResponse,
  createPaginatedResponse
} from '../../../shared/utils/response.util';
import {
  validateListingCreate,
  validateListingUpdate,
  validateListingSearch,
  validateArabicContent,
  validateEgyptianLocation
} from '../../../shared/validators/listing.validator';
import { TYPES } from '../../../shared/constants/types';
import { ErrorCodes } from '../../../shared/constants/error-codes';

/**
 * Controller handling all marketplace listing operations with specialized support for Egyptian market
 */
@controller('/api/v1/listings')
@locale('ar-EG')
export class ListingsController {
  constructor(
    @inject(TYPES.ListingService) private listingService: ListingService
  ) {}

  /**
   * Creates a new marketplace listing with Arabic content validation
   * 
   * @param req Request containing listing data
   * @param res Response object
   * @returns Promise<Response> Bilingual response with created listing
   */
  @httpPost('/')
  public async createListing(
    @request() req: Request,
    @response() res: Response
  ): Promise<Response> {
    try {
      // Validate listing data
      const validationError = await validateListingCreate(req.body);
      if (validationError) {
        return res.status(400).json(createErrorResponse(
          ErrorCodes.DATA_VALIDATION_FAILED,
          'Invalid listing data',
          validationError.details,
          req.id
        ));
      }

      // Validate Arabic content
      const arabicContentValid = await validateArabicContent({
        titleAr: req.body.titleAr,
        descriptionAr: req.body.descriptionAr
      });
      if (!arabicContentValid) {
        return res.status(400).json(createErrorResponse(
          ErrorCodes.DATA_VALIDATION_FAILED,
          'Invalid Arabic content',
          ['Arabic content must use proper characters and formatting'],
          req.id
        ));
      }

      // Create listing
      const listing = await this.listingService.createListing(req.body);
      
      return res.status(201).json(createBilingualResponse(listing));
    } catch (error) {
      return res.status(500).json(createErrorResponse(
        ErrorCodes.SYSTEM_INTERNAL_ERROR,
        'Failed to create listing',
        [error.message],
        req.id
      ));
    }
  }

  /**
   * Retrieves listings with Egyptian market-specific filters
   * 
   * @param req Request containing search parameters
   * @param res Response object
   * @returns Promise<Response> Paginated bilingual search results
   */
  @httpGet('/search')
  public async searchListings(
    @request() req: Request,
    @response() res: Response
  ): Promise<Response> {
    try {
      const { page = 1, limit = 10, ...filters } = req.query;

      // Validate search filters
      const validationError = await validateListingSearch(filters);
      if (validationError) {
        return res.status(400).json(createErrorResponse(
          ErrorCodes.DATA_VALIDATION_FAILED,
          'Invalid search parameters',
          validationError.details,
          req.id
        ));
      }

      // Apply location-based filtering if coordinates provided
      if (filters.location) {
        const locationValid = await validateEgyptianLocation(filters.location);
        if (!locationValid) {
          return res.status(400).json(createErrorResponse(
            ErrorCodes.DATA_VALIDATION_FAILED,
            'Invalid location',
            ['Location must be within Egyptian boundaries'],
            req.id
          ));
        }
      }

      const searchResults = await this.listingService.searchListings(
        filters as ListingFilter,
        Number(page),
        Number(limit)
      );

      return res.status(200).json(createPaginatedResponse(
        searchResults.items,
        Number(page),
        Number(limit),
        searchResults.total
      ));
    } catch (error) {
      return res.status(500).json(createErrorResponse(
        ErrorCodes.SYSTEM_INTERNAL_ERROR,
        'Failed to search listings',
        [error.message],
        req.id
      ));
    }
  }

  /**
   * Updates an existing listing with validation
   * 
   * @param req Request containing update data
   * @param res Response object
   * @returns Promise<Response> Updated listing data
   */
  @httpPut('/:id')
  public async updateListing(
    @request() req: Request,
    @response() res: Response
  ): Promise<Response> {
    try {
      const { id } = req.params;

      // Validate update data
      const validationError = await validateListingUpdate(req.body);
      if (validationError) {
        return res.status(400).json(createErrorResponse(
          ErrorCodes.DATA_VALIDATION_FAILED,
          'Invalid update data',
          validationError.details,
          req.id
        ));
      }

      const updatedListing = await this.listingService.updateListing(id, req.body);
      return res.status(200).json(createBilingualResponse(updatedListing));
    } catch (error) {
      return res.status(500).json(createErrorResponse(
        ErrorCodes.SYSTEM_INTERNAL_ERROR,
        'Failed to update listing',
        [error.message],
        req.id
      ));
    }
  }

  /**
   * Deletes a listing with proper cleanup
   * 
   * @param req Request containing listing ID
   * @param res Response object
   * @returns Promise<Response> Deletion confirmation
   */
  @httpDelete('/:id')
  public async deleteListing(
    @request() req: Request,
    @response() res: Response
  ): Promise<Response> {
    try {
      const { id } = req.params;
      await this.listingService.deleteListing(id);
      
      return res.status(204).send();
    } catch (error) {
      return res.status(500).json(createErrorResponse(
        ErrorCodes.SYSTEM_INTERNAL_ERROR,
        'Failed to delete listing',
        [error.message],
        req.id
      ));
    }
  }

  /**
   * Updates listing status with validation
   * 
   * @param req Request containing status update
   * @param res Response object
   * @returns Promise<Response> Updated listing status
   */
  @httpPut('/:id/status')
  public async updateListingStatus(
    @request() req: Request,
    @response() res: Response
  ): Promise<Response> {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!Object.values(ListingStatus).includes(status)) {
        return res.status(400).json(createErrorResponse(
          ErrorCodes.DATA_VALIDATION_FAILED,
          'Invalid listing status',
          ['Status must be a valid ListingStatus value'],
          req.id
        ));
      }

      const updatedListing = await this.listingService.updateListingStatus(id, status);
      return res.status(200).json(createBilingualResponse(updatedListing));
    } catch (error) {
      return res.status(500).json(createErrorResponse(
        ErrorCodes.SYSTEM_INTERNAL_ERROR,
        'Failed to update listing status',
        [error.message],
        req.id
      ));
    }
  }
}