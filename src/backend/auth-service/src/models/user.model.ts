/**
 * @fileoverview Defines the MongoDB user model for the Egyptian Map of Pi authentication service.
 * Implements secure user data structure with Pi Network integration, KYC status, location tracking,
 * and merchant capabilities specific to the Egyptian market.
 * 
 * @version 1.0.0
 */

import { Schema, model, Document } from 'mongoose'; // v6.0.0
import { Field } from 'mongodb-encryption'; // v2.0.0
import { BaseDocument } from '../../../shared/interfaces/base.interface';
import { Location, LocationType, EGYPT_BOUNDARIES } from '../../../location-service/src/interfaces/location.interface';

/**
 * Enumeration for KYC status levels in Egyptian context
 */
enum KYCStatus {
  PENDING = 'PENDING',
  BASIC = 'BASIC',
  VERIFIED = 'VERIFIED',
  MERCHANT = 'MERCHANT',
  REJECTED = 'REJECTED'
}

/**
 * Enumeration for supported languages
 */
enum Language {
  ARABIC = 'ar',
  ENGLISH = 'en'
}

/**
 * Interface for merchant-specific details
 */
interface MerchantDetails {
  businessName: {
    ar: string;
    en: string;
  };
  commercialRegister: string;
  taxId: string;
  businessType: string;
  verificationDate?: Date;
  operatingHours: {
    open: string;
    close: string;
    days: number[];
  };
}

/**
 * Interface extending MongoDB Document for User model with Egyptian market specifics
 */
export interface UserDocument extends Document, BaseDocument {
  piId: string;
  username: string;
  email: Field<string>;
  phone: Field<string>;
  fullName: Field<string>;
  roles: string[];
  location: Location;
  kycStatus: KYCStatus;
  isMerchant: boolean;
  lastLoginAt: Date;
  language: Language;
  deviceId: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  nameAr: string;
  nameEn: string;
  merchantDetails?: MerchantDetails;
}

/**
 * Mongoose schema definition for User model with Egyptian market requirements
 */
const UserSchema = new Schema<UserDocument>({
  piId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  username: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 50
  },
  email: {
    type: Field<string>(),
    unique: true,
    sparse: true,
    validate: {
      validator: (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
      message: 'Invalid email format'
    }
  },
  phone: {
    type: Field<string>(),
    unique: true,
    sparse: true,
    validate: {
      validator: (phone: string) => /^(\+20|0)?1[0125][0-9]{8}$/.test(phone),
      message: 'Invalid Egyptian phone number'
    }
  },
  fullName: {
    type: Field<string>(),
    required: true
  },
  roles: {
    type: [String],
    default: ['user'],
    validate: {
      validator: (roles: string[]) => roles.every(role => ['user', 'merchant', 'admin'].includes(role)),
      message: 'Invalid role assignment'
    }
  },
  location: {
    type: {
      coordinates: {
        latitude: Number,
        longitude: Number,
        accuracy: Number
      },
      address: {
        streetAr: String,
        streetEn: String,
        cityAr: String,
        cityEn: String,
        governorateAr: String,
        governorateEn: String,
        postalCode: String
      },
      type: {
        type: String,
        enum: Object.values(LocationType),
        default: LocationType.DELIVERY_ADDRESS
      }
    },
    required: true,
    validate: {
      validator: validateLocation,
      message: 'Location must be within Egyptian boundaries'
    }
  },
  kycStatus: {
    type: String,
    enum: Object.values(KYCStatus),
    default: KYCStatus.PENDING
  },
  isMerchant: {
    type: Boolean,
    default: false
  },
  lastLoginAt: {
    type: Date,
    default: Date.now
  },
  language: {
    type: String,
    enum: Object.values(Language),
    default: Language.ARABIC
  },
  deviceId: {
    type: String,
    required: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  isPhoneVerified: {
    type: Boolean,
    default: false
  },
  nameAr: {
    type: String,
    required: true,
    validate: {
      validator: (name: string) => /^[\u0600-\u06FF\s]+$/.test(name),
      message: 'Arabic name must contain only Arabic characters'
    }
  },
  nameEn: {
    type: String,
    required: true,
    validate: {
      validator: (name: string) => /^[A-Za-z\s]+$/.test(name),
      message: 'English name must contain only Latin characters'
    }
  },
  merchantDetails: {
    type: {
      businessName: {
        ar: String,
        en: String
      },
      commercialRegister: String,
      taxId: String,
      businessType: String,
      verificationDate: Date,
      operatingHours: {
        open: String,
        close: String,
        days: [Number]
      }
    },
    required: function(this: UserDocument) {
      return this.isMerchant;
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true }
});

/**
 * Validates if location is within Egyptian boundaries
 */
function validateLocation(location: Location): boolean {
  const { latitude, longitude } = location.coordinates;
  return (
    latitude >= EGYPT_BOUNDARIES.minLatitude &&
    latitude <= EGYPT_BOUNDARIES.maxLatitude &&
    longitude >= EGYPT_BOUNDARIES.minLongitude &&
    longitude <= EGYPT_BOUNDARIES.maxLongitude
  );
}

/**
 * Transform method for JSON serialization with PII protection
 */
UserSchema.methods.toJSON = function() {
  const obj = this.toObject();
  
  // Remove sensitive fields
  delete obj.deviceId;
  delete obj.email;
  delete obj.phone;
  
  // Transform MongoDB _id to id
  obj.id = obj._id;
  delete obj._id;
  delete obj.__v;
  
  return obj;
};

// Create indexes for optimized queries
UserSchema.index({ piId: 1 }, { unique: true });
UserSchema.index({ email: 1 }, { unique: true, sparse: true });
UserSchema.index({ phone: 1 }, { unique: true, sparse: true });
UserSchema.index({ 'location.coordinates': '2dsphere' });
UserSchema.index({ nameAr: 'text', nameEn: 'text' });

// Static methods for common queries
UserSchema.statics.findByPiId = function(piId: string) {
  return this.findOne({ piId, isActive: true });
};

UserSchema.statics.findByEmail = function(email: string) {
  return this.findOne({ email, isActive: true });
};

UserSchema.statics.findByPhone = function(phone: string) {
  return this.findOne({ phone, isActive: true });
};

UserSchema.statics.findMerchantsByLocation = function(coordinates: { latitude: number, longitude: number }, radiusKm: number) {
  return this.find({
    isMerchant: true,
    isActive: true,
    'location.coordinates': {
      $nearSphere: {
        $geometry: {
          type: 'Point',
          coordinates: [coordinates.longitude, coordinates.latitude]
        },
        $maxDistance: radiusKm * 1000 // Convert km to meters
      }
    }
  });
};

export const UserModel = model<UserDocument>('User', UserSchema);