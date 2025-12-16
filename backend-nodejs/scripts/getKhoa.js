require('dotenv').config();
const { sql, poolPromise } = require('../database/db-config');

/**
 * Script lấy danh sách khoa (table KHOA) từ SQL Server.
 * Chạy: node scripts/getKhoa.js
 */

async function main() {
  console.log('⏳ Đang lấy danh sách khoa...');
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM KHOA ORDER BY ma_khoa');
    console.log(`✅ Số lượng khoa: ${result.recordset.length}`);
    console.dir(result.recordset, { depth: null });
  } catch (err) {
    console.error('❌ Lỗi lấy khoa:', err.message);
    if (err.code) console.error('Code:', err.code);
    if (err.number) console.error('Number:', err.number);
  } finally {
    process.exit(0);
  }
}

main();

