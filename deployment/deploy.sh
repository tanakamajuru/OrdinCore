#!/usr/bin/env bash
#
# Ordin Core — production redeploy script
# Server: 185.116.215.178   App root: /var/www/ordincore
#
# Usage (on the server, as root):
#   cd /var/www/ordincore && ./deploy.sh
#
# Or copy it up from your machine first (see scp note at bottom of this file),
# then SSH in and run it.
#
# This is a CODE-ONLY redeploy (pull + build + restart). It does NOT reset or
# re-seed the database. For a full DB reset, see section 13 of deployment.md.

set -euo pipefail

APP_ROOT="/var/www/ordincore"
LANDING_DIST="/var/www/ordincore/landing-page-dist"

log() { printf '\n\033[1;36m==> %s\033[0m\n' "$1"; }

# Must be root (pm2 process runs as root, nginx reload needs it)
if [[ "$(id -u)" -ne 0 ]]; then
  echo "Please run as root:  sudo -i  then  ./deploy.sh"
  exit 1
fi

cd "$APP_ROOT"

log "Pulling latest code (main)"
git pull origin main

# ---------- Backend ----------
log "Backend: install"
cd "$APP_ROOT/backend"
npm install

# CRITICAL: freshly-installed .bin scripts often land without the execute bit
# on this server, which makes 'npm run build' / 'db:migrate' fail with
# "Permission denied" (tsc / ts-node). Fix it before building.
log "Backend: fixing node_modules/.bin permissions"
chmod -R 755 node_modules/.bin

log "Backend: build"
npm run build

log "Backend: run migrations"
npm run db:migrate

log "Backend: restart pm2"
pm2 restart ordincore-api --update-env

# ---------- Frontend ----------
log "Frontend: install + build"
cd "$APP_ROOT/frontend"
npm install --legacy-peer-deps
chmod -R 755 node_modules/.bin
npm run build

# ---------- Landing page ----------
log "Landing page: install + build + publish"
cd "$APP_ROOT/landing-page"
npm install --legacy-peer-deps
chmod -R 755 node_modules/.bin
npm run build
mkdir -p "$LANDING_DIST"
cp -rf dist/* "$LANDING_DIST/"

# ---------- Nginx ----------
log "Reloading nginx"
nginx -t && systemctl reload nginx

log "Done. Quick health check:"
pm2 list
echo
echo "Tail backend logs with:  pm2 logs ordincore-api --lines 50"

# -----------------------------------------------------------------------------
# To copy this script onto the server from your Windows machine (PowerShell):
#
#   scp ".\deployment\deploy.sh" tmajuru@185.116.215.178:/tmp/deploy.sh
#   ssh tmajuru@185.116.215.178
#   sudo -i
#   install -m 755 /tmp/deploy.sh /var/www/ordincore/deploy.sh
#   cd /var/www/ordincore && ./deploy.sh
# -----------------------------------------------------------------------------
