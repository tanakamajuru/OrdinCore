import React, { useMemo, useState } from "react";
import type {
  MajorIssue,
  Trajectory,
  WeeklyGovernanceTeamReportModel,
} from "./weeklyGovernanceTeamReport.types";
import "./weeklyGovernanceTeamReport.css";

type Props = {
  report: WeeklyGovernanceTeamReportModel;
  onAcknowledge: (weeklyReviewId: string) => Promise<void>;
};

const trajectoryLabel: Record<Trajectory, string> = {
  DETERIORATING: "Deteriorating",
  STABLE: "Stable",
  IMPROVING: "Improving",
  NOT_ASSESSED: "Not assessed",
};

function IssueCard({ issue }: { issue: MajorIssue }) {
  return (
    <article className={`wgr-issue wgr-trajectory--${issue.trajectory.toLowerCase()}`}>
      <header>
        <div>
          <span className="wgr-domain">{issue.domain}</span>
          <h3>{issue.signalCount} linked signal{issue.signalCount === 1 ? "" : "s"}</h3>
        </div>
        <span className="wgr-trajectory">{trajectoryLabel[issue.trajectory]}</span>
      </header>
      <dl className="wgr-details">
        <div><dt>What we know</dt><dd>{issue.known}</dd></div>
        <div><dt>What was done</dt><dd>{issue.actionTaken}</dd></div>
        <div><dt>Current position</dt><dd>{issue.currentPosition}</dd></div>
        {issue.stillRequired && <div><dt>Still required</dt><dd>{issue.stillRequired}</dd></div>}
      </dl>
    </article>
  );
}

