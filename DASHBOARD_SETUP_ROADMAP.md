# Dashboard Setup Roadmap - Lingerie Shop

Complete roadmap for building a secure admin dashboard with API integration, following OWASP Top 10 security best practices.

## Current State Analysis

### ✅ What We Have
- Express.js backend with TypeScript
- Prisma ORM with PostgreSQL
- Basic authentication (register/login)
- JWT authentication middleware (`authenticateToken`)
- Existing routes: users, products, categories, orders, carts, media, posts, roles, permissions
- CORS configured

### ❌ What's Missing (Security Critical)
- [ ] Admin authorization (role-based access control)
- [ ] Rate limiting (brute-force protection)
- [ ] Audit logging (compliance & forensics)
- [ ] Input validation (mass assignment prevention)
- [ ] Output sanitization (data leak prevention)
- [ ] File upload security (RCE prevention)
- [ ] CSRF protection
- [ ] Security headers (Helmet)
- [ ] Account lockout mechanism
- [ ] Strong password requirements
- [ ] Error handling (no info disclosure)

---

## Roadmap Overview

| Phase | Duration | Focus | Risk Level |
|-------|----------|-------|------------|
| **Phase 1** | 1 day | Security Foundation | 🔴 Critical |
| **Phase 2** | 2 days | Admin Authentication & Authorization | 🔴 Critical |
| **Phase 3** | 1 day | Input Validation & Sanitization | 🟠 High |
| **Phase 4** | 1 day | Audit Logging & Rate Limiting | 🟠 High |
| **Phase 5** | 1 day | File Upload Security | 🟡 Medium |
| **Phase 6** | 2 days | Admin Dashboard API Routes | 🟡 Medium |
| **Phase 7** | 1 day | Frontend Dashboard (Next.js) | 🟢 Low |
| **Phase 8** | 1 day | Testing & Security Validation | 🔴 Critical |

**Total Estimated Time**: 10 days

---

## Phase 1: Security Foundation (Day 1)

### Objectives
- Update database schema with security fields
- Install security dependencies
- Configure security middleware

### Tasks

#### 1.1 Update Database Schema

```prisma
// backend/prisma/schema.prisma

enum UserRole {
  USER
  ADMIN
  SUPER_ADMIN
}

model User {
  id                    String    @id @default(cuid())
  email                 String    @unique
  password              String
  name                  String?
  role                  UserRole  @default(USER)
  
  // Security fields (ADD THESE)
  failedLoginAttempts   Int       @default(0)
  lockedUntil           DateTime?
  lastLoginAt           DateTime?
  passwordChangedAt     DateTime?
  tokenVersion          Int       @default(0)
  
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
  
  // Relations
  auditLogs             AuditLog[]
  carts                 Cart[]
  orders                Order[]
  // ... existing relations
  
  @@index([email])
  @@index([role])
}

// NEW: Audit Log Model
model AuditLog {
  id          String   @id @default(cuid())
  userId      String
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
}

// NEW: Admin Invitation Model
model AdminInvitation {
  id          String    @id @default(cuid())
  email       String
  token       String    @unique
  role        UserRole  @default(ADMIN)
  expiresAt   DateTime
  usedAt      DateTime?
  createdBy   String
  createdAt   DateTime  @default(now())
  
  @@index([token])
  @@index([email])
}
```

**Commands:**
```bash
cd backend
npx prisma db push
npx prisma generate
```

#### 1.2 Install Security Dependencies

```bash
cd backend
npm install zod bcrypt helmet express-rate-limit cookie-parser csurf sharp file-type
npm install --save-dev @types/bcrypt @types/cookie-parser @types/csurf
```

#### 1.3 Update Environment Variables

```bash
# backend/.env

# Existing
DATABASE_URL="your-database-url"
PORT=3000

# NEW: Add these
JWT_SECRET="generate-with-openssl-rand-base64-32"
JWT_EXPIRES_IN="7d"
NODE_ENV="development"

# Cloudinary (if using)
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# Admin seed
ADMIN_EMAIL="admin@yourdomain.com"
ADMIN_PASSWORD="ChangeMe123!@#"

# Frontend URL (for CORS)
FRONTEND_URL="http://localhost:3000"
```

