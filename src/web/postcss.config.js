/**
 * PostCSS Configuration for Egyptian Map of Pi
 * Version: 1.0.0
 * 
 * This configuration handles:
 * - RTL support for Arabic language (primary)
 * - Material Design adaptations for Egyptian market
 * - Browser compatibility (Pi Browser, Chrome Mobile 80+, Safari iOS 12+)
 * - Modern CSS features and optimizations
 * - WCAG 2.1 Level AA compliance
 */

// @ts-check

/** @type {import('postcss').Config} */
module.exports = {
  plugins: [
    // Convert modern CSS features - v9.3.0
    ["postcss-preset-env", {
      stage: 3,
      features: {
        'custom-properties': true,
        'nesting-rules': true,
        'color-function': true,
        'custom-media-queries': true,
        'gap-properties': true,
        'logical-properties-and-values': true,
      },
      browsers: [
        "last 2 Pi Browser versions",
        "Chrome >= 80",
        "iOS >= 12",
        "Firefox >= 95",
        "Opera >= 60"
      ],
      preserve: true,
      autoprefixer: false // Handled separately for more control
    }],

    // Add vendor prefixes automatically - v10.4.16
    ["autoprefixer", {
      grid: "autoplace",
      flexbox: "no-2009",
      supports: true,
      browsers: [
        "last 2 Pi Browser versions",
        "Chrome >= 80",
        "iOS >= 12",
        "Firefox >= 95",
        "Opera >= 60"
      ]
    }],

    // RTL CSS support - v2.0.0
    ["postcss-rtl", {
      // RTL options optimized for Arabic
      source: 'rtl',
      prefixType: 'attribute',
      prefix: '[dir="rtl"]',
      ignore: [
        'direction',
        'font-family',
        /^border-(top|bottom)/, // Preserve vertical borders
        /^padding-(top|bottom)/, // Preserve vertical padding
        /^margin-(top|bottom)/ // Preserve vertical margins
      ]
    }],

    // CSS optimization and minification - v6.0.1
    ["cssnano", {
      preset: ['default', {
        // Customize optimization levels based on environment
        ...(process.env.NODE_ENV === 'production' ? {
          cssDeclarationSorter: true,
          discardComments: {
            removeAll: true
          },
          minifyFontValues: true,
          minifyGradients: true,
          normalizeWhitespace: true,
          reduceIdents: true,
          reduceInitial: true,
          zindex: false // Preserve z-index values
        } : {
          cssDeclarationSorter: false,
          discardComments: false,
          normalizeWhitespace: false
        }),
        // Common optimizations for all environments
        autoprefixer: false, // Already handled
        discardDuplicates: true,
        discardOverridden: true,
        mergeLonghand: true,
        mergeRules: true,
        normalizeCharset: true,
        normalizeDisplayValues: true,
        normalizePositions: true,
        normalizeRepeatStyle: true,
        normalizeString: true,
        normalizeTimingFunctions: true,
        normalizeUnicode: true,
        normalizeUrl: true,
        orderedValues: true,
        uniqueSelectors: true
      }]
    }]
  ],
  
  // Source map configuration
  sourceMap: process.env.NODE_ENV !== 'production',
  
  // Parser options
  parser: 'postcss-scss',
  
  // Custom syntax for special cases
  syntax: 'postcss-scss'
};