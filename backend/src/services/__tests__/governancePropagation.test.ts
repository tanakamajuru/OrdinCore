jest.mock('../../config/database', () => ({ query: jest.fn() }));
jest.mock('../reviewObligations.service', () => ({ reviewObligationsService: { open: jest.fn() } }));
jest.mock('../../websocket/socket.server', () => ({ emitToCompany: jest.fn() }));
import { query } from '../../config/database';
import { reviewObligationsService } from '../reviewObligations.service';
import { governancePropagationService } from '../governancePropagation.service';

it('uses exact relational links and creates review obligations without closing records', async () => {
  (query as jest.Mock)
    .mockResolvedValueOnce({ rows: [{ risk_id: 'r1', source_cluster_id: 'c1', escalation_id: 'e1', intervention_id: 'i1' }] })
    .mockResolvedValueOnce({ rows: [{ id: 'r1' }, { id: 'strategic-r1' }] })
    .mockResolvedValueOnce({ rows: [] })
    .mockResolvedValueOnce({ rows: [] });
  await governancePropagationService.afterEffectiveness({ companyId: 'co', actionId: 'a1', riskId: 'r1', outcome: 'Effective', actorId: 'rm' });
  expect(reviewObligationsService.open).toHaveBeenCalledTimes(3);
  expect((query as jest.Mock).mock.calls.flat().join(' ')).not.toMatch(/UPDATE\s+(risks|escalations).*Closed/i);
});
