import crypto from 'crypto';

// Evidence integrity — a SHA-256 over the frozen snapshot. Stored on the report and shown on the
// PDF so a downloaded report can be proven to match what was generated and approved.
export const hashService = {
  hash(obj: unknown): string {
    return crypto.createHash('sha256').update(JSON.stringify(obj)).digest('hex');
  },
};
