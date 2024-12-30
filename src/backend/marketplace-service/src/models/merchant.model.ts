/**
 * @fileoverview Implements MongoDB schema and model for merchants in the Egyptian Map of Pi marketplace.
 * Provides comprehensive support for merchant data persistence, validation, business verification,
 * and geospatial queries with specific adaptations for Egyptian market requirements.
 * 
 * @version 1.0.0
 */

import { Schema, model, SchemaTypes, Model } from 'mongoose'; // v6.0.0
import { MerchantDocument, MerchantVerificationStatus } from '../interfaces/merchant.interface';

// Constants for validation and configuration
const MERCHANT_COLLECTION = 'merchants';
const EGYPT_BOUNDS = {
  north: 31.8,
  south: 22,
  east: 37,
  west: 25
};
const EGYPTIAN_PHONE_REGEX = /^\+20[1-9]\d{9}$/;
const MIN_BUSINESS_NAME_LENGTH = 3;
const MAX_BUSINESS_NAME_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 1000;

/**
 * Enhanced MongoDB schema for merchant documents with comprehensive validation and indexing
 */
const MerchantSchema = new Schema<MerchantDocument>({
  piId: {
    type: String,
    required: [true, 'Pi Network ID is required'],
    unique: true,
    index: true
  },
  businessNameAr: {
    type: String,
    required: [true, 'Arabic business name is required'],
    minlength: [MIN_BUSINESS_NAME_LENGTH, 'Business name too short'],
    maxlength: [MAX_BUSINESS_NAME_LENGTH, 'Business name too long'],
    trim: true
  },
  businessNameEn: {
    type: String,
    required: [true, 'English business name is required'],
    minlength: [MIN_BUSINESS_NAME_LENGTH, 'Business name too short'],
    maxlength: [MAX_BUSINESS_NAME_LENGTH, 'Business name too long'],
    trim: true
  },
  descriptionAr: {
    type: String,
    required: [true, 'Arabic description is required'],
    maxlength: [MAX_DESCRIPTION_LENGTH, 'Description too long'],
    trim: true
  },
  descriptionEn: {
    type: String,
    required: [true, 'English description is required'],
    maxlength: [MAX_DESCRIPTION_LENGTH, 'Description too long'],
    trim: true
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [EGYPTIAN_PHONE_REGEX, 'Invalid Egyptian phone number format'],
    unique: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true
    },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: function(coords: number[]) {
          return coords[0] >= EGYPT_BOUNDS.west && 
                 coords[0] <= EGYPT_BOUNDS.east && 
                 coords[1] >= EGYPT_BOUNDS.south && 
                 coords[1] <= EGYPT_BOUNDS.north;
        },
        message: 'Coordinates must be within Egypt boundaries'
      }
    },
    address: {
      type: String,
      required: [true, 'Address is required']
    },
    governorate: {
      type: String,
      required: [true, 'Governorate is required']
    },
    district: {
      type: String,
      required: [true, 'District is required']
    },
    postalCode: {
      type: String,
      required: [true, 'Postal code is required']
    }
  },
  verificationStatus: {
    type: String,
    enum: Object.values(MerchantVerificationStatus),
    default: MerchantVerificationStatus.PENDING
  },
  businessDocuments: [{
    type: {
      type: String,
      required: true
    },
    url: {
      type: String,
      required: true
    },
    verified: {
      type: Boolean,
      default: false
    },
    verificationDate: Date,
    expiryDate: {
      type: Date,
      required: true,
      validate: {
        validator: function(date: Date) {
          return date > new Date();
        },
        message: 'Document expiry date must be in the future'
      }
    }
  }],
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  totalListings: {
    type: Number,
    min: 0,
    default: 0
  },
  totalSales: {
    type: Number,
    min: 0,
    default: 0
  },
  operatingHours: {
    type: Map,
    of: {
      open: String,
      close: String,
      isClosed: Boolean
    }
  },
  categories: [{
    type: String,
    required: true
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  versionKey: true
});

// Indexes for optimized queries
MerchantSchema.index({ location: '2dsphere' });
MerchantSchema.index({ businessNameAr: 'text', businessNameEn: 'text' });
MerchantSchema.index({ verificationStatus: 1, isActive: 1 });
MerchantSchema.index({ categories: 1 });

/**
 * Pre-save hook for data validation and consistency
 */
MerchantSchema.pre('save', async function(next) {
  // Validate location type
  if (this.location && this.location.coordinates) {
    this.location.type = 'Point';
  }

  // Set default values if not set
  if (this.isNew) {
    this.rating = 0;
    this.totalListings = 0;
    this.totalSales = 0;
    this.verificationStatus = MerchantVerificationStatus.PENDING;
  }

  next();
});

// Static methods for common queries
MerchantSchema.statics.findByPiId = async function(piId: string): Promise<MerchantDocument | null> {
  return this.findOne({ piId, isActive: true });
};

MerchantSchema.statics.findVerifiedMerchants = async function(): Promise<MerchantDocument[]> {
  return this.find({
    verificationStatus: MerchantVerificationStatus.VERIFIED,
    isActive: true
  });
};

MerchantSchema.statics.findByLocation = async function(
  longitude: number,
  latitude: number,
  maxDistance: number = 5000 // 5km default radius
): Promise<MerchantDocument[]> {
  return this.find({
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: maxDistance
      }
    },
    isActive: true,
    verificationStatus: MerchantVerificationStatus.VERIFIED
  });
};

MerchantSchema.statics.findActiveInRegion = async function(
  governorate: string
): Promise<MerchantDocument[]> {
  return this.find({
    'location.governorate': governorate,
    isActive: true,
    verificationStatus: MerchantVerificationStatus.VERIFIED
  });
};

MerchantSchema.statics.searchByName = async function(
  query: string,
  language: 'ar' | 'en' = 'ar'
): Promise<MerchantDocument[]> {
  const searchField = language === 'ar' ? 'businessNameAr' : 'businessNameEn';
  return this.find({
    [searchField]: new RegExp(query, 'i'),
    isActive: true,
    verificationStatus: MerchantVerificationStatus.VERIFIED
  });
};

// Create and export the model
const MerchantModel = model<MerchantDocument, Model<MerchantDocument>>(
  MERCHANT_COLLECTION,
  MerchantSchema
);

export default MerchantModel;