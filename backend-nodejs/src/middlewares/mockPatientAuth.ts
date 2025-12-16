import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';

/**
 * Mock Patient Authentication Middleware
 * 
 * Có 2 cách sử dụng:
 * 1. Hard-code patientId (đơn giản nhất cho demo)
 * 2. Decode từ token fake (minh họa cách làm thật)
 * 
 * Hiện tại dùng cách 1: Hard-code patientId = 1
 * Để demo cách 2, uncomment phần decode token
 */

export const mockPatientAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    // ===== CÁCH 1: Hard-code patientId (Đơn giản cho demo) =====
    // Gắn patientId = 1 vào req.user
    req.user = {
      patientId: 1
    };
    next();

    // ===== CÁCH 2: Decode từ token fake (Minh họa cách làm thật) =====
    /*
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Không có token xác thực'
      });
    }

    const token = authHeader.substring(7); // Remove "Bearer "

    // Giả sử token có format: "mock-token-{patientId}"
    // Ví dụ: "mock-token-1" → patientId = 1
    if (token.startsWith('mock-token-')) {
      const patientId = parseInt(token.replace('mock-token-', ''));
      
      if (isNaN(patientId)) {
        return res.status(401).json({
          success: false,
          message: 'Token không hợp lệ'
        });
      }

      req.user = { patientId };
      next();
    } else {
      return res.status(401).json({
        success: false,
        message: 'Token không hợp lệ'
      });
    }
    */
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Lỗi xác thực',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Optional: Middleware để lấy patientId từ query param (cho testing)
 * Ví dụ: GET /api/patient/appointments?patientId=2
 */
export const mockPatientAuthOptional = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  // Nếu có query param patientId, dùng nó (cho testing)
  const patientIdFromQuery = req.query.patientId as string;
  
  if (patientIdFromQuery) {
    const patientId = parseInt(patientIdFromQuery);
    if (!isNaN(patientId)) {
      req.user = { patientId };
      return next();
    }
  }

  // Nếu không có, dùng cách mặc định
  mockPatientAuth(req, res, next);
};

