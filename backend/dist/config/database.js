"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getClient = exports.query = exports.getPool = void 0;
const pg_1 = require("pg");
let poolInstance = null;
const getPool = () => {
    if (!poolInstance) {
        const isProd = process.env.NODE_ENV === 'production';
        const config = {
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '5432'),
            database: process.env.DB_NAME || (isProd ? 'ordincore' : 'caresignal'),
            user: process.env.DB_USER || (isProd ? 'ordinuser' : 'postgres'),
            password: process.env.DB_PASSWORD || (isProd ? 'Highway@1520' : 'postgres'),
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        };
        poolInstance = new pg_1.Pool(config);
        poolInstance.on('connect', () => {
            console.log('📦 Connected to PostgreSQL database');
        });
        poolInstance.on('error', (err) => {
            console.error('Unexpected error on idle client', err);
            process.exit(-1);
        });
    }
    return poolInstance;
};
exports.getPool = getPool;
const query = (text, params) => {
    return (0, exports.getPool)().query(text, params);
};
exports.query = query;
const getClient = () => {
    return (0, exports.getPool)().connect();
};
exports.getClient = getClient;
exports.default = exports.getPool;
//# sourceMappingURL=database.js.map