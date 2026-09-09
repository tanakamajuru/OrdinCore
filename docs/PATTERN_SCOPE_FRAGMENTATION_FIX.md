# Pattern scope fragmentation corrective patch

## Result

Every signal has one canonical governance theme and contributes to the service-theme lens. If it is linked to a controlled service user, it also contributes to that person's recurrence lens. The existing company/domain cross-service lens remains in place.

## Lenses

| Lens | Canonical key | Purpose |
| --- | --- | --- |
| Person | company + service + theme + service_user_id | repeated concern around one person |
| Service | company + service + theme | combined theme across all people/general signals in one service |
| Cross-service | company + theme | systemic theme spanning services |

The lenses share signal evidence through `risk_signal_links`; they are not duplicate signals or separate histories.

## Safety and doctrine

- Immediate/critical escalation still runs once, before slow pattern thresholds.
- Closing a signal removes it from current work but does not erase its historical contribution.
- Service themes are the default Patterns view; person patterns are drill-down evidence.
- Existing review, closure, promotion and trajectory services remain authoritative.
- Partial unique indexes prevent concurrent workers creating duplicate active patterns.
- New signals must use an active canonical theme from the service's configured taxonomy.

## Deployment

1. Apply migration `127_pattern_scope_fragmentation_fix.sql` after migration 126.
2. Deploy backend worker, pulse repository and governance service changes together.
3. Restart the pattern-detection worker.
4. Run the included contract test and the existing governance/pattern regression suite.
5. Confirm Patterns defaults to service themes and that person/cross-service scope filters still work.
