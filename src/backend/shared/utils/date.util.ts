import dayjs from 'dayjs'; // v1.11.9
import utc from 'dayjs/plugin/utc'; // v1.11.9
import timezone from 'dayjs/plugin/timezone'; // v1.11.9
import localeData from 'dayjs/plugin/localeData'; // v1.11.9
import 'dayjs/locale/ar'; // Arabic locale support
import { error as logError } from './logger.util';

// Configure dayjs plugins
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(localeData);

// Global constants
export const EGYPT_TIMEZONE = 'Africa/Cairo';
export const DATE_FORMAT = 'YYYY-MM-DD';
export const DATETIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';
export const ARABIC_LOCALE = 'ar-EG';
export const ARABIC_DATE_FORMAT = 'DD MMMM YYYY';
export const DATE_CACHE_TTL = 300000; // 5 minutes in milliseconds

// Cache for formatted dates to improve performance
const dateFormatCache = new Map<string, { value: string; timestamp: number }>();

/**
 * Validates and sanitizes date input
 * @param date Date string or Date object to validate
 * @returns boolean indicating if date is valid
 */
const isValidDate = (date: Date | string): boolean => {
  if (!date) return false;
  const parsed = dayjs(date);
  return parsed.isValid() && !isNaN(parsed.valueOf());
};

/**
 * Cleans expired entries from the date format cache
 */
const cleanDateCache = (): void => {
  const now = Date.now();
  for (const [key, entry] of dateFormatCache.entries()) {
    if (now - entry.timestamp > DATE_CACHE_TTL) {
      dateFormatCache.delete(key);
    }
  }
};

/**
 * Formats a date string or Date object to the specified format
 * @param date Date to format
 * @param format Optional format string (defaults to DATE_FORMAT)
 * @returns Formatted date string or null if invalid
 */
export const formatDate = (date: Date | string, format: string = DATE_FORMAT): string | null => {
  try {
    if (!isValidDate(date)) {
      logError('Invalid date provided to formatDate', { date });
      return null;
    }

    // Generate cache key
    const cacheKey = `${date}-${format}`;
    
    // Check cache
    const cached = dateFormatCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < DATE_CACHE_TTL) {
      return cached.value;
    }

    // Format date
    const formatted = dayjs(date).format(format);
    
    // Update cache
    dateFormatCache.set(cacheKey, {
      value: formatted,
      timestamp: Date.now()
    });
    
    // Clean cache periodically
    if (dateFormatCache.size > 1000) {
      cleanDateCache();
    }

    return formatted;
  } catch (err) {
    logError('Error formatting date', { error: err, date, format });
    return null;
  }
};

/**
 * Converts a UTC date to Egyptian local time
 * @param date Date to convert
 * @returns Date object in Egyptian timezone or null if conversion fails
 */
export const toEgyptianTime = (date: Date | string): Date | null => {
  try {
    if (!isValidDate(date)) {
      logError('Invalid date provided to toEgyptianTime', { date });
      return null;
    }

    const egyptianDate = dayjs(date)
      .tz(EGYPT_TIMEZONE)
      .toDate();

    return egyptianDate;
  } catch (err) {
    logError('Error converting to Egyptian time', { error: err, date });
    return null;
  }
};

/**
 * Arabic numeral conversion map
 */
const arabicNumerals: { [key: string]: string } = {
  '0': '٠', '1': '١', '2': '٢', '3': '٣', '4': '٤',
  '5': '٥', '6': '٦', '7': '٧', '8': '٨', '9': '٩'
};

/**
 * Converts western numerals to Arabic numerals
 * @param str String containing numbers to convert
 * @returns String with Arabic numerals
 */
const toArabicNumerals = (str: string): string => {
  return str.replace(/[0-9]/g, match => arabicNumerals[match] || match);
};

/**
 * Formats date in Arabic locale with proper numeral and month names
 * @param date Date to format
 * @param format Optional format string (defaults to ARABIC_DATE_FORMAT)
 * @returns Arabic formatted date string or null if invalid
 */
export const formatArabicDate = (date: Date | string, format: string = ARABIC_DATE_FORMAT): string | null => {
  try {
    if (!isValidDate(date)) {
      logError('Invalid date provided to formatArabicDate', { date });
      return null;
    }

    // Generate cache key
    const cacheKey = `ar-${date}-${format}`;
    
    // Check cache
    const cached = dateFormatCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < DATE_CACHE_TTL) {
      return cached.value;
    }

    // Set locale and format
    dayjs.locale('ar');
    const formatted = toArabicNumerals(
      dayjs(date).format(format)
    );

    // Reset locale to default
    dayjs.locale('en');
    
    // Update cache
    dateFormatCache.set(cacheKey, {
      value: formatted,
      timestamp: Date.now()
    });

    return formatted;
  } catch (err) {
    logError('Error formatting Arabic date', { error: err, date, format });
    return null;
  }
};

/**
 * Validates if a date is within acceptable range
 * @param date Date to validate
 * @returns boolean indicating if date is within range
 */
export const isDateWithinRange = (date: Date | string): boolean => {
  try {
    if (!isValidDate(date)) return false;
    
    const parsed = dayjs(date);
    const minDate = dayjs('2000-01-01');
    const maxDate = dayjs().add(10, 'year');
    
    return parsed.isAfter(minDate) && parsed.isBefore(maxDate);
  } catch (err) {
    logError('Error validating date range', { error: err, date });
    return false;
  }
};

// Clean up cache periodically
setInterval(cleanDateCache, DATE_CACHE_TTL);