/**
 * Simplified Reports (v2.0.0) — plain-language report catalogue + snapshot renderer.
 * Hermetic: no database. Asserts (1) the ten report keys/titles/scopes are the frozen set
 * (keys and scopes MUST NOT change — only displayed titles), and (2) every report key renders
 * a valid PDF from a stored snapshot row, including from an evidence-empty snapshot (the
 * "Not recorded" / "None recorded" paths) — proving the renderer never re-queries live data.
 */
import { REPORT_CATALOG } from '../../reporting/config/report-catalog';
import { formatReportText, renderSnapshotPdf } from '../../reporting/renderers/frozen-pdf.renderer';

const EXPECTED: Record<string, string> = {
  'weekly-governance-review': 'Weekly Governance Review',
  'executive-governance-dashboard': 'Service Governance Overview',
  'strategic-risk-register': 'Key Risks and Management Response',
  'escalation-intervention': 'Escalations and Management Response',
  'weekly-leadership-narrative': "Manager's Weekly Summary",
  'cross-service-governance': 'Concerns Repeating Across Services',
  'inspection-evidence-pack': 'Governance Evidence Summary',
  'governance-reconstruction': 'Governance Timeline and Reconstruction',
  'board-ri-assurance': 'Provider Assurance Summary',
  'governance-audit-log': 'Governance Decision Record',
};

describe('Simplified Reports — text sanitisation (no legacy narration / markup)', () => {
  it('turns structured review content into readable text and removes raw markdown markers', () => {
    const text = formatReportText({
      summary: '**Immediate oversight is required.**',
      lessons_learnt: '## Learning\nRecord the outcome.',
    });
    expect(text).toContain('Summary: Immediate oversight is required.');
    expect(text).toContain('Lessons Learnt: Learning');
    expect(text).not.toContain('[object Object]');
    expect(text).not.toContain('**');
    expect(text).not.toContain('##');
    expect(text).not.toContain('`');
  });

  it('states missing information rather than inventing or blanking it', () => {
    expect(formatReportText(null)).toBe('Not recorded - follow-up required');
    expect(formatReportText('')).toBe('Not recorded - follow-up required');
    expect(formatReportText({})).toBe('Not recorded - follow-up required');
  });

  it('joins arrays and never leaves JSON braces or brackets', () => {
    const text = formatReportText(['first item', 'second item']);
    expect(text).toBe('first item, second item');
    expect(text).not.toMatch(/[[\]{}]/);
  });
});

describe('Simplified Reports — catalogue', () => {
  it('has exactly the ten frozen report keys', () => {
    expect(REPORT_CATALOG).toHaveLength(10);
    expect(REPORT_CATALOG.map((r) => r.key).sort()).toEqual(Object.keys(EXPECTED).sort());
  });

  it('uses the plain-language titles and keeps every scope list non-empty', () => {
    for (const def of REPORT_CATALOG) {
      expect(EXPECTED[def.key]).toBeDefined();
      expect(def.title).toBe(EXPECTED[def.key]);
      expect(Array.isArray(def.scopes) && def.scopes.length).toBeTruthy();
    }
  });
});

