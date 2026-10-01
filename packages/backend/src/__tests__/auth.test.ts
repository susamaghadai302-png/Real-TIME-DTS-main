import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { authRouter } from '../routes/auth';
import { prisma } from '../db/client';

// Setup test app
const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);

const TEST_EMAIL = `test_${Date.now()}@test.com`;
const TEST_PASSWORD = 'Test@123456';

describe('Authentication API', () => {
  afterAll(async () => {
    // Cleanup test users
    await prisma.user.deleteMany({ where: { email: TEST_EMAIL } });
    await prisma.$disconnect();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new customer successfully', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        name: 'Test User',
        role: 'CUSTOMER',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.email).toBe(TEST_EMAIL);
      expect(res.body.data.user.role).toBe('CUSTOMER');
    });

    it('should reject duplicate email', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        name: 'Duplicate User',
        role: 'CUSTOMER',
      });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('should reject invalid email', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: 'not-an-email',
        password: TEST_PASSWORD,
        name: 'Test User',
        role: 'CUSTOMER',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject short password', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: `new_${TEST_EMAIL}`,
        password: '123',
        name: 'Test User',
        role: 'CUSTOMER',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.email).toBe(TEST_EMAIL);
    });

    it('should reject wrong password', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: TEST_EMAIL,
        password: 'wrongpassword',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject non-existent email', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'notexist@test.com',
        password: TEST_PASSWORD,
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
