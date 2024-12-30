import React, { useMemo } from 'react';
import { Grid, Typography, Skeleton } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { CATEGORIES } from '../../constants/categories';
import CustomCard from '../common/Card';

/**
 * Props interface for the CategoryGrid component
 */
interface CategoryGridProps {
  onCategoryClick: (categoryId: string) => void;
  className?: string;
  isLoading?: boolean;
  testId?: string;
}

/**
 * A responsive grid component that displays marketplace categories with bilingual support
 * Implements Material Design with Egyptian cultural adaptations
 * 
 * @version 1.0.0
 * @param props - Component properties
 * @returns JSX.Element - Rendered category grid
 */
const CategoryGrid = React.memo<CategoryGridProps>(({
  onCategoryClick,
  className,
  isLoading = false,
  testId = 'category-grid'
}) => {
  const theme = useTheme();
  
  // Responsive breakpoints for grid layout
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  
  // Calculate columns based on screen size
  const getGridColumns = useMemo(() => {
    if (isMobile) return 2; // 2 columns for mobile
    if (isTablet) return 3; // 3 columns for tablet
    return 4; // 4 columns for desktop
  }, [isMobile, isTablet]);

  // Calculate grid spacing based on screen size
  const gridSpacing = useMemo(() => {
    return isMobile ? 1 : 2;
  }, [isMobile]);

  /**
   * Renders a loading skeleton for categories
   * @returns JSX.Element - Skeleton placeholder
   */
  const renderSkeleton = () => (
    <>
      {[...Array(6)].map((_, index) => (
        <Grid item xs={6} sm={4} md={3} key={`skeleton-${index}`}>
          <CustomCard elevation={1}>
            <Skeleton 
              variant="circular" 
              width={48} 
              height={48} 
              sx={{ margin: '0 auto', mb: 1 }}
            />
            <Skeleton 
              variant="text" 
              width="80%" 
              sx={{ margin: '0 auto' }}
            />
          </CustomCard>
        </Grid>
      ))}
    </>
  );

  /**
   * Renders the actual category grid content
   * @returns JSX.Element - Grid of category cards
   */
  const renderCategories = useMemo(() => (
    <>
      {CATEGORIES.map((category) => {
        const CategoryIcon = category.icon;
        
        return (
          <Grid 
            item 
            xs={6} 
            sm={4} 
            md={3} 
            key={category.id}
            role="listitem"
          >
            <CustomCard
              onClick={() => onCategoryClick(category.id)}
              elevation={1}
              aria-label={`${category.nameEn} category, ${category.nameAr}`}
              isRTL={theme.direction === 'rtl'}
            >
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                gap: theme.spacing(1)
              }}>
                <CategoryIcon
                  sx={{
                    fontSize: 48,
                    color: theme.palette.primary.main,
                    mb: 1
                  }}
                  aria-hidden="true"
                />
                
                {/* Arabic name with proper RTL support */}
                <Typography
                  variant="body1"
                  component="span"
                  align="center"
                  dir="rtl"
                  lang="ar"
                  sx={{
                    fontWeight: 500,
                    mb: 0.5,
                    width: '100%'
                  }}
                >
                  {category.nameAr}
                </Typography>
                
                {/* English name */}
                <Typography
                  variant="body2"
                  component="span"
                  align="center"
                  color="text.secondary"
                  lang="en"
                  sx={{
                    width: '100%'
                  }}
                >
                  {category.nameEn}
                </Typography>
              </div>
            </CustomCard>
          </Grid>
        );
      })}
    </>
  ), [onCategoryClick, theme.direction]);

  return (
    <Grid
      container
      spacing={gridSpacing}
      className={className}
      data-testid={testId}
      role="list"
      aria-label="Product Categories"
      sx={{
        width: '100%',
        margin: 0,
        padding: theme.spacing(2),
        direction: theme.direction
      }}
    >
      {isLoading ? renderSkeleton() : renderCategories}
    </Grid>
  );
});

// Display name for debugging
CategoryGrid.displayName = 'CategoryGrid';

export default CategoryGrid;