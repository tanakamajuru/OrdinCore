jest.mock('../../config/database', () => ({ query: jest.fn(), getClient: jest.fn() }));
import { getClient } from '../../config/database';
import { ALLOWED_SCREENS } from '../screenAssist.service';
import { screenAssistDoctrineService } from '../screenAssistDoctrine.service';

const mockedGetClient = getClient as jest.Mock;
const prefix: Record<string,string> = {
  TEAM_LEADER: 'team_leader.', REGISTERED_MANAGER: 'registered_manager.',
  DIRECTOR: 'director.', RESPONSIBLE_INDIVIDUAL: 'responsible_individual.',
};
const topics = ['purpose','role','use','controls','next'];
const completeRows = Object.entries(ALLOWED_SCREENS).flatMap(([role,screens]) =>
  [...screens].flatMap((screen) => topics.map((topic) => ({ screen_key: `${prefix[role]}${screen}`, topic }))));

describe('controlled doctrine publication', () => {
  beforeEach(() => mockedGetClient.mockReset());

  it('publishes a complete version atomically with an approval record', async () => {
    const client = {
      query: jest.fn(async (sql: string) => {
        if (sql.includes('SELECT screen_key,topic')) return { rows: completeRows };
        return { rows: [], rowCount: completeRows.length };
      }),
      release: jest.fn(),
    };
    mockedGetClient.mockResolvedValue(client);
    const result = await screenAssistDoctrineService.publishVersion(
      '1.2.0','22222222-2222-2222-2222-222222222222',
      'Governance owner approved the complete controlled wording.');
    expect(result.published).toBe(true);
    expect(client.query).toHaveBeenCalledWith('COMMIT');
    expect(client.release).toHaveBeenCalled();
  });

  it('fails closed when any supported screen topic is missing', async () => {
    const client = {
      query: jest.fn(async (sql: string) => sql.includes('SELECT screen_key,topic')
        ? { rows: completeRows.slice(1) } : { rows: [], rowCount: 0 }),
      release: jest.fn(),
    };
    mockedGetClient.mockResolvedValue(client);
    await expect(screenAssistDoctrineService.publishVersion(
      '1.2.0','22222222-2222-2222-2222-222222222222',
      'Governance owner approved the complete controlled wording.'))
      .rejects.toThrow('Doctrine coverage is incomplete');
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(client.release).toHaveBeenCalled();
  });

  it('rejects a non-semantic version before opening a transaction', async () => {
    await expect(screenAssistDoctrineService.publishVersion(
      'latest','22222222-2222-2222-2222-222222222222',
      'Governance owner approved the complete controlled wording.'))
      .rejects.toThrow('numeric semantic version');
    expect(mockedGetClient).not.toHaveBeenCalled();
  });
});
