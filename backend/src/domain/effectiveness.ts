export const EFFECTIVENESS_OUTCOMES = [
  'Effective', 'Partially Effective', 'Not Effective', 'Too Early To Assess',
] as const;

export type EffectivenessOutcome = typeof EFFECTIVENESS_OUTCOMES[number];
export type LegacyEffectiveness = 'Effective' | 'Neutral' | 'Ineffective';

export function normalizeEffectiveness(value: unknown): EffectivenessOutcome | null {
  const v = String(value || '').trim().toLowerCase();
  if (v === 'effective') return 'Effective';
  if (v === 'neutral' || v === 'partial' || v === 'partially' || v === 'partially effective') return 'Partially Effective';
  if (v === 'ineffective' || v === 'not effective') return 'Not Effective';
  if (v === 'too early' || v === 'too early to assess') return 'Too Early To Assess';
  return null;
}

export function toLegacyEffectiveness(value: EffectivenessOutcome): LegacyEffectiveness | null {
  if (value === 'Effective') return 'Effective';
  if (value === 'Partially Effective') return 'Neutral';
  if (value === 'Not Effective') return 'Ineffective';
  return null;
}

export function isFinalEffectiveness(value: unknown): boolean {
  const outcome = normalizeEffectiveness(value);
  return outcome !== null && outcome !== 'Too Early To Assess';
}

export function effectivenessContribution(value: unknown): number {
  const outcome = normalizeEffectiveness(value);
  if (outcome === 'Effective') return -1;
  if (outcome === 'Partially Effective') return -0.4;
  if (outcome === 'Not Effective') return 1;
  return 0;
}
