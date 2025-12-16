const mongoose = require('mongoose');

/**
 * Model Hồ sơ bệnh án
 * Lưu trữ thông tin khám bệnh, chẩn đoán, điều trị
 */
const medicalRecordSchema = new mongoose.Schema({
  // Mã hồ sơ (tự động tạo)
  recordNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  
  // Bệnh nhân
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Bệnh nhân là bắt buộc']
  },
  
  // Bác sĩ phụ trách
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Bác sĩ là bắt buộc']
  },
  
  // Khoa khám
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: true
  },
  
  // Lịch hẹn liên quan (nếu có)
  appointment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    default: null
  },
  
  // Ngày khám
  visitDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  
  // Lý do khám
  reason: {
    type: String,
    required: [true, 'Lý do khám là bắt buộc'],
    trim: true
  },
  
  // Triệu chứng
  symptoms: {
    type: String,
    trim: true,
    default: null
  },
  
  // Chẩn đoán
  diagnosis: {
    type: String,
    trim: true,
    default: null
  },
  
  // Đơn thuốc
  prescription: {
    type: String,
    trim: true,
    default: null
  },
  
  // Kết quả xét nghiệm (lưu dạng JSON string hoặc array)
  testResults: [{
    testName: String,      // Tên xét nghiệm
    result: String,        // Kết quả
    testDate: Date,        // Ngày xét nghiệm
    notes: String          // Ghi chú
  }],
  
  // Hình ảnh/File đính kèm (URLs)
  attachments: [{
    fileName: String,
    fileUrl: String,
    fileType: String,      // image, pdf, etc.
    uploadDate: Date
  }],
  
  // Ghi chú của bác sĩ
  doctorNotes: {
    type: String,
    trim: true,
    default: null
  },
  
  // Hướng dẫn điều trị
  treatmentPlan: {
    type: String,
    trim: true,
    default: null
  },
  
  // Ngày tái khám
  followUpDate: {
    type: Date,
    default: null
  },
  
  // Trạng thái hồ sơ
  status: {
    type: String,
    enum: ['in_progress', 'completed', 'cancelled'],
    default: 'in_progress'
  },
  
  // Chi phí khám
  cost: {
    consultationFee: { type: Number, default: 0 },
    medicationFee: { type: Number, default: 0 },
    testFee: { type: Number, default: 0 },
    totalFee: { type: Number, default: 0 }
  },
  
  // Thanh toán
  isPaid: {
    type: Boolean,
    default: false
  },
  
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'momo', 'bank_transfer', 'insurance', null],
    default: null
  },
  
  paidAt: {
    type: Date,
    default: null
  },
  
  // Người tạo hồ sơ
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Người cập nhật cuối
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

// Index để tìm kiếm nhanh
medicalRecordSchema.index({ patient: 1, visitDate: -1 });
medicalRecordSchema.index({ doctor: 1, visitDate: -1 });
medicalRecordSchema.index({ department: 1 });
medicalRecordSchema.index({ recordNumber: 1 });
medicalRecordSchema.index({ status: 1 });

// Tự động tạo mã hồ sơ trước khi save
medicalRecordSchema.pre('save', async function(next) {
  if (!this.recordNumber) {
    const count = await mongoose.model('MedicalRecord').countDocuments();
    const year = new Date().getFullYear();
    this.recordNumber = `MR${year}${String(count + 1).padStart(6, '0')}`;
  }
  
  // Tính tổng chi phí
  this.cost.totalFee = 
    (this.cost.consultationFee || 0) + 
    (this.cost.medicationFee || 0) + 
    (this.cost.testFee || 0);
  
  next();
});

const MedicalRecord = mongoose.model('MedicalRecord', medicalRecordSchema);

module.exports = MedicalRecord;

