/**
 * @fileoverview Enhanced header component for Egyptian Map of Pi application
 * @version 1.0.0
 * 
 * Implements Material Design with Egyptian cultural adaptations, providing
 * navigation, authentication, language switching, and theme toggling functionality
 * with full RTL support and accessibility features.
 */

import React, { useState, useCallback } from 'react';
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  useMediaQuery,
  Menu,
  MenuItem,
  Box,
  Badge,
  Divider,
  Tooltip
} from '@mui/material'; // v5.14+
import {
  Brightness4,
  Brightness7,
  Language,
  AccountCircle,
  LocationOn,
  Menu as MenuIcon,
  Notifications
} from '@mui/icons-material'; // v5.14+
import { useTranslation } from 'react-i18next'; // v12.0.0

import CustomButton from './Button';
import LoginButton from '../auth/LoginButton';
import { useAuth } from '../../hooks/useAuth';
import useTheme from '../../hooks/useTheme';

// Interface for header props
interface HeaderProps {
  onMenuClick: (event: React.MouseEvent) => void;
  elevation?: number;
  showLocation?: boolean;
  marketStatus?: EgyptianMarketStatus;
}

/**
 * Enhanced header component with RTL support and Egyptian market features
 */
const Header: React.FC<HeaderProps> = ({
  onMenuClick,
  elevation = 4,
  showLocation = true,
  marketStatus = EgyptianMarketStatus.PENDING
}) => {
  // Hooks
  const { t, i18n } = useTranslation();
  const { user, isAuthenticated, logout } = useAuth();
  const { mode, toggleTheme, direction, setDirection } = useTheme();
  const isMobile = useMediaQuery('(max-width:428px)');

  // Local state
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [langAnchorEl, setLangAnchorEl] = useState<null | HTMLElement>(null);

  // Handlers
  const handleUserMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleUserMenuClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleLangMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setLangAnchorEl(event.currentTarget);
  }, []);

  const handleLangMenuClose = useCallback(() => {
    setLangAnchorEl(null);
  }, []);

  const handleLanguageChange = useCallback((lang: string) => {
    i18n.changeLanguage(lang);
    setDirection(lang === 'ar' ? 'rtl' : 'ltr');
    handleLangMenuClose();
  }, [i18n, setDirection]);

  const handleLogout = useCallback(() => {
    logout();
    handleUserMenuClose();
  }, [logout]);

  return (
    <AppBar 
      position="fixed" 
      elevation={elevation}
      sx={{ 
        bgcolor: 'background.paper',
        direction: direction
      }}
    >
      <Toolbar>
        {/* Menu Icon */}
        <IconButton
          edge="start"
          color="inherit"
          aria-label={t('common.menu')}
          onClick={onMenuClick}
          sx={{ mr: 2 }}
        >
          <MenuIcon />
        </IconButton>

        {/* Logo/Title */}
        <Typography
          variant="h6"
          component="h1"
          sx={{
            flexGrow: 1,
            fontWeight: 600,
            color: 'text.primary'
          }}
        >
          {t('app.title')}
        </Typography>

        {/* Location Button (if enabled) */}
        {showLocation && (
          <Tooltip title={t('common.location')}>
            <IconButton
              color="inherit"
              aria-label={t('common.location')}
              sx={{ ml: 1 }}
            >
              <LocationOn />
            </IconButton>
          </Tooltip>
        )}

        {/* Language Selector */}
        <Tooltip title={t('common.language')}>
          <IconButton
            color="inherit"
            aria-label={t('common.language')}
            onClick={handleLangMenuOpen}
            sx={{ ml: 1 }}
          >
            <Language />
          </IconButton>
        </Tooltip>
        <Menu
          anchorEl={langAnchorEl}
          open={Boolean(langAnchorEl)}
          onClose={handleLangMenuClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: direction === 'rtl' ? 'right' : 'left'
          }}
        >
          <MenuItem onClick={() => handleLanguageChange('ar')}>العربية</MenuItem>
          <MenuItem onClick={() => handleLanguageChange('en')}>English</MenuItem>
        </Menu>

        {/* Theme Toggle */}
        <Tooltip title={t('common.theme')}>
          <IconButton
            color="inherit"
            aria-label={t('common.theme')}
            onClick={toggleTheme}
            sx={{ ml: 1 }}
          >
            {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
          </IconButton>
        </Tooltip>

        {/* Authentication Section */}
        {isAuthenticated ? (
          <>
            {/* Notifications */}
            <Tooltip title={t('common.notifications')}>
              <IconButton color="inherit" sx={{ ml: 1 }}>
                <Badge badgeContent={3} color="error">
                  <Notifications />
                </Badge>
              </IconButton>
            </Tooltip>

            {/* User Menu */}
            <IconButton
              color="inherit"
              aria-label={t('common.account')}
              onClick={handleUserMenuOpen}
              sx={{ ml: 1 }}
            >
              <AccountCircle />
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleUserMenuClose}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: direction === 'rtl' ? 'right' : 'left'
              }}
            >
              <MenuItem onClick={handleUserMenuClose}>
                {t('auth.profile')}
              </MenuItem>
              <MenuItem onClick={handleUserMenuClose}>
                {t('auth.settings')}
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout}>
                {t('auth.logout')}
              </MenuItem>
            </Menu>
          </>
        ) : (
          <Box sx={{ ml: 2 }}>
            <LoginButton
              variant="contained"
              size={isMobile ? "small" : "medium"}
              fullWidth={false}
            />
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
};

// Display name for debugging
Header.displayName = 'Header';

export default Header;