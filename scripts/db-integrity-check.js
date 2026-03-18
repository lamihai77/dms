/* eslint-disable no-console */
const sql = require('mssql');

function parseBooleanEnv(name, fallback) {
  const raw = process.env[name];
  if (!raw || String(raw).trim() === '') return fallback;
  const normalized = String(raw).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  throw new Error(`Invalid ${name}. Use true/false`);
}

function requireEnv(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (!value || String(value).trim() === '') {
    throw new Error(`Missing env var: ${name}`);
  }
  return String(value);
}

function toInt(value, fallback) {
  const n = Number(value ?? fallback);
  if (!Number.isInteger(n)) return fallback;
  return n;
}

async function run() {
  const dbPort = toInt(process.env.DB_PORT, 1433);
  const isProd = process.env.NODE_ENV === 'production';
  const strict = parseBooleanEnv('DB_CHECK_STRICT', true);

  const config = {
    server: requireEnv('DB_SERVER', 'localhost'),
    port: dbPort,
    database: requireEnv('DB_NAME', 'dms_dev'),
    user: requireEnv('DB_USER'),
    password: requireEnv('DB_PASSWORD'),
    options: {
      encrypt: parseBooleanEnv('DB_ENCRYPT', isProd),
      trustServerCertificate: parseBooleanEnv('DB_TRUST_CERT', !isProd),
      enableArithAbort: true,
    },
  };

  const checks = [
    {
      name: 'Users with invalid ACTIV (not 0/1)',
      severity: 'critical',
      query: `
        SELECT COUNT(*) AS CNT
        FROM DMS.UTILIZATORI
        WHERE ACTIV IS NULL OR ACTIV NOT IN (0, 1)
      `,
    },
    {
      name: 'Users with invalid LOCKED (not 0/1)',
      severity: 'critical',
      query: `
        SELECT COUNT(*) AS CNT
        FROM DMS.UTILIZATORI
        WHERE LOCKED IS NULL OR LOCKED NOT IN (0, 1)
      `,
    },
    {
      name: 'Users with missing mandatory identity fields',
      severity: 'critical',
      query: `
        SELECT COUNT(*) AS CNT
        FROM DMS.UTILIZATORI
        WHERE ISNULL(LTRIM(RTRIM(NUME)), '') = ''
           OR ISNULL(LTRIM(RTRIM(PRENUME)), '') = ''
           OR ISNULL(LTRIM(RTRIM(USERNAME)), '') = ''
      `,
    },
    {
      name: 'Users referencing missing TERT (orphan ID_TERT)',
      severity: 'critical',
      query: `
        SELECT COUNT(*) AS CNT
        FROM DMS.UTILIZATORI U
        LEFT JOIN DMS.TERT T ON U.ID_TERT = T.ID
        WHERE U.ID_TERT IS NOT NULL AND T.ID IS NULL
      `,
    },
    {
      name: 'Duplicate active TERT records by COD_CUI',
      severity: 'warning',
      query: `
        SELECT COUNT(*) AS CNT
        FROM (
          SELECT COD_CUI
          FROM DMS.TERT
          WHERE ISNULL(LTRIM(RTRIM(COD_CUI)), '') <> ''
            AND ISNULL(BLOCAT, 0) = 0
          GROUP BY COD_CUI
          HAVING COUNT(*) > 1
        ) X
      `,
    },
    {
      name: 'Users with password value but missing PASS_SET_DATE',
      severity: 'warning',
      query: `
        SELECT COUNT(*) AS CNT
        FROM DMS.UTILIZATORI
        WHERE PASS_SET_DATE IS NULL
          AND (
            ISNULL(LTRIM(RTRIM(CONVERT(VARCHAR(MAX), PAROLA))), '') <> ''
            OR ISNULL(LTRIM(RTRIM(CONVERT(VARCHAR(MAX), parola_c))), '') <> ''
          )
      `,
    },
  ];

  let pool;
  let criticalFailures = 0;
  let warningCount = 0;
  try {
    console.log('[DB-CHECK] Connecting to DB...');
    pool = await sql.connect(config);

    for (const check of checks) {
      const res = await pool.request().query(check.query);
      const count = Number(res.recordset?.[0]?.CNT || 0);
      const label = check.severity === 'critical' ? 'CRITICAL' : 'WARN';
      console.log(`[${label}] ${check.name}: ${count}`);

      if (check.severity === 'critical' && count > 0) criticalFailures += 1;
      if (check.severity === 'warning' && count > 0) warningCount += 1;
    }

    if (criticalFailures > 0) {
      console.error(`[DB-CHECK] FAILED: ${criticalFailures} critical checks with violations.`);
      process.exitCode = 2;
      return;
    }

    if (strict && warningCount > 0) {
      console.error(`[DB-CHECK] FAILED (strict): ${warningCount} warning checks with violations.`);
      process.exitCode = 3;
      return;
    }

    console.log('[DB-CHECK] PASSED.');
    process.exitCode = 0;
  } catch (err) {
    console.error('[DB-CHECK] ERROR:', err?.message || err);
    process.exitCode = 1;
  } finally {
    if (pool) {
      try {
        await pool.close();
      } catch {
        // ignore
      }
    }
  }
}

run();
