'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Plus, Edit2, Trash2, Loader2, AlertCircle, X, 
  Shield, CheckCircle, Users, Key, Check
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
  };
}

interface FormData {
  name: string;
  description: string;
  permissionIds: number[];
}

// Resource labels
const RESOURCE_LABELS: Record<string, { en: string; vi: string }> = {
  users: { en: 'Users', vi: 'Người dùng' },
  products: { en: 'Products', vi: 'Sản phẩm' },
  orders: { en: 'Orders', vi: 'Đơn hàng' },
  settings: { en: 'Settings', vi: 'Cài đặt' },
  categories: { en: 'Categories', vi: 'Danh mục' },
  posts: { en: 'Posts', vi: 'Bài viết' },
  media: { en: 'Media', vi: 'Media' },
  coupons: { en: 'Coupons', vi: 'Voucher' },
  reviews: { en: 'Reviews', vi: 'Đánh giá' },
  roles: { en: 'Roles', vi: 'Vai trò' },
};

// Action labels
const ACTION_LABELS: Record<string, { en: string; vi: string }> = {
  read: { en: 'View', vi: 'Xem' },
  write: { en: 'Edit', vi: 'Sửa' },
  delete: { en: 'Delete', vi: 'Xóa' },
};

const Roles: React.FC = () => {
  const { language } = useLanguage();
  
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState<FormData>({ name: '', description: '', permissionIds: [] });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const t = {
    title: language === 'vi' ? 'Phân quyền' : 'Roles & Permissions',
    addRole: language === 'vi' ? 'Thêm vai trò' : 'Add Role',
    editRole: language === 'vi' ? 'Sửa vai trò' : 'Edit Role',
    roleName: language === 'vi' ? 'Tên vai trò' : 'Role Name',
    description: language === 'vi' ? 'Mô tả' : 'Description',
    permissions: language === 'vi' ? 'Phân quyền' : 'Permissions',
    save: language === 'vi' ? 'Lưu' : 'Save',
    cancel: language === 'vi' ? 'Hủy' : 'Cancel',
    selectAll: language === 'vi' ? 'Chọn tất cả' : 'Select All',
    resource: language === 'vi' ? 'Tài nguyên' : 'Resource',
  };

  // Parse permissions vào map: { resource: { action: permissionId } }
  const permissionMap = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    permissions.forEach(p => {
      const [resource, action] = p.name.split('.');
      if (!map[resource]) map[resource] = {};
      map[resource][action] = p.id;
    });
    return map;
  }, [permissions]);

  // Lấy danh sách resources và actions từ permissions
  const resources = useMemo(() => [...new Set(permissions.map(p => p.name.split('.')[0]))], [permissions]);
  const actions = useMemo(() => [...new Set(permissions.map(p => p.name.split('.')[1]))], [permissions]);

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [rolesRes, permsRes] = await Promise.all([
        api.get<{ success: boolean; data: Role[] }>('/roles'),
        api.get<{ success: boolean; data: Permission[] }>('/permissions'),
      ]);
      if (rolesRes.success) setRoles(rolesRes.data);
      if (permsRes.success) setPermissions(permsRes.data);
    } catch {
      setError(language === 'vi' ? 'Không thể tải dữ liệu' : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [language]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Toggle permission
  const togglePerm = (permId: number) => {
    setFormData(prev => ({
      ...prev,
      permissionIds: prev.permissionIds.includes(permId)
        ? prev.permissionIds.filter(id => id !== permId)
        : [...prev.permissionIds, permId]
    }));
  };

  // Toggle row (all actions for a resource)
  const toggleRow = (resource: string) => {
    const rowPermIds = actions.map(a => permissionMap[resource]?.[a]).filter(Boolean) as number[];
    const allSelected = rowPermIds.every(id => formData.permissionIds.includes(id));
    setFormData(prev => ({
      ...prev,
      permissionIds: allSelected
        ? prev.permissionIds.filter(id => !rowPermIds.includes(id))
        : [...new Set([...prev.permissionIds, ...rowPermIds])]
    }));
  };

  // Toggle column (one action for all resources)
  const toggleCol = (action: string) => {
    const colPermIds = resources.map(r => permissionMap[r]?.[action]).filter(Boolean) as number[];
    const allSelected = colPermIds.every(id => formData.permissionIds.includes(id));
    setFormData(prev => ({
      ...prev,
      permissionIds: allSelected
        ? prev.permissionIds.filter(id => !colPermIds.includes(id))
        : [...new Set([...prev.permissionIds, ...colPermIds])]
    }));
  };

  // Toggle all
  const toggleAll = () => {
    const allIds = permissions.map(p => p.id);
    const allSelected = allIds.every(id => formData.permissionIds.includes(id));
    setFormData(prev => ({ ...prev, permissionIds: allSelected ? [] : allIds }));
  };

  // Check states
  const isRowSelected = (resource: string) => {
    const ids = actions.map(a => permissionMap[resource]?.[a]).filter(Boolean) as number[];
    return ids.length > 0 && ids.every(id => formData.permissionIds.includes(id));
  };

  const isColSelected = (action: string) => {
    const ids = resources.map(r => permissionMap[r]?.[action]).filter(Boolean) as number[];
    return ids.length > 0 && ids.every(id => formData.permissionIds.includes(id));
  };

  const isAllSelected = () => permissions.length > 0 && permissions.every(p => formData.permissionIds.includes(p.id));

  // Open modals
  const openCreate = () => {
    setEditingRole(null);
    setFormData({ name: '', description: '', permissionIds: [] });
    setFormError(null);
    setShowModal(true);
  };

  const openEdit = (role: Role) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description || '',
      permissionIds: role.permissions.map(p => p.id),
    });
    setFormError(null);
    setShowModal(true);
  };

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError(language === 'vi' ? 'Vui lòng nhập tên' : 'Please enter name');
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
      setShowModal(false);
      fetchData();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  // Delete
  const handleDelete = async (id: number) => {
    if (!confirm(language === 'vi' ? 'Xác nhận xóa vai trò này?' : 'Delete this role?')) return;
    setDeletingId(id);
    try {
      await api.delete(`/roles/${id}`);
      fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error');
    } finally {
      setDeletingId(null);
    }
  };

  // Role color
  const getRoleColor = (name: string) => {
    if (name === 'SUPER_ADMIN') return 'bg-purple-500';
    if (name === 'ADMIN') return 'bg-blue-500';
    return 'bg-slate-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t.title}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {roles.length} {language === 'vi' ? 'vai trò' : 'roles'} · {permissions.length} {language === 'vi' ? 'quyền' : 'permissions'}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg text-sm font-medium hover:opacity-90 transition"
        >
          <Plus size={18} />
          {t.addRole}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-500/10 text-red-600 rounded-lg text-sm">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* Roles List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {roles.map(role => (
          <div key={role.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className={`${getRoleColor(role.name)} px-4 py-3 flex items-center gap-3`}>
              <Shield className="text-white" size={20} />
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-white truncate">{role.name}</h3>
                {role.description && <p className="text-white/70 text-xs truncate">{role.description}</p>}
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Users size={14} />
                  <span>{role._count?.users || 0}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Key size={14} />
                  <span>{role.permissions.length}</span>
                </div>
              </div>
              <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                <button
                  onClick={() => openEdit(role)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition"
                >
                  <Edit2 size={14} />
                  {language === 'vi' ? 'Sửa' : 'Edit'}
                </button>
                <button
                  onClick={() => handleDelete(role.id)}
                  disabled={deletingId === role.id || (role._count?.users || 0) > 0}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {deletingId === role.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  {language === 'vi' ? 'Xóa' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingRole ? t.editRole : t.addRole}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              {formError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-500/10 text-red-600 rounded-lg text-sm">
                  <AlertCircle size={16} />
                  {formError}
                </div>
              )}

              {/* Name & Description */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t.roleName} *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value.toUpperCase() }))}
                    placeholder="VD: ADMIN, EDITOR..."
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t.description}</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder={language === 'vi' ? 'Mô tả ngắn...' : 'Short description...'}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>

              {/* Permission Matrix */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t.permissions}</label>
                  <span className="text-xs text-slate-500">
                    {formData.permissionIds.length}/{permissions.length}
                  </span>
                </div>

                <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800">
                        {/* Corner: Select All */}
                        <th className="p-3 text-left border-b border-r border-slate-200 dark:border-slate-700">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isAllSelected()}
                              onChange={toggleAll}
                              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="font-medium text-slate-600 dark:text-slate-400">{t.resource}</span>
                          </label>
                        </th>
                        {/* Action headers */}
                        {actions.map(action => (
                          <th key={action} className={`p-3 text-center border-b border-slate-200 dark:border-slate-700 min-w-[80px] ${action === 'delete' ? 'bg-red-50 dark:bg-red-500/5' : ''}`}>
                            <label className="flex flex-col items-center gap-1 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={isColSelected(action)}
                                onChange={() => toggleCol(action)}
                                className={`w-4 h-4 rounded border-slate-300 focus:ring-blue-500 ${action === 'delete' ? 'text-red-600' : 'text-blue-600'}`}
                              />
                              <span className={`font-medium ${action === 'delete' ? 'text-red-600 dark:text-red-400' : 'text-slate-600 dark:text-slate-400'}`}>
                                {ACTION_LABELS[action]?.[language] || action}
                              </span>
                            </label>
                          </th>
                        ))}
                        {/* All column */}
                        <th className="p-3 text-center border-b border-slate-200 dark:border-slate-700 bg-emerald-50 dark:bg-emerald-500/5 min-w-[80px]">
                          <span className="font-medium text-emerald-600 dark:text-emerald-400">Full</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {resources.map((resource, idx) => {
                        const isLast = idx === resources.length - 1;
                        return (
                          <tr key={resource} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            {/* Resource name */}
                            <td className={`p-3 border-r border-slate-200 dark:border-slate-700 ${!isLast ? 'border-b' : ''}`}>
                              <span className="font-medium text-slate-700 dark:text-slate-300">
                                {RESOURCE_LABELS[resource]?.[language] || resource}
                              </span>
                            </td>
                            {/* Action checkboxes */}
                            {actions.map(action => {
                              const permId = permissionMap[resource]?.[action];
                              const checked = permId ? formData.permissionIds.includes(permId) : false;
                              return (
                                <td key={action} className={`p-3 text-center ${!isLast ? 'border-b border-slate-200 dark:border-slate-700' : ''} ${action === 'delete' ? 'bg-red-50/50 dark:bg-red-500/5' : ''}`}>
                                  {permId ? (
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => togglePerm(permId)}
                                      className={`w-4 h-4 rounded border-slate-300 focus:ring-blue-500 cursor-pointer ${action === 'delete' ? 'text-red-600' : 'text-blue-600'}`}
                                    />
                                  ) : (
                                    <span className="text-slate-300 dark:text-slate-600">—</span>
                                  )}
                                </td>
                              );
                            })}
                            {/* Full row toggle */}
                            <td className={`p-3 text-center bg-emerald-50/50 dark:bg-emerald-500/5 ${!isLast ? 'border-b border-slate-200 dark:border-slate-700' : ''}`}>
                              <input
                                type="checkbox"
                                checked={isRowSelected(resource)}
                                onChange={() => toggleRow(resource)}
                                className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-blue-600"></span>
                    {language === 'vi' ? 'Xem/Sửa' : 'View/Edit'}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-red-600"></span>
                    {language === 'vi' ? 'Xóa (nguy hiểm)' : 'Delete (danger)'}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-emerald-600"></span>
                    {language === 'vi' ? 'Full quyền' : 'Full access'}
                  </span>
                </div>
              </div>
            </form>

            {/* Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                {t.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Roles;
