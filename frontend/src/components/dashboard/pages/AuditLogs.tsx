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

      const params: {
        page: number;
        limit: number;
        action?: string;
        severity?: string;
        resource?: string;
        startDate?: string;
        endDate?: string;
      } = {
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

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

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
                {(log.oldValue !== null || log.newValue !== null) && (
                  <div className="grid grid-cols-2 gap-4 mt-2 text-xs">
                    {log.oldValue !== null && (
                      <div>
                        <p className="text-slate-500 dark:text-slate-400 font-semibold mb-1">
                          Giá trị cũ:
                        </p>
                        <pre className="p-2 bg-slate-100 dark:bg-slate-800 rounded overflow-x-auto text-slate-900 dark:text-slate-100">
                          {typeof log.oldValue === 'object' 
                            ? JSON.stringify(log.oldValue, null, 2)
                            : String(log.oldValue)}
                        </pre>
                      </div>
                    )}
                    {log.newValue !== null && (
                      <div>
                        <p className="text-slate-500 dark:text-slate-400 font-semibold mb-1">
                          Giá trị mới:
                        </p>
                        <pre className="p-2 bg-slate-100 dark:bg-slate-800 rounded overflow-x-auto text-slate-900 dark:text-slate-100">
                          {typeof log.newValue === 'object'
                            ? JSON.stringify(log.newValue, null, 2)
                            : String(log.newValue)}
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
