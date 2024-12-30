// @mui/material v5.14+
import { createTheme, ThemeOptions, Theme } from '@mui/material';

/**
 * Theme mode type definition for light/dark mode support
 */
type ThemeMode = 'light' | 'dark';

/**
 * Direction type definition for RTL/LTR support
 */
type Direction = 'rtl' | 'ltr';

/**
 * Egyptian-themed color palette with cultural color significance:
 * - Blue (Primary): Represents the Nile River and trust
 * - Gold (Secondary): Represents Egyptian heritage and prosperity
 */
export const EGYPTIAN_PALETTE = {
  primary: {
    main: '#1B4D89', // Nile Blue
    light: '#4B7BBA',
    dark: '#0D2645',
    contrastText: '#FFFFFF',
  },
  secondary: {
    main: '#D4AF37', // Egyptian Gold
    light: '#E4C96A',
    dark: '#9E8329',
    contrastText: '#000000',
  },
  background: {
    default: '#F5F5F5',
    paper: '#FFFFFF',
  },
  text: {
    primary: '#1A1A1A',
    secondary: '#757575',
  },
} as const;

/**
 * Dark mode palette overrides
 */
const DARK_PALETTE = {
  background: {
    default: '#121212',
    paper: '#1E1E1E',
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#B0B0B0',
  },
} as const;

/**
 * Typography configuration with Arabic support
 * Using Cairo as primary font for optimal Arabic rendering
 */
export const TYPOGRAPHY_CONFIG = {
  fontFamily: 'Cairo, Roboto, Arial, sans-serif',
  fontSize: 16,
  h1: {
    fontSize: '2.5rem',
    fontWeight: 700,
  },
  h2: {
    fontSize: '2rem',
    fontWeight: 600,
  },
  h3: {
    fontSize: '1.75rem',
    fontWeight: 600,
  },
  h4: {
    fontSize: '1.5rem',
    fontWeight: 500,
  },
  h5: {
    fontSize: '1.25rem',
    fontWeight: 500,
  },
  h6: {
    fontSize: '1rem',
    fontWeight: 500,
  },
  body1: {
    fontSize: '1rem',
    lineHeight: 1.5,
  },
  body2: {
    fontSize: '0.875rem',
    lineHeight: 1.43,
  },
} as const;

/**
 * Component style overrides for Egyptian cultural adaptations
 */
const COMPONENT_OVERRIDES = {
  MuiButton: {
    styleOverrides: {
      root: {
        textTransform: 'none', // Preserve Arabic text case
        borderRadius: '8px',
      },
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: '12px',
      },
    },
  },
  MuiTextField: {
    styleOverrides: {
      root: {
        borderRadius: '4px',
      },
    },
  },
} as const;

/**
 * Creates a Material-UI theme with Egyptian cultural adaptations
 * @param mode - Theme mode (light/dark)
 * @param direction - Text direction (rtl/ltr)
 * @returns Configured Material-UI theme object
 */
export const getTheme = (mode: ThemeMode, direction: Direction): Theme => {
  // Merge base palette with mode-specific colors
  const palette = {
    mode,
    ...EGYPTIAN_PALETTE,
    ...(mode === 'dark' && DARK_PALETTE),
  };

  // Create theme configuration
  const themeOptions: ThemeOptions = {
    palette,
    typography: TYPOGRAPHY_CONFIG,
    components: COMPONENT_OVERRIDES,
    direction,
    // Shape configurations
    shape: {
      borderRadius: 4,
    },
    // Spacing configurations
    spacing: 8,
    // Breakpoints for responsive design
    breakpoints: {
      values: {
        xs: 320,
        sm: 375,
        md: 428,
        lg: 768,
        xl: 1024,
      },
    },
    // Z-index configurations
    zIndex: {
      appBar: 1200,
      drawer: 1100,
      modal: 1300,
      snackbar: 1400,
      tooltip: 1500,
    },
  };

  // Create and return the theme
  return createTheme(themeOptions);
};