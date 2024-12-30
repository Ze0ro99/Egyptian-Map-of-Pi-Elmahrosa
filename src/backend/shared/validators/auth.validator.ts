/**
 * @fileoverview Authentication validation schemas for Egyptian Map of Pi platform
 * @version 1.0.0
 * 
 * Implements comprehensive validation schemas for authentication-related requests
 * with specific focus on Egyptian market requirements, bilingual support, and
 * regulatory compliance.
 */

import { 
  IsString, 
  IsNotEmpty, 
  Length, 
  IsOptional, 
  ValidateNested, 
  IsBoolean, 
  Matches, 
  IsIn 
} from 'class-validator'; // v0.14.0
import { Type, Transform } from 'class-transformer'; // v0.5.1
import { ErrorCodes } from '../constants/error-codes';
import { validateInput } from '../utils/validation.util';

// Egyptian governorates list for validation
const EGYPTIAN_GOVERNORATES = [
  'Cairo', 'Alexandria', 'Giza', 'Qalyubia', 'Gharbia', 'Menoufia',
  'Beheira', 'Kafr El Sheikh', 'Damietta', 'Port Said', 'Ismailia',
  'Suez', 'Sharqia', 'Dakahlia', 'Faiyum', 'Beni Suef', 'Minya',
  'Asyut', 'Sohag', 'Qena', 'Luxor', 'Aswan', 'Red Sea', 'New Valley',
  'Matrouh', 'North Sinai', 'South Sinai'
];

// Business types recognized in Egypt
const BUSINESS_TYPES = [
  'sole_proprietorship',
  'partnership',
  'limited_liability',
  'joint_stock',
  'foreign_branch',
  'representative_office'
];

/**
 * Data transfer object for Pi Network authentication validation
 */
export class PiAuthDto {
  @IsString()
  @IsNotEmpty()
  @Length(32, 512)
  @Matches(/^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/, {
    message: 'Invalid access token format'
  })
  accessToken: string;

  @IsString()
  @IsNotEmpty()
  @Length(16, 64)
  @Matches(/^[A-Za-z0-9\-_]+$/, {
    message: 'Invalid Pi Network ID format'
  })
  piId: string;

  @IsString()
  @IsNotEmpty()
  @Length(32, 128)
  @Matches(/^[A-Za-z0-9\-_]+$/, {
    message: 'Invalid device ID format'
  })
  deviceId: string;
}

/**
 * Data transfer object for Egyptian KYC validation
 */
export class KycValidationDto {
  @IsString()
  @IsNotEmpty()
  @Length(14, 14)
  @Matches(/^\d{14}$/, {
    message: 'Invalid Egyptian national ID format'
  })
  nationalId: string;

  @IsString()
  @IsNotEmpty()
  @Length(11, 11)
  @Matches(/^(010|011|012|015)\d{8}$/, {
    message: 'Invalid Egyptian phone number format'
  })
  phoneNumber: string;

  @IsString()
  @IsNotEmpty()
  @Length(10, 200)
  @Matches(/^[\u0600-\u06FF\s\d\u060c.\u061f-]+$/, {
    message: 'Address must be in Arabic'
  })
  addressArabic: string;

  @IsString()
  @IsNotEmpty()
  @Length(10, 200)
  @Matches(/^[A-Za-z0-9\s,.-]+$/, {
    message: 'Invalid English address format'
  })
  addressEnglish: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(EGYPTIAN_GOVERNORATES)
  governorate: string;

  @IsString()
  @IsNotEmpty()
  @Length(5, 5)
  @Matches(/^\d{5}$/, {
    message: 'Invalid Egyptian postal code format'
  })
  postalCode: string;
}

/**
 * Data transfer object for Egyptian merchant validation
 */
export class MerchantValidationDto {
  @IsString()
  @IsNotEmpty()
  @Length(3, 100)
  @Matches(/^[\u0600-\u06FF\s\d\u060c.\u061f-]+$/, {
    message: 'Business name must be in Arabic'
  })
  businessNameArabic: string;

  @IsString()
  @IsNotEmpty()
  @Length(3, 100)
  @Matches(/^[A-Za-z0-9\s,.-]+$/, {
    message: 'Invalid English business name format'
  })
  businessNameEnglish: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(BUSINESS_TYPES)
  businessType: string;

  @IsString()
  @IsNotEmpty()
  @Length(9, 9)
  @Matches(/^\d{9}$/, {
    message: 'Invalid Egyptian tax number format'
  })
  taxNumber: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  @Matches(/^\d{6}$/, {
    message: 'Invalid commercial register number format'
  })
  commercialRegister: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(EGYPTIAN_GOVERNORATES)
  governorate: string;

  @IsBoolean()
  @IsNotEmpty()
  @Transform(({ value }) => value === true)
  acceptsTerms: boolean;
}

/**
 * Validates Pi Network authentication data
 * @param authData - Authentication data to validate
 * @returns Promise<ErrorResponse | null>
 */
export async function validatePiAuth(authData: PiAuthDto): Promise<ErrorResponse | null> {
  return validateInput(authData, PiAuthDto);
}

/**
 * Validates Egyptian KYC data
 * @param kycData - KYC data to validate
 * @returns Promise<ErrorResponse | null>
 */
export async function validateKyc(kycData: KycValidationDto): Promise<ErrorResponse | null> {
  return validateInput(kycData, KycValidationDto);
}

/**
 * Validates Egyptian merchant registration data
 * @param merchantData - Merchant data to validate
 * @returns Promise<ErrorResponse | null>
 */
export async function validateMerchant(merchantData: MerchantValidationDto): Promise<ErrorResponse | null> {
  return validateInput(merchantData, MerchantValidationDto);
}