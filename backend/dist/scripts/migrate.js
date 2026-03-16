"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const database_1 = require("../config/database");
const logger_1 = __importDefault(require("../utils/logger"));
async function runMigrations() {
    const client = await database_1.pool.connect();
    try {
        // Create migrations tracking table
        await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
        const migrationsDir = path.join(__dirname, '..', '..', 'migrations');
        const files = fs.readdirSync(migrationsDir)
            .filter(f => f.endsWith('.sql'))
            .sort();
        for (const file of files) {
            const isExecuted = await client.query('SELECT id FROM _migrations WHERE filename = $1', [file]);
            if (isExecuted.rows.length > 0) {
                logger_1.default.info(`Migration already executed: ${file}`);
                continue;
            }
            const filepath = path.join(migrationsDir, file);
            const sql = fs.readFileSync(filepath, 'utf-8');
            await client.query('BEGIN');
            try {
                await client.query(sql);
                await client.query('INSERT INTO _migrations (filename) VALUES ($1)', [file]);
                await client.query('COMMIT');
                logger_1.default.info(`✅ Migration executed: ${file}`);
            }
            catch (err) {
                await client.query('ROLLBACK');
                logger_1.default.error(`❌ Migration failed: ${file} | Error: ${err.message}`, err);
                throw err;
            }
        }
        logger_1.default.info('All migrations completed!');
    }
    finally {
        client.release();
        await database_1.pool.end();
    }
}
runMigrations().catch((err) => {
    logger_1.default.error('Migration runner failed', err);
    process.exit(1);
});
//# sourceMappingURL=migrate.js.map