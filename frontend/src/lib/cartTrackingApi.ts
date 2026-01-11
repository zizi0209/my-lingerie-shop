import { api } from './api';

export type CartStatus = 'active' | 'abandoned' | 'empty' | 'recovered';

export interface CartItem {
  id: number;
  cartId: number;
  productId: number;
  variantId: number | null;
  quantity: number;
  product: {
    id: number;
    name: string;
    price: number;
    salePrice: number | null;
    images?: { url: string }[];
  };
  variant?: {
    id: number;
    size: string;
    color: string;
    price: number | null;
  } | null;
}

export interface Cart {
  id: number;
  sessionId: string | null;
  user: {
    id: number;
    name: string;
    email: string;
    phone: string | null;
  } | null;
  totalItems: number;
  totalValue: number;
  status: CartStatus;
  items: CartItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CartStats {
  totalCarts: number;
  activeCarts: number;
  abandonedCarts: number;
  abandonedValue: number;
  emptyCarts: number;
  recoveredCarts: number;
}

export interface CartListResponse {
  success: boolean;
  data: Cart[];
  stats: CartStats;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export const cartTrackingApi = {
  async list(params: { page?: number; limit?: number; status?: CartStatus; includeEmpty?: boolean } = {}): Promise<CartListResponse> {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.set('page', params.page.toString());
    if (params.limit) queryParams.set('limit', params.limit.toString());
    if (params.status) queryParams.set('status', params.status);
    if (params.includeEmpty) queryParams.set('includeEmpty', 'true');

    return api.get<CartListResponse>(`/admin/dashboard/carts?${queryParams.toString()}`);
  },
};
