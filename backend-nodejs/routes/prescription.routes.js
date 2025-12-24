const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { protect, isAdmin } = require('../middleware/auth.middleware');
const { poolPromise } = require('../database/db-config');
const { v4: uuidv4 } = require('uuid');

// Apply authentication and admin authorization
router.use(protect);
router.use(isAdmin);

// GET /api/admin/prescriptions - Lấy danh sách đơn thuốc
router.get('/', async (req, res) => {
  try {
    const { search, ma_ho_so, trang_thai, page = 1, limit = 20 } = req.query;
    const pool = await poolPromise;
    
    let query = `
      SELECT 
        dt.ma_don_thuoc,
        dt.trang_thai,
        dt.ky_luc,
        dt.ghi_chu,
        dt.ma_ho_so,
        dt.ma_thanh_toan,
        hs.ngay_kham,
        hs.ly_do_kham,
        hs.chan_doan_cuoi,
        bn.ten_benh_nhan,
        bn.ma_benh_nhan,
        tt.trang_thai as trang_thai_thanh_toan,
        tt.so_tien_benh_nhan_tra as tong_tien
      FROM DON_THUOC dt
      INNER JOIN HO_SO_KHAM hs ON dt.ma_ho_so = hs.ma_ho_so
      LEFT JOIN LICH_HEN lh ON hs.ma_lich_hen = lh.ma_lich_hen
      LEFT JOIN BENH_NHAN bn ON lh.ma_benh_nhan = bn.ma_benh_nhan
      LEFT JOIN THANH_TOAN tt ON dt.ma_thanh_toan = tt.ma_thanh_toan
      WHERE 1=1
    `;
    
    const request = pool.request();
    
    // Search filter
    if (search) {
      query += ` AND (dt.ma_don_thuoc LIKE @search OR bn.ten_benh_nhan LIKE @search OR hs.ly_do_kham LIKE @search)`;
      request.input('search', `%${search}%`);
    }
    
    // Filter by medical record
    if (ma_ho_so) {
      query += ` AND dt.ma_ho_so = @ma_ho_so`;
      request.input('ma_ho_so', ma_ho_so);
    }
    
    // Filter by status
    if (trang_thai) {
      query += ` AND dt.trang_thai = @trang_thai`;
      request.input('trang_thai', trang_thai);
    }
    
    query += ` ORDER BY dt.ky_luc DESC, dt.ma_don_thuoc DESC`;
    
    // Pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ` OFFSET ${offset} ROWS FETCH NEXT ${parseInt(limit)} ROWS ONLY`;
    
    const result = await request.query(query);
    
    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total
      FROM DON_THUOC dt
      INNER JOIN HO_SO_KHAM hs ON dt.ma_ho_so = hs.ma_ho_so
      LEFT JOIN LICH_HEN lh ON hs.ma_lich_hen = lh.ma_lich_hen
      LEFT JOIN BENH_NHAN bn ON lh.ma_benh_nhan = bn.ma_benh_nhan
      WHERE 1=1
    `;
    const countRequest = pool.request();
    if (search) {
      countQuery += ` AND (dt.ma_don_thuoc LIKE @search OR bn.ten_benh_nhan LIKE @search OR hs.ly_do_kham LIKE @search)`;
      countRequest.input('search', `%${search}%`);
    }
    if (ma_ho_so) {
      countQuery += ` AND dt.ma_ho_so = @ma_ho_so`;
      countRequest.input('ma_ho_so', ma_ho_so);
    }
    if (trang_thai) {
      countQuery += ` AND dt.trang_thai = @trang_thai`;
      countRequest.input('trang_thai', trang_thai);
    }
    const countResult = await countRequest.query(countQuery);
    const total = countResult.recordset[0]?.total || 0;
    
    res.json({
      success: true,
      data: result.recordset.map(item => ({
        ma_don_thuoc: item.ma_don_thuoc,
        trang_thai: item.trang_thai,
        ky_luc: item.ky_luc ? new Date(item.ky_luc).toISOString() : null,
        ghi_chu: item.ghi_chu,
        ma_ho_so: item.ma_ho_so,
        ma_thanh_toan: item.ma_thanh_toan,
        ngay_kham: item.ngay_kham ? new Date(item.ngay_kham).toISOString() : null,
        ly_do_kham: item.ly_do_kham,
        chan_doan_cuoi: item.chan_doan_cuoi,
        ten_benh_nhan: item.ten_benh_nhan,
        ma_benh_nhan: item.ma_benh_nhan,
        trang_thai_thanh_toan: item.trang_thai_thanh_toan,
        tong_tien: parseFloat(item.tong_tien) || 0
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(total),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('❌ Get prescriptions error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi lấy danh sách đơn thuốc'
    });
  }
});

// GET /api/admin/prescriptions/:id - Lấy chi tiết đơn thuốc với danh sách thuốc
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;
    
    // Get prescription info
    const prescriptionResult = await pool.request()
      .input('ma_don_thuoc', id)
      .query(`
        SELECT 
          dt.ma_don_thuoc,
          dt.trang_thai,
          dt.ky_luc,
          dt.ghi_chu,
          dt.ma_ho_so,
          dt.ma_thanh_toan,
          hs.ngay_kham,
          hs.ly_do_kham,
          hs.chan_doan_cuoi,
          hs.trieu_chung,
          bn.ten_benh_nhan,
          bn.ma_benh_nhan,
          bn.sdt,
          bn.email,
          tt.trang_thai as trang_thai_thanh_toan,
          tt.so_tien_benh_nhan_tra as tong_tien
        FROM DON_THUOC dt
        INNER JOIN HO_SO_KHAM hs ON dt.ma_ho_so = hs.ma_ho_so
        LEFT JOIN LICH_HEN lh ON hs.ma_lich_hen = lh.ma_lich_hen
        LEFT JOIN BENH_NHAN bn ON lh.ma_benh_nhan = bn.ma_benh_nhan
        LEFT JOIN THANH_TOAN tt ON dt.ma_thanh_toan = tt.ma_thanh_toan
        WHERE dt.ma_don_thuoc = @ma_don_thuoc
      `);
    
    if (prescriptionResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn thuốc'
      });
    }
    
    const prescription = prescriptionResult.recordset[0];
    
    // Get prescription details (medicines)
    const detailsResult = await pool.request()
      .input('ma_don_thuoc', id)
      .query(`
        SELECT 
          ctdt.ma_chi_tiet_don,
          ctdt.ma_thuoc,
          ctdt.ham_luong_lieu_dung,
          ctdt.tan_suat,
          ctdt.so_ngay,
          ctdt.so_luong,
          ctdt.don_gia,
          ctdt.huong_dan,
          t.ten_thuoc,
          t.don_vi,
          t.gia as gia_thuoc
        FROM DON_THUOC_CHI_TIET ctdt
        INNER JOIN THUOC t ON ctdt.ma_thuoc = t.ma_thuoc
        WHERE ctdt.ma_don_thuoc = @ma_don_thuoc
        ORDER BY ctdt.ma_chi_tiet_don
      `);
    
    res.json({
      success: true,
      data: {
        ma_don_thuoc: prescription.ma_don_thuoc,
        trang_thai: prescription.trang_thai,
        ky_luc: prescription.ky_luc ? new Date(prescription.ky_luc).toISOString() : null,
        ghi_chu: prescription.ghi_chu,
        ma_ho_so: prescription.ma_ho_so,
        ma_thanh_toan: prescription.ma_thanh_toan,
        ngay_kham: prescription.ngay_kham ? new Date(prescription.ngay_kham).toISOString() : null,
        ly_do_kham: prescription.ly_do_kham,
        chan_doan_cuoi: prescription.chan_doan_cuoi,
        trieu_chung: prescription.trieu_chung,
        ten_benh_nhan: prescription.ten_benh_nhan,
        ma_benh_nhan: prescription.ma_benh_nhan,
        sdt: prescription.sdt,
        email: prescription.email,
        trang_thai_thanh_toan: prescription.trang_thai_thanh_toan,
        tong_tien: parseFloat(prescription.tong_tien) || 0,
        chi_tiet: detailsResult.recordset.map(item => ({
          ma_chi_tiet_don: item.ma_chi_tiet_don,
          ma_thuoc: item.ma_thuoc,
          ten_thuoc: item.ten_thuoc,
          don_vi: item.don_vi,
          ham_luong_lieu_dung: item.ham_luong_lieu_dung,
          tan_suat: item.tan_suat,
          so_ngay: item.so_ngay,
          so_luong: item.so_luong,
          don_gia: parseFloat(item.don_gia) || 0,
          gia_thuoc: parseFloat(item.gia_thuoc) || 0,
          huong_dan: item.huong_dan,
          thanh_tien: (parseFloat(item.don_gia) || parseFloat(item.gia_thuoc) || 0) * (item.so_luong || 0)
        }))
      }
    });
  } catch (error) {
    console.error('❌ Get prescription detail error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi lấy chi tiết đơn thuốc'
    });
  }
});

// POST /api/admin/prescriptions - Tạo đơn thuốc mới
router.post('/', [
  body('ma_ho_so').notEmpty().withMessage('Mã hồ sơ là bắt buộc'),
  body('trang_thai').optional().isIn(['draft', 'pending', 'confirmed', 'dispensed', 'cancelled']).withMessage('Trạng thái không hợp lệ'),
], async (req, res) => {
  try {
    const { ma_ho_so, trang_thai, ghi_chu, ma_thanh_toan, chi_tiet } = req.body;
    const pool = await poolPromise;
    const ma_don_thuoc = uuidv4();
    
    // Check if medical record exists
    const medicalRecordCheck = await pool.request()
      .input('ma_ho_so', ma_ho_so)
      .query('SELECT ma_ho_so FROM HO_SO_KHAM WHERE ma_ho_so = @ma_ho_so');
    
    if (medicalRecordCheck.recordset.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Hồ sơ khám không tồn tại'
      });
    }
    
    // Check if payment exists (if provided)
    if (ma_thanh_toan) {
      const paymentCheck = await pool.request()
        .input('ma_thanh_toan', ma_thanh_toan)
        .query('SELECT ma_thanh_toan FROM THANH_TOAN WHERE ma_thanh_toan = @ma_thanh_toan');
      
      if (paymentCheck.recordset.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Thanh toán không tồn tại'
        });
      }
    }
    
    // Create prescription
    await pool.request()
      .input('ma_don_thuoc', ma_don_thuoc)
      .input('trang_thai', trang_thai || 'draft')
      .input('ky_luc', new Date())
      .input('ghi_chu', ghi_chu || null)
      .input('ma_ho_so', ma_ho_so)
      .input('ma_thanh_toan', ma_thanh_toan || null)
      .query(`
        INSERT INTO DON_THUOC (ma_don_thuoc, trang_thai, ky_luc, ghi_chu, ma_ho_so, ma_thanh_toan)
        VALUES (@ma_don_thuoc, @trang_thai, @ky_luc, @ghi_chu, @ma_ho_so, @ma_thanh_toan)
      `);
    
    // Add prescription details if provided
    if (chi_tiet && Array.isArray(chi_tiet) && chi_tiet.length > 0) {
      for (const item of chi_tiet) {
        const ma_chi_tiet_don = uuidv4();
        
        // Check if medicine exists
        const medicineCheck = await pool.request()
          .input('ma_thuoc', item.ma_thuoc)
          .query('SELECT ma_thuoc, gia FROM THUOC WHERE ma_thuoc = @ma_thuoc');
        
        if (medicineCheck.recordset.length === 0) {
          continue; // Skip invalid medicine
        }
        
        const medicine = medicineCheck.recordset[0];
        const don_gia = item.don_gia || medicine.gia || 0;
        
        await pool.request()
          .input('ma_chi_tiet_don', ma_chi_tiet_don)
          .input('ma_thuoc', item.ma_thuoc)
          .input('ma_don_thuoc', ma_don_thuoc)
          .input('ham_luong_lieu_dung', item.ham_luong_lieu_dung || null)
          .input('tan_suat', item.tan_suat || null)
          .input('so_ngay', item.so_ngay || null)
          .input('so_luong', item.so_luong || 0)
          .input('don_gia', don_gia)
          .input('huong_dan', item.huong_dan || null)
          .query(`
            INSERT INTO DON_THUOC_CHI_TIET (
              ma_chi_tiet_don, ma_thuoc, ma_don_thuoc, 
              ham_luong_lieu_dung, tan_suat, so_ngay, 
              so_luong, don_gia, huong_dan
            )
            VALUES (
              @ma_chi_tiet_don, @ma_thuoc, @ma_don_thuoc,
              @ham_luong_lieu_dung, @tan_suat, @so_ngay,
              @so_luong, @don_gia, @huong_dan
            )
          `);
      }
    }
    
    // Get created prescription
    const result = await pool.request()
      .input('ma_don_thuoc', ma_don_thuoc)
      .query(`
        SELECT 
          dt.ma_don_thuoc,
          dt.trang_thai,
          dt.ky_luc,
          dt.ghi_chu,
          dt.ma_ho_so,
          dt.ma_thanh_toan
        FROM DON_THUOC dt
        WHERE dt.ma_don_thuoc = @ma_don_thuoc
      `);
    
    res.status(201).json({
      success: true,
      message: 'Tạo đơn thuốc thành công',
      data: {
        ...result.recordset[0],
        ky_luc: result.recordset[0].ky_luc ? new Date(result.recordset[0].ky_luc).toISOString() : null
      }
    });
  } catch (error) {
    console.error('❌ Create prescription error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi tạo đơn thuốc'
    });
  }
});

// PUT /api/admin/prescriptions/:id - Cập nhật đơn thuốc
router.put('/:id', [
  body('trang_thai').optional().isIn(['draft', 'pending', 'confirmed', 'dispensed', 'cancelled']).withMessage('Trạng thái không hợp lệ'),
], async (req, res) => {
  try {
    const { id } = req.params;
    const { trang_thai, ghi_chu, ma_thanh_toan } = req.body;
    const pool = await poolPromise;
    
    // Check if prescription exists
    const checkResult = await pool.request()
      .input('ma_don_thuoc', id)
      .query('SELECT ma_don_thuoc FROM DON_THUOC WHERE ma_don_thuoc = @ma_don_thuoc');
    
    if (checkResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn thuốc'
      });
    }
    
    // Check if payment exists (if provided)
    if (ma_thanh_toan) {
      const paymentCheck = await pool.request()
        .input('ma_thanh_toan', ma_thanh_toan)
        .query('SELECT ma_thanh_toan FROM THANH_TOAN WHERE ma_thanh_toan = @ma_thanh_toan');
      
      if (paymentCheck.recordset.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Thanh toán không tồn tại'
        });
      }
    }
    
    // Build update query dynamically
    const updates = [];
    const request = pool.request().input('ma_don_thuoc', id);
    
    if (trang_thai !== undefined) {
      updates.push('trang_thai = @trang_thai');
      request.input('trang_thai', trang_thai);
    }
    if (ghi_chu !== undefined) {
      updates.push('ghi_chu = @ghi_chu');
      request.input('ghi_chu', ghi_chu);
    }
    if (ma_thanh_toan !== undefined) {
      updates.push('ma_thanh_toan = @ma_thanh_toan');
      request.input('ma_thanh_toan', ma_thanh_toan || null);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Không có dữ liệu để cập nhật'
      });
    }
    
    await request.query(`
      UPDATE DON_THUOC
      SET ${updates.join(', ')}
      WHERE ma_don_thuoc = @ma_don_thuoc
    `);
    
    // Get updated prescription
    const result = await pool.request()
      .input('ma_don_thuoc', id)
      .query(`
        SELECT 
          dt.ma_don_thuoc,
          dt.trang_thai,
          dt.ky_luc,
          dt.ghi_chu,
          dt.ma_ho_so,
          dt.ma_thanh_toan
        FROM DON_THUOC dt
        WHERE dt.ma_don_thuoc = @ma_don_thuoc
      `);
    
    res.json({
      success: true,
      message: 'Cập nhật đơn thuốc thành công',
      data: {
        ...result.recordset[0],
        ky_luc: result.recordset[0].ky_luc ? new Date(result.recordset[0].ky_luc).toISOString() : null
      }
    });
  } catch (error) {
    console.error('❌ Update prescription error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi cập nhật đơn thuốc'
    });
  }
});

// DELETE /api/admin/prescriptions/:id - Xóa đơn thuốc
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;
    
    // Check if prescription exists
    const checkResult = await pool.request()
      .input('ma_don_thuoc', id)
      .query('SELECT ma_don_thuoc FROM DON_THUOC WHERE ma_don_thuoc = @ma_don_thuoc');
    
    if (checkResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn thuốc'
      });
    }
    
    // Delete prescription details first
    await pool.request()
      .input('ma_don_thuoc', id)
      .query('DELETE FROM DON_THUOC_CHI_TIET WHERE ma_don_thuoc = @ma_don_thuoc');
    
    // Delete prescription
    await pool.request()
      .input('ma_don_thuoc', id)
      .query('DELETE FROM DON_THUOC WHERE ma_don_thuoc = @ma_don_thuoc');
    
    res.json({
      success: true,
      message: 'Xóa đơn thuốc thành công'
    });
  } catch (error) {
    console.error('❌ Delete prescription error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi xóa đơn thuốc'
    });
  }
});

// POST /api/admin/prescriptions/:id/details - Thêm thuốc vào đơn thuốc
router.post('/:id/details', [
  body('ma_thuoc').notEmpty().withMessage('Mã thuốc là bắt buộc'),
  body('so_luong').isInt({ min: 1 }).withMessage('Số lượng phải lớn hơn 0'),
], async (req, res) => {
  try {
    const { id } = req.params;
    const { ma_thuoc, ham_luong_lieu_dung, tan_suat, so_ngay, so_luong, don_gia, huong_dan } = req.body;
    const pool = await poolPromise;
    
    // Check if prescription exists
    const prescriptionCheck = await pool.request()
      .input('ma_don_thuoc', id)
      .query('SELECT ma_don_thuoc FROM DON_THUOC WHERE ma_don_thuoc = @ma_don_thuoc');
    
    if (prescriptionCheck.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn thuốc'
      });
    }
    
    // Check if medicine exists
    const medicineCheck = await pool.request()
      .input('ma_thuoc', ma_thuoc)
      .query('SELECT ma_thuoc, gia FROM THUOC WHERE ma_thuoc = @ma_thuoc');
    
    if (medicineCheck.recordset.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Thuốc không tồn tại'
      });
    }
    
    const medicine = medicineCheck.recordset[0];
    const finalDonGia = don_gia || medicine.gia || 0;
    const ma_chi_tiet_don = uuidv4();
    
    await pool.request()
      .input('ma_chi_tiet_don', ma_chi_tiet_don)
      .input('ma_thuoc', ma_thuoc)
      .input('ma_don_thuoc', id)
      .input('ham_luong_lieu_dung', ham_luong_lieu_dung || null)
      .input('tan_suat', tan_suat || null)
      .input('so_ngay', so_ngay || null)
      .input('so_luong', so_luong)
      .input('don_gia', finalDonGia)
      .input('huong_dan', huong_dan || null)
      .query(`
        INSERT INTO DON_THUOC_CHI_TIET (
          ma_chi_tiet_don, ma_thuoc, ma_don_thuoc,
          ham_luong_lieu_dung, tan_suat, so_ngay,
          so_luong, don_gia, huong_dan
        )
        VALUES (
          @ma_chi_tiet_don, @ma_thuoc, @ma_don_thuoc,
          @ham_luong_lieu_dung, @tan_suat, @so_ngay,
          @so_luong, @don_gia, @huong_dan
        )
      `);
    
    res.status(201).json({
      success: true,
      message: 'Thêm thuốc vào đơn thành công',
      data: { ma_chi_tiet_don }
    });
  } catch (error) {
    console.error('❌ Add prescription detail error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi thêm thuốc vào đơn'
    });
  }
});

// PUT /api/admin/prescriptions/:id/details/:detailId - Cập nhật chi tiết đơn thuốc
router.put('/:id/details/:detailId', async (req, res) => {
  try {
    const { id, detailId } = req.params;
    const { ham_luong_lieu_dung, tan_suat, so_ngay, so_luong, don_gia, huong_dan } = req.body;
    const pool = await poolPromise;
    
    // Check if detail exists
    const detailCheck = await pool.request()
      .input('ma_chi_tiet_don', detailId)
      .input('ma_don_thuoc', id)
      .query('SELECT ma_chi_tiet_don FROM DON_THUOC_CHI_TIET WHERE ma_chi_tiet_don = @ma_chi_tiet_don AND ma_don_thuoc = @ma_don_thuoc');
    
    if (detailCheck.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy chi tiết đơn thuốc'
      });
    }
    
    // Build update query dynamically
    const updates = [];
    const request = pool.request()
      .input('ma_chi_tiet_don', detailId)
      .input('ma_don_thuoc', id);
    
    if (ham_luong_lieu_dung !== undefined) {
      updates.push('ham_luong_lieu_dung = @ham_luong_lieu_dung');
      request.input('ham_luong_lieu_dung', ham_luong_lieu_dung);
    }
    if (tan_suat !== undefined) {
      updates.push('tan_suat = @tan_suat');
      request.input('tan_suat', tan_suat);
    }
    if (so_ngay !== undefined) {
      updates.push('so_ngay = @so_ngay');
      request.input('so_ngay', so_ngay);
    }
    if (so_luong !== undefined) {
      updates.push('so_luong = @so_luong');
      request.input('so_luong', so_luong);
    }
    if (don_gia !== undefined) {
      updates.push('don_gia = @don_gia');
      request.input('don_gia', don_gia);
    }
    if (huong_dan !== undefined) {
      updates.push('huong_dan = @huong_dan');
      request.input('huong_dan', huong_dan);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Không có dữ liệu để cập nhật'
      });
    }
    
    await request.query(`
      UPDATE DON_THUOC_CHI_TIET
      SET ${updates.join(', ')}
      WHERE ma_chi_tiet_don = @ma_chi_tiet_don AND ma_don_thuoc = @ma_don_thuoc
    `);
    
    res.json({
      success: true,
      message: 'Cập nhật chi tiết đơn thuốc thành công'
    });
  } catch (error) {
    console.error('❌ Update prescription detail error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi cập nhật chi tiết đơn thuốc'
    });
  }
});

// DELETE /api/admin/prescriptions/:id/details/:detailId - Xóa thuốc khỏi đơn thuốc
router.delete('/:id/details/:detailId', async (req, res) => {
  try {
    const { id, detailId } = req.params;
    const pool = await poolPromise;
    
    // Check if detail exists
    const detailCheck = await pool.request()
      .input('ma_chi_tiet_don', detailId)
      .input('ma_don_thuoc', id)
      .query('SELECT ma_chi_tiet_don FROM DON_THUOC_CHI_TIET WHERE ma_chi_tiet_don = @ma_chi_tiet_don AND ma_don_thuoc = @ma_don_thuoc');
    
    if (detailCheck.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy chi tiết đơn thuốc'
      });
    }
    
    await pool.request()
      .input('ma_chi_tiet_don', detailId)
      .input('ma_don_thuoc', id)
      .query('DELETE FROM DON_THUOC_CHI_TIET WHERE ma_chi_tiet_don = @ma_chi_tiet_don AND ma_don_thuoc = @ma_don_thuoc');
    
    res.json({
      success: true,
      message: 'Xóa thuốc khỏi đơn thành công'
    });
  } catch (error) {
    console.error('❌ Delete prescription detail error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi xóa thuốc khỏi đơn'
    });
  }
});

module.exports = router;

