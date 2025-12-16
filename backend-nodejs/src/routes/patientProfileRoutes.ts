import express, { Response } from 'express';
import { patients } from '../data/mockData';
import { AuthenticatedRequest, ApiResponse, Patient } from '../types';
import { mockPatientAuth } from '../middlewares/mockPatientAuth';

const router = express.Router();

// Tất cả routes cần authentication
router.use(mockPatientAuth);

/**
 * GET /api/patient/profile
 * Lấy thông tin profile của bệnh nhân hiện tại
 */
router.get('/profile', (req: AuthenticatedRequest, res: Response) => {
  try {
    const patientId = req.user?.patientId;
    
    if (!patientId) {
      return res.status(401).json({
        success: false,
        message: 'Không xác định được bệnh nhân'
      } as ApiResponse<null>);
    }

    const patient = patients.find(p => p.id === patientId);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin bệnh nhân'
      } as ApiResponse<null>);
    }

    // Loại bỏ password trước khi trả về
    const { password: _, ...patientWithoutPassword } = patient;

    res.json({
      success: true,
      data: patientWithoutPassword
    } as ApiResponse<Omit<Patient, 'password'>>);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse<null>);
  }
});

/**
 * PUT /api/patient/profile
 * Cập nhật thông tin profile của bệnh nhân
 */
router.put('/profile', (req: AuthenticatedRequest, res: Response) => {
  try {
    const patientId = req.user?.patientId;
    
    if (!patientId) {
      return res.status(401).json({
        success: false,
        message: 'Không xác định được bệnh nhân'
      } as ApiResponse<null>);
    }

    const patientIndex = patients.findIndex(p => p.id === patientId);

    if (patientIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin bệnh nhân'
      } as ApiResponse<null>);
    }

    const { email, phone, address, dateOfBirth, emergencyContact } = req.body;

    // Cập nhật thông tin (chỉ cho phép cập nhật một số trường)
    if (email) patients[patientIndex].email = email;
    if (phone) patients[patientIndex].phone = phone;
    if (address) patients[patientIndex].address = address;
    if (dateOfBirth) patients[patientIndex].dateOfBirth = dateOfBirth;
    if (emergencyContact) patients[patientIndex].emergencyContact = emergencyContact;
    
    // Cập nhật updatedAt
    patients[patientIndex].updatedAt = new Date().toISOString();

    // Loại bỏ password trước khi trả về
    const { password: _, ...patientWithoutPassword } = patients[patientIndex];

    res.json({
      success: true,
      data: patientWithoutPassword,
      message: 'Cập nhật thông tin thành công'
    } as ApiResponse<Omit<Patient, 'password'>>);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse<null>);
  }
});

export default router;

