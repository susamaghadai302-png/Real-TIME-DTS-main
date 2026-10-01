import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../db/client';
import { signToken } from '../middleware/auth';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { UserRole } from '@dts/shared';

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().optional(),
  role: z.enum(['CUSTOMER', 'DRIVER']).default('CUSTOMER'),
  // Driver-specific fields
  vehicleType: z.enum(['BIKE', 'SCOOTER', 'CAR', 'VAN']).optional(),
  vehicleNumber: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// POST /api/auth/register
authRouter.post('/register', async (req, res: Response) => {
  try {
    const data = registerSchema.parse(req.body);

    // Check if user exists
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return res.status(409).json({ success: false, error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        name: data.name,
        phone: data.phone,
        role: data.role,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.email}`,
      },
    });

    // Create role-specific record
    if (data.role === 'DRIVER') {
      await prisma.driver.create({
        data: {
          userId: user.id,
          vehicleType: data.vehicleType || 'BIKE',
          vehicleNumber: data.vehicleNumber || 'TEMP-000',
          status: 'OFFLINE',
        },
      });
    } else {
      await prisma.customer.create({ data: { userId: user.id } });
    }

    const driver = data.role === 'DRIVER' ? await prisma.driver.findUnique({ where: { userId: user.id } }) : null;
    const customer = data.role === 'CUSTOMER' ? await prisma.customer.findUnique({ where: { userId: user.id } }) : null;

    const token = signToken({
      id: user.id,
      email: user.email,
      role: data.role as UserRole,
      driverId: driver?.id,
      customerId: customer?.id,
    });

    return res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          role: user.role,
          avatar: user.avatar,
          createdAt: user.createdAt.toISOString(),
        },
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: err.errors[0].message });
    }
    console.error('Register error:', err);
    return res.status(500).json({ success: false, error: 'Registration failed' });
  }
});

// POST /api/auth/login
authRouter.post('/login', async (req, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const driver = user.role === 'DRIVER' ? await prisma.driver.findUnique({ where: { userId: user.id } }) : null;
    const customer = user.role === 'CUSTOMER' ? await prisma.customer.findUnique({ where: { userId: user.id } }) : null;

    const token = signToken({
      id: user.id,
      email: user.email,
      role: user.role as UserRole,
      driverId: driver?.id,
      customerId: customer?.id,
    });

    return res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          role: user.role,
          avatar: user.avatar,
          createdAt: user.createdAt.toISOString(),
        },
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: err.errors[0].message });
    }
    console.error('Login error:', err);
    return res.status(500).json({ success: false, error: 'Login failed' });
  }
});

// GET /api/auth/me
authRouter.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        driver: true,
        customer: true,
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    return res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar,
        createdAt: user.createdAt.toISOString(),
        driver: user.driver,
        customer: user.customer,
      },
    });
  } catch (err) {
    console.error('Get me error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch user' });
  }
});
