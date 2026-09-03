/**
 * Frozen Governance Architecture v1 — release-critical tests (docs/TEST_PLAN.md).
 * Hermetic: the only external dependency (the database `query`) is mocked, so these
 * assert the governance RULES, not the SQL engine.
 */

jest.mock('../../config/database', () => ({
  query: jest.fn(),
  getClient: jest.fn(),
}));
jest.mock('../notifications.service', () => ({ notificationsService: { create: jest.fn() } }));
jest.mock('../../repositories/risks.repo', () => ({
  risksRepo: {
    findById: jest.fn(async () => ({ id: 'risk-1', house_id: 'house-1', linked_person: null, status: 'Open' })),
    addEvent: jest.fn(),
    updateStatus: jest.fn(),
  },
}));

import { query, getClient } from '../../config/database';
import { risksService } from '../risks.service';
import { governanceWorkflowService } from '../governanceWorkflow.service';
import { dailyGovernanceService } from '../dailyGovernance.service';

const mockQuery = query as jest.MockedFunction<typeof query>;
const mockGetClient = getClient as jest.MockedFunction<typeof getClient>;

// ---------------------------------------------------------------------------
// Risks — closure is evidence-based; task completion alone can never close a risk.
// ---------------------------------------------------------------------------
type ClosureState = { actionsOpen: number; actionsTotal: number; ratedOk: number; rated: number; openEsc: number; recent: number; prior: number };

function wireClosure(s: ClosureState) {
  mockQuery.mockReset();
  mockQuery.mockImplementation(async (sql: string) => {
    if (/AS open/.test(sql) && /FROM risk_actions/.test(sql)) return { rows: [{ open: s.actionsOpen, total: s.actionsTotal }] } as any;
    if (/rated_ok/.test(sql)) return { rows: [{ rated_ok: s.ratedOk, rated: s.rated }] } as any;
    if (/FROM escalations WHERE risk_id/.test(sql)) return { rows: [{ n: s.openEsc }] } as any;
    if (/FROM governance_pulses/.test(sql)) return { rows: [{ recent: s.recent, prior: s.prior }] } as any;
    return { rows: [], rowCount: 0 } as any;
  });
}

const CLEAR: ClosureState = { actionsOpen: 0, actionsTotal: 2, ratedOk: 1, rated: 2, openEsc: 0, recent: 0, prior: 3 };

describe('Risk closure gate (Ch6 / TEST_PLAN §Risks)', () => {
  it('is eligible when actions complete, controls rated effective, no escalation, trajectory improving', async () => {
    wireClosure(CLEAR);
    const r = await risksService.closureReview('risk-1', 'co-1');
    expect(r.eligible).toBe(true);
    expect(r.blockers).toHaveLength(0);
  });

  it('task completion alone cannot close — an open action blocks closure', async () => {
    wireClosure({ ...CLEAR, actionsOpen: 1 });
    const r = await risksService.closureReview('risk-1', 'co-1');
    expect(r.eligible).toBe(false);
    expect(r.blockers.join(' ')).toMatch(/action/i);
  });

  it('an open escalation blocks closure', async () => {
    wireClosure({ ...CLEAR, openEsc: 1 });
    const r = await risksService.closureReview('risk-1', 'co-1');
    expect(r.eligible).toBe(false);
    expect(r.blockers.join(' ')).toMatch(/escalation/i);
  });

  it('an outstanding effectiveness review blocks closure', async () => {
    wireClosure({ ...CLEAR, ratedOk: 0, rated: 0 });
    const r = await risksService.closureReview('risk-1', 'co-1');
    expect(r.eligible).toBe(false);
    expect(r.blockers.join(' ')).toMatch(/effectiveness/i);
  });

  it('a deteriorating trajectory blocks closure', async () => {
    wireClosure({ ...CLEAR, recent: 5, prior: 1 });
    const r = await risksService.closureReview('risk-1', 'co-1');
    expect(r.eligible).toBe(false);
    expect(r.blockers.join(' ')).toMatch(/deteriorat/i);
  });

  it('closeRisk refuses while the risk is not eligible', async () => {
    wireClosure({ ...CLEAR, actionsOpen: 2 });
    await expect(
      risksService.closeRisk('risk-1', 'co-1', 'user-1', { verdict: 'Resolved — no longer applicable', reason: 'A rationale long enough to pass the twenty character minimum.' })
    ).rejects.toThrow(/cannot be closed yet/i);
  });
});

