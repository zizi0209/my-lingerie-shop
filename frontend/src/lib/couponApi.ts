import { api } from './api';

// Types
export interface Coupon {
  id: number;
  code: string;
  name: string;
  description: string | null;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_SHIPPING' | 'BUY_X_GET_Y';
  discountValue: number;
  maxDiscount: number | null;
  minOrderValue: number | null;
  quantity: number | null;
  usedCount: number;
  maxUsagePerUser: number;
  couponType: 'NEW_USER' | 'PUBLIC' | 'PRIVATE' | 'PRODUCT' | 'SHIPPING';
  isSystem: boolean;
  isPublic: boolean;
  conditions: Record<string, unknown> | null;
  startDate: string;
  endDate: string | null;
  campaignId: number | null;
  campaign?: { id: number; name: string } | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    userCoupons: number;
    usageHistory: number;
  };
}

export interface Campaign {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    coupons: number;
  };
  coupons?: Coupon[];
}

export interface PointReward {
  id: number;
  name: string;
  description: string | null;
  pointCost: number;
  rewardType: 'VOUCHER' | 'GIFT' | 'DISCOUNT';
  couponId: number | null;
  discountValue: number | null;
  discountType: string | null;
  quantity: number | null;
  redeemedCount: number;
  maxPerUser: number | null;
  isActive: boolean;
  startDate: string;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    redemptions: number;
  };
}

export interface CouponUsage {
  id: number;
  couponId: number;
  userId: number | null;
  orderId: number;
  discountAmount: number;
  orderTotal: number;
  createdAt: string;
}

interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

interface SingleResponse<T> {
  success: boolean;
  data: T;
}

// =============================================
// COUPON API
// =============================================

export const couponApi = {
  // List coupons
  list: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    couponType?: string;
    isActive?: boolean;
    campaignId?: number;
  }): Promise<PaginatedResponse<Coupon>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.search) searchParams.set('search', params.search);
    if (params?.couponType) searchParams.set('couponType', params.couponType);
    if (params?.isActive !== undefined) searchParams.set('isActive', String(params.isActive));
    if (params?.campaignId) searchParams.set('campaignId', String(params.campaignId));

    const query = searchParams.toString();
    return api.get(`/admin/coupons${query ? `?${query}` : ''}`);
  },

  // Get single coupon
  get: async (id: number): Promise<SingleResponse<Coupon>> => {
    return api.get(`/admin/coupons/${id}`);
  },

  // Create coupon
  create: async (data: Partial<Coupon>): Promise<SingleResponse<Coupon>> => {
    return api.post('/admin/coupons', data);
  },

  // Update coupon
  update: async (id: number, data: Partial<Coupon>): Promise<SingleResponse<Coupon>> => {
    return api.put(`/admin/coupons/${id}`, data);
  },

  // Delete coupon
  delete: async (id: number): Promise<{ success: boolean; message: string }> => {
    return api.delete(`/admin/coupons/${id}`);
  },

  // Get usage history
  getUsage: async (id: number, params?: { page?: number; limit?: number }): Promise<PaginatedResponse<CouponUsage>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const query = searchParams.toString();
    return api.get(`/admin/coupons/${id}/usage${query ? `?${query}` : ''}`);
  },

  // Generate private coupon
  generatePrivate: async (data: {
    userId: number;
    discountType: string;
    discountValue: number;
    maxDiscount?: number;
    minOrderValue?: number;
    expiresInDays?: number;
    reason?: string;
  }): Promise<SingleResponse<Coupon>> => {
    return api.post('/admin/coupons/generate-private', data);
  },
};

// =============================================
// CAMPAIGN API
// =============================================

export const campaignApi = {
  list: async (params?: {
    page?: number;
    limit?: number;
    isActive?: boolean;
  }): Promise<PaginatedResponse<Campaign>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.isActive !== undefined) searchParams.set('isActive', String(params.isActive));
    const query = searchParams.toString();
    return api.get(`/admin/campaigns${query ? `?${query}` : ''}`);
  },

  get: async (id: number): Promise<SingleResponse<Campaign>> => {
    return api.get(`/admin/campaigns/${id}`);
  },

  create: async (data: Partial<Campaign>): Promise<SingleResponse<Campaign>> => {
    return api.post('/admin/campaigns', data);
  },

  update: async (id: number, data: Partial<Campaign>): Promise<SingleResponse<Campaign>> => {
    return api.put(`/admin/campaigns/${id}`, data);
  },

  delete: async (id: number): Promise<{ success: boolean; message: string }> => {
    return api.delete(`/admin/campaigns/${id}`);
  },
};

// =============================================
// POINT REWARD API
// =============================================

export const pointRewardApi = {
  list: async (params?: {
    page?: number;
    limit?: number;
    isActive?: boolean;
  }): Promise<PaginatedResponse<PointReward>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.isActive !== undefined) searchParams.set('isActive', String(params.isActive));
    const query = searchParams.toString();
    return api.get(`/admin/rewards${query ? `?${query}` : ''}`);
  },

  get: async (id: number): Promise<SingleResponse<PointReward>> => {
    return api.get(`/admin/rewards/${id}`);
  },

  create: async (data: Partial<PointReward>): Promise<SingleResponse<PointReward>> => {
    return api.post('/admin/rewards', data);
  },

  update: async (id: number, data: Partial<PointReward>): Promise<SingleResponse<PointReward>> => {
    return api.put(`/admin/rewards/${id}`, data);
  },

  delete: async (id: number): Promise<{ success: boolean; message: string }> => {
    return api.delete(`/admin/rewards/${id}`);
  },
};
