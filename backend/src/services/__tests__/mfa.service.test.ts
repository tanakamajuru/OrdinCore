import { mfaService, MFA_MANDATORY_ROLES } from '../mfa.service';

describe('mfaService — enforcement policy', () => {
  describe('mandatoryForRole', () => {
    it.each(MFA_MANDATORY_ROLES)('MFA is mandatory for %s', (role) => {
      expect(mfaService.mandatoryForRole(role)).toBe(true);
    });

    it('is mandatory regardless of case/hyphen formatting', () => {
      expect(mfaService.mandatoryForRole('registered_manager')).toBe(true);
      expect(mfaService.mandatoryForRole('Registered-Manager')).toBe(true);
    });

    it('is NOT mandatory for non-privileged roles', () => {
      expect(mfaService.mandatoryForRole('SUPPORT_WORKER')).toBe(false);
      expect(mfaService.mandatoryForRole('TEAM_LEADER')).toBe(false);
      expect(mfaService.mandatoryForRole('')).toBe(false);
    });
  });

  describe('enrolmentRequired', () => {
    it('never requires enrolment once MFA is enabled', () => {
      expect(mfaService.enrolmentRequired('ADMIN', true, true)).toBe(false);
      expect(mfaService.enrolmentRequired('SUPPORT_WORKER', true, true)).toBe(false);
    });

    it('requires enrolment for a mandatory role that has not enrolled, even if company flag is off', () => {
      expect(mfaService.enrolmentRequired('ADMIN', false, false)).toBe(true);
      expect(mfaService.enrolmentRequired('REGISTERED_MANAGER', false, false)).toBe(true);
    });

    it('requires enrolment for any role when the company requires MFA', () => {
      expect(mfaService.enrolmentRequired('SUPPORT_WORKER', true, false)).toBe(true);
    });

    it('does not require enrolment for a non-mandatory role when the company does not require it', () => {
      expect(mfaService.enrolmentRequired('SUPPORT_WORKER', false, false)).toBe(false);
      expect(mfaService.enrolmentRequired('TEAM_LEADER', false, false)).toBe(false);
    });
  });
});
