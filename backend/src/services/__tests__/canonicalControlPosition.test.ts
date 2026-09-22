import { deriveCanonicalControlPosition } from '../canonicalControlPosition.service';

describe('canonical control position',()=>{
  it('keeps historical failure but allows a later final effective control in the same domain to supersede it for current position',()=>{
    const p=deriveCanonicalControlPosition([
      {id:'a1',status:'Completed',review_requirement:'EFFECTIVENESS_REQUIRED',governance_domain:'Environment',effectiveness_outcome:'Not Effective',effectiveness_reviewed_at:'2026-09-01T10:00:00Z'},
      {id:'a2',status:'Completed',review_requirement:'EFFECTIVENESS_REQUIRED',governance_domain:'Environment',effectiveness_outcome:'Effective',effectiveness_reviewed_at:'2026-09-10T10:00:00Z'},
    ]);
    expect(p.current.overall).toBe('Effective');
    expect(p.historical.partially_or_not_effective).toBe(1);
  });
  it('blocks an overall effective position when another current domain remains partially effective',()=>{
    const p=deriveCanonicalControlPosition([
      {id:'a1',status:'Completed',review_requirement:'EFFECTIVENESS_REQUIRED',governance_domain:'Environment',effectiveness_outcome:'Effective',effectiveness_reviewed_at:'2026-09-10T10:00:00Z'},
      {id:'a2',status:'Completed',review_requirement:'EFFECTIVENESS_REQUIRED',governance_domain:'Safeguarding',effectiveness_outcome:'Partially Effective',effectiveness_reviewed_at:'2026-09-11T10:00:00Z'},
    ]);
    expect(p.current.overall).toBe('Mixed');
    expect(p.current.partially_effective).toBe(1);
  });
});
