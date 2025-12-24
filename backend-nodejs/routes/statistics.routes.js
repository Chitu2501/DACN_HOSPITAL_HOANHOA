const express = require('express');
const router = express.Router();
const statisticsController = require('../controllers/statistics.controller');
const { protect, isAdmin } = require('../middleware/auth.middleware');
const { poolPromise } = require('../database/db-config');

// Apply authentication and admin authorization to all routes
router.use(protect);
router.use(isAdmin);

// @route   GET /api/statistics/dashboard
// @desc    Get dashboard statistics from SQL Server
// @access  Private/Admin
router.get('/dashboard', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const pool = await poolPromise;
    const TABLE = process.env.SQL_TABLE_USERS || 'USERS_AUTH';

    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    // Build date filters
    let userDateFilter = '';
    let appointmentDateFilter = '';
    let revenueDateFilter = '';
    let medicalRecordDateFilter = '';

    if (startDate && endDate) {
      userDateFilter = `AND CAST(created_at AS DATE) BETWEEN '${startDate}' AND '${endDate}'`;
      appointmentDateFilter = `AND CAST(thoi_gian_hen AS DATE) BETWEEN '${startDate}' AND '${endDate}'`;
      revenueDateFilter = `AND CAST(ngay_thanh_toan AS DATE) BETWEEN '${startDate}' AND '${endDate}'`;
      medicalRecordDateFilter = `AND CAST(ngay_kham AS DATE) BETWEEN '${startDate}' AND '${endDate}'`;
    }

    // 1. User Statistics
    const usersStats = await pool.request().query(`
      SELECT 
        COUNT(*) AS total,
        SUM(CASE WHEN role = 'patient' THEN 1 ELSE 0 END) AS patients,
        SUM(CASE WHEN role = 'doctor' THEN 1 ELSE 0 END) AS doctors,
        SUM(CASE WHEN role = 'nurse' THEN 1 ELSE 0 END) AS nurses,
        SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) AS admins,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS active
      FROM ${TABLE}
      WHERE 1=1 ${userDateFilter}
    `);

    const userStats = usersStats.recordset[0] || {};

    // Users by role for pie chart
    const usersByRole = await pool.request().query(`
      SELECT 
        role,
        COUNT(*) AS total,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS active
      FROM ${TABLE}
      WHERE 1=1 ${userDateFilter}
      GROUP BY role
    `);

    // 2. Appointment Statistics (from LICH_HEN)
    const appointmentsStats = await pool.request().query(`
      SELECT 
        COUNT(*) AS total,
        SUM(CASE WHEN trang_thai IN ('pending', 'chờ khám') THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN trang_thai IN ('confirmed', 'đã xác nhận') THEN 1 ELSE 0 END) AS confirmed,
        SUM(CASE WHEN trang_thai IN ('completed', 'hoàn thành', 'done') THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN trang_thai IN ('cancelled', 'huy', 'đã hủy') THEN 1 ELSE 0 END) AS cancelled
      FROM LICH_HEN
      WHERE 1=1 ${appointmentDateFilter}
    `);

    const appointmentStats = appointmentsStats.recordset[0] || {};

    // Appointments today
    const appointmentsToday = await pool.request()
      .input('today_start', todayStart)
      .input('today_end', todayEnd)
      .query(`
        SELECT COUNT(*) AS count
        FROM LICH_HEN
        WHERE CAST(thoi_gian_hen AS DATE) = CAST(@today_start AS DATE)
          AND trang_thai NOT IN ('cancelled', 'huy', 'đã hủy')
      `);

    // 3. Revenue Statistics (from THANH_TOAN)
    // Tính tổng tiền từ so_tien_benh_nhan_tra (số tiền bệnh nhân thực sự trả)
    const revenueStats = await pool.request().query(`
      SELECT 
        COUNT(*) AS total_payments,
        ISNULL(SUM(so_tien_benh_nhan_tra), 0) AS total_revenue
      FROM THANH_TOAN
      WHERE (
        trang_thai = N'đã thanh toán' OR 
        trang_thai = 'PAID' OR 
        trang_thai = 'paid' OR
        MaTrangThaiTT = 'PAID' OR
        MaTrangThaiTT = N'đã thanh toán'
      )
      ${revenueDateFilter}
    `);

    const revenue = revenueStats.recordset[0] || {};

    // Revenue by payment method
    const revenueByMethod = await pool.request().query(`
      SELECT 
        MaPTTT AS payment_method,
        COUNT(*) AS count,
        ISNULL(SUM(so_tien_benh_nhan_tra), 0) AS revenue
      FROM THANH_TOAN
      WHERE (
        trang_thai = N'đã thanh toán' OR 
        trang_thai = 'PAID' OR 
        trang_thai = 'paid' OR
        MaTrangThaiTT = 'PAID' OR
        MaTrangThaiTT = N'đã thanh toán'
      )
      ${revenueDateFilter}
      GROUP BY MaPTTT
    `);

    // 4. Medical Records Statistics (from HO_SO_KHAM)
    const medicalRecordsStats = await pool.request().query(`
      SELECT 
        COUNT(*) AS total,
        SUM(CASE WHEN trang_thai IN ('completed', 'hoàn thành', 'done') THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN trang_thai IN ('in_progress', 'đang xử lý') THEN 1 ELSE 0 END) AS in_progress
      FROM HO_SO_KHAM
      WHERE 1=1 ${medicalRecordDateFilter}
    `);

    // 5. Recent Users (last 5)
    const recentUsers = await pool.request().query(`
      SELECT TOP 5
        id,
        username,
        full_name AS fullName,
        email,
        role,
        created_at AS createdAt
      FROM ${TABLE}
      ORDER BY created_at DESC
    `);

    // 6. Recent Appointments (last 5)
    const recentAppointments = await pool.request().query(`
      SELECT TOP 5
        lh.ma_lich_hen AS _id,
        lh.thoi_gian_hen AS appointmentDate,
        lh.trang_thai AS status,
        bn.ten_benh_nhan AS patient_name,
        bs.ten_bac_si AS doctor_name
      FROM LICH_HEN lh
      LEFT JOIN BENH_NHAN bn ON lh.ma_benh_nhan = bn.ma_benh_nhan
      LEFT JOIN CA_BAC_SI ca ON lh.ma_ca = ca.ma_ca
      LEFT JOIN BAC_SI bs ON ca.ma_bac_si = bs.ma_bac_si
      ORDER BY lh.thoi_gian_hen DESC
    `);

    // Format recent users
    const formattedRecentUsers = recentUsers.recordset.map(user => ({
      _id: user.id,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt
    }));

    // Format recent appointments
    const formattedRecentAppointments = recentAppointments.recordset.map(apt => ({
      _id: apt._id,
      appointmentDate: apt.appointmentDate,
      status: apt.status,
      patient: {
        fullName: apt.patient_name || 'Bệnh nhân'
      },
      doctor: {
        fullName: apt.doctor_name || 'Bác sĩ'
      }
    }));

    // Format users by role
    const formattedUsersByRole = usersByRole.recordset.map(item => ({
      role: item.role,
      total: item.total,
      active: item.active
    }));

    res.json({
      success: true,
      data: {
        users: {
          total: parseInt(userStats.total) || 0,
          patients: parseInt(userStats.patients) || 0,
          doctors: parseInt(userStats.doctors) || 0,
          nurses: parseInt(userStats.nurses) || 0,
          admins: parseInt(userStats.admins) || 0,
          active: parseInt(userStats.active) || 0,
          byRole: formattedUsersByRole
        },
        appointments: {
          total: parseInt(appointmentStats.total) || 0,
          pending: parseInt(appointmentStats.pending) || 0,
          confirmed: parseInt(appointmentStats.confirmed) || 0,
          completed: parseInt(appointmentStats.completed) || 0,
          cancelled: parseInt(appointmentStats.cancelled) || 0,
          today: parseInt(appointmentsToday.recordset[0]?.count) || 0
        },
        revenue: {
          total: parseFloat(revenue.total_revenue) || 0,
          paidAppointments: parseInt(revenue.total_payments) || 0,
          byPaymentMethod: revenueByMethod.recordset.map(item => {
            // Map payment method codes to readable names
            let methodName = item.payment_method || 'unknown';
            if (methodName === 'MOMO' || methodName === 'momo') {
              methodName = 'MoMo';
            } else if (methodName === 'CASH' || methodName === 'cash') {
              methodName = 'Tiền mặt';
            } else if (methodName === 'CARD' || methodName === 'card') {
              methodName = 'Thẻ';
            } else if (methodName === 'BANK_TRANSFER' || methodName === 'bank_transfer') {
              methodName = 'Chuyển khoản';
            }

            return {
              _id: item.payment_method || 'unknown',
              paymentMethod: methodName,
              revenue: parseFloat(item.revenue) || 0,
              count: parseInt(item.count) || 0
            };
          })
        },
        medicalRecords: {
          total: parseInt(medicalRecordsStats.recordset[0]?.total) || 0,
          completed: parseInt(medicalRecordsStats.recordset[0]?.completed) || 0,
          inProgress: parseInt(medicalRecordsStats.recordset[0]?.in_progress) || 0
        },
        recent: {
          users: formattedRecentUsers,
          appointments: formattedRecentAppointments
        }
      }
    });
  } catch (err) {
    console.error('❌ SQL dashboard stats error:', err.message);
    console.error('Error stack:', err.stack);
    res.status(500).json({
      success: false,
      message: err.message || 'Lỗi khi lấy thống kê dashboard',
      error: process.env.NODE_ENV === 'development' ? {
        message: err.message,
        code: err.code,
        number: err.number
      } : undefined
    });
  }
});

