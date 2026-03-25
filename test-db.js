const sql = require('mssql');

function requireEnv(name, fallback) {
    const value = process.env[name] ?? fallback;
    if (!value || String(value).trim() === '') {
        throw new Error(`Missing env var: ${name}`);
    }
    return String(value);
}

function parseBooleanEnv(name, fallback) {
    const raw = process.env[name];
    if (!raw || String(raw).trim() === '') return fallback;
    const normalized = String(raw).trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
    return fallback;
}

const isProd = process.env.NODE_ENV === 'production';

const config = {
    server: requireEnv('DB_SERVER', 'localhost'),
    port: Number.parseInt(process.env.DB_PORT || '1433', 10),
    database: requireEnv('DB_NAME', 'dms_dev'),
    user: requireEnv('DB_USER'),
    password: requireEnv('DB_PASSWORD'),
    options: {
        encrypt: parseBooleanEnv('DB_ENCRYPT', isProd),
        trustServerCertificate: parseBooleanEnv('DB_TRUST_CERT', !isProd),
        enableArithAbort: true,
    },
};

async function test() {
    try {
        console.log('Connecting to', config.server, config.database);
        const pool = await sql.connect(config);
        const result = await pool.request().query(`
      SELECT TOP 5
        U.ID,
        U.NUME,
        U.USERNAME,
        U.EMAIL,
        U.adrese_mail_alternative,
        U.ticket_emails
      FROM DMS.UTILIZATORI U
    `);
        console.log('Success:', result.recordset);
    } catch (err) {
        console.error('SQL Error:', err.message);
    } finally {
        process.exit();
    }
}
test();
