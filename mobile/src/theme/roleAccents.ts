/**
 * theme/roleAccents.ts
 * Each role's mobile app reuses the identical token system — only the
 * brand accent differs (Care Worker's green CTA, RM/Team Leader/RI's
 * teal/navy). Pass these into <Button accentColor={...}> or badge tints
 * where a screen needs to match its role's brand rather than the global
 * `colors.primary`.
 */
export const roleAccent = {
  director: '#0E7C7B', // teal — matches colors.primary
  registeredManager: '#0E7C7B',
  careWorker: '#1B8A3E', // green
  teamLeader: '#2E6FE0', // blue
  responsibleIndividual: '#0E7C7B',
} as const;
