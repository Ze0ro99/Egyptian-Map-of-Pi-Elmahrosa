/**
 * @fileoverview Categories controller implementing comprehensive category management
 * for the Egyptian Map of Pi marketplace with bilingual support and hierarchy handling.
 * @version 1.0.0
 */

import { Request, Response } from 'express'; // v4.18.0
import { Category, CategoryDocument } from '../models/category.model';
import { createSuccessResponse, createErrorResponse, createPaginatedResponse } from '../../../shared/utils/response.util';
import { ErrorCodes } from '../../../shared/constants/error-codes';
import { validateArabicContent } from '../../../shared/utils/validation.util';
import { logger } from '../../../shared/utils/logger.util';

/**
 * Controller class handling all category-related operations with bilingual and hierarchy support
 */
export class CategoriesController {
  // Configuration constants
  private readonly MAX_HIERARCHY_LEVEL = 3;
  private readonly DEFAULT_PAGE_SIZE = 20;
  private readonly MAX_PAGE_SIZE = 100;

  /**
   * Retrieves all categories with support for pagination, parent filtering, and language preference
   */
  public async getAllCategories(req: Request, res: Response): Promise<Response> {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(
        this.MAX_PAGE_SIZE,
        Math.max(1, parseInt(req.query.limit as string) || this.DEFAULT_PAGE_SIZE)
      );
      const parentId = req.query.parentId as string;
      const lang = (req.query.lang as string || 'ar').toLowerCase();

      // Build query filters
      const filters: any = { isActive: true };
      if (parentId) {
        filters.parentId = parentId;
      }

      // Execute query with pagination
      const totalItems = await Category.countDocuments(filters);
      const categories = await Category.find(filters)
        .sort({ order: 1, nameAr: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('children');

      // Format response based on language preference
      const formattedCategories = categories.map(category => ({
        id: category.id,
        name: lang === 'en' ? category.nameEn : category.nameAr,
        slug: category.slug,
        icon: category.icon,
        order: category.order,
        children: category.children?.map(child => ({
          id: child.id,
          name: lang === 'en' ? child.nameEn : child.nameAr,
          slug: child.slug
        }))
      }));

      return res.json(createPaginatedResponse(
        formattedCategories,
        page,
        limit,
        totalItems,
        lang as 'ar' | 'en'
      ));

    } catch (error) {
      logger.error('Failed to retrieve categories', error);
      return res.status(500).json(createErrorResponse(
        ErrorCodes.SYSTEM_INTERNAL_ERROR,
        'Failed to retrieve categories',
        [],
        req.id,
        'ar'
      ));
    }
  }

  /**
   * Retrieves a specific category by ID with full hierarchy information
   */
  public async getCategoryById(req: Request, res: Response): Promise<Response> {
    try {
      const categoryId = req.params.id;
      const lang = (req.query.lang as string || 'ar').toLowerCase();

      const category = await Category.findOne({ _id: categoryId, isActive: true })
        .populate('children')
        .populate('parentId');

      if (!category) {
        return res.status(404).json(createErrorResponse(
          ErrorCodes.DATA_NOT_FOUND,
          'Category not found',
          [],
          req.id,
          lang as 'ar' | 'en'
        ));
      }

      const formattedCategory = {
        id: category.id,
        nameAr: category.nameAr,
        nameEn: category.nameEn,
        slug: category.slug,
        icon: category.icon,
        order: category.order,
        parent: category.parentId ? {
          id: category.parentId.id,
          name: lang === 'en' ? category.parentId.nameEn : category.parentId.nameAr,
          slug: category.parentId.slug
        } : null,
        children: category.children?.map(child => ({
          id: child.id,
          name: lang === 'en' ? child.nameEn : child.nameAr,
          slug: child.slug
        }))
      };

      return res.json(createSuccessResponse(formattedCategory, null, lang as 'ar' | 'en'));

    } catch (error) {
      logger.error('Failed to retrieve category', error);
      return res.status(500).json(createErrorResponse(
        ErrorCodes.SYSTEM_INTERNAL_ERROR,
        'Failed to retrieve category',
        [],
        req.id,
        'ar'
      ));
    }
  }

  /**
   * Creates a new category with bilingual support and hierarchy validation
   */
  public async createCategory(req: Request, res: Response): Promise<Response> {
    try {
      const { nameAr, nameEn, parentId, icon, order } = req.body;

      // Validate required fields
      if (!nameAr || !nameEn) {
        return res.status(400).json(createErrorResponse(
          ErrorCodes.DATA_VALIDATION_FAILED,
          'Category names are required in both Arabic and English',
          [],
          req.id,
          'ar'
        ));
      }

      // Validate Arabic content
      if (!validateArabicContent(nameAr)) {
        return res.status(400).json(createErrorResponse(
          ErrorCodes.DATA_VALIDATION_FAILED,
          'Invalid Arabic category name',
          [],
          req.id,
          'ar'
        ));
      }

      // Check hierarchy level if parent specified
      if (parentId) {
        const parentCategory = await Category.findById(parentId);
        if (!parentCategory || !parentCategory.isActive) {
          return res.status(400).json(createErrorResponse(
            ErrorCodes.DATA_NOT_FOUND,
            'Parent category not found',
            [],
            req.id,
            'ar'
          ));
        }

        const level = await this.calculateHierarchyLevel(parentId);
        if (level >= this.MAX_HIERARCHY_LEVEL) {
          return res.status(400).json(createErrorResponse(
            ErrorCodes.INVALID_HIERARCHY,
            'Maximum category hierarchy level exceeded',
            [],
            req.id,
            'ar'
          ));
        }
      }

      // Create new category
      const category = new Category({
        nameAr,
        nameEn,
        parentId,
        icon,
        order: order || 0,
        isActive: true
      });

      await category.save();

      return res.status(201).json(createSuccessResponse(category, null, 'ar'));

    } catch (error) {
      logger.error('Failed to create category', error);
      return res.status(500).json(createErrorResponse(
        ErrorCodes.SYSTEM_INTERNAL_ERROR,
        'Failed to create category',
        [],
        req.id,
        'ar'
      ));
    }
  }

  /**
   * Updates category with validation for bilingual content and hierarchy
   */
  public async updateCategory(req: Request, res: Response): Promise<Response> {
    try {
      const categoryId = req.params.id;
      const { nameAr, nameEn, parentId, icon, order, isActive } = req.body;

      const category = await Category.findById(categoryId);
      if (!category || !category.isActive) {
        return res.status(404).json(createErrorResponse(
          ErrorCodes.DATA_NOT_FOUND,
          'Category not found',
          [],
          req.id,
          'ar'
        ));
      }

      // Validate Arabic content if provided
      if (nameAr && !validateArabicContent(nameAr)) {
        return res.status(400).json(createErrorResponse(
          ErrorCodes.DATA_VALIDATION_FAILED,
          'Invalid Arabic category name',
          [],
          req.id,
          'ar'
        ));
      }

      // Check hierarchy level if parent is being updated
      if (parentId && parentId !== category.parentId?.toString()) {
        const level = await this.calculateHierarchyLevel(parentId);
        if (level >= this.MAX_HIERARCHY_LEVEL) {
          return res.status(400).json(createErrorResponse(
            ErrorCodes.INVALID_HIERARCHY,
            'Maximum category hierarchy level exceeded',
            [],
            req.id,
            'ar'
          ));
        }
      }

      // Update category
      Object.assign(category, {
        nameAr: nameAr || category.nameAr,
        nameEn: nameEn || category.nameEn,
        parentId: parentId || category.parentId,
        icon: icon || category.icon,
        order: order ?? category.order,
        isActive: isActive ?? category.isActive
      });

      await category.save();

      return res.json(createSuccessResponse(category, null, 'ar'));

    } catch (error) {
      logger.error('Failed to update category', error);
      return res.status(500).json(createErrorResponse(
        ErrorCodes.SYSTEM_INTERNAL_ERROR,
        'Failed to update category',
        [],
        req.id,
        'ar'
      ));
    }
  }

  /**
   * Soft deletes category with hierarchy validation
   */
  public async deleteCategory(req: Request, res: Response): Promise<Response> {
    try {
      const categoryId = req.params.id;

      const category = await Category.findById(categoryId);
      if (!category || !category.isActive) {
        return res.status(404).json(createErrorResponse(
          ErrorCodes.DATA_NOT_FOUND,
          'Category not found',
          [],
          req.id,
          'ar'
        ));
      }

      // Check for active child categories
      const hasActiveChildren = await Category.exists({
        parentId: categoryId,
        isActive: true
      });

      if (hasActiveChildren) {
        return res.status(400).json(createErrorResponse(
          ErrorCodes.INVALID_HIERARCHY,
          'Cannot delete category with active subcategories',
          [],
          req.id,
          'ar'
        ));
      }

      // Perform soft delete
      category.isActive = false;
      await category.save();

      return res.json(createSuccessResponse({ success: true }, null, 'ar'));

    } catch (error) {
      logger.error('Failed to delete category', error);
      return res.status(500).json(createErrorResponse(
        ErrorCodes.SYSTEM_INTERNAL_ERROR,
        'Failed to delete category',
        [],
        req.id,
        'ar'
      ));
    }
  }

  /**
   * Calculates the hierarchy level of a category
   * @private
   */
  private async calculateHierarchyLevel(categoryId: string): Promise<number> {
    let level = 0;
    let currentId = categoryId;

    while (currentId) {
      const category = await Category.findById(currentId);
      if (!category || !category.isActive) break;
      
      level++;
      currentId = category.parentId?.toString();
    }

    return level;
  }
}

export default CategoriesController;