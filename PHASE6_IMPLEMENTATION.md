# Phase 6 Implementation Guide - Testing & Security Validation

## Overview

Phase 6 tập trung vào **Testing**, **Security Validation**, và **Quality Assurance** cho toàn bộ ứng dụng Lingerie Shop. Đảm bảo code quality, security standards, và performance requirements đều đạt chuẩn production.

**Key Features:**
- Unit tests cho Backend API
- Integration tests cho Frontend components
- E2E tests với Playwright
- API security testing
- OWASP Top 10 validation
- Load testing & performance monitoring
- Type safety validation
- Documentation updates

## Prerequisites

✅ Phase 5 đã hoàn thành:
- Frontend Admin Dashboard UI
- Admin API integration
- User Management & Audit Logs
- Role-based access control

---

## Part 1: Testing Infrastructure Setup

### Step 1: Install Testing Dependencies

**Backend Testing:**
```bash
cd backend
npm install --save-dev vitest @vitest/ui supertest @types/supertest
npm install --save-dev @faker-js/faker
```

**Frontend Testing:**
```bash
cd frontend
npm install --save-dev vitest @vitest/ui jsdom
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event
npm install --save-dev @faker-js/faker
```

**E2E Testing:**
```bash
cd my-lingerie-shop
npm install --save-dev @playwright/test
npx playwright install
```

### Step 2: Configure Vitest for Backend

**File: `backend/vitest.config.ts`** (NEW)

```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/tests/setup.ts'],
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/dist/',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### Step 3: Configure Vitest for Frontend

**File: `frontend/vitest.config.ts`** (NEW)

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/dist/',
        '**/.next/',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### Step 4: Configure Playwright

**File: `playwright.config.ts`** (NEW - root level)

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    // Mobile testing
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  webServer: [
    {
      command: 'cd backend && npm run dev',
      url: 'http://localhost:5000',
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'cd frontend && npm run dev',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
    },
  ],
});
```

---

## Part 2: Backend Unit Tests

### Step 1: Test Setup & Utilities

**File: `backend/src/tests/setup.ts`** (NEW)

```typescript
import { PrismaClient } from '@prisma/client';
import { beforeAll, afterAll, afterEach } from 'vitest';

// Test database
export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
    },
  },
});

beforeAll(async () => {
  // Connect to test database
  await prisma.$connect();
  console.log('✅ Test database connected');
});

afterEach(async () => {
  // Clean up test data after each test
  const tables = [
    'AuditLog',
    'OrderItem',
    'Order',
    'CartItem',
    'ProductImage',
    'ProductVariant',
    'Product',
    'Category',
    'PageSection',
    'MediaFile',
    'User',
    'Role',
  ];

  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(`DELETE FROM "${table}";`);
    } catch (error) {
      // Table might not exist, ignore
    }
  }
});

afterAll(async () => {
  await prisma.$disconnect();
  console.log('✅ Test database disconnected');
});
```

**File: `backend/src/tests/helpers.ts`** (NEW)

```typescript
import { faker } from '@faker-js/faker';
import { prisma } from './setup';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

// Create test user
export async function createTestUser(overrides: Partial<{
  email: string;
  password: string;
  name: string;
  roleName: string;
  isActive: boolean;
}> = {}) {
  const {
    email = faker.internet.email(),
    password = 'Password123!',
    name = faker.person.fullName(),
    roleName = 'USER',
    isActive = true,
  } = overrides;

  // Get or create role
  const role = await prisma.role.upsert({
    where: { name: roleName },
    update: {},
    create: { name: roleName },
  });

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      roleId: role.id,
      isActive,
    },
    include: {
      role: true,
    },
  });

  return { user, password };
}

// Generate JWT token for testing
export function generateTestToken(userId: number): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '1h' });
}

// Create test category
export async function createTestCategory(overrides: Partial<{
  name: string;
  slug: string;
  description: string;
}> = {}) {
  const {
    name = faker.commerce.department(),
    slug = faker.helpers.slugify(name),
    description = faker.lorem.sentence(),
  } = overrides;

  return prisma.category.create({
    data: { name, slug, description },
  });
}

// Create test product
export async function createTestProduct(categoryId: number, overrides: Partial<{
  name: string;
  slug: string;
  description: string;
  price: number;
  stock: number;
}> = {}) {
  const {
    name = faker.commerce.productName(),
    slug = faker.helpers.slugify(name),
    description = faker.commerce.productDescription(),
    price = parseFloat(faker.commerce.price({ min: 100000, max: 1000000 })),
    stock = faker.number.int({ min: 0, max: 100 }),
  } = overrides;

  return prisma.product.create({
    data: {
      name,
      slug,
      description,
      price,
      stock,
      categoryId,
    },
  });
}

// Create test order
export async function createTestOrder(userId: number, overrides: Partial<{
  status: string;
  totalAmount: number;
}> = {}) {
  const {
    status = 'PENDING',
    totalAmount = parseFloat(faker.commerce.price({ min: 500000, max: 5000000 })),
  } = overrides;

  return prisma.order.create({
    data: {
      userId,
      orderNumber: faker.string.alphanumeric(10).toUpperCase(),
      status,
      totalAmount,
      shippingAddress: faker.location.streetAddress(),
      recipientName: faker.person.fullName(),
      recipientPhone: faker.phone.number(),
    },
  });
}
```

