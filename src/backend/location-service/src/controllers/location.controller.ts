/**
 * @fileoverview Enhanced location controller for the Egyptian Map of Pi platform.
 * Handles location-related HTTP requests with military zone validation,
 * urban density optimization, and bilingual support.
 * 
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express'; // ^4.18.0
import { Location, Coordinates, LocationType } from '../interfaces/location.interface';
import MapsService from '../services/maps.service';
import GeocodingService from '../services/geocoding.service';

/**
 * Enhanced controller class for handling location-related operations
 * with military zone validation and bilingual support
 */
export class LocationController {
  private readonly mapsService: MapsService;
  private readonly geocodingService: GeocodingService;

  /**
   * Initializes location controller with required services
   */
  constructor() {
    this.mapsService = new MapsService();
    this.geocodingService = new GeocodingService();
  }

  /**
   * Creates a new location entry with enhanced validation
   * @param req Express request object
   * @param res Express response object
   * @param next Express next function
   */
  public createLocation = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const locationData: Location = req.body;

      // Validate coordinates are within Egypt
      const isValidLocation = await this.mapsService.isWithinEgypt(locationData.coordinates);
      if (!isValidLocation) {
        res.status(400).json({
          success: false,
          message: {
            ar: 'الموقع خارج حدود مصر أو في منطقة محظورة',
            en: 'Location is outside Egypt or in a restricted zone'
          }
        });
        return;
      }

      // Validate bilingual address format
      const validatedAddress = await this.geocodingService.reverseGeocode(locationData.coordinates);
      locationData.address = validatedAddress;

      // Calculate urban density factor for the location
      const densityFactor = await this.mapsService.calculateUrbanDensityFactor(locationData.coordinates);

      // Create location with enhanced data
      const createdLocation = {
        ...locationData,
        urbanDensityFactor: densityFactor,
        verificationStatus: 'PENDING'
      };

      // Send success response with bilingual messages
      res.status(201).json({
        success: true,
        data: createdLocation,
        message: {
          ar: 'تم إنشاء الموقع بنجاح',
          en: 'Location created successfully'
        }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Finds nearby locations with density-based optimization
   * @param req Express request object
   * @param res Express response object
   * @param next Express next function
   */
  public findNearbyLocations = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { latitude, longitude, radius, type } = req.query;

      // Validate query parameters
      const coordinates: Coordinates = {
        latitude: Number(latitude),
        longitude: Number(longitude),
        accuracy: 0
      };

      const radiusKm = Number(radius);
      const locationType = type as LocationType;

      // Validate coordinates are within Egypt
      const isValidLocation = await this.mapsService.isWithinEgypt(coordinates);
      if (!isValidLocation) {
        res.status(400).json({
          success: false,
          message: {
            ar: 'نقطة البحث خارج حدود مصر',
            en: 'Search point is outside Egypt'
          }
        });
        return;
      }

      // Find nearby locations with density optimization
      const nearbyLocations = await this.mapsService.findNearbyLocations(
        coordinates,
        radiusKm,
        locationType,
        true // Enable density-based optimization
      );

      // Enhance response with bilingual address data
      const enhancedLocations = await Promise.all(
        nearbyLocations.map(async (location) => {
          const address = await this.geocodingService.reverseGeocode(location.coordinates);
          return {
            ...location,
            address
          };
        })
      );

      res.status(200).json({
        success: true,
        data: enhancedLocations,
        message: {
          ar: `تم العثور على ${enhancedLocations.length} موقع`,
          en: `Found ${enhancedLocations.length} locations`
        }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Validates a location's coordinates and address
   * @param req Express request object
   * @param res Express response object
   * @param next Express next function
   */
  public validateLocation = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { coordinates, address } = req.body;

      // Validate coordinates
      const isValidLocation = await this.mapsService.isWithinEgypt(coordinates);
      
      // Validate address if provided
      const isValidAddress = address ? 
        await this.geocodingService.validateAddress(address) : 
        true;

      res.status(200).json({
        success: true,
        data: {
          isValid: isValidLocation && isValidAddress,
          coordinatesValid: isValidLocation,
          addressValid: isValidAddress
        },
        message: {
          ar: isValidLocation && isValidAddress ? 
            'الموقع صالح' : 
            'الموقع غير صالح',
          en: isValidLocation && isValidAddress ? 
            'Location is valid' : 
            'Location is invalid'
        }
      });
    } catch (error) {
      next(error);
    }
  };
}

export default LocationController;