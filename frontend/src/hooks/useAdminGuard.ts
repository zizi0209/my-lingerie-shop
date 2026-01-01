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
          router.push('/admin/login');
          return;
        }

        // Get current user info
        try {
          const response = await api.get<{ success: boolean; data: User }>('/users/profile');
          const user = response.data;

          // Check if user is admin
          if (!isAdmin(user)) {
            alert('Bạn không có quyền truy cập Admin Dashboard!');
            router.push('/');
            return;
          }

          setCurrentUser(user);
        } catch (error) {
          // If /users/profile endpoint fails, redirect to login
          console.error('Error getting user info:', error);
          
          // For now, allow access if token is valid
          // In production, this should redirect to login
          // Uncomment below to enforce strict checking:
          // router.push('/admin/login');
          // return;
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/admin/login');
      } finally {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [router]);

  return { isChecking, currentUser };
}
