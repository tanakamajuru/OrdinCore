jest.mock('../../config/database', () => ({ query: jest.fn() }));

import { query } from '../../config/database';
import { eventBus } from '../eventBus';

describe('canonical durable event idempotency', () => {
  it('publishes a material event once when its stable key is replayed', async () => {
    const listener = jest.fn();
    eventBus.on('test.material', listener);
    (query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ id: 'event-1' }] })
      .mockResolvedValueOnce({ rows: [] });

    const payload = { company_id: 'company-1', action_id: 'action-1' };
    await eventBus.emitEvent('test.material', payload, { idempotencyKey: 'action-1:v1' });
    await eventBus.emitEvent('test.material', payload, { idempotencyKey: 'action-1:v1' });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('ON CONFLICT'),
      ['test.material', JSON.stringify(payload), 'company-1', 'action-1:v1']);
    eventBus.removeListener('test.material', listener);
  });
});
