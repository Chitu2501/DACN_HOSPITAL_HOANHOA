require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { poolPromise } = require('../database/db-config');

(async () => {
  try {
    const pool = await poolPromise;
    const rs = await pool.request().query('SELECT TOP 10 * FROM BAC_SI');
    console.log('BAC_SI:', rs.recordset);
    process.exit(0);
  } catch (e) {
    console.error('Error:', e);
    process.exit(1);
  }
})();
