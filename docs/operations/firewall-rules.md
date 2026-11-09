# Server firewall rules — OrdinCore production VPS

> DSPT items **9.6.1–9.6.5**. Owner: **Tanaka Majuru** (Head of IT & Cyber Security Lead); accountable:
> **Kudakwashe Sikangela** (Director, SIRO). Applies to the Krystal-hosted VPS `185.116.215.178`
> (AlmaLinux 9.8) and the Heart Internet-hosted backup VPS `109.106.188.176` (AlmaLinux 9.8). There is
> no office network.
>
> Last reviewed: **9 November 2026**. Review: **quarterly**, after any change, and as part of the annual
> compliance review.

## 1. Firewall

- **firewalld** is active and enabled at boot, zone `public`.
- **Default deny:** inbound traffic that does not match an allowed service or rule is rejected
  (`target: default`). Only the services below are reachable.
- Krystal provides network-level protection upstream; Imunify360 provides the web application firewall
  and intrusion detection on the server.

## 2. Allowed inbound rules and business justification

| Service / port | Source allowed | Business justification |
|---|---|---|
| HTTPS 443, HTTP 80 | Any | Public access to the OrdinCore web app and API (HTTP redirects to HTTPS; needed for certificate renewal) |
| SMTP 25 / 465 / 587, IMAP/POP 143 / 993 / 110 / 995 | Any | Mail services of the cPanel server (Exim). Company email for @ordincore.co.uk is hosted separately by 263host; review at the next quarterly check whether these ports can be closed |
| DNS 53 | Any | Required for hosting DNS on the server |
| SSH 22 | **Named addresses only** (rich rule): the administrator's IP, a dedicated automated-deployment IP, and — on production only — the backup server's IP (109.106.188.176, for its nightly pull) | Server administration and automated deployment. Key-only authentication; password and root login disabled on both servers (verified 9 Nov 2026). No general `ssh` service rule on either server as of 9 Nov 2026 |
| cPanel / WHM (2082, 2083, 2086, 2087, 2095, 2096), Cockpit (9090), RDP (3389), SSH 22 — production only | **Administrator's IP address only** (rich rule) | Hosting control panel and server administration. Restricted since 3 November 2026 to a single source IP, kept current via a DuckDNS hostname that a script re-resolves every 5 minutes, rewriting the rich rules (port 22 added to the script's scope 9 Nov 2026). The script and its log are kept on the server at `/usr/local/bin/duckdns-firewall-sync.sh` |
| Everything else (including the app port 3001, MariaDB 3306) | **Blocked** | Not needed from the Internet. The app is reached only through nginx on 443 |

## 2a. SSH access detail (9 Nov 2026)

- **Backup server (109.106.188.176):** port 22 open only to the administrator's IP (DuckDNS-synced)
  and the automated-deployment IP (static rich rule, not DuckDNS-synced).
- **Production server (185.116.215.178):** port 22 open only to the administrator's IP (DuckDNS-synced),
  the automated-deployment IP (static rich rule), and the backup server's IP `109.106.188.176` (static
  rich rule, for its nightly pull).
- The automated-deployment rule is a **static** IP, not kept in sync by the DuckDNS script. If automated
  deployment starts failing with a connection timeout (not an auth error), check first whether this IP
  has changed and update the rich rule on both servers before assuming a server-side fault.
- Both servers: `PermitRootLogin no`, `PasswordAuthentication no` (verified via `sshd -T`). A
  non-root `deploy` user with key-only auth and passwordless `sudo` is used for all administration and
  deployment. Root's own `authorized_keys` was left untouched (historic admin key still present) but is
  unreachable over SSH since root login is disabled at the daemon level.
- A cPanel-installed drop-in (`/etc/ssh/sshd_config.d/01-permitrootlogin.conf`) on the production server
  was overriding the main config's `PermitRootLogin no` back to `yes` (drop-ins are `Include`d before the
  main file's own directives, and the first value wins) — found and corrected 9 Nov 2026. Worth checking
  for the same pattern on any future server.

## 3. Change control and review

- New inbound rules require a business justification recorded in this document and approval by the Head
  of IT under our [Change Management policy](./policies/change-management.md) **before** being opened.
- **Quarterly review:** the Head of IT runs `firewall-cmd --list-all`, compares it with this table and
  removes any rule that is no longer needed. The review date and any changes are recorded below.
- Cockpit and RDP are reviewed at each quarterly check and removed if not actively used.

| Review date | Reviewed by | Changes |
|---|---|---|
| 3 Nov 2026 | Tanaka Majuru | Admin interfaces (cPanel/WHM, Cockpit, RDP) restricted to the administrator's IP; default deny confirmed |
| 9 Nov 2026 | Tanaka Majuru | SSH hardened on both servers: non-root `deploy` user, key-only auth, root/password login disabled, cPanel drop-in override corrected on production. General `ssh` service removed on both servers; port 22 restricted to named addresses only. DuckDNS sync script extended to cover port 22 on production |

## 4. Open actions

| Action | Owner | Status |
|---|---|---|
| SSH: key-based login only, `PasswordAuthentication no`, `PermitRootLogin no` on both servers | Tanaka Majuru | **Done (verified 9 Nov 2026)** |
| Remove the general `ssh` service; allow port 22 only from the admin IP (and the backup server IP on production) | Tanaka Majuru | **Done (verified 9 Nov 2026)** |
| Remove RDP (3389) and Cockpit (9090) rich rules if not in use | Tanaka Majuru | To review |
