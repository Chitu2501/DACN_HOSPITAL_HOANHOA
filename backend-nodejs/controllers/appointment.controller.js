const Appointment = require('../models/Appointment.model');
const { validationResult } = require('express-validator');

/**
 * @desc    Tạo lịch hẹn mới (Admin tạo cho bệnh nhân)
 * @route   POST /api/admin/appointments
 * @access  Private/Admin
 */
exports.createAppointment = async (req, res) => {
  try {
    // Kiểm tra validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const {
      patient,           // ID bệnh nhân
      doctor,            // ID bác sĩ
      appointmentDate,   // Ngày hẹn
      timeSlot,          // Giờ khám (vd: "09:00-10:00")
      reason,            // Lý do khám
      symptoms,          // Triệu chứng
      department,        // Khoa khám
      priority          // Mức độ ưu tiên (normal, urgent, emergency)
    } = req.body;

    // Validation: Kiểm tra các trường bắt buộc
    if (!patient || !doctor || !appointmentDate || !timeSlot) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin bắt buộc: bệnh nhân, bác sĩ, ngày hẹn, giờ khám'
      });
    }

    // Kiểm tra xem bác sĩ đã có lịch hẹn vào thời gian này chưa
    const existingAppointment = await Appointment.findOne({
      doctor,
      appointmentDate: new Date(appointmentDate),
      timeSlot,
      status: { $nin: ['cancelled'] } // Không tính lịch đã hủy
    });

    if (existingAppointment) {
      return res.status(400).json({
        success: false,
        message: 'Bác sĩ đã có lịch hẹn vào thời gian này'
      });
    }

    // Tạo lịch hẹn mới
    const appointment = await Appointment.create({
      patient,
      doctor,
      appointmentDate: new Date(appointmentDate),
      timeSlot,
      reason: reason || 'Khám bệnh',
      symptoms,
      department,
      priority: priority || 'normal',
      status: 'confirmed', // Admin tạo thì tự động confirmed
      createdBy: req.user._id
    });

    // Populate thông tin bệnh nhân và bác sĩ
    const populatedAppointment = await Appointment.findById(appointment._id)
      .populate('patient', 'fullName email phone')
      .populate('doctor', 'fullName specialization department')
      .populate('department', 'name code');

    res.status(201).json({
      success: true,
      message: 'Tạo lịch hẹn thành công',
      data: populatedAppointment
    });
  } catch (error) {
    console.error('Create appointment error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo lịch hẹn',
      error: error.message
    });
  }
};

/**
 * @desc    Lấy danh sách lịch hẹn (có filter)
 * @route   GET /api/admin/appointments
 * @access  Private/Admin
 */
exports.getAllAppointments = async (req, res) => {
  try {
    const {
      status,           // Lọc theo trạng thái
      doctor,           // Lọc theo bác sĩ
      patient,          // Lọc theo bệnh nhân
      department,       // Lọc theo khoa
      startDate,        // Từ ngày
      endDate,          // Đến ngày
      page = 1,         // Trang hiện tại
      limit = 10        // Số lượng mỗi trang
    } = req.query;

    // Xây dựng query filter
    let query = {};

    if (status) {
      query.status = status;
    }

    if (doctor) {
      query.doctor = doctor;
    }

    if (patient) {
      query.patient = patient;
    }

    if (department) {
      query.department = department;
    }

    // Lọc theo khoảng thời gian
    if (startDate || endDate) {
      query.appointmentDate = {};
      if (startDate) {
        query.appointmentDate.$gte = new Date(startDate);
      }
      if (endDate) {
        query.appointmentDate.$lte = new Date(endDate);
      }
    }

    // Tính toán pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Lấy danh sách lịch hẹn
    const appointments = await Appointment.find(query)
      .populate('patient', 'fullName email phone address dateOfBirth gender')
      .populate('doctor', 'fullName specialization department phone')
      .populate('department', 'name code')
      .populate('createdBy', 'fullName')
      .sort({ appointmentDate: -1, timeSlot: 1 }) // Sắp xếp theo ngày giảm dần
      .skip(skip)
      .limit(parseInt(limit));

    // Đếm tổng số
    const total = await Appointment.countDocuments(query);

    res.status(200).json({
      success: true,
      count: appointments.length,
      data: appointments,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get appointments error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách lịch hẹn',
      error: error.message
    });
  }
};

