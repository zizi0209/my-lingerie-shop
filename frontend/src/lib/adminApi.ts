import { api } from './api';

// Types
export interface User {
  id: number;
  email: string;
  name: string | null;
  phone: string | null;
  isActive: boolean;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  role: {
    id: number;
    name: string;
  } | null;
}

export interface AuditLog {
  id: string;
  userId: number;
  action: string;
  resource: string;
  resourceId: string | null;
  oldValue: unknown;
  newValue: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  createdAt: Date;
  user: {
    id: number;
    email: string;
    name: string | null;
    role?: string;
  };
}

export interface LiveFeedItem {
  type: 'NEW_ORDER' | 'LOW_RATING_REVIEW';
  id: string;
  title: string;
  description: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  createdAt: Date;
  metadata: {
    orderId?: number;
    orderNumber?: string;
    amount?: number;
    reviewId?: number;
    productId?: number;
    rating?: number;
  };
}

export interface DashboardStats {
  users: {
    total: number;
    active: number;
    inactive: number;
    newToday: number;
  };
  products: {
    total: number;
    visible: number;
    hidden: number;
    lowStock: number;
    outOfStock: number;
  };
  orders: {
    total: number;
    pending: number;
    completed: number;
  };
  revenue: {
    total: number;
    currency: string;
  };
  recentOrders: Array<{
    id: number;
    orderNumber: string;
    status: string;
    totalAmount: number;
    createdAt: Date;
    user: {
      id: number;
      email: string;
      name: string | null;
    };
  }>;
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

// Admin User Management API
export const adminUserApi = {
  // List users với pagination & filters
  async list(params: {
    page?: number;
    limit?: number;
    role?: string;
    isActive?: boolean;
    search?: string;
  } = {}): Promise<PaginatedResponse<User>> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.set('page', params.page.toString());
    if (params.limit) queryParams.set('limit', params.limit.toString());
    if (params.role) queryParams.set('role', params.role);
    if (params.isActive !== undefined) queryParams.set('isActive', params.isActive.toString());
    if (params.search) queryParams.set('search', params.search);

    return api.get<PaginatedResponse<User>>(
      `/admin/users?${queryParams.toString()}`
    );
  },

  // Get user by ID
  async getById(id: number): Promise<{ success: boolean; data: User }> {
    return api.get(`/admin/users/${id}`);
  },

  // Update user role
  async updateRole(
    id: number,
    roleData: { roleId?: number; roleName?: string }
  ): Promise<{ success: boolean; data: User; message: string }> {
    return api.patch(`/admin/users/${id}/role`, roleData);
  },

  // Update user status (activate/deactivate)
  async updateStatus(
    id: number,
    isActive: boolean
  ): Promise<{ success: boolean; data: User; message: string }> {
    return api.patch(`/admin/users/${id}/status`, { isActive });
  },

  // Unlock user account
  async unlock(
    id: number
  ): Promise<{ success: boolean; data: User; message: string }> {
    return api.patch(`/admin/users/${id}/unlock`, {});
  },

  // Delete user (soft delete)
  async delete(id: number): Promise<{ success: boolean; message: string }> {
    return api.delete(`/admin/users/${id}`);
  },

  // Get user's audit logs
  async getAuditLogs(
    id: number,
    params: { page?: number; limit?: number } = {}
  ): Promise<PaginatedResponse<AuditLog>> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.set('page', params.page.toString());
    if (params.limit) queryParams.set('limit', params.limit.toString());

    return api.get<PaginatedResponse<AuditLog>>(
      `/admin/users/${id}/audit-logs?${queryParams.toString()}`
    );
  },
};

