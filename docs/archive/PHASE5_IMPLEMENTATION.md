# Phase 5 Implementation Guide - Frontend Admin Dashboard

## Overview

Phase 5 nâng cấp Frontend Admin Dashboard với tích hợp đầy đủ các API từ Phase 4, xây dựng UI hiện đại cho User Management, Audit Logs, Dashboard Statistics, và các tính năng bảo mật frontend.

**Key Features:**
- Admin User Management UI với full CRUD operations
- Audit Logs Viewer với filtering & search
- Dashboard Statistics với charts & analytics
- Admin authentication & authorization flow
- Role-based UI rendering
- Security features (CSRF protection, XSS prevention)

## Prerequisites

✅ Phase 4 đã hoàn thành:
- Backend Admin API routes
- File upload security
- Audit logging system
- User management endpoints

---

## Part 1: Admin API Service Layer

### Step 1: Extend API Service với Admin Endpoints

**File: `frontend/src/lib/adminApi.ts`** (NEW)

```typescript
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
  oldValue: any;
  newValue: any;
  ipAddress: string | null;
  userAgent: string | null;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  createdAt: Date;
  user: {
    id: number;
    email: string;
    name: string | null;
  };
}

export interface DashboardStats {
  users: {
    total: number;
    active: number;
    inactive: number;
  };
  products: {
    total: number;
    visible: number;
    hidden: number;
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
};

// Admin Dashboard API
export const adminDashboardApi = {
  // Get overview statistics
  async getStats(): Promise<{ success: boolean; data: DashboardStats }> {
    return api.get('/admin/dashboard/stats');
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

  // Get recent activities
  async getRecentActivities(limit: number = 20): Promise<{
    success: boolean;
    data: AuditLog[];
  }> {
    return api.get(`/admin/dashboard/recent-activities?limit=${limit}`);
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
```

### Step 2: Add PATCH Method to API Service

**File: `frontend/src/lib/api.ts`** (UPDATE)

```typescript
// Add after put() method:

// PATCH request
public async patch<T>(
  endpoint: string,
  data?: unknown,
  requireAuth = true
): Promise<T> {
  return this.request<T>(endpoint, {
    method: 'PATCH',
    body: JSON.stringify(data),
    requireAuth,
  });
}
```

---

## Part 2: Admin User Management UI

### Step 1: Create User Management Page

**File: `frontend/src/components/dashboard/pages/AdminUsers.tsx`** (NEW)

