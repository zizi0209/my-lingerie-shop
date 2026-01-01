'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, Edit2, Trash2, Loader2, AlertCircle, X, 
  Shield, CheckCircle, Users, Key
} from 'lucide-react';
import { api } from '@/lib/api';
import { useLanguage } from '../components/LanguageContext';

interface Permission {
  id: number;
  name: string;
  description: string | null;
}

interface Role {
  id: number;
  name: string;
  description: string | null;
  permissions: Permission[];
  _count?: {
    users: number;
    permissions?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface FormData {
  name: string;
  description: string;
  permissionIds: number[];
}

const initialFormData: FormData = {
  name: '',
  description: '',
  permissionIds: [],
};

const Roles: React.FC = () => {
  const { language } = useLanguage();
  
  // List states
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Delete states
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Translations
  const t = {
    title: language === 'vi' ? 'Vai trò & Quyền hạn' : 'Roles & Permissions',
    subtitle: language === 'vi' ? 'Quản lý vai trò và phân quyền người dùng' : 'Manage roles and user permissions',
    addNew: language === 'vi' ? 'Thêm vai trò' : 'Add Role',
    edit: language === 'vi' ? 'Sửa vai trò' : 'Edit Role',
    name: language === 'vi' ? 'Tên vai trò' : 'Role Name',
    description: language === 'vi' ? 'Mô tả' : 'Description',
    permissions: language === 'vi' ? 'Quyền hạn' : 'Permissions',
    users: language === 'vi' ? 'Người dùng' : 'Users',
    save: language === 'vi' ? 'Lưu' : 'Save',
    cancel: language === 'vi' ? 'Hủy' : 'Cancel',
    saving: language === 'vi' ? 'Đang lưu...' : 'Saving...',
    confirmDelete: language === 'vi' ? 'Bạn có chắc chắn muốn xóa vai trò này?' : 'Are you sure you want to delete this role?',
    loadError: language === 'vi' ? 'Không thể tải danh sách vai trò' : 'Cannot load roles',
    loadingText: language === 'vi' ? 'Đang tải...' : 'Loading...',
    noRoles: language === 'vi' ? 'Chưa có vai trò nào' : 'No roles found',
    saveSuccess: language === 'vi' ? 'Lưu thành công!' : 'Saved successfully!',
    namePlaceholder: language === 'vi' ? 'Ví dụ: ADMIN' : 'Example: ADMIN',
    descPlaceholder: language === 'vi' ? 'Mô tả vai trò...' : 'Role description...',
    selectPermissions: language === 'vi' ? 'Chọn quyền hạn' : 'Select Permissions',
    noPermissions: language === 'vi' ? 'Chưa có quyền nào' : 'No permissions',
    cannotDelete: language === 'vi' ? 'Không thể xóa vì còn người dùng' : 'Cannot delete: has users',
    totalRoles: language === 'vi' ? 'Tổng vai trò' : 'Total Roles',
    totalPermissions: language === 'vi' ? 'Tổng quyền hạn' : 'Total Permissions',
  };

  // Role colors
  const getRoleColor = (roleName: string) => {
    const name = roleName.toUpperCase();
    if (name === 'SUPER_ADMIN') return 'from-purple-500 to-pink-500';
    if (name === 'ADMIN') return 'from-blue-500 to-cyan-500';
    if (name === 'MODERATOR') return 'from-emerald-500 to-teal-500';
    return 'from-slate-500 to-slate-600';
  };

  // Fetch roles
  const fetchRoles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get<{ success: boolean; data: Role[] }>('/roles');
      if (response.success) {
        setRoles(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch roles:', err);
      setError(t.loadError);
    } finally {
      setLoading(false);
    }
  }, [t.loadError]);

  // Fetch permissions
  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const response = await api.get<{ success: boolean; data: Permission[] }>('/permissions');
        if (response.success) {
          setPermissions(response.data);
        }
      } catch (err) {
        console.error('Failed to fetch permissions:', err);
      }
    };
    fetchPermissions();
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles, refreshTrigger]);

  // Stats
  const stats = {
    totalRoles: roles.length,
    totalPermissions: permissions.length,
  };

  // Open create modal
  const handleOpenCreate = () => {
    setEditingRole(null);
    setFormData(initialFormData);
    setFormError(null);
    setSuccessMessage(null);
    setShowModal(true);
  };

  // Open edit modal
  const handleOpenEdit = (role: Role) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description || '',
      permissionIds: role.permissions.map(p => p.id),
    });
    setFormError(null);
    setSuccessMessage(null);
    setShowModal(true);
  };

  // Toggle permission
  const togglePermission = (permissionId: number) => {
    setFormData(prev => ({
      ...prev,
      permissionIds: prev.permissionIds.includes(permissionId)
        ? prev.permissionIds.filter(id => id !== permissionId)
        : [...prev.permissionIds, permissionId]
    }));
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    if (!formData.name?.trim()) {
      setFormError(language === 'vi' ? 'Vui lòng nhập tên vai trò' : 'Please enter role name');
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name: formData.name.trim().toUpperCase(),
        description: formData.description.trim() || null,
        permissionIds: formData.permissionIds,
      };

      if (editingRole) {
        await api.put(`/roles/${editingRole.id}`, payload);
      } else {
        await api.post('/roles', payload);
      }

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

  // Delete role
  const handleDelete = async (id: number) => {
    if (!confirm(t.confirmDelete)) return;

    setDeletingId(id);
    try {
      await api.delete(`/roles/${id}`);
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không thể xóa vai trò';
      alert(message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic">{t.title}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{t.subtitle}</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="bg-rose-500 hover:bg-rose-600 text-white px-6 py-2.5 rounded-xl font-black uppercase tracking-widest text-xs flex items-center gap-2 transition-all shadow-lg shadow-rose-200 dark:shadow-none"
        >
          <Plus size={18} />
          <span>{t.addNew}</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-blue-50 dark:bg-blue-500/10 p-5 rounded-2xl border border-blue-100 dark:border-blue-500/20 flex items-center gap-4">
          <div className="p-3 bg-white dark:bg-slate-800 rounded-xl text-blue-500 shadow-sm">
            <Shield size={24} />
          </div>
          <div>
            <p className="text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-widest">{t.totalRoles}</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">{stats.totalRoles}</h3>
          </div>
        </div>
        <div className="bg-purple-50 dark:bg-purple-500/10 p-5 rounded-2xl border border-purple-100 dark:border-purple-500/20 flex items-center gap-4">
          <div className="p-3 bg-white dark:bg-slate-800 rounded-xl text-purple-500 shadow-sm">
            <Key size={24} />
          </div>
          <div>
            <p className="text-purple-600 dark:text-purple-400 text-[10px] font-black uppercase tracking-widest">{t.totalPermissions}</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">{stats.totalPermissions}</h3>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="text-rose-500 shrink-0" size={20} />
          <p className="text-rose-700 dark:text-rose-400 text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Roles Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-rose-500" />
          <span className="ml-3 text-slate-500 font-medium">{t.loadingText}</span>
        </div>
      ) : roles.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800">
          <Shield size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
          <p className="text-slate-500 dark:text-slate-400 font-medium">{t.noRoles}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roles.map((role) => (
            <div 
              key={role.id} 
              className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-lg transition-all group"
            >
              {/* Header */}
              <div className={`bg-gradient-to-r ${getRoleColor(role.name)} p-6`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                      <Shield size={24} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white">{role.name}</h3>
                      <p className="text-white/70 text-xs">{role.description || '-'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-5 space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
                    <div className="flex items-center gap-2 text-slate-500 mb-1">
                      <Users size={14} />
                      <span className="text-[10px] font-black uppercase tracking-widest">{t.users}</span>
                    </div>
                    <p className="text-xl font-black text-slate-900 dark:text-white">{role._count?.users || 0}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
                    <div className="flex items-center gap-2 text-slate-500 mb-1">
                      <Key size={14} />
                      <span className="text-[10px] font-black uppercase tracking-widest">{t.permissions}</span>
                    </div>
                    <p className="text-xl font-black text-slate-900 dark:text-white">{role.permissions.length}</p>
                  </div>
                </div>

                {/* Permissions */}
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">{t.permissions}</p>
                  {role.permissions.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {role.permissions.slice(0, 5).map((perm) => (
                        <span 
                          key={perm.id} 
                          className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-bold text-slate-600 dark:text-slate-400"
                        >
                          {perm.name}
                        </span>
                      ))}
                      {role.permissions.length > 5 && (
                        <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-bold text-slate-600 dark:text-slate-400">
                          +{role.permissions.length - 5}
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">{t.noPermissions}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => handleOpenEdit(role)}
                    className="flex-1 py-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Edit2 size={14} />
                    {t.edit}
                  </button>
                  <button
                    onClick={() => handleDelete(role.id)}
                    disabled={deletingId === role.id || (role._count?.users || 0) > 0}
                    className="flex-1 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={(role._count?.users || 0) > 0 ? t.cannotDelete : ''}
                  >
                    {deletingId === role.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                    {language === 'vi' ? 'Xóa' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            <div className="border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                {editingRole ? t.edit : t.addNew}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
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

              {/* Name */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t.name} *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value.toUpperCase() }))}
                  placeholder={t.namePlaceholder}
                  required
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 dark:text-slate-200 font-bold uppercase"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t.description}</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder={t.descPlaceholder}
                  rows={2}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 dark:text-slate-200 font-medium resize-none"
                />
              </div>

              {/* Permissions */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t.selectPermissions}</label>
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 max-h-60 overflow-y-auto">
                  {permissions.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-4">{t.noPermissions}</p>
                  ) : (
                    <div className="space-y-2">
                      {permissions.map((permission) => (
                        <label 
                          key={permission.id}
                          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                            formData.permissionIds.includes(permission.id)
                              ? 'bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-300 dark:border-rose-500/30'
                              : 'bg-white dark:bg-slate-800 border-2 border-transparent hover:border-slate-200 dark:hover:border-slate-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={formData.permissionIds.includes(permission.id)}
                            onChange={() => togglePermission(permission.id)}
                            className="w-4 h-4 rounded border-slate-300 text-rose-500 focus:ring-rose-500"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm text-slate-900 dark:text-white">{permission.name}</p>
                            {permission.description && (
                              <p className="text-xs text-slate-400 truncate">{permission.description}</p>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                {formData.permissionIds.length > 0 && (
                  <p className="text-xs text-slate-500">
                    {language === 'vi' ? 'Đã chọn' : 'Selected'}: {formData.permissionIds.length} {t.permissions.toLowerCase()}
                  </p>
                )}
              </div>
            </form>

            {/* Footer */}
            <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-6 py-4 flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-6 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="px-6 py-2.5 text-sm font-bold text-white bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 rounded-xl flex items-center gap-2"
              >
                {saving && <Loader2 size={16} className="animate-spin" />}
                {saving ? t.saving : t.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Roles;
