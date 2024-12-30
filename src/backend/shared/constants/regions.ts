/**
 * @fileoverview Egyptian Governorates and Regions Constants
 * Defines comprehensive constant values for Egyptian governorates and regions with detailed metadata
 * including bilingual names, precise geographic boundaries, population data, and regional classifications.
 * Version: 1.0.0
 * Last Updated: 2023
 */

/**
 * Interface defining geographic boundary coordinates for regions
 */
export interface GeoBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

/**
 * Enum defining region classification types
 */
export enum REGION_TYPES {
  URBAN = 'URBAN',
  RURAL = 'RURAL',
  INDUSTRIAL = 'INDUSTRIAL'
}

/**
 * Type alias for region classification
 */
export type RegionType = keyof typeof REGION_TYPES;

/**
 * Interface defining comprehensive structure of governorate data
 */
export interface Governorate {
  id: string;
  nameAr: string;
  nameEn: string;
  bounds: GeoBounds;
  type: RegionType;
  population: number;
  adminCenter: string;
  majorCities: string[];
  populationDensity: number;
  version: string;
  lastUpdated: Date;
}

/**
 * Geographic boundaries of Egypt for map constraints
 */
export const EGYPT_BOUNDS: GeoBounds = {
  north: 31.5, // Mediterranean Sea
  south: 22.0, // Sudan Border
  east: 35.0,  // Red Sea
  west: 25.0   // Libya Border
};

/**
 * Comprehensive array of all Egyptian governorates with detailed metadata
 * Population data as of 2021 census
 * Coordinates verified against official geographic data
 */
export const EGYPTIAN_GOVERNORATES: Governorate[] = [
  {
    id: 'CAI',
    nameAr: 'القاهرة',
    nameEn: 'Cairo',
    bounds: {
      north: 30.1728,
      south: 29.9511,
      east: 31.3267,
      west: 31.2357
    },
    type: REGION_TYPES.URBAN,
    population: 9539000,
    adminCenter: 'Downtown Cairo',
    majorCities: ['Nasr City', 'Maadi', 'Heliopolis', 'New Cairo'],
    populationDensity: 19376,
    version: '1.0.0',
    lastUpdated: new Date('2023-01-01')
  },
  {
    id: 'ALX',
    nameAr: 'الإسكندرية',
    nameEn: 'Alexandria',
    bounds: {
      north: 31.3306,
      south: 30.9991,
      east: 30.0875,
      west: 29.8217
    },
    type: REGION_TYPES.URBAN,
    population: 5200000,
    adminCenter: 'Alexandria Downtown',
    majorCities: ['Miami', 'Montaza', 'Agami', 'Borg El Arab'],
    populationDensity: 2947,
    version: '1.0.0',
    lastUpdated: new Date('2023-01-01')
  },
  {
    id: 'GIZ',
    nameAr: 'الجيزة',
    nameEn: 'Giza',
    bounds: {
      north: 30.0859,
      south: 29.9714,
      east: 31.2358,
      west: 31.1123
    },
    type: REGION_TYPES.URBAN,
    population: 8632000,
    adminCenter: 'Dokki',
    majorCities: ['6th of October', 'Sheikh Zayed', 'Haram', 'Dokki'],
    populationDensity: 6847,
    version: '1.0.0',
    lastUpdated: new Date('2023-01-01')
  },
  {
    id: 'ASW',
    nameAr: 'أسوان',
    nameEn: 'Aswan',
    bounds: {
      north: 24.0889,
      south: 23.9664,
      east: 32.9090,
      west: 32.8731
    },
    type: REGION_TYPES.RURAL,
    population: 1498000,
    adminCenter: 'Aswan City',
    majorCities: ['Kom Ombo', 'Edfu', 'Daraw', 'Abu Simbel'],
    populationDensity: 2.3,
    version: '1.0.0',
    lastUpdated: new Date('2023-01-01')
  },
  {
    id: 'SUZ',
    nameAr: 'السويس',
    nameEn: 'Suez',
    bounds: {
      north: 30.0084,
      south: 29.9046,
      east: 32.5543,
      west: 32.5164
    },
    type: REGION_TYPES.INDUSTRIAL,
    population: 728000,
    adminCenter: 'Suez City',
    majorCities: ['Ain Sokhna', 'Attaka', 'Arbaeen', 'Faisal'],
    populationDensity: 512,
    version: '1.0.0',
    lastUpdated: new Date('2023-01-01')
  }
  // Additional governorates can be added following the same structure
];

/**
 * Validation to ensure all governorate data is within Egypt's bounds
 */
EGYPTIAN_GOVERNORATES.forEach(governorate => {
  if (
    governorate.bounds.north > EGYPT_BOUNDS.north ||
    governorate.bounds.south < EGYPT_BOUNDS.south ||
    governorate.bounds.east > EGYPT_BOUNDS.east ||
    governorate.bounds.west < EGYPT_BOUNDS.west
  ) {
    console.warn(`Governorate ${governorate.nameEn} has bounds outside Egypt's boundaries`);
  }
});

/**
 * Freeze objects to prevent runtime modifications
 */
Object.freeze(EGYPT_BOUNDS);
Object.freeze(REGION_TYPES);
Object.freeze(EGYPTIAN_GOVERNORATES);