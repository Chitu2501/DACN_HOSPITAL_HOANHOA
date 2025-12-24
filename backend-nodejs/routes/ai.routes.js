const express = require('express');
const router = express.Router();
const { protect, isAdmin } = require('../middleware/auth.middleware');
const geminiService = require('../services/gemini.service');
const { poolPromise } = require('../database/db-config');

// Apply authentication and admin authorization to all routes
router.use(protect);
router.use(isAdmin);

/**
 * @route   GET /api/ai/analyze
 * @desc    Phân tích tổng quan hệ thống bằng AI
 * @access  Private/Admin
 */
router.get('/analyze', async (req, res) => {
    try {
        const pool = await poolPromise;
        const TABLE = process.env.SQL_TABLE_USERS || 'USERS_AUTH';

        // Lấy dữ liệu thống kê từ database
        const usersStats = await pool.request().query(`
      SELECT 
        COUNT(*) AS total,
        SUM(CASE WHEN role = 'patient' THEN 1 ELSE 0 END) AS patients,
        SUM(CASE WHEN role = 'doctor' THEN 1 ELSE 0 END) AS doctors,
        SUM(CASE WHEN role = 'nurse' THEN 1 ELSE 0 END) AS nurses,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS active
      FROM ${TABLE}
    `);

        const appointmentsStats = await pool.request().query(`
      SELECT 
        COUNT(*) AS total,
        SUM(CASE WHEN CAST(thoi_gian_hen AS DATE) = CAST(GETDATE() AS DATE) THEN 1 ELSE 0 END) AS today,
        SUM(CASE WHEN trang_thai IN ('pending', 'chờ khám') THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN trang_thai IN ('confirmed', 'đã xác nhận') THEN 1 ELSE 0 END) AS confirmed,
        SUM(CASE WHEN trang_thai IN ('completed', 'hoàn thành', 'done') THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN trang_thai IN ('cancelled', 'huy', 'đã hủy') THEN 1 ELSE 0 END) AS cancelled
      FROM LICH_HEN
    `);

        const revenueStats = await pool.request().query(`
      SELECT 
        COUNT(*) AS total_payments,
        ISNULL(SUM(so_tien_benh_nhan_tra), 0) AS total_revenue
      FROM THANH_TOAN
      WHERE trang_thai = N'đã thanh toán' OR MaTrangThaiTT = 'PAID'
    `);

        const medicalRecordsStats = await pool.request().query(`
      SELECT 
        COUNT(*) AS total,
        SUM(CASE WHEN trang_thai IN ('completed', 'hoàn thành') THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN trang_thai IN ('in_progress', 'đang xử lý') THEN 1 ELSE 0 END) AS in_progress
      FROM HO_SO_KHAM
    `);

        const data = {
            users: {
                total: usersStats.recordset[0]?.total || 0,
                patients: usersStats.recordset[0]?.patients || 0,
                doctors: usersStats.recordset[0]?.doctors || 0,
                nurses: usersStats.recordset[0]?.nurses || 0,
                active: usersStats.recordset[0]?.active || 0
            },
            appointments: {
                total: appointmentsStats.recordset[0]?.total || 0,
                today: appointmentsStats.recordset[0]?.today || 0,
                pending: appointmentsStats.recordset[0]?.pending || 0,
                confirmed: appointmentsStats.recordset[0]?.confirmed || 0,
                completed: appointmentsStats.recordset[0]?.completed || 0,
                cancelled: appointmentsStats.recordset[0]?.cancelled || 0
            },
            revenue: {
                total: revenueStats.recordset[0]?.total_revenue || 0,
                paidAppointments: revenueStats.recordset[0]?.total_payments || 0
            },
            medicalRecords: {
                total: medicalRecordsStats.recordset[0]?.total || 0,
                completed: medicalRecordsStats.recordset[0]?.completed || 0,
                inProgress: medicalRecordsStats.recordset[0]?.in_progress || 0
            }
        };

        // Gọi Gemini để phân tích
        const analysis = await geminiService.analyzeHospitalData(data);

        res.json({
            success: true,
            data: {
                rawData: data,
                analysis
            }
        });
    } catch (error) {
        console.error('AI Analyze Error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi phân tích dữ liệu bằng AI',
            error: error.message
        });
    }
});

/**
 * @route   POST /api/ai/recommendations
 * @desc    Nhận đề xuất quản lý từ AI
 * @access  Private/Admin
 */