// Admin Audit Logs API
export const adminAuditLogApi = {
  // List audit logs với filtering
  async list(params: {
    page?: number;
    limit?: number;
    action?: string;
    userId?: number;
    severity?: string;
    resource?: string;
    startDate?: string;
    endDate?: string;
  } = {}): Promise<PaginatedResponse<AuditLog>> {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) queryParams.set(key, value.toString());
    });

    return api.get<PaginatedResponse<AuditLog>>(
      `/admin/audit-logs?${queryParams.toString()}`
    );
  },

  // Get audit log by ID
  async getById(id: string): Promise<{ success: boolean; data: AuditLog }> {
    return api.get(`/admin/audit-logs/${id}`);
  },

  // Get statistics
  async getStats(days: number = 7): Promise<{
    success: boolean;
    data: {
      period: { days: number; startDate: Date; endDate: Date };
      summary: {
        total: number;
        bySeverity: Array<{ severity: string; count: number }>;
        topActions: Array<{ action: string; count: number }>;
      };
      criticalRecent: AuditLog[];
    };
  }> {
    return api.get(`/admin/audit-logs/stats/summary?days=${days}`);
  },

  // Get available actions
  async getActions(): Promise<{ success: boolean; data: string[] }> {
    return api.get('/admin/audit-logs/actions/list');
  },

  // Get available resources
  async getResources(): Promise<{ success: boolean; data: string[] }> {
    return api.get('/admin/audit-logs/resources/list');
  },

  // Get admin users who have audit logs
  async getAdmins(): Promise<{ 
    success: boolean; 
    data: Array<{ id: number; name: string | null; email: string; role: { name: string } | null }> 
  }> {
    return api.get('/admin/audit-logs/admins/list');
  },
};

// Admin Dashboard API
export const adminDashboardApi = {
  // Get overview statistics
  async getStats(params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<{ success: boolean; data: DashboardStats }> {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.set('startDate', params.startDate);
    if (params?.endDate) queryParams.set('endDate', params.endDate);
    
    const queryString = queryParams.toString();
    return api.get(`/admin/dashboard/stats${queryString ? `?${queryString}` : ''}`);
  },

  // Get analytics data
  async getAnalytics(period: '24hours' | '7days' | '30days' | '90days' = '7days'): Promise<{
    success: boolean;
    data: {
      period: string;
      startDate: Date;
      endDate: Date;
      ordersByStatus: Array<{ status: string; count: number }>;
      revenueByDay: Array<{ totalAmount: number; createdAt: Date }>;
      topProducts: Array<{
        productId: number;
        productName: string;
        price: number;
        totalSold: number;
        orderCount: number;
      }>;
    };
  }> {
    return api.get(`/admin/dashboard/analytics?period=${period}`);
  },

  // Get analytics overview (for Tracking page)
  async getAnalyticsOverview(params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<{ success: boolean; data: unknown }> {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.set('startDate', params.startDate);
    if (params?.endDate) queryParams.set('endDate', params.endDate);
    
    const queryString = queryParams.toString();
    return api.get(`/admin/analytics/overview${queryString ? `?${queryString}` : ''}`);
  },

  // Get recent activities (Admin actions only)
  async getRecentActivities(limit: number = 20): Promise<{
    success: boolean;
    data: AuditLog[];
  }> {
    return api.get(`/admin/dashboard/recent-activities?limit=${limit}`);
  },
  
  // Get live feed (Business events: orders, reviews)
  async getLiveFeed(limit: number = 10): Promise<{
    success: boolean;
    data: LiveFeedItem[];
  }> {
    return api.get(`/admin/dashboard/live-feed?limit=${limit}`);
  },
};

// Helper: Check if user is admin
export function isAdmin(user: User | null): boolean {
  if (!user || !user.role) return false;
  const roleName = user.role.name.toUpperCase();
  return roleName === 'ADMIN' || roleName === 'SUPER_ADMIN';
}

// Helper: Check if user is super admin
export function isSuperAdmin(user: User | null): boolean {
  if (!user || !user.role) return false;
  return user.role.name.toUpperCase() === 'SUPER_ADMIN';
}
