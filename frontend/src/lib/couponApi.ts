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

// =============================================
// USER-FACING API
// =============================================

export interface UserCoupon {
  id: number;
  userId: number;
  couponId: number;
  status: 'AVAILABLE' | 'USED' | 'EXPIRED';
  expiresAt: string | null;
  usedAt: string | null;
  usedOrderId: number | null;
  source: 'COLLECTED' | 'SYSTEM' | 'REWARD' | 'REFERRAL';
  createdAt: string;
  coupon: {
    id: number;
    code: string;
    name: string;
    description: string | null;
    discountType: string;
    discountValue: number;
    maxDiscount: number | null;
    minOrderValue: number | null;
    couponType: string;
    startDate: string;
    endDate: string | null;
    isActive: boolean;
  };
}

export interface PointInfo {
  balance: number;
  totalSpent: number;
  tier: string;
  history: Array<{
    id: number;
    type: string;
    amount: number;
    balance: number;
    source: string;
    description: string | null;
    createdAt: string;
  }>;
}

export const userVoucherApi = {
  // Get public vouchers that can be collected
  getPublicVouchers: async (): Promise<SingleResponse<Coupon[]>> => {
    return api.get('/vouchers', false);
  },

  // Get user's voucher wallet
  getMyVouchers: async (): Promise<SingleResponse<UserCoupon[]>> => {
    return api.get('/my-vouchers');
  },

  // Collect a voucher
  collectVoucher: async (code: string): Promise<SingleResponse<UserCoupon>> => {
    return api.post(`/my-vouchers/collect/${code}`, {});
  },

  // Validate voucher for checkout
  validateVoucher: async (code: string, orderTotal: number): Promise<{
    success: boolean;
    data: {
      coupon: { id: number; code: string; name: string; discountType: string; discountValue: number };
      discountAmount: number;
      finalTotal: number;
    };
    error?: string;
  }> => {
    return api.post('/vouchers/validate', { code, orderTotal }, false);
  },

  // Get user's points
  getMyPoints: async (): Promise<SingleResponse<PointInfo>> => {
    return api.get('/my-points');
  },

  // Get available rewards
  getRewards: async (): Promise<SingleResponse<PointReward[]>> => {
    return api.get('/rewards', false);
  },

  // Redeem points for reward
  redeemReward: async (rewardId: number): Promise<{
    success: boolean;
    message: string;
    data: {
      pointsSpent: number;
      newBalance: number;
      reward: string;
      voucher?: Coupon;
    };
  }> => {
    return api.post(`/rewards/${rewardId}/redeem`, {});
  },

  // Calculate points preview for checkout
  calculatePoints: async (orderTotal: number): Promise<{
    success: boolean;
    data: {
      pointsToEarn: number;
      pointRate: number;
      tier: string | null;
      currentPoints?: number;
      isBirthdayMonth: boolean;
      message?: string;
    };
  }> => {
    return api.post('/points/calculate', { orderTotal }, false);
  },

  // Get available vouchers for cart (voucher stacking)
  getAvailableVouchers: async (cartId: number): Promise<{
    success: boolean;
    data: {
      subtotal: number;
      discountVouchers: Array<{
        id: number;
        code: string;
        name: string;
        discountType: string;
        discountValue: number;
        maxDiscount: number | null;
        minOrderValue: number | null;
        eligible: boolean;
        amountNeeded: number;
      }>;
      shippingVouchers: Array<{
        id: number;
        code: string;
        name: string;
        discountType: string;
        discountValue: number;
        minOrderValue: number | null;
        eligible: boolean;
        amountNeeded: number;
      }>;
    };
  }> => {
    return api.get(`/carts/${cartId}/available-vouchers`, false);
  },
};