```tsx
'use client';

import React, { useState, useEffect } from 'react';
import { adminUserApi, User, PaginatedResponse } from '@/lib/adminApi';

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Modals
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Load users
  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: any = {
        page: pagination.page,
        limit: pagination.limit,
      };

      if (searchTerm) params.search = searchTerm;
      if (roleFilter) params.role = roleFilter;
      if (statusFilter) params.isActive = statusFilter === 'active';

      const response = await adminUserApi.list(params);
      setUsers(response.data);
      setPagination(response.pagination);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi tải danh sách users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [pagination.page, searchTerm, roleFilter, statusFilter]);

  // Handle role change
  const handleRoleChange = async (newRole: string) => {
    if (!selectedUser) return;

    try {
      await adminUserApi.updateRole(selectedUser.id, { roleName: newRole });
      setShowRoleModal(false);
      setSelectedUser(null);
      loadUsers(); // Reload list
      alert('Cập nhật role thành công!');
    } catch (err: any) {
      alert(err.message || 'Lỗi khi cập nhật role');
    }
  };

  // Handle status toggle
  const handleStatusToggle = async (user: User) => {
    try {
      await adminUserApi.updateStatus(user.id, !user.isActive);
      loadUsers(); // Reload list
      alert(`User đã được ${!user.isActive ? 'kích hoạt' : 'vô hiệu hóa'}!`);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi cập nhật trạng thái');
    }
  };

  // Handle unlock
  const handleUnlock = async (user: User) => {
    try {
      await adminUserApi.unlock(user.id);
      loadUsers(); // Reload list
      alert('Tài khoản đã được mở khóa!');
    } catch (err: any) {
      alert(err.message || 'Lỗi khi mở khóa tài khoản');
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!selectedUser) return;

    try {
      await adminUserApi.delete(selectedUser.id);
      setShowDeleteModal(false);
      setSelectedUser(null);
      loadUsers(); // Reload list
      alert('User đã được xóa!');
    } catch (err: any) {
      alert(err.message || 'Lỗi khi xóa user');
    }
  };

  if (loading && users.length === 0) {
    return (
      <div className="p-8 bg-white dark:bg-slate-900 rounded-2xl">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-slate-200 dark:bg-slate-800 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-white dark:bg-slate-900 rounded-2xl">
        <div className="text-center text-red-600 dark:text-red-400">
          <p className="text-lg font-semibold">⚠️ Lỗi</p>
          <p className="mt-2">{error}</p>
          <button
            onClick={loadUsers}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-white dark:bg-slate-900 rounded-2xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Quản lý Users
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Quản lý tài khoản và phân quyền users
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <input
          type="text"
          placeholder="Tìm kiếm email hoặc tên..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
        />
        
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
        >
          <option value="">Tất cả roles</option>
          <option value="USER">USER</option>
          <option value="ADMIN">ADMIN</option>
          <option value="SUPER_ADMIN">SUPER_ADMIN</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-600 dark:text-blue-400 font-semibold">
            Tổng users
          </p>
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-1">
            {pagination.total}
          </p>
        </div>
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <p className="text-sm text-green-600 dark:text-green-400 font-semibold">
            Active
          </p>
          <p className="text-2xl font-bold text-green-700 dark:text-green-300 mt-1">
            {users.filter((u) => u.isActive).length}
          </p>
        </div>
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400 font-semibold">
            Locked
          </p>
          <p className="text-2xl font-bold text-red-700 dark:text-red-300 mt-1">
            {users.filter((u) => u.lockedUntil && new Date(u.lockedUntil) > new Date()).length}
          </p>
        </div>
      </div>

      {/* Users Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 dark:bg-slate-800">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase">
                User
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase">
                Role
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase">
                Last Login
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-700 dark:text-slate-300 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                      {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {user.name || 'N/A'}
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {user.email}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <span
                    className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                      user.role?.name === 'SUPER_ADMIN'
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                        : user.role?.name === 'ADMIN'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                    }`}
                  >
                    {user.role?.name || 'N/A'}
                  </span>
                </td>
                <td className="px-4 py-4">
                  {user.lockedUntil && new Date(user.lockedUntil) > new Date() ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                      🔒 Locked
                    </span>
                  ) : user.isActive ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                      ✓ Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300">
                      ⊗ Inactive
                    </span>
                  )}
                </td>
                <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-400">
                  {user.lastLoginAt
                    ? new Date(user.lastLoginAt).toLocaleDateString('vi-VN')
                    : 'Chưa đăng nhập'}
                </td>
                <td className="px-4 py-4">
                  <div className="flex justify-end gap-2">
                    {/* Change Role Button */}
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setShowRoleModal(true);
                      }}
                      className="px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                    >
                      Đổi role
                    </button>

                    {/* Toggle Status Button */}
                    <button
                      onClick={() => handleStatusToggle(user)}
                      className={`px-3 py-1 text-xs font-medium rounded ${
                        user.isActive
                          ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                          : 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
                      }`}
                    >
                      {user.isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}
                    </button>

                    {/* Unlock Button (only if locked) */}
                    {user.lockedUntil && new Date(user.lockedUntil) > new Date() && (
                      <button
                        onClick={() => handleUnlock(user)}
                        className="px-3 py-1 text-xs font-medium text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded"
                      >
                        Mở khóa
                      </button>
                    )}

                    {/* Delete Button */}
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setShowDeleteModal(true);
                      }}
                      className="px-3 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    >
                      Xóa
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center mt-6">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Hiển thị {(pagination.page - 1) * pagination.limit + 1} đến{' '}
          {Math.min(pagination.page * pagination.limit, pagination.total)} trong tổng số{' '}
          {pagination.total} users
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
            disabled={pagination.page === 1}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Trước
          </button>
          <button
            onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
            disabled={pagination.page >= pagination.pages}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Sau
          </button>
        </div>
      </div>

      {/* Role Change Modal */}
      {showRoleModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
              Thay đổi Role
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Chọn role mới cho <strong>{selectedUser.email}</strong>:
            </p>
            <div className="space-y-2 mb-6">
              {['USER', 'ADMIN', 'SUPER_ADMIN'].map((role) => (
                <button
                  key={role}
                  onClick={() => handleRoleChange(role)}
                  className="w-full px-4 py-3 text-left border-2 border-slate-200 dark:border-slate-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
                >
                  <span className="font-semibold text-slate-900 dark:text-white">{role}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                setShowRoleModal(false);
                setSelectedUser(null);
              }}
              className="w-full px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600"
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-red-600 dark:text-red-400 mb-4">
              ⚠️ Xác nhận xóa
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Bạn có chắc chắn muốn xóa user <strong>{selectedUser.email}</strong>?<br />
              Hành động này không thể hoàn tác!
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Xóa
              </button>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedUser(null);
                }}
                className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

