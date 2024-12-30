/**
 * @fileoverview Utility functions for message handling in the Egyptian Map of Pi marketplace
 * with specialized support for Arabic content, Egyptian timezone handling, and cultural considerations.
 */

import { MessageType, MessageStatus } from '../interfaces/message.interface';
import { formatDate } from '../../../shared/utils/date.util';
import sanitizeHtml from 'sanitize-html'; // v2.11.0
import moment from 'moment-timezone'; // v0.5.43

// Constants for message validation
const MAX_ARABIC_LENGTH = 2000;
const MAX_LATIN_LENGTH = 1000;
const PREVIEW_ARABIC_LENGTH = 100;
const PREVIEW_LATIN_LENGTH = 50;
const EGYPTIAN_TIMEZONE = 'Africa/Cairo';

// Arabic text direction markers
const RLM = '\u200F'; // Right-to-Left Mark
const LRM = '\u200E'; // Left-to-Right Mark

// Regular expressions for validation
const ARABIC_PATTERN = /[\u0600-\u06FF\u0750-\u077F]/;
const EGYPTIAN_PHONE_PATTERN = /^(\+20|0)?1[0125][0-9]{8}$/;
const RTL_MARKER_PATTERN = /[\u200E\u200F]/g;

/**
 * HTML sanitization options with Arabic text support
 */
const sanitizeOptions = {
  allowedTags: ['b', 'i', 'em', 'strong', 'a', 'br'],
  allowedAttributes: {
    'a': ['href']
  },
  textFilter: (text: string) => {
    // Preserve RTL/LTR markers
    return text.replace(RTL_MARKER_PATTERN, '');
  }
};

/**
 * Validates and sanitizes message content with support for Arabic text
 * and Egyptian cultural considerations
 * 
 * @param content - Message content to validate
 * @param type - Type of message
 * @returns Sanitized message content or throws error if invalid
 */
export const validateMessageContent = (content: string, type: MessageType): string => {
  if (!content || content.trim().length === 0) {
    throw new Error('Message content cannot be empty');
  }

  // Determine if content contains Arabic text
  const hasArabic = ARABIC_PATTERN.test(content);
  const maxLength = hasArabic ? MAX_ARABIC_LENGTH : MAX_LATIN_LENGTH;

  if (content.length > maxLength) {
    throw new Error(`Message exceeds maximum length of ${maxLength} characters`);
  }

  // Handle different message types
  switch (type) {
    case MessageType.TEXT:
      // Sanitize HTML content while preserving Arabic text
      content = sanitizeHtml(content, sanitizeOptions);
      
      // Add RTL marker for Arabic content
      if (hasArabic) {
        content = `${RLM}${content}`;
      }
      break;

    case MessageType.IMAGE:
      // Validate image caption if present
      if (content.length > 200) {
        throw new Error('Image caption cannot exceed 200 characters');
      }
      break;

    case MessageType.SYSTEM:
      // System messages don't need sanitization but should be validated
      if (!content.startsWith('SYSTEM:')) {
        throw new Error('Invalid system message format');
      }
      break;

    case MessageType.VOICE:
      // Validate voice message duration from metadata
      if (!content.match(/^VOICE:\d+$/)) {
        throw new Error('Invalid voice message format');
      }
      break;

    default:
      throw new Error('Unsupported message type');
  }

  // Filter sensitive content (e.g., phone numbers)
  content = content.replace(EGYPTIAN_PHONE_PATTERN, '[PHONE NUMBER REMOVED]');

  return content;
};

/**
 * Creates a preview version of message content with proper RTL support
 * 
 * @param content - Original message content
 * @param type - Type of message
 * @returns Formatted preview text
 */
export const formatMessagePreview = (content: string, type: MessageType): string => {
  if (!content) return '';

  const hasArabic = ARABIC_PATTERN.test(content);
  const maxPreviewLength = hasArabic ? PREVIEW_ARABIC_LENGTH : PREVIEW_LATIN_LENGTH;
  let preview = content;

  // Add type-specific prefix
  switch (type) {
    case MessageType.IMAGE:
      preview = `🖼️ ${hasArabic ? 'صورة' : 'Image'}`;
      break;
    case MessageType.VOICE:
      preview = `🎤 ${hasArabic ? 'رسالة صوتية' : 'Voice message'}`;
      break;
    case MessageType.SYSTEM:
      preview = content.replace('SYSTEM:', '📢 ');
      break;
    default:
      // Truncate text content if needed
      if (preview.length > maxPreviewLength) {
        preview = `${preview.substring(0, maxPreviewLength)}...`;
      }
  }

  // Add appropriate text direction marker
  return hasArabic ? `${RLM}${preview}` : `${LRM}${preview}`;
};

/**
 * Formats message timestamp in Egyptian timezone with Arabic number support
 * 
 * @param date - Message date
 * @returns Formatted timestamp string
 */
export const getMessageTimestamp = (date: Date): string => {
  const egyptianTime = moment(date).tz(EGYPTIAN_TIMEZONE);
  const now = moment().tz(EGYPTIAN_TIMEZONE);
  
  // Format based on time difference
  if (egyptianTime.isSame(now, 'day')) {
    return egyptianTime.format('HH:mm'); // Today: show time only
  } else if (egyptianTime.isSame(now.subtract(1, 'day'), 'day')) {
    return 'أمس'; // Yesterday: show "Yesterday" in Arabic
  } else if (egyptianTime.isSame(now, 'year')) {
    return egyptianTime.format('D MMM'); // Same year: show date without year
  }
  
  return formatDate(date) || egyptianTime.format('YYYY-MM-DD');
};

/**
 * Validates if a given message type is supported
 * 
 * @param type - Message type to validate
 * @returns Boolean indicating if type is valid
 */
export const isValidMessageType = (type: string): boolean => {
  try {
    return Object.values(MessageType).includes(type as MessageType);
  } catch {
    return false;
  }
};