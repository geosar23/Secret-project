// This file runs BEFORE any module is imported by Jest (setupFiles).
// It sets env vars so config/env.ts reads the correct values at import time.

process.env.JWT_SECRET = "test-jwt-secret-for-tests-only";
process.env.MONGO_URI = "mongodb://127.0.0.1:27017/test"; // placeholder; overridden by MongoMemoryServer
process.env.SUPABASE_URL = "https://test-project.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
process.env.SUPABASE_STORAGE_BUCKET = "test-bucket";
process.env.ENCRYPTION_KEY = "0000000000000000000000000000000000000000000000000000000000000000";
// OG company ID — test users are seeded with this same ID so repositories
// use the base Mongoose model directly (no company-scope filter needed in tests)
process.env.OG_COMPANY_ID = "507f1f77bcf86cd799439011";
process.env.NODE_ENV = "test";
