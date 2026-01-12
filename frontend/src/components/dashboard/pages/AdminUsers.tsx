'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, Edit2, Trash2, Loader2, AlertCircle, X, 
  Users, CheckCircle, Shield, Lock, Unlock, UserCheck, UserX, Mail, Phone, Calendar
} from 'lucide-react';
import { adminUserApi, type User } from '@/lib/adminApi';
import { api } from '@/lib/api';
import SearchInput from '../components/SearchInput';
import Pagination from '../components/Pagination';
import { useLanguage } from '../components/LanguageContext';

interface Role {
  id: number;
  name: string;
  description: string | null;
}

interface FormData {
  name: string;
  email: string;
  phone: string;
  roleId: string;
  isActive: boolean;
}

const initialFormData: FormData = {
  name: '',
  email: '',
  phone: '',
  roleId: '',
  isActive: true,
};

const AdminUsers: React.FC = () => {
  const { language } = useLanguage();
  
  // List states
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Actions
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // Translations
  const t = {
    title: language === 'vi' ? 'Quản lý người dùng' : 'User Management',
    subtitle: language === 'vi' ? 'Quản lý tài khoản và phân quyền' : 'Manage accounts and permissions',
    addNew: language === 'vi' ? 'Thêm người dùng' : 'Add User',
    edit: language === 'vi' ? 'Sửa người dùng' : 'Edit User',
    name: language === 'vi' ? 'Họ tên' : 'Full Name',
    email: 'Email',
    phone: language === 'vi' ? 'Số điện thoại' : 'Phone',
    role: language === 'vi' ? 'Vai trò' : 'Role',
    status: language === 'vi' ? 'Trạng thái' : 'Status',
    selectRole: language === 'vi' ? 'Chọn vai trò' : 'Select role',
    save: language === 'vi' ? 'Lưu' : 'Save',
    cancel: language === 'vi' ? 'Hủy' : 'Cancel',
    saving: language === 'vi' ? 'Đang lưu...' : 'Saving...',
    confirmDelete: language === 'vi' ? 'Xác nhận xóa' : 'Confirm Delete',
    deleteWarning: language === 'vi' ? 'Bạn có chắc chắn muốn xóa người dùng này? Hành động này không thể hoàn tác!' : 'Are you sure you want to delete this user? This action cannot be undone!',
    delete: language === 'vi' ? 'Xóa' : 'Delete',
    loadError: language === 'vi' ? 'Không thể tải danh sách người dùng' : 'Cannot load users',
    users: language === 'vi' ? 'người dùng' : 'users',
    loadingText: language === 'vi' ? 'Đang tải...' : 'Loading...',
    noUsers: language === 'vi' ? 'Chưa có người dùng nào' : 'No users found',
    prev: language === 'vi' ? 'Trước' : 'Prev',
    next: language === 'vi' ? 'Sau' : 'Next',
    page: language === 'vi' ? 'Trang' : 'Page',
    search: language === 'vi' ? 'Tìm theo tên hoặc email...' : 'Search by name or email...',
    saveSuccess: language === 'vi' ? 'Lưu thành công!' : 'Saved successfully!',
    allRoles: language === 'vi' ? 'Tất cả vai trò' : 'All Roles',
    allStatus: language === 'vi' ? 'Tất cả trạng thái' : 'All Status',
    active: language === 'vi' ? 'Hoạt động' : 'Active',
    inactive: language === 'vi' ? 'Vô hiệu' : 'Inactive',
    locked: language === 'vi' ? 'Đã khóa' : 'Locked',
    lastLogin: language === 'vi' ? 'Đăng nhập cuối' : 'Last Login',
    neverLogin: language === 'vi' ? 'Chưa đăng nhập' : 'Never logged in',
    activate: language === 'vi' ? 'Kích hoạt' : 'Activate',
    deactivate: language === 'vi' ? 'Vô hiệu hóa' : 'Deactivate',
    unlock: language === 'vi' ? 'Mở khóa' : 'Unlock',
    totalUsers: language === 'vi' ? 'Tổng người dùng' : 'Total Users',
    activeUsers: language === 'vi' ? 'Đang hoạt động' : 'Active Users',
    lockedUsers: language === 'vi' ? 'Bị khóa' : 'Locked',
    namePlaceholder: language === 'vi' ? 'Nguyễn Văn A' : 'John Doe',
    phonePlaceholder: '0912345678',
  };

  // Load roles
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await api.get<{ success: boolean; data: Role[] }>('/roles');
        if (response.success) {
          setRoles(response.data);
        }
      } catch (err) {
        console.error('Failed to fetch roles:', err);
      }
    };
    fetchRoles();
  }, []);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminUserApi.list({
        page: pagination.page,
        limit: pagination.limit,
        search: searchQuery || undefined,
        role: roleFilter || undefined,
        isActive: statusFilter ? statusFilter === 'active' : undefined,
      });

      if (response.success) {
        setUsers(response.data);
        setPagination(response.pagination);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setError(t.loadError);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, searchQuery, roleFilter, statusFilter, t.loadError]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers, refreshTrigger]);

  // Stats - tính từ users trong page hiện tại (để hiển thị nhanh)
  // Inactive = isActive === false (admin vô hiệu hóa)
  // Locked = lockedUntil > now (bị khóa do đăng nhập sai nhiều lần)
  const stats = {
    total: pagination.total,
    active: users.filter(u => u.isActive && !(u.lockedUntil && new Date(u.lockedUntil) > new Date())).length,
    inactive: users.filter(u => !u.isActive).length,
  };

  // Open edit modal
  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name || '',
      email: user.email,
      phone: user.phone || '',
      roleId: user.role?.id.toString() || '',
      isActive: user.isActive,
    });
    setFormError(null);
    setSuccessMessage(null);
    setShowModal(true);
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    if (!editingUser) return;

    setSaving(true);

    try {
      // Update user basic info
      await api.put(`/users/${editingUser.id}`, {
        name: formData.name.trim() || null,
        phone: formData.phone.trim() || null,
        roleId: formData.roleId ? parseInt(formData.roleId) : null,
        isActive: formData.isActive,
      });

      setSuccessMessage(t.saveSuccess);
      setTimeout(() => {
        setShowModal(false);
        setRefreshTrigger(prev => prev + 1);
      }, 500);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Có lỗi xảy ra';
      setFormError(message);
    } finally {
      setSaving(false);
    }
  };

  // Toggle status
  const handleToggleStatus = async (user: User) => {
    setActionLoading(user.id);
    try {
      await adminUserApi.updateStatus(user.id, !user.isActive);
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Có lỗi xảy ra';
      alert(message);
    } finally {
      setActionLoading(null);
    }
  };

  // Unlock user
  const handleUnlock = async (user: User) => {
    setActionLoading(user.id);
    try {
      await adminUserApi.unlock(user.id);
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Có lỗi xảy ra';
      alert(message);
    } finally {
      setActionLoading(null);
    }
  };

  // Delete user
  const handleDelete = async () => {
    if (!deletingUser) return;

    setDeleting(true);
    try {
      await adminUserApi.delete(deletingUser.id);
      setShowDeleteModal(false);
      setDeletingUser(null);
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không thể xóa người dùng';
      alert(message);
    } finally {
      setDeleting(false);
    }
  };

  // Format date
  const formatDate = (date: Date | string | null) => {
    if (!date) return t.neverLogin;
    return new Date(date).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Check if user is locked
  const isLocked = (user: User) => user.lockedUntil && new Date(user.lockedUntil) > new Date();

  // Get role color
  const getRoleColor = (roleName: string | undefined) => {
    if (!roleName) return 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400';
    const name = roleName.toUpperCase();
    if (name === 'SUPER_ADMIN') return 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400';
    if (name === 'ADMIN') return 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400';
    return 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic">{t.title}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{t.subtitle}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 dark:bg-blue-500/10 p-5 rounded-2xl border border-blue-100 dark:border-blue-500/20 flex items-center gap-4">
          <div className="p-3 bg-white dark:bg-slate-800 rounded-xl text-blue-500 shadow-sm">
            <Users size={24} />
          </div>
          <div>
            <p className="text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-widest">{t.totalUsers}</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">{stats.total}</h3>
          </div>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-500/10 p-5 rounded-2xl border border-emerald-100 dark:border-emerald-500/20 flex items-center gap-4">
          <div className="p-3 bg-white dark:bg-slate-800 rounded-xl text-emerald-500 shadow-sm">
            <UserCheck size={24} />
          </div>
          <div>
            <p className="text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest">{t.activeUsers}</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">{stats.active}</h3>
          </div>
        </div>
        <div className="bg-rose-50 dark:bg-rose-500/10 p-5 rounded-2xl border border-rose-100 dark:border-rose-500/20 flex items-center gap-4">
          <div className="p-3 bg-white dark:bg-slate-800 rounded-xl text-rose-500 shadow-sm">
            <UserX size={24} />
          </div>
          <div>
            <p className="text-rose-600 dark:text-rose-400 text-[10px] font-black uppercase tracking-widest">{t.inactive}</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">{stats.inactive}</h3>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px] max-w-md">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={t.search}
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPagination(prev => ({ ...prev, page: 1 }));
          }}
          className="px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 outline-none"
        >
          <option value="">{t.allRoles}</option>
          {roles.map((role) => (
            <option key={role.id} value={role.name}>{role.name}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPagination(prev => ({ ...prev, page: 1 }));
          }}
          className="px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 outline-none"
        >
          <option value="">{t.allStatus}</option>
          <option value="active">{t.active}</option>
          <option value="inactive">{t.inactive}</option>
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="text-rose-500 shrink-0" size={20} />
          <p className="text-rose-700 dark:text-rose-400 text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-rose-500" />
            <span className="ml-3 text-slate-500 font-medium">{t.loadingText}</span>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-20">
            <Users size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
            <p className="text-slate-500 dark:text-slate-400 font-medium">{t.noUsers}</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-[10px] uppercase font-black tracking-widest border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-4">{t.name}</th>
                    <th className="px-6 py-4">{t.role}</th>
                    <th className="px-6 py-4">{t.status}</th>
                    <th className="px-6 py-4">{t.lastLogin}</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-rose-50/20 dark:hover:bg-rose-500/5 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                            {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 dark:text-white truncate">{user.name || 'N/A'}</p>
                            <p className="text-xs text-slate-400 truncate">{user.email}</p>
                            {user.phone && (
                              <p className="text-xs text-slate-400">{user.phone}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${getRoleColor(user.role?.name)}`}>
                          <Shield size={10} />
                          {user.role?.name || 'USER'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {isLocked(user) ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-100 dark:bg-rose-500/20 rounded-full text-[10px] font-black uppercase text-rose-700 dark:text-rose-400">
                            <Lock size={10} />
                            {t.locked}
                          </span>
                        ) : user.isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 dark:bg-emerald-500/20 rounded-full text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-400">
                            <UserCheck size={10} />
                            {t.active}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-700 rounded-full text-[10px] font-black uppercase text-slate-600 dark:text-slate-400">
                            <UserX size={10} />
                            {t.inactive}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={12} />
                          <span>{formatDate(user.lastLoginAt)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEdit(user)}
                            className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                            title={t.edit}
                          >
                            <Edit2 size={16} />
                          </button>
                          
                          {isLocked(user) && (
                            <button
                              onClick={() => handleUnlock(user)}
                              disabled={actionLoading === user.id}
                              className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-lg transition-colors disabled:opacity-50"
                              title={t.unlock}
                            >
                              {actionLoading === user.id ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : (
                                <Unlock size={16} />
                              )}
                            </button>
                          )}

                          <button
                            onClick={() => handleToggleStatus(user)}
                            disabled={actionLoading === user.id}
                            className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                              user.isActive 
                                ? 'text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10' 
                                : 'text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'
                            }`}
                            title={user.isActive ? t.deactivate : t.activate}
                          >
                            {actionLoading === user.id ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : user.isActive ? (
                              <UserX size={16} />
                            ) : (
                              <UserCheck size={16} />
                            )}
                          </button>

                          <button
                            onClick={() => {
                              setDeletingUser(user);
                              setShowDeleteModal(true);
                            }}
                            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors"
                            title={t.delete}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="p-4 border-t border-slate-100 dark:border-slate-800">
                <Pagination
                  currentPage={pagination.page}
                  totalPages={pagination.pages}
                  totalItems={pagination.total}
                  itemsPerPage={pagination.limit}
                  onPageChange={(page) => setPagination(prev => ({ ...prev, page }))}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Edit Modal */}
      {showModal && editingUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-900 dark:text-white">{t.edit}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Messages */}
              {formError && (
                <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl p-4 flex items-center gap-3">
                  <AlertCircle className="text-rose-500 shrink-0" size={20} />
                  <p className="text-rose-700 dark:text-rose-400 text-sm font-medium">{formError}</p>
                </div>
              )}
              {successMessage && (
                <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl p-4 flex items-center gap-3">
                  <CheckCircle className="text-emerald-500 shrink-0" size={20} />
                  <p className="text-emerald-700 dark:text-emerald-400 text-sm font-medium">{successMessage}</p>
                </div>
              )}

              {/* Email (readonly) */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t.email}</label>
                <div className="flex items-center gap-2 px-4 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-500">
                  <Mail size={16} />
                  <span className="font-medium">{editingUser.email}</span>
                </div>
              </div>

              {/* Name */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t.name}</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder={t.namePlaceholder}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 dark:text-slate-200 font-medium"
                />
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t.phone}</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder={t.phonePlaceholder}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 dark:text-slate-200 font-medium"
                />
              </div>

              {/* Role */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t.role}</label>
                <select
                  value={formData.roleId}
                  onChange={(e) => setFormData(prev => ({ ...prev, roleId: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-rose-500/20 dark:text-slate-200 font-medium"
                >
                  <option value="">{t.selectRole}</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                  ))}
                </select>
              </div>

              {/* Active Toggle */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t.status}</label>
                <div 
                  onClick={() => setFormData(prev => ({ ...prev, isActive: !prev.isActive }))}
                  className={`p-4 rounded-xl cursor-pointer border-2 transition-all ${
                    formData.isActive 
                      ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/30' 
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-6 rounded-full p-1 transition-colors ${
                      formData.isActive ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                    }`}>
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        formData.isActive ? 'translate-x-4' : 'translate-x-0'
                      }`} />
                    </div>
                    <span className={`text-sm font-bold ${
                      formData.isActive 
                        ? 'text-emerald-700 dark:text-emerald-400' 
                        : 'text-slate-600 dark:text-slate-400'
                    }`}>
                      {formData.isActive ? t.active : t.inactive}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 text-sm font-bold text-white bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 rounded-xl flex items-center gap-2"
                >
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  {saving ? t.saving : t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center">
                <AlertCircle size={32} className="text-rose-500" />
              </div>
              <h3 className="text-xl font-black text-center text-slate-900 dark:text-white mb-2">{t.confirmDelete}</h3>
              <p className="text-center text-slate-500 dark:text-slate-400 mb-2">
                {deletingUser.email}
              </p>
              <p className="text-center text-sm text-slate-500 dark:text-slate-400">
                {t.deleteWarning}
              </p>
            </div>
            <div className="flex gap-3 p-6 pt-0">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingUser(null);
                }}
                className="flex-1 px-4 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 rounded-xl flex items-center justify-center gap-2"
              >
                {deleting && <Loader2 size={16} className="animate-spin" />}
                {t.delete}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