**Generate secure JWT secret:**
```bash
openssl rand -base64 32
```

#### 1.4 Create Utility Functions

**Create file structure:**
```bash
backend/src/
├── utils/
│   ├── validation.ts      # Zod schemas
│   ├── sanitize.ts        # Output sanitization
│   ├── auditLog.ts        # Audit logging
│   └── constants.ts       # Action constants
```

**File: `backend/src/utils/constants.ts`**
```typescript
export const AuditActions = {
  // Auth
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILED: 'LOGIN_FAILED',
  LOGOUT: 'LOGOUT',
  PASSWORD_CHANGE: 'PASSWORD_CHANGE',
  
  // User management
  CREATE_USER: 'CREATE_USER',
  UPDATE_USER: 'UPDATE_USER',
  DELETE_USER: 'DELETE_USER',
  CHANGE_ROLE: 'CHANGE_ROLE',
  
  // Product management
  CREATE_PRODUCT: 'CREATE_PRODUCT',
  UPDATE_PRODUCT: 'UPDATE_PRODUCT',
  UPDATE_PRODUCT_PRICE: 'UPDATE_PRODUCT_PRICE',
  DELETE_PRODUCT: 'DELETE_PRODUCT',
  
  // Order management
  UPDATE_ORDER_STATUS: 'UPDATE_ORDER_STATUS',
  REFUND_ORDER: 'REFUND_ORDER',
  CANCEL_ORDER: 'CANCEL_ORDER'
} as const;
```

**File: `backend/src/utils/sanitize.ts`**
```typescript
export function sanitizeUser(user: any) {
  if (!user) return null;
  
  const {
    password,
    resetToken,
    resetTokenExpiry,
    failedLoginAttempts,
    lockedUntil,
    tokenVersion,
    ...safe
  } = user;
  
  return safe;
}

export function sanitizeUsers(users: any[]) {
  return users.map(sanitizeUser);
}
```

**File: `backend/src/utils/auditLog.ts`**
```typescript
import { PrismaClient } from '@prisma/client';
import { Request } from 'express';

const prisma = new PrismaClient();

export interface AuditLogData {
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  oldValue?: any;
  newValue?: any;
  severity?: 'INFO' | 'WARNING' | 'CRITICAL';
}

export async function auditLog(data: AuditLogData, req?: Request) {
  try {
    await prisma.auditLog.create({
      data: {
        ...data,
        severity: data.severity || 'INFO',
        oldValue: data.oldValue ? JSON.parse(JSON.stringify(data.oldValue)) : null,
        newValue: data.newValue ? JSON.parse(JSON.stringify(data.newValue)) : null,
        ipAddress: req?.ip,
        userAgent: req?.get('user-agent'),
      }
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
}
```

**File: `backend/src/utils/validation.ts`**
```typescript
import { z } from 'zod';

const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(100)
  .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Must contain at least one number');

export const registerSchema = z.object({
  email: z.string().email('Invalid email format').max(255),
  password: passwordSchema,
  name: z.string().max(255).optional()
});

export const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1)
});

export const updateUserSchema = z.object({
  email: z.string().email().max(255).optional(),
  name: z.string().max(255).optional(),
  role: z.enum(['USER', 'ADMIN', 'SUPER_ADMIN']).optional()
});

export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}
```

### ✅ Phase 1 Checklist
- [ ] Database schema updated with security fields
- [ ] Dependencies installed
- [ ] Environment variables configured
- [ ] JWT secret generated (minimum 32 bytes)
- [ ] Utility functions created
- [ ] Database migration successful

---

## Phase 2: Admin Authentication & Authorization (Days 2-3)

### Objectives
- Create admin-only middleware
- Update authentication to verify role from database
- Implement account lockout
- Create admin seed script

### Tasks

#### 2.1 Update Authentication Middleware

