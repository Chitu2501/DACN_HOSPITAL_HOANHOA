require('dotenv').config();
const { poolPromise } = require('../database/db-config');

/**
 * Script lấy danh sách bệnh nhân từ bảng BENH_NHAN.
 * Chạy: node scripts/getBenhNhan.js
 */

async function main() {
  console.log('⏳ Đang lấy danh sách bệnh nhân...');
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT TOP (100) * FROM BENH_NHAN ORDER BY ten_benh_nhan');
    console.log(`✅ Số bệnh nhân: ${result.recordset.length}`);
    console.dir(result.recordset, { depth: null });
  } catch (err) {
    console.error('❌ Lỗi lấy bệnh nhân:', err.message);
    if (err.code) console.error('Code:', err.code);
    if (err.number) console.error('Number:', err.number);
  } finally {
    process.exit(0);
  }
}

main();

