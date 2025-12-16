const MedicalRecord = require('../models/MedicalRecord.model');
const { validationResult } = require('express-validator');

/**
 * @desc    Lấy danh sách hồ sơ bệnh án
 * @route   GET /api/admin/medical-records
 * @access  Private/Admin
 */
exports.getAllMedicalRecords = async (req, res) => {
  try {
    const {
      patient,          // Lọc theo bệnh nhân
      doctor,           // Lọc theo bác sĩ
      department,       // Lọc theo khoa
      status,           // Lọc theo trạng thái (in_progress, completed, cancelled)
      startDate,        // Từ ngày
      endDate,          // Đến ngày
      search,           // Tìm kiếm theo mã hồ sơ, tên bệnh nhân
      page = 1,
      limit = 10
    } = req.query;

    // Xây dựng query filter
    let query = {};

    if (patient) {
      query.patient = patient;
    }

    if (doctor) {
      query.doctor = doctor;
    }

    if (department) {
      query.department = department;
    }

    if (status) {
      query.status = status;
    }

    // Lọc theo khoảng thời gian khám
    if (startDate || endDate) {
      query.visitDate = {};
      if (startDate) {
        query.visitDate.$gte = new Date(startDate);
      }
      if (endDate) {
        query.visitDate.$lte = new Date(endDate);
      }
    }

    // Tìm kiếm theo mã hồ sơ
    if (search) {
      query.$or = [
        { recordNumber: { $regex: search, $options: 'i' } },
        { diagnosis: { $regex: search, $options: 'i' } }
      ];
    }

    // Tính toán pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Lấy danh sách hồ sơ
    const records = await MedicalRecord.find(query)
      .populate('patient', 'fullName email phone dateOfBirth gender address')
      .populate('doctor', 'fullName specialization department phone')
      .populate('department', 'name code')
      .populate('appointment', 'appointmentDate timeSlot')
      .populate('createdBy', 'fullName')
      .populate('lastUpdatedBy', 'fullName')
      .sort({ visitDate: -1 }) // Sắp xếp theo ngày khám giảm dần
      .skip(skip)
      .limit(parseInt(limit));

    // Đếm tổng số
    const total = await MedicalRecord.countDocuments(query);

    res.status(200).json({
      success: true,
      count: records.length,
      data: records,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get medical records error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách hồ sơ bệnh án',
      error: error.message
    });
  }
};

/**
 * @desc    Lấy chi tiết hồ sơ bệnh án
 * @route   GET /api/admin/medical-records/:id
 * @access  Private/Admin
 */
exports.getMedicalRecordById = async (req, res) => {
  try {
    const record = await MedicalRecord.findById(req.params.id)
      .populate('patient', 'fullName email phone dateOfBirth gender address')
      .populate('doctor', 'fullName specialization department phone')
      .populate('department', 'name code location')
      .populate('appointment', 'appointmentDate timeSlot reason')
      .populate('createdBy', 'fullName email')
      .populate('lastUpdatedBy', 'fullName email');

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy hồ sơ bệnh án'
      });
    }

    res.status(200).json({
      success: true,
      data: record
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy chi tiết hồ sơ',
      error: error.message
    });
  }
};

/**
 * @desc    Tạo hồ sơ bệnh án mới
 * @route   POST /api/admin/medical-records
 * @access  Private/Admin
 */
exports.createMedicalRecord = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const {
      patient,
      doctor,
      department,
      appointment,
      visitDate,
      reason,
      symptoms,
      diagnosis,
      prescription,
      testResults,
      doctorNotes,
      treatmentPlan,
      followUpDate,
      cost
    } = req.body;

    // Validation: Kiểm tra các trường bắt buộc
    if (!patient || !doctor || !department || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin bắt buộc: bệnh nhân, bác sĩ, khoa, lý do khám'
      });
    }

    // Tạo hồ sơ mới
    const record = await MedicalRecord.create({
      patient,
      doctor,
      department,
      appointment: appointment || null,
      visitDate: visitDate || new Date(),
      reason,
      symptoms,
      diagnosis,
      prescription,
      testResults: testResults || [],
      doctorNotes,
      treatmentPlan,
      followUpDate: followUpDate || null,
      cost: cost || {
        consultationFee: 0,
        medicationFee: 0,
        testFee: 0,
        totalFee: 0
      },
      status: 'in_progress',
      createdBy: req.user._id
    });

    // Populate thông tin
    const populatedRecord = await MedicalRecord.findById(record._id)
      .populate('patient', 'fullName email phone')
      .populate('doctor', 'fullName specialization')
      .populate('department', 'name code');

    res.status(201).json({
      success: true,
      message: 'Tạo hồ sơ bệnh án thành công',
      data: populatedRecord
    });
  } catch (error) {
    console.error('Create medical record error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo hồ sơ bệnh án',
      error: error.message
    });
  }
};

