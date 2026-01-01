'use client';

import React, { useState, useEffect } from 'react';
import { adminUserApi, User } from '@/lib/adminApi';

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

      const params: {
        page: number;
        limit: number;
        search?: string;
        role?: string;
        isActive?: boolean;
      } = {
        page: pagination.page,
        limit: pagination.limit,
      };

      if (searchTerm) params.search = searchTerm;
      if (roleFilter) params.role = roleFilter;
      if (statusFilter) params.isActive = statusFilter === 'active';

      const response = await adminUserApi.list(params);
      setUsers(response.data);
      setPagination(response.pagination);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Lỗi khi tải danh sách users';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, searchTerm, roleFilter, statusFilter]);

  // Handle role change
  const handleRoleChange = async (newRole: string) => {
    if (!selectedUser) return;

    try {
      await adminUserApi.updateRole(selectedUser.id, { roleName: newRole });
      setShowRoleModal(false);
      setSelectedUser(null);
      loadUsers();
      alert('Cập nhật role thành công!');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Lỗi khi cập nhật role';
      alert(message);
    }
  };

  // Handle status toggle
  const handleStatusToggle = async (user: User) => {
    try {
      await adminUserApi.updateStatus(user.id, !user.isActive);
      loadUsers();
      alert(`User đã được ${!user.isActive ? 'kích hoạt' : 'vô hiệu hóa'}!`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Lỗi khi cập nhật trạng thái';
      alert(message);
    }
  };

  // Handle unlock
  const handleUnlock = async (user: User) => {
    try {
      await adminUserApi.unlock(user.id);
      loadUsers();
      alert('Tài khoản đã được mở khóa!');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Lỗi khi mở khóa tài khoản';
      alert(message);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!selectedUser) return;

    try {
      await adminUserApi.delete(selectedUser.id);
      setShowDeleteModal(false);
      setSelectedUser(null);
      loadUsers();
      alert('User đã được xóa!');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Lỗi khi xóa user';
      alert(message);
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
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setShowRoleModal(true);
                      }}
                      className="px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                    >
                      Đổi role
                    </button>

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

                    {user.lockedUntil && new Date(user.lockedUntil) > new Date() && (
                      <button
                        onClick={() => handleUnlock(user)}
                        className="px-3 py-1 text-xs font-medium text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded"
                      >
                        Mở khóa
                      </button>
                    )}

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
