import express, { Response } from 'express';
import { medicalRecords, doctors } from '../data/mockData';
import { AuthenticatedRequest, ApiResponse, MedicalRecord } from '../types';
import { mockPatientAuth } from '../middlewares/mockPatientAuth';

const router = express.Router();

// Tất cả routes cần authentication
router.use(mockPatientAuth);

/**
 * GET /api/patient/medical-records
 * Lấy danh sách hồ sơ bệnh án của bệnh nhân hiện tại
 * Query params: status, fromDate, toDate
 */
router.get('/medical-records', (req: AuthenticatedRequest, res: Response) => {
  try {
    const patientId = req.user?.patientId;
    
    if (!patientId) {
      return res.status(401).json({
        success: false,
        message: 'Không xác định được bệnh nhân'
      } as ApiResponse<null>);
    }

    // Lọc hồ sơ theo patientId
    let filteredRecords = medicalRecords.filter(record => record.patientId === patientId);

    // Filter theo status (nếu có)
    const { status, fromDate, toDate } = req.query;
    
    if (status) {
      filteredRecords = filteredRecords.filter(record => record.status === status);
    }

    // Filter theo ngày (nếu có)
    if (fromDate) {
      filteredRecords = filteredRecords.filter(
        record => record.visitDate >= fromDate as string
      );
    }

    if (toDate) {
      filteredRecords = filteredRecords.filter(
        record => record.visitDate <= toDate as string
      );
    }

    // Sắp xếp theo ngày khám (mới nhất trước)
    filteredRecords.sort((a, b) => 
      new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime()
    );

    // Populate thông tin bác sĩ
    const recordsWithDoctor = filteredRecords.map(record => {
      const doctor = doctors.find(d => d.id === record.doctorId);
      return {
        ...record,
        doctor: doctor ? {
          id: doctor.id,
          fullName: doctor.fullName,
          specialty: doctor.specialty,
          department: doctor.department
        } : null
      };
    });

    res.json({
      success: true,
      data: recordsWithDoctor,
      count: recordsWithDoctor.length
    } as ApiResponse<typeof recordsWithDoctor>);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse<null>);
  }
});

/**
 * GET /api/patient/medical-records/:id
 * Lấy chi tiết 1 hồ sơ bệnh án
 */
router.get('/medical-records/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const patientId = req.user?.patientId;
    const recordId = parseInt(req.params.id);

    if (!patientId) {
      return res.status(401).json({
        success: false,
        message: 'Không xác định được bệnh nhân'
      } as ApiResponse<null>);
    }

    if (isNaN(recordId)) {
      return res.status(400).json({
        success: false,
        message: 'ID hồ sơ không hợp lệ'
      } as ApiResponse<null>);
    }

    // Tìm hồ sơ
    const record = medicalRecords.find(
      r => r.id === recordId && r.patientId === patientId
    );

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy hồ sơ bệnh án hoặc bạn không có quyền truy cập'
      } as ApiResponse<null>);
    }

    // Populate thông tin bác sĩ
    const doctor = doctors.find(d => d.id === record.doctorId);
    const recordWithDoctor = {
      ...record,
      doctor: doctor ? {
        id: doctor.id,
        fullName: doctor.fullName,
        specialty: doctor.specialty,
        department: doctor.department,
        phone: doctor.phone
      } : null
    };

    res.json({
      success: true,
      data: recordWithDoctor
    } as ApiResponse<typeof recordWithDoctor>);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse<null>);
  }
});

export default router;

