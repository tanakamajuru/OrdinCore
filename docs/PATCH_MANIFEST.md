# Patch Manifest

Package: `Ordin_Core_Consolidated_Pattern_and_Signal_Library_Corrective_Patch`

This package supersedes the separate signal/pattern fragmentation patch produced earlier.
Apply it once to the current `OrdinCore-main` source tree.

## Included changes

- Migration 127: merge fragmented active clusters and add explicit service/person lenses.
- Migration 129: create the governed candidate-label review queue.
- Theme-first pattern worker and canonical theme validation.
- Virtual Other signal capture with required candidate wording.
- Admin Label Review screen and audited Super Admin approve/reject actions.
- Service, person and cross-service pattern lens controls.
- Contract tests and deployment/rollback documentation.

## Verification performed

- Backend TypeScript type-check: passed.
- Pattern and adaptive-library contract tests: 9 passed.
- Changed React TSX files: syntax parse passed.

See `CONSOLIDATED_PATTERN_AND_SIGNAL_LIBRARY_PATCH.md` for deployment steps.
