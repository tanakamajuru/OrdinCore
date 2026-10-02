jest.mock('../../config/database', () => ({ query: jest.fn() }));

import { query } from '../../config/database';
import { learningService } from '../learning.service';

describe('learning records', () => {
  beforeEach(() => (query as jest.Mock).mockReset());

  it('rejects an identified lesson with no learning text', async () => {
    await expect(learningService.create('co', 'u', { source_type: 'WEEKLY_REVIEW', state: 'IDENTIFIED' }))
      .rejects.toThrow(/what was learnt/i);
  });

  it('rejects no-learning without a reason', async () => {
    await expect(learningService.create('co', 'u', { source_type: 'EFFECTIVENESS', state: 'NONE_IDENTIFIED' }))
      .rejects.toThrow(/brief reason/i);
  });

  it('rejects not-yet-assessed without a review date', async () => {
    await expect(learningService.create('co', 'u', { source_type: 'RISK_CLOSURE', state: 'NOT_YET_ASSESSED' }))
      .rejects.toThrow(/review date/i);
  });

  it('rejects an unknown source type', async () => {
    await expect(learningService.create('co', 'u', { source_type: 'NONSENSE' as any, state: 'IDENTIFIED', what_learnt: 'x' }))
      .rejects.toThrow(/Invalid learning source/i);
  });

  it('stamps a human-authored identified lesson as approved and stores it', async () => {
    (query as jest.Mock).mockResolvedValue({ rows: [{ id: 'l1' }] });
    await learningService.create('co', 'rm', { source_type: 'WEEKLY_REVIEW', state: 'IDENTIFIED', what_learnt: 'Checks missed repeated faults' });
    const [, params] = (query as jest.Mock).mock.calls[0];
    // approved_by (idx 16) is the author and is_ai_suggested (idx 15) is false for human entries.
    expect(params[15]).toBe(false);
    expect(params[16]).toBe('rm');
  });

  it('stores an AI suggestion unapproved', async () => {
    (query as jest.Mock).mockResolvedValue({ rows: [{ id: 'l2' }] });
    await learningService.create('co', 'rm', { source_type: 'WEEKLY_REVIEW', state: 'IDENTIFIED', what_learnt: 'Possible theme', is_ai_suggested: true });
    const [, params] = (query as jest.Mock).mock.calls[0];
    expect(params[15]).toBe(true);
    expect(params[16]).toBeNull();
  });
});
