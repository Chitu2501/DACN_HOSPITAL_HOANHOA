const User = require('../models/User.model');
const Appointment = require('../models/Appointment.model');
const moment = require('moment');
const ExcelJS = require('exceljs');

// @desc    Get dashboard statistics
// @route   GET /api/statistics/dashboard
// @access  Private/Admin
exports.getDashboardStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Build date filter
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    }

    // User statistics
    const totalUsers = await User.countDocuments();
    const totalPatients = await User.countDocuments({ role: 'patient' });
    const totalDoctors = await User.countDocuments({ role: 'doctor' });
    const totalNurses = await User.countDocuments({ role: 'nurse' });
    const activeUsers = await User.countDocuments({ isActive: true });

    // Appointment statistics
    const totalAppointments = await Appointment.countDocuments(dateFilter);
    const pendingAppointments = await Appointment.countDocuments({ status: 'pending', ...dateFilter });
    const confirmedAppointments = await Appointment.countDocuments({ status: 'confirmed', ...dateFilter });
    const completedAppointments = await Appointment.countDocuments({ status: 'completed', ...dateFilter });
    const cancelledAppointments = await Appointment.countDocuments({ status: 'cancelled', ...dateFilter });

    // Revenue statistics
    const revenueData = await Appointment.aggregate([
      {
        $match: { isPaid: true, ...dateFilter }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$fee' },
          totalPaidAppointments: { $sum: 1 }
        }
      }
    ]);

    const totalRevenue = revenueData.length > 0 ? revenueData[0].totalRevenue : 0;
    const paidAppointments = revenueData.length > 0 ? revenueData[0].totalPaidAppointments : 0;

    // Revenue by payment method
    const revenueByMethod = await Appointment.aggregate([
      {
        $match: { isPaid: true, ...dateFilter }
      },
      {
        $group: {
          _id: '$paymentMethod',
          revenue: { $sum: '$fee' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Recent new users
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('username fullName role createdAt');

    // Recent appointments
    const recentAppointments = await Appointment.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('patient', 'fullName email')
      .populate('doctor', 'fullName specialization');

    res.status(200).json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          patients: totalPatients,
          doctors: totalDoctors,
          nurses: totalNurses,
          active: activeUsers
        },
        appointments: {
          total: totalAppointments,
          pending: pendingAppointments,
          confirmed: confirmedAppointments,
          completed: completedAppointments,
          cancelled: cancelledAppointments
        },
        revenue: {
          total: totalRevenue,
          paidAppointments: paidAppointments,
          byPaymentMethod: revenueByMethod
        },
        recent: {
          users: recentUsers,
          appointments: recentAppointments
        }
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard statistics',
      error: error.message
    });
  }
};

// @desc    Get revenue statistics with date range
// @route   GET /api/statistics/revenue
// @access  Private/Admin
exports.getRevenueStats = async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;

    // Build date filter
    let dateFilter = {
      isPaid: true
    };

    if (startDate && endDate) {
      dateFilter.paidAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Group by format
    let groupFormat;
    switch (groupBy) {
      case 'month':
        groupFormat = { $dateToString: { format: '%Y-%m', date: '$paidAt' } };
        break;
      case 'year':
        groupFormat = { $dateToString: { format: '%Y', date: '$paidAt' } };
        break;
      default:
        groupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$paidAt' } };
    }

    // Revenue by date
    const revenueByDate = await Appointment.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: groupFormat,
          revenue: { $sum: '$fee' },
          appointments: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Revenue by doctor
    const revenueByDoctor = await Appointment.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$doctor',
          revenue: { $sum: '$fee' },
          appointments: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'doctorInfo'
        }
      },
      { $unwind: '$doctorInfo' },
      {
        $project: {
          _id: 0,
          doctorId: '$_id',
          doctorName: '$doctorInfo.fullName',
          specialization: '$doctorInfo.specialization',
          revenue: 1,
          appointments: 1
        }
      },
      { $sort: { revenue: -1 } }
    ]);

    // Total revenue
    const totalStats = await Appointment.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$fee' },
          totalAppointments: { $sum: 1 },
          averageRevenue: { $avg: '$fee' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        summary: totalStats.length > 0 ? totalStats[0] : {
          totalRevenue: 0,
          totalAppointments: 0,
          averageRevenue: 0
        },
        byDate: revenueByDate,
        byDoctor: revenueByDoctor
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching revenue statistics',
      error: error.message
    });
  }
};

