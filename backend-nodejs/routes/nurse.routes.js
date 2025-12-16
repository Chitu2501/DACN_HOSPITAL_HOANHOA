const router = require('express').Router();
const { poolPromise } = require('../database/db-config');
const { protect, isNurse } = require('../middleware/auth.middleware');
const { v4: uuidv4 } = require('uuid');

// Helper: Lấy hoặc tạo ma_y_ta từ username của y tá
async function getOrCreateMaYTa(pool, username, userInfo) {
  // Thử tìm trong bảng Y_TA trước
  const yTaResult = await pool
    .request()
    .input('username', username)
    .query('SELECT TOP 1 ma_y_ta FROM Y_TA WHERE ma_y_ta = @username');
  
  if (yTaResult.recordset.length > 0) {
    return yTaResult.recordset[0].ma_y_ta;
  }
  
  // Nếu không có trong Y_TA, tạo mới record trong Y_TA
  const TABLE = process.env.SQL_TABLE_USERS || 'USERS_AUTH';
  const userResult = await pool
    .request()
    .input('username', username)
    .query(`
      SELECT TOP 1 
        username, email, full_name, phone, address, department
      FROM ${TABLE} 
      WHERE username = @username AND role = 'nurse'
    `);
  
  if (userResult.recordset.length === 0) {
    throw new Error('Không tìm thấy thông tin y tá trong hệ thống');
  }
  
  const user = userResult.recordset[0];
  const ma_y_ta = username; // Dùng username làm ma_y_ta
  
  // Validate ma_khoa - BẮT BUỘC phải có vì cột NOT NULL
  let ma_khoa = null;
  
  if (user.department) {
    // Thử tìm theo mã khoa trước
    let khoaCheck = await pool
      .request()
      .input('ma_khoa', user.department)
      .query('SELECT TOP 1 ma_khoa FROM KHOA WHERE ma_khoa = @ma_khoa');
    
    if (khoaCheck.recordset.length > 0) {
      ma_khoa = user.department;
    } else {
      // Nếu không tìm thấy theo mã, thử tìm theo tên khoa
      khoaCheck = await pool
        .request()
        .input('ten_khoa', `%${user.department}%`)
        .query('SELECT TOP 1 ma_khoa FROM KHOA WHERE ten_khoa LIKE @ten_khoa');
      
      if (khoaCheck.recordset.length > 0) {
        ma_khoa = khoaCheck.recordset[0].ma_khoa;
      }
    }
  }
  
  // Nếu vẫn không tìm thấy ma_khoa, lấy khoa đầu tiên trong hệ thống làm mặc định
  if (!ma_khoa) {
    const defaultKhoa = await pool
      .request()
      .query('SELECT TOP 1 ma_khoa FROM KHOA ORDER BY ma_khoa');
    
    if (defaultKhoa.recordset.length > 0) {
      ma_khoa = defaultKhoa.recordset[0].ma_khoa;
      console.log(`⚠️  Không tìm thấy khoa cho y tá ${username}, sử dụng khoa mặc định: ${ma_khoa}`);
    } else {
      throw new Error('Hệ thống chưa có khoa nào. Vui lòng tạo khoa trước khi đăng ký ca làm việc.');
    }
  }
  
  // Tạo record trong Y_TA
  await pool
    .request()
    .input('ma_y_ta', ma_y_ta)
    .input('ma_khoa', ma_khoa)
    .input('ho_ten', user.full_name || username)
    .input('email', user.email || null)
    .input('so_dien_thoai', user.phone || null)
    .query(`
      INSERT INTO Y_TA (ma_y_ta, ma_khoa, ho_ten, email, so_dien_thoai)
      VALUES (@ma_y_ta, @ma_khoa, @ho_ten, @email, @so_dien_thoai)
    `);
  
  console.log(`✅ Created Y_TA record for nurse: ${username}`);
  return ma_y_ta;
}

// Đảm bảo bảng NURSE_MEDICATIONS tồn tại
async function ensureMedicationsTable(pool) {
  const createQuery = `
    IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[NURSE_MEDICATIONS]') AND type in (N'U'))
    BEGIN
      CREATE TABLE NURSE_MEDICATIONS (
        id UNIQUEIDENTIFIER PRIMARY KEY,
        ma_ho_so NVARCHAR(255) NULL,
        ma_lich_hen NVARCHAR(255) NULL,
        thuoc_json NVARCHAR(MAX) NULL, -- lưu JSON danh sách thuốc/ghi chú
        ghi_chu NVARCHAR(500) NULL,
        trang_thai NVARCHAR(50) DEFAULT 'dispensed',
        ma_y_ta NVARCHAR(255) NULL,
        tao_luc DATETIME DEFAULT GETDATE(),
        cap_nhat_luc DATETIME DEFAULT GETDATE()
      );
      CREATE INDEX IX_NURSE_MEDICATIONS_LICH_HEN ON NURSE_MEDICATIONS(ma_lich_hen);
      CREATE INDEX IX_NURSE_MEDICATIONS_HO_SO ON NURSE_MEDICATIONS(ma_ho_so);
    END
  `;
  await pool.request().query(createQuery);
}