### Step 2: Auth API Tests

**File: `backend/src/tests/api/auth.test.ts`** (NEW)

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import authRoutes from '../../routes/auth.routes';
import { createTestUser, prisma } from '../setup';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Auth API', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123!',
        name: 'Test User',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.user.name).toBe(userData.name);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.password).toBeUndefined(); // Password should not be returned
    });

    it('should reject weak password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: '123',
          name: 'Test User',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Password');
    });

    it('should reject invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'Password123!',
          name: 'Test User',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject duplicate email', async () => {
      const email = 'duplicate@example.com';
      await createTestUser({ email });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email,
          password: 'Password123!',
          name: 'Test User',
        })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('đã tồn tại');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with correct credentials', async () => {
      const { user, password } = await createTestUser({
        email: 'login@example.com',
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email,
          password,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(user.email);
      expect(response.body.data.token).toBeDefined();
    });

    it('should reject wrong password', async () => {
      const { user } = await createTestUser();

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: 'WrongPassword123!',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should lock account after 5 failed attempts', async () => {
      const { user, password } = await createTestUser();

      // 5 failed attempts
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({
            email: user.email,
            password: 'WrongPassword',
          });
      }

      // 6th attempt should be locked
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email,
          password,
        })
        .expect(403);

      expect(response.body.error).toContain('bị khóa');
    });

    it('should reject inactive user', async () => {
      const { user, password } = await createTestUser({ isActive: false });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email,
          password,
        })
        .expect(403);

      expect(response.body.error).toContain('chưa được kích hoạt');
    });
  });
});
```

### Step 3: Admin API Tests

**File: `backend/src/tests/api/admin.test.ts`** (NEW)

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import adminRoutes from '../../routes/admin.routes';
import { createTestUser, generateTestToken, prisma } from '../setup';

const app = express();
app.use(express.json());
app.use('/api/admin', adminRoutes);

describe('Admin API', () => {
  let adminToken: string;
  let adminUser: { id: number; email: string };
  let regularToken: string;

  beforeEach(async () => {
    // Create admin user
    const { user: admin } = await createTestUser({ roleName: 'ADMIN' });
    adminUser = admin;
    adminToken = generateTestToken(admin.id);

    // Create regular user
    const { user: regular } = await createTestUser({ roleName: 'USER' });
    regularToken = generateTestToken(regular.id);
  });

  describe('GET /api/admin/users', () => {
    it('should list users for admin', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toBeDefined();
    });

    it('should reject regular user', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should filter by role', async () => {
      await createTestUser({ roleName: 'ADMIN' });
      await createTestUser({ roleName: 'USER' });

      const response = await request(app)
        .get('/api/admin/users?role=ADMIN')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.every((u: { role: { name: string } }) => u.role.name === 'ADMIN')).toBe(true);
    });

    it('should search by email', async () => {
      await createTestUser({ email: 'search@example.com' });

      const response = await request(app)
        .get('/api/admin/users?search=search@')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].email).toContain('search');
    });
  });

  describe('PATCH /api/admin/users/:id/role', () => {
    it('should update user role', async () => {
      const { user } = await createTestUser({ roleName: 'USER' });

      const response = await request(app)
        .patch(`/api/admin/users/${user.id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ roleName: 'ADMIN' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.role.name).toBe('ADMIN');

      // Verify in database
      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: { role: true },
      });
      expect(updatedUser?.role?.name).toBe('ADMIN');
    });

    it('should reject invalid role', async () => {
      const { user } = await createTestUser();

      const response = await request(app)
        .patch(`/api/admin/users/${user.id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ roleName: 'INVALID_ROLE' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PATCH /api/admin/users/:id/status', () => {
    it('should deactivate user', async () => {
      const { user } = await createTestUser({ isActive: true });

      const response = await request(app)
        .patch(`/api/admin/users/${user.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false })
        .expect(200);

      expect(response.body.data.isActive).toBe(false);
    });
  });

  describe('GET /api/admin/audit-logs', () => {
    it('should list audit logs', async () => {
      const response = await request(app)
        .get('/api/admin/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should filter by severity', async () => {
      const response = await request(app)
        .get('/api/admin/audit-logs?severity=CRITICAL')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.every((log: { severity: string }) => log.severity === 'CRITICAL')).toBe(true);
    });
  });

  describe('GET /api/admin/dashboard/stats', () => {
    it('should return dashboard statistics', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('users');
      expect(response.body.data).toHaveProperty('products');
      expect(response.body.data).toHaveProperty('orders');
      expect(response.body.data).toHaveProperty('revenue');
    });
  });
});
```

### Step 4: Product API Tests

**File: `backend/src/tests/api/products.test.ts`** (NEW)

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import productRoutes from '../../routes/products.routes';
import { createTestCategory, createTestProduct, createTestUser, generateTestToken } from '../setup';

const app = express();
app.use(express.json());
app.use('/api/products', productRoutes);

describe('Products API', () => {
  let categoryId: number;
  let adminToken: string;

  beforeEach(async () => {
    const category = await createTestCategory();
    categoryId = category.id;

    const { user } = await createTestUser({ roleName: 'ADMIN' });
    adminToken = generateTestToken(user.id);
  });

  describe('GET /api/products', () => {
    it('should list products', async () => {
      await createTestProduct(categoryId);
      await createTestProduct(categoryId);

      const response = await request(app)
        .get('/api/products')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter by category', async () => {
      await createTestProduct(categoryId);
      const anotherCategory = await createTestCategory();
      await createTestProduct(anotherCategory.id);

      const response = await request(app)
        .get(`/api/products?categoryId=${categoryId}`)
        .expect(200);

      expect(response.body.data.every((p: { categoryId: number }) => p.categoryId === categoryId)).toBe(true);
    });

    it('should search by name', async () => {
      await createTestProduct(categoryId, { name: 'Áo ngực đẹp' });

      const response = await request(app)
        .get('/api/products?search=áo ngực')
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/products', () => {
    it('should create product', async () => {
      const productData = {
        name: 'New Product',
        slug: 'new-product',
        description: 'Test description',
        price: 299000,
        stock: 50,
        categoryId,
      };

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(productData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(productData.name);
    });

    it('should reject invalid price', async () => {
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test',
          slug: 'test',
          price: -100, // Invalid
          categoryId,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});
```

