# Dependency audit status — OrdinCore

> DSPT Standards 8/9. Snapshot of `npm/pnpm audit` and what was fixed vs. deferred. CI enforces
> `--audit-level=high` on every push; Dependabot opens weekly update PRs. Re-run and update this file
> at each review.

**Last run: 2026-10-08.**

| Package | Before | After safe `audit fix` | Remaining | Notes |
|---|---|---|---|---|
| backend | 10 (6 mod, 3 high, 1 crit) | **3 (2 mod, 1 high)** | 3 | `npm audit fix` applied (non-breaking); build green. Remaining need major-version bumps — review individually. |
| frontend (pnpm) | high/critical in build tooling | not auto-fixed | tar (critical), picomatch, lodash, etc. | All **transitive dev/build** deps (vite/rollup toolchain). Not runtime-exposed; fix by bumping the toolchain when compatible. |
| mobile | 40 (15 mod, 25 high) | **40** | 40 | Transitive **Expo/React-Native SDK** deps; `audit fix` can't resolve without breaking the Expo SDK. Track against Expo SDK upgrades; not independently patchable. |
| landing-page | 2 (1 mod, 1 high) | not applied | 2 | `npm audit fix` hit an ERESOLVE peer conflict — resolve the peer-dep conflict manually, then re-run. |

## What can be fixed safely (done)
- **backend** — `npm audit fix` applied, reducing 10 → 3 with no breaking changes; `tsc` still clean.

## What can't be fixed safely yet (deferred, with reason)
- **mobile (Expo/RN)** — vulnerabilities live in Expo/React-Native transitive dependencies; they clear
  only when the Expo SDK itself upgrades. Forcing them breaks the SDK. **Action:** address at the next
  Expo SDK bump; most are build-time, not runtime-reachable in the shipped app.
- **frontend (vite/rollup toolchain)** — transitive **dev/build** dependencies (e.g. `tar`,
  `picomatch`, `lodash` via tooling), not shipped to users. **Action:** bump the build toolchain when a
  compatible release removes them.
- **backend (3 remaining)** — require major-version upgrades of a direct/transitive dep; review each
  for behaviour change before upgrading. **Action:** take via Dependabot PRs with CI as the gate.
- **landing-page** — `audit fix` blocked by a peer-dependency conflict; resolve the conflict first.

## Policy
Critical/high advisories are patched within **14 days** of a fix being available
(see [../compliance/policies/patching-and-vulnerability-management.md]). CI fails the build on new
high/critical advisories, so regressions are caught at the gate.