**File: `backend/src/middleware/requireAuth.ts`** (NEW)
```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  tokenVersion: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
      };
    }
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

    // CRITICAL: Verify from database, don't trust JWT
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        lockedUntil: true,
        passwordChangedAt: true,
        tokenVersion: true
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Check account lock
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return res.status(403).json({
        error: 'Account locked',
        lockedUntil: user.lockedUntil.toISOString()
      });
    }

    // Check token version
    if (decoded.tokenVersion !== user.tokenVersion) {
      return res.status(401).json({ error: 'Token revoked' });
    }

    // Check password change
    if (user.passwordChangedAt) {
      const pwdChangedTime = Math.floor(user.passwordChangedAt.getTime() / 1000);
      if (decoded.iat && decoded.iat < pwdChangedTime) {
        return res.status(401).json({ error: 'Password changed. Please login again.' });
      }
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(500).json({ error: 'Authentication failed' });
  }
}
```

#### 2.2 Create Admin Authorization Middleware

**File: `backend/src/middleware/requireAdmin.ts`** (NEW)
```typescript
import { Request, Response, NextFunction } from 'express';
import { requireAuth } from './requireAuth';

export const requireAdmin = [
  requireAuth,
  (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        error: 'Admin privileges required'
      });
    }
    next();
  }
];
```

#### 2.3 Update User Controller with Security

**Update `backend/src/controllers/userController.ts`:**
- Add account lockout logic to login
- Add password hashing with bcrypt (cost 12)
- Add audit logging
- Add input validation
- Add output sanitization

**Key changes:**
```typescript
import bcrypt from 'bcrypt';
import { auditLog } from '../utils/auditLog';
import { AuditActions } from '../utils/constants';
import { sanitizeUser } from '../utils/sanitize';
import { validate, registerSchema, loginSchema } from '../utils/validation';

// In register function
const validated = validate(registerSchema, req.body);
const hashedPassword = await bcrypt.hash(validated.password, 12);
// ... create user with role: 'USER' hardcoded

// In login function
// Add account lockout logic
if (user.lockedUntil && user.lockedUntil > new Date()) {
  await auditLog({
    userId: user.id,
    action: AuditActions.LOGIN_FAILED,
    resource: 'USER',
    resourceId: user.id,
    severity: 'WARNING'
  }, req);
  
  return res.status(403).json({ error: 'Account locked' });
}

const valid = await bcrypt.compare(password, user.password);

if (!valid) {
  const failedAttempts = user.failedLoginAttempts + 1;
  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginAttempts: failedAttempts,
      lockedUntil: failedAttempts >= 5 
        ? new Date(Date.now() + 15 * 60 * 1000)
        : null
    }
  });
  // ... audit log
}

// Reset on success
await prisma.user.update({
  where: { id: user.id },
  data: {
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastLoginAt: new Date()
  }
});
```

#### 2.4 Create Admin Seed Script

