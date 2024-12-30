/**
 * @fileoverview Custom 404 error page component for Egyptian Map of Pi marketplace
 * @version 1.0.0
 * 
 * Implements a culturally appropriate 404 error page with bilingual support,
 * accessibility features, and proper navigation options.
 */

import React from 'react';
import { useRouter } from 'next/router'; // v13.0+
import { useTranslation } from 'next-i18next'; // v13.0+
import { Box, Typography, Container, useTheme } from '@mui/material'; // v5.14+
import Head from 'next/head'; // v13.0+

import MainLayout from '../components/layout/MainLayout';
import CustomButton from '../components/common/Button';

/**
 * Enhanced 404 error page component with Egyptian market adaptations
 */
const Custom404: React.FC = () => {
  // Hooks initialization
  const router = useRouter();
  const { t } = useTranslation();
  const theme = useTheme();

  // Determine if the current language is Arabic
  const isRTL = theme.direction === 'rtl';

  /**
   * Handle navigation back to home page
   */
  const handleHomeClick = () => {
    router.push('/');
  };

  return (
    <>
      <Head>
        <title>{t('error.404.title')} | {t('app.name')}</title>
        <meta 
          name="description" 
          content={t('error.404.meta.description')}
        />
      </Head>

      <MainLayout>
        <Container>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 'calc(100vh - 120px)',
              textAlign: 'center',
              padding: theme.spacing(3),
              direction: 'inherit'
            }}
          >
            {/* Error Code */}
            <Typography
              variant="h1"
              component="h1"
              sx={{
                marginBottom: theme.spacing(2),
                color: theme.palette.error.main,
                fontWeight: 'bold',
                fontSize: {
                  xs: '2rem',
                  sm: '2.5rem',
                  md: '3rem'
                }
              }}
              aria-label={t('error.404.ariaLabel')}
            >
              404
            </Typography>

            {/* Primary Error Message */}
            <Typography
              variant="h2"
              component="h2"
              sx={{
                marginBottom: theme.spacing(4),
                maxWidth: '600px',
                fontSize: {
                  xs: '1.25rem',
                  sm: '1.5rem',
                  md: '1.75rem'
                }
              }}
            >
              {isRTL ? (
                // Arabic error message
                'عذراً، الصفحة التي تبحث عنها غير موجودة'
              ) : (
                // English error message
                'Sorry, the page you are looking for cannot be found'
              )}
            </Typography>

            {/* Helpful Suggestion */}
            <Typography
              variant="body1"
              sx={{
                marginBottom: theme.spacing(4),
                maxWidth: '600px',
                fontSize: {
                  xs: '1rem',
                  sm: '1.1rem',
                  md: '1.2rem'
                },
                color: theme.palette.text.secondary
              }}
            >
              {isRTL ? (
                // Arabic suggestion
                'يمكنك العودة إلى الصفحة الرئيسية أو البحث عن منتجات أخرى'
              ) : (
                // English suggestion
                'You can return to the home page or search for other products'
              )}
            </Typography>

            {/* Navigation Button */}
            <CustomButton
              variant="contained"
              color="primary"
              size="large"
              onClick={handleHomeClick}
              ariaLabel={t('error.404.button.home')}
              sx={{
                minWidth: '200px',
                minHeight: '48px',
                marginTop: theme.spacing(2)
              }}
            >
              {isRTL ? 'العودة إلى الصفحة الرئيسية' : 'Return to Home Page'}
            </CustomButton>
          </Box>
        </Container>
      </MainLayout>
    </>
  );
};

// Export with NextPage type
export default Custom404;