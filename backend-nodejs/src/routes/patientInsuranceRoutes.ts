import express, { Response } from 'express';
import { insurances } from '../data/mockData';
import { AuthenticatedRequest, ApiResponse, Insurance } from '../types';
import { mockPatientAuth } from '../middlewares/mockPatientAuth';

const router = express.Router();

// Tất cả routes cần authentication
router.use(mockPatientAuth);

/**
 * GET /api/patient/insurance
 * Lấy thông tin BHYT của bệnh nhân hiện tại
 */
router.get('/insurance', (req: AuthenticatedRequest, res: Response) => {
  try {
    const patientId = req.user?.patientId;
    
    if (!patientId) {
      return res.status(401).json({
        success: false,
        message: 'Không xác định được bệnh nhân'
      } as ApiResponse<null>);
    }

    const insurance = insurances.find(ins => ins.patientId === patientId);

    if (!insurance) {
      return res.status(404).json({
        success: false,
        message: 'Bệnh nhân chưa có thông tin BHYT'
      } as ApiResponse<null>);
    }

    res.json({
      success: true,
      data: insurance
    } as ApiResponse<Insurance>);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse<null>);
  }
});

/**
 * PUT /api/patient/insurance
 * Cập nhật thông tin BHYT của bệnh nhân
 */
router.put('/insurance', (req: AuthenticatedRequest, res: Response) => {
  try {
    const patientId = req.user?.patientId;
    
    if (!patientId) {
      return res.status(401).json({
        success: false,
        message: 'Không xác định được bệnh nhân'
      } as ApiResponse<null>);
    }

    const { bhytNumber, startDate, endDate, registeredHospital, coverageType } = req.body;

    // Validation
    if (!bhytNumber) {
      return res.status(400).json({
        success: false,
        message: 'Số BHYT không được để trống'
      } as ApiResponse<null>);
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (start >= end) {
        return res.status(400).json({
          success: false,
          message: 'Ngày bắt đầu phải nhỏ hơn ngày kết thúc'
        } as ApiResponse<null>);
      }
    }

    // Tìm insurance hiện tại
    const insuranceIndex = insurances.findIndex(ins => ins.patientId === patientId);

    if (insuranceIndex === -1) {
      // Nếu chưa có, tạo mới
      if (!startDate || !endDate || !registeredHospital) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng điền đầy đủ thông tin: startDate, endDate, registeredHospital'
        } as ApiResponse<null>);
      }

      const newInsurance: Insurance = {
        id: insurances.length > 0 ? Math.max(...insurances.map(i => i.id)) + 1 : 1,
        patientId,
        bhytNumber,
        startDate,
        endDate,
        registeredHospital,
        coverageType: coverageType || 'full',
        updatedAt: new Date().toISOString()
      };

      insurances.push(newInsurance);

      res.json({
        success: true,
        data: newInsurance,
        message: 'Tạo thông tin BHYT thành công'
      } as ApiResponse<Insurance>);
    } else {
      // Cập nhật thông tin
      if (bhytNumber) insurances[insuranceIndex].bhytNumber = bhytNumber;
      if (startDate) insurances[insuranceIndex].startDate = startDate;
      if (endDate) insurances[insuranceIndex].endDate = endDate;
      if (registeredHospital) insurances[insuranceIndex].registeredHospital = registeredHospital;
      if (coverageType) insurances[insuranceIndex].coverageType = coverageType;
      
      insurances[insuranceIndex].updatedAt = new Date().toISOString();

      res.json({
        success: true,
        data: insurances[insuranceIndex],
        message: 'Cập nhật thông tin BHYT thành công'
      } as ApiResponse<Insurance>);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse<null>);
  }
});

export default router;

