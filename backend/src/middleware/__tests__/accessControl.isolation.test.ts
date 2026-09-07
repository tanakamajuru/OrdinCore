/**
 * C-04 — Tenant and service access-isolation guarantees.
 *
 * Hermetic tests over the authorisation middleware that every protected route composes:
 * requireTenant (company isolation), requireScope (service/house isolation + role scope),
 * requireRole / requireMinRole, and blockOversightRole. These lock in the exact rules the
 * revised corrective patch enforces, so a regression that widened access would fail CI:
 *   - no user can reach another company's data (cross-tenant);
 *   - RM and above oversee the whole registered service; TL/SW are confined to assigned houses;
 *   - a TL/SW with no assignment is refused (never handed company-wide data);
 *   - a TL/SW asking for a house they are not assigned to is refused;
 *   - a multi-house TL is filtered to *its* houses, never the whole company;
 *   - oversight roles (RI) cannot perform operational actions.
 */
import { requireTenant } from '../tenant.middleware';
import { requireScope } from '../scope.middleware';
import { requireRole, requireMinRole, blockOversightRole } from '../role.middleware';

type AnyReq = { user?: any; params?: any; query?: any; body?: any; method?: string };

function mockRes() {
  const res: any = { statusCode: 200, body: undefined };
  res.status = jest.fn((c: number) => { res.statusCode = c; return res; });
  res.json = jest.fn((b: any) => { res.body = b; return res; });
  return res;
}
function run(mw: any, req: AnyReq) {
  const res = mockRes();
  const next = jest.fn();
  mw({ params: {}, query: {}, body: {}, method: 'GET', ...req } as any, res as any, next as any);
  return { res, next, passed: next.mock.calls.length > 0 };
}

const COMPANY_A = '11111111-1111-1111-1111-111111111111';
const COMPANY_B = '22222222-2222-2222-2222-222222222222';
const HOUSE_1 = 'aaaaaaaa-0000-0000-0000-000000000001';
const HOUSE_2 = 'aaaaaaaa-0000-0000-0000-000000000002';
const HOUSE_X = 'bbbbbbbb-0000-0000-0000-000000000009';

describe('requireTenant — company isolation', () => {
  it('rejects an unauthenticated request', () => {
    const { res, passed } = run(requireTenant, { user: undefined });
    expect(passed).toBe(false);
    expect(res.statusCode).toBe(401);
  });

  it('blocks a user with no company context', () => {
    const { res, passed } = run(requireTenant, { user: { role: 'REGISTERED_MANAGER', company_id: null } });
    expect(passed).toBe(false);
    expect(res.statusCode).toBe(403);
  });

  it('refuses a cross-tenant request (query company_id ≠ own)', () => {
    const { res, passed } = run(requireTenant, {
      user: { role: 'REGISTERED_MANAGER', company_id: COMPANY_A },
      query: { company_id: COMPANY_B },
    });
    expect(passed).toBe(false);
    expect(res.statusCode).toBe(403);
    expect(res.body.message).toMatch(/cross-tenant/i);
  });

  it('refuses a cross-tenant request supplied in the body', () => {
    const { res, passed } = run(requireTenant, {
      user: { role: 'REGISTERED_MANAGER', company_id: COMPANY_A },
      body: { company_id: COMPANY_B },
    });
    expect(passed).toBe(false);
    expect(res.statusCode).toBe(403);
  });

  it('allows a request scoped to the user’s own company', () => {
    const { passed } = run(requireTenant, {
      user: { role: 'REGISTERED_MANAGER', company_id: COMPANY_A },
      query: { company_id: COMPANY_A },
    });
    expect(passed).toBe(true);
  });

  it('lets SUPER_ADMIN cross companies (platform administration)', () => {
    const { passed } = run(requireTenant, {
      user: { role: 'SUPER_ADMIN', company_id: COMPANY_A },
      query: { company_id: COMPANY_B },
    });
    expect(passed).toBe(true);
  });
});

