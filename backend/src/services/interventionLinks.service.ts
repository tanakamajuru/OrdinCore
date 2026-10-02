import { query, getClient } from '../config/database';

/**
 * Explicit, de-duplicated, audited links between an intervention (the leadership plan) and the
 * existing delivery actions that carry it out (brief 2 §1). Coverage and effectiveness are always
 * derived from the canonical action state of the LINKED actions — never a separately maintained copy.
 */
export class InterventionLinksService {
  private async assertIntervention(company_id: string, intervention_id: string) {
    const r = await query('SELECT id FROM interventions WHERE id = $1 AND company_id = $2', [intervention_id, company_id]);
    if (!r.rows[0]) throw new Error('Intervention not found');
  }

  // Link one or more EXISTING actions to the intervention. Only actions in the same tenant are
  // accepted; links are deduplicated by action ID (an already-active link is left as-is, not doubled).
  async linkActions(company_id: string, user_id: string, intervention_id: string, action_ids: string[]) {
    await this.assertIntervention(company_id, intervention_id);
    const ids = Array.from(new Set((action_ids || []).filter(Boolean)));
    if (!ids.length) throw new Error('Select at least one existing action to link.');

    const valid = await query(
      `SELECT id FROM risk_actions WHERE company_id = $1 AND id = ANY($2::uuid[])`,
      [company_id, ids]
    );
    const validIds = valid.rows.map((r: any) => r.id);
    if (!validIds.length) throw new Error('None of the selected actions belong to this organisation.');

    const client = await getClient();
    try {
      await client.query('BEGIN');
      for (const action_id of validIds) {
        await client.query(
          `INSERT INTO intervention_action_links (company_id, intervention_id, action_id, created_by)
           VALUES ($1,$2,$3,$4)
           ON CONFLICT (intervention_id, action_id) WHERE removed_at IS NULL DO NOTHING`,
          [company_id, intervention_id, action_id, user_id]
        );
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw e;
    } finally {
      client.release();
    }
    return this.listLinkedActions(company_id, intervention_id);
  }

  // Unlink is a soft remove so the audit history of link changes is preserved.
  async unlinkAction(company_id: string, user_id: string, intervention_id: string, action_id: string) {
    await this.assertIntervention(company_id, intervention_id);
    await query(
      `UPDATE intervention_action_links SET removed_at = NOW(), removed_by = $4
        WHERE company_id = $1 AND intervention_id = $2 AND action_id = $3 AND removed_at IS NULL`,
      [company_id, intervention_id, action_id, user_id]
    );
    return this.listLinkedActions(company_id, intervention_id);
  }

  // Active linked actions with their canonical delivery evidence (owner, due, completion,
  // verification, latest applicable effectiveness) — the same lifecycle used elsewhere.
  async listLinkedActions(company_id: string, intervention_id: string) {
    await this.assertIntervention(company_id, intervention_id);
    return (await query(
      `SELECT l.action_id,
              ra.title, ra.status::text AS status, ra.due_date,
              ra.is_completed, ra.completed_at,
              COALESCE(ra.effectiveness_outcome, ra.effectiveness::text) AS effectiveness,
              ra.review_requirement,
              NULLIF(TRIM(COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'')),'') AS owner,
              l.created_at AS linked_at,
              NULLIF(TRIM(COALESCE(cu.first_name,'') || ' ' || COALESCE(cu.last_name,'')),'') AS linked_by
         FROM intervention_action_links l
         JOIN canonical_action_state_v ra ON ra.id = l.action_id AND ra.company_id = l.company_id
         LEFT JOIN users u ON u.id = ra.assigned_to AND u.company_id = l.company_id
         LEFT JOIN users cu ON cu.id = l.created_by
        WHERE l.company_id = $1 AND l.intervention_id = $2 AND l.removed_at IS NULL
        ORDER BY l.created_at`,
      [company_id, intervention_id]
    )).rows;
  }

  // Audit trail of link changes (added and removed), for the intervention history view.
  async linkHistory(company_id: string, intervention_id: string) {
    return (await query(
      `SELECT l.action_id, ra.title, l.created_at, l.removed_at,
              NULLIF(TRIM(COALESCE(cu.first_name,'') || ' ' || COALESCE(cu.last_name,'')),'') AS linked_by,
              NULLIF(TRIM(COALESCE(ru.first_name,'') || ' ' || COALESCE(ru.last_name,'')),'') AS removed_by
         FROM intervention_action_links l
         LEFT JOIN risk_actions ra ON ra.id = l.action_id
         LEFT JOIN users cu ON cu.id = l.created_by
         LEFT JOIN users ru ON ru.id = l.removed_by
        WHERE l.company_id = $1 AND l.intervention_id = $2
        ORDER BY l.created_at DESC`,
      [company_id, intervention_id]
    )).rows;
  }
}

export const interventionLinksService = new InterventionLinksService();
