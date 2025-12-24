const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { protect, isAdmin } = require('../middleware/auth.middleware');
const { poolPromise } = require('../database/db-config');
const { v4: uuidv4 } = require('uuid');

// Apply authentication and admin authorization
router.use(protect);
router.use(isAdmin);

// GET /api/admin/medicines - Lấy danh sách thuốc
router.get('/', async (req, res) => {
  try {
    const { search, ma_kho_thuoc, page = 1, limit = 20 } = req.query;
    const pool = await poolPromise;
    
    let query = `
      SELECT 
        t.ma_thuoc,
        t.ten_thuoc,
        t.don_vi,
        t.gia,
        t.ma_kho_thuoc,
        kt.ten_kho,
        kt.ton_kho,
        kt.hoat_dong
      FROM THUOC t
      LEFT JOIN KHO_THUOC kt ON t.ma_kho_thuoc = kt.ma_kho_thuoc
      WHERE 1=1
    `;
    
    const request = pool.request();
    
    // Search filter
    if (search) {
      query += ` AND (t.ten_thuoc LIKE @search OR t.ma_thuoc LIKE @search)`;
      request.input('search', `%${search}%`);
    }
    
    // Filter by warehouse
    if (ma_kho_thuoc) {
      query += ` AND t.ma_kho_thuoc = @ma_kho_thuoc`;
      request.input('ma_kho_thuoc', ma_kho_thuoc);
    }
    
    query += ` ORDER BY t.ten_thuoc ASC`;
    
    // Pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ` OFFSET ${offset} ROWS FETCH NEXT ${parseInt(limit)} ROWS ONLY`;
    
    const result = await request.query(query);
    
    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total
      FROM THUOC t
      WHERE 1=1
    `;
    const countRequest = pool.request();
    if (search) {
      countQuery += ` AND (t.ten_thuoc LIKE @search OR t.ma_thuoc LIKE @search)`;
      countRequest.input('search', `%${search}%`);
    }
    if (ma_kho_thuoc) {
      countQuery += ` AND t.ma_kho_thuoc = @ma_kho_thuoc`;
      countRequest.input('ma_kho_thuoc', ma_kho_thuoc);
    }
    const countResult = await countRequest.query(countQuery);
    const total = countResult.recordset[0]?.total || 0;
    
    res.json({
      success: true,
      data: result.recordset.map(item => ({
        ma_thuoc: item.ma_thuoc,
        ten_thuoc: item.ten_thuoc,
        don_vi: item.don_vi,
        gia: parseFloat(item.gia) || 0,
        ma_kho_thuoc: item.ma_kho_thuoc,
        ten_kho: item.ten_kho,
        ton_kho: item.ton_kho || 0,
        hoat_dong: item.hoat_dong
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(total),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('❌ Get medicines error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi lấy danh sách thuốc'
    });
  }
});

// GET /api/admin/medicines/:id - Lấy chi tiết thuốc
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;
    
    const result = await pool.request()
      .input('ma_thuoc', id)
      .query(`
        SELECT 
          t.ma_thuoc,
          t.ten_thuoc,
          t.don_vi,
          t.gia,
          t.ma_kho_thuoc,
          kt.ten_kho,
          kt.don_vi_tinh,
          kt.duong_dung,
          kt.gia_niem_yet,
          kt.ton_kho,
          kt.hoat_dong
        FROM THUOC t
        LEFT JOIN KHO_THUOC kt ON t.ma_kho_thuoc = kt.ma_kho_thuoc
        WHERE t.ma_thuoc = @ma_thuoc
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thuốc'
      });
    }
    
    const item = result.recordset[0];
    res.json({
      success: true,
      data: {
        ma_thuoc: item.ma_thuoc,
        ten_thuoc: item.ten_thuoc,
        don_vi: item.don_vi,
        gia: parseFloat(item.gia) || 0,
        ma_kho_thuoc: item.ma_kho_thuoc,
        ten_kho: item.ten_kho,
        don_vi_tinh: item.don_vi_tinh,
        duong_dung: item.duong_dung,
        gia_niem_yet: parseFloat(item.gia_niem_yet) || 0,
        ton_kho: item.ton_kho || 0,
        hoat_dong: item.hoat_dong
      }
    });
  } catch (error) {
    console.error('❌ Get medicine detail error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi lấy chi tiết thuốc'
    });
  }
});