// ---------------------------------------------------------------------------
// Signals — leadership attention is a marker, not a severity change.
// ---------------------------------------------------------------------------
describe('Leadership attention (Ch4 / TEST_PLAN §Signals)', () => {
  it('requires a clear reason', async () => {
    mockQuery.mockReset();
    await expect(governanceWorkflowService.markLeadershipAttention('co-1', 'p-1', 'u-1', 'too short')).rejects.toThrow(/reason/i);
  });

  it('never changes severity (the update does not touch the severity column)', async () => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue({ rows: [{ id: 'p-1', leadership_attention: true }] } as any);
    await governanceWorkflowService.markLeadershipAttention('co-1', 'p-1', 'u-1', 'This needs the RM to look at it today.');
    const sql = (mockQuery.mock.calls[0]?.[0] as string) || '';
    expect(sql).toMatch(/leadership_attention = TRUE/);
    expect(sql).not.toMatch(/severity\s*=/);
  });
});

// ---------------------------------------------------------------------------
// Patterns — the pattern is the last thing to close.
// ---------------------------------------------------------------------------
describe('Pattern review + closure guard (Ch7 / TEST_PLAN §Patterns)', () => {
  it('requires a meaningful rationale', async () => {
    mockQuery.mockReset();
    await expect(governanceWorkflowService.reviewPattern('co-1', 'c-1', 'u-1', 'Escalate', 'short')).rejects.toThrow(/rationale/i);
  });

  it('cannot close while the linked risk is active', async () => {
    mockQuery.mockReset();
    mockQuery.mockImplementation(async (sql: string) => {
      if (/FROM signal_clusters WHERE id/.test(sql)) return { rows: [{ id: 'c-1', linked_risk_id: 'risk-1' }] } as any;
      if (/FROM risks WHERE id/.test(sql)) return { rows: [{ id: 'risk-1' }] } as any; // still active
      if (/FROM escalations/.test(sql)) return { rows: [{ n: 0 }] } as any;
      return { rows: [], rowCount: 0 } as any;
    });
    await expect(
      governanceWorkflowService.reviewPattern('co-1', 'c-1', 'u-1', 'Close', 'The pattern has settled and we want to close it now.')
    ).rejects.toThrow(/cannot close/i);
  });

  it('cannot close while a linked escalation is open', async () => {
    mockQuery.mockReset();
    mockQuery.mockImplementation(async (sql: string) => {
      if (/FROM signal_clusters WHERE id/.test(sql)) return { rows: [{ id: 'c-1', linked_risk_id: null }] } as any;
      if (/FROM escalations/.test(sql)) return { rows: [{ n: 1 }] } as any; // open escalation
      return { rows: [], rowCount: 0 } as any;
    });
    await expect(
      governanceWorkflowService.reviewPattern('co-1', 'c-1', 'u-1', 'Close', 'The pattern has settled and we want to close it now.')
    ).rejects.toThrow(/cannot close/i);
  });
});

// ---------------------------------------------------------------------------
// Daily Governance is atomic — a failed decision rolls the whole review back.
// ---------------------------------------------------------------------------
describe('Daily Governance transaction (PDF Phase 3 / TEST_PLAN)', () => {
  it('rolls back and never commits when a decision task fails', async () => {
    const seen: string[] = [];
    const client: any = {
      query: jest.fn(async (sql: string) => {
        seen.push(sql.trim().split('\n')[0].trim());
        if (/^BEGIN/.test(sql.trim())) return {};
        if (/FOR UPDATE/.test(sql)) return { rows: [{ house_id: 'h1' }] };
        if (/UPDATE daily_governance_log/.test(sql)) return { rows: [{ id: 'log1', completed: true }] };
        if (/INSERT INTO governance_reviews/.test(sql)) return { rows: [{ id: 'rev1' }] };
        if (/INSERT INTO risk_actions/.test(sql)) throw new Error('task insert failed');
        return { rows: [] };
      }),
      release: jest.fn(),
    };
    mockGetClient.mockResolvedValue(client);

    await expect(
      dailyGovernanceService.completeLog('log1', {
        note: 'n', user_id: 'u1', company_id: 'co1', material_change: true, team_brief: 'brief',
        decisions: [{ decision: 'Create Action', whatIsHappening: 'do the audit', ownerId: 'u2', sourceType: 'signal', sourceId: 's1' }],
      } as any)
    ).rejects.toThrow(/task insert failed/i);

    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(seen.some((s) => /^COMMIT/.test(s))).toBe(false);
    expect(client.release).toHaveBeenCalled();
  });
});
