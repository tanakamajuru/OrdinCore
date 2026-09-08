# RM Weekly Governance Workspace - replacement patch

## Outcome

The Registered Manager no longer sees or operates the 13-step weekly review wizard. One evidence workspace now presents the selected service/week, weekly snapshot, all completed published Daily Team Briefs, active measures, evidence gaps and the manager's required interpretation fields.

The underlying governance lifecycle is unchanged:

1. Draft saved against one service and week.
2. Registered Manager verifies evidence and records their own judgement.
3. Registered Manager finalises the record.
4. Director/Responsible Individual independently approves, challenges or reopens it.
5. The validated record is published to the team.
6. Team acknowledgement records receipt only.

## Director and Responsible Individual authority

- Both roles may independently approve, challenge or reopen a finalised weekly review.
- Both roles may publish the document to the service team only after it is approved and locked.
- The existing separation-of-duties check remains mandatory: the author/finaliser cannot validate the same review.
- Publishing records who sent the document and when, then notifies the service team.

## Files changed

- `frontend/src/app/components/RMWeeklyGovernanceWorkspace.tsx` - new one-screen RM workspace.
- `frontend/src/app/components/WeeklyReview.tsx` - routes the RM to the workspace while retaining Team Leader and validator views.
- `frontend/src/app/components/weeklyGovernanceTeamReport/*` - includes the collective Daily Team Briefing and unresolved concerns in the published view.
- `backend/src/services/weeklyReviews.service.ts` - supplies daily briefs, acknowledgement counts, active measures and evidence gaps; adds finalisation gates.
- `backend/src/controllers/weeklyReviews.controller.ts` - includes the collective briefing and evidence gaps in the locked PDF.
- `frontend/tests/rm-weekly-workspace.spec.ts` - regression acceptance test.

## Processing rules

- Only completed, published Daily Team Briefs inside the selected seven-day period are included.
- Missing daily briefs are visible evidence gaps.
- Dated source briefings remain available even when the RM writes a collective summary.
- Active measures exclude Complete, Completed, Cancelled and Closed records.
- Stable/improving never means resolved; completed never means effective.
- The collective briefing, unresolved position, lessons and week-ahead note are required before finalisation.

## Installation

Overlay the package onto the matching Ordin Core repository, run frontend and backend type-checks, then run migrations already present in the main architecture. This patch adds no new table or migration.