router.post('/recommendations', async (req, res) => {
    try {
        const { context } = req.body;
        const pool = await poolPromise;

        // Lấy thêm dữ liệu nếu context không đủ
        let enrichedContext = context || {};

        if (!enrichedContext.appointments) {
            const appointmentsStats = await pool.request().query(`
        SELECT 
          COUNT(*) AS total,
          SUM(CASE WHEN CAST(thoi_gian_hen AS DATE) = CAST(GETDATE() AS DATE) THEN 1 ELSE 0 END) AS today,
          SUM(CASE WHEN trang_thai IN ('cancelled', 'đã hủy') THEN 1 ELSE 0 END) AS cancelled
        FROM LICH_HEN
      `);
            enrichedContext.appointments = appointmentsStats.recordset[0];
        }

        const recommendations = await geminiService.generateRecommendations(enrichedContext);

        res.json({
            success: true,
            data: recommendations
        });
    } catch (error) {
        console.error('AI Recommendations Error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi tạo đề xuất từ AI',
            error: error.message
        });
    }
});

/**
 * @route   POST /api/ai/chat
 * @desc    Chat với AI Assistant
 * @access  Private/Admin
 */
router.post('/chat', async (req, res) => {
    try {
        const { message, history } = req.body;

        if (!message) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng nhập tin nhắn'
            });
        }

        const pool = await poolPromise;
        const TABLE = process.env.SQL_TABLE_USERS || 'USERS_AUTH';

        // Lấy context dữ liệu hiện tại
        const usersStats = await pool.request().query(`
      SELECT 
        COUNT(*) AS total,
        SUM(CASE WHEN role = 'doctor' THEN 1 ELSE 0 END) AS doctors,
        SUM(CASE WHEN role = 'patient' THEN 1 ELSE 0 END) AS patients
      FROM ${TABLE}
    `);

        const appointmentsToday = await pool.request().query(`
      SELECT 
        COUNT(*) AS total,
        SUM(CASE WHEN trang_thai IN ('completed', 'hoàn thành') THEN 1 ELSE 0 END) AS completed
      FROM LICH_HEN
      WHERE CAST(thoi_gian_hen AS DATE) = CAST(GETDATE() AS DATE)
    `);

        const context = {
            users: usersStats.recordset[0],
            todayAppointments: appointmentsToday.recordset[0],
            currentTime: new Date().toLocaleString('vi-VN')
        };

        const response = await geminiService.chat(message, history || [], context);

        res.json({
            success: true,
            data: {
                response,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('AI Chat Error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi chat với AI',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/ai/report/:type
 * @desc    Tạo báo cáo tự động (daily/weekly/monthly)
 * @access  Private/Admin
 */
router.get('/report/:type', async (req, res) => {
    try {
        const { type } = req.params;

        if (!['daily', 'weekly', 'monthly'].includes(type)) {
            return res.status(400).json({
                success: false,
                message: 'Loại báo cáo không hợp lệ. Chọn: daily, weekly, monthly'
            });
        }

        const pool = await poolPromise;
        const TABLE = process.env.SQL_TABLE_USERS || 'USERS_AUTH';

        // Xác định khoảng thời gian
        let dateFilter = '';
        switch (type) {
            case 'daily':
                dateFilter = 'CAST(thoi_gian_hen AS DATE) = CAST(GETDATE() AS DATE)';
                break;
            case 'weekly':
                dateFilter = 'thoi_gian_hen >= DATEADD(day, -7, GETDATE())';
                break;
            case 'monthly':
                dateFilter = 'thoi_gian_hen >= DATEADD(month, -1, GETDATE())';
                break;
        }

        // Lấy dữ liệu cho báo cáo
        const appointmentsData = await pool.request().query(`
      SELECT 
        COUNT(*) AS total,
        SUM(CASE WHEN trang_thai IN ('completed', 'hoàn thành') THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN trang_thai IN ('cancelled', 'đã hủy') THEN 1 ELSE 0 END) AS cancelled
      FROM LICH_HEN
      WHERE ${dateFilter}
    `);

        const revenueData = await pool.request().query(`
      SELECT 
        COUNT(*) AS transactions,
        ISNULL(SUM(so_tien_benh_nhan_tra), 0) AS total_revenue
      FROM THANH_TOAN
      WHERE (trang_thai = N'đã thanh toán' OR MaTrangThaiTT = 'PAID')
    `);

        const newUsersData = await pool.request().query(`
      SELECT COUNT(*) AS count
      FROM ${TABLE}
      WHERE created_at >= DATEADD(day, -${type === 'daily' ? 1 : type === 'weekly' ? 7 : 30}, GETDATE())
    `);

        const data = {
            period: type,
            appointments: appointmentsData.recordset[0],
            revenue: revenueData.recordset[0],
            newUsers: newUsersData.recordset[0]?.count || 0
        };

        const report = await geminiService.generateReport(type, data);

        res.json({
            success: true,
            data: report
        });
    } catch (error) {
        console.error('AI Report Error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi tạo báo cáo AI',
            error: error.message
        });
    }
});

module.exports = router;