// Tính BMI nếu có chiều cao & cân nặng
function calculateBMI(heightCm, weightKg) {
  if (!heightCm || !weightKg) return null;
  const h = Number(heightCm) / 100;
  if (!h) return null;
  const bmi = Number(weightKg) / (h * h);
  if (!isFinite(bmi)) return null;
  return Number(bmi.toFixed(2));
}

// GET /api/nurse/vitals?ma_lich_hen=...&ma_ho_so=...
router.get('/vitals', protect, isNurse, async (req, res) => {
  try {
    const { ma_lich_hen, ma_ho_so } = req.query;
    if (!ma_lich_hen && !ma_ho_so) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu mã lịch hẹn hoặc mã hồ sơ',
      });
    }

    const pool = await poolPromise;
    let targetMaHoSo = ma_ho_so;

    // Nếu có ma_lich_hen, tìm ma_ho_so từ HO_SO_KHAM hoặc LICH_HEN
    if (ma_lich_hen && !targetMaHoSo) {
      const hoSoResult = await pool
        .request()
        .input('ma_lich_hen', ma_lich_hen)
        .query(`
          SELECT TOP 1 hs.ma_ho_so
          FROM HO_SO_KHAM hs
          WHERE hs.ma_lich_hen = @ma_lich_hen
        `);
      
      if (hoSoResult.recordset.length > 0) {
        targetMaHoSo = hoSoResult.recordset[0].ma_ho_so;
      } else {
        // Nếu chưa có HO_SO_KHAM, có thể tạo tạm hoặc trả về null
        // Ở đây ta trả về null để frontend biết chưa có hồ sơ
      }
    }

    if (!targetMaHoSo) {
      return res.json({
        success: true,
        data: null,
        message: 'Chưa có hồ sơ khám cho lịch hẹn này',
      });
    }

    // Query từ SINH_HIEU
    const result = await pool
      .request()
      .input('ma_ho_so', targetMaHoSo)
      .query(`
        SELECT TOP 1 
          ma_sinh_hieu,
          do_luc,
          chieu_cao_cm,
          can_nang_kg,
          nhiet_do_c,
          mach_lan_phut,
          huyet_ap_tam_thu,
          huyet_ap_tam_truong,
          spo2_phan_tram,
          ma_ho_so,
          ma_y_ta
        FROM SINH_HIEU
        WHERE ma_ho_so = @ma_ho_so
        ORDER BY do_luc DESC
      `);

    // Map về format frontend mong đợi
    const record = result.recordset[0];
    if (!record) {
      return res.json({
        success: true,
        data: null,
      });
    }

    const mappedData = {
      ma_sinh_hieu: record.ma_sinh_hieu,
      ma_ho_so: record.ma_ho_so,
      ma_y_ta: record.ma_y_ta,
      mach: record.mach_lan_phut,
      nhiet_do: record.nhiet_do_c,
      huyet_ap_tam_thu: record.huyet_ap_tam_thu,
      huyet_ap_tam_truong: record.huyet_ap_tam_truong,
      spo2: record.spo2_phan_tram,
      chieu_cao_cm: record.chieu_cao_cm,
      can_nang_kg: record.can_nang_kg,
      do_luc: record.do_luc,
    };

    res.json({
      success: true,
      data: mappedData,
    });
  } catch (err) {
    console.error('❌ Nurse get vitals error:', err.message);
    res.status(500).json({
      success: false,
      message: err.message || 'Lỗi khi lấy sinh hiệu',
    });
  }
});

