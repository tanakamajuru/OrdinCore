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
jest.mock('../../events/eventBus', () => ({ eventBus: { emitEvent: jest.fn() }, EVENTS: {} }));

import { governanceDecisionsService } from '../governanceDecisions.service';
import { governanceWorkflowService } from '../governanceWorkflow.service';
import { closureService } from '../closure.service';
import { myWorkService } from '../myWork.service';
import { blockOversightRole } from '../../middleware/role.middleware';
import { query, getClient } from '../../config/database';

const mockQuery = query as jest.MockedFunction<any>;
const mockGetClient = getClient as jest.MockedFunction<any>;

// A fake PoolClient that records every SQL it sees and answers via a matcher fn.
function fakeClient(answer: (sql: string, params: any[]) => any) {
  const sqls: string[] = [];
  const calls: { sql: string; params: any[] }[] = [];
  const client = {
    sqls,
    calls,
    query: jest.fn(async (sql: string, params: any[] = []) => {
      sqls.push(sql);
      calls.push({ sql, params });
      return answer(sql, params) ?? { rows: [], rowCount: 0 };
    }),
    release: jest.fn(),
  };
  return client;
}

// Find the params of the first recorded query whose SQL matches a pattern.
function paramsOf(client: any, re: RegExp): any[] | undefined {
  return client.calls.find((c: any) => re.test(c.sql))?.params;
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

describe('§11 Risk closure — blocked while effectiveness review is outstanding', () => {
  it('refuses to close a risk when effectiveness has not been reviewed', async () => {
    mockQuery.mockReset();
    mockQuery.mockImplementation(async (sql: string) => {
      if (/FROM risks WHERE id = \$1 AND company_id/.test(sql)) return { rows: [{ id: 'r1', status: 'Open' }] } as any;
      return { rows: [] } as any;
    });
    await expect(
      closureService.closeRisk('co', 'r1', 'u', {
        pattern_reduced: true, actions_completed: true, effectiveness_reviewed: false,
        further_escalation_required: false, evidence: 'x',
      })
    ).rejects.toThrow(/effectiveness/i);
    // The block happens before any write.
    expect(mockQuery.mock.calls.some((c: any[]) => /INSERT INTO closure_reviews/.test(c[0] as string))).toBe(false);
  });
});

describe('§5/§11 Pattern closure — blocked when a new signal appears during monitoring', () => {
  it('is ineligible when a linked signal is still New', async () => {
    mockQuery.mockReset();
    mockQuery.mockImplementation(async (sql: string) => {
      if (/FROM signal_clusters WHERE id/.test(sql)) return { rows: [{ id: 'cl-1', linked_risk_id: null, last_reviewed_at: new Date() }] } as any;
      if (/FROM risk_signal_links/.test(sql)) return { rows: [{ n: 1 }] } as any; // a new signal
      return { rows: [{ n: 0 }] } as any;
    });
    const res = await governanceWorkflowService.assessPatternClosure('co', 'cl-1');
    expect(res.eligible).toBe(false);
    expect(res.blockers.join(' ')).toMatch(/new signals/i);
  });
});

describe('§4/§11 Escalation closure — mandatory risk review surfaces in the RM work queue', () => {
  it('shows a post-escalation risk review item for an RM', async () => {
    mockQuery.mockReset();
    mockQuery.mockImplementation(async (sql: string) => {
      if (/FROM houses WHERE company_id/.test(sql)) return { rows: [{ id: 'h1' }] } as any;
      if (/post_closure_risk_review_required = TRUE/.test(sql)) return { rows: [{ n: 2 }] } as any;
      if (/FROM escalations/.test(sql)) return { rows: [{ n: 0, urgent: 0 }] } as any;
      if (/FROM governance_pulses/.test(sql)) return { rows: [{ n: 0 }] } as any;
      if (/effectiveness IS NULL/.test(sql)) return { rows: [{ n: 0 }] } as any;
      if (/FROM risk_actions/.test(sql)) return { rows: [{ open: 0, overdue: 0 }] } as any;
      if (/FROM weekly_reviews/.test(sql)) return { rows: [{ n: 1 }] } as any;
      return { rows: [{ n: 0 }] } as any;
    });
    const out = await myWorkService.getForUser('co', 'u', 'REGISTERED_MANAGER');
    const item = out.items.find((i: any) => i.key === 'post_escalation_review');
    expect(item).toBeDefined();
    expect(item!.count).toBe(2);
  });
});

describe('§6/§11 Tenant isolation — a pattern from another company cannot be reviewed', () => {
  it('rolls back and reports not found when the pattern is out of company scope', async () => {
    const client = fakeClient((sql) => {
      if (/BEGIN/.test(sql)) return { rows: [] };
      if (/FROM signal_clusters/.test(sql) && /FOR UPDATE/.test(sql)) return { rows: [] }; // not in this company
      return { rows: [] };
    });
    mockGetClient.mockResolvedValue(client);
    await expect(
      governanceWorkflowService.reviewPattern('company-A', 'cl-of-company-B', 'u', 'Escalate', 'A clearly meaningful rationale sentence.')
    ).rejects.toThrow(/not found/i);
    expect(client.sqls.some((s) => /ROLLBACK/.test(s))).toBe(true);
  });
});

describe('§2 Create Pattern / Link to Pattern decisions', () => {
  it('Create Pattern creates a cluster and links the originating signal', async () => {
    const client = fakeClient((sql) => {
      if (/INSERT INTO governance_reviews/.test(sql)) return { rows: [{ id: 'dec-1' }] };
      if (/FROM governance_pulses WHERE id = \$1 AND company_id/.test(sql)) return { rows: [{ id: 'p1', house_id: 'h1', risk_domain: ['Behaviour'], related_person: null }] };
      if (/INSERT INTO signal_clusters/.test(sql)) return { rows: [{ id: 'cl-new' }] };
      return { rows: [] };
    });
    const out = await governanceDecisionsService.executeInTx(client as any, {
      company_id: 'co', user_id: 'u', pulse_entry_id: 'p1',
      what_is_happening: 'A new emerging pattern of concern.', decision: 'Create Pattern',
    });
    expect(out.pattern?.id).toBe('cl-new');
    expect(client.sqls.some((s) => /INSERT INTO risk_signal_links/.test(s))).toBe(true);
  });

  it('Link to Pattern links to an existing cluster without creating one', async () => {
    const client = fakeClient((sql) => {
      if (/INSERT INTO governance_reviews/.test(sql)) return { rows: [{ id: 'dec-1' }] };
      if (/FROM signal_clusters WHERE id = \$1 AND company_id/.test(sql)) return { rows: [{ id: 'cl-1' }] };
      if (/INSERT INTO risk_signal_links/.test(sql)) return { rows: [{ id: 'link-1' }] };
      return { rows: [] };
    });
    const out = await governanceDecisionsService.executeInTx(client as any, {
      company_id: 'co', user_id: 'u', pulse_entry_id: 'p1', cluster_id: 'cl-1',
      what_is_happening: 'Link this signal to the existing pattern.', decision: 'Link to Pattern',
    });
    expect(out.pattern?.id).toBe('cl-1');
    expect(client.sqls.some((s) => /INSERT INTO signal_clusters/.test(s))).toBe(false);
    expect(client.sqls.some((s) => /INSERT INTO risk_signal_links/.test(s))).toBe(true);
  });
});

// §14 — the required staging journey, exercised through the shared executor. This proves the
// chain is reconstructed by LINEAGE (each downstream record carries its source ids), not by
// copying narratives — the property §8/§14 depend on. A live UI walkthrough remains the final
// human acceptance step, but the wiring is verified here end to end.
describe('§14 Full governance journey — lineage is threaded at every hop', () => {
  const SIGNAL = 'sig-1', HOUSE = 'h1', CO = 'co', USER = 'u';

  it('signal → decision → task carries source signal + decision lineage', async () => {
    const client = fakeClient((sql) => {
      if (/INSERT INTO governance_reviews/.test(sql)) return { rows: [{ id: 'dec-1' }] };
      if (/INSERT INTO risk_actions/.test(sql)) return { rows: [{ id: 'task-1', title: 'do it' }] };
      return { rows: [] };
    });
    const out = await governanceDecisionsService.executeInTx(client as any, {
      company_id: CO, user_id: USER, house_id: HOUSE, pulse_entry_id: SIGNAL,
      what_is_happening: 'Act on this concern promptly.', decision: 'Create Action', owner_id: 'tl-1',
    });
    expect(out.task?.id).toBe('task-1');
    const p = paramsOf(client, /INSERT INTO risk_actions/)!;
    expect(p).toContain('dec-1');   // governance_review_id lineage
    expect(p).toContain(SIGNAL);    // source_pulse_id lineage
  });

  it('signal → pattern → promote: risk carries source cluster, pattern gets linked_risk_id', async () => {
    const client = fakeClient((sql) => {
      if (/INSERT INTO governance_reviews/.test(sql)) return { rows: [{ id: 'dec-2' }] };
      if (/FROM signal_clusters/.test(sql) && /FOR UPDATE/.test(sql)) return { rows: [{ id: 'cl-1', linked_risk_id: null, risk_domain: 'Safety', house_id: HOUSE, affected_house_ids: null, linked_person: null }] };
      if (/INSERT INTO risks/.test(sql)) return { rows: [{ id: 'risk-1' }] };
      return { rows: [] };
    });
    const out = await governanceDecisionsService.executeInTx(client as any, {
      company_id: CO, user_id: USER, cluster_id: 'cl-1',
      what_is_happening: 'Promote this recurring pattern to a formal risk.', decision: 'Promote to Risk',
    });
    expect(out.risk?.id).toBe('risk-1');
    const riskParams = paramsOf(client, /INSERT INTO risks/)!;
    expect(riskParams).toContain('cl-1');                                   // source_cluster_id lineage
    expect(client.sqls.some((s) => /UPDATE signal_clusters SET linked_risk_id/.test(s))).toBe(true);
    expect(client.sqls.some((s) => /UPDATE governance_reviews SET risk_id/.test(s))).toBe(true);
  });

  it('pattern → escalate: escalation retains source-pattern and decision lineage', async () => {
    const client = fakeClient((sql) => {
      if (/INSERT INTO governance_reviews/.test(sql)) return { rows: [{ id: 'dec-3' }] };
      if (/FROM escalations WHERE company_id/.test(sql)) return { rows: [] };     // no existing open one
      if (/FROM users WHERE company_id/.test(sql)) return { rows: [{ id: 'rm-1' }] };
      if (/INSERT INTO escalations/.test(sql)) return { rows: [{ id: 'esc-1' }] };
      return { rows: [] };
    });
    const out = await governanceDecisionsService.executeInTx(client as any, {
      company_id: CO, user_id: USER, cluster_id: 'cl-1', house_id: HOUSE,
      what_is_happening: 'Escalate this pattern to the Registered Manager.', decision: 'Escalate',
    });
    expect(out.escalation?.id).toBe('esc-1');
    const escParams = paramsOf(client, /INSERT INTO escalations/)!;
    expect(escParams).toContain('cl-1');    // source_cluster_id lineage
    expect(escParams).toContain('dec-3');   // source_governance_review_id lineage
  });

  it('escalation closed → linked risk still open and pattern closure remains blocked', async () => {
    // With the linked risk active, the pattern is not eligible to close (Chapter 7 doctrine).
    mockQuery.mockReset();
    mockQuery.mockImplementation(async (sql: string) => {
      if (/FROM signal_clusters WHERE id/.test(sql)) return { rows: [{ id: 'cl-1', linked_risk_id: 'risk-1', last_reviewed_at: new Date() }] } as any;
      if (/FROM risks WHERE id = \$1 AND company_id/.test(sql)) return { rows: [{ id: 'risk-1' }] } as any; // still active
      return { rows: [{ n: 0 }] } as any;
    });
    const res = await governanceWorkflowService.assessPatternClosure(CO, 'cl-1');
    expect(res.eligible).toBe(false);
    expect(res.blockers.join(' ')).toMatch(/linked risk remains active/i);
  });
});