---

## Part 3: Frontend Component Tests

### Step 1: Test Setup

**File: `frontend/src/tests/setup.ts`** (NEW)

```typescript
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock localStorage
global.localStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  key: vi.fn(),
  length: 0,
};

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));
```

### Step 2: AdminUsers Component Tests

**File: `frontend/src/components/dashboard/pages/AdminUsers.test.tsx`** (NEW)

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminUsers from './AdminUsers';
import * as adminApi from '@/lib/adminApi';

// Mock adminApi
vi.mock('@/lib/adminApi');

const mockUsers = [
  {
    id: 1,
    email: 'user1@example.com',
    name: 'User One',
    phone: null,
    isActive: true,
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastLoginAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    role: { id: 1, name: 'USER' },
  },
  {
    id: 2,
    email: 'admin@example.com',
    name: 'Admin User',
    phone: null,
    isActive: true,
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastLoginAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    role: { id: 2, name: 'ADMIN' },
  },
];

describe('AdminUsers Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock API calls
    vi.mocked(adminApi.adminUserApi.list).mockResolvedValue({
      success: true,
      data: mockUsers,
      pagination: {
        page: 1,
        limit: 20,
        total: 2,
        pages: 1,
      },
    });
  });

  it('should render users list', async () => {
    render(<AdminUsers />);

    await waitFor(() => {
      expect(screen.getByText('user1@example.com')).toBeInTheDocument();
      expect(screen.getByText('admin@example.com')).toBeInTheDocument();
    });
  });

  it('should filter by role', async () => {
    const user = userEvent.setup();
    render(<AdminUsers />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('user1@example.com')).toBeInTheDocument();
    });

    // Click role filter
    const roleSelect = screen.getByDisplayValue('Tất cả roles');
    await user.selectOptions(roleSelect, 'ADMIN');

    // Verify API called with filter
    expect(adminApi.adminUserApi.list).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'ADMIN' })
    );
  });

  it('should open role change modal', async () => {
    const user = userEvent.setup();
    render(<AdminUsers />);

    await waitFor(() => {
      expect(screen.getByText('user1@example.com')).toBeInTheDocument();
    });

    // Click "Đổi role" button
    const changeRoleButtons = screen.getAllByText('Đổi role');
    await user.click(changeRoleButtons[0]);

    // Modal should appear
    expect(screen.getByText('Thay đổi Role')).toBeInTheDocument();
  });

  it('should toggle user status', async () => {
    const user = userEvent.setup();
    vi.mocked(adminApi.adminUserApi.updateStatus).mockResolvedValue({
      success: true,
      data: { ...mockUsers[0], isActive: false },
      message: 'Success',
    });

    render(<AdminUsers />);

    await waitFor(() => {
      expect(screen.getByText('user1@example.com')).toBeInTheDocument();
    });

    // Click "Vô hiệu hóa"
    const deactivateButtons = screen.getAllByText('Vô hiệu hóa');
    await user.click(deactivateButtons[0]);

    // Verify API called
    expect(adminApi.adminUserApi.updateStatus).toHaveBeenCalledWith(1, false);
  });
});
```

### Step 3: AuditLogs Component Tests

**File: `frontend/src/components/dashboard/pages/AuditLogs.test.tsx`** (NEW)

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AuditLogs from './AuditLogs';
import * as adminApi from '@/lib/adminApi';

vi.mock('@/lib/adminApi');

const mockLogs = [
  {
    id: '1',
    userId: 1,
    action: 'USER_LOGIN',
    resource: 'User',
    resourceId: '1',
    oldValue: null,
    newValue: null,
    ipAddress: '127.0.0.1',
    userAgent: 'Mozilla/5.0',
    severity: 'INFO' as const,
    createdAt: new Date(),
    user: {
      id: 1,
      email: 'user@example.com',
      name: 'Test User',
    },
  },
];

describe('AuditLogs Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(adminApi.adminAuditLogApi.list).mockResolvedValue({
      success: true,
      data: mockLogs,
      pagination: {
        page: 1,
        limit: 50,
        total: 1,
        pages: 1,
      },
    });

    vi.mocked(adminApi.adminAuditLogApi.getActions).mockResolvedValue({
      success: true,
      data: ['USER_LOGIN', 'USER_LOGOUT'],
    });

    vi.mocked(adminApi.adminAuditLogApi.getResources).mockResolvedValue({
      success: true,
      data: ['User', 'Product'],
    });
  });

  it('should render audit logs', async () => {
    render(<AuditLogs />);

    await waitFor(() => {
      expect(screen.getByText('USER_LOGIN')).toBeInTheDocument();
      expect(screen.getByText('user@example.com')).toBeInTheDocument();
    });
  });

  it('should filter by severity', async () => {
    const user = userEvent.setup();
    render(<AuditLogs />);

    await waitFor(() => {
      expect(screen.getByText('USER_LOGIN')).toBeInTheDocument();
    });

    const severitySelect = screen.getByDisplayValue('Tất cả severity');
    await user.selectOptions(severitySelect, 'CRITICAL');

    expect(adminApi.adminAuditLogApi.list).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'CRITICAL' })
    );
  });
});
```

