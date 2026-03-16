import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
export declare function initSocketServer(httpServer: HttpServer): Server;
export declare function getIO(): Server;
export declare function emitToCompany(company_id: string, event: string, data: unknown): void;
export declare function emitToUser(user_id: string, event: string, data: unknown): void;
declare const _default: {
    initSocketServer: typeof initSocketServer;
    getIO: typeof getIO;
    emitToCompany: typeof emitToCompany;
    emitToUser: typeof emitToUser;
};
export default _default;
//# sourceMappingURL=socket.server.d.ts.map