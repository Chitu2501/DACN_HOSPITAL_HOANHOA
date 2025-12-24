import { Response } from 'express';
// @ts-ignore - db-config is a JavaScript file
import { poolPromise } from '../../database/db-config';
import { DoctorRequest } from '../middlewares/doctorAuth';

// Base URL for uploaded avatars - must match server.js static file serving
const UPLOADS_BASE_URL = process.env.UPLOADS_BASE_URL || '/uploads/avatars';

// GET /api/doctor/profile
export const getDoctorProfile = async (req: DoctorRequest, res: Response): Promise<Response | void> => {
  try {
    const ma_bac_si = req.user?.ma_bac_si || req.user?.username;
    
    if (!ma_bac_si) {
      return res.status(401).json({
        success: false,
        message: 'Doctor identifier not found'
      });
    }

    const pool = await poolPromise;
    
    // Check which columns exist
    let hasAvatarUrl = false;
    let hasCreatedAt = false;
    let hasUpdatedAt = false;
    try {
      const checkResult = await pool
        .request()
        .query(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_NAME = 'BAC_SI' 
          AND COLUMN_NAME IN ('avatar_url', 'created_at', 'updated_at')
        `);
      const columns = checkResult.recordset.map((r: any) => r.COLUMN_NAME);
      hasAvatarUrl = columns.includes('avatar_url');
      hasCreatedAt = columns.includes('created_at');
      hasUpdatedAt = columns.includes('updated_at');
    } catch (e) {
      // If check fails, try to query anyway
      console.warn('Could not check columns, assuming they exist:', e);
      hasAvatarUrl = true; // Assume avatar_url exists since user confirmed
      hasCreatedAt = false;
      hasUpdatedAt = false;
    }
    
    // Build query based on column availability
    const selectFields = [
      'bs.ma_bac_si',
      'bs.ma_khoa',
      'bs.ten_bac_si',
      'bs.chuyen_khoa',
      'bs.sdt',
      'bs.dia_chi',
      'bs.email',
      'bs.tieu_su',
      'bs.so_chung_chi_hanh_nghe',
      'bs.ma_thong_bao',
      hasAvatarUrl ? 'bs.avatar_url' : 'NULL AS avatar_url',
      hasCreatedAt ? 'bs.created_at' : 'NULL AS created_at',
      hasUpdatedAt ? 'bs.updated_at' : 'NULL AS updated_at',
      'k.ten_khoa'
    ].join(',\n          ');
    
    const result = await pool
      .request()
      .input('ma_bac_si', ma_bac_si)
      .query(`
        SELECT 
          ${selectFields}
        FROM BAC_SI bs
        LEFT JOIN KHOA k ON bs.ma_khoa = k.ma_khoa
        WHERE bs.ma_bac_si = @ma_bac_si
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Doctor profile not found'
      });
    }

    const doctor = result.recordset[0];
    
    res.json({
      success: true,
      data: {
        ma_bac_si: doctor.ma_bac_si,
        ma_khoa: doctor.ma_khoa,
        ten_bac_si: doctor.ten_bac_si,
        chuyen_khoa: doctor.chuyen_khoa,
        sdt: doctor.sdt,
        dia_chi: doctor.dia_chi,
        email: doctor.email,
        tieu_su: doctor.tieu_su,
        so_chung_chi_hanh_nghe: doctor.so_chung_chi_hanh_nghe,
        ma_thong_bao: doctor.ma_thong_bao,
        avatar_url: doctor.avatar_url,
        created_at: doctor.created_at,
        updated_at: doctor.updated_at,
        ten_khoa: doctor.ten_khoa
      }
    });
  } catch (error: any) {
    console.error('Error fetching doctor profile:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch doctor profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// PUT /api/doctor/profile
export const updateDoctorProfile = async (req: DoctorRequest, res: Response): Promise<Response | void> => {
  try {
    const ma_bac_si = req.user?.ma_bac_si || req.user?.username;
    
    console.log('🔍 Update doctor profile request:', {
      ma_bac_si,
      user: req.user,
      body: req.body
    });
    
    if (!ma_bac_si) {
      return res.status(401).json({
        success: false,
        message: 'Doctor identifier not found'
      });
    }

    const {
      ma_khoa,
      ten_bac_si,
      chuyen_khoa,
      sdt,
      dia_chi,
      email,
      tieu_su,
      so_chung_chi_hanh_nghe,
      ma_thong_bao
    } = req.body;

    // Helper function to normalize empty strings to null
    const normalizeValue = (value: any): any => {
      if (value === undefined) return undefined;
      if (value === null) return null;
      if (typeof value === 'string' && value.trim() === '') return null;
      return value;
    };

    // Normalize all values
    const normalizedMaKhoa = normalizeValue(ma_khoa);
    const normalizedTenBacSi = normalizeValue(ten_bac_si);
    const normalizedChuyenKhoa = normalizeValue(chuyen_khoa);
    const normalizedSdt = normalizeValue(sdt);
    const normalizedDiaChi = normalizeValue(dia_chi);
    const normalizedEmail = normalizeValue(email);
    const normalizedTieuSu = normalizeValue(tieu_su);
    const normalizedSoChungChi = normalizeValue(so_chung_chi_hanh_nghe);
    const normalizedMaThongBao = normalizeValue(ma_thong_bao);

    // Validation - only validate if field is provided and has a value
    if (normalizedTenBacSi !== undefined && normalizedTenBacSi !== null && normalizedTenBacSi.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'ten_bac_si cannot be empty'
      });
    }

    if (normalizedEmail !== undefined && normalizedEmail !== null && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    if (normalizedSdt !== undefined && normalizedSdt !== null && (!/^\d{9,15}$/.test(normalizedSdt))) {
      return res.status(400).json({
        success: false,
        message: 'sdt must be numeric and 9-15 characters'
      });
    }

    const pool = await poolPromise;

    // Check if ma_khoa exists (only if provided and not null)
    if (normalizedMaKhoa !== undefined && normalizedMaKhoa !== null) {
      const khoaCheck = await pool
        .request()
        .input('ma_khoa', normalizedMaKhoa)
        .query('SELECT TOP 1 ma_khoa FROM KHOA WHERE ma_khoa = @ma_khoa');
      
      if (khoaCheck.recordset.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid ma_khoa: department not found'
        });
      }
    }

    // Build update query dynamically - only include fields that are explicitly provided
    const updateFields: string[] = [];
    const request = pool.request().input('ma_bac_si', ma_bac_si);

    if (normalizedMaKhoa !== undefined) {
      updateFields.push('ma_khoa = @ma_khoa');
      request.input('ma_khoa', normalizedMaKhoa);
    }
    if (normalizedTenBacSi !== undefined) {
      updateFields.push('ten_bac_si = @ten_bac_si');
      request.input('ten_bac_si', normalizedTenBacSi);
    }
    if (normalizedChuyenKhoa !== undefined) {
      updateFields.push('chuyen_khoa = @chuyen_khoa');
      request.input('chuyen_khoa', normalizedChuyenKhoa);
    }
    if (normalizedSdt !== undefined) {
      updateFields.push('sdt = @sdt');
      request.input('sdt', normalizedSdt);
    }
    if (normalizedDiaChi !== undefined) {
      updateFields.push('dia_chi = @dia_chi');
      request.input('dia_chi', normalizedDiaChi);
    }
    if (normalizedEmail !== undefined) {
      updateFields.push('email = @email');
      request.input('email', normalizedEmail);
    }
    if (normalizedTieuSu !== undefined) {
      updateFields.push('tieu_su = @tieu_su');
      request.input('tieu_su', normalizedTieuSu);
    }
    if (normalizedSoChungChi !== undefined) {
      updateFields.push('so_chung_chi_hanh_nghe = @so_chung_chi_hanh_nghe');
      request.input('so_chung_chi_hanh_nghe', normalizedSoChungChi);
    }
    if (normalizedMaThongBao !== undefined) {
      updateFields.push('ma_thong_bao = @ma_thong_bao');
      request.input('ma_thong_bao', normalizedMaThongBao);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    // Check if updated_at column exists
    let hasUpdatedAtColumn = false;
    try {
      const checkResult = await pool
        .request()
        .query(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_NAME = 'BAC_SI' AND COLUMN_NAME = 'updated_at'
        `);
      hasUpdatedAtColumn = checkResult.recordset.length > 0;
    } catch (e) {
      hasUpdatedAtColumn = false;
    }
    
    if (hasUpdatedAtColumn) {
      updateFields.push('updated_at = GETDATE()');
    }

    const updateQuery = `
      UPDATE BAC_SI
      SET ${updateFields.join(', ')}
      WHERE ma_bac_si = @ma_bac_si
    `;

    console.log('📝 Executing update query:', updateQuery);
    console.log('📝 Update fields:', updateFields);
    
    const updateResult = await request.query(updateQuery);
    console.log('✅ Update successful, rows affected:', updateResult.rowsAffected);

    // Check which columns exist for SELECT query
    let hasAvatarUrl = false;
    let hasCreatedAt = false;
    let hasUpdatedAt = false;
    try {
      const checkResult = await pool
        .request()
        .query(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_NAME = 'BAC_SI' 
          AND COLUMN_NAME IN ('avatar_url', 'created_at', 'updated_at')
        `);
      const columns = checkResult.recordset.map((r: any) => r.COLUMN_NAME);
      hasAvatarUrl = columns.includes('avatar_url');
      hasCreatedAt = columns.includes('created_at');
      hasUpdatedAt = columns.includes('updated_at');
    } catch (e) {
      // If check fails, assume avatar_url exists (user confirmed)
      console.warn('Could not check columns, assuming avatar_url exists');
      hasAvatarUrl = true;
      hasCreatedAt = false;
      hasUpdatedAt = false;
    }
    
    const selectFields = [
      'bs.ma_bac_si',
      'bs.ma_khoa',
      'bs.ten_bac_si',
      'bs.chuyen_khoa',
      'bs.sdt',
      'bs.dia_chi',
      'bs.email',
      'bs.tieu_su',
      'bs.so_chung_chi_hanh_nghe',
      'bs.ma_thong_bao',
      hasAvatarUrl ? 'bs.avatar_url' : 'NULL AS avatar_url',
      hasCreatedAt ? 'bs.created_at' : 'NULL AS created_at',
      hasUpdatedAt ? 'bs.updated_at' : 'NULL AS updated_at',
      'k.ten_khoa'
    ].join(',\n          ');

    // Fetch updated profile
    const result = await pool
      .request()
      .input('ma_bac_si', ma_bac_si)
      .query(`
        SELECT 
          ${selectFields}
        FROM BAC_SI bs
        LEFT JOIN KHOA k ON bs.ma_khoa = k.ma_khoa
        WHERE bs.ma_bac_si = @ma_bac_si
      `);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        ma_bac_si: result.recordset[0].ma_bac_si,
        ma_khoa: result.recordset[0].ma_khoa,
        ten_bac_si: result.recordset[0].ten_bac_si,
        chuyen_khoa: result.recordset[0].chuyen_khoa,
        sdt: result.recordset[0].sdt,
        dia_chi: result.recordset[0].dia_chi,
        email: result.recordset[0].email,
        tieu_su: result.recordset[0].tieu_su,
        so_chung_chi_hanh_nghe: result.recordset[0].so_chung_chi_hanh_nghe,
        ma_thong_bao: result.recordset[0].ma_thong_bao,
        avatar_url: result.recordset[0].avatar_url,
        created_at: result.recordset[0].created_at,
        updated_at: result.recordset[0].updated_at,
        ten_khoa: result.recordset[0].ten_khoa
      }
    });
  } catch (error: any) {
    console.error('❌ Error updating doctor profile:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      number: error.number,
      state: error.state,
      class: error.class,
      serverName: error.serverName,
      procName: error.procName,
      lineNumber: error.lineNumber
    });
    
    // Provide more specific error messages
    let errorMessage = 'Failed to update doctor profile';
    if (error.message) {
      errorMessage = error.message;
    }
    
    return res.status(500).json({
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        code: error.code,
        number: error.number
      } : undefined
    });
  }
};

