/**
 * Root application component for the Egyptian Map of Pi marketplace.
 * Implements global providers setup with enhanced security, RTL support,
 * and mobile-first design optimizations.
 * @version 1.0.0
 */

import { useEffect } from 'react';
import type { AppProps } from 'next/app';
import { Provider } from 'react-redux';
import { ThemeProvider, useMediaQuery, CssBaseline } from '@mui/material';
import { initI18n } from '../config/i18n.config';
import { getTheme } from '../config/theme.config';
import store from '../store';
import { setTheme, setLanguage, Language } from '../store/ui.slice';

/**
 * Custom hook for theme setup with system preference detection
 * and RTL support for Arabic language
 */
const useThemeSetup = () => {
  // Detect system color scheme preference
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  
  // Get current language direction from store
  const direction = store.getState().ui.language === Language.ARABIC ? 'rtl' : 'ltr';
  
  // Generate theme with Egyptian adaptations
  const theme = getTheme(
    prefersDarkMode ? 'dark' : 'light',
    direction as 'rtl' | 'ltr'
  );

  return { theme, direction, prefersDarkMode };
};

/**
 * Root application component with enhanced security and mobile-first design
 */
function EgyptianMapPiApp({ Component, pageProps }: AppProps) {
  // Initialize theme setup
  const { theme, direction, prefersDarkMode } = useThemeSetup();

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize i18next with Arabic primary support
        await initI18n();

        // Set initial theme based on system preference
        store.dispatch(setTheme(prefersDarkMode ? 'dark' : 'light'));

        // Set initial language to Arabic for Egyptian market
        store.dispatch(setLanguage(Language.ARABIC));

        // Set document level attributes
        document.documentElement.dir = direction;
        document.documentElement.lang = Language.ARABIC;
        document.documentElement.classList.add(prefersDarkMode ? 'dark' : 'light');

        // Set viewport meta for mobile optimization
        const viewport = document.querySelector('meta[name="viewport"]');
        if (viewport) {
          viewport.setAttribute('content', 
            'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'
          );
        }

        // Set theme color meta for mobile browsers
        const themeColor = document.querySelector('meta[name="theme-color"]');
        if (themeColor) {
          themeColor.setAttribute('content', prefersDarkMode ? '#121212' : '#ffffff');
        }

      } catch (error) {
        console.error('App initialization failed:', error);
      }
    };

    initializeApp();
  }, [direction, prefersDarkMode]);

  return (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        {/* Reset CSS baseline with RTL support */}
        <CssBaseline enableColorScheme />
        
        {/* Render page component with enhanced props */}
        <Component 
          {...pageProps}
          dir={direction}
          lang={Language.ARABIC}
        />
      </ThemeProvider>
    </Provider>
  );
}

export default EgyptianMapPiApp;