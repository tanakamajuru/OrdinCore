jest.mock('../../config/database', () => ({ query: jest.fn() }));
jest.mock('../trajectory.service', () => ({
  trajectoryForRisk: jest.fn(async () => ({ direction: 'Stable' })),
}));

import { query } from '../../config/database';
import { riskMetricsService } from '../riskMetrics.service';

const mockQuery = query as jest.MockedFunction<any>;

describe('Stage 10F risk metrics use canonical, tenant-scoped lineage', () => {
  it('counts signals and actions through risk or source-pattern lineage', async () => {
    const sqls: Array<{ sql: string; params: unknown[] }> = [];
    mockQuery.mockReset();
    mockQuery.mockImplementation(async (sql: string, params: unknown[] = []) => {
      sqls.push({ sql, params });
      if (/SELECT id, severity, source_cluster_id/.test(sql)) return { rows: [{ id: 'risk-1', severity: 'Medium', source_cluster_id: 'cluster-1' }] } as any;
      if (/COUNT\(DISTINCT rsl\.pulse_entry_id\)/.test(sql)) return { rows: [{ n: 2 }] } as any;
      if (/COALESCE\(MAX/.test(sql)) return { rows: [{ m: 3 }] } as any;
      if (/WITH matched AS/.test(sql)) return { rows: [{ latest: 'Effective', total: 1, open: 0, overdue: 0 }] } as any;
      if (/ AS cur,/.test(sql)) return { rows: [{ cur: 2, prev: 2 }] } as any;
      if (/COUNT\(DISTINCT COALESCE/.test(sql)) return { rows: [{ d: 2 }] } as any;
      return { rows: [] } as any;
    });

    await riskMetricsService.forRisk('risk-1', 'company-1');

    const signalQueries = sqls.filter(({ sql }) => /FROM risk_signal_links/.test(sql));
    expect(signalQueries.length).toBeGreaterThanOrEqual(4);
    for (const call of signalQueries) {
      expect(call.sql).toMatch(/gp\.company_id = \$2/);
      expect(call.sql).toMatch(/rsl\.risk_id = \$1/);
      expect(call.sql).toMatch(/rsl\.cluster_id = \$3/);
      expect(call.params).toEqual(['risk-1', 'company-1', 'cluster-1']);
    }
    const actions = sqls.find(({ sql }) => /WITH matched AS/.test(sql))!;
    expect(actions.sql).toMatch(/ra\.company_id = \$2/);
    expect(actions.sql).toMatch(/ra\.risk_id = \$1/);
    expect(actions.sql).toMatch(/ra\.source_cluster_id = \$3/);
  });
});
