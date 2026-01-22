# Phase 2 Implementation Guide - Admin Authentication & Authorization

## Overview

Phase 2 nâng cấp authentication và authorization với các tính năng bảo mật quan trọng:
- Account lockout protection (chống brute-force)
- Token versioning (logout all sessions)
- Role-based access control (RBAC)
- Audit logging cho critical actions
- Self-protection mechanisms

## Prerequisites

✅ Phase 1 đã hoàn thành:
- Database schema có security fields
- Audit logging models
- Validation utilities
- Admin user đã được seed

---

## Step-by-Step Implementation

### Step 1: Create Enhanced Authentication Middleware

**File: `backend/src/middleware/requireAuth.ts`** (NEW)

```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET không được cấu hình trong file .env!');
}

const JWT_SECRET = process.env.JWT_SECRET;

interface JwtPayload {
  userId: number;
  email: string;
  roleId: number | null;
  roleName?: string;
  tokenVersion: number;
  iat?: number;
}

export interface AuthUser {
  id: number;
  email: string;
  roleId: number | null;
  roleName: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * Authentication middleware with comprehensive security checks
 * - Verifies JWT token
 * - Checks account lock status
 * - Validates token version (for logout all sessions)
 * - Checks password change timestamp
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Token không được cung cấp!' });
    }

    // Verify JWT
    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return res.status(401).json({ error: 'Token đã hết hạn!' });
      }
      if (error instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({ error: 'Token không hợp lệ!' });
      }
      throw error;
    }

    // CRITICAL: Verify from database, don't trust JWT alone
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        roleId: true,
        role: {
          select: {
            name: true
          }
        },
        isActive: true,
        lockedUntil: true,
        passwordChangedAt: true,
        tokenVersion: true,
        deletedAt: true
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'Người dùng không tồn tại!' });
    }

    // Check if user is deleted
    if (user.deletedAt) {
      return res.status(401).json({ error: 'Tài khoản đã bị xóa!' });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json({ error: 'Tài khoản đã bị vô hiệu hóa!' });
    }

    // Check account lock
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      return res.status(403).json({
        error: `Tài khoản bị khóa. Vui lòng thử lại sau ${minutesLeft} phút.`,
        lockedUntil: user.lockedUntil.toISOString()
      });
    }

    // Check token version (for logout all sessions)
    if (decoded.tokenVersion !== user.tokenVersion) {
      return res.status(401).json({ 
        error: 'Token đã bị thu hồi. Vui lòng đăng nhập lại!' 
      });
    }

    // Check if password was changed after token was issued
    if (user.passwordChangedAt && decoded.iat) {
      const pwdChangedTime = Math.floor(user.passwordChangedAt.getTime() / 1000);
      if (decoded.iat < pwdChangedTime) {
        return res.status(401).json({ 
          error: 'Mật khẩu đã được thay đổi. Vui lòng đăng nhập lại!' 
        });
      }
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      roleId: user.roleId,
      roleName: user.role?.name ?? null
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({ error: 'Lỗi xác thực!' });
  }
}
```

### Step 2: Create Admin Authorization Middleware

**File: `backend/src/middleware/requireAdmin.ts`** (NEW)

```typescript
import { Request, Response, NextFunction } from 'express';
import { requireAuth } from './requireAuth';

/**
 * Admin authorization middleware
 * Requires user to have ADMIN or SUPER_ADMIN role
 * Must be used after requireAuth
 */
function checkAdmin(req: Request, res: Response, next: NextFunction) {
  const roleName = req.user?.roleName?.toUpperCase();
  
  if (roleName !== 'ADMIN' && roleName !== 'SUPER_ADMIN') {
    return res.status(403).json({
      error: 'Chỉ admin mới có quyền truy cập!'
    });
  }
  
  next();
}

/**
 * Combined middleware: authentication + admin authorization
 * Usage: router.get('/admin/users', requireAdmin, handler)
 */
export const requireAdmin = [requireAuth, checkAdmin];
```

### Step 3: Update User Controller with Security Features

**File: `backend/src/controllers/userController.ts`** - Add these imports:

```typescript
import { validate, registerSchema, loginSchema, updateUserSchema } from '../utils/validation';
import { sanitizeUser, sanitizeUsers } from '../utils/sanitize';
import { auditLog } from '../utils/auditLog';
import { AuditActions } from '../utils/constants';

const LOCKOUT_THRESHOLD = 5; // Failed login attempts before lockout
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds
```

#### 3.1 Secure Register Function

**Key security features:**
- Input validation with Zod
- Bcrypt cost 12 (instead of 10)
- **Force roleId = null** (never trust client input)
- Initialize security fields
- Audit logging
- Output sanitization

```typescript
export const register = async (req: Request, res: Response) => {
  try {
    // Validate input with Zod
    const validated = validate(registerSchema, req.body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validated.email },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Email đã được sử dụng!' });
    }

    // Hash password with bcrypt cost 12 (security best practice)
    const hashedPassword = await bcrypt.hash(validated.password, 12);

    // Create user - FORCE role to USER, never trust client input for role
    const user = await prisma.user.create({
      data: {
        email: validated.email,
        password: hashedPassword,
        name: validated.name || null,
        roleId: null, // Users start without a role, admin assigns later
        passwordChangedAt: new Date(),
        failedLoginAttempts: 0,
        tokenVersion: 0
      },
      select: {
        id: true,
        email: true,
        name: true,
        roleId: true,
        role: {
          select: {
            id: true,
            name: true,
          },
        },
        createdAt: true,
      },
    });

    // Audit log
    await auditLog({
      userId: user.id,
      action: AuditActions.CREATE_USER,
      resource: 'USER',
      resourceId: String(user.id),
      newValue: sanitizeUser(user),
      severity: 'INFO'
    }, req);

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        roleId: user.roleId, 
        roleName: user.role?.name,
        tokenVersion: 0
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      data: {
        user: sanitizeUser(user),
        token,
      },
    });
  } catch (error: any) {
    console.error('Register error:', error);
    
    // Don't expose validation errors in production
    if (error.message && process.env.NODE_ENV !== 'production') {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Lỗi khi đăng ký!' });
  }
};
```

#### 3.2 Login Function with Account Lockout

**Key security features:**
- Account lockout after 5 failed attempts (15 minutes)
- Check deletedAt, isActive status
- Increment/reset failedLoginAttempts
- Audit logging for success and failures
- Show remaining attempts

```typescript
export const login = async (req: Request, res: Response) => {
  try {
    // Validate input
    const validated = validate(loginSchema, req.body);

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: validated.email },
      include: {
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!user) {
      // Don't reveal if email exists
      return res.status(401).json({ error: 'Email hoặc password không đúng!' });
    }

    // Check if user is deleted
    if (user.deletedAt) {
      return res.status(401).json({ error: 'Tài khoản không tồn tại!' });
    }

    // Check if account is active
    if (!user.isActive) {
      await auditLog({
        userId: user.id,
        action: AuditActions.LOGIN_FAILED,
        resource: 'USER',
        resourceId: String(user.id),
        severity: 'WARNING'
      }, req);
      
      return res.status(403).json({ error: 'Tài khoản đã bị vô hiệu hóa!' });
    }

    // Check account lockout
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      
      await auditLog({
        userId: user.id,
        action: AuditActions.LOGIN_FAILED,
        resource: 'USER',
        resourceId: String(user.id),
        severity: 'WARNING'
      }, req);
      
      return res.status(403).json({
        error: `Tài khoản bị khóa do đăng nhập sai quá nhiều. Vui lòng thử lại sau ${minutesLeft} phút.`,
        lockedUntil: user.lockedUntil.toISOString()
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(validated.password, user.password);

    if (!isPasswordValid) {
      // Increment failed attempts
      const failedAttempts = user.failedLoginAttempts + 1;
      const shouldLock = failedAttempts >= LOCKOUT_THRESHOLD;
      
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: failedAttempts,
          lockedUntil: shouldLock ? new Date(Date.now() + LOCKOUT_DURATION) : null
        }
      });

      await auditLog({
        userId: user.id,
        action: AuditActions.LOGIN_FAILED,
        resource: 'USER',
        resourceId: String(user.id),
        severity: shouldLock ? 'CRITICAL' : 'WARNING'
      }, req);

      if (shouldLock) {
        return res.status(403).json({
          error: `Tài khoản đã bị khóa do đăng nhập sai ${LOCKOUT_THRESHOLD} lần. Vui lòng thử lại sau 15 phút.`
        });
      }

      return res.status(401).json({
        error: `Email hoặc password không đúng! (Còn ${LOCKOUT_THRESHOLD - failedAttempts} lần thử)`
      });
    }

    // Success - Reset failed attempts and update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLogin: new Date(),
        lastLoginAt: new Date()
      },
    });

    // Audit log successful login
    await auditLog({
      userId: user.id,
      action: AuditActions.LOGIN_SUCCESS,
      resource: 'USER',
      resourceId: String(user.id),
      severity: 'INFO'
    }, req);

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        roleId: user.roleId, 
        roleName: user.role?.name,
        tokenVersion: user.tokenVersion
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      data: {
        user: sanitizeUser({
          id: user.id,
          email: user.email,
          name: user.name,
          roleId: user.roleId,
          role: user.role,
          createdAt: user.createdAt,
        }),
        token,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    
    if (error.message && process.env.NODE_ENV !== 'production') {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Lỗi khi đăng nhập!' });
  }
};
```