// POST /api/nurse/vitals - tạo/cập nhật sinh hiệu vào bảng SINH_HIEU
router.post('/vitals', protect, isNurse, async (req, res) => {
  try {
    const {
      ma_lich_hen,
      ma_ho_so,
      mach,
      nhiet_do,
      huyet_ap_tam_thu,
      huyet_ap_tam_truong,
      nhip_tho,
      spo2,
      chieu_cao_cm,
      can_nang_kg,
      bmi: bmiInput,
      ghi_chu,
    } = req.body;

    if (!ma_lich_hen && !ma_ho_so) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu mã lịch hẹn hoặc mã hồ sơ',
      });
    }

    const pool = await poolPromise;
    const nurseUsername = req.user?.username || req.user?.id;
    
    if (!nurseUsername) {
      return res.status(401).json({
        success: false,
        message: 'Không xác định được y tá',
      });
    }

    // Đảm bảo ma_y_ta tồn tại trong Y_TA
    const maYTa = await getOrCreateMaYTa(pool, nurseUsername, req.user);

    // Tìm ma_ho_so từ ma_lich_hen nếu cần
    let targetMaHoSo = ma_ho_so;
    
    if (ma_lich_hen && !targetMaHoSo) {
      // Thử tìm từ HO_SO_KHAM trước
      const hoSoResult = await pool
        .request()
        .input('ma_lich_hen', ma_lich_hen)
        .query(`
          SELECT TOP 1 ma_ho_so
          FROM HO_SO_KHAM
          WHERE ma_lich_hen = @ma_lich_hen
        `);
      
      if (hoSoResult.recordset.length > 0) {
        targetMaHoSo = hoSoResult.recordset[0].ma_ho_so;
      } else {
        // Nếu chưa có HO_SO_KHAM, tạo mới từ LICH_HEN
        const lichHenResult = await pool
          .request()
          .input('ma_lich_hen', ma_lich_hen)
          .query(`
            SELECT TOP 1 
              lh.ma_lich_hen,
              lh.thoi_gian_hen,
              lh.ghi_chu,
              lh.ma_benh_nhan,
              ca.ma_bac_si
            FROM LICH_HEN lh
            LEFT JOIN CA_BAC_SI ca ON lh.ma_ca = ca.ma_ca
            WHERE lh.ma_lich_hen = @ma_lich_hen
          `);
        
        if (lichHenResult.recordset.length === 0) {
          return res.status(404).json({
            success: false,
            message: 'Không tìm thấy lịch hẹn',
          });
        }

        const lichHen = lichHenResult.recordset[0];
        const newMaHoSo = uuidv4();
        const ngayKham = new Date(lichHen.thoi_gian_hen);
        
        // Tạo HO_SO_KHAM mới
        await pool
          .request()
          .input('ma_ho_so', newMaHoSo)
          .input('ngay_kham', ngayKham.toISOString().split('T')[0])
          .input('ly_do_kham', lichHen.ghi_chu || 'Khám bệnh')
          .input('ma_lich_hen', ma_lich_hen)
          .input('trang_thai', 'in_progress')
          .input('tao_luc', new Date())
          .query(`
            INSERT INTO HO_SO_KHAM (ma_ho_so, ngay_kham, ly_do_kham, ma_lich_hen, trang_thai, tao_luc)
            VALUES (@ma_ho_so, @ngay_kham, @ly_do_kham, @ma_lich_hen, @trang_thai, @tao_luc)
          `);
        
        targetMaHoSo = newMaHoSo;
        console.log(`✅ Created HO_SO_KHAM ${newMaHoSo} from LICH_HEN ${ma_lich_hen}`);
      }
    }

    if (!targetMaHoSo) {
      return res.status(400).json({
        success: false,
        message: 'Không thể xác định mã hồ sơ khám',
      });
    }

    // Kiểm tra đã có bản ghi SINH_HIEU cho ma_ho_so này chưa
    const existing = await pool
      .request()
      .input('ma_ho_so', targetMaHoSo)
      .query(`
        SELECT TOP 1 ma_sinh_hieu
        FROM SINH_HIEU
        WHERE ma_ho_so = @ma_ho_so
        ORDER BY do_luc DESC
      `);

    const doLuc = new Date();
    const maSinhHieu = existing.recordset.length > 0 
      ? existing.recordset[0].ma_sinh_hieu 
      : uuidv4();

    if (existing.recordset.length > 0) {
      // Update
      await pool
        .request()
        .input('ma_sinh_hieu', maSinhHieu)
        .input('do_luc', doLuc)
        .input('chieu_cao_cm', chieu_cao_cm ?? null)
        .input('can_nang_kg', can_nang_kg ?? null)
        .input('nhiet_do_c', nhiet_do ?? null)
        .input('mach_lan_phut', mach ?? null)
        .input('huyet_ap_tam_thu', huyet_ap_tam_thu ?? null)
        .input('huyet_ap_tam_truong', huyet_ap_tam_truong ?? null)
        .input('spo2_phan_tram', spo2 ?? null)
        .input('ma_ho_so', targetMaHoSo)
        .input('ma_y_ta', maYTa)
        .query(`
          UPDATE SINH_HIEU
          SET 
            do_luc = @do_luc,
            chieu_cao_cm = @chieu_cao_cm,
            can_nang_kg = @can_nang_kg,
            nhiet_do_c = @nhiet_do_c,
            mach_lan_phut = @mach_lan_phut,
            huyet_ap_tam_thu = @huyet_ap_tam_thu,
            huyet_ap_tam_truong = @huyet_ap_tam_truong,
            spo2_phan_tram = @spo2_phan_tram,
            ma_y_ta = @ma_y_ta
          WHERE ma_sinh_hieu = @ma_sinh_hieu
        `);

      return res.json({
        success: true,
        message: 'Cập nhật sinh hiệu thành công',
        data: {
          ma_sinh_hieu: maSinhHieu,
          ma_ho_so: targetMaHoSo,
          ma_y_ta: maYTa,
          mach,
          nhiet_do,
          huyet_ap_tam_thu,
          huyet_ap_tam_truong,
          spo2,
          chieu_cao_cm,
          can_nang_kg,
          do_luc: doLuc,
        },
      });
    }

    // Tạo mới
    await pool
      .request()
      .input('ma_sinh_hieu', maSinhHieu)
      .input('do_luc', doLuc)
      .input('chieu_cao_cm', chieu_cao_cm ?? null)
      .input('can_nang_kg', can_nang_kg ?? null)
      .input('nhiet_do_c', nhiet_do ?? null)
      .input('mach_lan_phut', mach ?? null)
      .input('huyet_ap_tam_thu', huyet_ap_tam_thu ?? null)
      .input('huyet_ap_tam_truong', huyet_ap_tam_truong ?? null)
      .input('spo2_phan_tram', spo2 ?? null)
      .input('ma_ho_so', targetMaHoSo)
      .input('ma_y_ta', maYTa)
      .query(`
        INSERT INTO SINH_HIEU (
          ma_sinh_hieu, do_luc, chieu_cao_cm, can_nang_kg, nhiet_do_c,
          mach_lan_phut, huyet_ap_tam_thu, huyet_ap_tam_truong, spo2_phan_tram,
          ma_ho_so, ma_y_ta
        )
        VALUES (
          @ma_sinh_hieu, @do_luc, @chieu_cao_cm, @can_nang_kg, @nhiet_do_c,
          @mach_lan_phut, @huyet_ap_tam_thu, @huyet_ap_tam_truong, @spo2_phan_tram,
          @ma_ho_so, @ma_y_ta
        )
      `);

    console.log(`✅ Saved vitals to SINH_HIEU: ${maSinhHieu} for HO_SO_KHAM: ${targetMaHoSo}`);

    res.status(201).json({
      success: true,
      message: 'Lưu sinh hiệu thành công',
      data: {
        ma_sinh_hieu: maSinhHieu,
        ma_ho_so: targetMaHoSo,
        ma_y_ta: maYTa,
        mach,
        nhiet_do,
        huyet_ap_tam_thu,
        huyet_ap_tam_truong,
        spo2,
        chieu_cao_cm,
        can_nang_kg,
        do_luc: doLuc,
      },
    });
  } catch (err) {
    console.error('❌ Nurse save vitals error:', err.message);
    console.error('Error stack:', err.stack);
    res.status(500).json({
      success: false,
      message: err.message || 'Lỗi khi lưu sinh hiệu',
    });
  }
});