// POST /api/admin/medicines - Tạo thuốc mới
router.post('/', [
  body('ten_thuoc').trim().notEmpty().withMessage('Tên thuốc là bắt buộc'),
  body('don_vi').trim().notEmpty().withMessage('Đơn vị là bắt buộc'),
  body('gia').isFloat({ min: 0 }).withMessage('Giá phải là số dương'),
], async (req, res) => {
  try {
    const { ten_thuoc, don_vi, gia, ma_kho_thuoc } = req.body;
    const pool = await poolPromise;
    const ma_thuoc = uuidv4();
    
    // Check if warehouse exists (if provided)
    if (ma_kho_thuoc) {
      const warehouseCheck = await pool.request()
        .input('ma_kho_thuoc', ma_kho_thuoc)
        .query('SELECT ma_kho_thuoc FROM KHO_THUOC WHERE ma_kho_thuoc = @ma_kho_thuoc');
      
      if (warehouseCheck.recordset.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Kho thuốc không tồn tại'
        });
      }
    }
    
    await pool.request()
      .input('ma_thuoc', ma_thuoc)
      .input('ten_thuoc', ten_thuoc)
      .input('don_vi', don_vi)
      .input('gia', parseFloat(gia))
      .input('ma_kho_thuoc', ma_kho_thuoc || null)
      .query(`
        INSERT INTO THUOC (ma_thuoc, ten_thuoc, don_vi, gia, ma_kho_thuoc)
        VALUES (@ma_thuoc, @ten_thuoc, @don_vi, @gia, @ma_kho_thuoc)
      `);
    
    // Get created medicine
    const result = await pool.request()
      .input('ma_thuoc', ma_thuoc)
      .query(`
        SELECT 
          t.ma_thuoc,
          t.ten_thuoc,
          t.don_vi,
          t.gia,
          t.ma_kho_thuoc,
          kt.ten_kho,
          kt.ton_kho,
          kt.hoat_dong
        FROM THUOC t
        LEFT JOIN KHO_THUOC kt ON t.ma_kho_thuoc = kt.ma_kho_thuoc
        WHERE t.ma_thuoc = @ma_thuoc
      `);
    
    res.status(201).json({
      success: true,
      message: 'Tạo thuốc thành công',
      data: result.recordset[0]
    });
  } catch (error) {
    console.error('❌ Create medicine error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi tạo thuốc'
    });
  }
});

// PUT /api/admin/medicines/:id - Cập nhật thuốc
router.put('/:id', [
  body('ten_thuoc').optional().trim().notEmpty().withMessage('Tên thuốc không được để trống'),
  body('don_vi').optional().trim().notEmpty().withMessage('Đơn vị không được để trống'),
  body('gia').optional().isFloat({ min: 0 }).withMessage('Giá phải là số dương'),
], async (req, res) => {
  try {
    const { id } = req.params;
    const { ten_thuoc, don_vi, gia, ma_kho_thuoc } = req.body;
    const pool = await poolPromise;
    
    // Check if medicine exists
    const checkResult = await pool.request()
      .input('ma_thuoc', id)
      .query('SELECT ma_thuoc FROM THUOC WHERE ma_thuoc = @ma_thuoc');
    
    if (checkResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thuốc'
      });
    }
    
    // Check if warehouse exists (if provided)
    if (ma_kho_thuoc) {
      const warehouseCheck = await pool.request()
        .input('ma_kho_thuoc', ma_kho_thuoc)
        .query('SELECT ma_kho_thuoc FROM KHO_THUOC WHERE ma_kho_thuoc = @ma_kho_thuoc');
      
      if (warehouseCheck.recordset.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Kho thuốc không tồn tại'
        });
      }
    }
    
    // Build update query dynamically
    const updates = [];
    const request = pool.request().input('ma_thuoc', id);
    
    if (ten_thuoc !== undefined) {
      updates.push('ten_thuoc = @ten_thuoc');
      request.input('ten_thuoc', ten_thuoc);
    }
    if (don_vi !== undefined) {
      updates.push('don_vi = @don_vi');
      request.input('don_vi', don_vi);
    }
    if (gia !== undefined) {
      updates.push('gia = @gia');
      request.input('gia', parseFloat(gia));
    }
    if (ma_kho_thuoc !== undefined) {
      updates.push('ma_kho_thuoc = @ma_kho_thuoc');
      request.input('ma_kho_thuoc', ma_kho_thuoc || null);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Không có dữ liệu để cập nhật'
      });
    }
    
    await request.query(`
      UPDATE THUOC
      SET ${updates.join(', ')}
      WHERE ma_thuoc = @ma_thuoc
    `);
    
    // Get updated medicine
    const result = await pool.request()
      .input('ma_thuoc', id)
      .query(`
        SELECT 
          t.ma_thuoc,
          t.ten_thuoc,
          t.don_vi,
          t.gia,
          t.ma_kho_thuoc,
          kt.ten_kho,
          kt.ton_kho,
          kt.hoat_dong
        FROM THUOC t
        LEFT JOIN KHO_THUOC kt ON t.ma_kho_thuoc = kt.ma_kho_thuoc
        WHERE t.ma_thuoc = @ma_thuoc
      `);
    
    res.json({
      success: true,
      message: 'Cập nhật thuốc thành công',
      data: result.recordset[0]
    });
  } catch (error) {
    console.error('❌ Update medicine error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi cập nhật thuốc'
    });
  }
});