// @route   GET /api/statistics/revenue
// @desc    Get revenue statistics
// @access  Private/Admin
router.get('/revenue', statisticsController.getRevenueStats);

// @route   GET /api/statistics/appointments
// @desc    Get appointment statistics
// @access  Private/Admin
router.get('/appointments', statisticsController.getAppointmentStats);

// @route   GET /api/statistics/preview
// @desc    Preview report data before exporting to Excel
// @access  Private/Admin
router.get('/preview', async (req, res) => {
  try {
    const { startDate, endDate, reportType = 'full' } = req.query;
    const pool = await poolPromise;
    const TABLE = process.env.SQL_TABLE_USERS || 'USERS_AUTH';
    const moment = require('moment');

    // Build date filters
    let userDateFilter = '';
    let revenueDateFilter = '';
    if (startDate && endDate) {
      userDateFilter = `AND CAST(created_at AS DATE) BETWEEN '${startDate}' AND '${endDate}'`;
      revenueDateFilter = `AND CAST(thanh_toan_luc AS DATE) BETWEEN '${startDate}' AND '${endDate}'`;
    }

    const result = {
      reportType,
      startDate,
      endDate,
      generatedAt: new Date().toISOString()
    };

    // ============ USER PREVIEW ============
    if (reportType === 'full' || reportType === 'users') {
      const usersResult = await pool.request().query(`
        SELECT 
          id,
          username,
          full_name,
          email,
          phone,
          role,
          is_active,
          created_at
        FROM ${TABLE}
        WHERE 1=1 ${userDateFilter}
        ORDER BY created_at DESC
      `);

      const roleMap = {
        'admin': 'Quản trị viên',
        'doctor': 'Bác sĩ',
        'nurse': 'Y tá',
        'patient': 'Bệnh nhân'
      };

      result.users = {
        data: usersResult.recordset.map((user, index) => ({
          stt: index + 1,
          username: user.username || 'N/A',
          fullName: user.full_name || 'N/A',
          email: user.email || 'N/A',
          phone: user.phone || 'N/A',
          role: roleMap[user.role] || user.role,
          status: user.is_active ? 'Hoạt động' : 'Không hoạt động',
          createdAt: user.created_at ? moment(user.created_at).format('DD/MM/YYYY HH:mm') : 'N/A'
        })),
        total: usersResult.recordset.length,
        columns: ['STT', 'Tên đăng nhập', 'Họ và tên', 'Email', 'Số điện thoại', 'Vai trò', 'Trạng thái', 'Ngày tạo']
      };

      // Count by role
      const roleStats = await pool.request().query(`
        SELECT role, COUNT(*) as count
        FROM ${TABLE}
        WHERE 1=1 ${userDateFilter}
        GROUP BY role
      `);

      result.users.byRole = roleStats.recordset.map(stat => ({
        role: roleMap[stat.role] || stat.role,
        count: stat.count
      }));
    }

    // ============ REVENUE PREVIEW ============
    if (reportType === 'full' || reportType === 'revenue') {
      const revenueResult = await pool.request().query(`
        SELECT 
          CAST(thanh_toan_luc AS DATE) as payment_date,
          COUNT(*) as transaction_count,
          ISNULL(SUM(so_tien_benh_nhan_tra), 0) as total_revenue
        FROM THANH_TOAN
        WHERE (
          trang_thai = N'đã thanh toán' OR 
          trang_thai = 'PAID' OR 
          trang_thai = 'paid' OR
          MaTrangThaiTT = 'PAID' OR
          MaTrangThaiTT = N'đã thanh toán'
        )
        AND thanh_toan_luc IS NOT NULL
        ${revenueDateFilter}
        GROUP BY CAST(thanh_toan_luc AS DATE)
        ORDER BY CAST(thanh_toan_luc AS DATE) DESC
      `);

      let grandTotal = 0;
      let totalTransactions = 0;

      const revenueData = revenueResult.recordset.map((row, index) => {
        grandTotal += parseFloat(row.total_revenue) || 0;
        totalTransactions += parseInt(row.transaction_count) || 0;
        return {
          stt: index + 1,
          date: row.payment_date ? moment(row.payment_date).format('DD/MM/YYYY') : 'N/A',
          transactions: row.transaction_count,
          revenue: parseFloat(row.total_revenue) || 0
        };
      });

      result.revenue = {
        data: revenueData,
        total: revenueResult.recordset.length,
        grandTotal,
        totalTransactions,
        avgPerTransaction: totalTransactions > 0 ? Math.round(grandTotal / totalTransactions) : 0,
        columns: ['STT', 'Ngày', 'Số giao dịch', 'Tổng doanh thu (VNĐ)']
      };
    }

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ Preview error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tải dữ liệu xem trước',
      error: error.message
    });
  }
});

