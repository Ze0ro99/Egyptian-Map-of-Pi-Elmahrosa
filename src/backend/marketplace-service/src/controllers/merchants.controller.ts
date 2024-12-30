/**
 * @fileoverview Controller handling merchant-related operations in the Egyptian Map of Pi marketplace.
 * Implements comprehensive merchant management with Egyptian business verification, bilingual support,
 * and location-based services.
 * 
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express'; // ^4.18.0
import { S3 } from 'aws-sdk'; // ^2.1.0
import { MerchantDocument, MerchantVerificationStatus, BusinessDocument, MerchantLocation } from '../interfaces/merchant.interface';
import MerchantModel from '../models/merchant.model';
import { asyncHandler } from '../../shared/middleware/async.handler';
import { validateRequest } from '../../shared/middleware/validate.request';
import { AppError } from '../../shared/utils/app-error';
import { egyptianGovernorateValidator } from '../utils/location.validator';
import { documentValidator } from '../utils/document.validator';

// Constants for business rules
const MAX_SEARCH_RADIUS_KM = 50;
const MIN_SEARCH_RADIUS_KM = 1;
const DEFAULT_SEARCH_RADIUS_KM = 5;
const RESULTS_PER_PAGE = 20;

// S3 client for document storage
const s3Client = new S3({
  region: process.env.AWS_REGION || 'me-south-1'
});

/**
 * Controller class handling merchant operations with Egyptian market adaptations
 */
export class MerchantsController {
  /**
   * Registers a new merchant with Egyptian business requirements
   */
  @asyncHandler
  @validateRequest
  public async registerMerchant(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const {
      piId,
      businessNameAr,
      businessNameEn,
      descriptionAr,
      descriptionEn,
      phone,
      location,
      categories
    } = req.body;

    // Check if merchant already exists
    const existingMerchant = await MerchantModel.findByPiId(piId);
    if (existingMerchant) {
      throw new AppError('Merchant already registered', 409);
    }

    // Validate location is within Egypt
    if (!egyptianGovernorateValidator.isValidLocation(location.coordinates)) {
      throw new AppError('Location must be within Egyptian boundaries', 400);
    }

    // Create new merchant
    const merchant = await MerchantModel.create({
      piId,
      businessNameAr,
      businessNameEn,
      descriptionAr,
      descriptionEn,
      phone,
      location: {
        type: 'Point',
        coordinates: location.coordinates,
        address: location.address,
        governorate: location.governorate,
        district: location.district,
        postalCode: location.postalCode
      },
      categories,
      verificationStatus: MerchantVerificationStatus.PENDING
    });

    res.status(201).json({
      success: true,
      data: merchant
    });
  }

  /**
   * Processes and validates Egyptian business verification documents
   */
  @asyncHandler
  @validateRequest
  public async uploadBusinessDocuments(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const { piId } = req.params;
    const files = req.files as Express.Multer.File[];

    // Validate merchant exists
    const merchant = await MerchantModel.findByPiId(piId);
    if (!merchant) {
      throw new AppError('Merchant not found', 404);
    }

    // Validate and process each document
    const processedDocuments: BusinessDocument[] = await Promise.all(
      files.map(async (file) => {
        // Validate document type and expiry
        const validationResult = await documentValidator.validateDocument(file);
        if (!validationResult.isValid) {
          throw new AppError(validationResult.error!, 400);
        }

        // Upload to S3 with encryption
        const uploadResult = await s3Client.upload({
          Bucket: process.env.DOCUMENTS_BUCKET!,
          Key: `merchants/${piId}/${file.originalname}`,
          Body: file.buffer,
          ContentType: file.mimetype,
          ServerSideEncryption: 'AES256'
        }).promise();

        return {
          type: file.originalname.split('.')[0],
          url: uploadResult.Location,
          verified: false,
          verificationDate: new Date(),
          expiryDate: validationResult.expiryDate!
        };
      })
    );

    // Update merchant documents
    merchant.businessDocuments.push(...processedDocuments);
    merchant.verificationStatus = MerchantVerificationStatus.PENDING;
    await merchant.save();

    res.status(200).json({
      success: true,
      data: merchant.businessDocuments
    });
  }

  /**
   * Finds verified merchants near a location within Egypt
   */
  @asyncHandler
  public async getNearbyMerchants(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const { longitude, latitude, radius = DEFAULT_SEARCH_RADIUS_KM, governorate } = req.query;

    // Validate coordinates
    if (!egyptianGovernorateValidator.isValidLocation([Number(longitude), Number(latitude)])) {
      throw new AppError('Coordinates must be within Egypt', 400);
    }

    // Validate and adjust search radius
    const searchRadius = Math.min(
      Math.max(Number(radius), MIN_SEARCH_RADIUS_KM),
      MAX_SEARCH_RADIUS_KM
    ) * 1000; // Convert to meters

    // Build query based on location and filters
    const query: any = {
      verificationStatus: MerchantVerificationStatus.VERIFIED,
      isActive: true
    };

    if (governorate) {
      query['location.governorate'] = governorate;
    }

    // Find nearby merchants
    const merchants = await MerchantModel.findByLocation(
      Number(longitude),
      Number(latitude),
      searchRadius
    );

    // Apply pagination
    const page = Number(req.query.page) || 1;
    const startIndex = (page - 1) * RESULTS_PER_PAGE;
    const paginatedMerchants = merchants.slice(startIndex, startIndex + RESULTS_PER_PAGE);

    res.status(200).json({
      success: true,
      data: paginatedMerchants,
      pagination: {
        page,
        totalPages: Math.ceil(merchants.length / RESULTS_PER_PAGE),
        totalResults: merchants.length
      }
    });
  }
}

export default new MerchantsController();