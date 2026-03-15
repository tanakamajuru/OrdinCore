import { query } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis';
import { getIO } from '../websocket/socket.server';

const notificationQueue = new Queue('notification_dispatch', { connection: redisConnection });

export class NotificationsService {
  async create(data: { company_id: string; user_id: string; type: string; title: string; body: string; link?: string; metadata?: Record<string, unknown> }) {
    const id = uuidv4();
    const result = await query(
      `INSERT INTO notifications (id, company_id, user_id, type, title, body, link, data)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [id, data.company_id, data.user_id, data.type, data.title, data.body, data.link || null, JSON.stringify(data.metadata || {})]
    );

    const notification = result.rows[0];

    // Push real-time update via socket.io
    try {
      const io = getIO();
      io.to(`user:${data.user_id}`).emit('notification', notification);
    } catch {
      // Socket.io might not be initialized in test context
    }

    // Queue for external dispatch (email/sms)
    await notificationQueue.add('dispatch', { notification_id: id, ...data });

    return notification;
  }

  async findAll(user_id: string, company_id: string, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const [notifications, countResult, unread] = await Promise.all([
      query(
        `SELECT * FROM notifications WHERE user_id = $1 AND company_id = $2
         ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
        [user_id, company_id]
      ),
      query('SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND company_id = $2', [user_id, company_id]),
      query('SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND company_id = $2 AND read = false', [user_id, company_id]),
    ]);

    return {
      notifications: notifications.rows,
      total: parseInt(countResult.rows[0].count),
      unread_count: parseInt(unread.rows[0].count),
      page, limit,
    };
  }

  async markRead(id: string, user_id: string) {
    await query(
      `UPDATE notifications SET read = true, read_at = NOW() WHERE id = $1 AND user_id = $2`,
      [id, user_id]
    );
  }

  async markAllRead(user_id: string, company_id: string) {
    const result = await query(
      `UPDATE notifications SET read = true, read_at = NOW() WHERE user_id = $1 AND company_id = $2 AND read = false`,
      [user_id, company_id]
    );
    return { updated: result.rowCount };
  }

  async getPreferences(user_id: string) {
    const result = await query('SELECT * FROM notification_preferences WHERE user_id = $1', [user_id]);
    return result.rows[0] || null;
  }

  async updatePreferences(user_id: string, company_id: string, prefs: object) {
    await query(
      `INSERT INTO notification_preferences (user_id, company_id, email_enabled, in_app_enabled, sms_enabled, risk_alerts, incident_alerts, governance_reminders, escalation_alerts)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (user_id) DO UPDATE SET
         email_enabled = EXCLUDED.email_enabled,
         in_app_enabled = EXCLUDED.in_app_enabled,
         sms_enabled = EXCLUDED.sms_enabled,
         risk_alerts = EXCLUDED.risk_alerts,
         incident_alerts = EXCLUDED.incident_alerts,
         governance_reminders = EXCLUDED.governance_reminders,
         escalation_alerts = EXCLUDED.escalation_alerts,
         updated_at = NOW()`,
      [user_id, company_id, ...Object.values(prefs)]
    );
  }
}

export const notificationsService = new NotificationsService();
