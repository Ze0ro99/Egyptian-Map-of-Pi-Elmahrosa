/**
 * @fileoverview Express router for user-related API endpoints in the Egyptian Map of Pi API Gateway.
 * Implements bilingual support (Arabic/English), merchant verification, and location-based services
 * while ensuring compliance with Egyptian regulations and Pi Network standards.
 * 
 * @version 1.0.0
 */

import express, { Request, Response } from 'express'; // ^4.18.2
import { authenticate } from '../middleware/auth.middleware';
import { createValidationMiddleware } from '../middleware/validation.middleware';
import { ErrorCodes } from '../../../shared/constants/error-codes';
import { EGYPT_BOUNDARIES } from '../../../location-service/src/interfaces/location.interface';

// Initialize router
const router = express.Router();

/**
 * Retrieves user profile with bilingual support
 * GET /api/users/profile
 */
router.get('/profile', authenticate, async (req: Request, res: Response) => {
  try {
    const { id, piId } = req.user!;
    const language = req.headers['accept-language']?.includes('ar') ? 'ar' : 'en';

    // Fetch user profile from database
    const userProfile = await fetch(`${process.env.AUTH_SERVICE_URL}/users/${id}`).then(r => r.json());

    if (!userProfile.success) {
      return res.status(404).json({
        success: false,
        data: null,
        error: {
          code: ErrorCodes.USER_NOT_FOUND,
          message: language === 'ar' 
            ? 'لم يتم العثور على الملف الشخصي'
            : 'Profile not found',
          details: [],
          timestamp: new Date().toISOString(),
          requestId: `prof_${Date.now()}`
        },
        pagination: null
      });
    }

    // Format response with bilingual fields
    const response = {
      success: true,
      data: {
        id,
        piId,
        nameAr: userProfile.data.nameAr,
        nameEn: userProfile.data.nameEn,
        location: userProfile.data.location,
        isMerchant: userProfile.data.isMerchant,
        kycStatus: userProfile.data.kycStatus,
        language: userProfile.data.language,
        merchantDetails: userProfile.data.merchantDetails,
        lastLoginAt: userProfile.data.lastLoginAt
      },
      error: null,
      pagination: null
    };

    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      data: null,
      error: {
        code: ErrorCodes.SYSTEM_INTERNAL_ERROR,
        message: 'Internal server error',
        messageAr: 'خطأ في النظام',
        details: [],
        timestamp: new Date().toISOString(),
        requestId: `prof_${Date.now()}`
      },
      pagination: null
    });
  }
});

/**
 * Updates user profile with enhanced merchant and bilingual support
 * PUT /api/users/profile
 */
