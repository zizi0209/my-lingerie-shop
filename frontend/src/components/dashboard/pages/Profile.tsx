'use client';

import React, { useState, useEffect } from 'react';
import { Save, User, Mail, Phone, Lock, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { useLanguage } from '../components/LanguageContext';
import { api } from '@/lib/api';
import type { User as UserType } from '@/lib/adminApi';

interface ProfileData {
  name: string;
  email: string;
  phone: string;
}

interface PasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const Profile: React.FC = () => {
  const { language } = useLanguage();
  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const [profileData, setProfileData] = useState<ProfileData>({
    name: '',
    email: '',
    phone: '',
  });

  const [passwordData, setPasswordData] = useState<PasswordData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const t = {
    title: language === 'vi' ? 'Quản lý hồ sơ' : 'Profile Management',
    subtitle: language === 'vi' ? 'Cập nhật thông tin cá nhân và mật khẩu' : 'Update your personal information and password',
    personalInfo: language === 'vi' ? 'Thông tin cá nhân' : 'Personal Information',
    fullName: language === 'vi' ? 'Họ và tên' : 'Full Name',
    email: language === 'vi' ? 'Email' : 'Email',
    phone: language === 'vi' ? 'Số điện thoại' : 'Phone Number',
    changePassword: language === 'vi' ? 'Đổi mật khẩu' : 'Change Password',
    currentPassword: language === 'vi' ? 'Mật khẩu hiện tại' : 'Current Password',
    newPassword: language === 'vi' ? 'Mật khẩu mới' : 'New Password',
    confirmPassword: language === 'vi' ? 'Xác nhận mật khẩu' : 'Confirm Password',
    save: language === 'vi' ? 'Lưu thay đổi' : 'Save Changes',
    updatePassword: language === 'vi' ? 'Cập nhật mật khẩu' : 'Update Password',
    role: language === 'vi' ? 'Vai trò' : 'Role',
    lastLogin: language === 'vi' ? 'Đăng nhập lần cuối' : 'Last Login',
    accountCreated: language === 'vi' ? 'Ngày tạo tài khoản' : 'Account Created',
    passwordMismatch: language === 'vi' ? 'Mật khẩu xác nhận không khớp' : 'Passwords do not match',
    profileUpdated: language === 'vi' ? 'Cập nhật hồ sơ thành công' : 'Profile updated successfully',
    passwordUpdated: language === 'vi' ? 'Đổi mật khẩu thành công' : 'Password changed successfully',
    errorOccurred: language === 'vi' ? 'Có lỗi xảy ra' : 'An error occurred',
    saving: language === 'vi' ? 'Đang lưu...' : 'Saving...',
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await api.get<{ success: boolean; data: UserType }>('/users/profile');
        if (response.success) {
          setUser(response.data);
          setProfileData({
            name: response.data.name || '',
            email: response.data.email || '',
            phone: response.data.phone || '',
          });
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const response = await api.put<{ success: boolean; data: UserType; message?: string }>(
        '/users/profile',
        profileData
      );
      if (response.success) {
        setUser(response.data);
        setMessage({ type: 'success', text: t.profileUpdated });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t.errorOccurred;
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: t.passwordMismatch });
      return;
    }

    setChangingPassword(true);
    setMessage(null);

    try {
      const response = await api.put<{ success: boolean; message?: string }>(
        '/users/change-password',
        {
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }
      );
      if (response.success) {
        setMessage({ type: 'success', text: t.passwordUpdated });
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t.errorOccurred;
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setChangingPassword(false);
    }
  };

  const formatDate = (date: Date | null | string | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-rose-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic">
          {t.title}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{t.subtitle}</p>
      </div>

      {message && (
        <div
          className={`flex items-center space-x-3 p-4 rounded-2xl ${
            message.type === 'success'
              ? 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400'
              : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'
          }`}
        >
          {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-900/50 p-6 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm text-center">
            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-rose-400 to-purple-500 rounded-full flex items-center justify-center mb-4">
              <User size={40} className="text-white" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {user?.name || 'Admin User'}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">{user?.email}</p>
            {user?.role && (
              <span className="inline-block mt-3 px-4 py-1.5 text-sm font-bold bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-full">
                {user.role.name}
              </span>
            )}
            
            <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700 space-y-3 text-left">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.lastLogin}</p>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {formatDate(user?.lastLoginAt)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.accountCreated}</p>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {formatDate(user?.createdAt)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Forms */}
        <div className="lg:col-span-2 space-y-8">
          {/* Personal Information */}
          <form onSubmit={handleProfileUpdate} className="bg-white dark:bg-slate-900/50 p-6 md:p-8 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center space-x-3 mb-8">
              <div className="p-2.5 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl">
                <User size={20} />
              </div>
              <h3 className="font-black text-lg text-slate-900 dark:text-white uppercase tracking-tighter">
                {t.personalInfo}
              </h3>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                  {t.fullName}
                </label>
                <div className="relative">
                  <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={profileData.name}
                    onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 dark:text-slate-200 transition-all font-bold"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                  {t.email}
                </label>
                <div className="relative">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 dark:text-slate-200 transition-all font-bold"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                  {t.phone}
                </label>
                <div className="relative">
                  <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 dark:text-slate-200 transition-all font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center space-x-3 transition-all shadow-xl shadow-rose-200 dark:shadow-none active:scale-95"
                >
                  <Save size={18} />
                  <span>{saving ? t.saving : t.save}</span>
                </button>
              </div>
            </div>
          </form>

          {/* Change Password */}
          <form onSubmit={handlePasswordChange} className="bg-white dark:bg-slate-900/50 p-6 md:p-8 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center space-x-3 mb-8">
              <div className="p-2.5 bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl">
                <Lock size={20} />
              </div>
              <h3 className="font-black text-lg text-slate-900 dark:text-white uppercase tracking-tighter">
                {t.changePassword}
              </h3>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                  {t.currentPassword}
                </label>
                <div className="relative">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPasswords.current ? 'text' : 'password'}
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    className="w-full pl-12 pr-12 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 dark:text-slate-200 transition-all font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                  {t.newPassword}
                </label>
                <div className="relative">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPasswords.new ? 'text' : 'password'}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    className="w-full pl-12 pr-12 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 dark:text-slate-200 transition-all font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                  {t.confirmPassword}
                </label>
                <div className="relative">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPasswords.confirm ? 'text' : 'password'}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    className="w-full pl-12 pr-12 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 dark:text-slate-200 transition-all font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={changingPassword || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                  className="bg-purple-500 hover:bg-purple-600 disabled:bg-purple-300 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center space-x-3 transition-all shadow-xl shadow-purple-200 dark:shadow-none active:scale-95"
                >
                  <Lock size={18} />
                  <span>{changingPassword ? t.saving : t.updatePassword}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;
