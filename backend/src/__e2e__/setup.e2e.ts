// Runs before the E2E test module (and therefore before app.ts) is imported. The app refuses to load
// without JWT secrets; supply throwaway ones for the harness. Real secrets come from the environment
// in CI when the seeded truth-chain layer runs.
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'e2e-harness-insecure-jwt-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'e2e-harness-insecure-refresh-secret';
