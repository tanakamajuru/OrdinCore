// Single source of truth for governance thresholds shared across services/workers.
// Change the promotion gate here, not in six places (SSOT audit, 2026-07-07).

// A signal cluster may be promoted to a formal risk once it carries at least this many
// linked signals, OR one Critical signal (or a lone Safeguarding concern). Read by the
// Patterns readiness meter, the daily oversight feed, the rm5 BFF, and the promote guard.
export const PROMOTION_THRESHOLD = 3;