### Step 2: Update Users Page Route

**File: `frontend/src/app/dashboard/users/page.tsx`** (UPDATE)

```tsx
import AdminUsers from '@/components/dashboard/pages/AdminUsers';

export default function UsersPage() {
  return <AdminUsers />;
}
```

---

## Part 3: Audit Logs Viewer UI

### Create Audit Logs Page

**File: `frontend/src/components/dashboard/pages/AuditLogs.tsx`** (NEW)

```tsx
'use client';

import React, { useState, useEffect } from 'react';
import { adminAuditLogApi, AuditLog } from '@/lib/adminApi';

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0,
  });

  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Available filters
  const [availableActions, setAvailableActions] = useState<string[]>([]);
  const [availableResources, setAvailableResources] = useState<string[]>([]);

  // Load filters
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const [actionsRes, resourcesRes] = await Promise.all([
          adminAuditLogApi.getActions(),
          adminAuditLogApi.getResources(),
        ]);
        setAvailableActions(actionsRes.data);
        setAvailableResources(resourcesRes.data);
      } catch (err) {
        console.error('Error loading filters:', err);
      }
    };
    loadFilters();
  }, []);

  // Load logs
  const loadLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: any = {
        page: pagination.page,
        limit: pagination.limit,
      };

      if (actionFilter) params.action = actionFilter;
      if (severityFilter) params.severity = severityFilter;
      if (resourceFilter) params.resource = resourceFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await adminAuditLogApi.list(params);
      setLogs(response.data);
      setPagination(response.pagination);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi tải audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [pagination.page, actionFilter, severityFilter, resourceFilter, startDate, endDate]);

  // Severity badge color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'WARNING':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'INFO':
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
    }
  };

  // Format date
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  if (loading && logs.length === 0) {
    return (
      <div className="p-8 bg-white dark:bg-slate-900 rounded-2xl">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-20 bg-slate-200 dark:bg-slate-800 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-white dark:bg-slate-900 rounded-2xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Audit Logs
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Theo dõi mọi hoạt động trong hệ thống
        </p>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
        >
          <option value="">Tất cả actions</option>
          {availableActions.map((action) => (
            <option key={action} value={action}>
              {action}
            </option>
          ))}
        </select>

        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
        >
          <option value="">Tất cả severity</option>
          <option value="INFO">INFO</option>
          <option value="WARNING">WARNING</option>
          <option value="CRITICAL">CRITICAL</option>
        </select>

        <select
          value={resourceFilter}
          onChange={(e) => setResourceFilter(e.target.value)}
          className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
        >
          <option value="">Tất cả resources</option>
          {availableResources.map((resource) => (
            <option key={resource} value={resource}>
              {resource}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
          placeholder="Từ ngày"
        />

        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
          placeholder="Đến ngày"
        />
      </div>

      {/* Logs List */}
      <div className="space-y-3 mb-6">
        {logs.map((log) => (
          <div
            key={log.id}
            className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {/* Header */}
                <div className="flex items-center gap-3 mb-2">
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(
                      log.severity
                    )}`}
                  >
                    {log.severity}
                  </span>
                  <span className="text-sm font-medium text-slate-900 dark:text-white">
                    {log.action}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {log.resource}
                    {log.resourceId && ` #${log.resourceId}`}
                  </span>
                </div>

                {/* User Info */}
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                  <span className="font-medium text-slate-900 dark:text-white">
                    {log.user.name || log.user.email}
                  </span>
                  {log.ipAddress && (
                    <span className="ml-2 text-xs">
                      từ IP: <code className="text-blue-600 dark:text-blue-400">{log.ipAddress}</code>
                    </span>
                  )}
                </p>

                {/* Values */}
                {(log.oldValue || log.newValue) && (
                  <div className="grid grid-cols-2 gap-4 mt-2 text-xs">
                    {log.oldValue && (
                      <div>
                        <p className="text-slate-500 dark:text-slate-400 font-semibold mb-1">
                          Giá trị cũ:
                        </p>
                        <pre className="p-2 bg-slate-100 dark:bg-slate-800 rounded overflow-x-auto">
                          {JSON.stringify(log.oldValue, null, 2)}
                        </pre>
                      </div>
                    )}
                    {log.newValue && (
                      <div>
                        <p className="text-slate-500 dark:text-slate-400 font-semibold mb-1">
                          Giá trị mới:
                        </p>
                        <pre className="p-2 bg-slate-100 dark:bg-slate-800 rounded overflow-x-auto">
                          {JSON.stringify(log.newValue, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Timestamp */}
              <div className="text-right text-xs text-slate-500 dark:text-slate-400 ml-4">
                {formatDate(log.createdAt)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {logs.length === 0 && !loading && (
        <div className="text-center py-12 text-slate-500 dark:text-slate-400">
          <p className="text-lg font-semibold">Không có audit logs</p>
          <p className="mt-2">Thử điều chỉnh bộ lọc hoặc xóa filters</p>
        </div>
      )}

      {/* Pagination */}
      {logs.length > 0 && (
        <div className="flex justify-between items-center mt-6">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Hiển thị {(pagination.page - 1) * pagination.limit + 1} đến{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} trong tổng số{' '}
            {pagination.total} logs
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
              disabled={pagination.page === 1}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Trước
            </button>
            <button
              onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
              disabled={pagination.page >= pagination.pages}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sau
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

### Create Audit Logs Page Route

**File: `frontend/src/app/dashboard/audit-logs/page.tsx`** (NEW)

```tsx
import AuditLogs from '@/components/dashboard/pages/AuditLogs';

export default function AuditLogsPage() {
  return <AuditLogs />;
}
```

---

## Part 4: Dashboard Statistics UI

### Create Enhanced Dashboard Home

**File: `frontend/src/components/dashboard/pages/DashboardHome.tsx`** (UPDATE với Admin Stats)

Thêm vào đầu file:

```tsx
'use client';

import React, { useState, useEffect } from 'react';
import { adminDashboardApi, DashboardStats } from '@/lib/adminApi';

export default function DashboardHome() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await adminDashboardApi.getStats();
      setStats(response.data);
    } catch (err) {
      console.error('Error loading stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-1/4"></div>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-slate-200 dark:bg-slate-800 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-8">
        Dashboard Overview
      </h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Users */}
        <div className="p-6 bg-linear-to-br from-blue-500 to-blue-600 rounded-2xl text-white shadow-lg">
          <p className="text-blue-100 text-sm font-semibold mb-2">Tổng Users</p>
          <p className="text-4xl font-bold">{stats.users.total}</p>
          <p className="text-blue-100 text-xs mt-2">
            Active: {stats.users.active} | Inactive: {stats.users.inactive}
          </p>
        </div>

        {/* Products */}
        <div className="p-6 bg-linear-to-br from-purple-500 to-purple-600 rounded-2xl text-white shadow-lg">
          <p className="text-purple-100 text-sm font-semibold mb-2">Sản phẩm</p>
          <p className="text-4xl font-bold">{stats.products.total}</p>
          <p className="text-purple-100 text-xs mt-2">
            Visible: {stats.products.visible} | Hidden: {stats.products.hidden}
          </p>
        </div>

        {/* Orders */}
        <div className="p-6 bg-linear-to-br from-green-500 to-green-600 rounded-2xl text-white shadow-lg">
          <p className="text-green-100 text-sm font-semibold mb-2">Đơn hàng</p>
          <p className="text-4xl font-bold">{stats.orders.total}</p>
          <p className="text-green-100 text-xs mt-2">
            Pending: {stats.orders.pending} | Completed: {stats.orders.completed}
          </p>
        </div>

        {/* Revenue */}
        <div className="p-6 bg-linear-to-br from-orange-500 to-orange-600 rounded-2xl text-white shadow-lg">
          <p className="text-orange-100 text-sm font-semibold mb-2">Doanh thu</p>
          <p className="text-4xl font-bold">
            {new Intl.NumberFormat('vi-VN').format(stats.revenue.total)}
          </p>
          <p className="text-orange-100 text-xs mt-2">{stats.revenue.currency}</p>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
          Đơn hàng gần đây
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase">
                  Order #
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase">
                  Khách hàng
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase">
                  Trạng thái
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-700 dark:text-slate-300 uppercase">
                  Tổng tiền
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-700 dark:text-slate-300 uppercase">
                  Ngày tạo
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {stats.recentOrders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                    #{order.orderNumber}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                    {order.user.name || order.user.email}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        order.status === 'DELIVERED'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                          : order.status === 'PENDING'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                      }`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-900 dark:text-white">
                    {new Intl.NumberFormat('vi-VN', {
                      style: 'currency',
                      currency: 'VND',
                    }).format(order.totalAmount)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-slate-600 dark:text-slate-400">
                    {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
```

---

## Part 5: Admin Route Protection

### Create Admin Guard Hook

**File: `frontend/src/hooks/useAdminGuard.ts`** (NEW)

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { isAdmin, User } from '@/lib/adminApi';

export function useAdminGuard() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if token exists
        if (!api.isAuthenticated()) {
          router.push('/login-register');
          return;
        }

        // Get current user info (tạo endpoint này trong backend nếu chưa có)
        const response = await api.get<{ success: boolean; data: User }>('/users/me');
        const user = response.data;

        // Check if user is admin
        if (!isAdmin(user)) {
          alert('Bạn không có quyền truy cập Admin Dashboard!');
          router.push('/');
          return;
        }

        setCurrentUser(user);
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/login-register');
      } finally {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [router]);

  return { isChecking, currentUser };
}
```

### Update Dashboard Layout với Auth Guard

**File: `frontend/src/app/dashboard/layout.tsx`** (UPDATE)

```tsx
'use client';

import { useAdminGuard } from '@/hooks/useAdminGuard';
import { useRouter } from 'next/navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isChecking, currentUser } = useAdminGuard();

  // Show loading while checking auth
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Đang xác thực...</p>
        </div>
      </div>
    );
  }

  // Auth successful - render dashboard
  return <div className="min-h-screen bg-slate-50 dark:bg-slate-900">{children}</div>;
}
```

---

## Part 6: Testing Frontend Integration

### Manual Testing Steps

**Test 1: User Management**
1. Navigate to `/dashboard/users`
2. Verify user list loads
3. Try filtering by role & status
4. Try search functionality
5. Change a user's role
6. Toggle user active status
7. Unlock a locked account
8. Delete a user (not yourself!)

**Test 2: Audit Logs**
1. Navigate to `/dashboard/audit-logs`
2. Verify logs load
3. Try filtering by action, severity, resource
4. Check date range filters
5. Verify pagination works

**Test 3: Dashboard Stats**
1. Navigate to `/dashboard`
2. Verify all stats cards load
3. Check recent orders table
4. Verify numbers match backend data

**Test 4: Admin Protection**
1. Logout
2. Try to access `/dashboard`
3. Should redirect to login
4. Login as regular user (not admin)
5. Try to access `/dashboard`
6. Should show "no permission" and redirect

---

## ✅ Phase 5 Checklist

### Frontend Admin API Integration
- [x] Create adminApi.ts service layer
- [x] Add PATCH method to base API service
- [x] Implement User Management API calls
- [x] Implement Audit Logs API calls
- [x] Implement Dashboard Stats API calls
- [x] Add TypeScript types for all responses

### User Management UI
- [x] Create AdminUsers component with full UI
- [x] List users với pagination
- [x] Search & filter functionality
- [x] Change user role modal
- [x] Toggle user status
- [x] Unlock user accounts
- [x] Delete user confirmation
- [x] Stats cards (total, active, locked)
- [x] Responsive design với dark mode

### Audit Logs UI
- [x] Create AuditLogs component
- [x] List logs với pagination
- [x] Filter by action, severity, resource
- [x] Date range filters
- [x] Display oldValue & newValue
- [x] Severity color coding
- [x] Empty state handling

### Dashboard Stats UI
- [x] Enhanced dashboard home với real data
- [x] Stats cards (users, products, orders, revenue)
- [x] Recent orders table
- [x] Gradient design với dark mode

### Authentication & Security
- [x] Admin guard hook (useAdminGuard)
- [x] Protected dashboard layout
- [x] Redirect non-admins
- [x] Loading states during auth check
- [x] Token management in API service

### UI/UX
- [x] Loading skeletons
- [x] Error handling & messages
- [x] Modals cho confirmations
- [x] Dark mode support
- [x] Responsive design
- [x] Accessibility (keyboard navigation)

---

## Security Considerations

### Frontend Security Features

**1. XSS Prevention**
```typescript
// React tự động escape HTML
// Nhưng cẩn thận với dangerouslySetInnerHTML
// NEVER do this:
// <div dangerouslySetInnerHTML={{ __html: userInput }} />
```

**2. CSRF Protection**
- Token stored in localStorage (not cookies để tránh CSRF)
- API service tự động attach token vào headers
- Backend validate token ở mọi request

**3. Input Validation**
```typescript
// Always validate trước khi gửi lên server
const email = input.trim().toLowerCase();
if (!isValidEmail(email)) {
  alert('Email không hợp lệ');
  return;
}
```

**4. Sensitive Data**
```typescript
// NEVER log sensitive data
console.log('User data:', user); // ❌ NO
console.log('User ID:', user.id); // ✅ OK

// Don't store sensitive data in localStorage
localStorage.setItem('password', pass); // ❌ NEVER
```

**5. Rate Limiting UI**
```typescript
// Debounce search để tránh spam API
import { debounce } from 'lodash';

const debouncedSearch = debounce((term) => {
  searchUsers(term);
}, 500);
```

---

## Troubleshooting

### Issue: "401 Unauthorized" on Admin Routes
**Solution:** Check if:
1. Token is stored correctly: `localStorage.getItem('token')`
2. Token format in headers: `Authorization: Bearer YOUR_TOKEN`
3. Backend `requireAdmin` middleware is working
4. User role is actually ADMIN or SUPER_ADMIN

### Issue: CORS Errors
**Solution:** Backend CORS config should allow frontend origin:
```typescript
// backend/src/server.ts
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
```

### Issue: Dark Mode Styles Not Applied
**Solution:** Check Tailwind dark mode config:
```typescript
// tailwind.config.ts
module.exports = {
  darkMode: 'class', // or 'media'
  // ...
};
```

### Issue: Pagination Not Working
**Solution:** Check if page state updates trigger useEffect:
```typescript
useEffect(() => {
  loadData();
}, [pagination.page]); // ✅ Include pagination.page in dependencies
```

---

## Next Steps

Phase 5 hoàn tất! Bây giờ có:
- ✅ Full-featured Admin Dashboard UI
- ✅ User Management với permissions
- ✅ Audit Logs Viewer
- ✅ Dashboard Statistics
- ✅ Admin authentication & protection

**Phase 6: Testing & Security Validation**
- Integration tests (Cypress/Playwright)
- API security testing
- OWASP Top 10 validation
- Load testing
- Documentation

---

**Phase 5 Complete! 🎉**

Frontend Admin Dashboard đã sẵn sàng với đầy đủ tính năng quản lý users, audit logs, và statistics!
