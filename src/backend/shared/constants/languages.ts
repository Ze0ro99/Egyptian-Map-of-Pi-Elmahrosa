/**
 * @fileoverview Language constants for Egyptian Map of Pi application
 * Defines core language settings with primary focus on Arabic support
 * @version 1.0.0
 */

/**
 * Supported language codes following ISO 639-1 standard
 * AR: Arabic (Primary language for Egyptian market)
 * EN: English (Secondary language for international users)
 */
export enum SUPPORTED_LANGUAGES {
    AR = 'ar',
    EN = 'en'
}

/**
 * Default application language set to Arabic for Egyptian market focus
 * This constant is used as the fallback language when user preference is not set
 */
export const DEFAULT_LANGUAGE: SUPPORTED_LANGUAGES = SUPPORTED_LANGUAGES.AR;

/**
 * Immutable mapping of languages to their text directions
 * Used for implementing RTL/LTR layout management across the application
 * Arabic: Right-to-Left (RTL)
 * English: Left-to-Right (LTR)
 */
export const LANGUAGE_DIRECTIONS: Readonly<Record<SUPPORTED_LANGUAGES, 'rtl' | 'ltr'>> = {
    [SUPPORTED_LANGUAGES.AR]: 'rtl',
    [SUPPORTED_LANGUAGES.EN]: 'ltr'
} as const;

/**
 * Native language names for UI display
 * Maps language codes to their native script representation
 * Arabic is displayed in Arabic script: العربية
 * English is displayed in Latin script: English
 */
export const LANGUAGE_NAMES: Readonly<Record<SUPPORTED_LANGUAGES, string>> = {
    [SUPPORTED_LANGUAGES.AR]: 'العربية',
    [SUPPORTED_LANGUAGES.EN]: 'English'
} as const;

/**
 * Type guard to check if a string is a supported language code
 * @param code - The language code to check
 * @returns boolean indicating if the code is a supported language
 */
export const isSupportedLanguage = (code: string): code is SUPPORTED_LANGUAGES => {
    return Object.values(SUPPORTED_LANGUAGES).includes(code as SUPPORTED_LANGUAGES);
};

/**
 * Gets the text direction for a given language code
 * @param language - The language code to get direction for
 * @returns The text direction ('rtl' | 'ltr') for the language
 */
export const getLanguageDirection = (language: SUPPORTED_LANGUAGES): 'rtl' | 'ltr' => {
    return LANGUAGE_DIRECTIONS[language];
};

/**
 * Gets the native name for a given language code
 * @param language - The language code to get native name for
 * @returns The native name string for the language
 */
export const getLanguageName = (language: SUPPORTED_LANGUAGES): string => {
    return LANGUAGE_NAMES[language];
};