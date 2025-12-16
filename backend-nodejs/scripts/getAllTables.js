require('dotenv').config();
const { poolPromise } = require('../database/db-config');

/**
 * Lấy dữ liệu tất cả các bảng nghiệp vụ trong schema bệnh viện.
 * Chạy: node scripts/getAllTables.js
 * Có thể giới hạn số dòng bằng env: SQL_LIMIT_PER_TABLE (mặc định 50)
 */

const TABLES = [
  'KHOA',
  'THONG_BAO',
  'BENH_NHAN',
  'BAC_SI',
  'Y_TA',
  'BHYT_THE',
  'CA_BAC_SI',
  'LICH_HEN',
  'TRANG_THAI_THANH_TOAN',
  'PHUONG_THUC_THANH_TOAN',
  'THANH_TOAN',
  'HO_SO_KHAM',
  'SINH_HIEU',
  'KET_QUA_XN',
  'CT_KQ_XN',
  'KHO_THUOC',
  'THUOC',
  'DON_THUOC',
  'DON_THUOC_CHI_TIET'
];

const LIMIT = process.env.SQL_LIMIT_PER_TABLE ? Number(process.env.SQL_LIMIT_PER_TABLE) : 50;

async function fetchTable(pool, table) {
  try {
    const result = await pool.request().query(`SELECT TOP (${LIMIT}) * FROM ${table}`);
    console.log(`\n===== ${table} (${result.recordset.length} rows) =====`);
    console.dir(result.recordset, { depth: null });
  } catch (err) {
    console.error(`❌ Lỗi khi lấy bảng ${table}:`, err.message);
  }
}

async function main() {
  console.log('⏳ Đang lấy dữ liệu các bảng...');
  const pool = await poolPromise;
  for (const table of TABLES) {
    await fetchTable(pool, table);
  }
  console.log('\n✅ Hoàn tất');
  process.exit(0);
}

main();

