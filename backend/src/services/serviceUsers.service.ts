import { v4 as uuidv4 } from 'uuid';
import { getClient, query } from '../config/database';

export interface TransferServiceUserInput {
  company_id: string;
  service_user_id: string;
  destination_house_id: string;
  reason: string;
  transferred_by: string;
}

export class ServiceUsersService {
  async transfer(input: TransferServiceUserInput) {
    const reason = (input.reason || '').trim();
    if (!input.destination_house_id) throw new Error('Destination service is required.');
    if (reason.length < 5) throw new Error('Please record a clear reason for the transfer.');

    const client = await getClient();
    try {
      await client.query('BEGIN');

      // Lock the person so concurrent requests cannot create two active placements.
      const personResult = await client.query(
        `SELECT su.*, h.company_id, h.name AS current_house_name
           FROM service_users su
           JOIN houses h ON h.id = su.house_id
          WHERE su.id = $1 AND h.company_id = $2
          FOR UPDATE OF su`,
        [input.service_user_id, input.company_id]
      );
      const person = personResult.rows[0];
      if (!person) throw new Error('Service user not found.');
      if (!person.is_active) throw new Error('An inactive service user cannot be transferred.');
      if (String(person.house_id) === String(input.destination_house_id)) {
        throw new Error('The service user is already in the selected service.');
      }

      const destinationResult = await client.query(
        `SELECT id, name FROM houses
          WHERE id = $1 AND company_id = $2 AND status = 'active'`,
        [input.destination_house_id, input.company_id]
      );
      const destination = destinationResult.rows[0];
      if (!destination) throw new Error('Destination service was not found or is not active.');

      const movedAtResult = await client.query('SELECT NOW() AS moved_at');
      const movedAt = movedAtResult.rows[0].moved_at;

      // Close the old placement. The fallback supports databases upgraded from builds
      // where the resident existed before placement history was introduced.
      const closed = await client.query(
        `UPDATE service_user_placements
            SET ended_at = $1, ended_by = $2, transfer_reason = $3
          WHERE service_user_id = $4 AND company_id = $5 AND ended_at IS NULL
          RETURNING id`,
        [movedAt, input.transferred_by, reason, input.service_user_id, input.company_id]
      );
      if (closed.rowCount === 0) {
        await client.query(
          `INSERT INTO service_user_placements
             (company_id, service_user_id, house_id, started_at, ended_at, transfer_reason, ended_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [input.company_id, input.service_user_id, person.house_id, person.created_at || movedAt, movedAt, reason, input.transferred_by]
        );
      }

      await client.query(
        `INSERT INTO service_user_placements
           (company_id, service_user_id, house_id, started_at, created_by)
         VALUES ($1,$2,$3,$4,$5)`,
        [input.company_id, input.service_user_id, input.destination_house_id, movedAt, input.transferred_by]
      );

      // Only the current-placement pointer changes. Historical governance rows keep
      // their original house_id and stable service_user_id.
      const updatedResult = await client.query(
        `UPDATE service_users
            SET house_id = $1, updated_at = NOW()
          WHERE id = $2
          RETURNING id, first_name, last_name, display_name, house_id, is_active, vulnerability`,
        [input.destination_house_id, input.service_user_id]
      );

      const continuityResult = await client.query(
        `SELECT
           (SELECT COUNT(*)::int FROM governance_pulses WHERE service_user_id = $1) AS signals,
           (SELECT COUNT(*)::int FROM risks WHERE service_user_id = $1) AS risks,
           (SELECT COUNT(*)::int FROM risk_actions WHERE service_user_id = $1) AS actions,
           (SELECT COUNT(*)::int FROM escalations WHERE service_user_id = $1) AS escalations,
           (SELECT COUNT(*)::int FROM interventions WHERE service_user_id = $1) AS interventions`,
        [input.service_user_id]
      );

      await client.query(
        `INSERT INTO audit_logs
           (id, company_id, user_id, action, resource, resource_id, old_values, new_values)
         VALUES ($1,$2,$3,'SERVICE_USER_TRANSFER','service_user',$4,$5,$6)`,
        [
          uuidv4(), input.company_id, input.transferred_by, input.service_user_id,
          JSON.stringify({ house_id: person.house_id, house_name: person.current_house_name }),
          JSON.stringify({ house_id: destination.id, house_name: destination.name, moved_at: movedAt, reason }),
        ]
      );

      await client.query('COMMIT');
      return {
        ...updatedResult.rows[0],
        house_name: destination.name,
        previous_house_id: person.house_id,
        previous_house_name: person.current_house_name,
        transferred_at: movedAt,
        continuity: continuityResult.rows[0],
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async placementHistory(company_id: string, service_user_id: string) {
    const result = await query(
      `SELECT sup.id, sup.house_id, h.name AS house_name, sup.started_at, sup.ended_at,
              sup.transfer_reason, sup.created_by, sup.ended_by
         FROM service_user_placements sup
         JOIN houses h ON h.id = sup.house_id
        WHERE sup.company_id = $1 AND sup.service_user_id = $2
        ORDER BY sup.started_at DESC`,
      [company_id, service_user_id]
    );
    return result.rows;
  }
}

export const serviceUsersService = new ServiceUsersService();

