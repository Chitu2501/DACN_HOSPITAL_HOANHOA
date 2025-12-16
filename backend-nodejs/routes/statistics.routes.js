const express = require('express');
const router = express.Router();
const statisticsController = require('../controllers/statistics.controller');
const { protect, isAdmin } = require('../middleware/auth.middleware');

// Apply authentication and admin authorization to all routes
router.use(protect);
router.use(isAdmin);

// @route   GET /api/statistics/dashboard
// @desc    Get dashboard statistics
// @access  Private/Admin
router.get('/dashboard', statisticsController.getDashboardStats);

// @route   GET /api/statistics/revenue
// @desc    Get revenue statistics
// @access  Private/Admin
router.get('/revenue', statisticsController.getRevenueStats);

// @route   GET /api/statistics/appointments
// @desc    Get appointment statistics
// @access  Private/Admin
router.get('/appointments', statisticsController.getAppointmentStats);

// @route   GET /api/statistics/export
// @desc    Export statistics report to Excel
// @access  Private/Admin
router.get('/export', statisticsController.exportReport);

module.exports = router;

