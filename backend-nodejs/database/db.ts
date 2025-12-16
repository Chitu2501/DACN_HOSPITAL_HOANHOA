// Kết nối SQL Server bằng SQL Authentication (driver mssql)
// Đọc cấu hình từ .env
require('dotenv').config();
const sql = require('mssql');

const config = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '',
  server: process.env.DB_SERVER || 'SWEETHER',
  database: process.env.DB_NAME || 'HOSPITAL_DACN',
  port: parseInt(process.env.DB_PORT || '1433', 10),
  options: {
    trustServerCertificate: true,
    encrypt: false,
  },
};

const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then(pool => {
    console.log(
      `✅ Đã kết nối SQL Server - ${config.server}\\${config.database}`
    );
    return pool;
  })
  .catch(err => {
    console.error('❌ Lỗi kết nối:', err);
    throw err;
  });

module.exports = { sql, poolPromise };