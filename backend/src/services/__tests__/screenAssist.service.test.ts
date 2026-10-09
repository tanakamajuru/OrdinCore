jest.mock('../../config/database', () => ({ query: jest.fn() }));
import { query } from '../../config/database';
import { screenAssistService } from '../screenAssist.service';

const mockedQuery = query as jest.Mock;
const base = { companyId: '11111111-1111-1111-1111-111111111111', userId: '22222222-2222-2222-2222-222222222222', role: 'DIRECTOR', screenKey: 'director.dashboard' };

describe('controlled Screen Assist', () => {
  beforeEach(() => mockedQuery.mockReset());
  it('explains an option without choosing it for the case', async () => {
    mockedQuery.mockResolvedValueOnce({ rows: [{ id: 'g1', topic: 'controls', title: 'Escalations', answer: 'Escalate starts higher, time-bound oversight and requires a recorded reason.', steps: [], example_questions: [], source_name: 'Guide', source_version: '1.3.0' }] });
    mockedQuery.mockResolvedValueOnce({ rows: [] });
    const result = await screenAssistService.answer({ ...base, role: 'REGISTERED_MANAGER', screenKey: 'registered_manager.daily_oversight', workflowState: 'editable', question: 'Should I escalate this?' });
    expect(result.classification).toBe('ALLOWED');
    expect(result.answer).toContain('requires a recorded reason');
    expect(result.answer).not.toMatch(/you should|you must|this qualifies/i);
    expect(mockedQuery).toHaveBeenCalledTimes(2);
  });
  it('continues to block unsupported case judgements', async () => {
    mockedQuery.mockResolvedValueOnce({ rows: [] });
    const result = await screenAssistService.answer({ ...base, question: 'Should I dismiss this concern?' });
    expect(result.classification).toBe('PROHIBITED');
    expect(result.code).toBe('CASE_JUDGEMENT');
    expect(mockedQuery).toHaveBeenCalledTimes(1);
  });
  it('answers how-to questions from the screen-use guide', async () => {
    mockedQuery.mockResolvedValueOnce({ rows: [
      { id: 'g1', topic: 'purpose', title: 'Daily Oversight', answer: 'Daily workspace', steps: [], example_questions: [], source_name: 'Guide', source_version: '1.3.0' },
      { id: 'g2', topic: 'use', title: 'How to use Daily Oversight', answer: 'Choose a service and date.', steps: ['Select the service and date.', 'Open a signal and read its details.'], example_questions: [], source_name: 'Guide', source_version: '1.3.0' },
    ] });
    mockedQuery.mockResolvedValueOnce({ rows: [] });
    const result = await screenAssistService.answer({ ...base, role: 'REGISTERED_MANAGER', screenKey: 'registered_manager.daily_oversight', workflowState: 'editable', question: 'How do I complete Daily Oversight?' });
    expect(result.classification).toBe('ALLOWED');
    expect(result.topic).toBe('use');
    expect(result.steps).toHaveLength(2);
  });
  it('finds named options in approved control guidance', async () => {
    mockedQuery.mockResolvedValueOnce({ rows: [
      { id: 'g1', topic: 'use', title: 'Daily Oversight use', answer: 'Review the signal.', steps: [], example_questions: [], source_name: 'Guide', source_version: '1.3.0' },
      { id: 'g2', topic: 'controls', title: 'Daily Oversight controls', answer: 'Close requires applicable review, evidence and rationale.', steps: [], example_questions: [], source_name: 'Guide', source_version: '1.3.0' },
    ] });
    mockedQuery.mockResolvedValueOnce({ rows: [] });
    const result = await screenAssistService.answer({ ...base, role: 'REGISTERED_MANAGER', screenKey: 'registered_manager.daily_oversight', workflowState: 'editable', question: 'Should I close this?' });
    expect(result.classification).toBe('ALLOWED');
    expect(result.topic).toBe('controls');
    expect(result.answer).toContain('requires applicable review');
  });
  it('explains what an option means from controls guidance', async () => {
    mockedQuery.mockResolvedValueOnce({ rows: [
      { id: 'g1', topic: 'use', title: 'Daily Oversight use', answer: 'Monitor keeps the signal visible for review.', steps: ['Monitor returns when due.'], example_questions: [], source_name: 'Guide', source_version: '1.3.0' },
      { id: 'g2', topic: 'controls', title: 'Daily Oversight controls', answer: 'Monitor keeps active oversight and requires a review date.', steps: [], example_questions: [], source_name: 'Guide', source_version: '1.3.0' },
    ] });
    mockedQuery.mockResolvedValueOnce({ rows: [] });
    const result = await screenAssistService.answer({ ...base, role: 'REGISTERED_MANAGER', screenKey: 'registered_manager.daily_oversight', workflowState: 'editable', question: 'What does Monitor mean?' });
    expect(result.classification).toBe('ALLOWED');
    expect(result.topic).toBe('controls');
    expect(result.answer).toContain('requires a review date');
  });
  it('asks for Daily Oversight state instead of assuming it', async () => {
    mockedQuery.mockResolvedValueOnce({ rows: [] });
    const result = await screenAssistService.answer({ ...base, role: 'REGISTERED_MANAGER', screenKey: 'registered_manager.daily_oversight', question: 'How do I complete Daily Oversight?' });
    expect(result.classification).toBe('UNSUPPORTED');
    expect(result.code).toBe('WORKFLOW_CONTEXT_REQUIRED');
    expect(result.answer).toContain('editable review');
    expect(mockedQuery).toHaveBeenCalledTimes(1);
  });
  it('adds available next steps when explaining a control on a signed screen', async () => {
    mockedQuery.mockResolvedValueOnce({ rows: [{ id: 'g2', topic: 'controls', title: 'Daily Oversight controls', answer: 'Close requires evidence and rationale.', steps: [], example_questions: [], source_name: 'Guide', source_version: '1.3.0' }] });
    mockedQuery.mockResolvedValueOnce({ rows: [] });
    const result = await screenAssistService.answer({ ...base, role: 'REGISTERED_MANAGER', screenKey: 'registered_manager.daily_oversight', workflowState: 'signed_read_only', question: 'Should I close this?' });
    expect(result.classification).toBe('ALLOWED');
    expect(result.answer).toContain('requires evidence and rationale');
    expect(result.answer).toContain('Review outstanding signals');
    expect(result.answer).toContain('signed brief remains unchanged');
  });
  it.each([
    ['signed_read_only', 'Review outstanding signals', 'does not close outstanding actions'],
    ['historical_read_only', 'Review the signed Team Brief', 'cannot change or sign'],
    ['historical_unpublished_read_only', 'Confirm that no signed record', 'No signed record exists'],
    ['post_signoff_review', 'signed addendum', 'Team Brief remains signed'],
  ] as const)('returns available Daily Oversight next steps for %s', async (workflowState, expectedStep, expectedAnswer) => {
    mockedQuery.mockResolvedValueOnce({ rows: [{ id: 'g1', topic: 'use', title: 'Daily Oversight', answer: 'generic guide', steps: ['generic step'], example_questions: [], source_name: 'Guide', source_version: '1.3.0' }] });
    mockedQuery.mockResolvedValueOnce({ rows: [] });
    const result = await screenAssistService.answer({ ...base, role: 'REGISTERED_MANAGER', screenKey: 'registered_manager.daily_oversight', workflowState, question: 'How do I complete Daily Oversight?' });
    expect(result.classification).toBe('ALLOWED');
    expect(result.steps?.join(' ')).toContain(expectedStep);
    expect(result.answer).toContain(expectedAnswer);
    if (workflowState === 'signed_read_only' || workflowState === 'historical_read_only' || workflowState === 'historical_unpublished_read_only') {
      expect(result.steps?.join(' ')).not.toContain('Accept & Sign Off');
    }
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
