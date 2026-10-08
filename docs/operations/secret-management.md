# Secret management — OrdinCore

> DSPT evidence (Standards 4, 9). How OrdinCore holds credentials and secrets, and the controls that
> stop them being committed to source control.

## Principle: secrets live only in server environment variables

No credential, API key, token, database password, SMTP password, JWT signing key, or encryption key
is ever committed to the repository. They exist only as **environment variables on the server**,
loaded at runtime (backend reads them via `process.env`). The repository contains **no `.env` file**;
`.env` and `.env.*` are git-ignored. A `.env.example` (keys only, no values) documents what must be
set.

Where secrets actually live:
- **Production**: environment variables on the application server (set in the process manager / shell
  profile for the `ordincore-api` service), never in the repo or in images.
- **CI**: GitHub Actions encrypted repository secrets (`${{ secrets.* }}`) — never printed to logs.
- **Mobile build/signing**: credentials are held by EAS (Expo) on their servers, not in the repo.
- **Developer machines**: a local `.env` the developer creates from `.env.example`; never committed.

## Controls that enforce this

1. **CI secret scan (mandatory gate).** `.github/workflows/ci.yml` runs **gitleaks** on every push and
   pull request, scanning the full history and the diff. Any finding **fails the build**. Config:
   `.gitleaks.toml` (default ruleset + a narrow allowlist for documentation placeholders).
2. **Local pre-commit hook.** `.githooks/pre-commit` runs `gitleaks protect --staged` before each
   commit and **blocks** a commit that contains a secret. Enable it once per clone:
   ```sh
   git config core.hooksPath .githooks
   # install gitleaks locally, e.g.  brew install gitleaks   (macOS)
   #                                  scoop install gitleaks  (Windows)
   ```
   If gitleaks is not installed the hook warns and allows the commit; **CI still enforces** the gate,
   so the check can never be silently bypassed on a shared branch.
3. **`.gitignore`** excludes `.env`, `.env.*`, key material and local credential files.

## If a secret is ever committed

1. **Rotate the secret immediately** — assume it is compromised the moment it reaches a remote. Change
   it at the source (DB password, SMTP password, API key, signing key) and update the server
   environment variable.
2. Remove it from the working tree and add a narrow `.gitleaks.toml` allowlist entry only if it is a
   genuine false positive.
3. Purging it from history (e.g. `git filter-repo`) reduces exposure but is **not** a substitute for
   rotation — rotation is the control that actually protects the data.
4. Record the event in the audit/incident log per
   [breach-and-incident-response.md](../compliance/breach-and-incident-response.md).

## Related

- `.env.example` — the authoritative list of required environment variables (keys only).
- [audit-log-integrity.md](./audit-log-integrity.md) — tamper-evident logging of security events.
- [../compliance/security-controls.md](../compliance/security-controls.md) — full security-controls
  summary (DSPT PS.3).
