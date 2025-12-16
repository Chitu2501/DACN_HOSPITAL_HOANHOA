import express, { Request, Response } from 'express';
import { patients } from '../data/mockData';
import { LoginRequest, LoginResponse, ApiResponse } from '../types';

const router = express.Router();

/**
 * POST /api/patient/login
 * Đăng nhập bệnh nhân (fake authentication)
 */
router.post('/login', (req: Request, res: Response) => {
  try {
    const { email, password }: LoginRequest = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập email và mật khẩu'
      } as ApiResponse<null>);
    }

    // Tìm bệnh nhân trong mock data
    const patient = patients.find(
      p => p.email === email && p.password === password
    );

    if (!patient) {
      return res.status(401).json({
        success: false,
        message: 'Email hoặc mật khẩu không đúng'
      } as ApiResponse<null>);
    }

    // Tạo token fake (trong thực tế dùng JWT)
    // Format: "mock-token-{patientId}"
    const token = `mock-token-${patient.id}`;

    // Trả về thông tin bệnh nhân (không bao gồm password)
    const { password: _, ...patientWithoutPassword } = patient;

    const response: LoginResponse = {
      success: true,
      token,
      patient: patientWithoutPassword,
      message: 'Đăng nhập thành công'
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse<null>);
  }
});

/**
 * POST /api/patient/logout
 * Đăng xuất (chỉ trả về success, vì token fake)
 */
router.post('/logout', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Đăng xuất thành công'
  } as ApiResponse<null>);
});

export default router;

