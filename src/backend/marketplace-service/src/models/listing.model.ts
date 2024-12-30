/**
 * @fileoverview MongoDB schema and model definition for marketplace listings with
 * comprehensive validation rules, bilingual support, and geospatial features for
 * the Egyptian market.
 * 
 * @version 1.0.0
 */

import { Schema, model, Document } from 'mongoose'; // v6.0.0
import { ListingDocument, ListingStatus } from '../interfaces/listing.interface';
import { BaseDocument } from '../../../shared/interfaces/base.interface';

/**
 * Regular expressions for content validation
 */
const ARABIC_TEXT_REGEX = /^[\u0600-\u06FF\s\d.,!?()-]+$/;
const ENGLISH_TEXT_REGEX = /^[A-Za-z0-9\s.,!?()-]+$/;
const URL_REGEX = /^https:\/\/.*\.(jpg|jpeg|png|webp)$/i;

/**
 * Geographic bounds for Egypt
 */
const EGYPT_BOUNDS = {
  LAT: { MIN: 22, MAX: 32 }, // 22°N to 32°N
  LNG: { MIN: 25, MAX: 37 }  // 25°E to 37°E
};

/**
 * Schema definition for price history tracking
 */
const priceHistorySchema = new Schema({
  price: { 
    type: Number, 
    required: true 
  },
  timestamp: { 
    type: Date, 
    default: Date.now 
  }
}, { _id: false });

/**
 * Enhanced MongoDB schema for marketplace listings with comprehensive validation
 */
const ListingSchema = new Schema<ListingDocument>({
  sellerId: {
    type: Schema.Types.ObjectId,
    ref: 'Merchant',
    required: [true, 'Seller ID is required'],
    index: true
  },
  titleAr: {
    type: String,
    required: [true, 'Arabic title is required'],
    minlength: [3, 'Arabic title must be at least 3 characters'],
    maxlength: [100, 'Arabic title cannot exceed 100 characters'],
    validate: {
      validator: (v: string) => ARABIC_TEXT_REGEX.test(v),
      message: 'Arabic title must contain only Arabic characters'
    },
    trim: true
  },
  titleEn: {
    type: String,
    required: [true, 'English title is required'],
    minlength: [3, 'English title must be at least 3 characters'],
    maxlength: [100, 'English title cannot exceed 100 characters'],
    validate: {
      validator: (v: string) => ENGLISH_TEXT_REGEX.test(v),
      message: 'English title must contain only English characters'
    },
    trim: true
  },
  descriptionAr: {
    type: String,
    required: [true, 'Arabic description is required'],
    minlength: [10, 'Arabic description must be at least 10 characters'],
    maxlength: [2000, 'Arabic description cannot exceed 2000 characters'],
    validate: {
      validator: (v: string) => ARABIC_TEXT_REGEX.test(v),
      message: 'Arabic description must contain only Arabic characters'
    },
    trim: true
  },
  descriptionEn: {
    type: String,
    required: [true, 'English description is required'],
    minlength: [10, 'English description must be at least 10 characters'],
    maxlength: [2000, 'English description cannot exceed 2000 characters'],
    validate: {
      validator: (v: string) => ENGLISH_TEXT_REGEX.test(v),
      message: 'English description must contain only English characters'
    },
    trim: true
  },
  category: {
    type: Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Category is required'],
    index: true
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative'],
    validate: {
      validator: (v: number) => Number.isFinite(v) && v === Math.round(v * 100) / 100,
      message: 'Price must have at most 2 decimal places'
    }
  },
  images: {
    type: [String],
    required: [true, 'At least one image is required'],
    validate: [
      {
        validator: (v: string[]) => v.length >= 1 && v.length <= 10,
        message: 'Number of images must be between 1 and 10'
      },
      {
        validator: (v: string[]) => v.every(url => URL_REGEX.test(url)),
        message: 'All image URLs must be valid and use HTTPS'
      }
    ]
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
        validator: (coords: number[]) => {
          return coords.length === 2 &&
            coords[1] >= EGYPT_BOUNDS.LAT.MIN && coords[1] <= EGYPT_BOUNDS.LAT.MAX &&
            coords[0] >= EGYPT_BOUNDS.LNG.MIN && coords[0] <= EGYPT_BOUNDS.LNG.MAX;
        },
        message: 'Coordinates must be within Egypt boundaries'
      }
    }
  },
  status: {
    type: String,
    enum: Object.values(ListingStatus),
    default: ListingStatus.DRAFT,
    index: true
  },
  views: {
    type: Number,
    default: 0,
    min: [0, 'Views cannot be negative']
  },
  priceHistory: {
    type: [priceHistorySchema],
    default: []
  },
  governorate: {
    type: String,
    required: [true, 'Governorate is required'],
    index: true
  },
  tags: {
    type: [String],
    validate: [
      {
        validator: (v: string[]) => v.length <= 10,
        message: 'Cannot have more than 10 tags'
      }
    ],
    index: true
  },
  condition: {
    type: String,
    required: [true, 'Product condition is required'],
    enum: ['New', 'Used', 'Refurbished']
  },
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  schemaVersion: {
    type: String,
    default: '1.0.0'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

/**
 * Create indexes for optimized queries
 */
ListingSchema.index({ titleAr: 'text', titleEn: 'text' });
ListingSchema.index({ location: '2dsphere' });
ListingSchema.index({ category: 1, status: 1 });
ListingSchema.index({ sellerId: 1, status: 1 });
ListingSchema.index({ createdAt: -1 });

/**
 * Pre-save hook to validate and process listing price
 */
ListingSchema.pre('save', async function(next) {
  if (this.isModified('price')) {
    if (this.price < 0) {
      throw new Error('Price cannot be negative');
    }
    
    // Round to 2 decimal places
    this.price = Math.round(this.price * 100) / 100;
    
    // Add to price history
    this.priceHistory.push({
      price: this.price,
      timestamp: new Date()
    });
  }
  next();
});

/**
 * Pre-save hook to validate listing location coordinates
 */
ListingSchema.pre('save', async function(next) {
  if (this.isModified('location')) {
    const { coordinates } = this.location;
    if (!coordinates || coordinates.length !== 2) {
      throw new Error('Invalid location coordinates');
    }
    
    const [lng, lat] = coordinates;
    if (lat < EGYPT_BOUNDS.LAT.MIN || lat > EGYPT_BOUNDS.LAT.MAX ||
        lng < EGYPT_BOUNDS.LNG.MIN || lng > EGYPT_BOUNDS.LNG.MAX) {
      throw new Error('Location must be within Egypt boundaries');
    }
  }
  next();
});

/**
 * Pre-save hook to validate bilingual content
 */
ListingSchema.pre('save', async function(next) {
  if (this.isModified('titleAr') || this.isModified('descriptionAr')) {
    if (!ARABIC_TEXT_REGEX.test(this.titleAr) || !ARABIC_TEXT_REGEX.test(this.descriptionAr)) {
      throw new Error('Arabic content must contain only Arabic characters');
    }
  }
  
  if (this.isModified('titleEn') || this.isModified('descriptionEn')) {
    if (!ENGLISH_TEXT_REGEX.test(this.titleEn) || !ENGLISH_TEXT_REGEX.test(this.descriptionEn)) {
      throw new Error('English content must contain only English characters');
    }
  }
  next();
});

/**
 * Export the Listing model with enhanced validation and tracking capabilities
 */
export const Listing = model<ListingDocument>('Listing', ListingSchema);