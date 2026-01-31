"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
  const { data: session, status } = useSession();
  const router = useRouter();

  // Track if we've fetched the initial profile to prevent flash
  const [profileFetched, setProfileFetched] = useState(false);
  
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: status === "loading",
  });

  // Sync NextAuth session to AuthContext
  useEffect(() => {
    if (status === "loading") {
      setState((prev) => ({ ...prev, isLoading: true }));
      return;
    }

    if (session?.user) {
      // Set backend token if from credentials login
      if (session.backendToken) {
        api.setToken(session.backendToken);
      }

      // Fetch full user profile from backend after session is established
      if (session.backendToken) {
        // Keep loading state while fetching to prevent flash
        if (!profileFetched) {
          setState((prev) => ({ ...prev, isLoading: true }));
        }
        
        api.get<ProfileResponse>("/users/profile")
          .then((response) => {
            if (response.success && response.data) {
              setState((prev) => ({
                ...prev,
                user: response.data,
                token: session.backendToken || null,
                isAuthenticated: true,
                isLoading: false,
              }));
              setProfileFetched(true);
            }
          })
          .catch((error) => {
            console.error("Error fetching profile:", error);
            // Fallback to session data
            const user: User = {
              id: parseInt(session.user!.id),
              email: session.user!.email || "",
              name: session.user!.name || null,
              avatar: session.user!.image || null,
              roleId: null,
              role: session.user!.role ? { id: 0, name: session.user!.role } : null,
              phone: null,
              birthday: null,
              memberTier: "BRONZE",
              pointBalance: 0,
              totalSpent: 0,
              createdAt: new Date().toISOString(),
            };
            setState({
              user,
              token: session.backendToken || null,
              isAuthenticated: true,
              isLoading: false,
            });
            setProfileFetched(true);
          });
      } else {
        // Social login without backend token - use session data
        const user: User = {
          id: parseInt(session.user.id),
          email: session.user.email || "",
          name: session.user.name || null,
          avatar: session.user.image || null,
          roleId: null,
          role: session.user.role ? { id: 0, name: session.user.role } : null,
          phone: null,
          birthday: null,
          memberTier: "BRONZE",
          pointBalance: 0,
          totalSpent: 0,
          createdAt: new Date().toISOString(),
        };
        setState({
          user,
          token: null,
          isAuthenticated: true,
          isLoading: false,
          });
        setProfileFetched(true);
      }
      return;
    }

    // Not authenticated
    setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
    setProfileFetched(false);
  }, [session, status]);

  // Define logout function before useEffect that uses it
  const logout = useCallback(async () => {
    // Logout from NextAuth
    await signOut({ redirect: false });

    // Clear backend JWT
    api.removeToken();

    // Clear state
    setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });

    // Redirect to home page
    router.push('/');
  }, [router]);

  // Listen for SESSION_EXPIRED events globally
  useEffect(() => {
    const handleSessionExpired = (event: Event) => {
      const customEvent = event as CustomEvent<{ message: string; reason: string }>;

      console.log('[AuthContext] Session expired:', customEvent.detail);

      // Show toast notification
      toast.error('Phiên đăng nhập đã hết hạn', {
        description: 'Vui lòng đăng nhập lại để tiếp tục.',
        duration: 5000,
      });

      // Clear session and redirect
      void logout();
    };

    // Listen for custom session-expired event
    window.addEventListener('session-expired', handleSessionExpired);

    return () => {
      window.removeEventListener('session-expired', handleSessionExpired);
    };
  }, [logout]);

  const login = useCallback(
    async (credentials: LoginCredentials): Promise<{ success: boolean; error?: string }> => {
      try {
        // Use NextAuth credentials provider (calls backend internally)
        const result = await signIn("credentials", {
          redirect: false,
          email: credentials.email,
          password: credentials.password,
        });

        if (result?.error) {
          return {
            success: false,
            error: result.error === "CredentialsSignin"
              ? "Email hoặc mật khẩu không đúng"
              : result.error,
          };
        }

        if (result?.ok) {
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
        // Register via backend API
        const response = await api.post<AuthResponse>(
          "/auth/register",
          credentials,
          false
        );

        if (response.success && response.data) {
          // After registration, auto-login via NextAuth
          const loginResult = await signIn("credentials", {
            redirect: false,
            email: credentials.email,
            password: credentials.password,
          });

          if (loginResult?.ok) {
            return { success: true };
          }

          return {
            success: false,
            error: "Đăng ký thành công nhưng đăng nhập thất bại. Vui lòng đăng nhập lại.",
          };
        }

        return { success: false, error: "Đăng ký thất bại" };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Lỗi không xác định";
        return { success: false, error: message };
      }
    },
    []
  );

  const refreshUser = useCallback(async () => {
    if (!state.isAuthenticated) return;

    try {
      const response = await api.get<ProfileResponse>("/users/profile");
      if (response.success && response.data) {
        setState((prev) => ({
          ...prev,
          user: response.data,
        }));
      }
    } catch (error) {
      console.error("Error refreshing user:", error);
    }
  }, [state.isAuthenticated]);

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
