import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load .env if present
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().optional(),
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().default(5432),
  DB_NAME: z.string().default('gram_vikas_db'),
  DB_USER: z.string().default('postgres'),
  DB_PASSWORD: z.string().default('postgres'),
  DB_MAX_CONNECTIONS: z.coerce.number().default(20),
  DB_IDLE_TIMEOUT_MS: z.coerce.number().default(30000),
  DB_CONNECTION_TIMEOUT_MS: z.coerce.number().default(2000),
  JWT_SECRET: z.string().min(16).default('super-secret-gram-vikas-jwt-key-min-32-chars-long!'),
  JWT_EXPIRES_IN: z.string().default('24h'),
  DEFAULT_PANCHAYAT_ID: z.string().uuid().default('a0000000-0000-0000-0000-000000000001'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('Invalid environment variables:', parsedEnv.error.format());
  process.exit(1);
}

export const env = parsedEnv.data;
