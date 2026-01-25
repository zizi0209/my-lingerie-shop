// API Service với JWT Authentication + Auto Refresh Token

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface RequestOptions extends RequestInit {
  requireAuth?: boolean;
  _retry?: boolean;
}

interface RefreshResponse {
  success: boolean;
  data: {
    accessToken: string;
    expiresIn: number;
  };
}

class ApiService {
  private baseUrl: string;
  private isRefreshing = false;
  private refreshPromise: Promise<boolean> | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  // Lấy token từ memory/localStorage
  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('accessToken');
  }

  // Lưu token
  public setToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', token);
    }
  }

  // Xóa token
  public removeToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('tokenExpiresAt');
    }
  }

  // Lưu thời gian hết hạn token
  public setTokenExpiry(expiresInMs: number): void {
    if (typeof window !== 'undefined') {
      const expiresAt = Date.now() + expiresInMs;
      localStorage.setItem('tokenExpiresAt', String(expiresAt));
    }
  }

  // Kiểm tra token sắp hết hạn (còn < 5 phút)
  private isTokenExpiringSoon(): boolean {
    if (typeof window === 'undefined') return false;
    const expiresAt = localStorage.getItem('tokenExpiresAt');
    if (!expiresAt) return false;
    const timeLeft = Number(expiresAt) - Date.now();
    return timeLeft < 5 * 60 * 1000; // < 5 minutes
  }

  // Kiểm tra user có đăng nhập không
  public isAuthenticated(): boolean {
    return !!this.getToken();
  }

  // Refresh token
  private async refreshToken(): Promise<boolean> {
    // Nếu đang refresh, chờ kết quả
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = this.doRefresh();

    try {
      return await this.refreshPromise;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  private async doRefresh(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        credentials: 'include', // Gửi refresh token cookie
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        // Refresh token không hợp lệ hoặc hết hạn - đây là trường hợp bình thường
        // Browser sẽ hiển thị 401 trong Network tab nhưng không phải lỗi
        this.removeToken();
        return false;
      }

      const data: RefreshResponse = await response.json();
      if (data.success && data.data.accessToken) {
        this.setToken(data.data.accessToken);
        this.setTokenExpiry(data.data.expiresIn);
        return true;
      }

      this.removeToken();
      return false;
    } catch {
      // Network error hoặc server không phản hồi
      this.removeToken();
      return false;
    }
  }

  // Request handler với JWT + Auto Refresh
  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { requireAuth = true, _retry = false, ...fetchOptions } = options;

    // Auto refresh nếu token sắp hết hạn
    if (requireAuth && this.isAuthenticated() && this.isTokenExpiringSoon() && !_retry) {
      await this.refreshToken();
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (requireAuth) {
      const token = this.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
        credentials: 'include',
      });

      // Handle 401 - try refresh token once
      if (response.status === 401 && requireAuth && !_retry) {
        const refreshed = await this.refreshToken();
        if (refreshed) {
          // Retry original request with new token
          return this.request<T>(endpoint, { ...options, _retry: true });
        }
        this.removeToken();
        // Throw silent error for auth check (không hiện thông báo cho user)
        const error = new Error('SESSION_EXPIRED');
        (error as Error & { silent?: boolean }).silent = true;
        throw error;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        if ((response.status === 401 || response.status === 403) && requireAuth) {
          this.removeToken();
          // Throw silent error for auth check
          const error = new Error('SESSION_EXPIRED');
          (error as Error & { silent?: boolean }).silent = true;
          throw error;
        }

        // 🔄 SPECIAL CASE: 409 Conflict với suggestion (Role Promotion)
        // Không throw error, return data để caller xử lý
        if (response.status === 409 && errorData.suggestion === 'PROMOTE_ROLE') {
          const error = new Error(errorData.error || 'Conflict') as Error & {
            response?: { status: number; data: unknown };
            statusCode?: number;
          };
          error.response = {
            status: 409,
            data: errorData
          };
          error.statusCode = 409;
          throw error;
        }

        // For all other errors, attach response data for proper error handling
        const error = new Error(errorData.error || `HTTP error! status: ${response.status}`) as Error & {
          response?: { status: number; data: unknown };
          statusCode?: number;
        };
        error.response = {
          status: response.status,
          data: errorData
        };
        error.statusCode = response.status;
        throw error;
      }

      return await response.json();
    } catch (error) {
      // Không log silent errors (SESSION_EXPIRED) và expected business errors (409 PROMOTE_ROLE)
      const isSilent = error instanceof Error && (error as Error & { silent?: boolean }).silent;
      const is409Conflict = error instanceof Error && (error as Error & { statusCode?: number }).statusCode === 409;

      if (!isSilent && !is409Conflict) {
        console.error('API Error:', error);
      }
      throw error;
    }
  }

  // GET request
  public async get<T>(endpoint: string, requireAuth = true): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'GET',
      requireAuth,
    });
  }

  // POST request
  public async post<T>(
    endpoint: string,
    data?: unknown,
    requireAuth = true
  ): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      requireAuth,
    });
  }

  // PUT request
  public async put<T>(
    endpoint: string,
    data?: unknown,
    requireAuth = true
  ): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
      requireAuth,
    });
  }

  // PATCH request
  public async patch<T>(
    endpoint: string,
    data?: unknown,
    requireAuth = true
  ): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
      requireAuth,
    });
  }

  // DELETE request
  public async delete<T>(endpoint: string, requireAuth = true): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
      requireAuth,
    });
  }

  // Upload file (multipart/form-data)
  public async uploadFile<T>(
    endpoint: string,
    formData: FormData,
    requireAuth = true
  ): Promise<T> {
    // Auto refresh nếu token sắp hết hạn
    if (requireAuth && this.isAuthenticated() && this.isTokenExpiringSoon()) {
      await this.refreshToken();
    }

    const token = this.getToken();
    const headers: HeadersInit = {};

    if (requireAuth && token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
        credentials: 'include',
      });

      if (response.status === 401 && requireAuth) {
        const refreshed = await this.refreshToken();
        if (refreshed) {
          // Retry with new token
          const newHeaders: HeadersInit = {};
          const newToken = this.getToken();
          if (newToken) {
            newHeaders['Authorization'] = `Bearer ${newToken}`;
          }
          const retryResponse = await fetch(url, {
            method: 'POST',
            headers: newHeaders,
            body: formData,
            credentials: 'include',
          });
          if (!retryResponse.ok) {
            const errorData = await retryResponse.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP error! status: ${retryResponse.status}`);
          }
          return await retryResponse.json();
        }
        this.removeToken();
        throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Upload Error:', error);
      throw error;
    }
  }

  // Decode JWT token để lấy user info (không verify signature)
  public getUserFromToken(): { userId: number; email: string; roleId: number | null; roleName?: string } | null {
    const token = this.getToken();
    if (!token) return null;

    try {
      // JWT format: header.payload.signature
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      // Decode payload (base64url)
      const payload = parts[1];
      const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
      
      return {
        userId: decoded.userId,
        email: decoded.email,
        roleId: decoded.roleId,
        roleName: decoded.roleName
      };
    } catch (error) {
      console.error('Failed to decode token:', error);
      return null;
    }
  }

  // Kiểm tra user có phải admin không
  public isAdmin(): boolean {
    const user = this.getUserFromToken();
    if (!user || !user.roleName) return false;
    const roleName = user.roleName.toUpperCase();
    return roleName === 'ADMIN' || roleName === 'SUPER_ADMIN';
  }

  // Logout - gọi API để xóa refresh token cookie
  public async logout(): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Ignore error
    }
    this.removeToken();
  }
}

// Export singleton instance
export const api = new ApiService(API_BASE_URL);

// Export types
export type { RequestOptions };
