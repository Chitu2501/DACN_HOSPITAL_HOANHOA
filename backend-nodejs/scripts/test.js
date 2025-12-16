const { poolPromise } = require('../database/db-config');

(async () => {
  try {
    const pool = await poolPromise;
    const rs = await pool.request().query('SELECT DB_NAME() AS db, @@SERVERNAME AS servername');
    console.log('Result:', rs.recordset);
    process.exit(0);
  } catch (e) {
    console.error('Error:', e);
    process.exit(1);
  }
})();
