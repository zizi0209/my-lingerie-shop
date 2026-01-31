---
sidebar_position: 2
---

# QA Testing Guide

Comprehensive testing guide for the application.

## Test Commands

```bash
# Run all tests
npm test

# Generate coverage report
npm run test:coverage

# Run specific test
npm test -- sister-sizing.service.test.ts
```

## Testing Stack

- **Framework:** Jest
- **API Testing:** Supertest  
- **Database:** PostgreSQL
- **Cache:** Redis

## Setup

Create .env.test:

```bash
DATABASE_URL="postgresql://test:test@localhost:5433/lingerie_test"
REDIS_URL="redis://localhost:6379"
NODE_ENV=test
```

## Best Practices

1. Write tests first (TDD)
2. Keep tests isolated
3. Use meaningful test names
4. Mock external dependencies
5. Clean up after tests

---

**Coverage Goal:** ≥ 70%
