require('dotenv').config();
const { sql, poolPromise } = require('../database/db-config');

/**
 * Script lấy danh sách hồ sơ khám từ SQL Server.
 * Chạy: node scripts/getHoSoKham.js
 * Có thể chỉnh tên bảng qua env: SQL_TABLE_MEDICAL_RECORDS
 */

const TABLE = process.env.SQL_TABLE_MEDICAL_RECORDS || 'HO_SO_KHAM';
const LIMIT = process.env.SQL_LIMIT_MEDICAL_RECORDS
  ? Number(process.env.SQL_LIMIT_MEDICAL_RECORDS)
  : 50;

async function main() {
  console.log(`⏳ Đang lấy hồ sơ từ bảng ${TABLE}...`);
  try {
    const pool = await poolPromise;
    const request = pool.request();
    const query = `
      SELECT TOP (${LIMIT}) *
      FROM ${TABLE}
      ORDER BY ngay_kham DESC, tao_luc DESC
    `;
    const result = await request.query(query);
    console.log(`✅ Lấy thành công ${result.recordset.length} hồ sơ`);
    console.dir(result.recordset, { depth: null });
  } catch (err) {
    console.error('❌ Lỗi lấy hồ sơ:', err.message);
    if (err.code) console.error('Code:', err.code);
    if (err.number) console.error('Number:', err.number);
  } finally {
    // mssql sẽ tự quản lý pool, không cần đóng thủ công
    process.exit(0);
  }
}

main();