// DELETE /api/admin/medicines/:id - Xóa thuốc
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;
    
    // Check if medicine exists
    const checkResult = await pool.request()
      .input('ma_thuoc', id)
      .query('SELECT ma_thuoc FROM THUOC WHERE ma_thuoc = @ma_thuoc');
    
    if (checkResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thuốc'
      });
    }
    
    // Check if medicine is used in prescriptions
    const prescriptionCheck = await pool.request()
      .input('ma_thuoc', id)
      .query('SELECT TOP 1 ma_chi_tiet_don FROM DON_THUOC_CHI_TIET WHERE ma_thuoc = @ma_thuoc');
    
    if (prescriptionCheck.recordset.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Không thể xóa thuốc vì đã được sử dụng trong đơn thuốc'
      });
    }
    
    await pool.request()
      .input('ma_thuoc', id)
      .query('DELETE FROM THUOC WHERE ma_thuoc = @ma_thuoc');
    
    res.json({
      success: true,
      message: 'Xóa thuốc thành công'
    });
  } catch (error) {
    console.error('❌ Delete medicine error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi xóa thuốc'
    });
  }
});

// GET /api/admin/medicines/warehouses/list - Lấy danh sách kho thuốc (chỉ active)
router.get('/warehouses/list', async (req, res) => {
  try {
    const pool = await poolPromise;
    
    const result = await pool.request().query(`
      SELECT 
        ma_kho_thuoc,
        ten_kho,
        don_vi_tinh,
        duong_dung,
        gia_niem_yet,
        ton_kho,
        hoat_dong
      FROM KHO_THUOC
      WHERE hoat_dong = 1
      ORDER BY ten_kho ASC
    `);
    
    res.json({
      success: true,
      data: result.recordset.map(item => ({
        ma_kho_thuoc: item.ma_kho_thuoc,
        ten_kho: item.ten_kho,
        don_vi_tinh: item.don_vi_tinh,
        duong_dung: item.duong_dung,
        gia_niem_yet: parseFloat(item.gia_niem_yet) || 0,
        ton_kho: item.ton_kho || 0,
        hoat_dong: item.hoat_dong
      }))
    });
  } catch (error) {
    console.error('❌ Get warehouses error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi lấy danh sách kho thuốc'
    });
  }
});

// GET /api/admin/medicines/warehouses - Lấy danh sách kho thuốc (tất cả)
router.get('/warehouses', async (req, res) => {
  try {
    const { search, hoat_dong } = req.query;
    const pool = await poolPromise;
    
    let query = `
      SELECT 
        ma_kho_thuoc,
        ten_kho,
        don_vi_tinh,
        duong_dung,
        gia_niem_yet,
        ton_kho,
        hoat_dong
      FROM KHO_THUOC
      WHERE 1=1
    `;
    
    const request = pool.request();
    
    if (search) {
      query += ` AND (ten_kho LIKE @search OR ma_kho_thuoc LIKE @search)`;
      request.input('search', `%${search}%`);
    }
    
    if (hoat_dong !== undefined) {
      query += ` AND hoat_dong = @hoat_dong`;
      request.input('hoat_dong', hoat_dong === 'true' ? 1 : 0);
    }
    
    query += ` ORDER BY ten_kho ASC`;
    
    const result = await request.query(query);
    
    res.json({
      success: true,
      data: result.recordset.map(item => ({
        ma_kho_thuoc: item.ma_kho_thuoc,
        ten_kho: item.ten_kho,
        don_vi_tinh: item.don_vi_tinh,
        duong_dung: item.duong_dung,
        gia_niem_yet: parseFloat(item.gia_niem_yet) || 0,
        ton_kho: item.ton_kho || 0,
        hoat_dong: item.hoat_dong
      }))
    });
  } catch (error) {
    console.error('❌ Get warehouses error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi lấy danh sách kho thuốc'
    });
  }
});

