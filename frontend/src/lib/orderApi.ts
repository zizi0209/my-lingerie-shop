import { api } from './api';

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'SHIPPING' | 'COMPLETED' | 'CANCELLED';
export type PaymentStatus = 'PENDING' | 'PAID' | 'REFUNDED';

export interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  quantity: number;
  price: number;
  variant: string | null;
  product: {
    id: number;
    name: string;
    slug: string;
    price: number;
    images?: { url: string }[];
  };
}

export interface Order {
  id: number;
  orderNumber: string;
  userId: number | null;
  guestInfo: {
    name?: string;
    email?: string;
    phone?: string;
  } | null;
  shippingAddress: string;
  shippingCity: string | null;
  shippingPhone: string;
  shippingMethod: string | null;
  trackingNumber: string | null;
  paymentMethod: string;
  paymentStatus: PaymentStatus;
  paidAt: Date | null;
  totalAmount: number;
  shippingFee: number;
  discount: number;
  notes: string | null;
  status: OrderStatus;
  items: OrderItem[];
  user?: {
    id: number;
    name: string;
    email: string;
    phone: string | null;
  } | null;
  createdAt: Date;
  updatedAt: Date;
  cancelledAt: Date | null;
}

export interface OrderListParams {
  page?: number;
  limit?: number;
  status?: OrderStatus;
  userId?: number;
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

export interface UpdateOrderData {
  status?: OrderStatus;
  trackingNumber?: string;
  paymentStatus?: PaymentStatus;
  paidAt?: string;
  shippingMethod?: string;
  notes?: string;
}

export const orderApi = {
  async list(params: OrderListParams = {}): Promise<PaginatedResponse<Order>> {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.set(key, value.toString());
      }
    });

    return api.get<PaginatedResponse<Order>>(`/orders?${queryParams.toString()}`);
  },

  async getById(id: number): Promise<{ success: boolean; data: Order }> {
    return api.get(`/orders/${id}`);
  },

  async update(id: number, data: UpdateOrderData): Promise<{ success: boolean; data: Order }> {
    return api.put(`/orders/${id}`, data);
  },

  async cancel(id: number): Promise<{ success: boolean; message: string; data: Order }> {
    return api.put(`/orders/${id}/cancel`, {});
  },
};
