#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
EVIDENCE_DIR="${STAGE10J_EVIDENCE_DIR:-$ROOT_DIR/stage10j-evidence}"
RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)"
RUN_DIR="$EVIDENCE_DIR/$RUN_ID"

required=(DATABASE_URL CLEAN_TENANT_ID MIGRATED_TENANT_ID BASE_URL STAGE10J_RM_EMAIL STAGE10J_RM_PASSWORD)
missing=()
for key in "${required[@]}"; do
  if [[ -z "${!key:-}" ]]; then missing+=("$key"); fi
done
if (( ${#missing[@]} > 0 )); then
  printf 'Stage 10J BLOCKED: missing required environment variable(s): %s\n' "${missing[*]}" >&2
  exit 2
fi
if [[ "$CLEAN_TENANT_ID" == "$MIGRATED_TENANT_ID" ]]; then
  echo 'Stage 10J BLOCKED: CLEAN_TENANT_ID and MIGRATED_TENANT_ID must be different.' >&2
  exit 2
fi
command -v psql >/dev/null || { echo 'Stage 10J BLOCKED: psql is required.' >&2; exit 2; }

mkdir -p "$RUN_DIR"
exec > >(tee "$RUN_DIR/run.log") 2>&1

echo "Stage 10J acceptance run: $RUN_ID"
echo '1/6 Backend tests and type-check'
(cd "$ROOT_DIR/backend" && npm test -- --runInBand && npm run typecheck)

echo '2/6 Frontend type-check and production build'
(cd "$ROOT_DIR/frontend" && npm run typecheck && npm run build)

echo '3/6 Mobile type-check'
(cd "$ROOT_DIR/mobile" && npm run typecheck)

echo '4/6 Stage 10I constraint validation'
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f "$ROOT_DIR/backend/scripts/stage10i_validate_constraints.sql" \
  | tee "$RUN_DIR/stage10i-constraint-validation.txt"

echo '5/6 Database acceptance evidence'
psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 \
  -v clean_tenant_id="$CLEAN_TENANT_ID" \
  -v migrated_tenant_id="$MIGRATED_TENANT_ID" \
  -f "$ROOT_DIR/scripts/stage10j/database-evidence.sql" \
  | tee "$RUN_DIR/database-evidence.txt"

echo '6/6 Browser acceptance scenarios'
(cd "$ROOT_DIR/frontend" && \
  STAGE10J=1 STAGE10J_EVIDENCE_DIR="$RUN_DIR" BASE_URL="$BASE_URL" \
  npm run test:stage10j)

cp "$ROOT_DIR/scripts/stage10j/sign-off-template.md" "$RUN_DIR/sign-off.md"
cat > "$RUN_DIR/result.json" <<JSON
{
  "stage": "10J",
  "run_id": "$RUN_ID",
  "automated_checks": "PASSED",
  "release_decision": "PENDING_PRODUCT_OWNER_AND_DEVELOPER_SIGN_OFF",
  "clean_tenant_id": "$CLEAN_TENANT_ID",
  "migrated_tenant_id": "$MIGRATED_TENANT_ID",
  "base_url": "$BASE_URL"
}
JSON

echo "Automated Stage 10J checks passed. Evidence: $RUN_DIR"
echo 'Pilot release remains blocked until sign-off.md is completed by both required approvers.'
