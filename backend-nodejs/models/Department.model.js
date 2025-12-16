const mongoose = require('mongoose');

/**
 * Model Khoa/Phòng khám
 * Quản lý các khoa trong bệnh viện
 */
const departmentSchema = new mongoose.Schema({
  // Mã khoa (tự động tạo hoặc nhập thủ công)
  code: {
    type: String,
    required: [true, 'Mã khoa là bắt buộc'],
    unique: true,
    trim: true,
    uppercase: true
  },
  
  // Tên khoa
  name: {
    type: String,
    required: [true, 'Tên khoa là bắt buộc'],
    trim: true
  },
  
  // Mô tả chi tiết về khoa
  description: {
    type: String,
    trim: true,
    default: null
  },
  
  // Số phòng/Vị trí
  location: {
    type: String,
    trim: true,
    default: null
  },
  
  // Số điện thoại liên hệ khoa
  phone: {
    type: String,
    trim: true,
    match: [/^[0-9]{10,11}$/, 'Số điện thoại không hợp lệ']
  },
  
  // Trưởng khoa (reference đến Doctor)
  headOfDepartment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  // Trạng thái hoạt động
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Người tạo khoa này
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true // Tự động tạo createdAt và updatedAt
});

// Index để tìm kiếm nhanh
departmentSchema.index({ code: 1 });
departmentSchema.index({ name: 1 });
departmentSchema.index({ isActive: 1 });

const Department = mongoose.model('Department', departmentSchema);

module.exports = Department;

