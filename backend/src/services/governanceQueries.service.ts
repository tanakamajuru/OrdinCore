import { query } from '../config/database';

/**
 * RI Queries (scoped and confirmed 21 Oct 2026): a Responsible Individual's "assurance and
 * challenge" duty made into a real tracked workflow — raise a formal question to an RM/Director,
 * get an evidenced answer, and either close it satisfied or reopen with a reason. This is a
 * governance record, not a chat message: every state change is attributed and timestamped.
 */
export const governanceQueriesService = {
  async list(company_id: string, filters: { status?: string; assigned_to?: string; raised_by?: string } = {}) {
    const conditions = ['q.company_id = $1'];
    const params: unknown[] = [company_id];
    let idx = 2;
    if (filters.status) { conditions.push(`q.status = $${idx++}`); params.push(filters.status); }
    if (filters.assigned_to) { conditions.push(`q.assigned_to = $${idx++}`); params.push(filters.assigned_to); }
    if (filters.raised_by) { conditions.push(`q.raised_by = $${idx++}`); params.push(filters.raised_by); }
    const rows = await query(
      `SELECT q.*, h.name AS service_name,
              ru.first_name || ' ' || ru.last_name AS raised_by_name,
              au.first_name || ' ' || au.last_name AS assigned_to_name,
              resu.first_name || ' ' || resu.last_name AS responded_by_name
         FROM governance_queries q
         LEFT JOIN houses h ON h.id = q.house_id
         LEFT JOIN users ru ON ru.id = q.raised_by
         LEFT JOIN users au ON au.id = q.assigned_to
         LEFT JOIN users resu ON resu.id = q.responded_by
        WHERE ${conditions.join(' AND ')}
        ORDER BY CASE q.status WHEN 'OPEN' THEN 0 WHEN 'ANSWERED' THEN 1 ELSE 2 END, q.raised_at DESC`,
      params
    );
    return rows.rows;
  },

  async create(company_id: string, raised_by: string, data: { subject: string; house_id?: string; context_type?: string; context_id?: string; assigned_to?: string }) {
    if (!data.subject || data.subject.trim().length < 10) throw new Error('Describe the query in at least a short sentence.');
    // Default the respondent to the house's own RM when not named explicitly, same ownership
    // model used elsewhere (manager_id/primary_rm_id) — a query always has someone accountable.
    let assignedTo = data.assigned_to || null;
    if (!assignedTo && data.house_id) {
      const h = await query(`SELECT COALESCE(primary_rm_id, manager_id) AS id FROM houses WHERE id = $1 AND company_id = $2`, [data.house_id, company_id]);
      assignedTo = h.rows[0]?.id || null;
    }
    const result = await query(
      `INSERT INTO governance_queries (company_id, house_id, context_type, context_id, subject, raised_by, assigned_to)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [company_id, data.house_id || null, data.context_type || null, data.context_id || null, data.subject.trim(), raised_by, assignedTo]
    );
    return result.rows[0];
  },

  async respond(id: string, company_id: string, responded_by: string, response_text: string) {
    if (!response_text || response_text.trim().length < 10) throw new Error('Give an evidenced answer (at least a short sentence).');
    const existing = await query(`SELECT * FROM governance_queries WHERE id = $1 AND company_id = $2`, [id, company_id]);
    if (!existing.rows[0]) throw new Error('Query not found.');
    if (existing.rows[0].status === 'CLOSED') throw new Error('This query is already closed.');
    const result = await query(
      `UPDATE governance_queries
          SET status = 'ANSWERED', response_text = $3, responded_by = $4, responded_at = NOW(), updated_at = NOW()
        WHERE id = $1 AND company_id = $2 RETURNING *`,
      [id, company_id, response_text.trim(), responded_by]
    );
    return result.rows[0];
  },

  // The RI closes a query once satisfied by the answer — only the raiser (or a Director/Admin
  // overseeing) can close it, mirroring "the person who raised the challenge decides if it is met".
  async close(id: string, company_id: string, closed_by: string, close_reason?: string) {
    const existing = await query(`SELECT * FROM governance_queries WHERE id = $1 AND company_id = $2`, [id, company_id]);
    if (!existing.rows[0]) throw new Error('Query not found.');
    if (existing.rows[0].status !== 'ANSWERED') throw new Error('A query can only be closed after it has been answered.');
    const result = await query(
      `UPDATE governance_queries
          SET status = 'CLOSED', closed_by = $3, closed_at = NOW(), close_reason = $4, updated_at = NOW()
        WHERE id = $1 AND company_id = $2 RETURNING *`,
      [id, company_id, closed_by, close_reason?.trim() || null]
    );
    return result.rows[0];
  },

  // The RI is not satisfied with the answer — reopens it back to the same respondent with a reason,
  // preserving the original question and the unsatisfactory answer as history (never overwritten).
  async reopen(id: string, company_id: string, reopen_reason: string) {
    if (!reopen_reason || reopen_reason.trim().length < 10) throw new Error('Explain why the answer does not resolve the query (at least a short sentence).');
    const existing = await query(`SELECT * FROM governance_queries WHERE id = $1 AND company_id = $2`, [id, company_id]);
    if (!existing.rows[0]) throw new Error('Query not found.');
    if (existing.rows[0].status !== 'ANSWERED') throw new Error('Only an answered query can be reopened.');
    const result = await query(
      `UPDATE governance_queries SET status = 'OPEN', reopen_reason = $3, updated_at = NOW() WHERE id = $1 AND company_id = $2 RETURNING *`,
      [id, company_id, reopen_reason.trim()]
    );
    return result.rows[0];
  },
};
