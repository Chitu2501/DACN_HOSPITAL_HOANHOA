/**
 * Type definitions để mở rộng Express Request
 * File này mở rộng global Express namespace để thêm user property vào Request
 */

import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      /**
       * User information được thêm vào request bởi authentication middleware
       * Có thể là patientId, userId, hoặc thông tin user khác tùy vào role
       */
      user?: {
        id?: string;
        role?: 'admin' | 'doctor' | 'nurse' | 'patient';
        patientId?: number | string;
        userId?: number | string;
      };
    }
  }
}

// Export để TypeScript nhận diện
export {};

