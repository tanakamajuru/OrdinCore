/**
 * G1 — Promotion evidentiary floor.
 * A cluster may only be promoted to a formal risk if it has >=3 linked signals,
 * OR at least one Critical signal. (Governance Integrity §9 / correction.md §2.1)
 */

// Mock the only external dependency the service chain touches at runtime.
jest.mock('../../config/database', () => ({
  query: jest.fn(),
}));

// notifications.service opens a BullMQ/Redis connection at import — stub it so the
// test stays hermetic and the runner exits cleanly.
jest.mock('../notifications.service', () => ({
  notificationsService: { create: jest.fn() },
}));

import { risksService } from '../risks.service';
import { query } from '../../config/database';

const mockQuery = query as jest.MockedFunction<typeof query>;

type Scenario = { signalCount: number; hasCritical: boolean };

function wireQuery({ signalCount, hasCritical }: Scenario) {
  mockQuery.mockReset();
  mockQuery.mockImplementation(async (sql: string) => {
    if (/FROM signal_clusters/.test(sql)) {
      return { rows: [{ id: 'cluster-1', signal_count: signalCount, risk_domain: 'Behaviour', linked_person: null }] } as any;
    }
    if (/COUNT\(\*\)::int AS count FROM risk_signal_links/.test(sql)) {
      return { rows: [{ count: signalCount }] } as any;
    }
    if (/gp\.severity = 'Critical'/.test(sql)) {
      return { rows: hasCritical ? [{ ok: 1 }] : [] } as any;
    }
    if (/^\s*INSERT INTO risks/i.test(sql) || /INSERT INTO risks/i.test(sql)) {
      return { rows: [{ id: 'risk-1', severity: 'Moderate', company_id: 'co-1', created_at: new Date(), status: 'Open' }] } as any;
    }
    // Default for all incidental writes/reads (events, escalation lookups, updates).
    return { rows: [], rowCount: 0 } as any;
  });
}

const promotionInput = {
  cluster_id: 'cluster-1',
  title: 'Behaviour pattern',
  severity: 'Moderate',
  trajectory: 'Stable',
  description: 'desc',
  house_id: 'house-1',
  category_id: 'cat-1',
  likelihood: 3,
  impact: 3,
};

describe('promoteFromCluster — evidentiary floor (G1)', () => {
  it('rejects a 2-signal, non-critical cluster', async () => {
    wireQuery({ signalCount: 2, hasCritical: false });
    await expect(
      risksService.promoteFromCluster('co-1', 'user-1', promotionInput)
    ).rejects.toThrow(/promotion threshold/i);
  });

  it('allows a cluster with >=3 signals', async () => {
    wireQuery({ signalCount: 3, hasCritical: false });
    const risk = await risksService.promoteFromCluster('co-1', 'user-1', promotionInput);
    expect(risk).toBeDefined();
    expect((risk as any).id).toBe('risk-1');
  });

  it('allows a 1-signal cluster when a signal is Critical', async () => {
    wireQuery({ signalCount: 1, hasCritical: true });
    const risk = await risksService.promoteFromCluster('co-1', 'user-1', promotionInput);
    expect((risk as any).id).toBe('risk-1');
  });
});
