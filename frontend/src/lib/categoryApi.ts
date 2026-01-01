import { api } from './api';

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    products: number;
  };
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

export interface CreateCategoryData {
  name: string;
  slug: string;
  description?: string;
  image?: string;
}

export interface UpdateCategoryData {
  name?: string;
  slug?: string;
  description?: string;
  image?: string;
}

export const categoryApi = {
  async list(params: { page?: number; limit?: number } = {}): Promise<PaginatedResponse<Category>> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.set('page', params.page.toString());
    if (params.limit) queryParams.set('limit', params.limit.toString());
    
    return api.get<PaginatedResponse<Category>>(`/categories?${queryParams.toString()}`);
  },

  async getById(id: number): Promise<{ success: boolean; data: Category }> {
    return api.get(`/categories/${id}`);
  },

  async getBySlug(slug: string): Promise<{ success: boolean; data: Category }> {
    return api.get(`/categories/slug/${slug}`);
  },

  async create(data: CreateCategoryData): Promise<{ success: boolean; data: Category }> {
    return api.post('/categories', data);
  },

  async update(id: number, data: UpdateCategoryData): Promise<{ success: boolean; data: Category }> {
    return api.put(`/categories/${id}`, data);
  },

  async delete(id: number): Promise<{ success: boolean; message: string }> {
    return api.delete(`/categories/${id}`);
  },
};
