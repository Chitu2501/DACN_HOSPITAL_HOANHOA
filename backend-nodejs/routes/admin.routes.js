const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const adminController = require('../controllers/adminSql.controller');
const departmentController = require('../controllers/department.controller');
const { protect, isAdmin } = require('../middleware/auth.middleware');
const { poolPromise } = require('../database/db-config');

// Department Management (KHOA)
// Cho phép GET công khai để tránh logout khi lỗi token; các thao tác khác cần admin
router.get('/departments', departmentController.getDepartments);

// Apply authentication and admin authorization to the rest
router.use(protect);
router.use(isAdmin);

router.post('/departments', [
  body('ma_khoa').trim().notEmpty().withMessage('Mã khoa là bắt buộc'),
  body('ten_khoa').trim().notEmpty().withMessage('Tên khoa là bắt buộc')
], departmentController.createDepartment);
router.put('/departments/:id', departmentController.updateDepartment); // id = ma_khoa
router.delete('/departments/:id', departmentController.deleteDepartment); // id = ma_khoa

// Validation rules
const createUserValidation = [
  body('username').trim().isLength({ min: 3, max: 50 }).withMessage('Username must be 3-50 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Invalid email address'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('fullName').trim().notEmpty().withMessage('Full name is required'),
  body('role').isIn(['admin', 'doctor', 'nurse', 'patient']).withMessage('Invalid role')
];

// User Management Routes
router.post('/users', createUserValidation, adminController.createUser);
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserById);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);
router.put('/users/:id/role', adminController.updateUserRole);
router.put('/users/:id/status', adminController.updateUserStatus);
router.get('/statistics/users', adminController.getUserStatistics);

// Doctors Management Routes (from BAC_SI table)
router.get('/doctors', async (req, res) => {
  try {
    const { search, specialization, ma_khoa } = req.query;
    const pool = await poolPromise;
    
    // Kiểm tra các column có tồn tại không
    const checkColumns = await pool.request().query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'BAC_SI' 
      AND COLUMN_NAME IN ('avatar_url', 'created_at', 'updated_at')
    `);
    
    const existingColumns = checkColumns.recordset.map(r => r.COLUMN_NAME);
    const hasAvatarUrl = existingColumns.includes('avatar_url');
    const hasCreatedAt = existingColumns.includes('created_at');
    const hasUpdatedAt = existingColumns.includes('updated_at');
    
    // Build SELECT với các column động
    const selectFields = [
      'bs.ma_bac_si',
      'bs.ma_khoa',
      'bs.ten_bac_si',
      'bs.chuyen_khoa',
      'bs.sdt',
      'bs.dia_chi',
      'bs.email',
      'bs.tieu_su',
      'bs.so_chung_chi_hanh_nghe',
      'bs.ma_thong_bao',
      hasAvatarUrl ? 'bs.avatar_url' : 'NULL AS avatar_url',
      hasCreatedAt ? 'bs.created_at' : 'NULL AS created_at',
      hasUpdatedAt ? 'bs.updated_at' : 'NULL AS updated_at',
      'k.ten_khoa',
      'u.is_active',
      'u.id AS user_id'
    ].join(',\n        ');
    
    let query = `
      SELECT 
        ${selectFields}
      FROM BAC_SI bs
      LEFT JOIN KHOA k ON bs.ma_khoa = k.ma_khoa
      LEFT JOIN USERS_AUTH u ON u.username = bs.ma_bac_si AND u.role = 'doctor'
      WHERE 1=1
    `;
    
    const request = pool.request();
    
    // Filter theo search (tên, email, sdt)
    if (search) {
      query += ` AND (
        bs.ten_bac_si LIKE @search OR 
        bs.email LIKE @search OR 
        bs.sdt LIKE @search OR
        bs.chuyen_khoa LIKE @search
      )`;
      request.input('search', `%${search}%`);
    }
    
    // Filter theo chuyên khoa
    if (specialization) {
      query += ` AND bs.chuyen_khoa LIKE @specialization`;
      request.input('specialization', `%${specialization}%`);
    }
    
    // Filter theo khoa
    if (ma_khoa) {
      query += ` AND bs.ma_khoa = @ma_khoa`;
      request.input('ma_khoa', ma_khoa);
    }
    
    query += ` ORDER BY bs.ten_bac_si ASC`;
    
    const result = await request.query(query);
    
    // Format data để phù hợp với frontend
    const doctors = result.recordset.map(doctor => {
      // Lấy lịch làm việc từ CA_BAC_SI (nếu có)
      // Có thể thêm query riêng để lấy lịch làm việc
      
      return {
        _id: doctor.ma_bac_si,
        id: doctor.ma_bac_si,
        code: doctor.ma_bac_si,
        fullName: doctor.ten_bac_si || 'Chưa có tên',
        email: doctor.email || '',
        phone: doctor.sdt || '',
        specialization: doctor.chuyen_khoa || '',
        department: doctor.ten_khoa || doctor.ma_khoa || '',
        departmentCode: doctor.ma_khoa || '',
        licenseNumber: doctor.so_chung_chi_hanh_nghe || '',
        address: doctor.dia_chi || '',
        bio: doctor.tieu_su || '',
        avatar_url: doctor.avatar_url || null,
        workSchedule: 'Chưa cập nhật', // Có thể query từ CA_BAC_SI
        isActive: doctor.is_active !== undefined ? doctor.is_active === 1 : true,
        createdAt: doctor.created_at,
        updatedAt: doctor.updated_at,
        user_id: doctor.user_id
      };
    });
    
    console.log(`✅ Found ${doctors.length} doctors`);
    
    res.json({
      success: true,
      data: doctors,
      count: doctors.length
    });
  } catch (err) {
    console.error('❌ SQL admin doctors error:', err.message);
    console.error('Error stack:', err.stack);
    console.error('Error details:', {
      message: err.message,
      code: err.code,
      number: err.number,
      state: err.state,
      class: err.class,
      serverName: err.serverName,
      procName: err.procName,
      lineNumber: err.lineNumber
    });
    
    res.status(500).json({
      success: false,
      message: err.message || 'Lỗi khi lấy danh sách bác sĩ',
      error: process.env.NODE_ENV === 'development' ? {
        message: err.message,
        code: err.code,
        number: err.number
      } : undefined
    });
  }
});

module.exports = router;

