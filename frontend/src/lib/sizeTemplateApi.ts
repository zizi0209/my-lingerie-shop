import { api } from './api';

// Types
export type ProductType = 'BRA' | 'PANTY' | 'SET' | 'SLEEPWEAR' | 'SHAPEWEAR' | 'ACCESSORY';

export interface SizeEntry {
  size: string;
  bust?: string;
  underBust?: string;
  cup?: string;
  waist?: string;
  hips?: string;
  height?: string;
  weight?: string;
  braSize?: string;
  pantySize?: string;
  belly?: string;
  [key: string]: string | undefined;
}

export interface MeasurementStep {
  name: string;
  description: string;
  image?: string;
}

export interface SizeChartData {
  name: string;
  description?: string | null;
  headers: string[];
  sizes: SizeEntry[];
  measurements: MeasurementStep[];
  tips: string[];
  note?: string | null;
  measurementImage?: string | null;
  internationalSizes?: InternationalSizes | null;
}

export interface InternationalSizes {
  US?: Record<string, string>;
  UK?: Record<string, string>;
  EU?: Record<string, string>;
  VN?: Record<string, string>;
}

export interface SizeChartTemplate extends SizeChartData {
  id: number;
  productType: ProductType;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  source?: 'custom' | 'template';
  productType?: ProductType;
}

// Default international size conversion (cho BRA)
export const BRA_INTERNATIONAL_SIZES: InternationalSizes = {
  VN: {
    '70A': '70A', '70B': '70B', '70C': '70C',
    '75A': '75A', '75B': '75B', '75C': '75C',
    '80A': '80A', '80B': '80B', '80C': '80C',
    '85B': '85B', '85C': '85C', '85D': '85D',
  },
  US: {
    '70A': '32A', '70B': '32B', '70C': '32C',
    '75A': '34A', '75B': '34B', '75C': '34C',
    '80A': '36A', '80B': '36B', '80C': '36C',
    '85B': '38B', '85C': '38C', '85D': '38D',
  },
  UK: {
    '70A': '32A', '70B': '32B', '70C': '32C',
    '75A': '34A', '75B': '34B', '75C': '34C',
    '80A': '36A', '80B': '36B', '80C': '36C',
    '85B': '38B', '85C': '38C', '85D': '38D',
  },
  EU: {
    '70A': '70A', '70B': '70B', '70C': '70C',
    '75A': '75A', '75B': '75B', '75C': '75C',
    '80A': '80A', '80B': '80B', '80C': '80C',
    '85B': '85B', '85C': '85C', '85D': '85D',
  },
};

// Default international size conversion (cho PANTY/SLEEPWEAR/SET)
export const ALPHA_INTERNATIONAL_SIZES: InternationalSizes = {
  VN: { 'S': 'S', 'M': 'M', 'L': 'L', 'XL': 'XL', 'XXL': 'XXL' },
  US: { 'S': 'S (4-6)', 'M': 'M (8-10)', 'L': 'L (12-14)', 'XL': 'XL (16)', 'XXL': 'XXL (18)' },
  UK: { 'S': '8', 'M': '10-12', 'L': '14', 'XL': '16', 'XXL': '18' },
  EU: { 'S': '36', 'M': '38-40', 'L': '42', 'XL': '44', 'XXL': '46' },
};

/**
 * Fetch size chart by product type
 */
export const fetchSizeChartByType = async (type: ProductType): Promise<SizeChartData | null> => {
  if (type === 'ACCESSORY') return null;
  
  try {
    const response = await api.get<ApiResponse<SizeChartTemplate>>(
      `/size-templates/${type}`,
      false
    );
    
    if (response.success && response.data) {
      return {
        name: response.data.name,
        description: response.data.description,
        headers: response.data.headers as string[],
        sizes: response.data.sizes as SizeEntry[],
        measurements: response.data.measurements as MeasurementStep[],
        tips: response.data.tips as string[],
        note: response.data.note,
        measurementImage: response.data.measurementImage,
        internationalSizes: response.data.internationalSizes as InternationalSizes | null,
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching size chart:', error);
    return null;
  }
};

/**
 * Fetch size chart for a specific product (handles customSizeChart)
 */
export const fetchSizeChartByProduct = async (productId: number): Promise<{
  data: SizeChartData | null;
  productType: ProductType | null;
  source: 'custom' | 'template' | null;
}> => {
  try {
    const response = await api.get<ApiResponse<SizeChartData>>(
      `/size-templates/product/${productId}`,
      false
    );
    
    if (response.success) {
      return {
        data: response.data,
        productType: response.productType || null,
        source: response.source || null,
      };
    }
    return { data: null, productType: null, source: null };
  } catch (error) {
    console.error('Error fetching product size chart:', error);
    return { data: null, productType: null, source: null };
  }
};

/**
 * Get international sizes based on product type
 */
export const getInternationalSizes = (type: ProductType): InternationalSizes | null => {
  if (type === 'BRA') return BRA_INTERNATIONAL_SIZES;
  if (type === 'PANTY' || type === 'SLEEPWEAR' || type === 'SET' || type === 'SHAPEWEAR') {
    return ALPHA_INTERNATIONAL_SIZES;
  }
  return null;
};
