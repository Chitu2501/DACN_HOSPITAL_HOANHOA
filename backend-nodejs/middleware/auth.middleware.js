const jwt = require('jsonwebtoken');
const { poolPromise } = require('../database/db-config');

const TABLE = process.env.SQL_TABLE_USERS || 'USERS_AUTH';

async function findUserById(id) {
  const pool = await poolPromise;
  const res = await pool
    .request()
    .input('id', id)
    .query(`SELECT TOP 1 * FROM ${TABLE} WHERE id=@id`);
  return res.recordset[0];
}

// Verify JWT token
exports.protect = async (req, res, next) => {
  try {
    let token;

    // Check if token exists in Authorization header
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
      // Verify token - use same default as in auth.controller.js
      const secret = process.env.JWT_SECRET || 'dev_secret';
      const decoded = jwt.verify(token, secret);

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
        phone: user.phone,
        gender: user.gender,
        isActive: user.is_active,
      };

      next();
    } catch (error) {
      // Log error details for debugging (only in development)
      if (process.env.NODE_ENV === 'development') {
        console.error('Token verification error:', {
          error: error.message,
          name: error.name,
          hasToken: !!token,
          tokenLength: token?.length,
          secretSet: !!process.env.JWT_SECRET
        });
      }
      
      // Provide more specific error messages
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
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Authentication error',
      error: error.message
    });
  }
};

// Check user role
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user.role}' is not authorized to access this route`
      });
    }
    next();
  };
};

// Check if user is admin
exports.isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }
  next();
};

// Check if user is doctor
exports.isDoctor = (req, res, next) => {
  if (req.user.role !== 'doctor' && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Doctor privileges required.'
    });
  }
  next();
};

// Check if user is nurse
exports.isNurse = (req, res, next) => {
  if (req.user.role !== 'nurse' && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Nurse privileges required.'
    });
  }
  next();
};

// Check if user is medical staff (doctor or nurse)
exports.isMedicalStaff = (req, res, next) => {
  if (!['doctor', 'nurse', 'admin'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Medical staff privileges required.'
    });
  }
  next();
};

