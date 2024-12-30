// @version 1.0.0
// Formatting utilities for Egyptian Map of Pi with Arabic/English localization support
// Dependencies:
// - intl: ^1.2.5

import { Language } from '../types';

// Cache formatters for performance
const formatters: {
  [key: string]: Intl.NumberFormat;
} = {};

/**
 * Gets or creates a cached number formatter instance
 * @param locale Language code (ar/en)
 * @param options Intl.NumberFormatOptions
 * @returns Cached Intl.NumberFormat instance
 */
const getFormatter = (locale: Language, options: Intl.NumberFormatOptions): Intl.NumberFormat => {
  const key = `${locale}-${JSON.stringify(options)}`;
  if (!formatters[key]) {
    formatters[key] = new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US', options);
  }
  return formatters[key];
};

/**
 * Formats a number as a Pi cryptocurrency price with proper localization
 * @param amount Number to format
 * @param locale Language code (ar/en)
 * @returns Formatted Pi price string with RTL/LTR support
 */
export const formatPiPrice = (amount: number, locale: Language): string => {
  if (amount < 0 || !Number.isFinite(amount)) {
    throw new Error('Invalid amount for Pi price formatting');
  }

  const options: Intl.NumberFormatOptions = {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: true,
    numberingSystem: locale === 'ar' ? 'arab' : 'latn'
  };

  const formatter = getFormatter(locale, options);
  const formattedNumber = formatter.format(amount);
  
  // Add RTL/LTR markers and position Pi symbol according to locale
  return locale === 'ar' 
    ? `\u200F${formattedNumber} π\u200F` 
    : `\u200E${formattedNumber} π\u200E`;
};

/**
 * Formats a number as an Egyptian Pound price
 * @param amount Number to format
 * @param locale Language code (ar/en)
 * @returns Formatted EGP price string
 */
export const formatEgpPrice = (amount: number, locale: Language): string => {
  if (amount < 0 || !Number.isFinite(amount)) {
    throw new Error('Invalid amount for EGP price formatting');
  }

  const options: Intl.NumberFormatOptions = {
    style: 'currency',
    currency: 'EGP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    numberingSystem: locale === 'ar' ? 'arab' : 'latn',
    currencyDisplay: 'symbol'
  };

  const formatter = getFormatter(locale, options);
  const formattedPrice = formatter.format(amount);
  
  // Add RTL/LTR markers based on locale
  return locale === 'ar' ? `\u200F${formattedPrice}\u200F` : `\u200E${formattedPrice}\u200E`;
};

/**
 * Formats a number with locale-specific formatting
 * @param value Number to format
 * @param locale Language code (ar/en)
 * @param options Optional formatting options
 * @returns Formatted number string
 */
export const formatNumber = (
  value: number,
  locale: Language,
  options: Intl.NumberFormatOptions = {}
): string => {
  if (!Number.isFinite(value)) {
    throw new Error('Invalid number for formatting');
  }

  const defaultOptions: Intl.NumberFormatOptions = {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    useGrouping: true,
    numberingSystem: locale === 'ar' ? 'arab' : 'latn'
  };

  const formatter = getFormatter(locale, { ...defaultOptions, ...options });
  const formattedNumber = formatter.format(value);
  
  // Add RTL/LTR markers based on locale
  return locale === 'ar' ? `\u200F${formattedNumber}\u200F` : `\u200E${formattedNumber}\u200E`;
};

/**
 * Formats an Egyptian phone number with proper formatting
 * @param phoneNumber Phone number string to format
 * @returns Formatted Egyptian phone number
 */
export const formatPhoneNumber = (phoneNumber: string): string => {
  // Remove all non-numeric characters
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Validate Egyptian phone number format
  const egyptianPhoneRegex = /^(?:(?:\+?20)|0)?1[0125]\d{8}$/;
  if (!egyptianPhoneRegex.test(cleaned)) {
    throw new Error('Invalid Egyptian phone number format');
  }

  // Ensure number starts with country code
  let normalized = cleaned;
  if (normalized.startsWith('0')) {
    normalized = `20${normalized.slice(1)}`;
  } else if (!normalized.startsWith('20')) {
    normalized = `20${normalized}`;
  }

  // Format as +20-XX-XXXX-XXXX
  return `+${normalized.slice(0, 2)}-${normalized.slice(2, 4)}-${normalized.slice(4, 8)}-${normalized.slice(8)}`;
};

/**
 * Truncates text with proper RTL/LTR support
 * @param text Text to truncate
 * @param maxLength Maximum length before truncation
 * @param locale Language code (ar/en)
 * @returns Truncated text with proper directional markers
 */
export const truncateText = (text: string, maxLength: number, locale: Language): string => {
  if (!text || maxLength <= 0) {
    return '';
  }

  if (text.length <= maxLength) {
    return locale === 'ar' ? `\u200F${text}\u200F` : `\u200E${text}\u200E`;
  }

  // Find the last word boundary before maxLength
  const truncated = text.slice(0, maxLength).replace(/\s+\S*$/, '');
  
  // Add ellipsis with proper directional markers
  return locale === 'ar'
    ? `\u200F${truncated}...\u200F`
    : `\u200E${truncated}...\u200E`;
};