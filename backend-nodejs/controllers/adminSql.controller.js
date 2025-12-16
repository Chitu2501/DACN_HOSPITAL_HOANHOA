const bcrypt = require('bcryptjs');
const { poolPromise } = require('../database/db-config');
const { v4: uuidv4 } = require('uuid');

const TABLE = process.env.SQL_TABLE_USERS || 'USERS_AUTH';
const BAC_SI_TABLE = 'BAC_SI';

async function ensureTable() {
  const pool = await poolPromise;
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
      address NVARCHAR(255),
      date_of_birth DATE,
      specialization NVARCHAR(100),
      department NVARCHAR(100),
      license_number NVARCHAR(50),
      role NVARCHAR(20) NOT NULL DEFAULT 'patient',
      is_active BIT NOT NULL DEFAULT 1,
      created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
    IF COL_LENGTH('${TABLE}', 'is_active') IS NULL
      ALTER TABLE ${TABLE} ADD is_active BIT NOT NULL CONSTRAINT DF_${TABLE}_is_active DEFAULT 1 WITH VALUES;
    IF COL_LENGTH('${TABLE}', 'address') IS NULL
      ALTER TABLE ${TABLE} ADD address NVARCHAR(255) NULL;
    IF COL_LENGTH('${TABLE}', 'date_of_birth') IS NULL
      ALTER TABLE ${TABLE} ADD date_of_birth DATE NULL;
    IF COL_LENGTH('${TABLE}', 'specialization') IS NULL
      ALTER TABLE ${TABLE} ADD specialization NVARCHAR(100) NULL;
    IF COL_LENGTH('${TABLE}', 'department') IS NULL
      ALTER TABLE ${TABLE} ADD department NVARCHAR(100) NULL;
    IF COL_LENGTH('${TABLE}', 'license_number') IS NULL
      ALTER TABLE ${TABLE} ADD license_number NVARCHAR(50) NULL;
  `);
}

async function ensureBacSiTable() {
  const pool = await poolPromise;
  await pool.request().query(`
    IF OBJECT_ID('${BAC_SI_TABLE}', 'U') IS NULL
    CREATE TABLE ${BAC_SI_TABLE} (
      ma_bac_si VARCHAR(36) NOT NULL PRIMARY KEY,
      ma_khoa   VARCHAR(20) NULL,
      ten_bac_si NVARCHAR(100) NOT NULL,
      chuyen_khoa NVARCHAR(100) NULL,
      sdt VARCHAR(20) NULL,
      dia_chi NVARCHAR(255) NULL,
      email NVARCHAR(100) NULL,
      tieu_su NVARCHAR(MAX) NULL,
      so_chung_chi_hanh_nghe NVARCHAR(50) NULL,
      ma_thong_bao VARCHAR(36) NULL
    );
  `);
}

const mapUser = (row) => ({
  id: row.id,
  username: row.username,
  email: row.email,
  fullName: row.full_name,
  role: row.role,
  phone: row.phone,
  gender: row.gender,
  address: row.address,
  dateOfBirth: row.date_of_birth,
  specialization: row.specialization,
  department: row.department,
  licenseNumber: row.license_number,
  isActive: row.is_active,
  createdAt: row.created_at,
});

async function upsertDoctor(pool, userData) {
  await ensureBacSiTable();
  const {
    username,
    fullName,
    email,
    phone,
    address,
    specialization,
    department,
    licenseNumber,
  } = userData;

  // Validate ma_khoa nếu được cung cấp
  let ma_khoa = null;
  if (department) {
    // Kiểm tra xem ma_khoa có tồn tại trong bảng KHOA không
    const khoaCheck = await pool
      .request()
      .input('ma_khoa', department)
      .query('SELECT TOP 1 ma_khoa FROM KHOA WHERE ma_khoa = @ma_khoa');
    
    if (khoaCheck.recordset.length === 0) {
      throw new Error(`Mã khoa "${department}" không tồn tại trong hệ thống. Vui lòng chọn khoa hợp lệ.`);
    }
    ma_khoa = department;
  }

  await pool.request()
    .input('ma_bac_si', username)
    .input('ma_khoa', ma_khoa)
    .input('ten_bac_si', fullName || username)
    .input('chuyen_khoa', specialization || null)
    .input('sdt', phone || null)
    .input('dia_chi', address || null)
    .input('email', email || null)
    .input('so_chung_chi_hanh_nghe', licenseNumber || null)
    .query(`
      MERGE ${BAC_SI_TABLE} AS target
      USING (SELECT @ma_bac_si AS ma_bac_si) AS src
      ON target.ma_bac_si = src.ma_bac_si
      WHEN MATCHED THEN UPDATE SET
        ma_khoa = @ma_khoa,
        ten_bac_si = @ten_bac_si,
        chuyen_khoa = @chuyen_khoa,
        sdt = @sdt,
        dia_chi = @dia_chi,
        email = @email,
        so_chung_chi_hanh_nghe = @so_chung_chi_hanh_nghe
      WHEN NOT MATCHED THEN
        INSERT (ma_bac_si, ma_khoa, ten_bac_si, chuyen_khoa, sdt, dia_chi, email, so_chung_chi_hanh_nghe)
        VALUES (@ma_bac_si, @ma_khoa, @ten_bac_si, @chuyen_khoa, @sdt, @dia_chi, @email, @so_chung_chi_hanh_nghe);
    `);
}

async function deleteDoctorByUsername(pool, username) {
  await ensureBacSiTable();
  await pool.request()
    .input('ma_bac_si', username)
    .query(`DELETE FROM ${BAC_SI_TABLE} WHERE ma_bac_si = @ma_bac_si`);
}

exports.createUser = async (req, res) => {
  try {
    // Log request để debug
    console.log('📝 Create user request:', JSON.stringify(req.body, null, 2));
    
    // Kiểm tra validation errors từ express-validator
    const { validationResult } = require('express-validator');
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('❌ Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu không hợp lệ',
        errors: errors.array()
      });
    }

    const { username, email, password, fullName, phone, gender, role, address, dateOfBirth, specialization, department, licenseNumber } = req.body;
    
    // Validate required fields
    if (!username || !email || !password || !fullName) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin bắt buộc: username, email, password, fullName'
      });
    }

    await ensureTable();
    const pool = await poolPromise;

    const dup = await pool
      .request()
      .input('username', username)
      .input('email', email)
      .query(`SELECT TOP 1 id FROM ${TABLE} WHERE username=@username OR email=@email`);
    if (dup.recordset.length) {
      return res.status(400).json({ success: false, message: 'Username hoặc email đã tồn tại' });
    }

    // Đảm bảo password được cung cấp
    if (!password || password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password là bắt buộc và phải có ít nhất 6 ký tự' 
      });
    }

    const hash = await bcrypt.hash(password, 10);
    const id = uuidv4();
    
    console.log(`🔐 Hashing password for user: ${username}`);
    console.log(`📊 Inserting user with ID: ${id}`);
    
    await pool
      .request()
      .input('id', id)
      .input('username', username)
      .input('email', email)
      .input('password_hash', hash)
      .input('full_name', fullName || username)
      .input('phone', phone || null)
      .input('gender', gender || 'other')
      .input('address', address || null)
      .input('date_of_birth', dateOfBirth || null)
      .input('specialization', specialization || null)
      .input('department', department || null)
      .input('license_number', licenseNumber || null)
      .input('role', role || 'patient')
      .input('is_active', 1)
      .query(`
        INSERT INTO ${TABLE} (id, username, email, password_hash, full_name, phone, gender, address, date_of_birth, specialization, department, license_number, role, is_active)
        VALUES (@id, @username, @email, @password_hash, @full_name, @phone, @gender, @address, @date_of_birth, @specialization, @department, @license_number, @role, @is_active)
      `);

    console.log(`✅ User inserted successfully: ${username} (${email})`);

    if (role === 'doctor') {
      console.log(`👨‍⚕️ Creating doctor record for: ${username}`);
      try {
        await upsertDoctor(pool, {
          username,
          fullName,
          email,
          phone,
          address,
          specialization,
          department,
          licenseNumber,
        });
        console.log(`✅ Doctor record created: ${username}`);
      } catch (doctorError) {
        // Nếu lỗi khi tạo doctor record, rollback user đã tạo
        console.error(`❌ Error creating doctor record, rolling back user: ${username}`);
        await pool.request().input('id', id).query(`DELETE FROM ${TABLE} WHERE id=@id`);
        throw doctorError; // Re-throw để frontend nhận được lỗi
      }
    }

    console.log(`🎉 User creation completed: ${username}`);
    res.json({ success: true, message: 'Tạo user thành công', data: { id } });
  } catch (err) {
    console.error('❌ Error creating user:', err);
    console.error('Error details:', {
      message: err.message,
      stack: err.stack,
      body: req.body
    });
    
    // Xử lý lỗi foreign key constraint
    let errorMessage = err.message || 'Lỗi khi tạo user';
    if (err.message?.includes('FOREIGN KEY constraint') || err.message?.includes('FK_BACSI_KHOA')) {
      errorMessage = 'Mã khoa không hợp lệ. Vui lòng chọn khoa từ danh sách có sẵn.';
    } else if (err.message?.includes('không tồn tại')) {
      errorMessage = err.message; // Giữ nguyên thông báo lỗi từ validation
    }
    
    res.status(400).json({ 
      success: false, 
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    await ensureTable();
    const pool = await poolPromise;
    const result = await pool.request().query(`SELECT * FROM ${TABLE} ORDER BY created_at DESC`);
    res.json({ success: true, data: result.recordset.map(mapUser) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getUserById = async (req, res) => {
  try {
    await ensureTable();
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input('id', req.params.id)
      .query(`SELECT TOP 1 * FROM ${TABLE} WHERE id=@id`);
    if (!result.recordset.length) {
      return res.status(404).json({ success: false, message: 'User không tồn tại' });
    }
    res.json({ success: true, data: mapUser(result.recordset[0]) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    await ensureTable();
    const pool = await poolPromise;
    const { fullName, phone, gender, role, address, dateOfBirth, specialization, department, licenseNumber } = req.body;
    const userRes = await pool
      .request()
      .input('id', req.params.id)
      .query(`SELECT TOP 1 * FROM ${TABLE} WHERE id=@id`);
    if (!userRes.recordset.length) {
      return res.status(404).json({ success: false, message: 'User không tồn tại' });
    }
    await pool
      .request()
      .input('id', req.params.id)
      .input('full_name', fullName || userRes.recordset[0].full_name)
      .input('phone', phone ?? userRes.recordset[0].phone)
      .input('gender', gender || userRes.recordset[0].gender)
      .input('address', address ?? userRes.recordset[0].address)
      .input('date_of_birth', dateOfBirth ?? userRes.recordset[0].date_of_birth)
      .input('specialization', specialization ?? userRes.recordset[0].specialization)
      .input('department', department ?? userRes.recordset[0].department)
      .input('license_number', licenseNumber ?? userRes.recordset[0].license_number)
      .input('role', role || userRes.recordset[0].role)
      .query(`
        UPDATE ${TABLE}
        SET full_name=@full_name, phone=@phone, gender=@gender, role=@role,
            address=@address, date_of_birth=@date_of_birth,
            specialization=@specialization, department=@department, license_number=@license_number
        WHERE id=@id
      `);

    const newRole = role || userRes.recordset[0].role;
    const username = userRes.recordset[0].username;
    if (newRole === 'doctor') {
      await upsertDoctor(pool, {
        username,
        fullName: fullName || userRes.recordset[0].full_name,
        email: userRes.recordset[0].email,
        phone: phone ?? userRes.recordset[0].phone,
        address: address ?? userRes.recordset[0].address,
        specialization: specialization ?? userRes.recordset[0].specialization,
        department: department ?? userRes.recordset[0].department,
        licenseNumber: licenseNumber ?? userRes.recordset[0].license_number,
      });
    } else {
      // Nếu chuyển khỏi role doctor, xóa khỏi BAC_SI
      await deleteDoctorByUsername(pool, username);
    }

    res.json({ success: true, message: 'Cập nhật thành công' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    await ensureTable();
    const pool = await poolPromise;
    const userRes = await pool.request().input('id', req.params.id).query(`SELECT TOP 1 * FROM ${TABLE} WHERE id=@id`);
    const username = userRes.recordset[0]?.username;
    await pool.request().input('id', req.params.id).query(`DELETE FROM ${TABLE} WHERE id=@id`);
    if (username) {
      await deleteDoctorByUsername(pool, username);
    }
    res.json({ success: true, message: 'Đã xóa user' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateUserRole = async (req, res) => {
  try {
    await ensureTable();
    const { role } = req.body;
    const pool = await poolPromise;
    await pool
      .request()
      .input('id', req.params.id)
      .input('role', role)
      .query(`UPDATE ${TABLE} SET role=@role WHERE id=@id`);
    res.json({ success: true, message: 'Cập nhật vai trò thành công' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateUserStatus = async (req, res) => {
  try {
    await ensureTable();
    const { isActive } = req.body;
    const pool = await poolPromise;
    await pool
      .request()
      .input('id', req.params.id)
      .input('is_active', isActive ? 1 : 0)
      .query(`UPDATE ${TABLE} SET is_active=@is_active WHERE id=@id`);
    res.json({ success: true, message: 'Cập nhật trạng thái thành công' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getUserStatistics = async (req, res) => {
  try {
    await ensureTable();
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT role, COUNT(*) as total, SUM(CASE WHEN is_active=1 THEN 1 ELSE 0 END) as active
      FROM ${TABLE}
      GROUP BY role
    `);
    const data = result.recordset.map((r) => ({
      role: r.role,
      total: Number(r.total),
      active: Number(r.active),
    }));
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

