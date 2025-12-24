import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { poolPromise } from '../../database/db-config';

const TABLE = process.env.SQL_TABLE_USERS || 'USERS_AUTH';

export interface DoctorRequest extends Request {
  user?: {
    id: string;
    username: string;
    email: string;
    role: string;
    ma_bac_si?: string;
  };
}

async function findUserById(id: string) {
  const pool = await poolPromise;
  const res = await pool
    .request()
    .input('id', id)
    .query(`SELECT TOP 1 * FROM ${TABLE} WHERE id=@id`);
  return res.recordset[0];
}

export const protect = async (req: DoctorRequest, res: Response, next: NextFunction) => {
  try {
    let token: string | undefined;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route. Please login.'
      });
    }

    try {
      const secret = process.env.JWT_SECRET || 'dev_secret';
      const decoded = jwt.verify(token, secret) as { id: string };

      const user = await findUserById(decoded.id);
      if (!user) {
        return res.status(401).json({ success: false, message: 'User not found' });
      }

      if (user.is_active === 0) {
        return res.status(401).json({ success: false, message: 'Account is locked' });
      }

      req.user = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        ma_bac_si: user.username // ma_bac_si is typically the username
      };

      next();
    } catch (error: any) {
      let errorMessage = 'Invalid or expired token';
      if (error.name === 'TokenExpiredError') {
        errorMessage = 'Token has expired. Please login again.';
      } else if (error.name === 'JsonWebTokenError') {
        errorMessage = 'Invalid token. Please login again.';
      }
      
      return res.status(401).json({
        success: false,
        message: errorMessage
      });
    }
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Authentication error',
      error: error.message
    });
  }
};

export const isDoctor = (req: DoctorRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'doctor' && req.user?.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Doctor privileges required.'
    });
  }
  next();
};

