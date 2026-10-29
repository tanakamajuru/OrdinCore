// Shared definition of "demonstrated effective" — used wherever a report (fact, summary,
// assurance judgement or AI input) states that improvement is evidenced. A single Effective
// label is a recorded judgement, not proof; this is the one place that decides whether a
// particular outcome claim is actually supported by the evidence behind it.
//
// 28 Oct developer instructions (Revision 3, P1 "Evidence-supported conclusions"): the
// theme-evidence projection (scoped-report-data.service.ts) previously counted any action whose
// effectiveness string started with "Effective" as evidencing improvement — no check that the
// rating was final (not interim/early), reviewed, or backed by evidence text, and no check for
// weak evidence (case closure, future intentions, mere attendance) the way renderAssurance and
// renderWeekly in frozen-pdf.renderer.ts already do via isDemonstratedEffective/hasWeakEvidence.
// Extracted here so facts, summaries, assurance and AI narration all apply one definition.
const clean = (v: any) => String(v ?? '').trim();

export const isDemonstratedEffective = (a: any): boolean =>
  clean(a?.effectiveness) === 'Effective'
  && clean(a?.effectiveness_review_state) === 'FINAL'
  && !!a?.effectiveness_reviewed_at
  && !!clean(a?.effectiveness_evidence);

// B9 correction (21 Oct 2026, preserved): doctrine A5 — police case closure, attendance, stated
// intentions or a completed review do not automatically demonstrate control effectiveness. This
// flags rather than silently rewrites; a match moves the entry out of "solid" evidence.
export const WEAK_EVIDENCE_PATTERN = /\b(case (was |is |has been )?closed|closed the case|police (closed|have closed|reviewed)|closure of the case|withdrew (the )?charges|no charges|dealt with by the police|will (continue|monitor|ensure|aim)|continue(s|d)? to monitor|going forward|intends? to|plans? to|planned to|attendance (was |is )?(confirmed|recorded)|completed (the |a )?review)\b/i;

export const hasWeakEvidence = (a: any): boolean =>
  WEAK_EVIDENCE_PATTERN.test(String(a?.effectiveness_evidence || ''));

// An action's effectiveness is evidence-supported improvement only when it is demonstrated
// effective AND that evidence isn't itself a weak/non-probative pattern.
export const isEvidenceSupportedImprovement = (a: any): boolean =>
  isDemonstratedEffective(a) && !hasWeakEvidence(a);
