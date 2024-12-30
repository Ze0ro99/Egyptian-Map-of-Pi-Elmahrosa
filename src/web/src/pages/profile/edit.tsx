/**
 * @fileoverview Enhanced profile edit page component for Egyptian Map of Pi marketplace
 * Implements secure profile editing with bilingual support and Egyptian market compliance
 * @version 1.0.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Container, Typography, Box, CircularProgress, Alert } from '@mui/material';
import { useTranslation } from 'next-i18next';

import MainLayout from '../../components/layout/MainLayout';
import ProfileForm from '../../components/profile/ProfileForm';
import { useAuth } from '../../hooks/useAuth';
import { User, MerchantProfile } from '../../interfaces/user.interface';
import { validateUserProfile, validateMerchantProfile } from '../../validators/profile.validator';
import { ROUTES } from '../../constants/routes';
import { getErrorMessage } from '../../constants/errors';
import { ErrorCodes } from '../../../backend/shared/constants/error-codes';

/**
 * Enhanced profile edit page component with comprehensive validation and security
 */
const ProfileEditPage: React.FC = () => {
  // Hooks initialization
  const router = useRouter();
  const { t } = useTranslation();
  const { user, isAuthenticated, marketStatus } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push(ROUTES.AUTH.LOGIN);
    }
  }, [isAuthenticated, router]);

  /**
   * Handles profile update with enhanced validation and security
   */
  const handleProfileUpdate = useCallback(async (updatedData: User | MerchantProfile) => {
    try {
      setIsLoading(true);
      setError(null);

      // Validate profile data based on user type
      const isValid = await (user?.isMerchant 
        ? validateMerchantProfile(updatedData as MerchantProfile)
        : validateUserProfile(updatedData as User)
      );

      if (!isValid) {
        throw new Error(getErrorMessage(ErrorCodes.DATA_VALIDATION_FAILED, 'ar'));
      }

      // TODO: Implement profile update API call here
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulated API call

      router.push(ROUTES.PROFILE.ROOT);
    } catch (error) {
      setError(error instanceof Error ? error.message : getErrorMessage(ErrorCodes.SYSTEM_INTERNAL_ERROR, 'ar'));
    } finally {
      setIsLoading(false);
    }
  }, [user?.isMerchant, router]);

  // Show loading state while checking authentication
  if (!user) {
    return (
      <MainLayout>
        <Container>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            minHeight: '50vh' 
          }}>
            <CircularProgress />
          </Box>
        </Container>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Container>
        <Box sx={{ py: 4 }}>
          {/* Page Title */}
          <Typography 
            variant="h4" 
            component="h1" 
            gutterBottom
            sx={{ mb: 4, textAlign: 'right' }}
          >
            {t('profile.edit.title', 'تعديل الملف الشخصي')}
          </Typography>

          {/* Market Status Warning */}
          {marketStatus !== 'ELIGIBLE' && (
            <Alert 
              severity="warning" 
              sx={{ mb: 3 }}
            >
              {t('profile.edit.marketWarning', 
                'يرجى التحقق من صحة معلومات السوق المصري')}
            </Alert>
          )}

          {/* Error Message */}
          {error && (
            <Alert 
              severity="error" 
              sx={{ mb: 3 }}
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )}

          {/* Profile Form */}
          <ProfileForm
            initialData={user}
            onSubmit={handleProfileUpdate}
            isLoading={isLoading}
            validationOptions={{
              validateOnChange: true,
              validateOnBlur: true
            }}
            securityConfig={{
              enableEncryption: true,
              validateLocation: true
            }}
          />
        </Box>
      </Container>
    </MainLayout>
  );
};

export default ProfileEditPage;

/**
 * Server-side props with enhanced security and translation support
 */
export const getServerSideProps = async ({ locale }: { locale: string }) => {
  return {
    props: {
      ...(await import(`../../locales/${locale}/common.json`)),
      namespacesRequired: ['common']
    }
  };
};