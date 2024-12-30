/**
 * @fileoverview Frontend route constants for the Egyptian Map of Pi marketplace
 * @version 1.0.0
 * 
 * Defines all application routes supporting:
 * - Localized navigation (Arabic/English)
 * - Dynamic route parameters
 * - SEO-friendly URL patterns
 * - Hierarchical routing structure
 */

/**
 * Core route constants for the Egyptian Map of Pi marketplace
 */
export const ROUTES = {
  // Home route
  HOME: '/',
  
  // Search functionality
  SEARCH: '/search',
  
  // Category navigation
  CATEGORIES: {
    ROOT: '/categories',
    DETAILS: '/categories/[id]',
    SUBCATEGORIES: '/categories/[id]/subcategories',
    FEATURED: '/categories/featured'
  },
  
  // Listing management
  LISTINGS: {
    ROOT: '/listings',
    CREATE: '/listings/create',
    DETAILS: '/listings/[id]',
    EDIT: '/listings/[id]/edit',
    PHOTOS: '/listings/[id]/photos',
    REVIEWS: '/listings/[id]/reviews',
    SIMILAR: '/listings/[id]/similar'
  },
  
  // Messaging system
  MESSAGES: {
    ROOT: '/messages',
    CONVERSATION: '/messages/[id]',
    ARCHIVED: '/messages/archived',
    UNREAD: '/messages/unread'
  },
  
  // Payment and transaction management
  PAYMENTS: {
    ROOT: '/payments',
    HISTORY: '/payments/history',
    DETAILS: '/payments/[id]',
    ESCROW: '/payments/[id]/escrow',
    DISPUTE: '/payments/[id]/dispute'
  },
  
  // User profile and settings
  PROFILE: {
    ROOT: '/profile',
    EDIT: '/profile/edit',
    LISTINGS: '/profile/listings',
    FAVORITES: '/profile/favorites',
    SETTINGS: '/profile/settings',
    SECURITY: '/profile/security',
    VERIFICATION: '/profile/verification'
  },
  
  // Authentication routes
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    KYC: '/auth/kyc',
    VERIFY: '/auth/verify',
    RESET: '/auth/reset'
  },
  
  // Notification center
  NOTIFICATIONS: {
    ROOT: '/notifications',
    SETTINGS: '/notifications/settings',
    DETAILS: '/notifications/[id]'
  },
  
  // Error and system pages
  ERROR: {
    NOT_FOUND: '/404',
    SERVER_ERROR: '/500',
    FORBIDDEN: '/403',
    MAINTENANCE: '/maintenance'
  }
} as const;

/**
 * Generates the full path for a listing details page
 * @param id - Listing identifier
 * @param queryParams - Optional query parameters
 * @throws {Error} If ID is invalid
 * @returns Full listing path with ID and optional query parameters
 */
export function getListingPath(id: string, queryParams?: Record<string, string>): string {
  if (!id || typeof id !== 'string') {
    throw new Error('Invalid listing ID provided');
  }
  
  let path = ROUTES.LISTINGS.DETAILS.replace('[id]', id);
  
  if (queryParams && Object.keys(queryParams).length > 0) {
    const queryString = new URLSearchParams(queryParams).toString();
    path = `${path}?${queryString}`;
  }
  
  return path;
}

/**
 * Generates the full path for a category details page
 * @param id - Category identifier
 * @param includeSubcategories - Whether to include subcategories in the path
 * @throws {Error} If ID is invalid
 * @returns Full category path with ID
 */
export function getCategoryPath(id: string, includeSubcategories = false): string {
  if (!id || typeof id !== 'string') {
    throw new Error('Invalid category ID provided');
  }
  
  const routeTemplate = includeSubcategories 
    ? ROUTES.CATEGORIES.SUBCATEGORIES 
    : ROUTES.CATEGORIES.DETAILS;
    
  return routeTemplate.replace('[id]', id);
}

/**
 * Generates the full path for a message conversation
 * @param id - Conversation identifier
 * @param unread - Whether to mark as unread
 * @throws {Error} If ID is invalid
 * @returns Full message conversation path with ID
 */
export function getMessagePath(id: string, unread = false): string {
  if (!id || typeof id !== 'string') {
    throw new Error('Invalid message ID provided');
  }
  
  const path = ROUTES.MESSAGES.CONVERSATION.replace('[id]', id);
  return unread ? `${path}?unread=true` : path;
}

/**
 * Generates the full path for a payment details page
 * @param id - Payment identifier
 * @param status - Optional payment status
 * @throws {Error} If ID is invalid
 * @returns Full payment path with ID and status
 */
export function getPaymentPath(id: string, status?: string): string {
  if (!id || typeof id !== 'string') {
    throw new Error('Invalid payment ID provided');
  }
  
  const path = ROUTES.PAYMENTS.DETAILS.replace('[id]', id);
  return status ? `${path}?status=${status}` : path;
}