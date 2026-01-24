 'use client';
 
 import React, { useState, useEffect, useCallback } from 'react';
 import { 
   Plus, Edit2, Trash2, Loader2, AlertCircle, X, 
   Users, Shield, Lock, Unlock, UserCheck, UserX, Mail, Phone, Calendar,
   Eye, Activity, CheckCircle
 } from 'lucide-react';
 import { adminUserApi, type User } from '@/lib/adminApi';
 import { api } from '@/lib/api';
 import SearchInput from '../components/SearchInput';
 import Pagination from '../components/Pagination';
 import { useLanguage } from '../components/LanguageContext';
import { useAuth } from '@/context/AuthContext';
 
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
 
 const Staff: React.FC = () => {
   const { language } = useLanguage();
  const { user: currentUser } = useAuth();
   
   // List states
   const [loading, setLoading] = useState(true);
   const [staff, setStaff] = useState<User[]>([]);
   const [roles, setRoles] = useState<Role[]>([]);
   const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
   const [searchQuery, setSearchQuery] = useState('');
   const [roleFilter, setRoleFilter] = useState<string>('');
   const [statusFilter, setStatusFilter] = useState<string>('');
   const [error, setError] = useState<string | null>(null);
   const [refreshTrigger, setRefreshTrigger] = useState(0);
 
   // Modal states
   const [showModal, setShowModal] = useState(false);
   const [editingStaff, setEditingStaff] = useState<User | null>(null);
   const [formData, setFormData] = useState<FormData>(initialFormData);
   const [saving, setSaving] = useState(false);
   const [formError, setFormError] = useState<string | null>(null);
   const [successMessage, setSuccessMessage] = useState<string | null>(null);
 
   // Delete modal
   const [showDeleteModal, setShowDeleteModal] = useState(false);
   const [deletingStaff, setDeletingStaff] = useState<User | null>(null);
   const [deleting, setDeleting] = useState(false);

   // Role Promotion modal (Enterprise: Single Identity Principle)
   const [showPromotionModal, setShowPromotionModal] = useState(false);
   const [promotionData, setPromotionData] = useState<{
     existingUser: User & { currentRole: string; currentRoleId: number };
     requestedRole: string;
     requestedRoleId: number;
   } | null>(null);
   const [promoting, setPromoting] = useState(false);

   // Actions
   const [actionLoading, setActionLoading] = useState<number | null>(null);
 
  // Permission helpers
  const isSuperAdmin = currentUser?.role?.name === 'SUPER_ADMIN';
  const currentUserRole = currentUser?.role?.name;
  
  // Helper: Get tooltip message for disabled actions
  const getDisabledTooltip = (targetUser: User, action: 'edit' | 'permission' | 'delete'): string | undefined => {
    const targetRole = targetUser.role?.name;
    const isSelf = targetUser.id === currentUser?.id;

    // Case: Trying to change own permissions (activate/deactivate self)
    if (isSelf && action === 'permission') {
      return language === 'vi'
        ? '⛔ Không thể thay đổi trạng thái tài khoản của chính mình'
        : '⛔ Cannot change your own account status';
    }

    // Case: Super Admin trying to modify another Super Admin
    if (isSuperAdmin && targetRole === 'SUPER_ADMIN' && !isSelf) {
      if (action === 'edit') {
        return language === 'vi'
          ? '🤝 Bạn không thể chỉnh sửa thông tin của SUPER ADMIN khác (Mutual Non-Interference)'
          : '🤝 You cannot edit another SUPER ADMIN (Mutual Non-Interference)';
      }
      if (action === 'permission') {
        return language === 'vi'
          ? '👁️ Bạn chỉ có quyền XEM (giám sát), không có quyền SỬA'
          : '👁️ You can only VIEW (surveillance), not MODIFY';
      }
      if (action === 'delete') {
        return language === 'vi'
          ? '🛡️ SUPER ADMIN không thể bị xóa (tài khoản được bảo vệ)'
          : '🛡️ SUPER ADMIN cannot be deleted (protected account)';
      }
    }

    // Case: Super Admin trying to delete themselves
    if (isSuperAdmin && isSelf && action === 'delete') {
      return language === 'vi'
        ? '⛔ Không thể tự xóa tài khoản của chính mình'
        : '⛔ Cannot delete your own account';
    }

    // Case: Super Admin is always protected from deletion
    if (targetRole === 'SUPER_ADMIN' && action === 'delete') {
      return language === 'vi'
        ? '🛡️ SUPER ADMIN không thể bị xóa (tài khoản được bảo vệ)'
        : '🛡️ SUPER ADMIN cannot be deleted (protected account)';
    }

    // Case: Regular admin trying to modify Super Admin
    if (!isSuperAdmin && targetRole === 'SUPER_ADMIN') {
      return language === 'vi'
        ? '⚠️ Bạn không có quyền thao tác với SUPER ADMIN'
        : '⚠️ You do not have permission to modify SUPER ADMIN';
    }

    return undefined;
  };
  
  // Check if current user can modify target user (Edit info only - name, email, phone)
  // Implements "Mutual Non-Interference" for SUPER_ADMIN peers
  const canModify = (targetUser: User): boolean => {
    const targetRole = targetUser.role?.name;
    const isSelf = targetUser.id === currentUser?.id;

    // Case 0: Regular admin/staff trying to modify SUPER_ADMIN
    // ❌ DENIED: Cannot touch higher authority
    if (!isSuperAdmin && targetRole === 'SUPER_ADMIN') {
      return false;
    }

    // Case 1: SUPER_ADMIN modifying another SUPER_ADMIN (not self)
    // ❌ DENIED: "Mutual Surveillance, Non-Interference" - prevent coup/sabotage
    if (isSuperAdmin && targetRole === 'SUPER_ADMIN' && !isSelf) {
      return false;
    }

    // Case 2: SUPER_ADMIN modifying self or lower roles
    // ✅ ALLOWED: Can manage self and subordinates
    if (isSuperAdmin) return true;

    // Case 3: Regular ADMIN trying to modify SUPER_ADMIN
    // (Already handled in Case 0)

    // Case 4: ADMIN modifying ADMIN/STAFF
    // ✅ ALLOWED: Peer-level management
    if (currentUserRole === 'ADMIN') return true;

    // Case 5: Other roles (STAFF, etc.)
    // ❌ DENIED: No management permissions
    return false;
  };

  // Check if current user can change permissions (Toggle Active/Deactivate)
  // Stricter than canModify - prevents self-deactivation
  const canChangePermissions = (targetUser: User): boolean => {
    const isSelf = targetUser.id === currentUser?.id;

    // ❌ CRITICAL: Cannot deactivate your own account (backend protection at line 602)
    if (isSelf) return false;

    // For others, use same logic as canModify
    return canModify(targetUser);
  };
  
  // Check if a user can be deleted
  // SUPER_ADMIN is ALWAYS protected (including from themselves)
  const canDelete = (targetUser: User): boolean => {
    const targetRole = targetUser.role?.name;
    const isSelf = targetUser.id === currentUser?.id;
    
    // CRITICAL: SUPER_ADMIN can NEVER be deleted
    // - Anti-coup: Other Super Admins cannot delete each other
    // - Anti-suicide: Cannot delete yourself
    if (targetRole === 'SUPER_ADMIN') return false;
    
    // Self-deletion is prevented (even for non-Super Admins)
    if (isSelf) return false;
    
    // Regular admin/staff cannot delete anyone if they can't modify them
    if (!canModify(targetUser)) return false;
    
    // For other roles, allow deletion if user can modify
    return canModify(targetUser);
  };
  
  // Check if current user can view audit logs
  // SUPER_ADMIN can view anyone's logs (surveillance)
  const canViewAuditLog = (targetUser: User): boolean => {
    // SUPER_ADMIN can surveil everyone (including peers)
    // This is the core of "Mutual Surveillance" - transparency among Super Admins
    if (isSuperAdmin) return true;
    
    // ADMIN can view subordinates' logs
    if (currentUserRole === 'ADMIN' && targetUser.role?.name !== 'SUPER_ADMIN') return true;
    
    // STAFF and below cannot view audit logs
    return false;
  };

   // Translations
   const t = {
     title: language === 'vi' ? 'Quản lý Nhân viên & Admin' : 'Staff & Admin Management',
     subtitle: language === 'vi' ? 'IAM - Quản lý tài khoản nội bộ và phân quyền' : 'IAM - Internal accounts and permissions',
     addNew: language === 'vi' ? 'Thêm nhân viên' : 'Add Staff',
     edit: language === 'vi' ? 'Sửa thông tin' : 'Edit Info',
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
     deleteWarning: language === 'vi' 
       ? 'Bạn có chắc chắn muốn xóa tài khoản nhân viên này? Hành động này không thể hoàn tác!' 
       : 'Are you sure you want to delete this staff account? This action cannot be undone!',
     delete: language === 'vi' ? 'Xóa' : 'Delete',
     loadError: language === 'vi' ? 'Không thể tải danh sách nhân viên' : 'Cannot load staff',
     staffMembers: language === 'vi' ? 'nhân viên' : 'staff members',
     loadingText: language === 'vi' ? 'Đang tải...' : 'Loading...',
     noStaff: language === 'vi' ? 'Chưa có nhân viên nào' : 'No staff found',
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
     totalStaff: language === 'vi' ? 'Tổng nhân viên' : 'Total Staff',
     activeStaff: language === 'vi' ? 'Đang hoạt động' : 'Active',
     lockedStaff: language === 'vi' ? 'Bị khóa' : 'Locked',
     namePlaceholder: language === 'vi' ? 'Nguyễn Văn A' : 'John Doe',
     phonePlaceholder: '0912345678',
     viewAuditLog: language === 'vi' ? 'Xem Audit Log' : 'View Audit Log',
     security: language === 'vi' ? 'Bảo mật' : 'Security',
     twoFA: '2FA',
     enabled: language === 'vi' ? 'Bật' : 'Enabled',
     disabled: language === 'vi' ? 'Tắt' : 'Disabled',
    superAdminProtected: language === 'vi' 
      ? '🛡️ SUPER ADMIN không thể bị xóa (tài khoản được bảo vệ)' 
      : '🛡️ SUPER ADMIN cannot be deleted (protected account)',
    noPermission: language === 'vi'
      ? '⚠️ Bạn không có quyền thao tác với SUPER ADMIN'
      : '⚠️ You do not have permission to modify SUPER ADMIN',
    mutualNonInterference: language === 'vi'
      ? '🤝 Bạn không thể chỉnh sửa thông tin của SUPER ADMIN khác (Mutual Non-Interference)'
      : '🤝 You cannot edit another SUPER ADMIN (Mutual Non-Interference)',
    cannotDeleteSelf: language === 'vi'
      ? '⛔ Không thể tự xóa tài khoản của chính mình'
      : '⛔ Cannot delete your own account',
    surveillanceOnly: language === 'vi'
      ? '👁️ Bạn chỉ có quyền XEM (giám sát), không có quyền SỬA'
      : '👁️ You can only VIEW (surveillance), not MODIFY',
   };
 
   // Load roles (filter only admin roles)
   useEffect(() => {
     const fetchRoles = async () => {
       try {
         const response = await api.get<{ success: boolean; data: Role[] }>('/roles');
         if (response.success) {
           // Filter roles based on current user's permissions
           let availableRoles = response.data.filter(r =>
             ['ADMIN', 'SUPER_ADMIN', 'STAFF', 'MODERATOR'].includes(r.name.toUpperCase())
           );

           // 🛡️ ENTERPRISE STANDARD: Principle of Least Privilege & Anti-Collusion
           // Only SUPER_ADMIN can create ADMIN or SUPER_ADMIN accounts
           // Regular ADMIN can only create STAFF/MODERATOR (prevents collusion)
           if (!isSuperAdmin) {
             availableRoles = availableRoles.filter(r =>
               !['ADMIN', 'SUPER_ADMIN'].includes(r.name.toUpperCase())
             );
           }

           setRoles(availableRoles);
         }
       } catch (err) {
         console.error('Failed to fetch roles:', err);
       }
     };
     fetchRoles();
   }, [isSuperAdmin]);
 
   // Fetch staff (only admin/staff roles)
   const fetchStaff = useCallback(async () => {
     try {
       setLoading(true);
       setError(null);
       
       // Build query params to exclude USER role
       const params: Record<string, string> = {
         page: pagination.page.toString(),
         limit: pagination.limit.toString(),
         excludeRole: 'USER', // Exclude customers
       };
       
       if (searchQuery) params.search = searchQuery;
       if (roleFilter) params.role = roleFilter;
       if (statusFilter) params.isActive = statusFilter === 'active' ? 'true' : 'false';
       
       const queryString = new URLSearchParams(params).toString();
       const response = await api.get<{
         success: boolean;
         data: User[];
         pagination: typeof pagination;
       }>(`/admin/users?${queryString}`);
 
       if (response.success) {
         setStaff(response.data);
         setPagination(response.pagination);
       }
     } catch (err) {
       console.error('Failed to fetch staff:', err);
       setError(t.loadError);
     } finally {
       setLoading(false);
     }
   }, [pagination.page, pagination.limit, searchQuery, roleFilter, statusFilter, t.loadError]);
 
   useEffect(() => {
     fetchStaff();
   }, [refreshTrigger, pagination.page, searchQuery, roleFilter, statusFilter]);
 
   // Handle search
   const handleSearch = (query: string) => {
     setSearchQuery(query);
     setPagination(prev => ({ ...prev, page: 1 }));
   };
 
   // Open add modal
   const handleAdd = () => {
     setEditingStaff(null);
     setFormData(initialFormData);
     setFormError(null);
     setShowModal(true);
   };
 
   // Open edit modal
   const handleEdit = (staff: User) => {
     setEditingStaff(staff);
     setFormData({
       name: staff.name || '',
       email: staff.email,
       phone: staff.phone || '',
      roleId: staff.role?.id.toString() || '',
       isActive: staff.isActive,
     });
     setFormError(null);
     setShowModal(true);
   };
 
   // Save staff
   const handleSave = async () => {
     try {
       setSaving(true);
       setFormError(null);
 
       if (!formData.name || !formData.email || !formData.roleId) {
         setFormError(language === 'vi' ? 'Vui lòng điền đầy đủ thông tin!' : 'Please fill all required fields!');
         return;
       }
 
       const payload = {
         name: formData.name,
         email: formData.email,
         phone: formData.phone || null,
         roleId: parseInt(formData.roleId),
         isActive: formData.isActive,
       };
 
       if (editingStaff) {
        // Update user info via PUT endpoint with RBAC protection
        await api.put(`/admin/users/${editingStaff.id}`, payload);
       } else {
        // Create new staff member via POST endpoint
        await api.post('/admin/users', payload);
       }
 
       setSuccessMessage(t.saveSuccess);
       setShowModal(false);
       setRefreshTrigger(prev => prev + 1);
       
       setTimeout(() => setSuccessMessage(null), 3000);
     } catch (err: any) {
       // 🔄 ENTERPRISE STANDARD: Role Promotion Detection
       // When email exists with different role, backend returns 409 with promotion suggestion
       if (err.response?.status === 409 && err.response?.data?.suggestion === 'PROMOTE_ROLE') {
         const promotionInfo = err.response.data;
         setPromotionData({
           existingUser: {
             ...promotionInfo.existingUser,
             currentRole: promotionInfo.existingUser.currentRole,
             currentRoleId: promotionInfo.existingUser.currentRoleId
           },
           requestedRole: promotionInfo.requestedRole,
           requestedRoleId: promotionInfo.requestedRoleId
         });
         setShowPromotionModal(true);
         setShowModal(false);
       } else {
         const errorMessage = err.response?.data?.error || err.message || 'Unknown error';
         setFormError(errorMessage);
       }
     } finally {
       setSaving(false);
     }
   };

   // Handle Role Promotion (Enterprise: Single Identity Principle)
   const handlePromoteRole = async () => {
     if (!promotionData) return;

     try {
       setPromoting(true);
       await api.patch(`/admin/users/${promotionData.existingUser.id}/promote-role`, {
         newRoleId: promotionData.requestedRoleId
       });

       setSuccessMessage(
         language === 'vi'
           ? `Đã nâng cấp quyền thành công! ${promotionData.existingUser.name} cần đăng nhập lại.`
           : `Role promoted successfully! ${promotionData.existingUser.name} needs to login again.`
       );
       setShowPromotionModal(false);
       setPromotionData(null);
       setRefreshTrigger(prev => prev + 1);

       setTimeout(() => setSuccessMessage(null), 5000);
     } catch (err: any) {
       const errorMessage = err.response?.data?.error || err.message || 'Unknown error';
       setFormError(errorMessage);
     } finally {
       setPromoting(false);
     }
   };

   // Delete staff
   const handleDeleteConfirm = async () => {
     if (!deletingStaff) return;
 
     try {
       setDeleting(true);
       await adminUserApi.delete(deletingStaff.id);
       setShowDeleteModal(false);
       setDeletingStaff(null);
       setRefreshTrigger(prev => prev + 1);
       setSuccessMessage(language === 'vi' ? 'Xóa thành công!' : 'Deleted successfully!');
       setTimeout(() => setSuccessMessage(null), 3000);
     } catch (err) {
       console.error('Delete failed:', err);
       setFormError(language === 'vi' ? 'Không thể xóa!' : 'Cannot delete!');
     } finally {
       setDeleting(false);
     }
   };
 
   // Toggle active status
   const handleToggleActive = async (staff: User) => {
     try {
       setActionLoading(staff.id);
      await adminUserApi.updateStatus(staff.id, !staff.isActive);
       setRefreshTrigger(prev => prev + 1);
     } catch (err) {
       console.error('Toggle active failed:', err);
     } finally {
       setActionLoading(null);
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
 
   // Calculate stats
   const totalStaff = pagination.total;
   const activeStaff = staff.filter(s => s.isActive).length;
   const lockedStaff = staff.filter(s => !s.isActive).length;
 
   return (
     <div className="space-y-6 p-6">
       {/* Header */}
       <div className="flex items-center justify-between">
         <div>
           <div className="flex items-center gap-3">
             <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg">
               <Shield className="w-6 h-6 text-white" />
             </div>
             <div>
               <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t.title}</h1>
               <p className="text-sm text-slate-500 dark:text-slate-400">{t.subtitle}</p>
             </div>
           </div>
         </div>
         <button
           onClick={handleAdd}
           className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
         >
           <Plus className="w-4 h-4" />
           {t.addNew}
         </button>
       </div>
 
       {/* Stats */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
           <div className="flex items-center justify-between">
             <div>
               <p className="text-sm text-slate-500 dark:text-slate-400">{t.totalStaff}</p>
               <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalStaff}</p>
             </div>
             <Users className="w-8 h-8 text-purple-500" />
           </div>
         </div>
         <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
           <div className="flex items-center justify-between">
             <div>
               <p className="text-sm text-slate-500 dark:text-slate-400">{t.activeStaff}</p>
               <p className="text-2xl font-bold text-emerald-600">{activeStaff}</p>
             </div>
             <CheckCircle className="w-8 h-8 text-emerald-500" />
           </div>
         </div>
         <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
           <div className="flex items-center justify-between">
             <div>
               <p className="text-sm text-slate-500 dark:text-slate-400">{t.lockedStaff}</p>
               <p className="text-2xl font-bold text-red-600">{lockedStaff}</p>
             </div>
             <Lock className="w-8 h-8 text-red-500" />
           </div>
         </div>
       </div>
 
       {/* Success Message */}
       {successMessage && (
         <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center gap-3 text-emerald-700 dark:text-emerald-400">
           <CheckCircle className="w-5 h-5" />
           {successMessage}
         </div>
       )}
 
       {/* Filters */}
       <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
         <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
           <div className="md:col-span-2">
             <SearchInput
               value={searchQuery}
               onChange={handleSearch}
               placeholder={t.search}
             />
           </div>
           <select
             value={roleFilter}
             onChange={(e) => {
               setRoleFilter(e.target.value);
               setPagination(prev => ({ ...prev, page: 1 }));
             }}
             className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
           >
             <option value="">{t.allRoles}</option>
             {roles.map(role => (
               <option key={role.id} value={role.name}>{role.name}</option>
             ))}
           </select>
           <select
             value={statusFilter}
             onChange={(e) => {
               setStatusFilter(e.target.value);
               setPagination(prev => ({ ...prev, page: 1 }));
             }}
             className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
           >
             <option value="">{t.allStatus}</option>
             <option value="active">{t.active}</option>
             <option value="inactive">{t.inactive}</option>
           </select>
         </div>
       </div>
 
       {/* Table */}
       <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
         {loading ? (
           <div className="flex items-center justify-center py-12">
             <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
           </div>
         ) : error ? (
           <div className="flex items-center justify-center gap-2 py-12 text-red-600">
             <AlertCircle className="w-5 h-5" />
             {error}
           </div>
         ) : staff.length === 0 ? (
           <div className="text-center py-12 text-slate-500">
             <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
             <p>{t.noStaff}</p>
           </div>
         ) : (
           <div className="overflow-x-auto">
             <table className="w-full">
               <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                 <tr>
                   <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                     {t.name}
                   </th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                     {t.role}
                   </th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                     {t.lastLogin}
                   </th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                     {t.status}
                   </th>
                   <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                     Actions
                   </th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                 {staff.map((member) => (
                   <tr 
                     key={member.id} 
                     className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 ${
                       member.role?.name === 'SUPER_ADMIN' ? 'bg-purple-50/30 dark:bg-purple-900/10' : ''
                     }`}
                   >
                     <td className="px-6 py-4">
                       <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-bold">
                           {member.name?.[0]?.toUpperCase() || member.email[0].toUpperCase()}
                         </div>
                         <div>
                           <p className="font-medium text-slate-900 dark:text-white">{member.name || 'N/A'}</p>
                           <div className="flex items-center gap-2 text-sm text-slate-500">
                             <Mail className="w-3 h-3" />
                             {member.email}
                           </div>
                           {member.phone && (
                             <div className="flex items-center gap-2 text-sm text-slate-500">
                               <Phone className="w-3 h-3" />
                               {member.phone}
                             </div>
                           )}
                         </div>
                       </div>
                     </td>
                     <td className="px-6 py-4">
                       <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                         member.role?.name === 'SUPER_ADMIN' 
                           ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' 
                           : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                       }`}>
                         {member.role?.name === 'SUPER_ADMIN' && <Shield className="w-3 h-3 inline mr-1" />}
                         {member.role?.name || 'N/A'}
                       </span>
                     </td>
                     <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                       <div className="flex items-center gap-2">
                         <Calendar className="w-4 h-4" />
                         {formatDate(member.lastLoginAt)}
                       </div>
                     </td>
                     <td className="px-6 py-4">
                       {member.isActive ? (
                         <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 w-fit">
                           <CheckCircle className="w-3 h-3" />
                           {t.active}
                         </span>
                       ) : (
                         <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 w-fit">
                           <Lock className="w-3 h-3" />
                           {t.inactive}
                         </span>
                       )}
                     </td>
                     <td className="px-6 py-4 text-right">
                       <div className="flex items-center justify-end gap-2">
                         {/* Edit Button - ⛔ Disabled for peer Super Admins (Mutual Non-Interference) */}
                         <button
                           onClick={() => handleEdit(member)}
                           disabled={!canModify(member)}
                           className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                           title={getDisabledTooltip(member, 'edit') || t.edit}
                         >
                           <Edit2 className="w-4 h-4" />
                         </button>
                         
                         {/* Activate/Deactivate (Permission) - ⛔ Disabled for peer Super Admins + self */}
                         <button
                           onClick={() => handleToggleActive(member)}
                           disabled={actionLoading === member.id || !canChangePermissions(member)}
                           className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                           title={getDisabledTooltip(member, 'permission') || (member.isActive ? t.deactivate : t.activate)}
                         >
                           {actionLoading === member.id ? (
                             <Loader2 className="w-4 h-4 animate-spin" />
                           ) : member.isActive ? (
                             <UserX className="w-4 h-4" />
                           ) : (
                             <UserCheck className="w-4 h-4" />
                           )}
                         </button>
                         
                         {/* Delete Button - ⛔ ALWAYS disabled for Super Admin + self-deletion */}
                         <button
                           onClick={() => {
                             setDeletingStaff(member);
                             setShowDeleteModal(true);
                           }}
                           disabled={!canDelete(member)}
                           className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                           title={getDisabledTooltip(member, 'delete') || t.delete}
                         >
                           <Trash2 className="w-4 h-4" />
                         </button>
                         
                         {/* Activity Log - ✅ ALWAYS enabled for Super Admins (Mutual Surveillance) */}
                         <button
                           disabled={!canViewAuditLog(member)}
                           className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                           title={t.viewAuditLog}
                         >
                           <Activity className="w-4 h-4" />
                         </button>
                       </div>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
         )}
       </div>
 
       {/* Pagination */}
       {!loading && staff.length > 0 && (
         <Pagination
           currentPage={pagination.page}
           totalPages={pagination.pages}
           onPageChange={(page) => setPagination(prev => ({ ...prev, page }))}
         />
       )}
 
       {/* Add/Edit Modal */}
       {showModal && (
         <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
           <div className="bg-white dark:bg-slate-800 rounded-xl max-w-md w-full p-6">
             <div className="flex items-center justify-between mb-6">
               <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                 {editingStaff ? t.edit : t.addNew}
               </h2>
               <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                 <X className="w-5 h-5" />
               </button>
             </div>
 
             {formError && (
               <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                 {formError}
               </div>
             )}
 
             <div className="space-y-4">
               <div>
                 <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                   {t.name} *
                 </label>
                 <input
                   type="text"
                   value={formData.name}
                   onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                   placeholder={t.namePlaceholder}
                   className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                 />
               </div>
               <div>
                 <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                   {t.email} *
                 </label>
                 <input
                   type="email"
                   value={formData.email}
                   onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                   placeholder="name@company.com"
                   className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                   disabled={!!editingStaff}
                 />
               </div>
               <div>
                 <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                   {t.phone}
                 </label>
                 <input
                   type="tel"
                   value={formData.phone}
                   onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                   placeholder={t.phonePlaceholder}
                   className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                 />
               </div>
               <div>
                 <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                   {t.role} *
                  {editingStaff && editingStaff.id === currentUser?.id && (
                    <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">
                      ({language === 'vi' ? 'Không thể thay đổi role của chính mình' : 'Cannot change your own role'})
                    </span>
                  )}
                 </label>
                 <select
                   value={formData.roleId}
                   onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                   className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                   disabled={!!(editingStaff && editingStaff.id === currentUser?.id)}
                 >
                   <option value="">{t.selectRole}</option>
                   {roles.map(role => (
                     <option key={role.id} value={role.id}>{role.name}</option>
                   ))}
                 </select>
               </div>
               <div className="flex items-center gap-2">
                 <input
                   type="checkbox"
                   id="isActive"
                   checked={formData.isActive}
                   onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                   className="w-4 h-4 text-purple-600 rounded"
                 />
                 <label htmlFor="isActive" className="text-sm text-slate-700 dark:text-slate-300">
                   {t.active}
                 </label>
               </div>
             </div>
 
             <div className="flex gap-3 mt-6">
               <button
                 onClick={() => setShowModal(false)}
                 className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
               >
                 {t.cancel}
               </button>
               <button
                 onClick={handleSave}
                 disabled={saving}
                 className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
               >
                 {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                 {saving ? t.saving : t.save}
               </button>
             </div>
           </div>
         </div>
       )}
 
       {/* Delete Modal */}
       {showDeleteModal && (
         <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
           <div className="bg-white dark:bg-slate-800 rounded-xl max-w-md w-full p-6">
             <div className="flex items-center gap-3 mb-4">
              <div className={`p-3 rounded-full ${
                deletingStaff?.role?.name === 'SUPER_ADMIN'
                  ? 'bg-purple-100 dark:bg-purple-900/30'
                  : 'bg-red-100 dark:bg-red-900/30'
              }`}>
                {deletingStaff?.role?.name === 'SUPER_ADMIN' ? (
                  <Shield className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                )}
               </div>
               <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t.confirmDelete}</h2>
             </div>
            
            {/* Show special warning for SUPER_ADMIN */}
            {deletingStaff?.role?.name === 'SUPER_ADMIN' ? (
              <div className="mb-6 p-4 bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-200 dark:border-purple-800 rounded-lg">
                <p className="text-purple-700 dark:text-purple-300 font-semibold mb-2">
                  {t.superAdminProtected}
                </p>
                <p className="text-sm text-purple-600 dark:text-purple-400">
                  {language === 'vi' 
                    ? 'Tài khoản SUPER ADMIN là cấp cao nhất và được bảo vệ khỏi việc xóa bỏ để đảm bảo an toàn hệ thống.'
                    : 'SUPER ADMIN is the highest level account and is protected from deletion to ensure system security.'
                  }
                </p>
              </div>
            ) : !canDelete(deletingStaff!) ? (
              <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-amber-700 dark:text-amber-300 font-semibold">
                  {t.noPermission}
                </p>
              </div>
            ) : (
              <p className="text-slate-600 dark:text-slate-400 mb-6">{t.deleteWarning}</p>
            )}
            
             <div className="flex gap-3">
               <button
                 onClick={() => setShowDeleteModal(false)}
                 className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
               >
                 {t.cancel}
               </button>
               <button
                 onClick={handleDeleteConfirm}
                disabled={deleting || !canDelete(deletingStaff!)}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
               >
                 {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                 {t.delete}
               </button>
             </div>
           </div>
         </div>
       )}

       {/* Role Promotion Modal (Enterprise: Single Identity Principle) */}
       {showPromotionModal && promotionData && (
         <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
           <div className="bg-white dark:bg-slate-800 rounded-xl max-w-lg w-full p-6">
             <div className="flex items-center gap-3 mb-6">
               <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                 <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
               </div>
               <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                 🔄 {language === 'vi' ? 'Nâng cấp quyền tài khoản' : 'Promote Account Role'}
               </h2>
             </div>

             {/* Info Panel */}
             <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-4 border-l-4 border-blue-500">
               <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
                 {language === 'vi' ? (
                   <>
                     Tài khoản <strong>{promotionData.existingUser.name || promotionData.existingUser.email}</strong> đã tồn tại trong hệ thống với vai trò <strong className="px-2 py-0.5 bg-blue-200 dark:bg-blue-800 rounded">{promotionData.existingUser.currentRole}</strong>.
                   </>
                 ) : (
                   <>
                     Account <strong>{promotionData.existingUser.name || promotionData.existingUser.email}</strong> already exists with role <strong className="px-2 py-0.5 bg-blue-200 dark:bg-blue-800 rounded">{promotionData.existingUser.currentRole}</strong>.
                   </>
                 )}
               </p>
               <p className="text-sm text-blue-700 dark:text-blue-300">
                 {language === 'vi' ? (
                   <>
                     Bạn có muốn nâng cấp lên <strong className="px-2 py-0.5 bg-emerald-200 dark:bg-emerald-800 rounded">{promotionData.requestedRole}</strong> không?
                   </>
                 ) : (
                   <>
                     Do you want to promote to <strong className="px-2 py-0.5 bg-emerald-200 dark:bg-emerald-800 rounded">{promotionData.requestedRole}</strong>?
                   </>
                 )}
               </p>
             </div>

             {/* User Details */}
             <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg mb-4">
               <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                 {language === 'vi' ? 'Thông tin tài khoản:' : 'Account details:'}
               </p>
               <div className="space-y-1 text-sm">
                 <p className="text-slate-700 dark:text-slate-300">
                   <strong>{language === 'vi' ? 'Email:' : 'Email:'}</strong> {promotionData.existingUser.email}
                 </p>
                 {promotionData.existingUser.name && (
                   <p className="text-slate-700 dark:text-slate-300">
                     <strong>{language === 'vi' ? 'Tên:' : 'Name:'}</strong> {promotionData.existingUser.name}
                   </p>
                 )}
                 <p className="text-slate-700 dark:text-slate-300">
                   <strong>ID:</strong> #{promotionData.existingUser.id}
                 </p>
               </div>
             </div>

             {/* Warning Panel */}
             <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg mb-6 border-l-4 border-amber-500">
               <p className="text-xs text-amber-700 dark:text-amber-300 mb-1">
                 <strong>⚠️ {language === 'vi' ? 'Lưu ý quan trọng:' : 'Important Note:'}</strong>
               </p>
               <ul className="text-xs text-amber-700 dark:text-amber-300 list-disc list-inside space-y-1">
                 <li>
                   {language === 'vi'
                     ? 'User sẽ bị đăng xuất khỏi TẤT CẢ thiết bị'
                     : 'User will be logged out from ALL devices'}
                 </li>
                 <li>
                   {language === 'vi'
                     ? 'User phải đăng nhập lại để nhận quyền mới'
                     : 'User must login again to receive new permissions'}
                 </li>
                 <li>
                   {language === 'vi'
                     ? 'Lịch sử và dữ liệu cũ sẽ được giữ nguyên'
                     : 'History and old data will be preserved'}
                 </li>
               </ul>
             </div>

             {formError && (
               <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                 {formError}
               </div>
             )}

             {/* Action Buttons */}
             <div className="flex gap-3">
               <button
                 onClick={() => {
                   setShowPromotionModal(false);
                   setPromotionData(null);
                   setFormError(null);
                 }}
                 disabled={promoting}
                 className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
               >
                 {language === 'vi' ? 'Hủy' : 'Cancel'}
               </button>
               <button
                 onClick={handlePromoteRole}
                 disabled={promoting}
                 className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
               >
                 {promoting && <Loader2 className="w-4 h-4 animate-spin" />}
                 {promoting
                   ? (language === 'vi' ? 'Đang xử lý...' : 'Processing...')
                   : (language === 'vi' ? 'Xác nhận nâng cấp' : 'Confirm Promotion')}
               </button>
             </div>
           </div>
         </div>
       )}
     </div>
   );
 };
 
 export default Staff;