---

## Part 4: E2E Tests với Playwright

### Step 1: Authentication E2E Tests

**File: `e2e/auth.spec.ts`** (NEW)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should register new user', async ({ page }) => {
    await page.goto('/login-register');

    // Fill registration form
    await page.fill('input[name="email"]', `test${Date.now()}@example.com`);
    await page.fill('input[name="password"]', 'Password123!');
    await page.fill('input[name="name"]', 'Test User');
    
    // Submit
    await page.click('button[type="submit"]');

    // Should redirect to home
    await expect(page).toHaveURL('/');
  });

  test('should login existing user', async ({ page }) => {
    await page.goto('/login-register');

    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'Admin123!');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/');
  });

  test('should show error for wrong password', async ({ page }) => {
    await page.goto('/login-register');

    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'WrongPassword');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=sai')).toBeVisible();
  });
});
```

### Step 2: Admin Dashboard E2E Tests

**File: `e2e/admin-dashboard.spec.ts`** (NEW)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/login-register');
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'Admin123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('should display dashboard stats', async ({ page }) => {
    await page.goto('/dashboard');

    // Check stats cards
    await expect(page.locator('text=Tổng Users')).toBeVisible();
    await expect(page.locator('text=Sản phẩm')).toBeVisible();
    await expect(page.locator('text=Đơn hàng')).toBeVisible();
    await expect(page.locator('text=Doanh thu')).toBeVisible();
  });

  test('should list users', async ({ page }) => {
    await page.goto('/dashboard/users');

    await expect(page.locator('text=Quản lý Users')).toBeVisible();
    
    // Should have at least one user
    await expect(page.locator('table tbody tr')).toHaveCount(1, { timeout: 5000 });
  });

  test('should filter users by role', async ({ page }) => {
    await page.goto('/dashboard/users');

    // Select ADMIN filter
    await page.selectOption('select', 'ADMIN');

    // Wait for table update
    await page.waitForTimeout(500);

    // Check filtered results
    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should change user role', async ({ page }) => {
    await page.goto('/dashboard/users');

    // Click "Đổi role" on first user
    await page.click('button:has-text("Đổi role")');

    // Modal should appear
    await expect(page.locator('text=Thay đổi Role')).toBeVisible();

    // Select new role
    await page.click('button:has-text("ADMIN")');

    // Should show success message
    await expect(page.locator('text=Cập nhật role thành công')).toBeVisible();
  });

  test('should display audit logs', async ({ page }) => {
    await page.goto('/dashboard/audit-logs');

    await expect(page.locator('text=Audit Logs')).toBeVisible();
    
    // Should have filter options
    await expect(page.locator('select')).toHaveCount(5); // 5 filters
  });
});
```

