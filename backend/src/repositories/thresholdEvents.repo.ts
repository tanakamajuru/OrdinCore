import { query } from '../config/database';

export const thresholdEventsRepo = {
  async create(event: { 
    company_id: string; 
    house_id?: string; 
    pulse_id?: string; 
    cluster_id?: string; 
    rule_number: number; 
    rule_name: string; 
    output_type: string; 
    description?: string; 
    status?: string 
  }) {
    const res = await query(
      `INSERT INTO threshold_events 
        (company_id, house_id, pulse_id, cluster_id, rule_number, rule_name, output_type, description, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        event.company_id,
        event.house_id || null,
        event.pulse_id || null,
        event.cluster_id || null,
        event.rule_number,
        event.rule_name,
        event.output_type,
        event.description || null,
        event.status || 'Pending'
      ]
    );
    return res.rows[0];
  },
  async findAll(company_id: string, filters: { output_type?: string; house_id?: string }) {
    let sql = `SELECT * FROM threshold_events WHERE company_id = $1`;
    const params: any[] = [company_id];
    
    if (filters.output_type) {
      params.push(filters.output_type);
      sql += ` AND output_type = $${params.length}`;
    }
    
    if (filters.house_id) {
      params.push(filters.house_id);
      sql += ` AND house_id = $${params.length}`;
    }
    
    sql += ` ORDER BY created_at DESC`;
    
    const res = await query(sql, params);
    return res.rows;
  }
};