// GET /api/nurse/ho-so-kham - y tá xem hồ sơ (top 200 mới nhất) với sinh hiệu
router.get('/ho-so-kham', protect, isNurse, async (_req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT TOP 200
        hs.ma_ho_so,
        hs.ngay_kham,
        hs.ly_do_kham,
        hs.trieu_chung,
        hs.chan_doan_so_bo,
        hs.chan_doan_cuoi,
        hs.ghi_chu_bac_si,
        hs.trang_thai,
        hs.tao_luc,
        hs.cap_nhat_luc,
        hs.ma_lich_hen,
        bn.ten_benh_nhan,
        bn.so_dien_thoai,
        bn.email,
        bn.gioi_tinh,
        bn.ngay_sinh,
        ca.ma_bac_si,
        ca.bat_dau,
        ca.ket_thuc,
        lh.thoi_gian_hen,
        -- Sinh hiệu từ bảng SINH_HIEU
        sh.ma_sinh_hieu,
        sh.do_luc,
        sh.chieu_cao_cm,
        sh.can_nang_kg,
        sh.nhiet_do_c,
        sh.mach_lan_phut,
        sh.huyet_ap_tam_thu,
        sh.huyet_ap_tam_truong,
        sh.spo2_phan_tram,
        sh.ma_y_ta AS ma_y_ta_do_sinh_hieu
      FROM HO_SO_KHAM hs
      LEFT JOIN LICH_HEN lh ON hs.ma_lich_hen = lh.ma_lich_hen
      LEFT JOIN BENH_NHAN bn ON lh.ma_benh_nhan = bn.ma_benh_nhan
      LEFT JOIN CA_BAC_SI ca ON lh.ma_ca = ca.ma_ca
      LEFT JOIN (
        SELECT 
          ma_ho_so,
          ma_sinh_hieu,
          do_luc,
          chieu_cao_cm,
          can_nang_kg,
          nhiet_do_c,
          mach_lan_phut,
          huyet_ap_tam_thu,
          huyet_ap_tam_truong,
          spo2_phan_tram,
          ma_y_ta,
          ROW_NUMBER() OVER (PARTITION BY ma_ho_so ORDER BY do_luc DESC) AS rn
        FROM SINH_HIEU
      ) sh ON hs.ma_ho_so = sh.ma_ho_so AND sh.rn = 1
      ORDER BY hs.tao_luc DESC, hs.ngay_kham DESC
    `);

    // Map dữ liệu để format sinh hiệu dễ đọc hơn
    const mappedData = result.recordset.map(record => ({
      ...record,
      sinh_hieu: record.ma_sinh_hieu ? {
        ma_sinh_hieu: record.ma_sinh_hieu,
        do_luc: record.do_luc,
        chieu_cao_cm: record.chieu_cao_cm,
        can_nang_kg: record.can_nang_kg,
        nhiet_do_c: record.nhiet_do_c,
        mach_lan_phut: record.mach_lan_phut,
        huyet_ap_tam_thu: record.huyet_ap_tam_thu,
        huyet_ap_tam_truong: record.huyet_ap_tam_truong,
        spo2_phan_tram: record.spo2_phan_tram,
        ma_y_ta: record.ma_y_ta_do_sinh_hieu,
      } : null,
      // Xóa các trường sinh hiệu riêng lẻ để tránh trùng lặp
      ma_sinh_hieu: undefined,
      do_luc: undefined,
      chieu_cao_cm: undefined,
      can_nang_kg: undefined,
      nhiet_do_c: undefined,
      mach_lan_phut: undefined,
      huyet_ap_tam_thu: undefined,
      huyet_ap_tam_truong: undefined,
      spo2_phan_tram: undefined,
      ma_y_ta_do_sinh_hieu: undefined,
    }));

    res.json({ success: true, data: mappedData, count: mappedData.length });
  } catch (err) {
    console.error('❌ Nurse list ho-so-kham error:', err.message);
    res.status(500).json({ success: false, message: err.message || 'Lỗi khi lấy hồ sơ khám' });
  }
});

// GET /api/nurse/ho-so-kham/:id - chi tiết hồ sơ với sinh hiệu
router.get('/ho-so-kham/:id', protect, isNurse, async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ success: false, message: 'Thiếu mã hồ sơ' });
  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input('ma_ho_so', id)
      .query(`
        SELECT TOP 1
          hs.ma_ho_so,
          hs.ngay_kham,
          hs.ly_do_kham,
          hs.trieu_chung,
          hs.chan_doan_so_bo,
          hs.chan_doan_cuoi,
          hs.ghi_chu_bac_si,
          hs.trang_thai,
          hs.tao_luc,
          hs.cap_nhat_luc,
          hs.ma_lich_hen,
          bn.ten_benh_nhan,
          bn.so_dien_thoai,
          bn.email,
          bn.gioi_tinh,
          bn.ngay_sinh,
          ca.ma_bac_si,
          ca.bat_dau,
          ca.ket_thuc,
          lh.thoi_gian_hen,
          -- Sinh hiệu từ bảng SINH_HIEU (lấy bản ghi mới nhất)
          sh.ma_sinh_hieu,
          sh.do_luc,
          sh.chieu_cao_cm,
          sh.can_nang_kg,
          sh.nhiet_do_c,
          sh.mach_lan_phut,
          sh.huyet_ap_tam_thu,
          sh.huyet_ap_tam_truong,
          sh.spo2_phan_tram,
          sh.ma_y_ta AS ma_y_ta_do_sinh_hieu
        FROM HO_SO_KHAM hs
        LEFT JOIN LICH_HEN lh ON hs.ma_lich_hen = lh.ma_lich_hen
        LEFT JOIN BENH_NHAN bn ON lh.ma_benh_nhan = bn.ma_benh_nhan
        LEFT JOIN CA_BAC_SI ca ON lh.ma_ca = ca.ma_ca
        LEFT JOIN (
          SELECT TOP 1
            ma_sinh_hieu,
            do_luc,
            chieu_cao_cm,
            can_nang_kg,
            nhiet_do_c,
            mach_lan_phut,
            huyet_ap_tam_thu,
            huyet_ap_tam_truong,
            spo2_phan_tram,
            ma_ho_so,
            ma_y_ta
          FROM SINH_HIEU
          WHERE ma_ho_so = @ma_ho_so
          ORDER BY do_luc DESC
        ) sh ON hs.ma_ho_so = sh.ma_ho_so
        WHERE hs.ma_ho_so = @ma_ho_so
      `);

    const record = result.recordset[0];
    if (!record) {
      return res.json({ success: true, data: null });
    }

    // Map dữ liệu để format sinh hiệu dễ đọc hơn
    const mappedData = {
      ...record,
      sinh_hieu: record.ma_sinh_hieu ? {
        ma_sinh_hieu: record.ma_sinh_hieu,
        do_luc: record.do_luc,
        chieu_cao_cm: record.chieu_cao_cm,
        can_nang_kg: record.can_nang_kg,
        nhiet_do_c: record.nhiet_do_c,
        mach_lan_phut: record.mach_lan_phut,
        huyet_ap_tam_thu: record.huyet_ap_tam_thu,
        huyet_ap_tam_truong: record.huyet_ap_tam_truong,
        spo2_phan_tram: record.spo2_phan_tram,
        ma_y_ta: record.ma_y_ta_do_sinh_hieu,
      } : null,
      // Xóa các trường sinh hiệu riêng lẻ để tránh trùng lặp
      ma_sinh_hieu: undefined,
      do_luc: undefined,
      chieu_cao_cm: undefined,
      can_nang_kg: undefined,
      nhiet_do_c: undefined,
      mach_lan_phut: undefined,
      huyet_ap_tam_thu: undefined,
      huyet_ap_tam_truong: undefined,
      spo2_phan_tram: undefined,
      ma_y_ta_do_sinh_hieu: undefined,
    };

    res.json({ success: true, data: mappedData });
  } catch (err) {
    console.error('❌ Nurse get ho-so-kham detail error:', err.message);
    res.status(500).json({ success: false, message: err.message || 'Lỗi khi lấy hồ sơ khám' });
  }
});

// GET /api/nurse/medications?ma_lich_hen=...&ma_ho_so=...
router.get('/medications', protect, isNurse, async (req, res) => {
  try {
    const { ma_lich_hen, ma_ho_so } = req.query;
    if (!ma_lich_hen && !ma_ho_so) {
      return res.status(400).json({ success: false, message: 'Thiếu mã lịch hẹn hoặc mã hồ sơ' });
    }
    const pool = await poolPromise;
    await ensureMedicationsTable(pool);
    const result = await pool
      .request()
      .input('ma_lich_hen', ma_lich_hen || null)
      .input('ma_ho_so', ma_ho_so || null)
      .query(`
        SELECT TOP 1 *
        FROM NURSE_MEDICATIONS
        WHERE (@ma_lich_hen IS NOT NULL AND ma_lich_hen = @ma_lich_hen)
           OR (@ma_ho_so IS NOT NULL AND ma_ho_so = @ma_ho_so)
        ORDER BY cap_nhat_luc DESC
      `);
    res.json({ success: true, data: result.recordset[0] || null });
  } catch (err) {
    console.error('❌ Nurse get medications error:', err.message);
    res.status(500).json({ success: false, message: err.message || 'Lỗi khi lấy thông tin cấp thuốc' });
  }
});

// POST /api/nurse/medications - lưu cấp thuốc
router.post('/medications', protect, isNurse, async (req, res) => {
  try {
    const { ma_lich_hen, ma_ho_so, thuoc_json, ghi_chu, trang_thai } = req.body || {};
    if (!ma_lich_hen && !ma_ho_so) {
      return res.status(400).json({ success: false, message: 'Thiếu mã lịch hẹn hoặc mã hồ sơ' });
    }
    const pool = await poolPromise;
    await ensureMedicationsTable(pool);
    const maYTa = req.user?.username || req.user?.id || null;

    // Kiểm tra có bản ghi chưa
    const existing = await pool
      .request()
      .input('ma_lich_hen', ma_lich_hen || null)
      .input('ma_ho_so', ma_ho_so || null)
      .query(`
        SELECT TOP 1 * FROM NURSE_MEDICATIONS
        WHERE (@ma_lich_hen IS NOT NULL AND ma_lich_hen = @ma_lich_hen)
           OR (@ma_ho_so IS NOT NULL AND ma_ho_so = @ma_ho_so)
      `);

    if (existing.recordset.length > 0) {
      const id = existing.recordset[0].id;
      await pool
        .request()
        .input('id', id)
        .input('ma_lich_hen', ma_lich_hen || null)
        .input('ma_ho_so', ma_ho_so || null)
        .input('thuoc_json', thuoc_json || null)
        .input('ghi_chu', ghi_chu || null)
        .input('trang_thai', trang_thai || existing.recordset[0].trang_thai || 'dispensed')
        .input('ma_y_ta', maYTa)
        .query(`
          UPDATE NURSE_MEDICATIONS
          SET ma_lich_hen = @ma_lich_hen,
              ma_ho_so = @ma_ho_so,
              thuoc_json = @thuoc_json,
              ghi_chu = @ghi_chu,
              trang_thai = @trang_thai,
              ma_y_ta = @ma_y_ta,
              cap_nhat_luc = GETDATE()
          WHERE id = @id
        `);

      return res.json({
        success: true,
        message: 'Cập nhật cấp thuốc thành công',
        data: { ...existing.recordset[0], thuoc_json, ghi_chu, trang_thai, ma_y_ta: maYTa },
      });
    }

    const id = uuidv4();
    await pool
      .request()
      .input('id', id)
      .input('ma_lich_hen', ma_lich_hen || null)
      .input('ma_ho_so', ma_ho_so || null)
      .input('thuoc_json', thuoc_json || null)
      .input('ghi_chu', ghi_chu || null)
      .input('trang_thai', trang_thai || 'dispensed')
      .input('ma_y_ta', maYTa)
      .query(`
        INSERT INTO NURSE_MEDICATIONS (
          id, ma_lich_hen, ma_ho_so, thuoc_json, ghi_chu, trang_thai, ma_y_ta, tao_luc, cap_nhat_luc
        )
        VALUES (
          @id, @ma_lich_hen, @ma_ho_so, @thuoc_json, @ghi_chu, @trang_thai, @ma_y_ta, GETDATE(), GETDATE()
        )
      `);

    res.status(201).json({
      success: true,
      message: 'Lưu cấp thuốc thành công',
      data: { id, ma_lich_hen, ma_ho_so, thuoc_json, ghi_chu, trang_thai: trang_thai || 'dispensed', ma_y_ta: maYTa },
    });
  } catch (err) {
    console.error('❌ Nurse save medications error:', err.message);
    res.status(500).json({ success: false, message: err.message || 'Lỗi khi lưu cấp thuốc' });
  }
});

// ==================== NURSE SCHEDULE ROUTES (CA_Y_TA) ====================

// Đảm bảo bảng CA_Y_TA tồn tại
async function ensureNurseScheduleTable(pool) {
  const createQuery = `
    IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[CA_Y_TA]') AND type in (N'U'))
    BEGIN
      CREATE TABLE CA_Y_TA (
        ma_ca UNIQUEIDENTIFIER PRIMARY KEY,
        bat_dau DATETIME NOT NULL,
        ket_thuc DATETIME NOT NULL,
        suc_chua INT NULL,
        trang_thai NVARCHAR(50) DEFAULT 'active',
        ma_y_ta NVARCHAR(255) NOT NULL
      );
      CREATE INDEX IX_CA_Y_TA_MA_Y_TA ON CA_Y_TA(ma_y_ta);
      CREATE INDEX IX_CA_Y_TA_BAT_DAU ON CA_Y_TA(bat_dau);
    END
  `;
  await pool.request().query(createQuery);
}

// GET /api/nurse/schedule - Lấy danh sách ca làm việc của y tá hiện tại
router.get('/schedule', protect, isNurse, async (req, res) => {
  try {
    const nurseUsername = req.user?.username || req.user?.id;
    if (!nurseUsername) {
      return res.status(401).json({
        success: false,
        message: 'Không xác định được y tá'
      });
    }

    const pool = await poolPromise;
    await ensureNurseScheduleTable(pool);
    
    const result = await pool
      .request()
      .input('ma_y_ta', nurseUsername)
      .query(`
        SELECT 
          ma_ca,
          bat_dau,
          ket_thuc,
          suc_chua,
          trang_thai,
          ma_y_ta
        FROM CA_Y_TA
        WHERE ma_y_ta = @ma_y_ta
        ORDER BY bat_dau DESC
      `);
    
    res.json({ 
      success: true, 
      data: result.recordset,
      count: result.recordset.length
    });
  } catch (err) {
    console.error('❌ SQL get nurse schedule error:', err.message);
    res.status(500).json({ 
      success: false, 
      message: err.message || 'Lỗi khi lấy danh sách ca làm việc'
    });
  }
});

// POST /api/nurse/schedule - Tạo ca làm việc mới
router.post('/schedule', protect, isNurse, async (req, res) => {
  try {
    const { bat_dau, ket_thuc, suc_chua, trang_thai } = req.body;
    
    // Validation
    if (!bat_dau || !ket_thuc) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin bắt buộc: bat_dau và ket_thuc'
      });
    }
    
    // Kiểm tra thời gian hợp lệ
    const startTime = new Date(bat_dau);
    const endTime = new Date(ket_thuc);
    
    if (startTime >= endTime) {
      return res.status(400).json({
        success: false,
        message: 'Thời gian kết thúc phải sau thời gian bắt đầu'
      });
    }

    const nurseUsername = req.user?.username || req.user?.id;
    if (!nurseUsername) {
      return res.status(401).json({
        success: false,
        message: 'Không xác định được y tá'
      });
    }

    const pool = await poolPromise;
    await ensureNurseScheduleTable(pool);
    const ma_ca = uuidv4();
    
    // Kiểm tra trùng giờ với ca khác của y tá này
    const overlapCheck = await pool
      .request()
      .input('ma_y_ta', nurseUsername)
      .input('bat_dau', new Date(bat_dau))
      .input('ket_thuc', new Date(ket_thuc))
      .query(`
        SELECT TOP 1 ma_ca
        FROM CA_Y_TA
        WHERE ma_y_ta = @ma_y_ta
          AND trang_thai = 'active'
          AND (
            (@bat_dau >= bat_dau AND @bat_dau < ket_thuc)
            OR (@ket_thuc > bat_dau AND @ket_thuc <= ket_thuc)
            OR (@bat_dau <= bat_dau AND @ket_thuc >= ket_thuc)
          )
      `);

    if (overlapCheck.recordset.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Ca làm việc bị trùng thời gian với ca khác của bạn'
      });
    }
    
    await pool
      .request()
      .input('ma_ca', ma_ca)
      .input('bat_dau', new Date(bat_dau))
      .input('ket_thuc', new Date(ket_thuc))
      .input('suc_chua', suc_chua || null)
      .input('trang_thai', trang_thai || 'active')
      .input('ma_y_ta', nurseUsername)
      .query(`
        INSERT INTO CA_Y_TA (ma_ca, bat_dau, ket_thuc, suc_chua, trang_thai, ma_y_ta)
        VALUES (@ma_ca, @bat_dau, @ket_thuc, @suc_chua, @trang_thai, @ma_y_ta)
      `);
    
    console.log(`✅ Created schedule for nurse ${nurseUsername}: ${ma_ca}`);
    
    res.status(201).json({
      success: true,
      message: 'Đăng ký ca làm việc thành công',
      data: { ma_ca, bat_dau, ket_thuc, suc_chua, trang_thai, ma_y_ta: nurseUsername }
    });
  } catch (err) {
    console.error('❌ SQL create nurse schedule error:', err.message);
    res.status(500).json({
      success: false,
      message: err.message || 'Lỗi khi đăng ký ca làm việc'
    });
  }
});

// PUT /api/nurse/schedule/:id - Cập nhật ca làm việc
router.put('/schedule/:id', protect, isNurse, async (req, res) => {
  try {
    const { id } = req.params;
    const { bat_dau, ket_thuc, suc_chua, trang_thai } = req.body;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu mã ca làm việc'
      });
    }
    
    const nurseUsername = req.user?.username || req.user?.id;
    if (!nurseUsername) {
      return res.status(401).json({
        success: false,
        message: 'Không xác định được y tá'
      });
    }

    const pool = await poolPromise;
    await ensureNurseScheduleTable(pool);
    
    // Kiểm tra ca làm việc có thuộc về y tá này không
    const checkResult = await pool
      .request()
      .input('ma_ca', id)
      .input('ma_y_ta', nurseUsername)
      .query('SELECT TOP 1 ma_ca FROM CA_Y_TA WHERE ma_ca = @ma_ca AND ma_y_ta = @ma_y_ta');
    
    if (checkResult.recordset.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền cập nhật ca làm việc này'
      });
    }
    
    // Build update query
    const updates = [];
    const request = pool.request();
    request.input('ma_ca', id);
    
    if (bat_dau !== undefined) {
      updates.push('bat_dau = @bat_dau');
      request.input('bat_dau', new Date(bat_dau));
    }
    if (ket_thuc !== undefined) {
      updates.push('ket_thuc = @ket_thuc');
      request.input('ket_thuc', new Date(ket_thuc));
    }
    if (suc_chua !== undefined) {
      updates.push('suc_chua = @suc_chua');
      request.input('suc_chua', suc_chua);
    }
    if (trang_thai !== undefined) {
      updates.push('trang_thai = @trang_thai');
      request.input('trang_thai', trang_thai);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Không có thông tin nào để cập nhật'
      });
    }
    
    await request.query(`
      UPDATE CA_Y_TA
      SET ${updates.join(', ')}
      WHERE ma_ca = @ma_ca
    `);
    
    res.json({
      success: true,
      message: 'Cập nhật ca làm việc thành công'
    });
  } catch (err) {
    console.error('❌ SQL update nurse schedule error:', err.message);
    res.status(500).json({
      success: false,
      message: err.message || 'Lỗi khi cập nhật ca làm việc'
    });
  }
});

// DELETE /api/nurse/schedule/:id - Xóa ca làm việc
router.delete('/schedule/:id', protect, isNurse, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu mã ca làm việc'
      });
    }
    
    const nurseUsername = req.user?.username || req.user?.id;
    if (!nurseUsername) {
      return res.status(401).json({
        success: false,
        message: 'Không xác định được y tá'
      });
    }

    const pool = await poolPromise;
    await ensureNurseScheduleTable(pool);
    
    // Kiểm tra ca làm việc có thuộc về y tá này không
    const checkResult = await pool
      .request()
      .input('ma_ca', id)
      .input('ma_y_ta', nurseUsername)
      .query('SELECT TOP 1 ma_ca FROM CA_Y_TA WHERE ma_ca = @ma_ca AND ma_y_ta = @ma_y_ta');
    
    if (checkResult.recordset.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xóa ca làm việc này'
      });
    }
    
    await pool
      .request()
      .input('ma_ca', id)
      .query('DELETE FROM CA_Y_TA WHERE ma_ca = @ma_ca');
    
    res.json({
      success: true,
      message: 'Xóa ca làm việc thành công'
    });
  } catch (err) {
    console.error('❌ SQL delete nurse schedule error:', err.message);
    res.status(500).json({
      success: false,
      message: err.message || 'Lỗi khi xóa ca làm việc'
    });
  }
});

module.exports = router;