export function WeeklyGovernanceTeamReport({ report, onAcknowledge }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const acknowledged = Boolean(report.acknowledgedAt);

  // View filters (non-destructive — they only change what's shown, never the locked record):
  // narrow the dated source trail and major issues by theme and/or date to reduce clutter.
  const [theme, setTheme] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const usingFilter = !!(theme || fromDate || toDate);
  const themes = useMemo(() => Array.from(new Set([
    ...report.events.map((e) => e.theme).filter(Boolean),
    ...report.majorIssues.map((i) => i.domain).filter(Boolean),
  ])).sort(), [report.events, report.majorIssues]);
  const inDate = (iso: string) => (!fromDate || iso >= fromDate) && (!toDate || iso <= toDate);
  const filteredEvents = useMemo(
    () => report.events.filter((e) => (!theme || e.theme === theme) && (!e.date || inDate(e.date))),
    [report.events, theme, fromDate, toDate]);
  const filteredIssues = useMemo(
    () => report.majorIssues.filter((i) => !theme || i.domain === theme),
    [report.majorIssues, theme]);

  async function acknowledge() {
    setSaving(true);
    setError(null);
    try {
      await onAcknowledge(report.id);
    } catch {
      setError("The acknowledgement could not be saved. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="wgr-report" aria-labelledby="weekly-report-title">
      <header className="wgr-title">
        <p className="wgr-eyebrow">Published weekly governance review</p>
        <h1 id="weekly-report-title">Weekly Governance Team Report</h1>
        <p>{report.serviceName} · {report.periodLabel} · Published by {report.publishedBy}</p>
      </header>

      <section className="wgr-metrics" aria-label="Weekly summary">
        <div><span>Signals reviewed</span><strong>{report.signalsReviewed}</strong></div>
        <div><span>High / critical</span><strong>{report.highOrCritical}</strong></div>
        <div><span>Main domains</span><strong>{report.mainDomainCount}</strong></div>
        <div><span>Week-end direction</span><strong>{trajectoryLabel[report.weekEndTrajectory]}</strong></div>
      </section>

      <section className="wgr-section">
        <h2>The week at a glance</h2>
        <p className="wgr-summary">{report.overview}</p>
      </section>

      <section className="wgr-section">
        <h2>Collective Daily Team Briefing</h2>
        <p className="wgr-summary">{report.collectiveDailyBriefSummary || "No collective Daily Team Briefing summary was recorded by the Registered Manager."}</p>
        <p className="wgr-empty">The dated source briefings remain below for reconstruction.</p>
      </section>

      {(themes.length > 0 || report.events.length > 0) && (
        <section className="wgr-filter" aria-label="Filter the report view">
          <span className="wgr-filter-label">Filter view</span>
          <select value={theme} onChange={(e) => setTheme(e.target.value)} aria-label="Theme">
            <option value="">All themes</option>
            {themes.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input type="date" value={fromDate} max={toDate || undefined} onChange={(e) => setFromDate(e.target.value)} aria-label="From date" />
          <input type="date" value={toDate} min={fromDate || undefined} onChange={(e) => setToDate(e.target.value)} aria-label="To date" />
          {usingFilter && <button type="button" className="wgr-filter-clear" onClick={() => { setTheme(""); setFromDate(""); setToDate(""); }}>Clear</button>}
          <span className="wgr-filter-note">View only — the locked record is unchanged.</span>
        </section>
      )}

      <section className="wgr-section">
        <h2>How events unfolded</h2>
        {filteredEvents.length ? (
          <ol className="wgr-timeline">
            {filteredEvents.map((event) => (
              <li key={event.id}><time>{event.dateLabel}</time><p>{event.headline || event.summary}</p></li>
            ))}
          </ol>
        ) : <p className="wgr-empty">{usingFilter ? "No dated briefing matches this filter." : "No event summary was recorded. Review the published daily governance entries."}</p>}
      </section>

      <section className="wgr-section">
        <h2>Major issues and present position</h2>
        {filteredIssues.length
          ? filteredIssues.map((issue) => <IssueCard key={issue.id} issue={issue} />)
          : <p className="wgr-empty">{usingFilter ? "No major issue matches this filter." : "No major issue was identified during this period."}</p>}
      </section>

      <section className="wgr-section wgr-page-break">
        <h2>What has been done</h2>
        {report.measures.length ? (
          <div className="wgr-table-wrap">
            <table>
              <thead><tr><th>Area</th><th>Measure in place</th><th>Owner</th><th>Review</th><th>Position</th></tr></thead>
              <tbody>{report.measures.map((item) => (
                <tr key={item.id}>
                  <td>{item.area}{item.carriedForward && <span className="wgr-carried">Carried forward</span>}</td>
                  <td>{item.measure}{item.evidenceExpected && <small>Evidence: {item.evidenceExpected}</small>}</td>
                  <td>{item.owner}</td><td>{item.dueOrReview}</td>
                  <td><span className={`wgr-status wgr-status--${item.status.toLowerCase()}`}>{item.status.replaceAll("_", " ")}</span></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <p className="wgr-empty">No active measure is linked to this weekly review.</p>}
      </section>

      <section className="wgr-section">
        <h2>What remains a concern</h2>
        {report.unresolvedConcerns.length
          ? <ul className="wgr-concerns">{report.unresolvedConcerns.map((x, i) => <li key={i}>{x}</li>)}</ul>
          : <p className="wgr-empty">No unresolved concern was recorded.</p>}
      </section>

      {report.evidenceGaps.length > 0 && (
        <section className="wgr-evidence-gap">
          <h2>Information still required</h2>
          <ul>{report.evidenceGaps.map((x, i) => <li key={i}>{x}</li>)}</ul>
        </section>
      )}

      <section className="wgr-section">
        <h2>What we are learning</h2>
        <div className="wgr-learning">
          {report.learning.map((item, i) => (
            <article key={i}><h3>{item.lesson}</h3><p>{item.implication}</p></article>
          ))}
        </div>
      </section>

      <section className="wgr-section">
        <h2>What to expect next week</h2>
        <ol className="wgr-next-week">
          {report.nextWeek.map((item, i) => (
            <li key={i}><strong>{item.priority}</strong><span>{item.expectation}</span></li>
          ))}
        </ol>
      </section>

      <section className="wgr-acknowledgement">
        <h2>Team acknowledgement</h2>
        <p>I have read the weekly position and understand the measures and reporting expectations. Acknowledgement does not complete an action or confirm effectiveness.</p>
        {acknowledged ? (
          <p className="wgr-confirmed">Acknowledged by {report.acknowledgedBy || "Team Leader"}</p>
        ) : (
          <button type="button" disabled={saving} onClick={acknowledge}>{saving ? "Saving…" : "Acknowledge review"}</button>
        )}
        {error && <p role="alert" className="wgr-error">{error}</p>}
      </section>
    </section>
  );
}