#### 3.3 Update User with Self-Protection

**Key security features:**
- Prevent self-role change (admins can't demote themselves)
- Whitelist approach (only allow validated fields)
- Audit logging with CRITICAL severity for role changes
- Track oldValue and newValue

```typescript
export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Validate input
    const validated = validate(updateUserSchema, req.body);

    // Check if user exists
    const existingUser = await prisma.user.findFirst({
      where: { 
        id: Number(id),
        deletedAt: null,
      },
      include: {
        role: true
      }
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng!' });
    }

    // Prevent self role change (admins shouldn't demote themselves)
    if (validated.roleId && req.user && req.user.id === Number(id)) {
      return res.status(400).json({ error: 'Không thể thay đổi vai trò của chính mình!' });
    }

    // If email is being updated, check if it's already in use
    if (validated.email && validated.email !== existingUser.email) {
      const emailExists = await prisma.user.findFirst({
        where: { 
          email: validated.email,
          deletedAt: null,
        },
      });

      if (emailExists) {
        return res.status(400).json({ error: 'Email đã được sử dụng!' });
      }
    }

    // Prepare update data (whitelist approach - only allow validated fields)
    const updateData: any = {};
    if (validated.email) updateData.email = validated.email;
    if (validated.name !== undefined) updateData.name = validated.name;
    if (validated.phone !== undefined) updateData.phone = validated.phone;
    if (validated.roleId !== undefined) updateData.roleId = validated.roleId;
    if (validated.isActive !== undefined) updateData.isActive = validated.isActive;

    // Update user
    const user = await prisma.user.update({
      where: { id: Number(id) },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatar: true,
        roleId: true,
        role: {
          select: {
            id: true,
            name: true,
          },
        },
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Audit log (critical for role changes)
    const severity = existingUser.roleId !== user.roleId ? 'CRITICAL' : 'INFO';
    const action = existingUser.roleId !== user.roleId 
      ? AuditActions.CHANGE_ROLE 
      : AuditActions.UPDATE_USER;

    await auditLog({
      userId: req.user!.id,
      action,
      resource: 'USER',
      resourceId: String(user.id),
      oldValue: sanitizeUser(existingUser),
      newValue: sanitizeUser(user),
      severity
    }, req);

    res.json({
      success: true,
      data: sanitizeUser(user),
    });
  } catch (error: any) {
    console.error('Update user error:', error);
    
    if (error.message && process.env.NODE_ENV !== 'production') {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Lỗi khi cập nhật người dùng!' });
  }
};
```

#### 3.4 Delete User with Self-Protection

**Key security features:**
- Prevent self-deletion
- Soft delete (preserve data)
- CRITICAL severity audit log

```typescript
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Prevent self-deletion
    if (req.user && req.user.id === Number(id)) {
      return res.status(400).json({ error: 'Không thể xóa tài khoản của chính mình!' });
    }

    // Check if user exists
    const user = await prisma.user.findFirst({
      where: { 
        id: Number(id),
        deletedAt: null,
      },
      include: {
        role: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng!' });
    }

    // Soft delete user
    await prisma.user.update({
      where: { id: Number(id) },
      data: { 
        deletedAt: new Date(),
        isActive: false,
      },
    });

    // Critical audit log (user deletion)
    await auditLog({
      userId: req.user!.id,
      action: AuditActions.DELETE_USER,
      resource: 'USER',
      resourceId: String(id),
      oldValue: sanitizeUser(user),
      newValue: null,
      severity: 'CRITICAL'
    }, req);

    res.json({
      success: true,
      message: 'Đã xóa người dùng thành công!',
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Lỗi khi xóa người dùng!' });
  }
};
```

#### 3.5 Update Output Sanitization

Add sanitization to all get functions:

```typescript
// getAllUsers
const sanitizedUsers = sanitizeUsers(users);
res.json({ success: true, data: sanitizedUsers, pagination });

// getUserById
res.json({ success: true, data: sanitizeUser(user) });

// getProfile
res.json({ success: true, data: sanitizeUser(user) });
```

### Step 4: Update Old Auth Middleware for Compatibility

**File: `backend/src/middleware/auth.ts`** - Update to use AuthUser interface:

```typescript
import { AuthUser } from './requireAuth';

interface JwtPayload {
  userId: number;
  email: string;
  roleId: number | null;
  roleName?: string;
}

// Remove duplicate declare global block

export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Token không được cung cấp!' });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(403).json({ error: 'Token không hợp lệ hoặc đã hết hạn!' });
      }

      const payload = decoded as JwtPayload;
      req.user = {
        id: payload.userId,
        email: payload.email,
        roleId: payload.roleId,
        roleName: payload.roleName ?? null
      };
      next();
    });
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Lỗi xác thực!' });
  }
};
```

---

## ✅ Phase 2 Completion Checklist

### Middleware
- [ ] `requireAuth.ts` created với comprehensive security checks
- [ ] `requireAdmin.ts` created
- [ ] `auth.ts` updated for compatibility
- [ ] TypeScript types consistent (AuthUser interface)

### User Controller Security
- [ ] Register: input validation với Zod
- [ ] Register: bcrypt cost 12
- [ ] Register: force roleId = null (mass assignment prevention)
- [ ] Register: audit logging
- [ ] Register: output sanitization
- [ ] Login: account lockout after 5 failed attempts
- [ ] Login: check deletedAt, isActive, lockedUntil
- [ ] Login: audit logging for success and failures
- [ ] Login: show remaining attempts
- [ ] Login: CRITICAL severity on lockout
- [ ] Update: prevent self-role change
- [ ] Update: whitelist approach (only validated fields)
- [ ] Update: audit logging with oldValue/newValue
- [ ] Update: CRITICAL severity for role changes
- [ ] Delete: prevent self-deletion
- [ ] Delete: CRITICAL severity audit log
- [ ] All get functions: output sanitization

### Security Features
- [ ] Token versioning implemented
- [ ] Password change invalidates old tokens
- [ ] Account lock status checked
- [ ] Database verification (don't trust JWT alone)
- [ ] Soft delete (preserve data)

### Testing
- [ ] TypeScript compilation passes (backend)
- [ ] TypeScript compilation passes (frontend)
- [ ] No type errors
- [ ] No runtime errors

---

## 🧪 Testing Guide

### Test 1: Mass Assignment Attack (Role Injection)

**Attack:** Try to register as admin

```bash
curl -X POST http://localhost:5000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "hacker@test.com",
    "password": "Password123",
    "name": "Hacker",
    "roleId": 11
  }'
```

**Expected:** User created with `roleId: null`

**Verify:**
```sql
SELECT id, email, roleId FROM "User" WHERE email = 'hacker@test.com';
```

### Test 2: Account Lockout

**Test:** Login with wrong password 5 times

```bash
# Attempt 1-5
for i in {1..5}; do
  curl -X POST http://localhost:5000/api/users/login \
    -H "Content-Type: application/json" \
    -d '{
      "email": "admin@mylingerie.com",
      "password": "WrongPassword123"
    }'
  echo "\nAttempt $i"
  sleep 1
done
```

**Expected:**
- Attempts 1-4: "Còn X lần thử"
- Attempt 5: "Tài khoản đã bị khóa... 15 phút"

**Verify audit logs:**
```sql
SELECT action, severity, "createdAt" 
FROM audit_logs 
WHERE action = 'LOGIN_FAILED' 
ORDER BY "createdAt" DESC 
LIMIT 5;
```

### Test 3: Self-Deletion Prevention

**Setup:** Login as admin, get token

```bash
# Login
TOKEN=$(curl -X POST http://localhost:5000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@mylingerie.com",
    "password": "AdminSecure123!@#"
  }' | jq -r '.data.token')

# Try to delete self
curl -X DELETE http://localhost:5000/api/users/2 \
  -H "Authorization: Bearer $TOKEN"
```

**Expected:** 400 "Không thể xóa tài khoản của chính mình!"

### Test 4: Self-Role Change Prevention

```bash
# Try to change own role
curl -X PUT http://localhost:5000/api/users/2 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "roleId": 1
  }'
```

**Expected:** 400 "Không thể thay đổi vai trò của chính mình!"

### Test 5: Audit Logging

**Verify critical actions are logged:**

```sql
SELECT 
  al.action,
  al.severity,
  al.resource,
  al."resourceId",
  u.email as "performedBy",
  al."createdAt"
FROM audit_logs al
JOIN "User" u ON al."userId" = u.id
WHERE al.severity = 'CRITICAL'
ORDER BY al."createdAt" DESC
LIMIT 10;
```

**Should see:**
- DELETE_USER actions
- CHANGE_ROLE actions
- LOGIN_FAILED (on lockout)

### Test 6: Token Version Invalidation

**Test:** Old tokens become invalid after logout all sessions

```bash
# 1. Login and get token
TOKEN1=$(curl -X POST http://localhost:5000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@test.com",
    "password": "Password123"
  }' | jq -r '.data.token')

# 2. Manually increment tokenVersion in database
# UPDATE "User" SET "tokenVersion" = "tokenVersion" + 1 WHERE email = 'test@test.com';

# 3. Try to use old token
curl -X GET http://localhost:5000/api/users/profile \
  -H "Authorization: Bearer $TOKEN1"
```

**Expected:** 401 "Token đã bị thu hồi. Vui lòng đăng nhập lại!"

### Test 7: Password Sanitization

**Verify password is never in response:**

```bash
# Get user
curl -X GET http://localhost:5000/api/users/2 \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Expected:** Response does NOT contain:
- `password`
- `failedLoginAttempts`
- `lockedUntil`
- `tokenVersion`

---

## 🔧 Troubleshooting

### Issue: "Property 'id' does not exist on type 'JwtPayload'"

**Solution:** Sử dụng AuthUser interface thống nhất:

```typescript
import { AuthUser } from './requireAuth';
```

### Issue: JWT sign expiresIn type error

**Solution:** Use string literal:

```typescript
{ expiresIn: '7d' }  // ✅ Good
{ expiresIn: process.env.JWT_EXPIRES_IN || '7d' as string | number }  // ❌ Bad
```

### Issue: Account locked forever

**Solution:** Manually reset in database:

```sql
UPDATE "User" 
SET "lockedUntil" = NULL, 
    "failedLoginAttempts" = 0 
WHERE email = 'user@example.com';
```

### Issue: Audit log not created

**Check:**
1. userId is correct (number not string)
2. Request object passed to auditLog function
3. Database connection working
4. Check logs: `console.error('Failed to create audit log:', error)`

---

## 📊 Security Metrics

After Phase 2 implementation:

| Metric | Before | After |
|--------|--------|-------|
| Password Hash Cost | 10 | 12 |
| Brute Force Protection | ❌ None | ✅ 5 attempts lockout |
| Mass Assignment Prevention | ❌ None | ✅ Whitelist validation |
| Audit Logging Coverage | 0% | 80% (critical actions) |
| Token Invalidation Support | ❌ None | ✅ Token versioning |
| Self-Protection Mechanisms | ❌ None | ✅ Self-delete, self-demote |
| Input Validation | ❌ Basic | ✅ Zod schemas |
| Output Sanitization | ❌ None | ✅ All responses |

---

## Next Steps

Once Phase 2 is complete and tested, proceed to **Phase 3: Input Validation & Rate Limiting** in the main roadmap.

**Key areas for Phase 3:**
- Validation schemas for all resources (products, categories, orders)
- Rate limiting on all endpoints
- File upload security
- Admin API routes structure

