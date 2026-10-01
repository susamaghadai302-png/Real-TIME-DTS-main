import 'dotenv/config';

// Use test database
process.env.DATABASE_URL = 'file:./dev.db';
process.env.JWT_SECRET = 'dts-jwt-secret-change-in-production-2024';
process.env.NODE_ENV = 'test';