// GET /api/admin/medicines/warehouses/:id - Lấy chi tiết kho thuốc
router.get('/warehouses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;
    
    const result = await pool.request()
      .input('ma_kho_thuoc', id)
      .query(`
        SELECT 
          ma_kho_thuoc,
          ten_kho,
          don_vi_tinh,
          duong_dung,
          gia_niem_yet,
          ton_kho,
          hoat_dong
        FROM KHO_THUOC
        WHERE ma_kho_thuoc = @ma_kho_thuoc
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy kho thuốc'
      });
    }
    
    const item = result.recordset[0];
    res.json({
      success: true,
      data: {
        ma_kho_thuoc: item.ma_kho_thuoc,
        ten_kho: item.ten_kho,
        don_vi_tinh: item.don_vi_tinh,
        duong_dung: item.duong_dung,
        gia_niem_yet: parseFloat(item.gia_niem_yet) || 0,
        ton_kho: item.ton_kho || 0,
        hoat_dong: item.hoat_dong
      }
    });
  } catch (error) {
    console.error('❌ Get warehouse detail error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi lấy chi tiết kho thuốc'
    });
  }
});

// POST /api/admin/medicines/warehouses - Tạo kho thuốc mới
router.post('/warehouses', [
  body('ten_kho').trim().notEmpty().withMessage('Tên kho là bắt buộc'),
  body('hoat_dong').optional().isBoolean().withMessage('hoat_dong phải là boolean'),
], async (req, res) => {
  try {
    const { ten_kho, don_vi_tinh, duong_dung, gia_niem_yet, ton_kho, hoat_dong } = req.body;
    const pool = await poolPromise;
    const ma_kho_thuoc = uuidv4();
    
    await pool.request()
      .input('ma_kho_thuoc', ma_kho_thuoc)
      .input('ten_kho', ten_kho)
      .input('don_vi_tinh', don_vi_tinh || null)
      .input('duong_dung', duong_dung || null)
      .input('gia_niem_yet', gia_niem_yet ? parseFloat(gia_niem_yet) : null)
      .input('ton_kho', ton_kho ? parseInt(ton_kho) : 0)
      .input('hoat_dong', hoat_dong !== undefined ? (hoat_dong ? 1 : 0) : 1)
      .query(`
        INSERT INTO KHO_THUOC (
          ma_kho_thuoc, ten_kho, don_vi_tinh, duong_dung,
          gia_niem_yet, ton_kho, hoat_dong
        )
        VALUES (
          @ma_kho_thuoc, @ten_kho, @don_vi_tinh, @duong_dung,
          @gia_niem_yet, @ton_kho, @hoat_dong
        )
      `);
    
    // Get created warehouse
    const result = await pool.request()
      .input('ma_kho_thuoc', ma_kho_thuoc)
      .query(`
        SELECT 
          ma_kho_thuoc,
          ten_kho,
          don_vi_tinh,
          duong_dung,
          gia_niem_yet,
          ton_kho,
          hoat_dong
        FROM KHO_THUOC
        WHERE ma_kho_thuoc = @ma_kho_thuoc
      `);
    
    res.status(201).json({
      success: true,
      message: 'Tạo kho thuốc thành công',
      data: {
        ...result.recordset[0],
        gia_niem_yet: parseFloat(result.recordset[0].gia_niem_yet) || 0,
        ton_kho: result.recordset[0].ton_kho || 0
      }
    });
  } catch (error) {
    console.error('❌ Create warehouse error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi tạo kho thuốc'
    });
  }
});

// PUT /api/admin/medicines/warehouses/:id - Cập nhật kho thuốc
router.put('/warehouses/:id', [
  body('ten_kho').optional().trim().notEmpty().withMessage('Tên kho không được để trống'),
  body('hoat_dong').optional().isBoolean().withMessage('hoat_dong phải là boolean'),
], async (req, res) => {
  try {
    const { id } = req.params;
    const { ten_kho, don_vi_tinh, duong_dung, gia_niem_yet, ton_kho, hoat_dong } = req.body;
    const pool = await poolPromise;
    
    // Check if warehouse exists
    const checkResult = await pool.request()
      .input('ma_kho_thuoc', id)
      .query('SELECT ma_kho_thuoc FROM KHO_THUOC WHERE ma_kho_thuoc = @ma_kho_thuoc');
    
    if (checkResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy kho thuốc'
      });
    }
    
    // Build update query dynamically
    const updates = [];
    const request = pool.request().input('ma_kho_thuoc', id);
    
    if (ten_kho !== undefined) {
      updates.push('ten_kho = @ten_kho');
      request.input('ten_kho', ten_kho);
    }
    if (don_vi_tinh !== undefined) {
      updates.push('don_vi_tinh = @don_vi_tinh');
      request.input('don_vi_tinh', don_vi_tinh);
    }
    if (duong_dung !== undefined) {
      updates.push('duong_dung = @duong_dung');
      request.input('duong_dung', duong_dung);
    }
    if (gia_niem_yet !== undefined) {
      updates.push('gia_niem_yet = @gia_niem_yet');
      request.input('gia_niem_yet', gia_niem_yet ? parseFloat(gia_niem_yet) : null);
    }
    if (ton_kho !== undefined) {
      updates.push('ton_kho = @ton_kho');
      request.input('ton_kho', parseInt(ton_kho) || 0);
    }
    if (hoat_dong !== undefined) {
      updates.push('hoat_dong = @hoat_dong');
      request.input('hoat_dong', hoat_dong ? 1 : 0);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Không có dữ liệu để cập nhật'
      });
    }
    
    await request.query(`
      UPDATE KHO_THUOC
      SET ${updates.join(', ')}
      WHERE ma_kho_thuoc = @ma_kho_thuoc
    `);
    
    // Get updated warehouse
    const result = await pool.request()
      .input('ma_kho_thuoc', id)
      .query(`
        SELECT 
          ma_kho_thuoc,
          ten_kho,
          don_vi_tinh,
          duong_dung,
          gia_niem_yet,
          ton_kho,
          hoat_dong
        FROM KHO_THUOC
        WHERE ma_kho_thuoc = @ma_kho_thuoc
      `);
    
    res.json({
      success: true,
      message: 'Cập nhật kho thuốc thành công',
      data: {
        ...result.recordset[0],
        gia_niem_yet: parseFloat(result.recordset[0].gia_niem_yet) || 0,
        ton_kho: result.recordset[0].ton_kho || 0
      }
    });
  } catch (error) {
    console.error('❌ Update warehouse error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi cập nhật kho thuốc'
    });
  }
});

// DELETE /api/admin/medicines/warehouses/:id - Xóa kho thuốc
router.delete('/warehouses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;
    
    // Check if warehouse exists
    const checkResult = await pool.request()
      .input('ma_kho_thuoc', id)
      .query('SELECT ma_kho_thuoc FROM KHO_THUOC WHERE ma_kho_thuoc = @ma_kho_thuoc');
    
    if (checkResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy kho thuốc'
      });
    }
    
    // Check if warehouse is used in medicines
    const medicineCheck = await pool.request()
      .input('ma_kho_thuoc', id)
      .query('SELECT TOP 1 ma_thuoc FROM THUOC WHERE ma_kho_thuoc = @ma_kho_thuoc');
    
    if (medicineCheck.recordset.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Không thể xóa kho thuốc vì đã có thuốc sử dụng kho này'
      });
    }
    
    await pool.request()
      .input('ma_kho_thuoc', id)
      .query('DELETE FROM KHO_THUOC WHERE ma_kho_thuoc = @ma_kho_thuoc');
    
    res.json({
      success: true,
      message: 'Xóa kho thuốc thành công'
    });
  } catch (error) {
    console.error('❌ Delete warehouse error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi xóa kho thuốc'
    });
  }
});

module.exports = router;

