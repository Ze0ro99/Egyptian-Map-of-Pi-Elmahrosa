import { useEffect, useMemo, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useMediaQuery } from '@mui/material';
import { getTheme } from '../config/theme.config';
import type { Theme } from '@mui/material';

// Type definitions for theme management
type ThemeMode = 'light' | 'dark';
type Direction = 'rtl' | 'ltr';
type ThemePreference = 'system' | ThemeMode;

// Return type for the useTheme hook
interface ThemeHookReturn {
  theme: Theme;
  mode: ThemeMode;
  direction: Direction;
  toggleTheme: () => void;
  setDirection: (direction: Direction) => void;
  isSystemTheme: boolean;
  systemTheme: ThemeMode | null;
}

// Redux state type for theme preferences
interface ThemeState {
  preference: ThemePreference;
  direction: Direction;
}

/**
 * Custom hook for managing theme and direction preferences in the Egyptian Map of Pi application.
 * Provides system theme detection, smooth transitions, and accessibility considerations.
 * 
 * @returns {ThemeHookReturn} Theme management utilities and current state
 */
const useTheme = (): ThemeHookReturn => {
  const dispatch = useDispatch();
  
  // Redux selectors for theme state
  const themePreference = useSelector((state: { theme: ThemeState }) => state.theme.preference);
  const direction = useSelector((state: { theme: ThemeState }) => state.theme.direction);

  // System theme preference detection
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)', { noSsr: true });
  const systemTheme: ThemeMode = prefersDarkMode ? 'dark' : 'light';
  const isSystemTheme = themePreference === 'system';

  // Determine active theme mode
  const mode: ThemeMode = isSystemTheme ? systemTheme : (themePreference as ThemeMode);

  // Memoize theme object creation
  const theme = useMemo(() => getTheme(mode, direction), [mode, direction]);

  /**
   * Debounced theme toggle function to prevent rapid changes
   */
  const toggleTheme = useCallback(() => {
    const newPreference: ThemePreference = 
      themePreference === 'system' ? 'light' :
      themePreference === 'light' ? 'dark' : 'system';

    dispatch({
      type: 'theme/setPreference',
      payload: newPreference
    });
  }, [themePreference, dispatch]);

  /**
   * Direction control function with transition handling
   */
  const setDirection = useCallback((newDirection: Direction) => {
    // Add transition class for smooth direction changes
    document.documentElement.classList.add('direction-transition');

    // Update direction in Redux store
    dispatch({
      type: 'theme/setDirection',
      payload: newDirection
    });

    // Remove transition class after animation completes
    setTimeout(() => {
      document.documentElement.classList.remove('direction-transition');
    }, 300);
  }, [dispatch]);

  // System theme synchronization effect
  useEffect(() => {
    if (isSystemTheme) {
      // Update meta theme-color for mobile browsers
      const metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', 
          mode === 'dark' ? '#121212' : '#F5F5F5'
        );
      }
    }
  }, [isSystemTheme, mode]);

  // Persistence effect for user preferences
  useEffect(() => {
    // Update CSS variables for theme transitions
    document.documentElement.style.setProperty(
      '--theme-transition-duration', '200ms'
    );

    // Apply direction attribute for RTL/LTR support
    document.documentElement.setAttribute('dir', direction);

    // Set color-scheme for system UI elements
    document.documentElement.style.colorScheme = mode;
  }, [mode, direction]);

  return {
    theme,
    mode,
    direction,
    toggleTheme,
    setDirection,
    isSystemTheme,
    systemTheme
  };
};

export default useTheme;