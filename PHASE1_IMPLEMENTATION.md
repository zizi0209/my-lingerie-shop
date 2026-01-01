# Phase 1 Implementation Guide - Security Foundation

## Step-by-Step Instructions

### Step 1: Backup Current Database Schema

```bash
# Create backup
cd backend/prisma
cp schema.prisma schema.prisma.backup
```

### Step 2: Update User Model with Security Fields

Open `backend/prisma/schema.prisma` and update the User model:

```prisma
model User {
  id          Int       @id @default(autoincrement())
  email       String    @unique
  password    String
  name        String?
  phone       String?
  avatar      String?
  
  // EXISTING: Role based
  roleId      Int?
  role        Role?     @relation(fields: [roleId], references: [id])
  
  // ✅ ADD THESE SECURITY FIELDS
  failedLoginAttempts   Int       @default(0)
  lockedUntil           DateTime?
  lastLoginAt           DateTime?
  passwordChangedAt     DateTime?
  tokenVersion          Int       @default(0)
  
  // Relationships
  orders      Order[]
  posts       Post[]
  cart        Cart?
  auditLogs   AuditLog[]  // ✅ ADD THIS
  
  // Tracking
  isActive    Boolean   @default(true)
  lastLogin   DateTime?
  
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime?
  
  @@index([email])
  @@index([roleId])
}
```

### Step 3: Add Audit Log Model

Add this new model to your schema (after the User model):

```prisma
// ✅ NEW MODEL: Audit Logging
model AuditLog {
  id          String   @id @default(cuid())
  userId      Int
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  action      String   // "DELETE_USER", "UPDATE_PRODUCT_PRICE", etc.
  resource    String   // "USER", "PRODUCT", "ORDER"
  resourceId  String?
  
  oldValue    Json?
  newValue    Json?
  
  ipAddress   String?
  userAgent   String?
  severity    String   @default("INFO") // INFO, WARNING, CRITICAL
  
  createdAt   DateTime @default(now())
  
  @@index([userId])
  @@index([action])
  @@index([resource])
  @@index([createdAt])
  @@map("audit_logs")
}
```

### Step 4: Add Admin Invitation Model

Add this new model:

```prisma
// ✅ NEW MODEL: Admin Invitations
model AdminInvitation {
  id          String    @id @default(cuid())
  email       String
  token       String    @unique
  roleId      Int
  expiresAt   DateTime
  usedAt      DateTime?
  createdBy   Int
  createdAt   DateTime  @default(now())
  
  @@index([token])
  @@index([email])
  @@map("admin_invitations")
}
```

### Step 5: Apply Database Migration

```bash
cd backend

# Push changes to database
npx prisma db push

# Generate Prisma Client
npx prisma generate
```

**Expected output:**
```
✔ Generated Prisma Client
```

### Step 6: Install Security Dependencies

```bash
cd backend

# Core security packages
npm install zod bcrypt helmet express-rate-limit cookie-parser

# File upload security
npm install sharp file-type multer

# TypeScript types
npm install --save-dev @types/bcrypt @types/cookie-parser @types/multer
```

### Step 7: Update Environment Variables

Edit `backend/.env`:

```bash
# Existing variables
DATABASE_URL="your-existing-url"
PORT=3000

# ✅ ADD THESE
NODE_ENV=development

# Generate with: openssl rand -base64 32
JWT_SECRET="your-32-byte-random-secret-here"
JWT_EXPIRES_IN=7d

# Admin seed credentials
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=ChangeMe123!@#

# Cloudinary (if using)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# CORS
FRONTEND_URL=http://localhost:3000
```

**Generate secure JWT secret:**
```bash
# On Mac/Linux
openssl rand -base64 32

# On Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

### Step 8: Create Utils Directory Structure

```bash
cd backend/src
mkdir -p utils
```

### Step 9: Create Constants File

Create `backend/src/utils/constants.ts`:

```typescript
export const AuditActions = {
  // Authentication
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILED: 'LOGIN_FAILED',
  LOGOUT: 'LOGOUT',
  PASSWORD_CHANGE: 'PASSWORD_CHANGE',
  TOKEN_REFRESH: 'TOKEN_REFRESH',
  
  // User Management
  CREATE_USER: 'CREATE_USER',
  UPDATE_USER: 'UPDATE_USER',
  DELETE_USER: 'DELETE_USER',
  CHANGE_ROLE: 'CHANGE_ROLE',
  LOCK_USER: 'LOCK_USER',
  UNLOCK_USER: 'UNLOCK_USER',
  
  // Product Management
  CREATE_PRODUCT: 'CREATE_PRODUCT',
  UPDATE_PRODUCT: 'UPDATE_PRODUCT',
  UPDATE_PRODUCT_PRICE: 'UPDATE_PRODUCT_PRICE',
  DELETE_PRODUCT: 'DELETE_PRODUCT',
  UPDATE_PRODUCT_STOCK: 'UPDATE_PRODUCT_STOCK',
  
  // Category Management
  CREATE_CATEGORY: 'CREATE_CATEGORY',
  UPDATE_CATEGORY: 'UPDATE_CATEGORY',
  DELETE_CATEGORY: 'DELETE_CATEGORY',
  
  // Order Management
  CREATE_ORDER: 'CREATE_ORDER',
  UPDATE_ORDER_STATUS: 'UPDATE_ORDER_STATUS',
  CANCEL_ORDER: 'CANCEL_ORDER',
  REFUND_ORDER: 'REFUND_ORDER',
  
  // Media Management
  UPLOAD_MEDIA: 'UPLOAD_MEDIA',
  DELETE_MEDIA: 'DELETE_MEDIA',
  
  // Configuration
  UPDATE_SETTINGS: 'UPDATE_SETTINGS',
  UPDATE_PERMISSIONS: 'UPDATE_PERMISSIONS'
} as const;

