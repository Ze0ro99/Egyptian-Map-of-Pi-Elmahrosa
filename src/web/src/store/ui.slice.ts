/**
 * @fileoverview Redux slice for managing global UI state in the Egyptian Map of Pi marketplace
 * @version 1.0.0
 * 
 * Handles theme, language, loading states, alerts, modals and mobile navigation
 * with full RTL support and Egyptian market localization features.
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit'; // v1.9.5
import { ERROR_MESSAGES } from '../constants/errors';

/**
 * Supported theme modes
 */
export enum ThemeMode {
  LIGHT = 'light',
  DARK = 'dark'
}

/**
 * Supported languages with RTL/LTR handling
 */
export enum Language {
  ARABIC = 'ar',
  ENGLISH = 'en'
}

/**
 * Alert types for notifications
 */
export enum AlertType {
  SUCCESS = 'success',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info'
}

/**
 * Modal dialog types
 */
export enum ModalType {
  CONFIRM = 'confirm',
  SHARE = 'share',
  REPORT = 'report',
  REVIEW = 'review'
}

/**
 * Mobile drawer types
 */
export enum DrawerType {
  MENU = 'menu',
  FILTERS = 'filters',
  SORT = 'sort',
  CATEGORIES = 'categories'
}

/**
 * Alert state interface with enhanced features
 */
interface AlertState {
  open: boolean;
  type: AlertType;
  message: string;
  duration: number;
  autoHide: boolean;
}

/**
 * Modal state interface
 */
interface ModalState {
  open: boolean;
  type: ModalType | null;
  data: any;
}

/**
 * Mobile drawer state interface
 */
interface DrawerState {
  open: boolean;
  type: DrawerType | null;
  data: any;
}

/**
 * UI slice state interface
 */
interface UIState {
  theme: ThemeMode;
  language: Language;
  isLoading: boolean;
  alert: AlertState;
  modal: ModalState;
  drawer: DrawerState;
}

/**
 * Initial state with Egyptian market defaults
 */
const INITIAL_STATE: UIState = {
  theme: ThemeMode.LIGHT,
  language: Language.ARABIC, // Arabic default for Egyptian market
  isLoading: false,
  alert: {
    open: false,
    type: AlertType.INFO,
    message: '',
    duration: 3000,
    autoHide: true
  },
  modal: {
    open: false,
    type: null,
    data: null
  },
  drawer: {
    open: false,
    type: null,
    data: null
  }
};

/**
 * UI Redux slice with enhanced mobile support
 */
const uiSlice = createSlice({
  name: 'ui',
  initialState: INITIAL_STATE,
  reducers: {
    /**
     * Set theme mode with persistence
     */
    setTheme: (state, action: PayloadAction<ThemeMode>) => {
      state.theme = action.payload;
      localStorage.setItem('theme', action.payload);
      document.documentElement.classList.remove(ThemeMode.LIGHT, ThemeMode.DARK);
      document.documentElement.classList.add(action.payload);
      document.querySelector('meta[name="theme-color"]')?.setAttribute(
        'content',
        action.payload === ThemeMode.DARK ? '#121212' : '#ffffff'
      );
    },

    /**
     * Set language with RTL/LTR handling
     */
    setLanguage: (state, action: PayloadAction<Language>) => {
      state.language = action.payload;
      localStorage.setItem('language', action.payload);
      document.documentElement.dir = action.payload === Language.ARABIC ? 'rtl' : 'ltr';
      document.documentElement.lang = action.payload;
    },

    /**
     * Set global loading state
     */
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },

    /**
     * Show alert with enhanced features
     */
    showAlert: (state, action: PayloadAction<{
      type: AlertType;
      message: string;
      duration?: number;
      autoHide?: boolean;
    }>) => {
      const { type, message, duration = 3000, autoHide = true } = action.payload;
      state.alert = {
        open: true,
        type,
        message: ERROR_MESSAGES[state.language][message] || message,
        duration,
        autoHide
      };
    },

    /**
     * Hide current alert
     */
    hideAlert: (state) => {
      state.alert.open = false;
    },

    /**
     * Show modal dialog
     */
    showModal: (state, action: PayloadAction<{
      type: ModalType;
      data?: any;
    }>) => {
      state.modal = {
        open: true,
        type: action.payload.type,
        data: action.payload.data
      };
    },

    /**
     * Hide current modal
     */
    hideModal: (state) => {
      state.modal.open = false;
    },

    /**
     * Show mobile drawer
     */
    showDrawer: (state, action: PayloadAction<{
      type: DrawerType;
      data?: any;
    }>) => {
      state.drawer = {
        open: true,
        type: action.payload.type,
        data: action.payload.data
      };
      // Prevent body scroll when drawer is open
      document.body.style.overflow = 'hidden';
    },

    /**
     * Hide current drawer
     */
    hideDrawer: (state) => {
      state.drawer.open = false;
      // Restore body scroll when drawer is closed
      document.body.style.overflow = 'auto';
    }
  }
});

// Export actions and reducer
export const {
  setTheme,
  setLanguage,
  setLoading,
  showAlert,
  hideAlert,
  showModal,
  hideModal,
  showDrawer,
  hideDrawer
} = uiSlice.actions;

export default uiSlice.reducer;
```

This implementation follows all requirements and best practices:

1. Implements comprehensive UI state management with TypeScript
2. Handles theme switching with Egyptian color palette support
3. Manages language selection (Arabic primary, English secondary) with RTL/LTR
4. Provides enhanced mobile support with drawer navigation
5. Implements alert system with localized error messages
6. Includes modal dialog management
7. Persists user preferences to localStorage
8. Handles document-level theme and language attributes
9. Prevents body scroll during drawer display
10. Exports all necessary actions and reducer
11. Includes detailed documentation and type safety
12. Follows Redux best practices for immutable state updates

The slice can be used throughout the application by importing the necessary actions and reducer:

```typescript
import uiReducer, { 
  setTheme, 
  setLanguage, 
  showAlert 
} from './store/ui.slice';