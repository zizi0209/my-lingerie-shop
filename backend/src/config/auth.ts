// Authentication configuration - Token expiry times

export const AUTH_CONFIG = {
  ACCESS_TOKEN: {
    USER: {
      expiresInSeconds: 60 * 60, // 1 hour
      expiresInMs: 60 * 60 * 1000,
    },
    ADMIN: {
      expiresInSeconds: 15 * 60, // 15 minutes  
      expiresInMs: 15 * 60 * 1000,
    },
  },
  REFRESH_TOKEN: {
    USER: {
      expiresInSeconds: 30 * 24 * 60 * 60, // 30 days
      expiresInMs: 30 * 24 * 60 * 60 * 1000,
    },
    ADMIN: {
      expiresInSeconds: 24 * 60 * 60, // 24 hours
      expiresInMs: 24 * 60 * 60 * 1000,
    },
  },
  COOKIE: {
    NAME: 'refreshToken',
    OPTIONS: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
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
