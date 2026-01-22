export interface User {
  id: number;
  email: string;
  name: string | null;
  phone?: string | null;
  avatar?: string | null;
  birthday?: string | null;
  memberTier?: string;
  pointBalance?: number;
  totalSpent?: number;
  roleId: number | null;
  role: {
    id: number;
    name: string;
  } | null;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  name?: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    user: User;
    accessToken: string;
    expiresIn: number;
  };
}

export interface ProfileResponse {
  success: boolean;
  data: User;
}
