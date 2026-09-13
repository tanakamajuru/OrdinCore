import { hashService } from '../hash.service';

describe('frozen report integrity', () => {
  it('produces the same hash after JSONB reorders object keys', () => {
    const first = { data: { b: 2, a: 1 }, narrative: { summary: 'same' } };
    const reordered = { narrative: { summary: 'same' }, data: { a: 1, b: 2 } };
    expect(hashService.hash(first)).toBe(hashService.hash(reordered));
  });

  it('detects narrative changes as well as data changes', () => {
    const original = { data: { score: 2 }, narrative: { summary: 'approved' } };
    const changed = { data: { score: 2 }, narrative: { summary: 'altered' } };
    expect(hashService.hash(original)).not.toBe(hashService.hash(changed));
  });
});
