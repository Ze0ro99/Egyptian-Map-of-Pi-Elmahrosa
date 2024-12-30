/**
 * @fileoverview Language middleware for Egyptian Map of Pi application
 * Implements language detection and RTL support with Arabic as primary language
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express'; // v4.18.2
import {
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  LANGUAGE_DIRECTIONS
} from '../constants/languages';
import { createErrorResponse } from '../utils/response.util';
import { logger } from '../utils/logger.util';

/**
 * Extended Express Request interface with language properties
 */
interface LanguageRequest extends Request {
  language: SUPPORTED_LANGUAGES;
  direction: 'rtl' | 'ltr';
  isRTL: boolean;
  languageSource: string;
}

// Cookie configuration for language preference
const LANGUAGE_COOKIE_CONFIG = {
  name: 'preferred_language',
  maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const
};

/**
 * Validates if a language code is supported by the application
 * @param lang - Language code to validate
 * @returns boolean indicating if language is supported
 */
const validateLanguage = (lang: string): boolean => {
  const normalizedLang = lang.toLowerCase();
  const isValid = Object.values(SUPPORTED_LANGUAGES).includes(normalizedLang as SUPPORTED_LANGUAGES);
  
  logger.debug('Language validation', {
    language: normalizedLang,
    isValid,
    supportedLanguages: Object.values(SUPPORTED_LANGUAGES)
  });

  return isValid;
};

/**
 * Express middleware that implements language detection and setting
 * Prioritizes query parameters, then cookies, then Accept-Language header
 * Defaults to Arabic (ar) as primary language for Egyptian market
 */
const languageMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const languageReq = req as LanguageRequest;
  let detectedLanguage: SUPPORTED_LANGUAGES;
  let languageSource: string;

  try {
    // 1. Check query parameter
    if (req.query.lang && typeof req.query.lang === 'string') {
      const queryLang = req.query.lang.toLowerCase();
      if (validateLanguage(queryLang)) {
        detectedLanguage = queryLang as SUPPORTED_LANGUAGES;
        languageSource = 'query';
        logger.debug('Language detected from query parameter', { language: detectedLanguage });
      }
    }

    // 2. Check cookie if query parameter not valid
    if (!detectedLanguage && req.cookies[LANGUAGE_COOKIE_CONFIG.name]) {
      const cookieLang = req.cookies[LANGUAGE_COOKIE_CONFIG.name];
      if (validateLanguage(cookieLang)) {
        detectedLanguage = cookieLang as SUPPORTED_LANGUAGES;
        languageSource = 'cookie';
        logger.debug('Language detected from cookie', { language: detectedLanguage });
      }
    }

    // 3. Check Accept-Language header if cookie not valid
    if (!detectedLanguage && req.headers['accept-language']) {
      const acceptLanguage = req.headers['accept-language']
        .split(',')[0]
        .trim()
        .substring(0, 2)
        .toLowerCase();
      
      if (validateLanguage(acceptLanguage)) {
        detectedLanguage = acceptLanguage as SUPPORTED_LANGUAGES;
        languageSource = 'header';
        logger.debug('Language detected from Accept-Language header', { language: detectedLanguage });
      }
    }

    // 4. Default to Arabic if no valid language detected
    if (!detectedLanguage) {
      detectedLanguage = DEFAULT_LANGUAGE;
      languageSource = 'default';
      logger.debug('Using default language (Arabic)', { language: detectedLanguage });
    }

    // Set language properties on request object
    languageReq.language = detectedLanguage;
    languageReq.direction = LANGUAGE_DIRECTIONS[detectedLanguage];
    languageReq.isRTL = languageReq.direction === 'rtl';
    languageReq.languageSource = languageSource;

    // Set or update language cookie
    res.cookie(
      LANGUAGE_COOKIE_CONFIG.name,
      detectedLanguage,
      LANGUAGE_COOKIE_CONFIG
    );

    // Log language detection result
    logger.info('Language detection completed', {
      language: detectedLanguage,
      direction: languageReq.direction,
      source: languageSource,
      requestPath: req.path
    });

    next();
  } catch (error) {
    logger.error('Language middleware error', {
      error,
      path: req.path,
      headers: req.headers
    });

    // Handle errors gracefully and continue with default language
    languageReq.language = DEFAULT_LANGUAGE;
    languageReq.direction = LANGUAGE_DIRECTIONS[DEFAULT_LANGUAGE];
    languageReq.isRTL = languageReq.direction === 'rtl';
    languageReq.languageSource = 'error-fallback';

    next();
  }
};

export default languageMiddleware;
```

This implementation follows all the specified requirements and best practices:

1. Implements language detection with priority order: query parameter → cookie → Accept-Language header → default (Arabic)
2. Supports Arabic (primary) and English (secondary) languages with RTL capabilities
3. Includes comprehensive logging for debugging and monitoring
4. Implements secure cookie handling for language preference persistence
5. Provides type safety with TypeScript interfaces and enums
6. Includes detailed error handling with graceful fallback to Arabic
7. Follows Express middleware patterns and best practices
8. Implements proper validation of language codes
9. Adds language direction (RTL/LTR) support
10. Includes detailed documentation and comments
11. Exports the middleware as default for easy importing
12. Uses constants from the language configuration file
13. Implements proper security measures for cookies
14. Provides detailed logging through the logger utility
15. Handles edge cases and invalid inputs gracefully

The middleware can be used in the Express application by importing and adding it to the middleware chain:

```typescript
import languageMiddleware from '@shared/middleware/language.middleware';

app.use(languageMiddleware);