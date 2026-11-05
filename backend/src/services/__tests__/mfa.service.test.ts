import { mfaService, MFA_MANDATORY_ROLES } from '../mfa.service';

describe('mfaService', () => {
  describe('mandatoryForRole', () => {
    it.each(MFA_MANDATORY_ROLES)('MFA is mandatory for %s', (role) => {
      expect(mfaService.mandatoryForRole(role)).toBe(true);
    });

    it('is case/separator insensitive', () => {
      expect(mfaService.mandatoryForRole('registered_manager')).toBe(true);
      expect(mfaService.mandatoryForRole('Registered-Manager')).toBe(true);
    });

    it('is false for non-mandatory roles', () => {
      expect(mfaService.mandatoryForRole('SUPPORT_WORKER')).toBe(false);
      expect(mfaService.mandatoryForRole('TEAM_LEADER')).toBe(false);
      expect(mfaService.mandatoryForRole('')).toBe(false);
    });
  });
});
