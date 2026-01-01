import { z } from 'zod';

/**
 * Password validation schema
 */
const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password must be less than 100 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

/**
 * User Registration Schema
 */
export const registerSchema = z.object({
  email: z.string().email('Invalid email format').max(255),
  password: passwordSchema,
  name: z.string().max(255).optional(),
  phone: z.string().max(20).optional()
  // NOTE: role is NOT allowed from client
});

/**
 * User Login Schema
 */
export const loginSchema = z.object({
  email: z.string().email('Invalid email').max(255),
  password: z.string().min(1, 'Password is required')
});

/**
 * User Update Schema (Admin only)
 */
export const updateUserSchema = z.object({
  email: z.string().email().max(255).optional(),
  name: z.string().max(255).optional(),
  phone: z.string().max(20).optional(),
  roleId: z.number().int().positive().optional(),
  isActive: z.boolean().optional()
  // NOTE: password change should use separate endpoint
});

/**
 * Password Change Schema
 */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema
});

/**
 * Product Creation Schema
 */
export const createProductSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255),
  description: z.string().optional(),
  price: z.number().positive(),
  salePrice: z.number().positive().optional(),
  categoryId: z.number().int().positive(),
  stock: z.number().int().min(0).default(0)
  // NOTE: isFeatured, isVisible controlled by admin only
});

/**
 * Product Update Schema
 */
export const updateProductSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  slug: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  price: z.number().positive().optional(),
  salePrice: z.number().positive().optional(),
  categoryId: z.number().int().positive().optional(),
  stock: z.number().int().min(0).optional(),
  isFeatured: z.boolean().optional(),
  isVisible: z.boolean().optional()
});

/**
 * Category Schema
 */
export const categorySchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255),
  image: z.string().url().optional()
});

/**
 * Order Status Update Schema
 */
export const updateOrderStatusSchema = z.object({
  status: z.enum(['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'])
});

/**
 * Generic validation helper
 */
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.issues.map((e: z.ZodIssue) => e.message).join(', ');
      throw new Error(messages);
    }
    throw error;
  }
}

/**
 * Safe validation that returns result with error
 */
export function validateSafe<T>(schema: z.ZodSchema<T>, data: unknown) {
  const result = schema.safeParse(data);
  
  if (!result.success) {
    return {
      success: false,
      error: result.error.issues.map((e: z.ZodIssue) => e.message).join(', ')
    };
  }
  
  return {
    success: true,
    data: result.data
  };
}
