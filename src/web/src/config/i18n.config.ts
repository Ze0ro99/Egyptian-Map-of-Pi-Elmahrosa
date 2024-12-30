// i18next v22.0.0 - Core internationalization framework
import i18next from 'i18next';
// i18next-http-backend v2.0.0 - Dynamic translation loading
import HttpBackend from 'i18next-http-backend';
// i18next-browser-languagedetector v7.0.0 - Language detection
import LanguageDetector from 'i18next-browser-languagedetector';

/**
 * Core i18n configuration object for Egyptian Map of Pi
 * Prioritizes Arabic language and RTL support while maintaining English fallback
 */
export const i18nConfig = {
  // Primary language configuration
  defaultLanguage: 'ar-EG',
  supportedLanguages: ['ar-EG', 'ar', 'en'],
  fallbackLanguage: 'en',

  // Namespace configuration for modular translations
  namespaces: ['common', 'marketplace', 'profile', 'transactions'],
  defaultNamespace: 'common',

  // Development configuration
  debug: process.env.NODE_ENV === 'development',

  // RTL support configuration
  rtlLanguages: ['ar-EG', 'ar'],

  // Translation loading configuration
  loadPath: '/locales/{{lng}}/{{ns}}.json',

  // Interpolation and formatting configuration
  interpolation: {
    escapeValue: false,
    format: (value: any, format: string, lng: string) => {
      if (format === 'number') {
        return new Intl.NumberFormat(lng, {
          maximumFractionDigits: 2,
        }).format(value);
      }
      if (format === 'date') {
        return new Intl.DateTimeFormat(lng, {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }).format(value);
      }
      if (format === 'currency') {
        return new Intl.NumberFormat(lng, {
          style: 'currency',
          currency: 'EGP',
        }).format(value);
      }
      return value;
    },
  },

  // Language detection configuration
  detection: {
    order: ['localStorage', 'navigator', 'querystring', 'htmlTag'],
    lookupLocalStorage: 'egyptianMapPi_language',
    caches: ['localStorage'],
    cookieMinutes: 60 * 24 * 365, // 1 year
    checkWhitelist: true,
  },

  // Backend configuration for loading translations
  backend: {
    loadPath: '/locales/{{lng}}/{{ns}}.json',
    requestOptions: {
      cache: 'default',
      credentials: 'same-origin',
      mode: 'cors',
    },
    queryStringParams: { v: process.env.BUILD_ID || '1.0.0' },
    reloadInterval: process.env.NODE_ENV === 'development' ? 300000 : false, // 5 minutes in development
    allowMultiLoading: false,
    retries: 3,
    retry: (count: number, err: any) => {
      return count < 3 && !err.status;
    },
  },
};

/**
 * Initializes i18next with comprehensive configuration for Arabic-first localization
 * Handles language detection, RTL support, and translation loading
 */
export const initI18n = async (): Promise<void> => {
  try {
    await i18next
      .use(HttpBackend)
      .use(LanguageDetector)
      .init({
        ...i18nConfig,
        fallbackLng: {
          'ar-EG': ['ar', 'en'],
          ar: ['en'],
          default: ['en'],
        },
        load: 'currentOnly',
        preload: ['ar-EG', 'en'],
        
        // Enhanced error handling and missing translation reporting
        saveMissing: process.env.NODE_ENV === 'development',
        missingKeyHandler: (lng: string, ns: string, key: string) => {
          if (process.env.NODE_ENV === 'development') {
            console.warn(`Missing translation - Language: ${lng}, Namespace: ${ns}, Key: ${key}`);
          }
        },
        
        // RTL/LTR handling
        react: {
          useSuspense: false,
          bindI18n: 'languageChanged loaded',
          bindStore: 'added removed',
          nsMode: 'default',
        },
      });

    // Set up language change handlers
    i18next.on('languageChanged', (lng: string) => {
      document.documentElement.lang = lng;
      document.documentElement.dir = i18nConfig.rtlLanguages.includes(lng) ? 'rtl' : 'ltr';
      
      // Update HTML attributes for RTL/LTR support
      const htmlElement = document.querySelector('html');
      if (htmlElement) {
        htmlElement.setAttribute('lang', lng);
        htmlElement.setAttribute('dir', i18nConfig.rtlLanguages.includes(lng) ? 'rtl' : 'ltr');
      }
    });

    // Initialize with default language
    if (!i18next.language) {
      await i18next.changeLanguage(i18nConfig.defaultLanguage);
    }

  } catch (error) {
    console.error('Failed to initialize i18next:', error);
    throw new Error('i18n initialization failed');
  }
};