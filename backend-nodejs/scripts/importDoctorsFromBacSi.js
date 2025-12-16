require('dotenv').config();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { poolPromise } = require('../database/db-config');

/**
 * Import bác sĩ từ bảng BAC_SI vào bảng USERS_AUTH (role=doctor).
 * Mặc định mật khẩu: doctor123456 (đổi bằng env IMPORT_DOCTOR_PASSWORD).
 *
 * Chạy: node scripts/importDoctorsFromBacSi.js
 */

const USERS_TABLE = process.env.SQL_TABLE_USERS || 'USERS_AUTH';
const DEFAULT_PASSWORD = process.env.IMPORT_DOCTOR_PASSWORD || 'doctor123456';

async function ensureUsersTable(pool) {
  await pool.request().query(`
    IF OBJECT_ID('${USERS_TABLE}', 'U') IS NULL
    CREATE TABLE ${USERS_TABLE} (
      id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
      username NVARCHAR(50) NOT NULL UNIQUE,
      email NVARCHAR(100) NOT NULL UNIQUE,
      password_hash NVARCHAR(255) NOT NULL,
      full_name NVARCHAR(150) NOT NULL,
      phone NVARCHAR(20),
      gender NVARCHAR(10),
      address NVARCHAR(255),
      date_of_birth DATE,
      specialization NVARCHAR(100),
      department NVARCHAR(100),
      license_number NVARCHAR(50),
      role NVARCHAR(20) NOT NULL DEFAULT 'patient',
      is_active BIT NOT NULL DEFAULT 1,
      created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );

    IF COL_LENGTH('${USERS_TABLE}', 'address') IS NULL
      ALTER TABLE ${USERS_TABLE} ADD address NVARCHAR(255) NULL;
    IF COL_LENGTH('${USERS_TABLE}', 'date_of_birth') IS NULL
      ALTER TABLE ${USERS_TABLE} ADD date_of_birth DATE NULL;
    IF COL_LENGTH('${USERS_TABLE}', 'specialization') IS NULL
      ALTER TABLE ${USERS_TABLE} ADD specialization NVARCHAR(100) NULL;
    IF COL_LENGTH('${USERS_TABLE}', 'department') IS NULL
      ALTER TABLE ${USERS_TABLE} ADD department NVARCHAR(100) NULL;
    IF COL_LENGTH('${USERS_TABLE}', 'license_number') IS NULL
      ALTER TABLE ${USERS_TABLE} ADD license_number NVARCHAR(50) NULL;
  `);
}

async function importDoctors() {
  const pool = await poolPromise;
  await ensureUsersTable(pool);

  // Lấy dữ liệu bác sĩ từ bảng BAC_SI
  const bsList = await pool.request().query(`
    SELECT ma_bac_si, ma_khoa, ten_bac_si, chuyen_khoa, sdt, dia_chi, email, so_chung_chi_hanh_nghe
    FROM BAC_SI
  `);

  if (!bsList.recordset.length) {
    console.log('Không có dữ liệu bác sĩ trong bảng BAC_SI.');
    process.exit(0);
  }

  const hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  let inserted = 0;
  let skipped = 0;

  for (const bs of bsList.recordset) {
    const email = bs.email || `${bs.ma_bac_si}@example.com`;
    const username = bs.ma_bac_si || bs.email || uuidv4();

    const exists = await pool
      .request()
      .input('email', email)
      .query(`SELECT TOP 1 id FROM ${USERS_TABLE} WHERE email=@email`);

    if (exists.recordset.length) {
      skipped++;
      continue;
    }

    const id = uuidv4();
    await pool
      .request()
      .input('id', id)
      .input('username', username)
      .input('email', email)
      .input('password_hash', hash)
      .input('full_name', bs.ten_bac_si || username)
      .input('phone', bs.sdt || null)
      .input('gender', 'other')
      .input('address', bs.dia_chi || null)
      .input('date_of_birth', null)
      .input('specialization', bs.chuyen_khoa || null)
      .input('department', bs.ma_khoa || null)
      .input('license_number', bs.so_chung_chi_hanh_nghe || null)
      .query(`
        INSERT INTO ${USERS_TABLE} (
          id, username, email, password_hash, full_name, phone, gender, address,
          date_of_birth, specialization, department, license_number, role
        )
        VALUES (
          @id, @username, @email, @password_hash, @full_name, @phone, @gender, @address,
          @date_of_birth, @specialization, @department, @license_number, 'doctor'
        )
      `);
    inserted++;
  }

  console.log(`✅ Import xong. Thêm mới: ${inserted}, bỏ qua (đã tồn tại email): ${skipped}.`);
  console.log(`Mật khẩu mặc định cho bác sĩ mới: ${DEFAULT_PASSWORD}`);
  process.exit(0);
}

importDoctors().catch((err) => {
  console.error('❌ Lỗi import:', err.message);
  process.exit(1);
});