**File: `backend/prisma/seed.ts`** (NEW)
```typescript
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    throw new Error('ADMIN_PASSWORD required in .env');
  }

  if (adminPassword.length < 12) {
    throw new Error('Admin password must be at least 12 characters');
  }

  const hashedPassword = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    create: {
      email: adminEmail,
      password: hashedPassword,
      name: 'System Administrator',
      role: 'SUPER_ADMIN',
      passwordChangedAt: new Date()
    },
    update: {
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      passwordChangedAt: new Date()
    }
  });

  console.log('✅ Admin created:', admin.email);
  console.log('⚠️  Change password after first login!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

**Add to package.json:**
```json
{
  "scripts": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

**Run:**
```bash
npm run seed
```

### ✅ Phase 2 Checklist
- [ ] `requireAuth` middleware updated
- [ ] `requireAdmin` middleware created
- [ ] User controller updated with security
- [ ] Password hashing uses bcrypt cost 12
- [ ] Account lockout after 5 failed attempts
- [ ] Audit logging implemented
- [ ] Input validation with Zod
- [ ] Output sanitization
- [ ] Admin seed script created and run
- [ ] Test: Regular user cannot access admin routes

---

## Phase 3: Input Validation & Sanitization (Day 4)

### Objectives
- Implement validation for all admin routes
- Prevent mass assignment vulnerabilities
- Sanitize all outputs

### Tasks

#### 3.1 Create Validation Schemas for All Resources

**Update `backend/src/utils/validation.ts`:**
```typescript
// Product schemas
export const createProductSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  price: z.number().positive(),
  stock: z.number().int().min(0),
  categoryId: z.string().cuid()
  // DO NOT allow: status, featured, etc. from untrusted input
});

export const updateProductSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  price: z.number().positive().optional(),
  stock: z.number().int().min(0).optional(),
  categoryId: z.string().cuid().optional()
});

// Order schemas
export const updateOrderStatusSchema = z.object({
  status: z.enum(['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'])
});

// Category schemas
export const createCategorySchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional()
});

// Add more schemas for your other resources...
```

#### 3.2 Update All Controllers

For each controller, ensure:
1. **Input validation** with appropriate schema
2. **Output sanitization** (exclude sensitive fields)
3. **Mass assignment prevention** (whitelist fields)

**Example for Product Controller:**
```typescript
import { validate, createProductSchema, updateProductSchema } from '../utils/validation';

// CREATE
export async function createProduct(req: Request, res: Response) {
  try {
    const validated = validate(createProductSchema, req.body);
    
    const product = await prisma.product.create({
      data: {
        ...validated,
        // Hardcode fields that shouldn't come from client
        status: 'DRAFT',
        featured: false,
        createdById: req.user!.id
      }
    });

    await auditLog({
      userId: req.user!.id,
      action: AuditActions.CREATE_PRODUCT,
      resource: 'PRODUCT',
      resourceId: product.id,
      newValue: product,
      severity: 'INFO'
    }, req);

    res.status(201).json(product);
  } catch (error) {
    // ... handle error
  }
}
```

#### 3.3 Create Sanitizer for Each Resource

```typescript
// backend/src/utils/sanitize.ts

export function sanitizeProduct(product: any) {
  // Exclude internal fields if needed
  return product;
}

export function sanitizeOrder(order: any) {
  if (!order) return null;
  
  // Sanitize nested user data
  if (order.user) {
    order.user = sanitizeUser(order.user);
  }
  
  return order;
}
```

### ✅ Phase 3 Checklist
- [ ] Validation schemas for all resources
- [ ] All controllers use validation
- [ ] Mass assignment prevented (whitelist approach)
- [ ] All outputs sanitized
- [ ] Test: Cannot set `role` via user update
- [ ] Test: Cannot set `price` directly (only through admin)

---

## Phase 4: Audit Logging & Rate Limiting (Day 5)

### Objectives
- Implement rate limiting on all endpoints
- Add comprehensive audit logging
- Set up security alerts

### Tasks

#### 4.1 Create Rate Limiters

**File: `backend/src/middleware/rateLimiter.ts`** (NEW)
```typescript
import rateLimit from 'express-rate-limit';

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  message: 'Too many login attempts. Try again in 15 minutes.'
});

export const adminApiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100
});

export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 200
});
```

#### 4.2 Apply Rate Limiters

**Update `backend/src/server.ts`:**
```typescript
import { loginLimiter, adminApiLimiter, apiLimiter } from './middleware/rateLimiter';

// Apply general rate limiting
app.use('/api', apiLimiter);

// Login rate limiting
app.post('/api/users/login', loginLimiter, ...);

// Admin routes rate limiting
app.use('/api/admin', adminApiLimiter);
```

#### 4.3 Add Audit Logging to Critical Actions

Update controllers to log:
- User CRUD (especially DELETE, role changes)
- Product price changes
- Order status changes
- Order refunds
- Configuration changes

```typescript
// Example: Delete user
export async function deleteUser(req: Request, res: Response) {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Prevent self-deletion
  if (user.id === req.user!.id) {
    return res.status(400).json({ error: 'Cannot delete own account' });
  }

  await prisma.user.delete({ where: { id: req.params.id } });

  await auditLog({
    userId: req.user!.id,
    action: AuditActions.DELETE_USER,
    resource: 'USER',
    resourceId: req.params.id,
    oldValue: sanitizeUser(user),
    newValue: null,
    severity: 'CRITICAL'
  }, req);

  res.status(204).send();
}
```

### ✅ Phase 4 Checklist
- [ ] Rate limiters created
- [ ] Login rate limited (5 attempts/15 min)
- [ ] Admin API rate limited (100/min)
- [ ] Audit logs for all DELETE operations
- [ ] Audit logs for role changes
- [ ] Audit logs for price changes
- [ ] Audit logs for order refunds
- [ ] Test: 6th login attempt blocked

---

## Phase 5: File Upload Security (Day 6)

### Objectives
- Implement secure file upload
- Validate file types by magic numbers
- Re-process images to remove embedded code

### Tasks

#### 5.1 Update Media Routes

**File: `backend/src/routes/mediaRoutes.ts`:**
```typescript
import multer from 'multer';
import sharp from 'sharp';
import { fileTypeFromBuffer } from 'file-type';
import { requireAdmin } from '../middleware/requireAdmin';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1
  }
});

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_PIXELS = 268402689; // ~16384x16384

router.post('/upload', 
  requireAdmin, 
  upload.single('file'), 
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file' });
    }

    // 1. Check size
    if (req.file.size > 5 * 1024 * 1024) {
      return res.status(400).json({ error: 'File too large' });
    }

    // 2. Verify magic numbers
    const fileType = await fileTypeFromBuffer(req.file.buffer);
    if (!fileType || !ALLOWED_TYPES.includes(fileType.mime)) {
      return res.status(400).json({ error: 'Invalid file type' });
    }

    // 3. Re-process with sharp
    const processed = await sharp(req.file.buffer, {
      limitInputPixels: MAX_PIXELS
    })
      .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();

    // 4. Upload to Cloudinary
    // ... (your existing upload logic)

    res.json({ url: uploadResult.secure_url });
});
```

### ✅ Phase 5 Checklist
- [ ] File upload validates magic numbers
- [ ] Images re-processed with sharp
- [ ] File size limited to 5MB
- [ ] Pixel dimensions limited
- [ ] Test: .php file rejected
- [ ] Test: Large file rejected
- [ ] Test: Pixel bomb rejected

---

## Phase 6: Admin Dashboard API Routes (Days 7-8)

### Objectives
- Create dedicated admin routes
- Separate from public routes
- Apply all security controls

### Tasks

#### 6.1 Create Admin Routes Structure

```bash
backend/src/routes/admin/
├── index.ts           # Main router
├── users.ts           # User management
├── products.ts        # Product management
├── orders.ts          # Order management
├── categories.ts      # Category management
├── auditLogs.ts       # Audit log viewer
└── dashboard.ts       # Dashboard stats
```

#### 6.2 Create Admin Router

**File: `backend/src/routes/admin/index.ts`** (NEW)
```typescript
import express from 'express';
import { requireAdmin } from '../../middleware/requireAdmin';
import { adminApiLimiter } from '../../middleware/rateLimiter';

import usersRouter from './users';
import productsRouter from './products';
import ordersRouter from './orders';
import categoriesRouter from './categories';
import auditLogsRouter from './auditLogs';
import dashboardRouter from './dashboard';

const router = express.Router();

// Apply middleware to ALL admin routes
router.use(adminApiLimiter);
router.use(requireAdmin);

// Mount sub-routers
router.use('/users', usersRouter);
router.use('/products', productsRouter);
router.use('/orders', ordersRouter);
router.use('/categories', categoriesRouter);
router.use('/audit-logs', auditLogsRouter);
router.use('/dashboard', dashboardRouter);

export default router;
```

#### 6.3 Implement Admin User Management

**File: `backend/src/routes/admin/users.ts`** (NEW)
```typescript
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { sanitizeUser, sanitizeUsers } from '../../utils/sanitize';
import { auditLog } from '../../utils/auditLog';
import { AuditActions } from '../../utils/constants';
import { validate, updateUserSchema } from '../../utils/validation';

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/admin/users - List all users
router.get('/', async (req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' }
  });
  res.json(sanitizeUsers(users));
});

// GET /api/admin/users/:id - Get single user
router.get('/:id', async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id }
  });
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  res.json(sanitizeUser(user));
});

// PUT /api/admin/users/:id - Update user
router.put('/:id', async (req, res) => {
  const validated = validate(updateUserSchema, req.body);
  
  const oldUser = await prisma.user.findUnique({
    where: { id: req.params.id }
  });
  
  if (!oldUser) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  const updated = await prisma.user.update({
    where: { id: req.params.id },
    data: validated
  });
  
  await auditLog({
    userId: req.user!.id,
    action: validated.role !== oldUser.role 
      ? AuditActions.CHANGE_ROLE 
      : AuditActions.UPDATE_USER,
    resource: 'USER',
    resourceId: req.params.id,
    oldValue: sanitizeUser(oldUser),
    newValue: sanitizeUser(updated),
    severity: validated.role !== oldUser.role ? 'CRITICAL' : 'INFO'
  }, req);
  
  res.json(sanitizeUser(updated));
});

// DELETE /api/admin/users/:id - Delete user
router.delete('/:id', async (req, res) => {
  if (req.params.id === req.user!.id) {
    return res.status(400).json({ error: 'Cannot delete own account' });
  }
  
  const user = await prisma.user.findUnique({
    where: { id: req.params.id }
  });
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  await prisma.user.delete({ where: { id: req.params.id } });
  
  await auditLog({
    userId: req.user!.id,
    action: AuditActions.DELETE_USER,
    resource: 'USER',
    resourceId: req.params.id,
    oldValue: sanitizeUser(user),
    newValue: null,
    severity: 'CRITICAL'
  }, req);
  
  res.status(204).send();
});

export default router;
```

#### 6.4 Implement Dashboard Stats

**File: `backend/src/routes/admin/dashboard.ts`** (NEW)
```typescript
import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

router.get('/stats', async (req, res) => {
  const [
    totalUsers,
    totalProducts,
    totalOrders,
    pendingOrders,
    revenue
  ] = await Promise.all([
    prisma.user.count(),
    prisma.product.count(),
    prisma.order.count(),
    prisma.order.count({ where: { status: 'PENDING' } }),
    prisma.order.aggregate({
      _sum: { totalAmount: true },
      where: { status: 'DELIVERED' }
    })
  ]);

  res.json({
    totalUsers,
    totalProducts,
    totalOrders,
    pendingOrders,
    revenue: revenue._sum.totalAmount || 0
  });
});

router.get('/recent-orders', async (req, res) => {
  const orders = await prisma.order.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { id: true, email: true, name: true } },
      items: true
    }
  });

  res.json(orders);
});

export default router;
```

#### 6.5 Implement Audit Log Viewer

**File: `backend/src/routes/admin/auditLogs.ts`** (NEW)
```typescript
import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

router.get('/', async (req, res) => {
  const { page = 1, limit = 50, action, userId, severity } = req.query;

  const where: any = {};
  if (action) where.action = action as string;
  if (userId) where.userId = userId as string;
  if (severity) where.severity = severity as string;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { email: true, name: true } }
      },
      orderBy: { createdAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit)
    }),
    prisma.auditLog.count({ where })
  ]);

  res.json({
    logs,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit))
    }
  });
});

export default router;
```

#### 6.6 Update Main Server

**Update `backend/src/server.ts`:**
```typescript
import adminRoutes from './routes/admin';

// ... existing routes

// Admin routes (protected)
app.use('/api/admin', adminRoutes);
```

### ✅ Phase 6 Checklist
- [ ] Admin routes structure created
- [ ] User management API complete
- [ ] Product management API complete
- [ ] Order management API complete
- [ ] Dashboard stats API
- [ ] Audit log viewer API
- [ ] All routes protected with `requireAdmin`
- [ ] Test: Regular user cannot access any admin route

---

## Phase 7: Frontend Dashboard (Next.js) (Day 9)

### Objectives
- Create admin dashboard UI
- Implement authentication flow
- Connect to admin API

### Tasks

#### 7.1 Create Middleware

**File: `frontend/src/middleware.ts`**
```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;

  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*']
};
```

#### 7.2 Create API Client

**File: `frontend/src/lib/api.ts`**
```typescript
class ApiClient {
  private baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('token', token);
  }

  async request(endpoint: string, options: RequestInit = {}) {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Request failed');
    }

    return res.json();
  }

  // Auth
  async login(email: string, password: string) {
    return this.request('/users/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  }

  // Admin API
  async getUsers() {
    return this.request('/admin/users');
  }

  async getDashboardStats() {
    return this.request('/admin/dashboard/stats');
  }

  async getAuditLogs(params: any) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/admin/audit-logs?${query}`);
  }
}

