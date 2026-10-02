// The atomic core (UPDATE risk_actions + INSERT action_effectiveness_reviews) runs on a transaction
// client; everything else uses the top-level query(). The mock client routes by SQL: no duplicate
// found, the UPDATE returns the updated action, the INSERT/BEGIN/COMMIT succeed.
const mockClient = {
  query: jest.fn(async (sql: string) => {
    if (/SELECT 1 FROM action_effectiveness_reviews/.test(sql)) return { rows: [] };
    if (/UPDATE risk_actions/.test(sql)) return { rows: [{ id: 'a1', status: 'Completed', risk_id: null, effectiveness_outcome: 'Effective' }] };
    return { rows: [] };
  }),
  release: jest.fn(),
};
jest.mock('../../config/database', () => ({ query: jest.fn(), getClient: jest.fn() }));
jest.mock('../../repositories/risks.repo', () => ({ risksRepo: { getActionById: jest.fn() } }));
jest.mock('../risks.service', () => ({ risksService: { updateTrajectoryFromActions: jest.fn() } }));
jest.mock('../reviewObligations.service', () => ({ reviewObligationsService: { open: jest.fn(), complete: jest.fn() } }));

import { query, getClient } from '../../config/database';
import { risksRepo } from '../../repositories/risks.repo';
import { reviewObligationsService } from '../reviewObligations.service';
import { actionEffectivenessService } from '../actionEffectiveness.service';

describe('canonical action effectiveness', () => {
  // Reset the query mock between tests so mock.calls reflects only the test under way (the summary
  // assertion inspects mock.calls[0], which otherwise carries over the previous test's calls).
  beforeEach(() => {
    (query as jest.Mock).mockReset();
    mockClient.query.mockClear();
    (getClient as jest.Mock).mockResolvedValue(mockClient);
  });

  const completedAction = {
    id: 'a1', status: 'Completed', risk_id: null,
    // Classified effectiveness-bearing under the Canonical Action Evidence Contract, so it is
    // eligible for an effectiveness rating (legacy unclassified actions must be remediated first).
    review_requirement: 'EFFECTIVENESS_REQUIRED',
    completion_evidence: 'The assigned work was completed and checked.',
    intended_outcome: 'The underlying concern reduces after the action.',
  };

  it('rates a signal-level action and completes its durable review obligation', async () => {
    (risksRepo.getActionById as jest.Mock).mockResolvedValue(completedAction);
    (query as jest.Mock).mockResolvedValue({ rows: [{ id: 'a1', status: 'Completed', risk_id: null, effectiveness_outcome: 'Effective' }] });
    await actionEffectivenessService.rateEffectiveness('a1', 'co', 'rm', { outcome: 'Effective', evidence: 'No recurrence was observed after the completed action.' });
    expect(reviewObligationsService.complete).toHaveBeenCalledWith('co', 'ACTION_EFFECTIVENESS', 'a1', 'rm', expect.stringContaining('Effective'));
  });

  it('requires Too Early to carry a genuinely future review date', async () => {
    (risksRepo.getActionById as jest.Mock).mockResolvedValue(completedAction);
    await expect(actionEffectivenessService.rateEffectiveness('a1', 'co', 'rm', {
      outcome: 'Too Early To Assess', next_review_date: '2000-01-01',
    })).rejects.toThrow(/must be in the future/i);
    await expect(actionEffectivenessService.rateEffectiveness('a1', 'co', 'rm', {
      outcome: 'Too Early To Assess',
    })).rejects.toThrow(/requires a future review date/i);
  });

  it('writes an append-only review record after updating the current projection', async () => {
    (risksRepo.getActionById as jest.Mock).mockResolvedValue(completedAction);
    (query as jest.Mock).mockResolvedValue({ rows: [{ ...completedAction, effectiveness_outcome: 'Effective' }] });
    await actionEffectivenessService.rateEffectiveness('a1', 'co', 'rm', { outcome: 'Effective', evidence: 'The intended outcome was achieved with no recurrence.' });
    // History insert and the current-projection update both run on the transaction client, bracketed
    // by BEGIN/COMMIT — the atomic contract (E1).
    const clientSqls = mockClient.query.mock.calls.map(([s]) => String(s));
    expect(clientSqls.some((s) => /INSERT INTO action_effectiveness_reviews/.test(s))).toBe(true);
    expect(clientSqls.some((s) => /UPDATE risk_actions/.test(s))).toBe(true);
    expect(clientSqls.some((s) => /BEGIN/.test(s))).toBe(true);
    expect(clientSqls.some((s) => /COMMIT/.test(s))).toBe(true);
  });

  it('measures summaries by review date and includes organisation-wide actions', async () => {
    (query as jest.Mock).mockImplementation(async (sql: string) => /WITH reviewed/.test(sql)
      ? { rows: [{ org_summary: {}, service_comparison: [], domain_analysis: [], daily_trend: [] }] }
      : { rows: [] });
    await actionEffectivenessService.summary('co', '2026-09-01', '2026-09-09');
    const sql = String((query as jest.Mock).mock.calls[0][0]);
    expect(sql).toMatch(/canonical_action_effectiveness_v/);
    expect(sql).toMatch(/effectiveness_reviewed_at >=/);
    expect(sql).toMatch(/effectiveness_reviewed_at < CASE/);
    expect(sql).toMatch(/LEFT JOIN houses/);
    expect(sql).toMatch(/Too Early To Assess/);
  });
});
