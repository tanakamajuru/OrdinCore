import { requireRole } from '../../middleware/role.middleware';

const run = (middleware: any, role: string) => {
  let passed = false;
  const req: any = { user: { role } };
  const res: any = { status: () => res, json: () => res };
  middleware(req, res, () => { passed = true; });
  return passed;
};

describe('weekly review approval and publication roles', () => {
  const validators = requireRole('DIRECTOR', 'RESPONSIBLE_INDIVIDUAL', 'ADMIN', 'SUPER_ADMIN');
  const publishers = requireRole('REGISTERED_MANAGER', 'DIRECTOR', 'RESPONSIBLE_INDIVIDUAL', 'ADMIN', 'SUPER_ADMIN');

  it.each(['DIRECTOR', 'RESPONSIBLE_INDIVIDUAL'])('%s may validate', role => expect(run(validators, role)).toBe(true));
  it.each(['DIRECTOR', 'RESPONSIBLE_INDIVIDUAL'])('%s may publish an approved review', role => expect(run(publishers, role)).toBe(true));
  it('does not give the RM validation authority', () => expect(run(validators, 'REGISTERED_MANAGER')).toBe(false));
});
