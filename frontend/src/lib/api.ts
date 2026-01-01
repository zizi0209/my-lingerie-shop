// API Service với JWT Authentication

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface RequestOptions extends RequestInit {
  requireAuth?: boolean;
}

class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  // Lấy token từ localStorage
  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
  }

  // Lưu token vào localStorage
  public setToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
    }
  }

  // Xóa token khỏi localStorage
  public removeToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
    }
  }

  // Kiểm tra user có đăng nhập không
  public isAuthenticated(): boolean {
    return !!this.getToken();
  }

  // Request handler với JWT
  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { requireAuth = true, ...fetchOptions } = options;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Thêm Authorization header nếu requireAuth = true
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
        credentials: 'include', // Cho phép gửi cookies và credentials
      });

      // Kiểm tra lỗi authentication
      if (response.status === 401 || response.status === 403) {
        this.removeToken();
        throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
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
        credentials: 'include', // Cho phép gửi cookies và credentials
      });

      if (response.status === 401 || response.status === 403) {
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
}

// Export singleton instance
export const api = new ApiService(API_BASE_URL);

// Export types
export type { RequestOptions };
