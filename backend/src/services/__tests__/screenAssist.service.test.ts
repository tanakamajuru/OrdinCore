jest.mock('../../config/database', () => ({ query: jest.fn() }));
import { query } from '../../config/database';
import { screenAssistService } from '../screenAssist.service';

const mockedQuery = query as jest.Mock;
const base = { companyId: '11111111-1111-1111-1111-111111111111', userId: '22222222-2222-2222-2222-222222222222', role: 'DIRECTOR', screenKey: 'director.dashboard' };

describe('controlled Screen Assist', () => {
  beforeEach(() => mockedQuery.mockReset());
  it('refuses case-specific governance advice before retrieval', async () => {
    mockedQuery.mockResolvedValueOnce({ rows: [] });
    const result = await screenAssistService.answer({ ...base, question: 'Should I escalate this person?' });
    expect(result.classification).toBe('PROHIBITED');
    expect(mockedQuery).toHaveBeenCalledTimes(1); // audit only
  });
  it('returns only published approved guidance', async () => {
    mockedQuery.mockResolvedValueOnce({ rows: [{ id: 'g1', topic: 'purpose', title: 'Strategic Dashboard', answer: 'Approved answer', steps: [], example_questions: ['What is this screen?'], source_name: 'Doctrine', source_version: '1.0.0' }] });
    mockedQuery.mockResolvedValueOnce({ rows: [] });
    const result = await screenAssistService.answer({ ...base, question: 'What is this screen?' });
    expect(result.classification).toBe('ALLOWED'); expect(result.answer).toBe('Approved answer');
    expect(mockedQuery.mock.calls[0][0]).toContain('approved_by IS NOT NULL');
    expect(mockedQuery.mock.calls[0][0]).toContain("string_to_array(source_version, '.')::int[]");
  });
  it('does not invent unsupported guidance', async () => {
    mockedQuery.mockResolvedValueOnce({ rows: [] }); mockedQuery.mockResolvedValueOnce({ rows: [] });
    const result = await screenAssistService.answer({ ...base, question: 'How does an unknown widget operate?' });
    expect(result.classification).toBe('UNSUPPORTED');
  });
  it('serves approved Team Leader guidance only within the Team Leader screen allowlist', async () => {
    mockedQuery.mockResolvedValueOnce({ rows: [{ id: 'g2', topic: 'purpose', title: 'My Actions', answer: 'Role-specific answer', steps: [], example_questions: ['What is this screen?'], source_name: 'Doctrine', source_version: '1.1.0' }] });
    mockedQuery.mockResolvedValueOnce({ rows: [] });
    const result = await screenAssistService.answer({ ...base, role: 'TEAM_LEADER', screenKey: 'team_leader.my_actions', question: 'What is this screen?' });
    expect(result.classification).toBe('ALLOWED');
  });
  it('blocks a role from asserting another interface screen', async () => {
    mockedQuery.mockResolvedValueOnce({ rows: [] });
    const result = await screenAssistService.answer({ ...base, role: 'TEAM_LEADER', screenKey: 'director.dashboard', question: 'What is this screen?' });
    expect(result.classification).toBe('INVALID');
  });
  it('keeps Responsible Individual advice non-operational', async () => {
    mockedQuery.mockResolvedValueOnce({ rows: [{ id: 'g3', topic: 'role', title: 'RI role', answer: 'Independent assurance only', steps: [], example_questions: ['What is my role here?'], source_name: 'Doctrine', source_version: '1.1.0' }] });
    mockedQuery.mockResolvedValueOnce({ rows: [] });
    const result = await screenAssistService.answer({ ...base, role: 'RESPONSIBLE_INDIVIDUAL', screenKey: 'responsible_individual.assurance', question: 'What is my role here?' });
    expect(result.classification).toBe('ALLOWED');
    expect(result.answer).toContain('Independent assurance');
  });
  it.each([
    ['responsible_individual.incidents','What is this screen?'],
    ['responsible_individual.trends','How do I use this screen?'],
  ])('covers the RI navigation screen %s', async (screenKey, question) => {
    mockedQuery.mockResolvedValueOnce({ rows: [{ id: 'g4', topic: 'purpose', title: 'RI assurance', answer: 'Read-only assurance', steps: [], example_questions: [question], source_name: 'Doctrine', source_version: '1.2.0' }] });
    mockedQuery.mockResolvedValueOnce({ rows: [] });
    const result = await screenAssistService.answer({ ...base, role: 'RESPONSIBLE_INDIVIDUAL', screenKey, question });
    expect(result.classification).toBe('ALLOWED');
  });
});
