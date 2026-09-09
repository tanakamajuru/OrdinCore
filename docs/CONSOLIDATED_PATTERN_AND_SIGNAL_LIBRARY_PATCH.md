# Consolidated Pattern and Signal-Library Corrective Patch

This patch combines the pattern-scope correction with an adaptive signal library.
It is intended to replace the separate pattern-fragmentation patch.

## Outcome

- Every signal is counted in a service-level theme pattern.
- Signals concerning a known service user also appear in a separate person lens.
- Detailed signal labels never become pattern keys, so several labels cannot hide one theme.
- Every active theme includes a virtual **Other concern within this theme** option.
- Staff using Other suggest a short label while still recording a factual description and immediate action.
- Suggestions are grouped by theme and wording in **Governance Configuration → Label Review**.
- Only a Super Admin can approve a suggestion into the reusable library; approval is audited.
- Governance themes cannot be hard-deleted from the application.
- Closed, linked and otherwise completed signals do not keep inflating live patterns.

## Deployment

1. Back up the database.
2. Deploy the backend and frontend files in this package together.
3. Run the normal migration command. Migration `127_pattern_scope_fragmentation_fix.sql`
   merges fragmented active clusters; migration `129_adaptive_signal_library.sql` creates
   the review queue.
4. Restart the API and pattern worker.
5. Smoke-test one normal label and one Other capture for a test service.
6. Verify Service themes, Person patterns and Label Review before production sign-off.

## Governance operating rule

Review candidate labels on a planned cadence (for example monthly or quarterly), using
the occurrence count as evidence. Do not approve a synonym merely because it was submitted.
Prefer rewording or training when an existing label already covers the same meaning.

## Rollback note

Application rollback is safe because historical pulses retain their theme and label text.
Do not drop `signal_label_suggestions` until its records have been exported for audit.
The cluster merge in migration 127 should be treated as a data correction and not reversed
without a reviewed restoration plan.
