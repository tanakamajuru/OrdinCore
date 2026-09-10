jest.mock('../../config/database', () => ({ query: jest.fn() }));
jest.mock('../../repositories/risks.repo', () => ({ risksRepo: { getActionById: jest.fn() } }));
jest.mock('../risks.service', () => ({ risksService: { updateTrajectoryFromActions: jest.fn() } }));
jest.mock('../reviewObligations.service', () => ({ reviewObligationsService: { open: jest.fn(), complete: jest.fn() } }));

import { query } from '../../config/database';
import { risksRepo } from '../../repositories/risks.repo';
import { reviewObligationsService } from '../reviewObligations.service';
import { actionEffectivenessService } from '../actionEffectiveness.service';

describe('canonical action effectiveness', () => {
  // Reset the query mock between tests so mock.calls reflects only the test under way (the summary
  // assertion inspects mock.calls[0], which otherwise carries over the previous test's calls).
  beforeEach(() => (query as jest.Mock).mockReset());

  it('rates a signal-level action and completes its durable review obligation', async () => {
    (risksRepo.getActionById as jest.Mock).mockResolvedValue({ id: 'a1', status: 'Completed', risk_id: null });
    (query as jest.Mock).mockResolvedValue({ rows: [{ id: 'a1', status: 'Completed', risk_id: null, effectiveness_outcome: 'Effective' }] });
    await actionEffectivenessService.rateEffectiveness('a1', 'co', 'rm', { outcome: 'Effective', evidence: 'No recurrence was observed after the completed action.' });
    expect(reviewObligationsService.complete).toHaveBeenCalledWith('co', 'ACTION_EFFECTIVENESS', 'a1', 'rm', expect.stringContaining('Effective'));
  });

  it('measures summaries by review date and includes organisation-wide actions', async () => {
    (query as jest.Mock).mockImplementation(async (sql: string) => /WITH reviewed/.test(sql)
      ? { rows: [{ org_summary: {}, service_comparison: [], domain_analysis: [], daily_trend: [] }] }
      : { rows: [] });
    await actionEffectivenessService.summary('co', '2026-09-01', '2026-09-09');
    const sql = String((query as jest.Mock).mock.calls[0][0]);
    expect(sql).toMatch(/effectiveness_reviewed_at BETWEEN/);
    expect(sql).toMatch(/LEFT JOIN houses/);
  });
});
