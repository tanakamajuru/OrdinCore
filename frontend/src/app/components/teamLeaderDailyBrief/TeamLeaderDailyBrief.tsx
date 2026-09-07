import React, { useMemo, useState } from "react";
import type {
  ActionTiming,
  TeamLeaderAction,
  TeamLeaderDailyBriefModel,
} from "./teamLeaderDailyBrief.types";
import "./teamLeaderDailyBrief.css";

type Props = {
  brief: TeamLeaderDailyBriefModel;
  onAcknowledge: (briefId: string) => Promise<void>;
};

const timingOrder: Record<ActionTiming, number> = {
  OVERDUE: 0,
  DUE_TODAY: 1,
  UPCOMING: 2,
};

const actionLabel: Record<ActionTiming, string> = {
  OVERDUE: "Overdue",
  DUE_TODAY: "Due today",
  UPCOMING: "Upcoming",
};

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function ActionCard({ action }: { action: TeamLeaderAction }) {
  return (
    <article className={`tlb-card tlb-action tlb-action--${action.timing.toLowerCase()}`}>
      <header className="tlb-card__header">
        <span className="tlb-badge">{actionLabel[action.timing]}</span>
        <h3>{action.title}</h3>
      </header>
      <dl className="tlb-details">
        <div><dt>Owner</dt><dd>{action.owner}</dd></div>
        <div><dt>Due</dt><dd>{action.dueDate}</dd></div>
        {action.completionEvidence && (
          <div><dt>Completion evidence</dt><dd>{action.completionEvidence}</dd></div>
        )}
      </dl>
    </article>
  );
}

export function TeamLeaderDailyBrief({ brief, onAcknowledge }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const acknowledged = Boolean(brief.acknowledgedAt);

  const sortedActions = useMemo(
    () => [...brief.actions].sort((a, b) => timingOrder[a.timing] - timingOrder[b.timing]),
    [brief.actions],
  );

  async function acknowledge() {
    setSubmitting(true);
    setError(null);
    try {
      await onAcknowledge(brief.id);
    } catch {
      setError("The acknowledgement could not be saved. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="tlb-report" aria-labelledby="tlb-title">
      <header className="tlb-report__title">
        <p className="tlb-eyebrow">Published daily governance outcome</p>
        <h1 id="tlb-title">Team Leader Daily Brief</h1>
        <p>{brief.serviceName} · {brief.reviewDate} · Published {brief.publishedAt}</p>
      </header>

      <section className="tlb-summary" aria-label="Today's position">
        <div><span>Today's position</span><strong>{brief.positionLabel}</strong></div>
        <div><span>New priorities</span><strong>{brief.priorities.length}</strong></div>
        <div><span>Active actions</span><strong>{brief.actions.length}</strong></div>
        <div><span>Escalations</span><strong>{brief.escalations.length || "None"}</strong></div>
      </section>

      <section className="tlb-section">
        <h2>1. What the team needs to know</h2>
        {brief.teamNeedsToKnow.length ? (
          <ul className="tlb-notice">
            {brief.teamNeedsToKnow.map((item, index) => <li key={index}>{item}</li>)}
          </ul>
        ) : <p className="tlb-empty">No new governance priorities today. Continue existing actions.</p>}
      </section>

      <section className="tlb-section">
        <h2>2. Today's priorities</h2>
        {brief.priorities.length ? brief.priorities.map((priority) => (
          <article className={`tlb-card tlb-priority tlb-priority--${priority.decision.toLowerCase()}`} key={priority.id}>
            <header className="tlb-card__header">
              <span className="tlb-badge">{priority.decision}</span>
              <h3>{priority.title}</h3>
            </header>
            <dl className="tlb-details">
              <div><dt>What to do</dt><dd>{priority.instruction}</dd></div>
              {priority.personSupported && <div><dt>Person supported</dt><dd>{priority.personSupported}</dd></div>}
              <div><dt>Responsible</dt><dd>{priority.owner}</dd></div>
              <div><dt>Due / review</dt><dd>{priority.dueLabel}</dd></div>
              {priority.reportSoonerIf && <div className="tlb-trigger"><dt>Report sooner if</dt><dd>{priority.reportSoonerIf}</dd></div>}
            </dl>
          </article>
        )) : <p className="tlb-empty">No new priorities were assigned in this review.</p>}
      </section>

      <section className="tlb-section">
        <h2>3. Existing actions requiring attention</h2>
        {sortedActions.length
          ? sortedActions.map((action) => <ActionCard key={action.id} action={action} />)
          : <p className="tlb-empty">No active actions require attention today.</p>}
      </section>

      <section className="tlb-section">
        <h2>4. Escalations</h2>
        {brief.escalations.length ? brief.escalations.map((item) => (
          <article className="tlb-card tlb-escalation" key={item.id}>
            <h3>{item.title}</h3>
            <p>{item.instruction}</p>
            {(item.owner || item.responseDue) && (
              <p className="tlb-meta">{item.owner && `Owner: ${item.owner}`}{item.owner && item.responseDue && " · "}{item.responseDue && `Response due: ${item.responseDue}`}</p>
            )}
          </article>
        )) : <p className="tlb-empty tlb-empty--safe">No new escalations for this service today.</p>}
      </section>

      <section className="tlb-acknowledgement" aria-labelledby="acknowledgement-title">
        <h2 id="acknowledgement-title">Team Leader acknowledgement</h2>
        <p>Confirm that you have read and understood today's priorities. This does not complete an action or confirm that it was effective.</p>
        {acknowledged ? (
          <p className="tlb-confirmed">Acknowledged by {brief.acknowledgedBy || "Team Leader"} on {formatDateTime(brief.acknowledgedAt!)}</p>
        ) : (
          <button type="button" onClick={acknowledge} disabled={submitting}>
            {submitting ? "Saving…" : "Acknowledge brief"}
          </button>
        )}
        {error && <p className="tlb-error" role="alert">{error}</p>}
      </section>

      <footer className="tlb-footer">
        Prepared from the Registered Manager's Daily Governance Review by {brief.preparedBy}.
      </footer>
    </section>
  );
}

