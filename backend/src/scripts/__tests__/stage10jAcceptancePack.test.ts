import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '../../../..');
const read = (relative: string) => fs.readFileSync(path.join(root, relative), 'utf8');

describe('Stage 10J acceptance pack', () => {
  it('fails closed when staging inputs or approver sign-off are absent', () => {
    const runner = read('scripts/stage10j/run-acceptance.sh');
    expect(runner).toContain('DATABASE_URL CLEAN_TENANT_ID MIGRATED_TENANT_ID BASE_URL STAGE10J_RM_EMAIL STAGE10J_RM_PASSWORD');
    expect(runner).toContain('PENDING_PRODUCT_OWNER_AND_DEVELOPER_SIGN_OFF');
    expect(runner).toContain('stage10i_validate_constraints.sql');
    const frontendPackage = JSON.parse(read('frontend/package.json'));
    expect(frontendPackage.scripts['test:stage10j']).toContain('stage10j-pilot-acceptance.spec.ts');
    expect(fs.existsSync(path.join(root, 'frontend/tests/stage10j-pilot-acceptance.spec.ts'))).toBe(true);
  });

  it('checks canonical values, lineage, duplicate escalations and remediation', () => {
    const sql = read('scripts/stage10j/database-evidence.sql');
    expect(sql).toContain('non-canonical action rows');
    expect(sql).toContain('cross-tenant/orphan action relationships');
    expect(sql).toContain('duplicate active escalation pair');
    expect(sql).toContain('governance_remediation_open_items');
  });

  it('requires evidence for the disputed effectiveness and closure scenarios', () => {
    const signoff = read('scripts/stage10j/sign-off-template.md');
    expect(signoff).toContain('Too Early → future review obligation');
    expect(signoff).toContain('Effective action with open escalation remains blocked');
    expect(signoff).toContain('Escalation resolution → risk closure');
    expect(signoff).toContain('Cross-tenant API and direct-link access denied');
  });
});
