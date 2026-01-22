# Testing Guide - My Lingerie Shop

## Tổng quan

Project đã được setup đầy đủ với testing infrastructure bao gồm:
- **Unit Tests**: Vitest cho Backend và Frontend
- **Integration Tests**: Testing Library cho React components
- **E2E Tests**: Playwright cho end-to-end testing

---

## Test Commands

### Root Level (Chạy tất cả tests)

```bash
# Type check toàn bộ project
npm run typecheck

# Run backend + frontend unit tests
npm test

# Run E2E tests
npm run test:e2e

# Run E2E tests với UI mode
npm run test:e2e:ui

# Run tất cả: typecheck + unit tests + E2E tests
npm run test:all
```

### Backend Tests

```bash
cd backend

# Run tests trong watch mode
npm test

# Run tests một lần
npm run test:run

# Run tests với UI
npm run test:ui

# Run tests với coverage report
npm run test:coverage

# Run security tests
npm run test:security

# Run API tests
npm run test:api

# Type check backend
npm run typecheck
```

### Frontend Tests

```bash
cd frontend

# Run tests trong watch mode
npm test

# Run tests một lần
npm run test:run

# Run tests với UI
npm run test:ui

# Run tests với coverage report
npm run test:coverage

# Type check frontend
npm run typecheck
```

---

## Test Structure

### Backend Tests (`backend/src/tests/`)

```
backend/src/tests/
├── setup.ts              # Test database setup & cleanup
├── helpers.ts            # Test helpers (createTestUser, etc.)
├── api/
│   ├── auth.test.ts     # Auth API tests
│   ├── admin.test.ts    # Admin API tests
│   └── products.test.ts # Products API tests (example)
└── security/
    └── api-security.test.ts  # Security tests
```

### Frontend Tests (`frontend/src/tests/`)

```
frontend/src/tests/
├── setup.ts              # Testing Library setup & mocks
├── vitest-setup.d.ts    # TypeScript type extensions
└── ../components/
    └── **/*.test.tsx    # Component tests
```

### E2E Tests (`e2e/`)

```
e2e/
├── auth.spec.ts         # Authentication E2E tests
├── admin-dashboard.spec.ts  # Admin dashboard E2E tests (example)
└── products.spec.ts     # Products E2E tests (example)
```

---

## Writing Tests

### Backend API Test Example

```typescript
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import userRoutes from '../../routes/userRoutes';
import { createTestUser } from '../setup';

const app = express();
app.use(express.json());
app.use('/api/users', userRoutes);

describe('User API', () => {
  it('should register new user', async () => {
    const response = await request(app)
      .post('/api/users/register')
      .send({
        email: 'test@example.com',
        password: 'Password123!',
        name: 'Test User',
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.token).toBeDefined();
  });
});
```

### Frontend Component Test Example

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MyComponent from './MyComponent';
import * as api from '@/lib/api';

vi.mock('@/lib/api');

describe('MyComponent', () => {
  it('should render correctly', async () => {
    vi.mocked(api.fetchData).mockResolvedValue({ data: 'test' });
    
    render(<MyComponent />);
    
    await waitFor(() => {
      expect(screen.getByText('test')).toBeInTheDocument();
    });
  });
});
```

### E2E Test Example

```typescript
import { test, expect } from '@playwright/test';

test('user can login', async ({ page }) => {
  await page.goto('/login-register');
  
  await page.fill('input[name="email"]', 'admin@example.com');
  await page.fill('input[name="password"]', 'Admin123!');
  await page.click('button[type="submit"]');
  
  await expect(page).toHaveURL('/');
});
```

---

## Test Helpers

### Backend Helpers (`backend/src/tests/helpers.ts`)

```typescript
import { createTestUser, generateTestToken, createTestCategory, createTestProduct, createTestOrder } from './setup';

// Example usage:
const { user, password } = await createTestUser({
  email: 'test@example.com',
  roleName: 'ADMIN',
});

const token = generateTestToken(user.id);

const category = await createTestCategory({ name: 'Test Category' });

const product = await createTestProduct(category.id, {
  name: 'Test Product',
  price: 299000,
});
```

---

## Coverage Reports

Sau khi chạy tests với coverage:

```bash
# Backend
cd backend
npm run test:coverage

# Frontend
cd frontend
npm run test:coverage
```

Coverage reports sẽ được tạo tại:
- `backend/coverage/` - HTML report
- `frontend/coverage/` - HTML report

Mở `coverage/index.html` trong browser để xem chi tiết.

---

## Troubleshooting

### Issue: Tests timeout

**Solution:** Tăng timeout trong test:

```typescript
it('long running test', async () => {
  // ...
}, { timeout: 30000 }); // 30 seconds
```

### Issue: Database connection errors

**Solution:** Đảm bảo có `TEST_DATABASE_URL` trong `.env`:

```bash
TEST_DATABASE_URL="postgresql://user:password@localhost:5432/test_db"
```

### Issue: Mock không hoạt động

**Solution:** Verify mock được define trước khi import component:

```typescript
vi.mock('@/lib/api');  // Must be before import

import MyComponent from './MyComponent';
```

### Issue: E2E tests không tìm thấy elements

**Solution:** Thêm `data-testid` attributes:

```tsx
<button data-testid="submit-btn">Submit</button>
```

```typescript
await page.click('[data-testid="submit-btn"]');
```

---

## Best Practices

### ✅ DO:
- Viết tests cho critical business logic
- Mock external dependencies (API calls, databases)
- Use descriptive test names
- Clean up test data sau mỗi test
- Test cả success và error cases
- Use `waitFor` cho async operations

### ❌ DON'T:
- Test implementation details
- Write tests phụ thuộc vào nhau
- Ignore failing tests
- Test third-party libraries
- Use real databases trong unit tests
- Hard-code test data

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - run: npm install
      - run: npm run typecheck
      - run: npm run test
      - run: npx playwright install
      - run: npm run test:e2e
```

---

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Playwright Documentation](https://playwright.dev/)
- [Jest DOM Matchers](https://github.com/testing-library/jest-dom)

---

## Test Coverage Goals

- **Backend:** Minimum 80% coverage
- **Frontend:** Minimum 70% coverage
- **Critical paths:** 100% coverage (auth, payment, order processing)

---

**Happy Testing! 🧪**
