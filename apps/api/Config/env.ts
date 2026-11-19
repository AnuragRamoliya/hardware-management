import 'dotenv/config';
import { z } from 'zod';

const duration = z.string().regex(/^\d+[smhd]$/);
const emptyAsUndefined = (value: unknown): unknown => (value === '' ? undefined : value);
const integerWithDefault = (defaultValue: number, min = 1) =>
  z.preprocess(emptyAsUndefined, z.coerce.number().int().min(min).default(defaultValue));

const envSchema = z.object({
  PORT: integerWithDefault(8000),
  NODE_ENV: z.preprocess(
    emptyAsUndefined,
    z.enum(['development', 'test', 'production']).default('development'),
  ),
  DB_USERNAME: z.string().min(1),
  DB_PASSWORD: z.string().optional().default(''),
  DB_HOST: z.string().min(1),
  DB_PORT: integerWithDefault(3306),
  DB_DATABASE: z.string().min(1),
  DB_CONNECTION: z.preprocess(emptyAsUndefined, z.literal('mysql').default('mysql')),
  DB_LOGGING: z
    .string()
    .default('false')
    .transform((value) => value === 'true'),
  SECRET_KEY: z.string().min(32),
  ACCESS_TOKEN_EXPIRES: z.preprocess(emptyAsUndefined, duration.default('1h')),
  REFRESH_TOKEN_EXPIRES: z.preprocess(emptyAsUndefined, duration.default('7d')),
  CORS_ORIGINS: z
    .string()
    .min(1)
    .refine(
      (value) =>
        value.split(',').every((origin) => {
          try {
            return new URL(origin.trim()).origin === origin.trim();
          } catch {
            return false;
          }
        }),
      'CORS_ORIGINS must be a comma-separated list of valid origins.',
    ),
  ENCRYPTION_SECRET: z.string().min(1),
  VAULT_ENCRYPTION_KEY: z
    .string()
    .optional()
    .default('12345678901234567890123456789012')
    .refine(
      (value) => Buffer.byteLength(value, 'utf8') === 32,
      'VAULT_ENCRYPTION_KEY must be exactly 32 bytes.',
    ),
  VAULT_ENCRYPTION_KEYS: z.string().optional().default(''),
  VAULT_KEY_VERSION: z.string().optional().default('1'),
  MAIL_SERVICE: z.string().optional().default(''),
  MAIL_HOST: z.string().optional().default(''),
  MAIL_PORT: integerWithDefault(587),
  MAIL_SECURE: z
    .string()
    .default('false')
    .transform((value) => value === 'true'),
  MAIL_USERNAME: z.string().optional().default(''),
  MAIL_EMAIL: z.string().optional().default(''),
  MAIL_PASSWORD: z.string().optional().default(''),
  IS_OTP_GENERATE_STATIC: z
    .string()
    .default('false')
    .transform((value) => value === 'true'),
  IS_STATIC_EMAIL: z
    .string()
    .default('false')
    .transform((value) => value === 'true'),
  CURRENT_UPLOAD_TYPE: integerWithDefault(1).pipe(z.number().max(3)),
  SERVER_ASSETS_BASE_PATH: z.string().optional().default(''),
  SERVER_PATH: z.string().optional().default(''),
  SUPER_ADMIN_EMAIL: z.string().email(),
  SUPER_ADMIN_PASSWORD: z.string().min(12),
  TZ: z.preprocess(emptyAsUndefined, z.string().default('UTC')),
  REALTIME_ENABLED: z
    .string()
    .default('true')
    .transform((value) => value === 'true'),
  REALTIME_PATH: z.string().default('/realtime'),
  REALTIME_REDIS_URL: z.string().optional().default(''),
  REALTIME_MAX_SOCKETS_PER_USER: integerWithDefault(5),
});

export const env = envSchema.parse(process.env);
export type Environment = typeof env;
