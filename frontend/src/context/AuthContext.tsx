"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { api } from "@/lib/api";
import type {
  User,
  AuthState,
  LoginCredentials,
  RegisterCredentials,
  AuthResponse,
  ProfileResponse,
} from "@/types/auth";

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; error?: string }>;
  register: (credentials: RegisterCredentials) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Khởi tạo: kiểm tra token và lấy user info
  useEffect(() => {
    const initAuth = async () => {
      if (!api.isAuthenticated()) {
        setState((prev) => ({ ...prev, isLoading: false }));
        return;
      }

      try {
        const response = await api.get<ProfileResponse>("/users/profile");
        if (response.success && response.data) {
          setState({
            user: response.data,
            token: localStorage.getItem("accessToken"),
            isAuthenticated: true,
            isLoading: false,
          });
        } else {
          api.removeToken();
          setState({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      } catch {
        api.removeToken();
        setState({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    };

    initAuth();
  }, []);

  const login = useCallback(
    async (credentials: LoginCredentials): Promise<{ success: boolean; error?: string }> => {
      try {
        const response = await api.post<AuthResponse>(
          "/auth/login",
          credentials,
          false
        );

        if (response.success && response.data) {
          api.setToken(response.data.accessToken);
          api.setTokenExpiry(response.data.expiresIn);
          setState({
            user: response.data.user,
            token: response.data.accessToken,
            isAuthenticated: true,
            isLoading: false,
          });
          return { success: true };
        }

        return { success: false, error: "Đăng nhập thất bại" };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Lỗi không xác định";
        return { success: false, error: message };
      }
    },
    []
  );

  const register = useCallback(
    async (credentials: RegisterCredentials): Promise<{ success: boolean; error?: string }> => {
      try {
        const response = await api.post<AuthResponse>(
          "/auth/register",
          credentials,
          false
        );

        if (response.success && response.data) {
          api.setToken(response.data.accessToken);
          api.setTokenExpiry(response.data.expiresIn);
          setState({
            user: response.data.user,
            token: response.data.accessToken,
            isAuthenticated: true,
            isLoading: false,
          });
          return { success: true };
        }

        return { success: false, error: "Đăng ký thất bại" };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Lỗi không xác định";
        return { success: false, error: message };
      }
    },
    []
  );

  const logout = useCallback(async () => {
    await api.logout();
    setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }, []);

  const refreshUser = useCallback(async () => {
    if (!api.isAuthenticated()) return;

    try {
      const response = await api.get<ProfileResponse>("/users/profile");
      if (response.success && response.data) {
        setState((prev) => ({
          ...prev,
          user: response.data,
        }));
      }
    } catch {
      // Silent fail
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth phải được sử dụng trong AuthProvider");
  }
  return context;
}
