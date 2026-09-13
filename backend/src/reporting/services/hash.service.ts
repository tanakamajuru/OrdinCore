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
    // JSONB may reorder object keys. Canonical ordering makes verification stable before and
    // after database persistence while preserving array order.
    return crypto.createHash('sha256').update(canonicalJson(obj)).digest('hex');
  },
};
