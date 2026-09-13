import crypto from 'crypto';

function canonicalJson(value: unknown): string {
  if (value === undefined) return 'null';
  if (value === null || typeof value !== 'object') return JSON.stringify(value) as string;
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj).sort().map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`).join(',')}}`;
}

// Evidence integrity — a SHA-256 over the frozen snapshot. Stored on the report and shown on the
// PDF so a downloaded report can be proven to match what was generated and approved.
export const hashService = {
  hash(obj: unknown): string {
    // Normalise through JSON exactly as JSONB persistence does — Date objects (Postgres returns
    // timestamps as Dates) become ISO strings and `undefined` keys are dropped — BEFORE hashing.
    // Without this the hash computed at creation (raw Dates -> "{}") never matches the hash
    // recomputed after the payload has round-tripped through JSONB (ISO strings), so every
    // canonical report failed verification on download. Canonical key ordering then makes the
    // hash stable regardless of how JSONB reorders object keys (array order preserved).
    const normalised = JSON.parse(JSON.stringify(obj ?? null));
    return crypto.createHash('sha256').update(canonicalJson(normalised)).digest('hex');
  },
};
