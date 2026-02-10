/**
 * Remove sensitive fields from user object
 */
export function sanitizeUser(user: any) {
  if (!user) return null;
  
  const {
    password: _password,
    failedLoginAttempts: _failedLoginAttempts,
    lockedUntil: _lockedUntil,
    tokenVersion: _tokenVersion,
    ...safe
  } = user;
  
  return safe;
}

/**
 * Remove sensitive fields from array of users
 */
export function sanitizeUsers(users: any[]) {
  if (!users || !Array.isArray(users)) return [];
  return users.map(sanitizeUser);
}

/**
 * Sanitize product - remove internal fields
 */
export function sanitizeProduct(product: any) {
  if (!product) return null;
  // Currently no sensitive fields, but keep for future
  return product;
}

/**
 * Sanitize order - remove sensitive user data
 */
export function sanitizeOrder(order: any) {
  if (!order) return null;
  
  if (order.user) {
    order.user = sanitizeUser(order.user);
  }
  
  return order;
}

/**
 * Generic sanitizer - remove specified fields
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  fieldsToRemove: (keyof T)[]
): Partial<T> {
  if (!obj) return obj;
  
  const result = { ...obj };
  fieldsToRemove.forEach(field => delete result[field]);
  return result;
}