export const api = new ApiClient();
```

#### 7.3 Create Admin Layout

```typescript
// frontend/src/app/admin/layout.tsx
export default function AdminLayout({ children }) {
  return (
    <div className="flex h-screen">
      <aside className="w-64 bg-gray-900 text-white p-4">
        <nav>
          <Link href="/admin/dashboard">Dashboard</Link>
          <Link href="/admin/users">Users</Link>
          <Link href="/admin/products">Products</Link>
          <Link href="/admin/orders">Orders</Link>
          <Link href="/admin/audit-logs">Audit Logs</Link>
        </nav>
      </aside>
      <main className="flex-1 p-8">
        {children}
      </main>
    </div>
  );
}
```

### ✅ Phase 7 Checklist
- [ ] Middleware redirects unauthenticated users
- [ ] API client with token management
- [ ] Login page
- [ ] Admin layout with navigation
- [ ] Dashboard page with stats
- [ ] Users management page
- [ ] Audit logs page
- [ ] Test: Cannot access /admin without login

---

## Phase 8: Testing & Security Validation (Day 10)

### Objectives
- Run comprehensive security tests
- Validate all security controls
- Fix any vulnerabilities found

### Tasks

#### 8.1 Manual Security Tests

```bash
# Test 1: Regular user cannot access admin routes
curl -X GET http://localhost:3000/api/admin/users \
  -H "Authorization: Bearer USER_TOKEN"
