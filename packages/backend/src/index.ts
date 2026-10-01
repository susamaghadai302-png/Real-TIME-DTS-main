import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server } from 'socket.io';

import { authRouter } from './routes/auth';
import { deliveriesRouter } from './routes/deliveries';
import { driversRouter } from './routes/drivers';
import { adminRouter } from './routes/admin';
import { notificationsRouter } from './routes/notifications';
import { setupSocketHandlers } from './sockets';
import { prisma } from './db/client';
import { createRateLimiter } from './middleware/rateLimiter';

const PORT = parseInt(process.env.PORT || '4000', 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

const app = express();
const httpServer = createServer(app);

// Socket.IO setup
export const io = new Server(httpServer, {
  cors: {
    origin: [CORS_ORIGIN, 'http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: [CORS_ORIGIN, 'http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));
app.use(compression());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiters
app.use('/api/auth', createRateLimiter(15, 20));
app.use('/api', createRateLimiter(15, 200));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), env: process.env.NODE_ENV });
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/deliveries', deliveriesRouter);
app.use('/api/drivers', driversRouter);
app.use('/api/admin', adminRouter);
app.use('/api/notifications', notificationsRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// Setup Socket.IO handlers
setupSocketHandlers(io);

// Start server
async function start() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected');

    httpServer.listen(PORT, () => {
      console.log(`🚀 DTS Backend running on http://localhost:${PORT}`);
      console.log(`🔌 Socket.IO ready`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

start();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});