export type AuditAction = typeof AuditActions[keyof typeof AuditActions];

export const AuditSeverity = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  CRITICAL: 'CRITICAL'
} as const;

export type AuditSeverityType = typeof AuditSeverity[keyof typeof AuditSeverity];
```

### Step 10: Create Sanitization Utilities

Create `backend/src/utils/sanitize.ts`:

```typescript
/**
 * Remove sensitive fields from user object
 */
export function sanitizeUser(user: any) {
  if (!user) return null;
  
  const {
    password,
    failedLoginAttempts,
    lockedUntil,
    tokenVersion,
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
```

### Step 11: Create Audit Logging Utility

Create `backend/src/utils/auditLog.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import { Request } from 'express';
import { AuditSeverityType } from './constants';

const prisma = new PrismaClient();

export interface AuditLogData {
  userId: number;
  action: string;
  resource: string;
  resourceId?: string;
  oldValue?: any;
  newValue?: any;
  severity?: AuditSeverityType;
}

/**
 * Create audit log entry
 * @param data - Audit log data
 * @param req - Express request object (for IP and user agent)
 */
export async function auditLog(
  data: AuditLogData,
  req?: Request
): Promise<void> {
  try {
    const log = await prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        resource: data.resource,
        resourceId: data.resourceId,
        oldValue: data.oldValue ? JSON.parse(JSON.stringify(data.oldValue)) : null,
        newValue: data.newValue ? JSON.parse(JSON.stringify(data.newValue)) : null,
        severity: data.severity || 'INFO',
        ipAddress: req?.ip || req?.socket.remoteAddress,
        userAgent: req?.get('user-agent'),
      }
    });

    // Alert on critical events
    if (data.severity === 'CRITICAL') {
      await sendCriticalAlert(log);
    }
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw - logging failure shouldn't break the request
  }
}

/**
 * Send alert for critical security events
 */
async function sendCriticalAlert(log: any): Promise<void> {
  // TODO: Implement your alerting system (Slack, email, PagerDuty, etc.)
  console.error('🚨 CRITICAL SECURITY EVENT:', {
    action: log.action,
    userId: log.userId,
    resource: `${log.resource}:${log.resourceId}`,
    timestamp: log.createdAt,
    ipAddress: log.ipAddress
  });
}

/**
 * Get audit logs with pagination
 */
