import { Pool } from 'pg';
export declare const getPool: () => Pool;
export declare const query: (text: string, params?: unknown[]) => Promise<import("pg").QueryResult<any>>;
export declare const getClient: () => Promise<import("pg").PoolClient>;
export default getPool;
//# sourceMappingURL=database.d.ts.map