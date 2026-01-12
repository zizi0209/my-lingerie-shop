'use client';

import React, { useState, useEffect } from 'react';
import { adminAuditLogApi, AuditLog } from '@/lib/adminApi';
import {
  Shield, UserCog, Package, ShoppingCart, Settings, Trash2,
  Edit3, CheckCircle, XCircle, AlertCircle, Clock, Wallet,
  ChevronDown, ChevronUp, Filter, RefreshCw, Search
} from 'lucide-react';

// Action config với label và icon
const ACTION_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  // User Management
  UPDATE_USER_ROLE: { label: 'Thay đổi quyền người dùng', icon: UserCog, color: 'text-purple-600 bg-purple-100 dark:bg-purple-500/20' },
  ACTIVATE_USER: { label: 'Kích hoạt tài khoản', icon: CheckCircle, color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-500/20' },
  DEACTIVATE_USER: { label: 'Vô hiệu hóa tài khoản', icon: XCircle, color: 'text-red-600 bg-red-100 dark:bg-red-500/20' },
  UNLOCK_USER_ACCOUNT: { label: 'Mở khóa tài khoản', icon: CheckCircle, color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-500/20' },
  DELETE_USER: { label: 'Xóa người dùng', icon: Trash2, color: 'text-red-600 bg-red-100 dark:bg-red-500/20' },
  CHANGE_ROLE: { label: 'Thay đổi vai trò', icon: UserCog, color: 'text-purple-600 bg-purple-100 dark:bg-purple-500/20' },
  
  // Product Management
  CREATE_PRODUCT: { label: 'Tạo sản phẩm', icon: Package, color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-500/20' },
  UPDATE_PRODUCT: { label: 'Cập nhật sản phẩm', icon: Edit3, color: 'text-blue-600 bg-blue-100 dark:bg-blue-500/20' },
  DELETE_PRODUCT: { label: 'Xóa sản phẩm', icon: Trash2, color: 'text-red-600 bg-red-100 dark:bg-red-500/20' },
  UPDATE_PRODUCT_PRICE: { label: 'Thay đổi giá sản phẩm', icon: Wallet, color: 'text-amber-600 bg-amber-100 dark:bg-amber-500/20' },
  UPDATE_PRODUCT_STOCK: { label: 'Cập nhật tồn kho', icon: Package, color: 'text-blue-600 bg-blue-100 dark:bg-blue-500/20' },
  
  // Order Management
  UPDATE_ORDER_STATUS: { label: 'Cập nhật trạng thái đơn hàng', icon: ShoppingCart, color: 'text-blue-600 bg-blue-100 dark:bg-blue-500/20' },
  CANCEL_ORDER: { label: 'Hủy đơn hàng', icon: XCircle, color: 'text-red-600 bg-red-100 dark:bg-red-500/20' },
  REFUND_ORDER: { label: 'Hoàn tiền đơn hàng', icon: Wallet, color: 'text-amber-600 bg-amber-100 dark:bg-amber-500/20' },
  
  // Category
  CREATE_CATEGORY: { label: 'Tạo danh mục', icon: Package, color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-500/20' },
  UPDATE_CATEGORY: { label: 'Cập nhật danh mục', icon: Edit3, color: 'text-blue-600 bg-blue-100 dark:bg-blue-500/20' },
  DELETE_CATEGORY: { label: 'Xóa danh mục', icon: Trash2, color: 'text-red-600 bg-red-100 dark:bg-red-500/20' },
  
  // System Config
  UPDATE_SYSTEM_CONFIG: { label: 'Thay đổi cấu hình hệ thống', icon: Settings, color: 'text-slate-600 bg-slate-100 dark:bg-slate-700' },
  DELETE_SYSTEM_CONFIG: { label: 'Xóa cấu hình', icon: Trash2, color: 'text-red-600 bg-red-100 dark:bg-red-500/20' },
  UPDATE_SETTINGS: { label: 'Cập nhật cài đặt', icon: Settings, color: 'text-slate-600 bg-slate-100 dark:bg-slate-700' },
  
  // Security
  LOGIN_FAILED: { label: 'Đăng nhập thất bại', icon: AlertCircle, color: 'text-red-600 bg-red-100 dark:bg-red-500/20' },
  LOGIN_SUCCESS: { label: 'Đăng nhập thành công', icon: CheckCircle, color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-500/20' },
  DASHBOARD_AUTH_FAILED: { label: 'Xác thực Dashboard thất bại', icon: AlertCircle, color: 'text-red-600 bg-red-100 dark:bg-red-500/20' },
  DASHBOARD_AUTH_SUCCESS: { label: 'Xác thực Dashboard thành công', icon: Shield, color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-500/20' },
  PASSWORD_CHANGE: { label: 'Đổi mật khẩu', icon: Shield, color: 'text-amber-600 bg-amber-100 dark:bg-amber-500/20' },
  UPDATE_PERMISSIONS: { label: 'Cập nhật quyền hạn', icon: UserCog, color: 'text-purple-600 bg-purple-100 dark:bg-purple-500/20' },
  LOGOUT_ALL: { label: 'Đăng xuất tất cả thiết bị', icon: Shield, color: 'text-amber-600 bg-amber-100 dark:bg-amber-500/20' },
  
  // Generic
  UPDATE: { label: 'Cập nhật', icon: Edit3, color: 'text-blue-600 bg-blue-100 dark:bg-blue-500/20' },
  CREATE: { label: 'Tạo mới', icon: Package, color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-500/20' },
  DELETE: { label: 'Xóa', icon: Trash2, color: 'text-red-600 bg-red-100 dark:bg-red-500/20' },
};

const getActionConfig = (action: string) => {
  return ACTION_CONFIG[action] || { 
    label: action.replace(/_/g, ' ').toLowerCase(), 
    icon: AlertCircle, 
    color: 'text-slate-600 bg-slate-100 dark:bg-slate-700' 
  };
};

interface AdminUser {
  id: number;
  name: string | null;
  email: string;
  role: { name: string } | null;
}

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 30,
    total: 0,
    pages: 0,
  });

  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [adminFilter, setAdminFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Available filters
  const [availableActions, setAvailableActions] = useState<string[]>([]);
  const [availableAdmins, setAvailableAdmins] = useState<AdminUser[]>([]);

  // Load filters
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const [actionsRes, adminsRes] = await Promise.all([
          adminAuditLogApi.getActions(),
          adminAuditLogApi.getAdmins(),
        ]);
        setAvailableActions(actionsRes.data);
        setAvailableAdmins(adminsRes.data);
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

      const params: {
        page: number;
        limit: number;
        action?: string;
        severity?: string;
        userId?: number;
        startDate?: string;
        endDate?: string;
      } = {
        page: pagination.page,
        limit: pagination.limit,
      };

      if (actionFilter) params.action = actionFilter;
      if (severityFilter) params.severity = severityFilter;
      if (adminFilter) params.userId = parseInt(adminFilter);
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await adminAuditLogApi.list(params);
      setLogs(response.data);
      setPagination(response.pagination);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Lỗi khi tải audit logs';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, actionFilter, severityFilter, adminFilter, startDate, endDate]);

  const toggleExpand = (id: string) => {
    setExpandedLogs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const clearFilters = () => {
    setActionFilter('');
    setSeverityFilter('');
    setAdminFilter('');
    setStartDate('');
    setEndDate('');
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Severity badge
  const getSeverityBadge = (severity: string) => {
    const configs: Record<string, { bg: string; text: string; icon: React.ElementType }> = {
      CRITICAL: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', icon: AlertCircle },
      WARNING: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', icon: AlertCircle },
      INFO: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', icon: CheckCircle },
    };
    const config = configs[severity] || configs.INFO;
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${config.bg} ${config.text}`}>
        <Icon size={12} />
        {severity}
      </span>
    );
  };

  // Format date relative
  const formatDate = (date: Date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    if (days < 7) return `${days} ngày trước`;
    
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get role label
  const getRoleLabel = (roleName: string | undefined) => {
    const labels: Record<string, string> = {
      SUPER_ADMIN: 'Super Admin',
      ADMIN: 'Admin',
      MOD: 'Mod',
      STAFF: 'Staff',
    };
    return labels[roleName || ''] || roleName || 'Unknown';
  };

  if (loading && logs.length === 0) {
    return (
      <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-24 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const hasActiveFilters = actionFilter || severityFilter || adminFilter || startDate || endDate;

  return (
    <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Shield className="text-primary-500" size={28} />
            Nhật ký hệ thống
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Theo dõi các thay đổi quan trọng từ Admin/Mod
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadLogs()}
            className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title="Làm mới"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              showFilters || hasActiveFilters
                ? 'bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-400'
                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            <Filter size={18} />
            Bộ lọc
            {hasActiveFilters && (
              <span className="w-2 h-2 bg-primary-500 rounded-full"></span>
            )}
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Hành động
              </label>
              <select
                value={actionFilter}
                onChange={(e) => { setActionFilter(e.target.value); setPagination(p => ({...p, page: 1})); }}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
              >
                <option value="">Tất cả</option>
                {availableActions.map((action) => (
                  <option key={action} value={action}>
                    {getActionConfig(action).label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Mức độ
              </label>
              <select
                value={severityFilter}
                onChange={(e) => { setSeverityFilter(e.target.value); setPagination(p => ({...p, page: 1})); }}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
              >
                <option value="">Tất cả</option>
                <option value="CRITICAL">🔴 Critical</option>
                <option value="WARNING">🟡 Warning</option>
                <option value="INFO">🔵 Info</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Người thực hiện
              </label>
              <select
                value={adminFilter}
                onChange={(e) => { setAdminFilter(e.target.value); setPagination(p => ({...p, page: 1})); }}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
              >
                <option value="">Tất cả Admin</option>
                {availableAdmins.map((admin) => (
                  <option key={admin.id} value={admin.id}>
                    {admin.name || admin.email} ({getRoleLabel(admin.role?.name)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Từ ngày
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setPagination(p => ({...p, page: 1})); }}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Đến ngày
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPagination(p => ({...p, page: 1})); }}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
              />
            </div>
          </div>
          
          {hasActiveFilters && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={clearFilters}
                className="text-sm text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400"
              >
                Xóa bộ lọc
              </button>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Stats Summary */}
      <div className="mb-4 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
        <span>
          Hiển thị {logs.length} / {pagination.total} bản ghi
        </span>
      </div>

      {/* Logs List */}
      <div className="space-y-3 mb-6">
        {logs.map((log) => {
          const actionConfig = getActionConfig(log.action);
          const ActionIcon = actionConfig.icon;
          const isExpanded = expandedLogs.has(log.id);
          const hasDetails = log.oldValue !== null || log.newValue !== null;
          const userRole = (log.user as unknown as { role?: { name: string } })?.role?.name;

          return (
            <div
              key={log.id}
              className={`border rounded-xl transition-all ${
                log.severity === 'CRITICAL' 
                  ? 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10' 
                  : log.severity === 'WARNING'
                    ? 'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50'
              }`}
            >
              <div 
                className={`p-4 ${hasDetails ? 'cursor-pointer' : ''}`}
                onClick={() => hasDetails && toggleExpand(log.id)}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`p-2.5 rounded-xl ${actionConfig.color}`}>
                    <ActionIcon size={20} />
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {actionConfig.label}
                      </span>
                      {getSeverityBadge(log.severity)}
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <span className="font-medium text-primary-600 dark:text-primary-400">
                        {getRoleLabel(userRole)} {log.user.name || log.user.email?.split('@')[0]}
                      </span>
                      {log.resource && (
                        <>
                          <span>•</span>
                          <span>{log.resource}</span>
                          {log.resourceId && <span className="text-slate-400">#{log.resourceId}</span>}
                        </>
                      )}
                    </div>

                    {log.ipAddress && (
                      <p className="text-xs text-slate-500 mt-1">
                        IP: <code className="text-slate-600 dark:text-slate-400">{log.ipAddress}</code>
                      </p>
                    )}
                  </div>

                  {/* Time & Expand */}
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Clock size={14} />
                        {formatDate(log.createdAt)}
                      </p>
                    </div>
                    {hasDetails && (
                      <button className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && hasDetails && (
                <div className="px-4 pb-4 pt-0 border-t border-slate-100 dark:border-slate-700">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    {log.oldValue !== null && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">
                          Giá trị cũ
                        </p>
                        <pre className="p-3 bg-slate-100 dark:bg-slate-900 rounded-lg overflow-x-auto text-xs text-slate-700 dark:text-slate-300 max-h-48">
                          {typeof log.oldValue === 'object' 
                            ? JSON.stringify(log.oldValue, null, 2)
                            : String(log.oldValue)}
                        </pre>
                      </div>
                    )}
                    {log.newValue !== null && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">
                          Giá trị mới
                        </p>
                        <pre className="p-3 bg-slate-100 dark:bg-slate-900 rounded-lg overflow-x-auto text-xs text-slate-700 dark:text-slate-300 max-h-48">
                          {typeof log.newValue === 'object'
                            ? JSON.stringify(log.newValue, null, 2)
                            : String(log.newValue)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {logs.length === 0 && !loading && (
        <div className="text-center py-16 text-slate-500 dark:text-slate-400">
          <Search size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg font-semibold">Không tìm thấy bản ghi</p>
          <p className="mt-2">Thử điều chỉnh bộ lọc hoặc xem lại khoảng thời gian</p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="mt-4 px-4 py-2 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      )}

      {/* Pagination */}
      {logs.length > 0 && (
        <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Trang {pagination.page} / {pagination.pages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
              disabled={pagination.page === 1 || loading}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Trước
            </button>
            <button
              onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
              disabled={pagination.page >= pagination.pages || loading}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Sau
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
