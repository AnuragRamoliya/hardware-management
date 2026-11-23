import 'dotenv/config';

process.env.PORT = '8000';
process.env.NODE_ENV = 'test';
if (process.env.OPTIONS_DB_INTEGRATION !== '1' && process.env.PHASE2_DB_INTEGRATION !== '1') {
  process.env.DB_USERNAME = 'itam_test';
  process.env.DB_PASSWORD = 'itam_test_password';
  process.env.DB_HOST = '127.0.0.1';
  process.env.DB_PORT = '3306';
  process.env.DB_DATABASE = 'itam_test';
  process.env.DB_CONNECTION = 'mysql';
  process.env.DB_LOGGING = 'false';
}
process.env.SECRET_KEY = 'test-secret-key-with-at-least-thirty-two-characters';
process.env.ACCESS_TOKEN_EXPIRES = '1h';
process.env.REFRESH_TOKEN_EXPIRES = '7d';
process.env.CORS_ORIGINS = 'http://localhost:3000';
process.env.ENCRYPTION_SECRET = 'test-payload-secret';
process.env.VAULT_ENCRYPTION_KEY = '12345678901234567890123456789012';
process.env.MAIL_SERVICE = '';
process.env.MAIL_HOST = '';
process.env.MAIL_PORT = '587';
process.env.MAIL_SECURE = 'false';
process.env.MAIL_USERNAME = '';
process.env.MAIL_EMAIL = '';
process.env.MAIL_PASSWORD = '';
process.env.IS_OTP_GENERATE_STATIC = 'true';
process.env.IS_STATIC_EMAIL = 'true';
process.env.CURRENT_UPLOAD_TYPE = '1';
process.env.SERVER_ASSETS_BASE_PATH = '';
process.env.SERVER_PATH = '';
process.env.SUPER_ADMIN_EMAIL = 'admin@example.com';
process.env.SUPER_ADMIN_PASSWORD = 'test-admin-password-123';
process.env.TZ = 'UTC';
