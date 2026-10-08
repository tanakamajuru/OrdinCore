# Software & asset register — OrdinCore

> DSPT evidence (items **1.1.4** and **Standard 8** — unsupported software must not be used; v8 also
> requires a maintained digital asset register). Lists every software component OrdinCore runs on,
> its current version, vendor support/end-of-life status, and an owner. Review at least quarterly and
> after any upgrade. Versions captured from the live server on **2026-10-08**.

## Ownership

| Role | Name |
|---|---|
| Asset register owner | **[NEEDS INPUT]** |
| Patching / upgrade owner | **[NEEDS INPUT]** |

## 1. Runtime platform (production server)

| Component | Version (live) | Vendor support / EOL | Status | Owner | Action |
|---|---|---|---|---|---|
| OS — AlmaLinux | 9.8 | Supported to **2032** | 🟢 Supported | [NEEDS INPUT] | — |
| Node.js | **20.20.2** | Node 20 LTS maintenance EOL **~Apr 2026** | 🔴 **At/after EOL** | [NEEDS INPUT] | Upgrade to Node 22 LTS. **[CONFIRM EOL date]** |
| PostgreSQL | **13.23** | PG 13 EOL **13 Nov 2025** | 🔴 **After EOL** | [NEEDS INPUT] | Upgrade to PG 15/16 (supported). Priority. |
| Redis | **6.2.22** | Redis 6.2 is legacy; 7.x current | 🟡 Legacy / likely EOL | [NEEDS INPUT] | Upgrade to Redis 7.x. **[CONFIRM EOL date]** |
| nginx | **1.20.1** | 1.20 is legacy; stable 1.26.x current | 🟡 Legacy | [NEEDS INPUT] | Upgrade to current stable 1.26.x. |
| PM2 (process manager) | [CONFIRM] | Active | 🟢 | [NEEDS INPUT] | — |
| cPanel / AutoSSL (TLS certs) | n/a | Managed | 🟢 | [NEEDS INPUT] | Keep AutoSSL renewal working (see tls-cert-renewal). |

> **Standard 8 findings:** PostgreSQL 13 and Node 20 appear to be **at or past end-of-life** as of the
> capture date — these are the register's highest-priority upgrades. Confirm exact EOL dates against
> the vendor pages, then schedule the upgrades under the patching policy.

## 2. Application stack (key dependencies)

| Component | Version | Notes |
|---|---|---|
| Express | ^4.18.2 | HTTP framework (backend) |
| pg | ^8.11.3 | PostgreSQL driver |
| ioredis | ^5.3.2 | Redis client |
| socket.io | ^4.7.2 | Realtime (web sockets) |
| jsonwebtoken | ^9.0.2 | Auth tokens |
| helmet | ^7.1.0 | Security headers |
| nodemailer | ^9.0.1 | Outbound email |
| pdfkit | ^0.18.0 | Report PDFs |
| React / Vite | — | Frontend (`frontend/`) — see package.json |
| Expo SDK | 54 | Mobile (`mobile/`) — React Native |

Full, authoritative dependency lists live in each package's `package.json` / lockfile. Vulnerability
status and remediation are tracked in
[../operations/dependency-audit-status.md](../operations/dependency-audit-status.md) (CI gate +
weekly Dependabot).

## 3. External services / subprocessors

| Service | Purpose | Data involved | Owner | Assurance evidence |
|---|---|---|---|---|
| **Krystal** | UK hosting / infrastructure | All application + care data | [NEEDS INPUT] | Cyber Essentials / ISO 27001 — see [subprocessors.md](./subprocessors.md) |
| **Katapult** | Email / SMTP | Email content (notifications) | [NEEDS INPUT] | TLS cert fix — see [../operations/email-and-smtp.md](../operations/email-and-smtp.md) |
| **Stripe** | Payments | Billing data (no care data) | [NEEDS INPUT] | PCI-DSS (Stripe-certified) |
| **GitHub** | Source control / CI | Source code (no care data) | [NEEDS INPUT] | SOC 2 / ISO 27001 |
| **Expo (EAS)** | Mobile build / signing / OTA | Build artifacts, signing keys | [NEEDS INPUT] | Vendor assurance |
| **Apple (App Store / TestFlight)** | iOS distribution | App binaries | [NEEDS INPUT] | Vendor assurance |
| **Google (Play Console)** | Android distribution | App binaries | [NEEDS INPUT] | Vendor assurance |

Each subprocessor's own security certification status must be requested and recorded
(Standard 10) — see [subprocessors.md](./subprocessors.md).

## 4. Review cadence

- Re-capture live versions and re-check EOL dates **at least quarterly** and after any upgrade.
- Any component at/after EOL is a patching-policy action item (critical patches within 14 days;
  EOL migrations planned and tracked). See
  [policies/patching-and-vulnerability-management.md](./policies/patching-and-vulnerability-management.md).
