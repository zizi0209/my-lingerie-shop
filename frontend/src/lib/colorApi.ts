import { api } from './api';

export interface Color {
  id: number;
  name: string;
  hexCode: string;
  isActive: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
  _count?: {
    variants: number;
  };
}

export interface CreateColorData {
  name: string;
  hexCode: string;
  isActive?: boolean;
  order?: number;
}

export interface UpdateColorData {
  name?: string;
  hexCode?: string;
  isActive?: boolean;
  order?: number;
}

interface ColorListResponse {
  success: boolean;
  data: Color[];
}

interface ColorResponse {
  success: boolean;
  data: Color;
}

export const colorApi = {
  list: async (activeOnly = false): Promise<ColorListResponse> => {
    return api.get(`/colors${activeOnly ? '?activeOnly=true' : ''}`);
  },

  getForFilter: async (categoryId?: number): Promise<ColorListResponse> => {
    const params = categoryId ? `?categoryId=${categoryId}` : '';
    return api.get(`/colors/filter${params}`);
  },

  getById: async (id: number): Promise<ColorResponse> => {
    return api.get(`/colors/${id}`);
  },

  create: async (data: CreateColorData): Promise<ColorResponse> => {
    return api.post('/colors', data);
  },

  update: async (id: number, data: UpdateColorData): Promise<ColorResponse> => {
    return api.put(`/colors/${id}`, data);
  },

  delete: async (id: number): Promise<{ success: boolean; message: string }> => {
    return api.delete(`/colors/${id}`);
  },

  reorder: async (orders: { id: number; order: number }[]): Promise<{ success: boolean; message: string }> => {
    return api.put('/colors/reorder', { orders });
  },
};
