import { api } from './api';

// Types
export interface Product {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  salePrice: number | null;
  categoryId: number;
  isFeatured: boolean;
  isVisible: boolean;
  createdAt: Date;
  updatedAt: Date;
  category: {
    id: number;
    name: string;
    slug: string;
  };
  images: ProductImage[];
  variants: ProductVariant[];
}

export interface ProductImage {
  id: number;
  url: string;
  productId: number;
}

export interface ProductVariant {
  id: number;
  sku: string;
  size: string;
  color: string;
  stock: number;
  price: number | null;
  salePrice: number | null;
  productId: number;
}

export interface ProductListParams {
  page?: number;
  limit?: number;
  categoryId?: number;
  isFeatured?: boolean;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface CreateProductData {
  name: string;
  slug: string;
  description?: string;
  price: number;
  salePrice?: number;
  categoryId: number;
  isFeatured?: boolean;
  isVisible?: boolean;
  images?: string[];
  variants?: Array<{
    size: string;
    color: string;
    stock: number;
    price?: number;
    salePrice?: number;
  }>;
}

export interface UpdateProductData {
  name?: string;
  slug?: string;
  description?: string;
  price?: number;
  salePrice?: number;
  categoryId?: number;
  isFeatured?: boolean;
  isVisible?: boolean;
}

// Product API
export const productApi = {
  // List products với pagination & filters
  async list(params: ProductListParams = {}): Promise<PaginatedResponse<Product>> {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.set(key, value.toString());
      }
    });

    return api.get<PaginatedResponse<Product>>(
      `/products?${queryParams.toString()}`
    );
  },

  // Get product by ID
  async getById(id: number): Promise<{ success: boolean; data: Product }> {
    return api.get(`/products/${id}`);
  },

  // Get product by slug
  async getBySlug(slug: string): Promise<{ success: boolean; data: Product }> {
    return api.get(`/products/slug/${slug}`);
  },

  // Create product (admin only)
  async create(data: CreateProductData): Promise<{ success: boolean; data: Product }> {
    return api.post('/products', data);
  },

  // Update product (admin only)
  async update(
    id: number,
    data: UpdateProductData
  ): Promise<{ success: boolean; data: Product }> {
    return api.put(`/products/${id}`, data);
  },

  // Delete product (admin only)
  async delete(id: number): Promise<{ success: boolean; message: string }> {
    return api.delete(`/products/${id}`);
  },

  // Product Images
  images: {
    // Get all images of a product
    async list(productId: number): Promise<{ success: boolean; data: ProductImage[] }> {
      return api.get(`/products/${productId}/images`);
    },

    // Add images to product (single or multiple)
    async add(
      productId: number,
      urls: string | string[]
    ): Promise<{ success: boolean; message: string }> {
      if (typeof urls === 'string') {
        return api.post(`/products/${productId}/images`, { url: urls });
      }
      return api.post(`/products/${productId}/images`, { urls });
    },

    // Update image
    async update(
      imageId: number,
      url: string
    ): Promise<{ success: boolean; data: ProductImage }> {
      return api.put(`/products/images/${imageId}`, { url });
    },

    // Delete image
    async delete(imageId: number): Promise<{ success: boolean; message: string }> {
      return api.delete(`/products/images/${imageId}`);
    },
  },

  // Product Variants
  variants: {
    // Get all variants of a product
    async list(productId: number): Promise<{ success: boolean; data: ProductVariant[] }> {
      return api.get(`/products/${productId}/variants`);
    },

    // Add variants to product
    async add(
      productId: number,
      variants: Array<{
        size: string;
        color: string;
        stock: number;
        price?: number;
        salePrice?: number;
      }>
    ): Promise<{ success: boolean; message: string }> {
      return api.post(`/products/${productId}/variants`, { variants });
    },

    // Update variant
    async update(
      variantId: number,
      data: {
        size?: string;
        color?: string;
        stock?: number;
      }
    ): Promise<{ success: boolean; data: ProductVariant }> {
      return api.put(`/products/variants/${variantId}`, data);
    },

    // Delete variant
    async delete(variantId: number): Promise<{ success: boolean; message: string }> {
      return api.delete(`/products/variants/${variantId}`);
    },
  },
};
