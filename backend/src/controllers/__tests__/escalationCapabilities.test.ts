import { escalationCapabilities } from '../escalations.controller';

// Escalation Screen Doctrine (§8 control matrix): one canonical record, authority separated by role.
describe('escalationCapabilities', () => {
  it('Team Leader may add updates/complete assigned work/flag urgent, but not decide or close', () => {
    const caps = escalationCapabilities('TEAM_LEADER');
    expect(caps).toMatchObject({
      can_add_update: true,
      can_complete_assigned_action: true,
      can_flag_urgent: true,
      can_make_governance_decision: false,
      can_create_action: false,
      can_escalate_further: false,
      can_start_closure: false,
      can_close: false,
    });
  });

  it('Support Worker has the same delivery-only capabilities as a Team Leader', () => {
    expect(escalationCapabilities('SUPPORT_WORKER').can_make_governance_decision).toBe(false);
    expect(escalationCapabilities('SUPPORT_WORKER').can_add_update).toBe(true);
  });

  it('Registered Manager owns the governance decision and closure', () => {
    const caps = escalationCapabilities('REGISTERED_MANAGER');
    expect(caps).toMatchObject({
      can_make_governance_decision: true,
      can_create_action: true,
      can_escalate_further: true,
      can_start_closure: true,
      can_close: true,
      can_add_update: true,
    });
  });

  it('normalises hyphenated / lower-case roles', () => {
    expect(escalationCapabilities('registered-manager').can_make_governance_decision).toBe(true);
    expect(escalationCapabilities('team-leader').can_make_governance_decision).toBe(false);
  });
});
