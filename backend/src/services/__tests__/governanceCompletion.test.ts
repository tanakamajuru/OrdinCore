/**
 * Completion Guide (§2–§9) — governance integrity guarantees.
 *
 * These lock in the doctrine that a lifecycle status is only ever set when its linked
 * record was actually created, in the same transaction, exactly once:
 *  - Promote to Risk / Escalate are idempotent (duplicate submission ⇒ no duplicate record)
 *  - A failed downstream write rolls the whole review back (no swallowed error, no phantom status)
 *  - A pattern cannot close while its work/decisions/effectiveness are outstanding
 *  - The Responsible Individual (oversight) cannot perform operational writes
 */

jest.mock('../../config/database', () => ({
  query: jest.fn(),
  getClient: jest.fn(),
}));
jest.mock('../notifications.service', () => ({ notificationsService: { create: jest.fn() } }));

import { governanceDecisionsService } from '../governanceDecisions.service';
import { governanceWorkflowService } from '../governanceWorkflow.service';
import { blockOversightRole } from '../../middleware/role.middleware';
import { query, getClient } from '../../config/database';

const mockQuery = query as jest.MockedFunction<any>;
const mockGetClient = getClient as jest.MockedFunction<any>;

// A fake PoolClient that records every SQL it sees and answers via a matcher fn.
function fakeClient(answer: (sql: string, params: any[]) => any) {
  const sqls: string[] = [];
  const client = {
    sqls,
    query: jest.fn(async (sql: string, params: any[] = []) => {
      sqls.push(sql);
      return answer(sql, params) ?? { rows: [], rowCount: 0 };
    }),
    release: jest.fn(),
  };
  return client;
}

describe('§3 Promote to Risk — idempotent (no duplicate risk)', () => {
  it('returns the pattern\'s existing linked risk instead of creating a second one', async () => {
    const client = fakeClient((sql) => {
      if (/INSERT INTO governance_reviews/.test(sql)) return { rows: [{ id: 'dec-1' }] };
      if (/FROM signal_clusters/.test(sql) && /FOR UPDATE/.test(sql)) {
        return { rows: [{ id: 'cl-1', linked_risk_id: 'risk-existing', risk_domain: 'Behaviour', house_id: 'h1', linked_person: null }] };
      }
      if (/FROM risks WHERE id = \$1/.test(sql)) return { rows: [{ id: 'risk-existing', status: 'Open' }] };
      return { rows: [] };
    });

    const out = await governanceDecisionsService.executeInTx(client as any, {
      company_id: 'co', user_id: 'u', cluster_id: 'cl-1',
      what_is_happening: 'promote this recurring pattern', decision: 'Promote to Risk',
    });

    expect(out.risk?.id).toBe('risk-existing');
    expect(client.sqls.some((s) => /INSERT INTO risks/i.test(s))).toBe(false);
  });
});

describe('§3 Escalate — idempotent (reuses an open escalation)', () => {
  it('does not open a second escalation for a pattern that already has one open', async () => {
    const client = fakeClient((sql) => {
      if (/INSERT INTO governance_reviews/.test(sql)) return { rows: [{ id: 'dec-1' }] };
      if (/FROM escalations WHERE company_id/.test(sql) && /NOT IN/.test(sql)) {
        return { rows: [{ id: 'esc-open' }] };
      }
      return { rows: [] };
    });

    const out = await governanceDecisionsService.executeInTx(client as any, {
      company_id: 'co', user_id: 'u', cluster_id: 'cl-1',
      what_is_happening: 'escalate this pattern now', decision: 'Escalate',
    });

    expect(out.escalation?.id).toBe('esc-open');
    expect(client.sqls.some((s) => /INSERT INTO escalations/i.test(s))).toBe(false);
  });
});

describe('§3/§9 Pattern review — a failed downstream write rolls back (no phantom status)', () => {
  it('rolls back and rethrows if the escalation insert fails; never commits', async () => {
    const client = fakeClient((sql) => {
      if (/BEGIN/.test(sql)) return { rows: [] };
      if (/FROM signal_clusters/.test(sql) && /FOR UPDATE/.test(sql)) {
        return { rows: [{ id: 'cl-1', cluster_label: 'Falls', risk_domain: 'Safety', house_id: 'h1', affected_house_ids: null, linked_risk_id: null }] };
      }
      if (/INSERT INTO governance_reviews/.test(sql)) return { rows: [{ id: 'dec-1' }] };
      if (/FROM escalations WHERE company_id/.test(sql)) return { rows: [] };        // no dup
      if (/FROM users WHERE company_id/.test(sql)) return { rows: [{ id: 'mgr-1' }] }; // a target
      if (/INSERT INTO escalations/.test(sql)) throw new Error('db down mid-escalate');
      return { rows: [] };
    });
    mockGetClient.mockResolvedValue(client);

    await expect(
      governanceWorkflowService.reviewPattern('co', 'cl-1', 'u', 'Escalate', 'This pattern is deteriorating and needs escalation.')
    ).rejects.toThrow(/db down mid-escalate/);

    expect(client.sqls.some((s) => /ROLLBACK/.test(s))).toBe(true);
    expect(client.sqls.some((s) => /COMMIT/.test(s))).toBe(false);
    // Crucially, the cluster status UPDATE must never have run.
    expect(client.sqls.some((s) => /UPDATE signal_clusters\s+SET last_reviewed_at/.test(s))).toBe(false);
  });
});

describe('§5 Pattern closure — blocked while work is outstanding', () => {
  it('is ineligible when an action from the pattern is still open', async () => {
    mockQuery.mockReset();
    mockQuery.mockImplementation(async (sql: string) => {
      if (/FROM signal_clusters WHERE id/.test(sql)) return { rows: [{ id: 'cl-1', linked_risk_id: null, last_reviewed_at: new Date() }] } as any;
      if (/FROM escalations/.test(sql)) return { rows: [{ n: 0 }] } as any;
      if (/FROM risk_actions/.test(sql) && /status NOT IN/.test(sql)) return { rows: [{ n: 1 }] } as any; // open action
      if (/FROM risk_actions/.test(sql)) return { rows: [{ n: 0 }] } as any;
      if (/FROM governance_reviews/.test(sql)) return { rows: [{ n: 0 }] } as any;
      if (/FROM risk_signal_links/.test(sql)) return { rows: [{ n: 0 }] } as any;
      return { rows: [{ n: 0 }] } as any;
    });

    const res = await governanceWorkflowService.assessPatternClosure('co', 'cl-1');
    expect(res.eligible).toBe(false);
    expect(res.blockers.join(' ')).toMatch(/action from this pattern is still open/i);
  });
});

describe('§7 Responsible Individual — oversight cannot perform operational writes', () => {
  const run = (role: string) => {
    const res: any = { statusCode: 0, body: null, status(c: number) { this.statusCode = c; return this; }, json(b: any) { this.body = b; return this; } };
    const next = jest.fn();
    blockOversightRole({ user: { role } } as any, res, next as any);
    return { res, next };
  };

  it('blocks the RI acting in oversight capacity with 403', () => {
    const { res, next } = run('RESPONSIBLE_INDIVIDUAL');
    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe('OVERSIGHT_READONLY');
    expect(next).not.toHaveBeenCalled();
  });

  it('allows an operational role (e.g. after switching active_role to Registered Manager)', () => {
    const { next } = run('REGISTERED_MANAGER');
    expect(next).toHaveBeenCalled();
  });
});
