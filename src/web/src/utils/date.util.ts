/**
 * @fileoverview Date formatting utilities with Arabic/English localization support
 * Provides culturally-aware date formatting for Egyptian Map of Pi
 * @version 1.0.0
 * Dependencies:
 * - date-fns: ^2.30.0
 * - date-fns/locale: ^2.30.0
 */

import { format, formatDistance, isValid, parseISO } from 'date-fns';
import { arEG, enUS } from 'date-fns/locale';
import { Language } from '../types';

// Constants for date formatting
const LOCALE_MAP = {
  ar: arEG, // Arabic (Egypt) locale
  en: enUS  // English (US) locale
};

const DATE_FORMATS = {
  full: {
    ar: 'dd MMMM yyyy',
    en: 'MMMM dd, yyyy'
  },
  short: {
    ar: 'dd/MM/yyyy',
    en: 'MM/dd/yyyy'
  },
  time: {
    ar: 'HH:mm',
    en: 'h:mm a'
  },
  fullWithTime: {
    ar: 'dd MMMM yyyy HH:mm',
    en: 'MMMM dd, yyyy h:mm a'
  }
};

/**
 * Validates and normalizes date input
 * @param date Date input in various formats
 * @returns Date object or null if invalid
 */
const normalizeDate = (date: Date | string | number): Date | null => {
  if (typeof date === 'string') {
    const parsedDate = parseISO(date);
    return isValid(parsedDate) ? parsedDate : null;
  }
  if (date instanceof Date || typeof date === 'number') {
    return isValid(date) ? new Date(date) : null;
  }
  return null;
};

/**
 * Formats a date according to the specified format and locale
 * @param date Date to format
 * @param formatString Custom format string or predefined format key
 * @param locale Language code (ar/en)
 * @returns Formatted date string
 */
export const formatDate = (
  date: Date | string | number,
  formatString: string,
  locale: Language
): string => {
  const normalizedDate = normalizeDate(date);
  if (!normalizedDate) {
    return 'Invalid Date';
  }

  try {
    return format(normalizedDate, formatString, {
      locale: LOCALE_MAP[locale],
      // Add additional options for Arabic number formatting
      useAdditionalWeekYearTokens: true,
      useAdditionalDayOfYearTokens: true
    });
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'Format Error';
  }
};

/**
 * Formats a date as relative time with Egyptian cultural context
 * @param date Date to format
 * @param locale Language code (ar/en)
 * @returns Relative time string
 */
export const formatRelativeTime = (
  date: Date | string | number,
  locale: Language
): string => {
  const normalizedDate = normalizeDate(date);
  if (!normalizedDate) {
    return 'Invalid Date';
  }

  try {
    const relativeTime = formatDistance(normalizedDate, new Date(), {
      locale: LOCALE_MAP[locale],
      addSuffix: true,
      // Consider Egyptian weekend (Friday-Saturday)
      weekStartsOn: 0 // Week starts on Sunday in Egypt
    });

    // Apply cultural adaptations for Arabic
    if (locale === 'ar') {
      return relativeTime
        .replace('about', 'حوالي')
        .replace('less than', 'أقل من')
        .replace('over', 'أكثر من');
    }

    return relativeTime;
  } catch (error) {
    console.error('Relative time formatting error:', error);
    return 'Time Error';
  }
};

/**
 * Smart message timestamp formatting with contextual display
 * @param date Message date
 * @param locale Language code (ar/en)
 * @returns Formatted message time string
 */
export const formatMessageTime = (
  date: Date | string | number,
  locale: Language
): string => {
  const normalizedDate = normalizeDate(date);
  if (!normalizedDate) {
    return 'Invalid Date';
  }

  const now = new Date();
  const messageDate = new Date(normalizedDate);
  const diffInHours = (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60);

  try {
    // Within last hour - show relative time
    if (diffInHours < 1) {
      return formatRelativeTime(messageDate, locale);
    }

    // Same day - show time only
    if (messageDate.toDateString() === now.toDateString()) {
      return formatDate(messageDate, DATE_FORMATS.time[locale], locale);
    }

    // Within week - show day and time
    if (diffInHours < 168) { // 7 days
      return formatDate(messageDate, DATE_FORMATS.fullWithTime[locale], locale);
    }

    // Older messages - show full date
    return formatDate(messageDate, DATE_FORMATS.full[locale], locale);
  } catch (error) {
    console.error('Message time formatting error:', error);
    return 'Time Error';
  }
};

/**
 * Marketplace listing date formatter with Egyptian business context
 * @param date Listing date
 * @param locale Language code (ar/en)
 * @returns Business-appropriate formatted date string
 */
export const formatListingDate = (
  date: Date | string | number,
  locale: Language
): string => {
  const normalizedDate = normalizeDate(date);
  if (!normalizedDate) {
    return 'Invalid Date';
  }

  const now = new Date();
  const listingDate = new Date(normalizedDate);
  const diffInHours = (now.getTime() - listingDate.getTime()) / (1000 * 60 * 60);

  try {
    // Recent listings (within 24 hours)
    if (diffInHours < 24) {
      return formatRelativeTime(listingDate, locale);
    }

    // Listings within the current week
    if (diffInHours < 168) { // 7 days
      const dayFormat = locale === 'ar' ? 'EEEE' : 'EEE';
      return formatDate(listingDate, `${dayFormat} ${DATE_FORMATS.time[locale]}`, locale);
    }

    // Older listings
    return formatDate(listingDate, DATE_FORMATS.short[locale], locale);
  } catch (error) {
    console.error('Listing date formatting error:', error);
    return 'Date Error';
  }
};