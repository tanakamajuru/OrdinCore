import fs from 'fs';
import path from 'path';

describe('pattern scope fragmentation contract', () => {
  const worker = fs.readFileSync(path.join(__dirname, '../../workers/pattern.worker.ts'), 'utf8');
  const pulse = fs.readFileSync(path.join(__dirname, '../pulse.service.ts'), 'utf8');
  const governance = fs.readFileSync(path.join(__dirname, '../governance.service.ts'), 'utf8');

  it('sends the stable service-user ID to pattern detection', () => expect(pulse).toContain('service_user_id: pulse.service_user_id'));
  it('evaluates every signal at service scope', () => expect(worker).toContain("'service'"));
  it('adds a person lens only for a controlled service user', () => expect(worker).toContain('if (service_user_id)'));
  it('uses service themes as the default patterns board', () => expect(governance).toContain(": 'service'"));
  it('protects immediate detection from running twice', () => expect(worker).toContain("scope === 'service'"));
  it('keeps one domain parent while qualifying on coherent labels', () => {
    expect(worker).toContain('coherentSignals(signalsWindow)');
    expect(worker).toContain("raw.toLowerCase() === 'other'");
  });
  it('does not silently downgrade reviewed pattern lifecycle states', () => {
    expect(worker).toContain('preserveLifecycle(existingClusterStatus, cluster_status)');
    expect(worker).toContain("cluster_status IN ('Confirmed','Escalated')");
  });
  it('requires a shared canonical subtheme for the systemic lens', () => {
    expect(worker).toContain('HAVING COUNT(DISTINCT gp.house_id)>=2');
    expect(worker).toContain("LOWER(BTRIM(gp.signal_label))<>'other'");
  });
});