// @route   GET /api/statistics/export
// @desc    Export statistics report to Excel (SQL Server based)
// @access  Private/Admin
router.get('/export', async (req, res) => {
  try {
    const { startDate, endDate, reportType = 'full' } = req.query;
    const pool = await poolPromise;
    const TABLE = process.env.SQL_TABLE_USERS || 'USERS_AUTH';
    const ExcelJS = require('exceljs');
    const moment = require('moment');

    // Create a new workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Hospital Management System';
    workbook.created = new Date();

    // Build date filters
    let userDateFilter = '';
    let revenueDateFilter = '';
    if (startDate && endDate) {
      userDateFilter = `AND CAST(created_at AS DATE) BETWEEN '${startDate}' AND '${endDate}'`;
      revenueDateFilter = `AND CAST(thanh_toan_luc AS DATE) BETWEEN '${startDate}' AND '${endDate}'`;
    }

    // ============ USER REPORT ============
    if (reportType === 'full' || reportType === 'users') {
      const userSheet = workbook.addWorksheet('Báo cáo Người dùng');

      // Header columns - Vietnamese
      userSheet.columns = [
        { header: 'STT', key: 'stt', width: 8 },
        { header: 'Tên đăng nhập', key: 'username', width: 20 },
        { header: 'Họ và tên', key: 'fullName', width: 30 },
        { header: 'Email', key: 'email', width: 35 },
        { header: 'Số điện thoại', key: 'phone', width: 15 },
        { header: 'Vai trò', key: 'role', width: 15 },
        { header: 'Trạng thái', key: 'status', width: 15 },
        { header: 'Ngày tạo', key: 'createdAt', width: 20 }
      ];

      // Style header
      userSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      userSheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' }
      };
      userSheet.getRow(1).alignment = { horizontal: 'center' };

      // Fetch ALL users from SQL Server
      const usersResult = await pool.request().query(`
        SELECT 
          id,
          username,
          full_name,
          email,
          phone,
          role,
          is_active,
          created_at
        FROM ${TABLE}
        WHERE 1=1 ${userDateFilter}
        ORDER BY created_at DESC
      `);

      // Add data rows
      usersResult.recordset.forEach((user, index) => {
        const roleMap = {
          'admin': 'Quản trị viên',
          'doctor': 'Bác sĩ',
          'nurse': 'Y tá',
          'patient': 'Bệnh nhân'
        };

        userSheet.addRow({
          stt: index + 1,
          username: user.username || 'N/A',
          fullName: user.full_name || 'N/A',
          email: user.email || 'N/A',
          phone: user.phone || 'N/A',
          role: roleMap[user.role] || user.role,
          status: user.is_active ? 'Hoạt động' : 'Không hoạt động',
          createdAt: user.created_at ? moment(user.created_at).format('DD/MM/YYYY HH:mm') : 'N/A'
        });
      });

      // Summary section
      userSheet.addRow([]);
      const summaryRow = userSheet.addRow(['THỐNG KÊ TỔNG HỢP']);
      summaryRow.font = { bold: true, size: 14 };
      summaryRow.getCell(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE2EFDA' }
      };

      // Count by role
      const roleStats = await pool.request().query(`
        SELECT role, COUNT(*) as count
        FROM ${TABLE}
        WHERE 1=1 ${userDateFilter}
        GROUP BY role
      `);

      roleStats.recordset.forEach(stat => {
        const roleMap = {
          'admin': 'Quản trị viên',
          'doctor': 'Bác sĩ',
          'nurse': 'Y tá',
          'patient': 'Bệnh nhân'
        };
        userSheet.addRow([`Tổng ${roleMap[stat.role] || stat.role}:`, stat.count]);
      });

      userSheet.addRow(['Tổng cộng người dùng:', usersResult.recordset.length]);
    }

    // ============ REVENUE REPORT ============
    if (reportType === 'full' || reportType === 'revenue') {
      const revenueSheet = workbook.addWorksheet('Báo cáo Doanh thu');

      // Header for daily revenue
      revenueSheet.columns = [
        { header: 'STT', key: 'stt', width: 8 },
        { header: 'Ngày', key: 'date', width: 15 },
        { header: 'Số giao dịch', key: 'transactions', width: 15 },
        { header: 'Tổng doanh thu (VNĐ)', key: 'revenue', width: 25 }
      ];

      // Style header
      revenueSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      revenueSheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF70AD47' }
      };
      revenueSheet.getRow(1).alignment = { horizontal: 'center' };

      // Fetch daily revenue from THANH_TOAN
      const revenueResult = await pool.request().query(`
        SELECT 
          CAST(thanh_toan_luc AS DATE) as payment_date,
          COUNT(*) as transaction_count,
          ISNULL(SUM(so_tien_benh_nhan_tra), 0) as total_revenue
        FROM THANH_TOAN
        WHERE (
          trang_thai = N'đã thanh toán' OR 
          trang_thai = 'PAID' OR 
          trang_thai = 'paid' OR
          MaTrangThaiTT = 'PAID' OR
          MaTrangThaiTT = N'đã thanh toán'
        )
        AND thanh_toan_luc IS NOT NULL
        ${revenueDateFilter}
        GROUP BY CAST(thanh_toan_luc AS DATE)
        ORDER BY CAST(thanh_toan_luc AS DATE) DESC
      `);

      let grandTotal = 0;
      let totalTransactions = 0;

      // Add data rows
      revenueResult.recordset.forEach((row, index) => {
        revenueSheet.addRow({
          stt: index + 1,
          date: row.payment_date ? moment(row.payment_date).format('DD/MM/YYYY') : 'N/A',
          transactions: row.transaction_count,
          revenue: parseFloat(row.total_revenue) || 0
        });
        grandTotal += parseFloat(row.total_revenue) || 0;
        totalTransactions += parseInt(row.transaction_count) || 0;
      });

      // Format revenue column as number
      revenueSheet.getColumn('revenue').numFmt = '#,##0';

      // Summary section
      revenueSheet.addRow([]);
      const summaryRow = revenueSheet.addRow(['TỔNG KẾT DOANH THU']);
      summaryRow.font = { bold: true, size: 14 };
      summaryRow.getCell(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE2EFDA' }
      };

      revenueSheet.addRow(['Tổng số ngày có doanh thu:', revenueResult.recordset.length]);
      revenueSheet.addRow(['Tổng số giao dịch:', totalTransactions]);

      const totalRow = revenueSheet.addRow(['TỔNG DOANH THU:', grandTotal]);
      totalRow.font = { bold: true, size: 12 };
      totalRow.getCell(2).numFmt = '#,##0 "VNĐ"';

      if (totalTransactions > 0) {
        const avgRow = revenueSheet.addRow(['Doanh thu trung bình/giao dịch:', Math.round(grandTotal / totalTransactions)]);
        avgRow.getCell(2).numFmt = '#,##0 "VNĐ"';
      }
    }

    // Set response headers
    const filename = `bao-cao-${reportType}-${moment().format('DD-MM-YYYY')}.xlsx`;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=${filename}`
    );

    // Write to response
    await workbook.xlsx.write(res);
    res.end();

    console.log(`✅ Exported ${reportType} report successfully`);
  } catch (error) {
    console.error('❌ Export report error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xuất báo cáo Excel',
      error: error.message
    });
  }
});

module.exports = router;
