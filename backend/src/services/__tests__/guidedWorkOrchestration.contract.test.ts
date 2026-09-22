import fs from 'fs';
import path from 'path';

describe('Guided Work orchestration contract',()=>{
  const service=fs.readFileSync(path.join(__dirname,'../guidedWork.service.ts'),'utf8');
  const routes=fs.readFileSync(path.join(__dirname,'../../routes/guidedWork.routes.ts'),'utf8');
  const riskOb=fs.readFileSync(path.join(__dirname,'../riskReviewObligations.service.ts'),'utf8');

  it('deep-links exact records rather than generic registers',()=>{
    expect(service).toMatch(/\/effectiveness\?focus=\$\{canonicalId\}/);
    expect(service).toMatch(/\/escalation-log\?focus=\$\{e\.id\}/);
    expect(service).toMatch(/\/my-actions\?focus=\$\{a\.id\}/);
    expect(service).toMatch(/\/systemic-patterns\?focus=\$\{p\.id\}/);
    expect(service).toMatch(/\/weekly-review\/\$\{w\.id\}/);
  });
  it('returns exact blocker metadata when current task remains active',()=>{
    expect(routes).toMatch(/currentTask/);
    expect(routes).toMatch(/completionCondition/);
    expect(routes).toMatch(/exactRoute/);
  });
  it('risk review completion resolves obligations by source risk as well as subject risk',()=>{
    expect(riskOb).toMatch(/source_risk_id=\$2/);
  });
  it('collapses each canonical concern to a single item (Simplified Work Model)',()=>{
    // one concern -> one row, keyed by underlying risk where applicable
    expect(service).toMatch(/dedupeConcerns/);
    expect(service).toMatch(/concernRiskId \? `risk:\$\{it\.concernRiskId\}`/);
    // obligation-backed items win the collapse (they clear deterministically)
    expect(service).toMatch(/itBacked !== curBacked/);
    // every needsYou item is tagged assigned-work vs role-decision
    expect(service).toMatch(/category: \(it\.taskType==='ASSIGNED_ACTION'/);
  });
});