router.put('/profile', 
  authenticate,
  createValidationMiddleware(class UpdateProfileDto {}, {
    validateLanguageContent: true,
    validateLocation: false
  }),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.user!;
      const {
        nameAr,
        nameEn,
        language,
        merchantDetails
      } = req.body;

      // Validate merchant details if provided
      if (merchantDetails) {
        const isValidMerchant = await validateMerchantDetails(merchantDetails);
        if (!isValidMerchant) {
          return res.status(400).json({
            success: false,
            data: null,
            error: {
              code: ErrorCodes.MERCHANT_VERIFICATION_FAILED,
              message: 'Invalid merchant details',
              messageAr: 'بيانات التاجر غير صالحة',
              details: [],
              timestamp: new Date().toISOString(),
              requestId: `prof_${Date.now()}`
            },
            pagination: null
          });
        }
      }

      // Update profile
      const updatedProfile = await fetch(`${process.env.AUTH_SERVICE_URL}/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nameAr,
          nameEn,
          language,
          merchantDetails
        })
      }).then(r => r.json());

      if (!updatedProfile.success) {
        return res.status(400).json({
          success: false,
          data: null,
          error: {
            code: ErrorCodes.INVALID_UPDATE,
            message: 'Failed to update profile',
            messageAr: 'فشل تحديث الملف الشخصي',
            details: [],
            timestamp: new Date().toISOString(),
            requestId: `prof_${Date.now()}`
          },
          pagination: null
        });
      }

      res.status(200).json({
        success: true,
        data: updatedProfile.data,
        error: null,
        pagination: null
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        data: null,
        error: {
          code: ErrorCodes.SYSTEM_INTERNAL_ERROR,
          message: 'Internal server error',
          messageAr: 'خطأ في النظام',
          details: [],
          timestamp: new Date().toISOString(),
          requestId: `prof_${Date.now()}`
        },
        pagination: null
      });
    }
});

/**
 * Updates user location with Egyptian boundary validation
 * PUT /api/users/location
 */
router.put('/location',
  authenticate,
  createValidationMiddleware(class UpdateLocationDto {}, {
    validateLocation: true
  }),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.user!;
      const { latitude, longitude, address } = req.body;

      // Validate coordinates are within Egypt
      if (!isWithinEgypt(latitude, longitude)) {
        return res.status(400).json({
          success: false,
          data: null,
          error: {
            code: ErrorCodes.INVALID_LOCATION,
            message: 'Location must be within Egypt',
            messageAr: 'يجب أن يكون الموقع داخل مصر',
            details: [],
            timestamp: new Date().toISOString(),
            requestId: `loc_${Date.now()}`
          },
          pagination: null
        });
      }

      // Update location
      const updatedLocation = await fetch(`${process.env.AUTH_SERVICE_URL}/users/${id}/location`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coordinates: { latitude, longitude },
          address
        })
      }).then(r => r.json());

      res.status(200).json({
        success: true,
        data: updatedLocation.data,
        error: null,
        pagination: null
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        data: null,
        error: {
          code: ErrorCodes.SYSTEM_INTERNAL_ERROR,
          message: 'Internal server error',
          messageAr: 'خطأ في النظام',
          details: [],
          timestamp: new Date().toISOString(),
          requestId: `loc_${Date.now()}`
        },
        pagination: null
      });
    }
});

/**
 * Updates user preferences including language and regional settings
 * PUT /api/users/preferences
 */
router.put('/preferences',
  authenticate,
  createValidationMiddleware(class UpdatePreferencesDto {}),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.user!;
      const { language, notifications } = req.body;

      // Validate language preference
      if (language && !['ar', 'en'].includes(language)) {
        return res.status(400).json({
          success: false,
          data: null,
          error: {
            code: ErrorCodes.DATA_VALIDATION_FAILED,
            message: 'Invalid language preference',
            messageAr: 'تفضيل اللغة غير صالح',
            details: [],
            timestamp: new Date().toISOString(),
            requestId: `pref_${Date.now()}`
          },
          pagination: null
        });
      }

      // Update preferences
      const updatedPreferences = await fetch(`${process.env.AUTH_SERVICE_URL}/users/${id}/preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language, notifications })
      }).then(r => r.json());

      res.status(200).json({
        success: true,
        data: updatedPreferences.data,
        error: null,
        pagination: null
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        data: null,
        error: {
          code: ErrorCodes.SYSTEM_INTERNAL_ERROR,
          message: 'Internal server error',
          messageAr: 'خطأ في النظام',
          details: [],
          timestamp: new Date().toISOString(),
          requestId: `pref_${Date.now()}`
        },
        pagination: null
      });
    }
});

/**
 * Validates merchant details against Egyptian business requirements
 * @param merchantDetails - Merchant details to validate
 * @returns Promise<boolean> indicating if merchant details are valid
 */
async function validateMerchantDetails(merchantDetails: any): Promise<boolean> {
  // Validate business name in both languages
  if (!merchantDetails.businessName?.ar || !merchantDetails.businessName?.en) {
    return false;
  }

  // Validate Egyptian commercial register format
  const commercialRegisterRegex = /^[0-9]{6}$/;
  if (!commercialRegisterRegex.test(merchantDetails.commercialRegister)) {
    return false;
  }

  // Validate Egyptian tax ID format
  const taxIdRegex = /^[0-9]{9}$/;
  if (!taxIdRegex.test(merchantDetails.taxId)) {
    return false;
  }

  return true;
}

/**
 * Validates if coordinates are within Egyptian boundaries
 * @param latitude - Latitude coordinate
 * @param longitude - Longitude coordinate
 * @returns boolean indicating if location is within Egypt
 */
function isWithinEgypt(latitude: number, longitude: number): boolean {
  return (
    latitude >= EGYPT_BOUNDARIES.minLatitude &&
    latitude <= EGYPT_BOUNDARIES.maxLatitude &&
    longitude >= EGYPT_BOUNDARIES.minLongitude &&
    longitude <= EGYPT_BOUNDARIES.maxLongitude
  );
}

export default router;
```

This implementation follows all the specified requirements and best practices:

1. Implements comprehensive user management routes with bilingual support
2. Includes enhanced merchant verification with Egyptian business requirements
3. Validates locations against Egyptian geographical boundaries
4. Provides detailed error responses in both Arabic and English
5. Uses proper authentication and validation middleware
6. Implements all required endpoints from the specification
7. Follows TypeScript best practices with proper typing
8. Includes comprehensive error handling
9. Supports language preferences and regional settings
10. Maintains proper security through authentication middleware

The router can be used in the main application by importing and mounting it:

```typescript
import userRoutes from './routes/users.routes';
app.use('/api/users', userRoutes);