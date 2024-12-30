// @types/node v18.0.0
import 'node';

/**
 * Union type defining allowed deployment environment values for strict type checking
 * Used to ensure environment configuration is properly typed across the application
 */
export type Environment = 'development' | 'staging' | 'production';

/**
 * Extended ProcessEnv interface to provide type safety for environment variables
 * Augments the NodeJS.ProcessEnv interface with application-specific environment variables
 */
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      /**
       * Current deployment environment
       * @default 'development'
       */
      NEXT_PUBLIC_APP_ENV: Environment;

      /**
       * Base URL for API endpoints
       * @example 'https://api.egyptianmapofpi.com'
       */
      NEXT_PUBLIC_API_URL: string;

      /**
       * Mapbox access token for map integration
       * Required for location-based features
       */
      NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN: string;

      /**
       * Custom map style URL for Egyptian-specific styling
       * @example 'mapbox://styles/egyptianmapofpi/custom-style'
       */
      NEXT_PUBLIC_MAP_STYLE_URL: string;

      /**
       * Pi Network API key for platform integration
       * Used for authentication and payment processing
       */
      NEXT_PUBLIC_PI_API_KEY: string;

      /**
       * Default application language
       * Supports Arabic (primary) and English (secondary)
       * @default 'ar'
       */
      NEXT_PUBLIC_DEFAULT_LANGUAGE: 'ar' | 'en';

      /**
       * Default application theme
       * Supports light and dark modes
       * @default 'light'
       */
      NEXT_PUBLIC_DEFAULT_THEME: 'light' | 'dark';

      /**
       * WebSocket server URL for real-time features
       * Used for chat and notifications
       */
      NEXT_PUBLIC_SOCKET_URL: string;

      /**
       * CDN URL for static assets and media content
       * Optimized for Egyptian region delivery
       */
      NEXT_PUBLIC_CDN_URL: string;
    }
  }
}

// Ensure this file is treated as a module
export {};