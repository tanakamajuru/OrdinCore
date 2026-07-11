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

# Publish the built SPA to the live Apache docroot. The build lands in
# frontend/dist, but Apache serves the app from FRONTEND_DOCROOT — copying is
# what actually makes a frontend change go live. Only index.html + assets are
# replaced; .htaccess (SPA rewrite + API proxy) and .well-known are preserved.
FRONTEND_DOCROOT="/home/ordin/public_html/work.ordincore.co.uk"
if [[ -d "$FRONTEND_DOCROOT" ]]; then
  log "Frontend: publish to live docroot ($FRONTEND_DOCROOT)"
  rm -rf "$FRONTEND_DOCROOT/assets"
  cp -a dist/assets "$FRONTEND_DOCROOT/assets"
  cp -af dist/index.html "$FRONTEND_DOCROOT/index.html"
  chown -R ordin:ordin "$FRONTEND_DOCROOT/assets" "$FRONTEND_DOCROOT/index.html"
else
  echo "WARNING: $FRONTEND_DOCROOT not found — frontend NOT published."
fi

# ---------- Landing page ----------
log "Landing page: install + build + publish"
cd "$APP_ROOT/landing-page"
npm install --legacy-peer-deps
chmod -R 755 node_modules/.bin
npm run build
mkdir -p "$LANDING_DIST"
cp -rf dist/* "$LANDING_DIST/"

# ---------- Web server reload (best-effort) ----------
# This box serves via Apache (httpd), not nginx. A code deploy changes no web
# config, so a reload isn't strictly required (static files + pm2 already
# updated) — do it best-effort and never fail the deploy on it.
log "Reloading web server (best-effort)"
( httpd -t 2>/dev/null && systemctl reload httpd 2>/dev/null && echo "httpd reloaded" ) \
  || ( apachectl -t 2>/dev/null && apachectl graceful 2>/dev/null && echo "apache gracefully reloaded" ) \
  || ( nginx -t 2>/dev/null && systemctl reload nginx 2>/dev/null && echo "nginx reloaded" ) \
  || echo "web server reload skipped (static files are served directly)"

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
