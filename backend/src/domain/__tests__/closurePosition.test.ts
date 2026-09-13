import { closurePosition } from '../closurePosition';

describe('canonical closure position', () => {
  it.each([[null,'EFFECTIVENESS_REQUIRED'],['Too Early To Assess','OBSERVATION_INCOMPLETE'],
    ['Not Effective','CONTROL_FAILED'],['Partially Effective','CONTROL_PARTIAL']])
  ('explains %s', (effectiveness, code) => {
    expect(closurePosition({ interventionExists: true, effectiveness, blockers: [] }).code).toBe(code);
  });
  it('retains blockers after an effective rating', () => {
    expect(closurePosition({ interventionExists: true, effectiveness: 'Effective', blockers: ['Open escalation.'] }).code).toBe('CANONICAL_BLOCKERS');
  });
});
