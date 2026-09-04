# Monitoring & Alerting — OrdinCore

> **Self‑hosted watchdog IMPLEMENTED on 2026‑09‑04** (health + cert + backup, emailing a named
> responder). Log‑based and host‑metric alerting remain to add (see "Still to add"). Replace **[PLACEHOLDER]**.

## Implemented (server‑side watchdog)
- **Script:** `/usr/local/bin/ordincore-monitor.sh`, run **every 5 minutes** via
  `/etc/cron.d/ordincore-monitor`; log `/var/log/ordincore-monitor.log`.
- **Checks each run:**
  - **API health** — `http://localhost:3001/health` (the app process is up and responding).
  - **TLS cert** — alerts if `work.ordincore.co.uk` cert expires in **< 14 days**.
  - **Backup freshness** — alerts if no encrypted DB backup in `/var/backups/ordincore` newer than **26 h**.
- **Alerting:** `/usr/local/bin/ordincore-alert.js` emails via the app's SMTP (Katapult) to the
  **named responders** in `/etc/ordincore/alert-recipient` (currently **ttmajuru@gmail.com,
  k.sikangela@nhs.net** — comma‑separated; edit this file to change the on‑call list).
  **Transition‑based**: one alert when a check starts
  failing, one "RESOLVED" when it recovers — no repeat spam. Verified end‑to‑end (test alert + a
  simulated failure/recovery both delivered).
- **To change the responder:** `echo "ops@your-domain" | sudo tee /etc/ordincore/alert-recipient`.

## Still to add (host/log signals)
| Signal | Source | How |
|---|---|---|
| Error‑rate / 5xx bursts, worker failures | pm2 / app logs | ship logs to Logtail/Grafana Cloud + alert |
| `[security] refresh-token reuse` / anomalous `[evidence-access]` | app log | log‑based alert |
| CPU / mem / disk / DB connections | host / PostgreSQL | node‑exporter + hosted Grafana, or host provider metrics |
| External uptime (independent of the box) | third‑party | optional UptimeRobot/BetterStack on a public health path (needs your signup) |

## Original plan (reference)

## What to monitor
| Signal | Source | Alert threshold | Responder |
|---|---|---|---|
| API up / health | `GET /api/v1/health` (exists) via external uptime check | Down > 2 min | **[NAME]** |
| Error rate | pm2 / app logs (`ordincore-api`) | Spike / repeated 5xx | **[NAME]** |
| DB connections & CPU/mem | PostgreSQL / host | Near pool/host limits | **[NAME]** |
| Disk utilisation | host (`/` at ~37% now) | > 80% | **[NAME]** |
| Job queue (Redis/BullMQ) | worker logs / queue depth | Backlog growing / worker down | **[NAME]** |
| Certificate expiry | TLS on `work.ordincore.co.uk` | < 14 days | **[NAME]** |
| Failed‑login bursts | security‑event log | Threshold burst | **[NAME]** |
| **Backup success** | `/var/log/ordincore-backup.log` + file mtime | No new backup in 26 h | **[NAME]** |
| Refresh‑token reuse | app log `[security] refresh-token reuse detected` | Any occurrence | **[NAME]** |
| Evidence access | app log `[evidence-access]` | Anomalous volume | **[NAME]** |

## Suggested implementation (low‑cost)
1. **External uptime + cert monitor** (e.g. UptimeRobot/BetterStack/Healthchecks.io) hitting
   `/api/v1/health`, alerting to email/SMS/Slack. Fastest win.
2. **Backup watchdog:** a small daily cron that alerts if the newest file in
   `/var/backups/ordincore` is older than 26 h.
3. **Log‑based alerts:** ship pm2/app logs to a service (Grafana Cloud/Logtail) and alert on 5xx
   bursts, `refresh-token reuse`, and worker failures.
4. **Host metrics:** node‑exporter + a hosted Grafana, or the host provider's monitoring, for
   CPU/mem/disk/DB.
5. Name a **primary + backup on‑call responder** and document escalation.

## Acceptance
A test failure in each category (kill the API, fill a disk on staging, skip a backup) produces an
alert to the named responder within the target time; record the evidence.