/**
 * @desc    Cập nhật hồ sơ bệnh án
 * @route   PUT /api/admin/medical-records/:id
 * @access  Private/Admin/Doctor
 */
exports.updateMedicalRecord = async (req, res) => {
  try {
    const record = await MedicalRecord.findById(req.params.id);

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy hồ sơ bệnh án'
      });
    }

    const {
      diagnosis,
      prescription,
      testResults,
      doctorNotes,
      treatmentPlan,
      followUpDate,
      status,
      cost
    } = req.body;

    // Cập nhật các trường
    if (diagnosis !== undefined) record.diagnosis = diagnosis;
    if (prescription !== undefined) record.prescription = prescription;
    if (testResults !== undefined) record.testResults = testResults;
    if (doctorNotes !== undefined) record.doctorNotes = doctorNotes;
    if (treatmentPlan !== undefined) record.treatmentPlan = treatmentPlan;
    if (followUpDate !== undefined) record.followUpDate = followUpDate;
    if (status !== undefined) record.status = status;
    if (cost !== undefined) {
      record.cost = {
        ...record.cost,
        ...cost
      };
    }

    // Ghi nhận người cập nhật cuối
    record.lastUpdatedBy = req.user._id;

    await record.save();

    const updatedRecord = await MedicalRecord.findById(record._id)
      .populate('patient', 'fullName email phone')
      .populate('doctor', 'fullName specialization')
      .populate('department', 'name code')
      .populate('lastUpdatedBy', 'fullName');

    res.status(200).json({
      success: true,
      message: 'Cập nhật hồ sơ thành công',
      data: updatedRecord
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật hồ sơ',
      error: error.message
    });
  }
};

/**
 * @desc    Cập nhật trạng thái hồ sơ
 * @route   PUT /api/admin/medical-records/:id/status
 * @access  Private/Admin/Doctor
 */
exports.updateMedicalRecordStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!['in_progress', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Trạng thái không hợp lệ'
      });
    }

    const record = await MedicalRecord.findById(req.params.id);

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy hồ sơ bệnh án'
      });
    }

    record.status = status;
    record.lastUpdatedBy = req.user._id;

    await record.save();

    res.status(200).json({
      success: true,
      message: 'Cập nhật trạng thái thành công',
      data: record
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
 * @desc    Lấy lịch sử khám bệnh của một bệnh nhân
 * @route   GET /api/admin/medical-records/patient/:patientId
 * @access  Private/Admin/Doctor
 */
exports.getPatientMedicalHistory = async (req, res) => {
  try {
    const records = await MedicalRecord.find({ patient: req.params.patientId })
      .populate('doctor', 'fullName specialization')
      .populate('department', 'name code')
      .sort({ visitDate: -1 });

    res.status(200).json({
      success: true,
      count: records.length,
      data: records
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy lịch sử khám bệnh',
      error: error.message
    });
  }
};

/**
 * @desc    Xóa hồ sơ bệnh án
 * @route   DELETE /api/admin/medical-records/:id
 * @access  Private/Admin
 */
exports.deleteMedicalRecord = async (req, res) => {
  try {
    const record = await MedicalRecord.findById(req.params.id);

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy hồ sơ bệnh án'
      });
    }

    await MedicalRecord.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Xóa hồ sơ thành công'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa hồ sơ',
      error: error.message
    });
  }
};

