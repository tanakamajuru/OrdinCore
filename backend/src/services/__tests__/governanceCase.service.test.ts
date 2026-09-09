jest.mock('../../config/database', () => ({ query: jest.fn() }));

import { query } from '../../config/database';
import { governanceCaseService } from '../governanceCase.service';

const q = query as jest.MockedFunction<any>;

describe('canonical governance case resolver', () => {
  beforeEach(() => q.mockReset());

  it('never resolves an anchor outside the tenant', async () => {
    q.mockResolvedValue({ rows: [] } as any);
    const result = await governanceCaseService.resolve('company-a', { signalId: 'signal-b' });
    expect(result.ids.signals).toEqual([]);
    expect(q.mock.calls.every((c: any[]) => c[1]?.includes?.('company-a'))).toBe(true);
  });

  it('includes action completion and effectiveness as separate timeline events', async () => {
    q.mockImplementation(async (sql: string) => {
      if (/FROM risk_actions ra/.test(sql)) return { rows: [{ id: 'a1', title: 'Repair', status: 'Completed', created_at: '2026-09-01', completed_at: '2026-09-02', completion_evidence: 'Repair completed', effectiveness_outcome: 'Effective', effectiveness_reviewed_at: '2026-09-03', effectiveness_evidence: 'No recurrence' }] } as any;
      return { rows: [] } as any;
    });
    const timeline = await governanceCaseService.timeline('co', { actionId: 'a1' });
    expect(timeline.map((x) => x.record)).toEqual(expect.arrayContaining(['Action', 'Action Completion', 'Effectiveness Review']));
  });
});