// POST /api/doctor/profile/avatar
export const uploadAvatar = async (req: DoctorRequest, res: Response): Promise<Response | void> => {
  try {
    const ma_bac_si = req.user?.ma_bac_si || req.user?.username;
    
    if (!ma_bac_si) {
      return res.status(401).json({
        success: false,
        message: 'Doctor identifier not found'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const filename = req.file.filename;
    const avatar_url = `${UPLOADS_BASE_URL}/${filename}`;

    // Update avatar_url in database
    const pool = await poolPromise;
    
    // Check if columns exist
    let hasAvatarUrl = false;
    let hasUpdatedAt = false;
    try {
      const checkResult = await pool
        .request()
        .query(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_NAME = 'BAC_SI' 
          AND COLUMN_NAME IN ('avatar_url', 'updated_at')
        `);
      const columns = checkResult.recordset.map((r: any) => r.COLUMN_NAME);
      hasAvatarUrl = columns.includes('avatar_url');
      hasUpdatedAt = columns.includes('updated_at');
    } catch (e) {
      // If check fails, assume avatar_url exists (user confirmed it exists)
      console.warn('Could not check columns, assuming avatar_url exists:', e);
      hasAvatarUrl = true;
      hasUpdatedAt = false;
    }
    
    if (!hasAvatarUrl) {
      return res.status(400).json({
        success: false,
        message: 'avatar_url column does not exist. Please add it to the BAC_SI table.'
      });
    }
    
    const updateFields = ['avatar_url = @avatar_url'];
    if (hasUpdatedAt) {
      updateFields.push('updated_at = GETDATE()');
    }
    
    await pool
      .request()
      .input('ma_bac_si', ma_bac_si)
      .input('avatar_url', avatar_url)
      .query(`
        UPDATE BAC_SI
        SET ${updateFields.join(', ')}
        WHERE ma_bac_si = @ma_bac_si
      `);

    res.json({
      success: true,
      message: 'Avatar uploaded successfully',
      data: {
        avatar_url
      }
    });
  } catch (error: any) {
    console.error('Error uploading avatar:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to upload avatar',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

