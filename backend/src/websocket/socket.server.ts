import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { query } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';

let io: Server;

export function initSocketServer(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST'],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      if (!token) return next(new Error('Authentication required'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as {
        user_id: string; company_id: string | null; role: string;
      };

      socket.data.user = decoded;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const user = socket.data.user;
    logger.info(`Socket connected: ${socket.id} (user: ${user.user_id})`);

    // Join personal room and company room
    await socket.join(`user:${user.user_id}`);
    if (user.company_id) {
      await socket.join(`company:${user.company_id}`);
    }

    // Persist session
    const sessionId = uuidv4();
    try {
      await query(
        `INSERT INTO websocket_sessions (id, user_id, company_id, socket_id) VALUES ($1,$2,$3,$4)`,
        [sessionId, user.user_id, user.company_id, socket.id]
      );
    } catch (err) {
      logger.error('Failed to persist websocket session', err);
    }

    socket.on('join_house', (house_id: string) => {
      socket.join(`house:${house_id}`);
    });

    socket.on('leave_house', (house_id: string) => {
      socket.leave(`house:${house_id}`);
    });

    socket.on('disconnect', async () => {
      logger.info(`Socket disconnected: ${socket.id}`);
      try {
        await query(
          `UPDATE websocket_sessions SET is_active = false, disconnected_at = NOW() WHERE socket_id = $1`,
          [socket.id]
        );
      } catch (err) {
        logger.error('Failed to update websocket session on disconnect', err);
      }
    });

    // Acknowledge connection
    socket.emit('connected', { user_id: user.user_id, socket_id: socket.id });
  });

  logger.info('Socket.IO server initialized');
  return io;
}

export function getIO(): Server {
  if (!io) throw new Error('Socket.IO server not initialized');
  return io;
}

// Helper to push events to company room
export function emitToCompany(company_id: string, event: string, data: unknown) {
  if (io) {
    io.to(`company:${company_id}`).emit(event, data);
  }
}

export function emitToUser(user_id: string, event: string, data: unknown) {
  if (io) {
    io.to(`user:${user_id}`).emit(event, data);
  }
}

export default { initSocketServer, getIO, emitToCompany, emitToUser };
