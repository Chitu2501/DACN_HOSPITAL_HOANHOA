const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const adminController = require('../controllers/adminSql.controller');
const departmentController = require('../controllers/department.controller');
const { protect, isAdmin } = require('../middleware/auth.middleware');

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

module.exports = router;

