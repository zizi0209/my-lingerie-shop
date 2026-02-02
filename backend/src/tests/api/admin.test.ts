import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import adminRoutes from '../../routes/admin';
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
    adminToken = generateTestToken(admin.id, {
      email: admin.email,
      roleId: admin.role?.id ?? null,
      roleName: 'ADMIN',
      tokenVersion: 0,
    });

    // Create regular user
    const { user: regular } = await createTestUser({ roleName: 'USER' });
    regularToken = generateTestToken(regular.id, {
      email: regular.email,
      roleId: regular.role?.id ?? null,
      roleName: 'USER',
      tokenVersion: 0,
    });
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

      expect(response.body.error).toBeDefined();
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
        .expect(404);

      expect(response.body.error).toBeDefined();
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

      // Should only return CRITICAL logs (or empty array if none exist)
      if (response.body.data.length > 0) {
        expect(response.body.data.every((log: { severity: string }) => log.severity === 'CRITICAL')).toBe(true);
      }
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