### Step 3: Product E2E Tests

**File: `e2e/products.spec.ts`** (NEW)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Products', () => {
  test('should display products list', async ({ page }) => {
    await page.goto('/products');

    // Should have product cards
    const products = page.locator('[data-testid="product-card"]');
    await expect(products.first()).toBeVisible();
  });

  test('should filter by category', async ({ page }) => {
    await page.goto('/products');

    // Click category filter
    await page.click('text=Áo ngực');

    // URL should include category
    expect(page.url()).toContain('category=');
  });

  test('should view product details', async ({ page }) => {
    await page.goto('/products');

    // Click first product
    await page.click('[data-testid="product-card"]');

    // Should navigate to product detail
    expect(page.url()).toContain('/products/');

    // Should show product info
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('text=Thêm vào giỏ')).toBeVisible();
  });

  test('should add product to cart', async ({ page }) => {
    await page.goto('/products/ao-nguc-dep');

    // Click add to cart
    await page.click('button:has-text("Thêm vào giỏ")');

    // Should show success message
    await expect(page.locator('text=Đã thêm vào giỏ hàng')).toBeVisible();

    // Cart count should increase
    const cartBadge = page.locator('[data-testid="cart-count"]');
    await expect(cartBadge).toHaveText('1');
  });
});
```

---

## Part 5: Security Testing

### Step 1: API Security Tests

**File: `backend/src/tests/security/api-security.test.ts`** (NEW)

```typescript
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import authRoutes from '../../routes/auth.routes';
import productRoutes from '../../routes/products.routes';
import { createTestUser, generateTestToken } from '../setup';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);