# Expected: 403 Forbidden

# Test 2: Mass assignment prevention
curl -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Pass123","role":"ADMIN"}'
# Expected: User created with role=USER

# Test 3: Rate limiting
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/users/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@test.com","password":"wrong"}'
done
# Expected: 6th request returns 429

# Test 4: File upload validation
curl -X POST http://localhost:3000/api/media/upload \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -F "file=@shell.php"
# Expected: 400 Invalid file type

# Test 5: Account lockout
# (Login with wrong password 5 times)
# Expected: Account locked for 15 minutes
```

#### 8.2 Automated Tests

**Create `backend/src/__tests__/security.test.ts`:**
```typescript
import request from 'supertest';
import app from '../server';

describe('Admin Security', () => {
  let adminToken: string;
  let userToken: string;

  beforeAll(async () => {
    // Get tokens
    adminToken = await getAdminToken();
    userToken = await getUserToken();
  });

  test('Regular user cannot access admin routes', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${userToken}`);
    
    expect(res.status).toBe(403);
  });

  test('Cannot set admin role via registration', async () => {
    const res = await request(app)
      .post('/api/users/register')
      .send({
        email: 'test@test.com',
        password: 'Password123',
        role: 'ADMIN'
      });
    
    const user = await prisma.user.findUnique({
      where: { email: 'test@test.com' }
    });
    
    expect(user?.role).toBe('USER');
  });

  test('Rate limiter blocks excessive login attempts', async () => {
    const attempts = Array(10).fill(null).map(() =>
      request(app)
        .post('/api/users/login')
        .send({ email: 'test@test.com', password: 'wrong' })
    );
    
    const results = await Promise.all(attempts);
    const blocked = results.filter(r => r.status === 429);
    
    expect(blocked.length).toBeGreaterThan(0);
  });

  test('Audit log created on user deletion', async () => {
    const user = await createTestUser();
    
    await request(app)
      .delete(`/api/admin/users/${user.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    
    const log = await prisma.auditLog.findFirst({
      where: {
        action: 'DELETE_USER',
        resourceId: user.id
      }
    });
    
    expect(log).toBeTruthy();
    expect(log?.severity).toBe('CRITICAL');
  });
});
```

**Run tests:**
```bash
npm test
```

#### 8.3 Security Checklist Validation

Go through the complete checklist:

**Authentication & Authorization:**
- [ ] No public admin registration
- [ ] All admin routes protected with `requireAdmin`
- [ ] Role verified from database, not JWT
- [ ] Regular users blocked from admin routes

**Input Validation:**
- [ ] All inputs validated with Zod
- [ ] Mass assignment prevented
- [ ] Cannot set `role` via user update
- [ ] Cannot set sensitive fields from client

**Output Sanitization:**
- [ ] Password excluded from responses
- [ ] Token version excluded
- [ ] Failed login attempts excluded
- [ ] All user responses sanitized

**Rate Limiting:**
- [ ] Login limited to 5 attempts/15 min
- [ ] Admin API limited to 100/min
- [ ] Account lockout after 5 failed attempts

**Audit Logging:**
- [ ] DELETE operations logged
- [ ] Role changes logged
- [ ] Price changes logged
- [ ] Logs include IP, user agent, timestamp

**File Upload:**
- [ ] Magic number validation
- [ ] Image re-processing with sharp
- [ ] Size limit (5MB)
- [ ] Pixel limit enforced

**Error Handling:**
- [ ] Production mode hides stack traces
- [ ] Generic error messages
- [ ] No sensitive data in errors

**Security Headers:**
- [ ] Helmet middleware installed
- [ ] HTTPS only in production
- [ ] CORS configured correctly

#### 8.4 Dependency Security

```bash
npm audit
npm audit fix
```

### ✅ Phase 8 Checklist
- [ ] All manual tests passed
- [ ] Automated tests written and passing
- [ ] Security checklist validated
- [ ] No critical npm vulnerabilities
- [ ] Documentation updated

---

## Deployment Checklist

Before deploying to production:

### Environment
- [ ] `NODE_ENV=production`
- [ ] Strong JWT secret (32+ bytes)
- [ ] HTTPS enabled
- [ ] Database backups configured

### Security
- [ ] Admin created via seed script
- [ ] Default admin password changed
- [ ] All secrets in environment variables
- [ ] No secrets in git history
- [ ] Rate limiters active
- [ ] Security headers configured
- [ ] CORS properly configured

### Monitoring
- [ ] Error logging configured (Sentry, etc.)
- [ ] Audit logs being stored
- [ ] Critical events trigger alerts
- [ ] Uptime monitoring enabled

### Testing
- [ ] All security tests passing
- [ ] Load testing completed
- [ ] Penetration testing done

---

## Maintenance

### Weekly
- [ ] Review audit logs for suspicious activity
- [ ] Check for failed login patterns
- [ ] Monitor API rate limit violations

### Monthly
- [ ] Update dependencies (`npm update`)
- [ ] Review and update security policies
- [ ] Audit user roles and permissions
- [ ] Review and archive old audit logs

### Quarterly
- [ ] Security audit
- [ ] Penetration testing
- [ ] Review and update documentation
- [ ] Performance optimization

---

## Resources

- [Admin Dashboard Security Skill](E:/my-lingerie-shop/.claude/skills/admin-dashboard-security/SKILL.md)
- [OWASP Top 10 2021](https://owasp.org/www-project-top-ten/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Prisma Security Recommendations](https://www.prisma.io/docs/guides/performance-and-optimization/query-optimization-performance)

---

**Total Timeline**: 10 days  
**Critical Path**: Phases 1-2-4 (Security foundation must be solid)  
**Next Steps**: Start with Phase 1 database schema updates