export async function getAuditLogs(options: {
  page?: number;
  limit?: number;
  action?: string;
  userId?: number;
  severity?: string;
  startDate?: Date;
  endDate?: Date;
}) {
  const {
    page = 1,
    limit = 50,
    action,
    userId,
    severity,
    startDate,
    endDate
  } = options;

  const where: any = {};
  if (action) where.action = action;
  if (userId) where.userId = userId;
  if (severity) where.severity = severity;
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = startDate;
    if (endDate) where.createdAt.lte = endDate;
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.auditLog.count({ where })
  ]);

  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
}
```

### Step 12: Create Validation Schemas

Create `backend/src/utils/validation.ts`:

```typescript
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
      const messages = error.errors.map(e => e.message).join(', ');
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
      error: result.error.errors.map(e => e.message).join(', ')
    };
  }
  
  return {
    success: true,
    data: result.data
  };
}
```

### Step 13: Create Admin Seed Script

Create `backend/prisma/seed.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Create Admin Role if not exists
  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: {
      name: 'ADMIN',
      description: 'Administrator with full system access'
    }
  });

  console.log('✅ Admin role created/updated');

  // 2. Create Super Admin Role
  const superAdminRole = await prisma.role.upsert({
    where: { name: 'SUPER_ADMIN' },
    update: {},
    create: {
      name: 'SUPER_ADMIN',
      description: 'Super Administrator with unrestricted access'
    }
  });

  console.log('✅ Super Admin role created/updated');

  // 3. Create User Role
  const userRole = await prisma.role.upsert({
    where: { name: 'USER' },
    update: {},
    create: {
      name: 'USER',
      description: 'Regular customer user'
    }
  });

  console.log('✅ User role created/updated');

  // 4. Create Super Admin User
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    throw new Error('❌ ADMIN_PASSWORD environment variable is required');
  }

  if (adminPassword.length < 12) {
    throw new Error('❌ Admin password must be at least 12 characters');
  }

  // Check password strength
  const hasUpperCase = /[A-Z]/.test(adminPassword);
  const hasLowerCase = /[a-z]/.test(adminPassword);
  const hasNumber = /[0-9]/.test(adminPassword);
  
  if (!hasUpperCase || !hasLowerCase || !hasNumber) {
    throw new Error('❌ Admin password must contain uppercase, lowercase, and numbers');
  }

  const hashedPassword = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      password: hashedPassword,
      roleId: superAdminRole.id,
      passwordChangedAt: new Date(),
      isActive: true
    },
    create: {
      email: adminEmail,
      password: hashedPassword,
      name: 'System Administrator',
      roleId: superAdminRole.id,
      passwordChangedAt: new Date(),
      isActive: true,
      failedLoginAttempts: 0,
      tokenVersion: 0
    }
  });

  console.log('✅ Super Admin user created/updated:');
  console.log(`   📧 Email: ${admin.email}`);
  console.log(`   🔑 Role: SUPER_ADMIN (ID: ${superAdminRole.id})`);
  console.log(`   🆔 User ID: ${admin.id}`);
  console.log('');
  console.log('⚠️  IMPORTANT: Change the admin password after first login!');
  console.log('⚠️  Current password is stored in .env file');

  // 5. Create some basic permissions (optional)
  const permissions = [
    { name: 'users.read', description: 'View users' },
    { name: 'users.write', description: 'Create/update users' },
    { name: 'users.delete', description: 'Delete users' },
    { name: 'products.read', description: 'View products' },
    { name: 'products.write', description: 'Create/update products' },
    { name: 'products.delete', description: 'Delete products' },
    { name: 'orders.read', description: 'View orders' },
    { name: 'orders.write', description: 'Update orders' },
    { name: 'settings.write', description: 'Modify system settings' }
  ];

  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { name: perm.name },
      update: {},
      create: perm
    });
  }

  console.log(`✅ Created ${permissions.length} permissions`);
  console.log('');
  console.log('🎉 Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

### Step 14: Add Seed Script to package.json

Edit `backend/package.json` and add:

```json
{
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "seed": "ts-node prisma/seed.ts"
  }
}
```

### Step 15: Run Seed Script

```bash
cd backend
npm run seed
```

**Expected output:**
```
🌱 Starting database seed...
✅ Admin role created/updated
✅ Super Admin role created/updated
✅ User role created/updated
✅ Super Admin user created/updated:
   📧 Email: admin@yourdomain.com
   🔑 Role: SUPER_ADMIN (ID: 1)
   🆔 User ID: 1

⚠️  IMPORTANT: Change the admin password after first login!
✅ Created 9 permissions
🎉 Database seed completed successfully!
```

---

## ✅ Phase 1 Completion Checklist

Verify all tasks are completed:

### Database
- [ ] User model updated with security fields
- [ ] AuditLog model created
- [ ] AdminInvitation model created
- [ ] `npx prisma db push` successful
- [ ] `npx prisma generate` successful

### Dependencies
- [ ] zod installed
- [ ] bcrypt installed
- [ ] helmet installed
- [ ] express-rate-limit installed
- [ ] sharp installed
- [ ] file-type installed
- [ ] All TypeScript types installed

### Environment
- [ ] JWT_SECRET generated (32+ bytes)
- [ ] ADMIN_EMAIL configured
- [ ] ADMIN_PASSWORD configured (12+ chars, strong)
- [ ] NODE_ENV set
- [ ] All variables in .env file

### Utilities
- [ ] constants.ts created
- [ ] sanitize.ts created
- [ ] auditLog.ts created
- [ ] validation.ts created

### Seed
- [ ] seed.ts created
- [ ] Seed script added to package.json
- [ ] Seed executed successfully
- [ ] Admin user created in database

### Verification
- [ ] Check admin exists: `SELECT * FROM "User" WHERE email = 'your-admin-email';`
- [ ] Check roles exist: `SELECT * FROM "Role";`
- [ ] Check permissions exist: `SELECT * FROM "Permission";`
- [ ] TypeScript compiles without errors: `npm run build`

---

## 🚨 Troubleshooting

### Issue: "JWT_SECRET not found"
**Solution:** Make sure `.env` file exists and JWT_SECRET is set. Restart your terminal.

### Issue: "Prisma client not generated"
**Solution:**
```bash
npx prisma generate
```

### Issue: "Foreign key constraint failed"
**Solution:** Database has existing data. Either:
1. Clear database: `npx prisma db push --force-reset`
2. Or manually handle existing data

### Issue: "bcrypt compilation failed"
**Solution:**
```bash
npm rebuild bcrypt
# Or on Windows:
npm install --build-from-source bcrypt
```

### Issue: "Seed script fails"
**Solution:** Check:
1. ADMIN_PASSWORD is at least 12 chars
2. ADMIN_PASSWORD has uppercase, lowercase, and numbers
3. Database connection is working

---

## Next Steps

Once Phase 1 is complete, proceed to **Phase 2: Admin Authentication & Authorization** in the main roadmap.

**File location:** `DASHBOARD_SETUP_ROADMAP.md`