// @desc    Export statistics report to Excel
// @route   GET /api/statistics/export
// @access  Private/Admin
exports.exportReport = async (req, res) => {
  try {
    const { startDate, endDate, reportType = 'full' } = req.query;

    // Build date filter
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Create a new workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Hospital Management System';
    workbook.created = new Date();

    // User Statistics Sheet
    if (reportType === 'full' || reportType === 'users') {
      const userSheet = workbook.addWorksheet('User Statistics');
      
      // Header
      userSheet.columns = [
        { header: 'Username', key: 'username', width: 20 },
        { header: 'Full Name', key: 'fullName', width: 25 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Role', key: 'role', width: 15 },
        { header: 'Phone', key: 'phone', width: 15 },
        { header: 'Department', key: 'department', width: 20 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Created At', key: 'createdAt', width: 20 }
      ];

      // Style header
      userSheet.getRow(1).font = { bold: true };
      userSheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' }
      };

      // Fetch users
      const users = await User.find(dateFilter).select('-password').sort({ createdAt: -1 });

      // Add data
      users.forEach(user => {
        userSheet.addRow({
          username: user.username,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          phone: user.phone || 'N/A',
          department: user.department || 'N/A',
          status: user.isActive ? 'Active' : 'Inactive',
          createdAt: moment(user.createdAt).format('YYYY-MM-DD HH:mm')
        });
      });

      // Add summary
      userSheet.addRow([]);
      const summaryRow = userSheet.addRow(['SUMMARY']);
      summaryRow.font = { bold: true };
      
      const roleStats = await User.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: '$role',
            count: { $sum: 1 }
          }
        }
      ]);

      roleStats.forEach(stat => {
        userSheet.addRow([`Total ${stat._id}s:`, stat.count]);
      });
    }

    // Appointment & Revenue Sheet
    if (reportType === 'full' || reportType === 'revenue') {
      const revenueSheet = workbook.addWorksheet('Revenue Report');
      
      // Header
      revenueSheet.columns = [
        { header: 'Date', key: 'date', width: 20 },
        { header: 'Patient', key: 'patient', width: 25 },
        { header: 'Doctor', key: 'doctor', width: 25 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Payment Method', key: 'paymentMethod', width: 18 },
        { header: 'Fee (VNĐ)', key: 'fee', width: 15 },
        { header: 'Paid', key: 'isPaid', width: 10 },
        { header: 'Paid At', key: 'paidAt', width: 20 }
      ];

      // Style header
      revenueSheet.getRow(1).font = { bold: true };
      revenueSheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF70AD47' }
      };

      // Fetch appointments
      const appointments = await Appointment.find(dateFilter)
        .populate('patient', 'fullName')
        .populate('doctor', 'fullName')
        .sort({ appointmentDate: -1 });

      let totalRevenue = 0;
      let totalPaid = 0;

      // Add data
      appointments.forEach(apt => {
        revenueSheet.addRow({
          date: moment(apt.appointmentDate).format('YYYY-MM-DD'),
          patient: apt.patient?.fullName || 'N/A',
          doctor: apt.doctor?.fullName || 'N/A',
          status: apt.status,
          paymentMethod: apt.paymentMethod || 'N/A',
          fee: apt.fee,
          isPaid: apt.isPaid ? 'Yes' : 'No',
          paidAt: apt.paidAt ? moment(apt.paidAt).format('YYYY-MM-DD HH:mm') : 'N/A'
        });

        if (apt.isPaid) {
          totalRevenue += apt.fee;
          totalPaid++;
        }
      });

      // Add summary
      revenueSheet.addRow([]);
      const summaryRow = revenueSheet.addRow(['REVENUE SUMMARY']);
      summaryRow.font = { bold: true, size: 14 };
      
      revenueSheet.addRow(['Total Appointments:', appointments.length]);
      revenueSheet.addRow(['Total Paid Appointments:', totalPaid]);
      revenueSheet.addRow(['Total Revenue (VNĐ):', totalRevenue]);
      revenueSheet.addRow(['Average Revenue per Appointment:', totalPaid > 0 ? (totalRevenue / totalPaid).toFixed(2) : 0]);
    }

    // Set response headers
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=hospital-report-${moment().format('YYYY-MM-DD')}.xlsx`
    );

    // Write to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting report',
      error: error.message
    });
  }
};

// @desc    Get appointment statistics
// @route   GET /api/statistics/appointments
// @access  Private/Admin
exports.getAppointmentStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Build date filter
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter.appointmentDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Status distribution
    const statusStats = await Appointment.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Appointments by doctor
    const doctorStats = await Appointment.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$doctor',
          totalAppointments: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'doctorInfo'
        }
      },
      { $unwind: '$doctorInfo' },
      {
        $project: {
          _id: 0,
          doctorId: '$_id',
          doctorName: '$doctorInfo.fullName',
          specialization: '$doctorInfo.specialization',
          totalAppointments: 1,
          completed: 1
        }
      },
      { $sort: { totalAppointments: -1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        byStatus: statusStats,
        byDoctor: doctorStats
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching appointment statistics',
      error: error.message
    });
  }
};

