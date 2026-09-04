# Load & Capacity Test Plan — OrdinCore (five providers)

> **DRAFT plan — run against staging, not production.** Replace **[PLACEHOLDER]**.

## Objective
Show the platform sustains a realistic **five‑provider** load with acceptable latency and no errors,
and degrades gracefully under stress. Establishes headroom before onboarding.

## Load profile (tune with the controller)
| Dimension | Assumption **[CONFIRM]** |
|---|---|
| Providers (tenants) | 5 |
| Services/houses per provider | **[e.g. 3–6]** |
| Concurrent active users (peak) | **[e.g. 50–100]** (front‑line at shift change) |
| Signals captured/day/provider | **[e.g. 100]** |
| Report generations/day | **[e.g. 20]**, including large date ranges |
| Evidence uploads/day | **[e.g. 50]** photos/voice |

## Scenarios
1. **Steady state** — mixed read/write (dashboards, signal capture, action completion) at peak
   concurrency for 30–60 min.
2. **Report burst** — many simultaneous company/site/date‑range report generations.
3. **Media** — concurrent evidence upload + authenticated download.
4. **Worker load** — signal ingestion driving pattern/effectiveness jobs (Redis/BullMQ) — watch
   queue depth.
5. **Soak** — steady state for several hours to expose leaks/connection exhaustion.

## Tooling
- API load: **k6** or **Artillery** scripts hitting `work.ordincore.co.uk/api/v1` with per‑tenant
  tokens (reuse the C‑04 two‑company seeding). **[WRITE SCRIPTS]**
- Observe: latency (p50/p95/p99), error rate, CPU/mem, PostgreSQL connections vs pool, Redis, disk.

## Pass criteria
- p95 API latency < **[e.g. 800 ms]**, error rate < **[e.g. 0.5%]** at peak.
- PostgreSQL connections stay within pool; no exhaustion; no unbounded queue growth.
- Graceful degradation (clear errors/retries, no data loss) under 2× peak.
- No memory leak over the soak.

## Resilience checks (tie to incident/backup runbooks)
- Kill a worker / Redis briefly → jobs resume, no data loss.
- Email (SMTP) outage → app continues; notifications queue/skip gracefully.
- DB restart → app reconnects.
- Duplicate/replayed requests → idempotency holds.

Record results and remediation before Gate 3–4 (providers three–five).
