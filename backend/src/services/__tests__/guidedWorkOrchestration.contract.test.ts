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
  it('surfaces every open escalation in the tenant-scoped RM decision queue',()=>{
    const sql=service.match(/const escalations = await safeRows\(`([\s\S]*?)`/)?.[1] || '';
    expect(sql).toMatch(/e\.company_id=\$1/);
    expect(sql).toMatch(/e\.house_id=ANY\(\$2::uuid\[\]\)/);
    expect(sql).toMatch(/e\.is_open/);
    expect(sql).not.toMatch(/due_by\s*<=\s*NOW\(\)/i);
    expect(service).toMatch(/'Review open escalation'/);
  });
  it('does not re-queue a validly monitored escalation as a routine RM decision (Escalation Monitoring correction, 14 Oct 2026)',()=>{
    // A named monitoring owner + future next_review_at must route to Waiting, not Needs You,
    // and must not be gated on the original due_by SLA field.
    expect(service).toMatch(/validMonitoring = !!monitoringOwnerId && !reviewDue && !rmAttention/);
    expect(service).toMatch(/waiting\.push\(\{ id:`escalation:\$\{e\.id\}`/);
    // An urgent TL flag (rm_attention) must surface RM attention immediately regardless of next_review_at.
    expect(service).toMatch(/rmAttention = e\.metadata\?\.rm_attention/);
    // due_by (the SLA) is preserved untouched and is not what gates the monitoring re-queue.
    expect(service).toMatch(/const reviewDue = !e\.next_review_at \|\| new Date\(e\.next_review_at\)\.getTime\(\) <= Date\.now\(\)/);
  });
  it('derives an immediate TL My Work item from escalation monitoring assignment, not a second action',()=>{
    expect(service).toMatch(/taskType:'ESCALATION_MONITORING'/);
    expect(service).toMatch(/\(e\.metadata->>'monitoring_owner_id'\) = \$2::text/);
    expect(service).not.toMatch(/INSERT INTO risk_actions[\s\S]*ESCALATION_MONITORING/);
  });
});
