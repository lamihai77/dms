import sql from 'mssql';

function requireEnv(name: string, fallback?: string): string {
    const value = process.env[name] ?? fallback;
    if (!value || value.trim() === '') {
        throw new Error(`[DB] Missing required environment variable: ${name}`);
    }
    return value;
}

const dbPort = parseInt(process.env.DB_PORT || '1433', 10);
if (!Number.isFinite(dbPort) || dbPort <= 0 || dbPort > 65535) {
    throw new Error('[DB] Invalid DB_PORT. Expected integer in range 1..65535');
}

function parseBooleanEnv(name: string, fallback: boolean): boolean {
    const raw = process.env[name];
    if (!raw || raw.trim() === '') return fallback;
    const normalized = raw.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
    throw new Error(`[DB] Invalid ${name}. Expected true/false`);
}

const isProduction = process.env.NODE_ENV === 'production';
const dbEncrypt = parseBooleanEnv('DB_ENCRYPT', isProduction);
const dbTrustCert = parseBooleanEnv('DB_TRUST_CERT', !isProduction);

const config: sql.config = {
    server: requireEnv('DB_SERVER', 'localhost'),
    port: dbPort,
    database: requireEnv('DB_NAME', 'dms_dev'),
    user: requireEnv('DB_USER'),
    password: requireEnv('DB_PASSWORD'),
    options: {
        encrypt: dbEncrypt,
        trustServerCertificate: dbTrustCert,
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
