import fs from 'fs';
import path from 'path';

describe('adaptive signal-library contract', () => {
  const domains = fs.readFileSync(path.join(__dirname, '../governanceDomains.service.ts'), 'utf8');
  const repo = fs.readFileSync(path.join(__dirname, '../../repositories/pulses.repo.ts'), 'utf8');
  const worker = fs.readFileSync(path.join(__dirname, '../../workers/pattern.worker.ts'), 'utf8');
  const routes = fs.readFileSync(path.join(__dirname, '../../routes/governanceConfig.routes.ts'), 'utf8');

  it('offers the virtual Other label under every active theme', () =>
    expect(domains).toContain('OTHER_SIGNAL_LABEL'));

  it('requires every capture to use an active label or the reserved Other option', () => {
    expect(repo).toContain('Select an active signal from the service signal library, or use Other.');
    expect(repo).toContain('suggested_signal_label');
  });

  it('continues to cluster by the governance theme rather than the detailed label', () => {
    expect(worker).toContain('risk_domain');
    expect(worker).not.toContain('signal_label = ANY');
  });

  it('keeps candidate publication behind Super Admin review routes', () => {
    expect(routes).toContain("router.patch('/signal-suggestions/:id/review', ...edit");
  });
});
