/**
 * Separation of duties — the non-negotiable guard that makes multi-role safe.
 * Enforced in the service layer, independent of which roles a user holds: a person
 * who is both (say) RM and RI may switch hats generally, but can never be both the
 * author/finaliser AND the approver/validator of the SAME item. Independence is
 * structural, not trust-based.
 */
export function assertIndependent(authorId: string | null | undefined, actorId: string, what: string): void {
  if (authorId && authorId === actorId) {
    throw new Error(`Independent ${what} required: you cannot approve your own work, even if you hold both roles.`);
  }
}
