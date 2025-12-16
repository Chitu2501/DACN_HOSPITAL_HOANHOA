const { poolPromise } = require('../database/db-config');

// Create department
exports.createDepartment = async (req, res) => {
  try {
    const { ma_khoa, ten_khoa, mo_ta, vi_tri } = req.body;

    if (!ma_khoa || !ten_khoa) {
      return res.status(400).json({
        success: false,
        message: 'Mã khoa và tên khoa là bắt buộc'
      });
    }

    const pool = await poolPromise;
    const dup = await pool
      .request()
      .input('ma_khoa', ma_khoa.trim())
      .query('SELECT 1 FROM KHOA WHERE ma_khoa = @ma_khoa');
    if (dup.recordset.length > 0) {
      return res.status(400).json({ success: false, message: 'Mã khoa đã tồn tại' });
    }

    const inserted = await pool
      .request()
      .input('ma_khoa', ma_khoa.trim())
      .input('ten_khoa', ten_khoa.trim())
      .input('mo_ta', mo_ta || null)
      .input('vi_tri', vi_tri || null)
      .query(
        `INSERT INTO KHOA (ma_khoa, ten_khoa, mo_ta, vi_tri)
         OUTPUT INSERTED.*
         VALUES (@ma_khoa, @ten_khoa, @mo_ta, @vi_tri)`
      );

    return res.status(201).json({
      success: true,
      message: 'Tạo chuyên khoa thành công',
      data: inserted.recordset[0]
    });
  } catch (err) {
    console.error('createDepartment error:', err);
    return res.status(500).json({ success: false, message: 'Lỗi tạo chuyên khoa', error: err.message });
  }
};

// Get list
exports.getDepartments = async (req, res) => {
  try {
    const pool = await poolPromise;
    const list = await pool.request().query('SELECT * FROM KHOA ORDER BY ten_khoa');
    return res.status(200).json({
      success: true,
      count: list.recordset.length,
      data: list.recordset
    });
  } catch (err) {
    console.error('getDepartments error:', err);
    return res.status(500).json({ success: false, message: 'Lỗi lấy danh sách chuyên khoa', error: err.message });
  }
};

// Update
exports.updateDepartment = async (req, res) => {
  try {
    const { id } = req.params; // id sẽ là ma_khoa
    const { ten_khoa, mo_ta, vi_tri } = req.body;

    const pool = await poolPromise;
    const exists = await pool.request().input('ma_khoa', id).query('SELECT * FROM KHOA WHERE ma_khoa = @ma_khoa');
    if (exists.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy chuyên khoa' });
    }

    await pool
      .request()
      .input('ma_khoa', id)
      .input('ten_khoa', ten_khoa ?? exists.recordset[0].ten_khoa)
      .input('mo_ta', mo_ta ?? exists.recordset[0].mo_ta)
      .input('vi_tri', vi_tri ?? exists.recordset[0].vi_tri)
      .query(
        `UPDATE KHOA
         SET ten_khoa = @ten_khoa,
             mo_ta    = @mo_ta,
             vi_tri   = @vi_tri
         WHERE ma_khoa = @ma_khoa`
      );

    const updated = await pool.request().input('ma_khoa', id).query('SELECT * FROM KHOA WHERE ma_khoa = @ma_khoa');

    return res.status(200).json({
      success: true,
      message: 'Cập nhật chuyên khoa thành công',
      data: updated.recordset[0]
    });
  } catch (err) {
    console.error('updateDepartment error:', err);
    return res.status(500).json({ success: false, message: 'Lỗi cập nhật chuyên khoa', error: err.message });
  }
};

// Delete
exports.deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params; // id = ma_khoa
    const pool = await poolPromise;
    const dept = await pool.request().input('ma_khoa', id).query('SELECT TOP 1 * FROM KHOA WHERE ma_khoa = @ma_khoa');
    if (dept.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy chuyên khoa' });
    }

    await pool.request().input('ma_khoa', id).query('DELETE FROM KHOA WHERE ma_khoa = @ma_khoa');
    return res.status(200).json({ success: true, message: 'Xóa chuyên khoa thành công' });
  } catch (err) {
    console.error('deleteDepartment error:', err);
    return res.status(500).json({ success: false, message: 'Lỗi xóa chuyên khoa', error: err.message });
  }
};