describe('API Security', () => {
  describe('SQL Injection Prevention', () => {
    it('should reject SQL injection in email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: "admin'--",
          password: 'Password123!',
          name: 'Test',
        });

      expect(response.status).toBe(400);
    });

    it('should reject SQL injection in search', async () => {
      const response = await request(app)
        .get("/api/products?search=' OR '1'='1")
        .expect(200);

      // Should not return all products
      expect(response.body.data).toBeDefined();
    });
  });

  describe('XSS Prevention', () => {
    it('should sanitize HTML in product name', async () => {
      const { user } = await createTestUser({ roleName: 'ADMIN' });
      const token = generateTestToken(user.id);

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: '<script>alert("XSS")</script>',
          slug: 'test',
          price: 100000,
          categoryId: 1,
        });

      // Script tags should be escaped or rejected
      if (response.status === 201) {
        expect(response.body.data.name).not.toContain('<script>');
      } else {
        expect(response.status).toBe(400);
      }
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit login attempts', async () => {
      const email = 'ratelimit@example.com';

      // Send 11 requests (limit is 10)
      const requests = [];
      for (let i = 0; i < 11; i++) {
        requests.push(
          request(app)
            .post('/api/auth/login')
            .send({
              email,
              password: 'Test123!',
            })
        );
      }

      const responses = await Promise.all(requests);
      const tooManyRequests = responses.filter((r) => r.status === 429);

      expect(tooManyRequests.length).toBeGreaterThan(0);
    });
  });

  describe('JWT Token Security', () => {
    it('should reject expired token', async () => {
      // Create expired token
      const jwt = require('jsonwebtoken');
      const expiredToken = jwt.sign(
        { userId: 1 },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '-1h' }
      );

      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject invalid token signature', async () => {
      const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature';

      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Authorization', () => {
    it('should prevent regular user from accessing admin routes', async () => {
      const { user } = await createTestUser({ roleName: 'USER' });
      const token = generateTestToken(user.id);

      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Input Validation', () => {
    it('should reject malformed JSON', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .set('Content-Type', 'application/json')
        .send('{"invalid json')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject missing required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          // Missing password
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});
```

---

## Part 6: Load Testing

### Step 1: Install Artillery

```bash
npm install --save-dev artillery
```

### Step 2: Load Test Configuration

**File: `artillery/load-test.yml`** (NEW)

```yaml
config:
  target: "http://localhost:5000"
  phases:
    # Warm up
    - duration: 60
      arrivalRate: 5
      name: "Warm up"
    # Ramp up
    - duration: 120
      arrivalRate: 5
      rampTo: 50
      name: "Ramp up load"
    # Sustained load
    - duration: 300
      arrivalRate: 50
      name: "Sustained load"
  payload:
    path: "./users.csv"
    fields:
      - "email"
      - "password"
scenarios:
  # Test authentication
  - name: "Login Flow"
    weight: 40
    flow:
      - post:
          url: "/api/auth/login"
          json:
            email: "{{ email }}"
            password: "{{ password }}"
          capture:
            - json: "$.data.token"
              as: "token"

  # Test products listing
  - name: "Browse Products"
    weight: 60
    flow:
      - get:
          url: "/api/products"
      - get:
          url: "/api/products?page=2"
      - get:
          url: "/api/products?categoryId=1"
      - think: 3

  # Test authenticated requests
  - name: "Authenticated Actions"
    weight: 30
    flow:
      - post:
          url: "/api/auth/login"
          json:
            email: "test@example.com"
            password: "Test123!"
          capture:
            - json: "$.data.token"
              as: "token"
      - get:
          url: "/api/users/me"
          headers:
            Authorization: "Bearer {{ token }}"
      - get:
          url: "/api/cart"
          headers:
            Authorization: "Bearer {{ token }}"
```

**File: `artillery/users.csv`** (NEW)

```csv
email,password
user1@example.com,Password123!
user2@example.com,Password123!
user3@example.com,Password123!
user4@example.com,Password123!
user5@example.com,Password123!
```

### Step 3: Run Load Tests

```bash
# Run load test
npx artillery run artillery/load-test.yml

# Run with report
npx artillery run --output report.json artillery/load-test.yml
npx artillery report report.json
```

---

## Part 7: Type Safety Validation

### Run TypeScript Checks

**Add to `package.json` scripts:**

```json
{
  "scripts": {
    "typecheck": "concurrently \"npm run typecheck:backend\" \"npm run typecheck:frontend\"",
    "typecheck:backend": "cd backend && tsc --project tsconfig.json --noEmit",
    "typecheck:frontend": "cd frontend && tsc --project tsconfig.json --noEmit",
    "test": "concurrently \"npm run test:backend\" \"npm run test:frontend\"",
    "test:backend": "cd backend && vitest run",
    "test:frontend": "cd frontend && vitest run",
    "test:e2e": "playwright test",
    "test:security": "cd backend && vitest run src/tests/security",
    "test:all": "npm run typecheck && npm run test && npm run test:e2e"
  }
}
```

---

## Part 8: Test Scripts Package.json Updates

### Backend package.json

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:security": "vitest run src/tests/security",
    "test:api": "vitest run src/tests/api"
  }
}
```

### Frontend package.json

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

---

## ✅ Phase 6 Checklist

### Testing Infrastructure
- [ ] Install Vitest and testing libraries
- [ ] Configure Vitest for backend
- [ ] Configure Vitest for frontend
- [ ] Setup Playwright for E2E tests
- [ ] Create test helpers and utilities
- [ ] Setup test database

### Backend Tests
- [ ] Auth API tests (register, login, logout)
- [ ] Admin API tests (users, roles, audit logs)
- [ ] Product API tests (CRUD operations)
- [ ] Order API tests
- [ ] Security tests (SQL injection, XSS, rate limiting)
- [ ] JWT token tests
- [ ] Authorization tests

### Frontend Tests
- [ ] AdminUsers component tests
- [ ] AuditLogs component tests
- [ ] DashboardHome component tests
- [ ] API service tests
- [ ] Hook tests (useAdminGuard)

### E2E Tests
- [ ] Authentication flow E2E
- [ ] Admin dashboard E2E
- [ ] Product browsing E2E
- [ ] Cart & checkout E2E
- [ ] Mobile responsive E2E

### Security Validation
- [ ] SQL injection prevention
- [ ] XSS prevention
- [ ] CSRF protection
- [ ] Rate limiting
- [ ] JWT security
- [ ] Input validation
- [ ] HTTPS enforcement (production)
- [ ] Security headers

### Performance Testing
- [ ] Load test configuration
- [ ] Stress testing
- [ ] API response time benchmarks
- [ ] Database query optimization
- [ ] Frontend bundle size check

### Type Safety
- [ ] Backend TypeScript validation
- [ ] Frontend TypeScript validation
- [ ] No `any` types (use `unknown` or specific types)
- [ ] Strict mode enabled

### Documentation
- [ ] Update README with test commands
- [ ] Document test coverage requirements
- [ ] Security best practices guide
- [ ] API testing guide

---

## Success Metrics

### Test Coverage Targets
- **Backend:** Minimum 80% coverage
- **Frontend:** Minimum 70% coverage
- **E2E:** Critical user flows covered

### Performance Targets
- API response time: < 200ms (p95)
- Page load time: < 3s (p95)
- Time to interactive: < 5s
- Lighthouse score: > 90

### Security Targets
- No critical vulnerabilities
- All OWASP Top 10 mitigated
- Security headers score: A+
- SSL Labs grade: A+

---

## Running All Tests

```bash
# Type checks
npm run typecheck

# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Security tests
npm run test:security

# Load tests
cd artillery && npx artillery run load-test.yml

# All tests
npm run test:all
```

---

## CI/CD Integration (Optional)

### GitHub Actions Workflow

**File: `.github/workflows/test.yml`** (NEW)

```yaml
name: Tests

on:
  push:
    branches: [master, main]
  pull_request:
    branches: [master, main]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Type check
        run: npm run typecheck

      - name: Run backend tests
        run: cd backend && npm test
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test

      - name: Run frontend tests
        run: cd frontend && npm test

      - name: Run E2E tests
        run: npx playwright test
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./backend/coverage/coverage-final.json,./frontend/coverage/coverage-final.json
```

---

## Troubleshooting

### Issue: Tests fail with "Cannot find module"
**Solution:** Check `tsconfig.json` paths and vitest.config.ts alias configuration

### Issue: E2E tests timeout
**Solution:** Increase timeout in `playwright.config.ts`:
```typescript
use: {
  timeout: 60000, // 60 seconds
},
```

### Issue: Database conflicts in tests
**Solution:** Use separate test database and clean up after each test

### Issue: Flaky tests
**Solution:** Use `waitFor` and proper async handling in tests

---

## Next Steps

Phase 6 hoàn tất! Bây giờ có:
- ✅ Comprehensive test coverage
- ✅ Security validation
- ✅ Performance benchmarks
- ✅ Type safety validation

**Phase 7: Deployment & Production Readiness** (Optional)
- Docker containerization
- Kubernetes deployment
- Monitoring & alerting setup
- Backup & disaster recovery
- Production documentation

---

**Phase 6 Complete! 🎉**

Application đã được test kỹ lưỡng và sẵn sàng production!
