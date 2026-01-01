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
 * Create Order Schema
 */
export const createOrderSchema = z.object({
  shippingAddress: z.string().min(10, 'Shipping address must be at least 10 characters').max(500),
  shippingCity: z.string().min(2).max(100).optional(),
  shippingPhone: z.string().min(10, 'Phone must be at least 10 digits').max(20),
  shippingMethod: z.string().max(100).optional(),
  paymentMethod: z.enum(['COD', 'BANK_TRANSFER', 'CARD']).default('COD'),
  notes: z.string().max(1000).optional(),
  items: z.array(z.object({
    productId: z.number().int().positive(),
    variantId: z.number().int().positive().optional(),
    quantity: z.number().int().positive().min(1).max(100),
    price: z.number().positive()
  })).min(1, 'Order must have at least 1 item')
});

/**
 * Add to Cart Schema
 */
export const addToCartSchema = z.object({
  productId: z.number().int().positive(),
  variantId: z.number().int().positive().optional(),
  quantity: z.number().int().positive().min(1).max(100).default(1)
});

/**
 * Update Cart Item Schema
 */
export const updateCartItemSchema = z.object({
  quantity: z.number().int().positive().min(0).max(100)
});

/**
 * Post Category Schema
 */
export const postCategorySchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255)
});

/**
 * Create Post Schema
 */
export const createPostSchema = z.object({
  title: z.string().min(1).max(255),
  slug: z.string().min(1).max(255),
  content: z.string().min(10),
  excerpt: z.string().max(500).optional(),
  thumbnail: z.string().url().optional(),
  categoryId: z.number().int().positive(),
  isPublished: z.boolean().default(false)
});

/**
 * Update Post Schema
 */
export const updatePostSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  slug: z.string().min(1).max(255).optional(),
  content: z.string().min(10).optional(),
  excerpt: z.string().max(500).optional(),
  thumbnail: z.string().url().optional(),
  categoryId: z.number().int().positive().optional(),
  isPublished: z.boolean().optional()
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