describe('requireScope — service/house isolation', () => {
  it.each(['REGISTERED_MANAGER', 'DIRECTOR', 'RESPONSIBLE_INDIVIDUAL', 'ADMIN', 'SUPER_ADMIN'])(
    'gives %s company-wide scope even with no assigned houses', (role) => {
      const { passed } = run(requireScope, { user: { role, company_id: COMPANY_A, assigned_house_ids: [] } });
      expect(passed).toBe(true);
    });

  it.each(['TEAM_LEADER', 'SUPPORT_WORKER'])('refuses %s with no assigned house (never company-wide)', (role) => {
    const { res, passed } = run(requireScope, { user: { role, company_id: COMPANY_A, assigned_house_ids: [] } });
    expect(passed).toBe(false);
    expect(res.statusCode).toBe(403);
  });

  it('refuses a TL asking for a house it is not assigned to', () => {
    const { res, passed } = run(requireScope, {
      user: { role: 'TEAM_LEADER', company_id: COMPANY_A, assigned_house_ids: [HOUSE_1] },
      query: { house_id: HOUSE_X },
    });
    expect(passed).toBe(false);
    expect(res.statusCode).toBe(404);
  });

  it('confines a multi-house TL to its own houses, not the whole company', () => {
    const req: AnyReq = {
      user: { role: 'TEAM_LEADER', company_id: COMPANY_A, assigned_house_ids: [HOUSE_1, HOUSE_2] },
      query: {}, method: 'GET',
    };
    const { passed } = run(requireScope, req);
    expect(passed).toBe(true);
    // The middleware must inject a house filter covering exactly the assigned houses.
    expect(req.query.house_id).toBe(`${HOUSE_1},${HOUSE_2}`);
  });

  it('allows a TL request for one of its own assigned houses', () => {
    const { passed } = run(requireScope, {
      user: { role: 'TEAM_LEADER', company_id: COMPANY_A, assigned_house_ids: [HOUSE_1] },
      query: { house_id: HOUSE_1 },
    });
    expect(passed).toBe(true);
  });
});

describe('requireRole / requireMinRole — operational-action gating', () => {
  it('blocks a TL from an RM-only escalation mutation', () => {
    const mw = requireRole('REGISTERED_MANAGER', 'DIRECTOR', 'ADMIN', 'SUPER_ADMIN');
    const { res, passed } = run(mw, { user: { role: 'TEAM_LEADER', company_id: COMPANY_A } });
    expect(passed).toBe(false);
    expect(res.statusCode).toBe(403);
  });

  it('allows an RM through an RM-only mutation', () => {
    const mw = requireRole('REGISTERED_MANAGER', 'DIRECTOR', 'ADMIN', 'SUPER_ADMIN');
    const { passed } = run(mw, { user: { role: 'REGISTERED_MANAGER', company_id: COMPANY_A } });
    expect(passed).toBe(true);
  });

  it('requireMinRole(REGISTERED_MANAGER) rejects TL and admits RM/Director', () => {
    const mw = requireMinRole('REGISTERED_MANAGER');
    expect(run(mw, { user: { role: 'TEAM_LEADER', company_id: COMPANY_A } }).passed).toBe(false);
    expect(run(mw, { user: { role: 'REGISTERED_MANAGER', company_id: COMPANY_A } }).passed).toBe(true);
    expect(run(mw, { user: { role: 'DIRECTOR', company_id: COMPANY_A } }).passed).toBe(true);
  });
});

describe('blockOversightRole — RI is independent oversight, not an operator', () => {
  it('blocks a Responsible Individual from an operational write', () => {
    const { res, passed } = run(blockOversightRole, { user: { role: 'RESPONSIBLE_INDIVIDUAL', company_id: COMPANY_A } });
    expect(passed).toBe(false);
    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe('OVERSIGHT_READONLY');
  });

  it('allows a Registered Manager through an operational write', () => {
    const { passed } = run(blockOversightRole, { user: { role: 'REGISTERED_MANAGER', company_id: COMPANY_A } });
    expect(passed).toBe(true);
  });
});