/**
 * @desc    Duyệt/Từ chối lịch hẹn
 * @route   PUT /api/admin/appointments/:id/status
 * @access  Private/Admin
 */
exports.updateAppointmentStatus = async (req, res) => {
  try {
    const { status, note } = req.body;

    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy lịch hẹn'
      });
    }

    // Cập nhật trạng thái
    appointment.status = status;
    if (note) {
      appointment.notes = note;
    }

    await appointment.save();

    const updatedAppointment = await Appointment.findById(appointment._id)
      .populate('patient', 'fullName email phone')
      .populate('doctor', 'fullName specialization');

    res.status(200).json({
      success: true,
      message: 'Cập nhật trạng thái thành công',
      data: updatedAppointment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật trạng thái',
      error: error.message
    });
  }
};

/**
 * @desc    Chỉnh sửa lịch hẹn (thay đổi bác sĩ, giờ khám)
 * @route   PUT /api/admin/appointments/:id
 * @access  Private/Admin
 */
exports.updateAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy lịch hẹn'
      });
    }

    const {
      doctor,
      appointmentDate,
      timeSlot,
      status,
      notes
    } = req.body;

    // Nếu thay đổi bác sĩ hoặc thời gian, kiểm tra trùng lịch
    if ((doctor && doctor !== appointment.doctor.toString()) || 
        (appointmentDate && new Date(appointmentDate).getTime() !== appointment.appointmentDate.getTime()) ||
        (timeSlot && timeSlot !== appointment.timeSlot)) {
      
      const existingAppointment = await Appointment.findOne({
        _id: { $ne: req.params.id },
        doctor: doctor || appointment.doctor,
        appointmentDate: new Date(appointmentDate || appointment.appointmentDate),
        timeSlot: timeSlot || appointment.timeSlot,
        status: { $nin: ['cancelled'] }
      });

      if (existingAppointment) {
        return res.status(400).json({
          success: false,
          message: 'Bác sĩ đã có lịch hẹn vào thời gian này'
        });
      }
    }

    // Cập nhật các trường
    if (doctor) appointment.doctor = doctor;
    if (appointmentDate) appointment.appointmentDate = new Date(appointmentDate);
    if (timeSlot) appointment.timeSlot = timeSlot;
    if (status) appointment.status = status;
    if (notes) appointment.notes = notes;

    await appointment.save();

    const updatedAppointment = await Appointment.findById(appointment._id)
      .populate('patient', 'fullName email phone')
      .populate('doctor', 'fullName specialization department');

    res.status(200).json({
      success: true,
      message: 'Cập nhật lịch hẹn thành công',
      data: updatedAppointment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật lịch hẹn',
      error: error.message
    });
  }
};

/**
 * @desc    Thống kê lịch hẹn
 * @route   GET /api/admin/appointments/statistics
 * @access  Private/Admin
 */
exports.getAppointmentStatistics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter.appointmentDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Thống kê theo trạng thái
    const statusStats = await Appointment.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Top bác sĩ nhiều lịch khám nhất
    const topDoctors = await Appointment.aggregate([
      { $match: { ...dateFilter, status: { $ne: 'cancelled' } } },
      {
        $group: {
          _id: '$doctor',
          totalAppointments: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          }
        }
      },
      { $sort: { totalAppointments: -1 } },
      { $limit: 10 },
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
          doctorId: '$_id',
          doctorName: '$doctorInfo.fullName',
          specialization: '$doctorInfo.specialization',
          totalAppointments: 1,
          completed: 1
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        byStatus: statusStats,
        topDoctors: topDoctors
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thống kê',
      error: error.message
    });
  }
};

