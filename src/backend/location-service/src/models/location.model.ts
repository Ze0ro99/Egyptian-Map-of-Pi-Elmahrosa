/**
 * @fileoverview Enhanced Mongoose model for location entities in the Egyptian Map of Pi platform.
 * Implements comprehensive geospatial functionality with MongoDB's GeoJSON support,
 * bilingual addressing, and strict validation for Egyptian geographic boundaries.
 * 
 * @version 1.0.0
 */

import { Schema, model } from 'mongoose'; // v6.0.0
import { LocationDocument, LocationType } from '../interfaces/location.interface';

/**
 * Constants for Egyptian geographic boundaries and restricted zones
 */
const EGYPT_BOUNDARIES = {
  LAT_MIN: 22.0,
  LAT_MAX: 31.8122,
  LNG_MIN: 24.7,
  LNG_MAX: 37.0569
};

/**
 * List of valid Egyptian governorates in both Arabic and English
 */
const VALID_GOVERNORATES = {
  arabic: [
    'القاهرة', 'الإسكندرية', 'الجيزة', 'القليوبية', 'البحيرة',
    'الدقهلية', 'الشرقية', 'الغربية', 'كفر الشيخ', 'المنوفية'
    // ... other governorates
  ],
  english: [
    'Cairo', 'Alexandria', 'Giza', 'Qalyubia', 'Beheira',
    'Dakahlia', 'Sharqia', 'Gharbia', 'Kafr El Sheikh', 'Monufia'
    // ... other governorates
  ]
};

/**
 * Validates if coordinates are within Egyptian boundaries and not in restricted zones
 */
const validateEgyptianCoordinates = function(coordinates: { latitude: number; longitude: number }): boolean {
  const { latitude, longitude } = coordinates;
  
  // Check basic boundary constraints
  if (latitude < EGYPT_BOUNDARIES.LAT_MIN || latitude > EGYPT_BOUNDARIES.LAT_MAX ||
      longitude < EGYPT_BOUNDARIES.LNG_MIN || longitude > EGYPT_BOUNDARIES.LNG_MAX) {
    return false;
  }

  // Check against known military and restricted zones
  // This is a simplified example - actual implementation would check against a database of restricted coordinates
  const restrictedZones = [
    // Example restricted zone coordinates
    { lat: 30.0474, lng: 31.2358, radius: 2 }, // Example military zone
    { lat: 29.9511, lng: 32.5503, radius: 5 }  // Example restricted area
  ];

  for (const zone of restrictedZones) {
    const distance = calculateDistance(latitude, longitude, zone.lat, zone.lng);
    if (distance <= zone.radius) {
      return false;
    }
  }

  return true;
};

/**
 * Validates bilingual address format and content
 */
const validateBilingualAddress = function(address: any): boolean {
  // Validate Arabic address components
  if (!address.arabic?.street || !address.arabic?.city || !address.arabic?.governorate) {
    return false;
  }

  // Validate English address components
  if (!address.english?.street || !address.english?.city || !address.english?.governorate) {
    return false;
  }

  // Validate governorate exists in official list
  if (!VALID_GOVERNORATES.arabic.includes(address.arabic.governorate) ||
      !VALID_GOVERNORATES.english.includes(address.english.governorate)) {
    return false;
  }

  // Validate postal code format (5 digits)
  if (!/^\d{5}$/.test(address.postalCode)) {
    return false;
  }

  return true;
};

/**
 * Helper function to calculate distance between two points
 */
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
           Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
           Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

/**
 * Enhanced Mongoose schema for location documents with Egyptian-specific features
 */
const LocationSchema = new Schema<LocationDocument>({
  coordinates: {
    type: {
      latitude: {
        type: Number,
        required: true,
        min: EGYPT_BOUNDARIES.LAT_MIN,
        max: EGYPT_BOUNDARIES.LAT_MAX,
        validate: {
          validator: function(v: number) {
            return validateEgyptianCoordinates({ latitude: v, longitude: this.coordinates.longitude });
          },
          message: 'Coordinates must be within Egyptian boundaries and not in restricted zones'
        }
      },
      longitude: {
        type: Number,
        required: true,
        min: EGYPT_BOUNDARIES.LNG_MIN,
        max: EGYPT_BOUNDARIES.LNG_MAX,
        validate: {
          validator: function(v: number) {
            return validateEgyptianCoordinates({ latitude: this.coordinates.latitude, longitude: v });
          },
          message: 'Coordinates must be within Egyptian boundaries and not in restricted zones'
        }
      },
      accuracy: {
        type: Number,
        required: true,
        min: 0
      }
    },
    required: true,
    index: '2dsphere'
  },
  bilingualAddress: {
    type: {
      arabic: {
        street: { type: String, required: true, trim: true },
        city: { type: String, required: true, trim: true },
        governorate: { type: String, required: true, trim: true }
      },
      english: {
        street: { type: String, required: true, trim: true },
        city: { type: String, required: true, trim: true },
        governorate: { type: String, required: true, trim: true }
      },
      postalCode: {
        type: String,
        required: true,
        match: /^\d{5}$/,
        trim: true
      }
    },
    required: true,
    validate: {
      validator: validateBilingualAddress,
      message: 'Invalid bilingual address format or content'
    }
  },
  locationType: {
    type: String,
    required: true,
    enum: Object.values(LocationType),
    index: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  restrictedZoneInfo: {
    type: {
      zoneType: {
        type: String,
        enum: ['MILITARY', 'GOVERNMENT', 'SPECIAL_ECONOMIC']
      },
      restrictions: String
    },
    required: false
  },
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  versionKey: false
});

// Create compound index for governorate-based queries
LocationSchema.index({
  'bilingualAddress.arabic.governorate': 1,
  'bilingualAddress.english.governorate': 1,
  locationType: 1
});

// Create geospatial index on coordinates
LocationSchema.index({ coordinates: '2dsphere' });

// Pre-save middleware for additional validation
LocationSchema.pre('save', function(next) {
  if (this.isModified('coordinates') || this.isModified('bilingualAddress')) {
    const coordsValid = validateEgyptianCoordinates(this.coordinates);
    const addressValid = validateBilingualAddress(this.bilingualAddress);
    
    if (!coordsValid || !addressValid) {
      next(new Error('Invalid location data'));
    }
  }
  next();
});

// Export the Location model
export const Location = model<LocationDocument>('Location', LocationSchema);