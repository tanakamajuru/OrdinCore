import { useParams, useNavigate } from 'react-router';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import { useCanonicalEvidenceSummary } from '@/hooks/useCanonicalEvidenceSummary';

const LABELS: Record<string, string> = {
  RISK_REVIEW: 'Risk reviews',
  ACTION_OPEN: 'Open actions',
  EFFECTIVENESS_REVIEW: 'Effectiveness due',
  ESCALATION_OPEN: 'Open escalations',
  PATTERN_REVIEW: 'Pattern reviews',
};
const BLURB: Record<string, string> = {
  RISK_REVIEW: 'Risks whose review is now due — open each to record your review.',
  ACTION_OPEN: 'Open governance actions across your service(s) — open each on its owning record.',
  EFFECTIVENESS_REVIEW: 'Completed actions awaiting an effectiveness rating — open each to rate it.',
  ESCALATION_OPEN: 'Concerns under time-bound higher oversight that remain open.',
  PATTERN_REVIEW: 'Active cross-service patterns under monitoring — open each to review it.',
};

// One engine: this list is the exact population behind the Canonical Evidence count of the same
// type (same summary query), so the number on the card and the number of rows here always agree.
export function CanonicalEvidenceList() {
  const { type = '' } = useParams();
  const navigate = useNavigate();
  const { data, loading } = useCanonicalEvidenceSummary();
  const group = data ? (data.groups as any)[type] : null;
  const records: any[] = group?.evidence || [];

  const fmtDue = (d?: string | null) => {
    if (!d) return null;
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return null;
    return dt.toLocaleDateString();
  };

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-sm text-primary hover:underline mb-4">
        <ArrowLeft size={15} /> Back
      </button>
      <div className="mb-4">
        <div className="text-xs font-semibold uppercase tracking-[.12em] text-primary">Canonical evidence</div>
        <h1 className="text-2xl font-semibold text-foreground">{LABELS[type] || type}{group ? ` · ${group.count}` : ''}</h1>
        <p className="text-sm text-muted-foreground">{BLURB[type] || 'The exact records behind this count.'}</p>
        {data && <p className="text-xs text-muted-foreground mt-1">As of {new Date(data.as_of).toLocaleString()}</p>}
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!loading && records.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
          Nothing outstanding here right now.
        </div>
      )}
      {!loading && records.length > 0 && (
        <div className="rounded-xl border border-border bg-card divide-y divide-border">
          {records.map((rec) => {
            const due = fmtDue(rec.due_at);
            return (
              <button
                key={rec.evidence_id}
                onClick={() => navigate(rec.route || '#')}
                className="w-full flex items-center justify-between gap-3 text-left px-4 py-3 hover:bg-muted/50 group"
              >
                <div className="min-w-0">
                  <div className="text-sm text-foreground truncate">{rec.title || rec.evidence_id}</div>
                  <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3">
                    {rec.house_name && <span>{rec.house_name}</span>}
                    {due && <span>Due {due}</span>}
                  </div>
                </div>
                <ChevronRight size={16} className="text-primary shrink-0 opacity-40 group-hover:opacity-100" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default CanonicalEvidenceList;
