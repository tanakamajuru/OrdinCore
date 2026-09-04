# Backup & Restore Runbook — OrdinCore

Status: **implemented and restore‑tested on 2026‑09‑04.**

## What is backed up
- **PostgreSQL database `ordincore`** — full logical dump (`pg_dump`), the source of truth for all
  governance data.
- **Not yet automated:** evidence media in `backend/storage/uploads` — **[ACTION: add media to the
  backup set]** (see below).

## Mechanism (on the VPS, Krystal/UK)
- Script: `/usr/local/bin/ordincore-backup.sh` (root, `chmod 700`).
- Pipeline: `pg_dump ordincore | gzip -9 | openssl enc -aes-256-cbc -pbkdf2 -salt` — backups are
  **encrypted at rest** (AES‑256).
- Key: `/etc/ordincore/backup.key` (root‑only, `chmod 600`, random 48‑byte). **Store a copy of this
  key OFF the server in a secrets manager — without it, backups cannot be restored.**
- Destination: `/var/backups/ordincore/ordincore-YYYYmmdd-HHMMSS.sql.gz.enc`.
- Retention: **30 days** (older files pruned by the script).
- Schedule: daily **02:30** via `/etc/cron.d/ordincore-backup`; log `/var/log/ordincore-backup.log`.

## Restore procedure (tested)
```bash
FILE=/var/backups/ordincore/ordincore-<TS>.sql.gz.enc
sudo -u postgres psql -c "CREATE DATABASE ordincore_restore OWNER ordinuser;"
openssl enc -d -aes-256-cbc -pbkdf2 -pass file:/etc/ordincore/backup.key -in "$FILE" \
  | gunzip | sudo -u postgres psql -d ordincore_restore
```
**Verification (2026‑09‑04):** restored into a scratch DB; `risks` count matched live (58 = 58);
scratch DB dropped. RESTORE_TEST_OK.

For a real recovery, restore into a new DB, verify counts + run app smoke tests, then repoint the
app (`backend/.env` `DB_NAME`) and restart (`pm2 restart ordincore-api`).

## Outstanding actions (hosting owner)
1. **Off‑server copy:** replicate encrypted backups + the key to a **separate UK location**
   (another host/region or object storage). On‑box backups alone don't survive a host loss.
2. **Add evidence media** (`backend/storage/uploads`) to the backup set.
3. **Recovery objectives:** define and record **RPO** (≤ 24 h with daily backups) and **RTO** (target
   **[e.g. 2 h]**); rehearse a full restore **[quarterly]** and log it.
4. **Pre‑release backups:** always run `ordincore-backup.sh` before a deploy/migration.