// A realistic frozen snapshot row — the shape the data builder stores (data + evidence).
function fullRow(reportKey: string) {
  return {
    report_key: reportKey,
    scope_type: 'SERVICE',
    status: 'APPROVED',
    approved_at: '2026-08-30T10:00:00Z',
    created_at: '2026-08-29T09:00:00Z',
    period_start: '2026-08-24',
    period_end: '2026-08-30',
    evidence_hash: 'abc123def456abc123def456abc123def456',
    narrative: 'Governance was stable across the service this week with one theme under active review.',
    data: {
      scope_label: 'Sunrise Care Service',
      period: { start: '2026-08-24', end: '2026-08-30' },
      organisation: { status: 'ATTENTION', governance_confidence: 82, evidence_confidence: 74 },
      per_site: [
        { site_name: 'Sunrise House', status: 'STABLE', governance_confidence: 88, signals: 3, open_risks: 2, overdue_actions: 0 },
        { site_name: 'Meadow House', status: 'ATTENTION', governance_confidence: 71, signals: 5, open_risks: 4, overdue_actions: 2 },
      ],
      totals: { overdue_actions: 2 },
      cross_site_themes: [{ theme: 'Medication', n: 4 }, { theme: 'Falls', n: 2 }],
      material_exceptions: [{ site_name: 'Meadow House', status: 'ATTENTION', governance_confidence: 71 }],
      limitations: [],
      evidence: {
        signals: [{ id: 's1', service: 'Meadow House', date: '2026-08-25', concern: 'Late medication round', domain: 'Medication', severity: 'Medium', review_status: 'New', immediate_action: 'Reviewed MAR' }],
        risks: [
          { id: 'r1', service: 'Meadow House', risk: 'Recurring medication timing errors', severity: 'High', status: 'Open', direction: 'Improving', review_due_date: '2026-09-10', resolution_reason: null },
          { id: 'r2', service: 'Sunrise House', risk: 'Historic falls cluster', severity: 'Medium', status: 'Closed', direction: 'Stable', review_due_date: null, resolution_reason: 'Three-month evidence shows no recurrence; PT input embedded.' },
        ],
        actions: [{ id: 'a1', service: 'Meadow House', action: 'Retrain night staff on MAR timings', status: 'In Progress', created_at: '2026-08-26T09:00:00Z', completed_at: null, due_date: '2026-09-05', owner: 'Jane Doe', completion_evidence: null, effectiveness: 'Not yet reviewed' }],
        escalations: [{ id: 'e1', service: 'Meadow House', date: '2026-08-26', reason: 'Repeat medication concern', priority: 'High', status: 'Open', due_by: '2026-09-02', outcome: null, escalated_to: 'Area Manager' }],
        decisions: [{ id: 'd1', service: 'Meadow House', date: '2026-08-27', concern: 'Medication pattern', decision: 'Keep risk open pending 4-week evidence', reason: 'Two incidents within the fortnight', status: 'Open', due_at: '2026-09-20', reviewer: 'RM Smith' }],
        patterns: [{ id: 'p1', pattern: 'Medication timing across houses', domain: 'Medication', scope: 'SERVICE', status: 'Active', signal_count: 4, review_outcome: 'Confirmed systemic — service-wide action set', next_review_date: '2026-09-15', affected_scope: 'Sunrise House, Meadow House' }],
        weekly_reviews: [{ id: 'w1', service: 'Meadow House', week_ending: '2026-08-30', status: 'published', content: 'Focus on medication timings.', lessons_learnt: 'Night handover needs a medication checkpoint.', anticipated_risks: 'Bank staff unfamiliar with MAR.', published_at: '2026-08-30T12:00:00Z' }],
        audit: [{ id: 'au1', date: '2026-08-27T11:00:00Z', action: 'RISK_STATUS_CHANGE', resource: 'risk', resource_id: 'r1', reason: 'Held open pending evidence', actor: 'RM Smith' }],
      },
    },
  };
}

// The empty-evidence case — must still render (exercising the "Not recorded" fallbacks).
function emptyRow(reportKey: string) {
  return {
    report_key: reportKey,
    scope_type: 'ORGANISATION',
    status: 'DRAFT',
    created_at: '2026-08-29T09:00:00Z',
    period_start: '2026-08-24',
    period_end: '2026-08-30',
    evidence_hash: '',
    narrative: '',
    data: {
      scope_label: 'Whole organisation',
      organisation: { status: 'STABLE' },
      per_site: [],
      cross_site_themes: [],
      material_exceptions: [],
      totals: {},
      limitations: ['Weekly reviews were not published for two services in this period.'],
      evidence: { signals: [], risks: [], actions: [], escalations: [], decisions: [], patterns: [], weekly_reviews: [], audit: [] },
    },
  };
}

describe('Simplified Reports — snapshot renderer', () => {
  const keys = Object.keys(EXPECTED);

  it.each(keys)('renders a valid PDF for %s from a fully-populated snapshot', async (key) => {
    const buf = await renderSnapshotPdf(fullRow(key));
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(1000);
    expect(buf.slice(0, 5).toString('latin1')).toBe('%PDF-');
  });

  it.each(keys)('renders a valid PDF for %s from an evidence-empty snapshot', async (key) => {
    const buf = await renderSnapshotPdf(emptyRow(key));
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(1000);
    expect(buf.slice(0, 5).toString('latin1')).toBe('%PDF-');
  });

  it('accepts a snapshot whose data is a JSON string (stored form)', async () => {
    const row = fullRow('weekly-governance-review');
    const buf = await renderSnapshotPdf({ ...row, data: JSON.stringify(row.data) });
    expect(buf.slice(0, 5).toString('latin1')).toBe('%PDF-');
  });
});
