import { query } from '../config/database';

export type HelpMedia = { type: 'image' | 'video'; url: string; caption?: string };

export interface HelpArticleInput {
  title: string;
  body?: string | null;
  target_roles?: string[];
  media?: HelpMedia[];
  published?: boolean;
}

const VALID_ROLES = ['SUPER_ADMIN', 'ADMIN', 'DIRECTOR', 'RESPONSIBLE_INDIVIDUAL', 'REGISTERED_MANAGER', 'TEAM_LEADER', 'SUPPORT_WORKER'];

function cleanRoles(roles?: string[]): string[] {
  if (!Array.isArray(roles)) return [];
  return [...new Set(roles.map((r) => String(r).toUpperCase().replace(/-/g, '_')).filter((r) => VALID_ROLES.includes(r)))];
}

function cleanMedia(media?: HelpMedia[]): HelpMedia[] {
  if (!Array.isArray(media)) return [];
  return media
    .filter((m) => m && typeof m.url === 'string' && m.url.trim())
    .map((m) => ({
      type: m.type === 'video' ? 'video' : 'image',
      url: String(m.url).trim(),
      caption: m.caption ? String(m.caption).trim().slice(0, 300) : undefined,
    }));
}

export const helpService = {
  // Admin: every article for the company, newest first.
  async listAll(company_id: string) {
    return (await query(
      `SELECT h.*, (u.first_name || ' ' || u.last_name) AS created_by_name
         FROM help_articles h
         LEFT JOIN users u ON u.id = h.created_by
        WHERE h.company_id = $1
        ORDER BY h.updated_at DESC`,
      [company_id]
    )).rows;
  },

  // Reader: published articles targeted at this role (or at everyone — empty target_roles).
  async listForRole(company_id: string, role: string) {
    const r = String(role || '').toUpperCase().replace(/-/g, '_');
    return (await query(
      `SELECT h.id, h.title, h.body, h.media, h.target_roles, h.updated_at,
              (u.first_name || ' ' || u.last_name) AS created_by_name
         FROM help_articles h
         LEFT JOIN users u ON u.id = h.created_by
        WHERE h.company_id = $1 AND h.published = TRUE
          AND (cardinality(h.target_roles) = 0 OR $2 = ANY(h.target_roles))
        ORDER BY h.updated_at DESC`,
      [company_id, r]
    )).rows;
  },

  async create(company_id: string, user_id: string, input: HelpArticleInput) {
    if (!input.title || !String(input.title).trim()) throw new Error('A heading is required.');
    return (await query(
      `INSERT INTO help_articles (company_id, title, body, target_roles, media, published, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [
        company_id,
        String(input.title).trim().slice(0, 255),
        input.body ? String(input.body) : null,
        cleanRoles(input.target_roles),
        JSON.stringify(cleanMedia(input.media)),
        input.published !== false,
        user_id,
      ]
    )).rows[0];
  },

  async update(company_id: string, id: string, input: HelpArticleInput) {
    if (!input.title || !String(input.title).trim()) throw new Error('A heading is required.');
    const res = await query(
      `UPDATE help_articles
          SET title = $3, body = $4, target_roles = $5, media = $6, published = $7, updated_at = NOW()
        WHERE id = $1 AND company_id = $2 RETURNING *`,
      [
        id,
        company_id,
        String(input.title).trim().slice(0, 255),
        input.body ? String(input.body) : null,
        cleanRoles(input.target_roles),
        JSON.stringify(cleanMedia(input.media)),
        input.published !== false,
      ]
    );
    if (res.rows.length === 0) throw new Error('Help article not found.');
    return res.rows[0];
  },

  async remove(company_id: string, id: string) {
    await query(`DELETE FROM help_articles WHERE id = $1 AND company_id = $2`, [id, company_id]);
    return { id };
  },
};
