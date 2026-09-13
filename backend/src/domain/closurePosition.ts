import { EffectivenessOutcome, normalizeEffectiveness } from './effectiveness';

export type ClosurePositionCode =
  | 'INTERVENTION_REQUIRED' | 'EFFECTIVENESS_REQUIRED' | 'OBSERVATION_INCOMPLETE'
  | 'CONTROL_FAILED' | 'CONTROL_PARTIAL' | 'CANONICAL_BLOCKERS' | 'READY_FOR_RM_REVIEW';

export function closurePosition(input: {
  interventionExists: boolean;
  effectiveness: EffectivenessOutcome | string | null;
  blockers: string[];
}) {
  const outcome = normalizeEffectiveness(input.effectiveness);
  if (!input.interventionExists) return { code: 'INTERVENTION_REQUIRED' as const, ready: false, message: 'Set an intervention and its expected outcome before closure can be considered.' };
  if (!outcome) return { code: 'EFFECTIVENESS_REQUIRED' as const, ready: false, message: 'Effectiveness has not yet been reviewed.' };
  if (outcome === 'Too Early To Assess') return { code: 'OBSERVATION_INCOMPLETE' as const, ready: false, message: 'The observation period is incomplete. Reassess effectiveness when further evidence is available.' };
  if (outcome === 'Not Effective') return { code: 'CONTROL_FAILED' as const, ready: false, message: 'The intervention did not reduce the risk. Review the control and decide the next action.' };
  if (outcome === 'Partially Effective') return { code: 'CONTROL_PARTIAL' as const, ready: false, message: 'The intervention was only partially effective. Further control or review is required.' };
  if (input.blockers.length) return { code: 'CANONICAL_BLOCKERS' as const, ready: false, message: input.blockers.join(' '), blockers: input.blockers };
  return { code: 'READY_FOR_RM_REVIEW' as const, ready: true, message: 'Intervention effective and every open risk passed its canonical closure review. An RM closure decision is now required.' };
}
