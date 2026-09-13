import { governanceStatePermissions } from '../governanceState.contract';

describe('governance state role alignment', () => {
  it('keeps oversight roles read-only', () => {
    expect(governanceStatePermissions('DIRECTOR')).toEqual({
      can_review_effectiveness: false,
      can_make_closure_decision: false,
      assurance_read_only: true,
    });
    expect(governanceStatePermissions('RESPONSIBLE_INDIVIDUAL').assurance_read_only).toBe(true);
  });

  it('gives the registered manager decision actions without changing facts', () => {
    expect(governanceStatePermissions('REGISTERED_MANAGER')).toEqual({
      can_review_effectiveness: true,
      can_make_closure_decision: true,
      assurance_read_only: false,
    });
  });
});
