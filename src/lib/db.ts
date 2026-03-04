import sql from 'mssql';

const config: sql.config = {
    server: process.env.DB_SERVER || '192.168.12.101',
    port: parseInt(process.env.DB_PORT || '1443'),
    database: process.env.DB_NAME || 'dms_dev',
    user: process.env.DB_USER || '',
    password: process.env.DB_PASSWORD || '',
    options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true,
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000,
    },
};

let pool: sql.ConnectionPool | null = null;

export async function getDb(): Promise<sql.ConnectionPool> {
    if (!pool) {
        pool = await sql.connect(config);
        console.log(`[DB] Connected to ${config.server}:${config.port}/${config.database}`);
    }
    return pool;
}

export { sql };
