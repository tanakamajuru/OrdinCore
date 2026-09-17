import fs from 'fs';
import path from 'path';

describe('Canonical Action Evidence Contract source guards',()=>{
  const service=fs.readFileSync(path.join(__dirname,'../canonicalGovernanceAction.service.ts'),'utf8');
  const actions=fs.readFileSync(path.join(__dirname,'../../controllers/actions.controller.ts'),'utf8');
  const effectiveness=fs.readFileSync(path.join(__dirname,'../actionEffectiveness.service.ts'),'utf8');
  it('requires intended outcome and lineage for effectiveness-bearing new actions',()=>{
    expect(service).toMatch(/EFFECTIVENESS_REQUIRED/);
    expect(service).toMatch(/require canonical governance lineage/i);
    expect(service).toMatch(/require an intended outcome/i);
  });
  it('opens effectiveness obligation only for explicit effectiveness-bearing actions',()=>{
    expect(service).toMatch(/review_requirement==='EFFECTIVENESS_REQUIRED'/);
    expect(actions).toMatch(/review_requirement === 'EFFECTIVENESS_REQUIRED'/);
  });
  it('does not allow intended outcome to be invented inside effectiveness rating',()=>{
    expect(effectiveness).toMatch(/const intendedOutcome = String\(action\.intended_outcome \|\| ''\)/);
    expect(effectiveness).toMatch(/legacy action is not classified/i);
  });
});
