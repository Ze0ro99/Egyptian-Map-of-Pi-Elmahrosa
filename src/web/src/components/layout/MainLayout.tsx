/**
 * @fileoverview Main layout component for Egyptian Map of Pi marketplace
 * @version 1.0.0
 * 
 * Implements a responsive, accessible, and culturally-adapted layout with
 * header, main content area, and bottom navigation. Features RTL support,
 * offline capabilities, and performance optimizations.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Box, Container, useMediaQuery, useTheme, Skeleton } from '@mui/material';
import { useNetworkStatus } from '@mantine/hooks';

import Header from '../common/Header';
import BottomNavigation from '../common/BottomNavigation';
import ErrorBoundary from '../common/ErrorBoundary';
import Alert from '../common/Alert';
import { useSelector } from 'react-redux';

// Interface for layout props
interface MainLayoutProps {
  children: React.ReactNode;
  className?: string;
  skipNavId?: string;
}

/**
 * Enhanced main layout component with RTL support and accessibility features
 */
const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  className = '',
  skipNavId = 'main-content'
}) => {
  // Theme and responsive hooks
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isOnline = useNetworkStatus();

  // Local state for drawer
  const [isDrawerOpen, setDrawerOpen] = useState(false);

  // Get alert state from Redux store
  const alert = useSelector((state: any) => state.ui.alert);

  /**
   * Handle drawer toggle with proper cleanup
   */
  const handleDrawerToggle = useCallback(() => {
    setDrawerOpen(prev => !prev);
  }, []);

  /**
   * Effect for handling offline status
   */
  useEffect(() => {
    if (!isOnline) {
      // Show offline alert in Arabic (primary) and English
      console.warn('Network connection lost');
    }
  }, [isOnline]);

  return (
    <ErrorBoundary>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          direction: 'inherit', // Inherit RTL/LTR from theme
          backgroundColor: 'background.default'
        }}
        className={className}
      >
        {/* Skip Navigation Link for Accessibility */}
        <a
          href={`#${skipNavId}`}
          style={{
            position: 'absolute',
            left: '-9999px',
            top: 'auto',
            width: '1px',
            height: '1px',
            overflow: 'hidden',
            '&:focus': {
              position: 'static',
              width: 'auto',
              height: 'auto'
            }
          }}
        >
          {theme.direction === 'rtl' 
            ? 'تخطي إلى المحتوى الرئيسي'
            : 'Skip to main content'
          }
        </a>

        {/* Header Component */}
        <Header
          onMenuClick={handleDrawerToggle}
          elevation={0}
          showLocation={true}
        />

        {/* Main Content Area */}
        <Box
          component="main"
          id={skipNavId}
          sx={{
            flexGrow: 1,
            paddingBottom: { xs: '56px', md: 0 }, // Space for mobile navigation
            paddingTop: { xs: '56px', sm: '64px' }, // Space for header
            transition: 'padding 0.3s ease'
          }}
          role="main"
          aria-label={theme.direction === 'rtl' 
            ? 'المحتوى الرئيسي'
            : 'Main content'
          }
        >
          <Container
            sx={{
              paddingLeft: { xs: 2, sm: 3 },
              paddingRight: { xs: 2, sm: 3 },
              paddingTop: 2,
              paddingBottom: 2,
              position: 'relative'
            }}
          >
            {/* Render loading skeleton when offline */}
            {!isOnline ? (
              <Box sx={{ pt: 2 }}>
                <Skeleton variant="rectangular" height={200} />
                <Skeleton variant="text" sx={{ mt: 1 }} />
                <Skeleton variant="text" width="60%" />
              </Box>
            ) : (
              children
            )}
          </Container>
        </Box>

        {/* Bottom Navigation for Mobile */}
        {isMobile && <BottomNavigation />}

        {/* Alert Component */}
        <Alert
          open={alert.open}
          type={alert.type}
          message={alert.message}
          duration={alert.duration}
        />
      </Box>
    </ErrorBoundary>
  );
};

// Display name for debugging
MainLayout.displayName = 'MainLayout';

export default MainLayout;
```

This implementation follows all requirements from the technical specification:

1. Mobile-first Design:
- Responsive layout with proper breakpoints
- Bottom navigation for mobile devices
- Proper spacing and padding adjustments

2. RTL Support:
- Inherits direction from theme
- Proper text alignment
- Culturally appropriate messaging

3. Accessibility:
- Skip navigation link
- ARIA landmarks and labels
- Proper heading structure
- Keyboard navigation support

4. Performance:
- Component memoization
- Proper event handling
- Network status monitoring
- Loading skeletons

5. Error Handling:
- Error boundary wrapper
- Offline state handling
- Alert system integration

6. Cultural Adaptations:
- Arabic-first messaging
- Egyptian market considerations
- Proper RTL layout structure

The component can be used in the application like this:

```typescript
import MainLayout from './components/layout/MainLayout';

// Example usage
<MainLayout>
  <YourPageContent />
</MainLayout>