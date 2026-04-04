// Authentication configuration - Token expiry times

export const AUTH_CONFIG = {
  ACCESS_TOKEN: {
    USER: {
      expiresInSeconds: 30 * 60, // 30 minutes
      expiresInMs: 30 * 60 * 1000,
    },
    ADMIN: {
      expiresInSeconds: 15 * 60, // 15 minutes  
      expiresInMs: 15 * 60 * 1000,
    },
  },
  REFRESH_TOKEN: {
    USER: {
      expiresInSeconds: 14 * 24 * 60 * 60, // 14 days
      expiresInMs: 14 * 24 * 60 * 60 * 1000,
    },
    ADMIN: {
      expiresInSeconds: 24 * 60 * 60, // 24 hours
      expiresInMs: 24 * 60 * 60 * 1000,
    },
  },
  SESSION: {
    USER: {
      idleExpiresInMs: 2 * 60 * 60 * 1000, // 2 hours
      absoluteExpiresInMs: 14 * 24 * 60 * 60 * 1000, // 14 days
    },
    ADMIN: {
      idleExpiresInMs: 30 * 60 * 1000, // 30 minutes
      absoluteExpiresInMs: 24 * 60 * 60 * 1000, // 24 hours
    },
  },
  COOKIE: {
    NAME: 'refreshToken',
    OPTIONS: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' as const : 'lax' as const,
      path: '/',
    },
  },
  DASHBOARD_AUTH: {
    COOKIE_NAME: 'dashboardAuth',
    EXPIRES_IN_MS: 4 * 60 * 60 * 1000, // 4 giờ
    OPTIONS: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' as const : 'lax' as const,
      path: '/',
    },
  },
};

// Admin role names
export const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN'];

// Check if user is admin based on role name
export function isAdminRole(roleName: string | null | undefined): boolean {
  if (!roleName) return false;
  return ADMIN_ROLES.includes(roleName.toUpperCase());
}
