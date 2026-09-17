/** @type {import('ts-jest').JestConfigWithTsJest} */
// Phase 4 · E2E harness. Kept separate from the unit suite (jest.config.js), which mocks the DB.
// The E2E suite drives the real Express app through supertest. DB-free contract checks (auth guards,
// validation, health) always run; the seeded canonical truth-chain scenario runs only when an
// E2E_DATABASE_URL is provided (CI / a disposable test DB), and self-skips otherwise so local
// `npm test` stays green without infrastructure.
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__e2e__/**/*.e2e.test.ts'],
  setupFiles: ['<rootDir>/src/__e2e__/setup.e2e.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }],
  },
  testTimeout: 30000,
};
