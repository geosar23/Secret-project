// This file runs BEFORE any module is imported by Jest (setupFiles).
// It sets env vars so config/env.ts reads the correct values at import time.

process.env.JWT_SECRET = "test-jwt-secret-for-tests-only";
process.env.MONGO_URI = "mongodb://127.0.0.1:27017/test"; // placeholder; overridden by MongoMemoryServer
process.env.SUPABASE_URL = "https://test-project.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
process.env.SUPABASE_STORAGE_BUCKET = "test-bucket";
process.env.SALARY_ENCRYPTION_KEY = "0000000000000000000000000000000000000000000000000000000000000000";
process.env.NODE_ENV = "test";
process.env.EMAIL_PROVIDER = "console"; // tests never hit a real mail provider
