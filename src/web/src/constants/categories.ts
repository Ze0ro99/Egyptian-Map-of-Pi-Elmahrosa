// @mui/material/icons version: 5.14.0
import LocalMallIcon from '@mui/material/icons/LocalMall';
import DevicesIcon from '@mui/material/icons/Devices';
import RestaurantIcon from '@mui/material/icons/Restaurant';
import BuildIcon from '@mui/material/icons/Build';
import MoreHorizIcon from '@mui/material/icons/MoreHoriz';

/**
 * Interface defining a marketplace category with bilingual support
 * @property id - Unique identifier for the category
 * @property nameAr - Category name in Arabic
 * @property nameEn - Category name in English
 * @property icon - Material UI icon component for the category
 */
export interface Category {
  id: string;
  nameAr: string;
  nameEn: string;
  icon: React.ComponentType;
}

/**
 * Predefined marketplace categories for the Egyptian Map of Pi
 * Includes bilingual names (Arabic/English) and Material UI icons
 * Categories are marked as readonly to prevent runtime modifications
 */
export const CATEGORIES: readonly Category[] = [
  {
    id: 'FASHION',
    nameAr: 'الموضة والملابس',
    nameEn: 'Fashion & Clothing',
    icon: LocalMallIcon
  },
  {
    id: 'ELECTRONICS',
    nameAr: 'الإلكترونيات',
    nameEn: 'Electronics',
    icon: DevicesIcon
  },
  {
    id: 'FOOD',
    nameAr: 'الطعام والمشروبات',
    nameEn: 'Food & Beverages',
    icon: RestaurantIcon
  },
  {
    id: 'SERVICES',
    nameAr: 'الخدمات',
    nameEn: 'Services',
    icon: BuildIcon
  },
  {
    id: 'OTHER',
    nameAr: 'أخرى',
    nameEn: 'Other',
    icon: MoreHorizIcon
  }
] as const;

/**
 * Type representing valid category IDs
 * Derived from the CATEGORIES array for type safety
 */
export type CategoryId = typeof CATEGORIES[number]['id'];

/**
 * Helper function to get a category by its ID
 * @param id - The category ID to look up
 * @returns The matching category or undefined if not found
 */
export const getCategoryById = (id: CategoryId): Category | undefined => {
  return CATEGORIES.find(category => category.id === id);
};

/**
 * Helper function to get a category name in the specified language
 * @param id - The category ID
 * @param language - The desired language ('ar' or 'en')
 * @returns The category name in the specified language or undefined if category not found
 */
export const getCategoryName = (id: CategoryId, language: 'ar' | 'en'): string | undefined => {
  const category = getCategoryById(id);
  if (!category) return undefined;
  return language === 'ar' ? category.nameAr : category.nameEn;
};

export default CATEGORIES;