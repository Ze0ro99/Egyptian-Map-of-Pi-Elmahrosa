/**
 * @fileoverview Implements comprehensive validation schemas and rules for marketplace listings
 * in the Egyptian Map of Pi platform. Handles validation for listing creation, updates, and
 * search filters with support for bilingual content (Arabic/English) and Egyptian market requirements.
 * 
 * @version 1.0.0
 */

import { 
  IsString, IsNotEmpty, Length, IsNumber, Min, Max, 
  IsArray, IsEnum, ValidateNested, IsOptional, Matches 
} from 'class-validator'; // v0.14.0
import { Type, Transform } from 'class-transformer'; // v0.5.1
import { 
  ListingDocument, ListingEntity, ListingFilter, ListingStatus 
} from '../../marketplace-service/src/interfaces/listing.interface';
import { ErrorCodes } from '../constants/error-codes';
import { validateInput } from '../utils/validation.util';
import { ErrorResponse } from '../interfaces/response.interface';

/**
 * Coordinates validation class for listing location
 */
class CoordinatesDto {
  @IsNumber()
  @Min(22.0) // Egypt's southern border
  @Max(31.833333) // Egypt's northern border
  latitude: number;

  @IsNumber()
  @Min(24.7) // Egypt's western border
  @Max(36.916667) // Egypt's eastern border
  longitude: number;
}

/**
 * Data transfer object for listing creation with enhanced Arabic support
 */
export class ListingCreateDto {
  @IsString()
  @IsNotEmpty()
  sellerId: string;

  @IsString()
  @IsNotEmpty()
  @Length(10, 100)
  @Matches(/^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\s\u060c.\u061f!]+$/, {
    message: 'Title must contain only Arabic characters'
  })
  titleAr: string;

  @IsString()
  @IsNotEmpty()
  @Length(10, 100)
  @Matches(/^[A-Za-z0-9\s.,!?-]+$/, {
    message: 'Title must contain only English characters and basic punctuation'
  })
  titleEn: string;

  @IsString()
  @IsNotEmpty()
  @Length(50, 1000)
  @Matches(/^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\s\u060c.\u061f!]+$/, {
    message: 'Description must contain only Arabic characters'
  })
  descriptionAr: string;

  @IsString()
  @IsNotEmpty()
  @Length(50, 1000)
  @Matches(/^[A-Za-z0-9\s.,!?-]+$/, {
    message: 'Description must contain only English characters and basic punctuation'
  })
  descriptionEn: string;

  @IsString()
  @IsNotEmpty()
  @Length(3, 50)
  category: string;

  @IsNumber()
  @Min(0.1)
  @Max(1000000)
  @Transform(({ value }) => parseFloat(value))
  price: number;

  @IsArray()
  @IsString({ each: true })
  @Length(1, 5, { each: false })
  images: string[];

  @ValidateNested()
  @Type(() => CoordinatesDto)
  location: CoordinatesDto;

  @IsString()
  @IsNotEmpty()
  governorate: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @Length(1, 10, { each: true })
  tags?: string[];

  @IsString()
  @IsNotEmpty()
  condition: string;
}

/**
 * Data transfer object for listing updates
 */
export class ListingUpdateDto extends ListingCreateDto {
  @IsEnum(ListingStatus)
  @IsOptional()
  status?: ListingStatus;
}

/**
 * Data transfer object for listing search filters
 */
export class ListingFilterDto implements ListingFilter {
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsEnum(ListingStatus)
  status?: ListingStatus;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  minPrice?: number;

  @IsOptional()
  @IsNumber()
  @Max(1000000)
  maxPrice?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => CoordinatesDto)
  location?: CoordinatesDto;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  radius?: number;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  searchTerm?: string;

  @IsOptional()
  @IsString()
  governorate?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  condition?: string;
}

/**
 * Validates listing creation data with enhanced Arabic and location validation
 * 
 * @param listingData - Data to validate
 * @returns Promise<ErrorResponse | null> - Validation error or null if valid
 */
export async function validateListingCreate(
  listingData: ListingCreateDto
): Promise<ErrorResponse | null> {
  return validateInput(listingData, ListingCreateDto);
}

/**
 * Validates listing update data
 * 
 * @param listingData - Data to validate
 * @returns Promise<ErrorResponse | null> - Validation error or null if valid
 */
export async function validateListingUpdate(
  listingData: ListingUpdateDto
): Promise<ErrorResponse | null> {
  return validateInput(listingData, ListingUpdateDto);
}

/**
 * Validates listing search/filter parameters
 * 
 * @param filterData - Filter parameters to validate
 * @returns Promise<ErrorResponse | null> - Validation error or null if valid
 */
export async function validateListingFilter(
  filterData: ListingFilterDto
): Promise<ErrorResponse | null> {
  return validateInput(filterData, ListingFilterDto);
}