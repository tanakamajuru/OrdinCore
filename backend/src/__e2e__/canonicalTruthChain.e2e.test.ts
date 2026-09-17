/**
 * Phase 4 · Canonical truth-chain E2E harness.
 *
 * Two layers:
 *  1. Contract layer (always runs, no DB): drives the real Express app through supertest to prove the
 *     authentication/validation contract the canonical read-side depends on — protected routes reject
 *     anonymous callers before any query, and the login endpoint validates input.
 *  2. Truth-chain layer (runs only with E2E_DATABASE_URL): the end-to-end governance journey
 *     signal -> risk -> action -> completion evidence -> effectiveness -> canonical closure, asserting
 *     that Guided Work deep-links to the exact canonical record and that counts reconcile to evidence
 *     IDs. Self-skips without a disposable test DB so `npm test` stays green locally.
 *
 * Run: npm run test:e2e   (contract layer)
 *      E2E_DATABASE_URL=postgres://... npm run test:e2e   (full journey)
 */
import request from 'supertest';
import app from '../app';

describe('E2E contract layer (no DB)', () => {
  it('rejects an anonymous call to a protected canonical route with 401', async () => {
    const res = await request(app).get('/api/v1/guided-work');
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ success: false });
  });

  it('validates the login endpoint (empty body is a 400, not a 500)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send({});
    expect(res.status).toBe(400);
  });

  it('rejects a malformed bearer token with 401 before touching the database', async () => {
    const res = await request(app)
      .get('/api/v1/guided-work')
      .set('Authorization', 'Bearer not-a-real-token');
    expect(res.status).toBe(401);
  });
});

const hasTestDb = !!process.env.E2E_DATABASE_URL;
const truthChain = hasTestDb ? describe : describe.skip;

truthChain('E2E truth-chain layer (seeded test DB)', () => {
  // These steps require a disposable seeded database (a company, an RM user, a house). The harness
  // authenticates, then walks the canonical journey end to end. Each step asserts the canonical
  // read-side, not a local recomputation.
  let token: string;

  beforeAll(async () => {
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: process.env.E2E_RM_EMAIL, password: process.env.E2E_RM_PASSWORD });
    token = login.body?.data?.token || login.body?.token;
    expect(token).toBeTruthy();
  });

  const auth = () => ({ Authorization: `Bearer ${token}` });

  it('serves Guided Work for an authenticated tenant user', async () => {
    const res = await request(app).get('/api/v1/guided-work').set(auth());
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body?.data ?? res.body)).toBe(true);
  });

  it('every canonical evidence count resolves to at least one addressable record', async () => {
    const summary = await request(app).get('/api/v1/canonical-evidence/summary').set(auth());
    expect(summary.status).toBe(200);
    // Each non-zero count type must expand to concrete evidence IDs (no count without evidence).
    const counts = summary.body?.data ?? summary.body ?? {};
    for (const [countType, value] of Object.entries<any>(counts)) {
      if (typeof value === 'number' && value > 0) {
        const detail = await request(app)
          .get(`/api/v1/canonical-evidence/counts/${encodeURIComponent(countType)}`)
          .set(auth());
        expect(detail.status).toBe(200);
        const ids = detail.body?.data ?? detail.body ?? [];
        expect(Array.isArray(ids) ? ids.length : 0).toBeGreaterThan(0);
      }
    }
  });

  // Documented next steps for the seeded journey (create risk -> action -> complete with evidence ->
  // rate effectiveness -> assert canonical closure eligibility and Guided Work exact-record deep link).
  // Left as it.todo until the seed fixtures are wired, so the intent is tracked without a false pass.
  it.todo('routes a completed effectiveness-required action to /effectiveness?focus=<exact id>');
  it.todo('marks a risk closure-eligible only after canonical effectiveness evidence exists');
});
