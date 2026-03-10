const sql = require('mssql');

const config = {
    server: 'ssi-prod-sqldb.intern.anre',
    port: 1433,
    database: 'dms_prod',
    user: 'dms_readonly',
    password: 'dmsRead2026',
    options: {
        encrypt: false,
        trustServerCertificate: true,
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
