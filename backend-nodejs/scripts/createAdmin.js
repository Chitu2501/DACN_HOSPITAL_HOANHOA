require('dotenv').config();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { poolPromise } = require('../database/db-config');

/**
 * Tạo thêm tài khoản admin trong bảng USERS_AUTH.
 * Có thể truyền ENV khi chạy:
 *   ADMIN_EMAIL=... ADMIN_USERNAME=... ADMIN_PASSWORD=... ADMIN_FULLNAME=...
 *
 * Chạy: node scripts/createAdmin.js
 */

const TABLE = process.env.SQL_TABLE_USERS || 'USERS_AUTH';

async function ensureUserTable(pool) {
  await pool.request().query(`
    IF OBJECT_ID('${TABLE}', 'U') IS NULL
    CREATE TABLE ${TABLE} (
      id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
      username NVARCHAR(50) NOT NULL UNIQUE,
      email NVARCHAR(100) NOT NULL UNIQUE,
      password_hash NVARCHAR(255) NOT NULL,
      full_name NVARCHAR(150) NOT NULL,
      phone NVARCHAR(20),
      gender NVARCHAR(10),
      role NVARCHAR(20) NOT NULL DEFAULT 'patient',
      created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
  `);
}

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin2@hospital.com';
  const username = process.env.ADMIN_USERNAME || 'admin2';
  const password = process.env.ADMIN_PASSWORD || 'admin123456';
  const fullName = process.env.ADMIN_FULLNAME || 'Administrator 2';

  try {
    const pool = await poolPromise;
    await ensureUserTable(pool);

    const exists = await pool
      .request()
      .input('email', email)
      .query(`SELECT TOP 1 * FROM ${TABLE} WHERE email=@email`);

    if (exists.recordset.length) {
      console.log(`⚠️  Email ${email} đã tồn tại, không tạo thêm.`);
      process.exit(0);
    }

    const hash = await bcrypt.hash(password, 10);
    const id = uuidv4();
    await pool
      .request()
      .input('id', id)
      .input('username', username)
      .input('email', email)
      .input('password_hash', hash)
      .input('full_name', fullName)
      .input('phone', null)
      .input('gender', 'other')
      .query(`
        INSERT INTO ${TABLE} (id, username, email, password_hash, full_name, phone, gender, role)
        VALUES (@id, @username, @email, @password_hash, @full_name, @phone, @gender, 'admin')
      `);

    console.log('✅ Tạo admin mới thành công:');
    console.log(`   Email: ${email}`);
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${password}`);
  } catch (err) {
    console.error('❌ Lỗi tạo admin:', err.message);
  } finally {
    process.exit(0);
  }
}

main();


