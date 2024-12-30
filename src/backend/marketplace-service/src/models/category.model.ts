/**
 * @fileoverview Defines the MongoDB schema and model for product categories in the Egyptian Map of Pi marketplace.
 * Implements bilingual support (Arabic/English), hierarchical category structures, and automated slug generation
 * with comprehensive validation and indexing strategies.
 * 
 * @version 1.0.0
 */

import { Schema, model, Document, Types } from 'mongoose'; // v6.0.0
import { BaseDocument } from '../../../shared/interfaces/base.interface';

/**
 * Interface representing a category document in MongoDB with bilingual and hierarchical support.
 * Extends both BaseDocument for common fields and Document for MongoDB functionality.
 */
export interface CategoryDocument extends BaseDocument, Document {
  /** Arabic category name with RTL support */
  nameAr: string;
  
  /** English category name */
  nameEn: string;
  
  /** URL-friendly unique identifier */
  slug: string;
  
  /** Optional category description */
  description?: string;
  
  /** CDN URL for category icon */
  icon?: string;
  
  /** Reference to parent category */
  parentId?: Types.ObjectId;
  
  /** Display order in category grid */
  order: number;
  
  /** Category visibility status */
  isActive: boolean;
}

/**
 * MongoDB schema definition for categories with comprehensive validation and indexing.
 */
const categorySchema = new Schema<CategoryDocument>({
  nameAr: {
    type: String,
    required: [true, 'Arabic name is required'],
    minlength: [2, 'Arabic name must be at least 2 characters'],
    match: [/^[\u0600-\u06FF\s]+$/, 'Arabic name must contain only Arabic characters'],
    trim: true,
  },
  nameEn: {
    type: String,
    required: [true, 'English name is required'],
    minlength: [2, 'English name must be at least 2 characters'],
    match: [/^[a-zA-Z0-9\s]+$/, 'English name must contain only alphanumeric characters'],
    trim: true,
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    match: [/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'],
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters'],
  },
  icon: {
    type: String,
    match: [/^https?:\/\/.+/, 'Icon must be a valid URL'],
  },
  parentId: {
    type: Types.ObjectId,
    ref: 'Category',
    validate: {
      validator: validateParentId,
      message: 'Invalid parent category',
    },
  },
  order: {
    type: Number,
    default: 0,
    min: [0, 'Order must be a non-negative number'],
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

/**
 * Create indexes for optimized querying and data integrity
 */
categorySchema.index({ nameAr: 1, nameEn: 1 }, { unique: true });
categorySchema.index({ slug: 1 }, { unique: true });
categorySchema.index({ parentId: 1 });
categorySchema.index({ order: 1 });
categorySchema.index({ isActive: 1 });

/**
 * Pre-save middleware to generate unique URL-friendly slug from English category name
 */
categorySchema.pre('save', async function(next) {
  if (this.isModified('nameEn')) {
    try {
      this.slug = await generateSlug(this.nameEn);
      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

/**
 * Generates a unique URL-friendly slug from the English category name
 * @param nameEn - English category name
 * @returns Promise resolving to unique slug
 */
async function generateSlug(nameEn: string): Promise<string> {
  let baseSlug = nameEn
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
  
  let slug = baseSlug;
  let counter = 1;
  
  // Ensure slug uniqueness
  while (await Category.exists({ slug })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  
  return slug;
}

/**
 * Validates parent category to prevent circular references and maintain hierarchy integrity
 * @param parentId - ObjectId of parent category
 * @returns Promise resolving to validation result
 */
async function validateParentId(parentId: Types.ObjectId): Promise<boolean> {
  if (!parentId) return true;

  const MAX_HIERARCHY_DEPTH = 5;
  
  // Check if parent exists
  const parent = await Category.findById(parentId);
  if (!parent) return false;
  
  // Check for circular references and maximum depth
  let currentParent = parent;
  let depth = 1;
  
  while (currentParent.parentId && depth < MAX_HIERARCHY_DEPTH) {
    if (currentParent.parentId.equals(this._id)) return false;
    currentParent = await Category.findById(currentParent.parentId);
    if (!currentParent) return false;
    depth++;
  }
  
  return depth < MAX_HIERARCHY_DEPTH;
}

/**
 * Virtual for getting child categories
 */
categorySchema.virtual('children', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parentId',
});

/**
 * MongoDB model for category collection
 */
export const Category = model<CategoryDocument>('Category', categorySchema);

export default Category;