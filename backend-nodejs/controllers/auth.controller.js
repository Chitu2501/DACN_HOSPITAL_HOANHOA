const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const { poolPromise } = require('../database/db-config');
const { v4: uuidv4 } = require('uuid');

// Generate JWT Token
const generateToken = (id) => {
  const secret = process.env.JWT_SECRET || 'dev_secret';
  const expiresIn = process.env.JWT_EXPIRE || '7d';
  return jwt.sign({ id }, secret, { expiresIn });
};

const TABLE = process.env.SQL_TABLE_USERS || 'USERS_AUTH';
let ensuredTable = false;
let ensuredAdmin = false;

async function ensureUserTable() {
  if (ensuredTable) return;
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
  ensuredTable = true;
}

const mapUserSQL = (row) => ({
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

const mapUser = (row) => ({
  id: row.id,
  username: row.username,
  email: row.email,
  fullName: row.full_name,
  role: row.role,
  phone: row.phone,
  gender: row.gender,
  isActive: row.is_active,
});

async function ensureDefaultAdmin() {
  if (ensuredAdmin) return;
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@hospital.com';
  const adminUser = process.env.ADMIN_USERNAME || 'admin';
  const adminPass = process.env.ADMIN_PASSWORD || 'admin123456';
  const adminName = process.env.ADMIN_FULLNAME || 'Administrator';

  const pool = await poolPromise;
  const exists = await pool
    .request()
    .input('email', adminEmail)
    .query(`SELECT TOP 1 * FROM ${TABLE} WHERE email=@email`);

  const hash = await bcrypt.hash(adminPass, 10);

  if (!exists.recordset.length) {
    const hash = await bcrypt.hash(adminPass, 10);
    const id = uuidv4();
    await pool
      .request()
      .input('id', id)
      .input('username', adminUser)
      .input('email', adminEmail)
      .input('password_hash', hash)
      .input('full_name', adminName)
      .input('phone', null)
      .input('gender', 'other')
      .query(`
        INSERT INTO ${TABLE} (id, username, email, password_hash, full_name, phone, gender, role)
        VALUES (@id, @username, @email, @password_hash, @full_name, @phone, @gender, 'admin')
      `);
    console.log(`✓ Seeded default admin: ${adminEmail}`);
  } else {
    // Đảm bảo admin có đúng mật khẩu/role hiện tại
    const id = exists.recordset[0].id;
    await pool
      .request()
      .input('id', id)
      .input('username', adminUser)
      .input('password_hash', hash)
      .input('full_name', adminName)
      .query(`
        UPDATE ${TABLE}
        SET username=@username, password_hash=@password_hash, full_name=@full_name, role='admin', is_active=1
        WHERE id=@id
      `);
    ensuredAdmin = true;
  }
  ensuredAdmin = true;
}

// @desc    Register new user (SQL)
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { username, email, password, fullName, phone, gender } = req.body;
    await ensureUserTable();
    await ensureDefaultAdmin();
    const pool = await poolPromise;

    const dup = await pool
      .request()
      .input('username', username)
      .input('email', email)
      .query(`SELECT TOP 1 * FROM ${TABLE} WHERE username=@username OR email=@email`);
    if (dup.recordset.length) {
      return res.status(400).json({ success: false, message: 'Username hoặc email đã tồn tại' });
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
      .input('phone', phone || null)
      .input('gender', gender || 'other')
      .query(`
        INSERT INTO ${TABLE} (id, username, email, password_hash, full_name, phone, gender, role)
        VALUES (@id, @username, @email, @password_hash, @full_name, @phone, @gender, 'patient')
      `);

    const token = generateToken(id);
    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user: mapUserSQL({
          id,
          username,
          email,
          full_name: fullName,
          role: 'patient',
          phone,
          gender: gender || 'other',
          address: null,
          date_of_birth: null,
          specialization: null,
          department: null,
          license_number: null,
          is_active: 1,
          created_at: new Date()
        }),
        token
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error during registration'
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    await ensureUserTable();
    await ensureDefaultAdmin();
    const pool = await poolPromise;
    // Hỗ trợ login bằng email hoặc username
    const userRes = await pool
      .request()
      .input('email', email)
      .input('username', email)
      .query(`SELECT TOP 1 * FROM ${TABLE} WHERE email=@email OR username=@username`);

    if (!userRes.recordset.length) {
      console.log(`❌ Login failed: User not found with email/username: ${email}`);
      return res.status(401).json({ success: false, message: 'Email/username hoặc mật khẩu không đúng' });
    }

    const user = userRes.recordset[0];
    
    // Kiểm tra password_hash có đúng định dạng bcrypt không
    const validBcryptPrefixes = ['$2a$', '$2b$', '$2y$'];
    const passwordHash = user.password_hash || '';
    const isValidBcrypt = validBcryptPrefixes.some(prefix => passwordHash.startsWith(prefix));
    
    if (!isValidBcrypt) {
      console.error(`⚠️  User ${user.email} (${user.username}) có password_hash không đúng định dạng bcrypt. Hash: ${passwordHash.substring(0, 20)}...`);
      console.error(`   Cần chạy: node backend-nodejs/scripts/fixPasswordHashes.js`);
      return res.status(401).json({ 
        success: false, 
        message: 'Tài khoản cần được reset password. Vui lòng liên hệ quản trị viên.' 
      });
    }

    // Kiểm tra is_active trước khi so sánh password
    if (!user.is_active) {
      console.log(`❌ Login failed: Account locked for user: ${user.email} (${user.username})`);
      return res.status(401).json({ success: false, message: 'Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      console.log(`❌ Login failed: Invalid password for user: ${user.email} (${user.username})`);
      return res.status(401).json({ success: false, message: 'Email/username hoặc mật khẩu không đúng' });
    }

    console.log(`✅ Login successful: ${user.email} (${user.username}) - Role: ${user.role}`);

    const token = generateToken(user.id);
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: mapUserSQL(user),
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during login',
      error: error.message
    });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    await ensureUserTable();
    const pool = await poolPromise;
    const userRes = await pool
      .request()
      .input('id', req.user.id)
      .query(`SELECT TOP 1 * FROM ${TABLE} WHERE id=@id`);

    if (!userRes.recordset.length) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({ success: true, data: mapUserSQL(userRes.recordset[0]) });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user data',
      error: error.message
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const { fullName, phone, gender, address, dateOfBirth } = req.body;
    await ensureUserTable();
    const pool = await poolPromise;
    const userRes = await pool
      .request()
      .input('id', req.user.id)
      .query(`SELECT TOP 1 * FROM ${TABLE} WHERE id=@id`);

    if (!userRes.recordset.length) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const current = userRes.recordset[0];

    await pool
      .request()
      .input('id', req.user.id)
      .input('full_name', fullName || current.full_name)
      .input('phone', phone || current.phone)
      .input('gender', gender || current.gender)
      .input('address', address !== undefined ? address : current.address)
      .input(
        'date_of_birth',
        dateOfBirth !== undefined && dateOfBirth !== null && dateOfBirth !== ''
          ? new Date(dateOfBirth)
          : current.date_of_birth
      )
      .query(`
        UPDATE ${TABLE}
        SET 
          full_name=@full_name, 
          phone=@phone, 
          gender=@gender,
          address=@address,
          date_of_birth=@date_of_birth
        WHERE id=@id
      `);

    const updated = {
      ...mapUserSQL(current),
      fullName: fullName || current.full_name,
      phone: phone || current.phone,
      gender: gender || current.gender,
      address: address !== undefined ? address : current.address,
      dateOfBirth:
        dateOfBirth !== undefined && dateOfBirth !== null && dateOfBirth !== ''
          ? dateOfBirth
          : current.date_of_birth,
    };

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: updated
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: error.message
    });
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current password and new password'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters'
      });
    }

    await ensureUserTable();
    const pool = await poolPromise;
    const userRes = await pool
      .request()
      .input('id', req.user.id)
      .query(`SELECT TOP 1 * FROM ${TABLE} WHERE id=@id`);

    if (!userRes.recordset.length) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = userRes.recordset[0];
    const match = await bcrypt.compare(currentPassword, user.password_hash);
    if (!match) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await pool
      .request()
      .input('id', req.user.id)
      .input('password_hash', hash)
      .query(`UPDATE ${TABLE} SET password_hash=@password_hash WHERE id=@id`);

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error changing password',
      error: error.message
    });
  }
};

