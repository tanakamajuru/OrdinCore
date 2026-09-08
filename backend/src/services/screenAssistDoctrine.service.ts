import { getClient, query } from '../config/database';
import { ALLOWED_SCREENS } from './screenAssist.service';

const REQUIRED_TOPICS = ['purpose','role','use','controls','next'];
const PREFIX: Record<string,string> = {
  TEAM_LEADER: 'team_leader.', REGISTERED_MANAGER: 'registered_manager.',
  DIRECTOR: 'director.', RESPONSIBLE_INDIVIDUAL: 'responsible_individual.',
};
const SEMVER = /^\d+\.\d+\.\d+$/;

function validate(version: string, note: string, effectiveFrom?: string) {
  if (!SEMVER.test(version)) throw new Error('A numeric semantic version such as 1.2.0 is required.');
  if (note.trim().length < 20 || note.trim().length > 1000) throw new Error('Approval rationale must contain 20–1000 characters.');
  const effective = effectiveFrom ? new Date(effectiveFrom) : new Date();
  if (Number.isNaN(effective.getTime())) throw new Error('A valid effective date is required.');
  return effective;
}

function expectedCoverage() {
  return Object.entries(ALLOWED_SCREENS).flatMap(([role,screens]) =>
    [...screens].map((screen) => `${PREFIX[role]}${screen}`));
}

export const screenAssistDoctrineService = {
  async listVersions() {
    return (await query(`SELECT source_version,COUNT(*)::int AS guidance_count,
      BOOL_AND(published) AS published,MIN(effective_from) AS effective_from,
      MAX(approved_at) AS approved_at,MAX(retired_at) AS retired_at
      FROM screen_assist_guidance GROUP BY source_version
      ORDER BY string_to_array(source_version,'.')::int[] DESC`)).rows;
  },

  async publishVersion(version: string, actorUserId: string, note: string, effectiveFrom?: string) {
    const effective = validate(version,note,effectiveFrom);
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const rows = (await client.query(
        `SELECT screen_key,topic FROM screen_assist_guidance
          WHERE source_version=$1 AND retired_at IS NULL FOR UPDATE`,[version])).rows;
      if (!rows.length) throw new Error('Draft doctrine version was not found.');
      const present = new Set(rows.map((r:any) => `${r.screen_key}:${r.topic}`));
      const missing = expectedCoverage().flatMap((screen) =>
        REQUIRED_TOPICS.filter((topic) => !present.has(`${screen}:${topic}`)).map((topic) => `${screen}:${topic}`));
      if (missing.length) throw new Error(`Doctrine coverage is incomplete: ${missing.join(', ')}`);
      await client.query(`UPDATE screen_assist_guidance SET published=TRUE,effective_from=$2,
        approved_by=$3,approved_at=NOW(),approval_note=$4,updated_at=NOW()
        WHERE source_version=$1 AND retired_at IS NULL`,[version,effective,actorUserId,note.trim()]);
      await client.query(`INSERT INTO screen_assist_doctrine_events
        (source_version,action,actor_user_id,note,effective_from)
        VALUES ($1,'PUBLISHED',$2,$3,$4)`,[version,actorUserId,note.trim(),effective]);
      await client.query('COMMIT');
      return { source_version: version, published: true, effective_from: effective.toISOString(), guidance_count: rows.length };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  },

  async retireVersion(version: string, actorUserId: string, note: string) {
    validate(version,note);
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const result = await client.query(`UPDATE screen_assist_guidance
        SET published=FALSE,retired_at=NOW(),updated_at=NOW()
        WHERE source_version=$1 AND retired_at IS NULL RETURNING id`,[version]);
      if (!result.rowCount) throw new Error('Active doctrine version was not found.');
      await client.query(`INSERT INTO screen_assist_doctrine_events
        (source_version,action,actor_user_id,note)
        VALUES ($1,'RETIRED',$2,$3)`,[version,actorUserId,note.trim()]);
      await client.query('COMMIT');
      return { source_version: version, retired: true, guidance_count: result.rowCount };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  },
};
