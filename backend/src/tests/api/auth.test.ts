import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import userRoutes from '../../routes/userRoutes';
import { createTestUser } from '../setup';

const app = express();
app.use(express.json());
app.use('/api/users', userRoutes);

describe('Auth API', () => {
  describe('POST /api/users/register', () => {
    it('should register a new user successfully', async () => {
      const uniqueEmail = `test_${Date.now()}@example.com`;
      const userData = {
        email: uniqueEmail,
        password: 'Password123!',
        name: 'Test User',
      };

      const response = await request(app)
        .post('/api/users/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(uniqueEmail);
      expect(response.body.data.user.name).toBe(userData.name);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.password).toBeUndefined(); // Password should not be returned
    });

    it('should reject weak password', async () => {
      const response = await request(app)
        .post('/api/users/register')
        .send({
          email: 'test@example.com',
          password: '123',
          name: 'Test User',
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.toLowerCase()).toContain('password');
    });

    it('should reject invalid email', async () => {
      const response = await request(app)
        .post('/api/users/register')
        .send({
          email: 'invalid-email',
          password: 'Password123!',
          name: 'Test User',
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should reject duplicate email', async () => {
      const email = 'duplicate@example.com';
      await createTestUser({ email });

      const response = await request(app)
        .post('/api/users/register')
        .send({
          email,
          password: 'Password123!',
          name: 'Test User',
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.error).toContain('đã được sử dụng');
    });
  });

  describe('POST /api/users/login', () => {
    it('should login successfully with correct credentials', async () => {
      const { user, password } = await createTestUser({
        email: 'login@example.com',
      });

      const response = await request(app)
        .post('/api/users/login')
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
        .post('/api/users/login')
        .send({
          email: user.email,
          password: 'WrongPassword123!',
        })
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should lock account after 5 failed attempts', async () => {
      const { user, password } = await createTestUser();

      // 5 failed attempts
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/users/login')
          .send({
            email: user.email,
            password: 'WrongPassword',
          });
      }

      // 6th attempt should be locked
      const response = await request(app)
        .post('/api/users/login')
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
        .post('/api/users/login')
        .send({
          email: user.email,
          password,
        })
        .expect(403);

      expect(response.body.error).toContain('vô hiệu hóa');
    });
  });
});
