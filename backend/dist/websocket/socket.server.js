"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSocketServer = initSocketServer;
exports.getIO = getIO;
exports.emitToCompany = emitToCompany;
exports.emitToUser = emitToUser;
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = require("../config/database");
const uuid_1 = require("uuid");
const logger_1 = __importDefault(require("../utils/logger"));
let io;
function initSocketServer(httpServer) {
    io = new socket_io_1.Server(httpServer, {
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
            if (!token)
                return next(new Error('Authentication required'));
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'fallback-secret');
            socket.data.user = decoded;
            next();
        }
        catch {
            next(new Error('Invalid token'));
        }
    });
    io.on('connection', async (socket) => {
        const user = socket.data.user;
        logger_1.default.info(`Socket connected: ${socket.id} (user: ${user.user_id})`);
        // Join personal room and company room
        await socket.join(`user:${user.user_id}`);
        if (user.company_id) {
            await socket.join(`company:${user.company_id}`);
        }
        // Persist session
        const sessionId = (0, uuid_1.v4)();
        try {
            await (0, database_1.query)(`INSERT INTO websocket_sessions (id, user_id, company_id, socket_id) VALUES ($1,$2,$3,$4)`, [sessionId, user.user_id, user.company_id, socket.id]);
        }
        catch (err) {
            logger_1.default.error('Failed to persist websocket session', err);
        }
        socket.on('join_house', (house_id) => {
            socket.join(`house:${house_id}`);
        });
        socket.on('leave_house', (house_id) => {
            socket.leave(`house:${house_id}`);
        });
        socket.on('disconnect', async () => {
            logger_1.default.info(`Socket disconnected: ${socket.id}`);
            try {
                await (0, database_1.query)(`UPDATE websocket_sessions SET is_active = false, disconnected_at = NOW() WHERE socket_id = $1`, [socket.id]);
            }
            catch (err) {
                logger_1.default.error('Failed to update websocket session on disconnect', err);
            }
        });
        // Acknowledge connection
        socket.emit('connected', { user_id: user.user_id, socket_id: socket.id });
    });
    logger_1.default.info('Socket.IO server initialized');
    return io;
}
function getIO() {
    if (!io)
        throw new Error('Socket.IO server not initialized');
    return io;
}
// Helper to push events to company room
function emitToCompany(company_id, event, data) {
    if (io) {
        io.to(`company:${company_id}`).emit(event, data);
    }
}
function emitToUser(user_id, event, data) {
    if (io) {
        io.to(`user:${user_id}`).emit(event, data);
    }
}
exports.default = { initSocketServer, getIO, emitToCompany, emitToUser };
//# sourceMappingURL=socket.server.js.map