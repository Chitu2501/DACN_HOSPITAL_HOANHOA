const router = require('express').Router();
const { poolPromise } = require('../database/db-config');
const { protect } = require('../middleware/auth.middleware');
const { v4: uuidv4 } = require('uuid');
const { uploadBHYT } = require('../config/multer-bhyt');

const TABLE = process.env.SQL_TABLE_USERS || 'USERS_AUTH';

// Helper function: Kiểm tra xem string có phải là UUID hợp lệ không
function isValidUUID(str) {
  if (!str) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// Helper function: Tìm ma_benh_nhan từ user info
async function findMaBenhNhan(pool, username, userId, email) {
  let maBenhNhan = null;

  // Thử tìm theo email trước
  if (email) {
    const emailResult = await pool.request()
      .input('email', email)
      .query(`
        SELECT TOP 1 ma_benh_nhan
        FROM BENH_NHAN
        WHERE email = @email
      `);

    if (emailResult.recordset.length > 0) {
      maBenhNhan = emailResult.recordset[0].ma_benh_nhan;
    }
  }

  // Nếu không tìm thấy, thử tìm từ USERS_AUTH
  if (!maBenhNhan && (username || userId)) {
    const identifier = username || userId;
    const isUserId = userId && isValidUUID(userId);

    let userResult;
    if (isUserId) {
      userResult = await pool.request()
        .input('identifier', identifier)
        .input('userId', userId)
        .query(`
          SELECT TOP 1 email, username, full_name
          FROM ${TABLE}
          WHERE (username = @identifier OR id = @userId) AND role = 'patient'
        `);
    } else {
      userResult = await pool.request()
        .input('identifier', identifier)
        .query(`
          SELECT TOP 1 email, username, full_name
          FROM ${TABLE}
          WHERE username = @identifier AND role = 'patient'
        `);
    }

    if (userResult.recordset.length > 0) {
      const user = userResult.recordset[0];
      const userEmail = user.email || user.username;

      const emailResult = await pool.request()
        .input('email', userEmail)
        .query(`
          SELECT TOP 1 ma_benh_nhan
          FROM BENH_NHAN
          WHERE email = @email
        `);

      if (emailResult.recordset.length > 0) {
        maBenhNhan = emailResult.recordset[0].ma_benh_nhan;
      } else {
        // Nếu không tìm thấy, tạo mới BENH_NHAN
        maBenhNhan = uuidv4();
        await pool.request()
          .input('ma_benh_nhan', maBenhNhan)
          .input('ten_benh_nhan', user.full_name || 'Bệnh nhân')
          .input('email', userEmail)
          .input('so_dien_thoai', null)
          .input('ngay_sinh', null)
          .input('gioi_tinh', null)
          .input('dia_chi', null)
          .query(`
            INSERT INTO BENH_NHAN (ma_benh_nhan, ten_benh_nhan, email, so_dien_thoai, ngay_sinh, gioi_tinh, dia_chi)
            VALUES (@ma_benh_nhan, @ten_benh_nhan, @email, @so_dien_thoai, @ngay_sinh, @gioi_tinh, @dia_chi)
          `);
      }
    }
  }

  return maBenhNhan;
}

// GET /api/patient/medical-records - Lấy danh sách hồ sơ khám từ SQL Server
router.get('/medical-records', protect, async (req, res) => {
  try {
    const username = req.user?.username;
    const userId = req.user?.id;
    const email = req.user?.email;

    if (!username && !userId && !email) {
      return res.status(401).json({
        success: false,
        message: 'Không xác định được bệnh nhân'
      });
    }

    const pool = await poolPromise;

    // Tìm ma_benh_nhan từ email hoặc username
    let maBenhNhan = null;

    // Thử tìm theo email trước (vì email thường dùng để đăng nhập)
    if (email) {
      const emailResult = await pool.request()
        .input('email', email)
        .query(`
          SELECT TOP 1 ma_benh_nhan
          FROM BENH_NHAN
          WHERE email = @email
        `);

      if (emailResult.recordset.length > 0) {
        maBenhNhan = emailResult.recordset[0].ma_benh_nhan;
      }
    }

    // Nếu không tìm thấy theo email, thử tìm theo username hoặc id từ USERS_AUTH
    if (!maBenhNhan && (username || userId)) {
      const identifier = username || userId;
      const isUserId = userId && isValidUUID(userId);

      let userResult;
      if (isUserId) {
        userResult = await pool.request()
          .input('identifier', identifier)
          .input('userId', userId)
          .query(`
          SELECT TOP 1 email, username
          FROM ${TABLE}
            WHERE (username = @identifier OR id = @userId) AND role = 'patient'
          `);
      } else {
        userResult = await pool.request()
          .input('identifier', identifier)
          .query(`
            SELECT TOP 1 email, username
            FROM ${TABLE}
            WHERE username = @identifier AND role = 'patient'
        `);
      }

      if (userResult.recordset.length > 0) {
        const userEmail = userResult.recordset[0].email || userResult.recordset[0].username;
        const emailResult = await pool.request()
          .input('email', userEmail)
          .query(`
            SELECT TOP 1 ma_benh_nhan
            FROM BENH_NHAN
            WHERE email = @email
          `);

        if (emailResult.recordset.length > 0) {
          maBenhNhan = emailResult.recordset[0].ma_benh_nhan;
        }
      }
    }

    if (!maBenhNhan) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin bệnh nhân',
        data: [],
        count: 0
      });
    }

    // Lấy hồ sơ khám từ HO_SO_KHAM (không join sinh hiệu ở đây)
    const result = await pool.request()
      .input('ma_benh_nhan', maBenhNhan)
      .query(`
        SELECT 
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
          lh.ma_benh_nhan,
          lh.thoi_gian_hen,
          bn.ten_benh_nhan,
          bn.email as patient_email,
          ca.ma_bac_si,
          ca.bat_dau,
          ca.ket_thuc,
          bs.ten_bac_si,
          bs.chuyen_khoa as specialization
        FROM HO_SO_KHAM hs
        LEFT JOIN LICH_HEN lh ON hs.ma_lich_hen = lh.ma_lich_hen
        LEFT JOIN BENH_NHAN bn ON lh.ma_benh_nhan = bn.ma_benh_nhan
        LEFT JOIN CA_BAC_SI ca ON lh.ma_ca = ca.ma_ca
        LEFT JOIN BAC_SI bs ON ca.ma_bac_si = bs.ma_bac_si
        WHERE lh.ma_benh_nhan = @ma_benh_nhan
        ORDER BY hs.ngay_kham DESC, hs.tao_luc DESC
      `);

    // Lấy tất cả sinh hiệu cho từng hồ sơ
    const records = await Promise.all(result.recordset.map(async (item) => {
      // Lấy TẤT CẢ sinh hiệu cho hồ sơ này
      const sinhHieuResult = await pool.request()
        .input('ma_ho_so', item.ma_ho_so)
        .query(`
          SELECT 
            ma_sinh_hieu,
            do_luc,
            chieu_cao_cm,
            can_nang_kg,
            nhiet_do_c,
            mach_lan_phut,
            huyet_ap_tam_thu,
            huyet_ap_tam_truong,
            spo2_phan_tram,
            ma_y_ta
          FROM SINH_HIEU
          WHERE ma_ho_so = @ma_ho_so
          ORDER BY do_luc DESC
      `);

      // Map tất cả sinh hiệu thành mảng
      const sinhHieuList = sinhHieuResult.recordset.map((sh) => ({
        ma_sinh_hieu: sh.ma_sinh_hieu,
        do_luc: sh.do_luc,
        chieu_cao_cm: sh.chieu_cao_cm,
        can_nang_kg: sh.can_nang_kg,
        nhiet_do_c: sh.nhiet_do_c,
        mach_lan_phut: sh.mach_lan_phut,
        huyet_ap_tam_thu: sh.huyet_ap_tam_thu,
        huyet_ap_tam_truong: sh.huyet_ap_tam_truong,
        spo2_phan_tram: sh.spo2_phan_tram,
        ma_y_ta: sh.ma_y_ta,
      }));

      return {
        id: item.ma_ho_so,
        _id: item.ma_ho_so,
        visitDate: item.ngay_kham ? new Date(item.ngay_kham).toISOString().split('T')[0] : null,
        diagnosis: item.chan_doan_cuoi || item.chan_doan_so_bo || item.ly_do_kham || 'Chưa có chẩn đoán',
        symptoms: item.trieu_chung || null,
        prescription: null, // Chưa có trong schema
        notes: item.ghi_chu_bac_si || null,
        status: item.trang_thai === 'completed' ? 'archived' : (item.trang_thai === 'in_progress' ? 'active' : 'active'),
        doctor: item.ten_bac_si ? {
          id: item.ma_bac_si,
          fullName: item.ten_bac_si,
          specialty: item.specialization || 'Chưa có',
          department: item.specialization || 'Chưa có',
          phone: null
        } : null,
        testResults: null, // Chưa có trong schema
        followUpDate: null, // Chưa có trong schema
        appointmentDate: item.thoi_gian_hen ? new Date(item.thoi_gian_hen).toISOString() : null,
        createdAt: item.tao_luc ? new Date(item.tao_luc).toISOString() : null,
        updatedAt: item.cap_nhat_luc ? new Date(item.cap_nhat_luc).toISOString() : null,
        // Trả về mảng tất cả sinh hiệu, và giữ sinh_hieu (bản ghi mới nhất) để tương thích
        sinh_hieu_list: sinhHieuList.length > 0 ? sinhHieuList : null,
        sinh_hieu: sinhHieuList.length > 0 ? sinhHieuList[0] : null, // Giữ lại để tương thích với code cũ
      };
    }));

    // Filter theo query params
    let filteredRecords = records;
    const { status, fromDate, toDate } = req.query;

    if (status && status !== 'all') {
      filteredRecords = filteredRecords.filter((r) => r.status === status);
    }

    if (fromDate) {
      filteredRecords = filteredRecords.filter((r) => r.visitDate >= fromDate);
    }

    if (toDate) {
      filteredRecords = filteredRecords.filter((r) => r.visitDate <= toDate);
    }

    console.log(`✅ Found ${filteredRecords.length} medical records for patient: ${maBenhNhan}`);

    res.json({
      success: true,
      data: filteredRecords,
      count: filteredRecords.length
    });
  } catch (err) {
    console.error('❌ SQL patient medical-records error:', err.message);
    console.error('Error stack:', err.stack);
    res.status(500).json({
      success: false,
      message: err.message || 'Lỗi khi lấy hồ sơ khám',
      data: [],
      count: 0
    });
  }
});

// GET /api/patient/doctors - danh sách bác sĩ từ bảng USERS_AUTH (role = 'doctor')
router.get('/doctors', async (req, res) => {
  try {
    const { specialty, department } = req.query;
    const pool = await poolPromise;

    // Kiểm tra xem bảng BAC_SI có cột avatar_url không
    let hasAvatarUrl = false;
    try {
      const checkResult = await pool.request().query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'BAC_SI' 
        AND COLUMN_NAME = 'avatar_url'
      `);
      hasAvatarUrl = checkResult.recordset.length > 0;
    } catch (e) {
      console.warn('Could not check avatar_url column:', e);
    }

    let query = `
      SELECT 
        u.id,
        u.username,
        u.email,
        u.full_name AS fullName,
        u.phone,
        u.address,
        u.specialization,
        u.department AS departmentCode,
        u.license_number AS licenseNumber,
        k.ten_khoa AS departmentName,
        ${hasAvatarUrl ? 'bs.avatar_url' : 'NULL AS avatar_url'},
        bs.ten_bac_si,
        bs.chuyen_khoa,
        bs.so_chung_chi_hanh_nghe
      FROM ${TABLE} u
      LEFT JOIN KHOA k ON u.department = k.ma_khoa
      LEFT JOIN BAC_SI bs ON u.username = bs.ma_bac_si
      WHERE u.role = 'doctor' AND u.is_active = 1
    `;

    const request = pool.request();

    // Filter theo specialty nếu có
    if (specialty) {
      query += ` AND (u.specialization LIKE @specialty OR bs.chuyen_khoa LIKE @specialty)`;
      request.input('specialty', `%${specialty}%`);
    }

    // Filter theo department nếu có
    if (department) {
      query += ` AND (u.department = @department OR k.ten_khoa LIKE @departmentName)`;
      request.input('department', department);
      request.input('departmentName', `%${department}%`);
    }

    query += ` ORDER BY u.full_name`;

    const result = await request.query(query);

    // Map data để đảm bảo format nhất quán với frontend
    const doctors = result.recordset.map(doctor => ({
      id: doctor.id,
      _id: doctor.id, // Thêm _id để tương thích với frontend
      fullName: doctor.fullName || doctor.ten_bac_si,
      ten_bac_si: doctor.ten_bac_si,
      specialization: doctor.specialization || doctor.chuyen_khoa,
      specialty: doctor.specialization || doctor.chuyen_khoa, // Alias cho tương thích
      chuyen_khoa: doctor.chuyen_khoa,
      email: doctor.email,
      phone: doctor.phone,
      address: doctor.address,
      department: doctor.departmentName || doctor.departmentCode, // Ưu tiên tên khoa, nếu không có thì dùng mã
      departmentCode: doctor.departmentCode, // Giữ mã khoa riêng
      licenseNumber: doctor.licenseNumber || doctor.so_chung_chi_hanh_nghe,
      so_chung_chi_hanh_nghe: doctor.so_chung_chi_hanh_nghe,
      username: doctor.username,
      avatar_url: doctor.avatar_url // Thêm avatar_url từ BAC_SI
    }));

    console.log(`✅ Found ${doctors.length} doctors from USERS_AUTH with avatar_url support`);

    res.json({
      success: true,
      data: doctors,
      count: doctors.length
    });
  } catch (err) {
    console.error('❌ SQL doctors error:', err.message);
    console.error('Error stack:', err.stack);
    res.status(500).json({
      success: false,
      message: err.message || 'Lỗi khi lấy danh sách bác sĩ'
    });
  }
});

// Helper function: Tạo danh sách time slots từ bat_dau và ket_thuc (30 phút/slot)
// Chỉ tạo slots trong khoảng thời gian thực tế của ca làm việc
function generateTimeSlots(batDau, ketThuc) {
  const slots = [];

  try {
    // SQL Server trả về datetime có thể là string hoặc Date object
    // Đảm bảo parse đúng cách, không bị ảnh hưởng bởi timezone
    let start, end;

    if (batDau instanceof Date) {
      start = new Date(batDau);
    } else if (typeof batDau === 'string') {
      // Parse string từ SQL Server (format: 'YYYY-MM-DDTHH:mm:ss.sssZ' hoặc 'YYYY-MM-DD HH:mm:ss')
      start = new Date(batDau.replace(' ', 'T'));
    } else {
      start = new Date(batDau);
    }

    if (ketThuc instanceof Date) {
      end = new Date(ketThuc);
    } else if (typeof ketThuc === 'string') {
      end = new Date(ketThuc.replace(' ', 'T'));
    } else {
      end = new Date(ketThuc);
    }

    // Validate dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      console.warn('⚠️ Invalid date range for generateTimeSlots:', { batDau, ketThuc, start, end });
      return [];
    }

    if (start >= end) {
      console.warn('⚠️ Start time >= end time:', { batDau, ketThuc, start, end });
      return [];
    }

    // Tạo slots từ bat_dau đến ket_thuc, mỗi slot 30 phút
    // Sử dụng UTC để tránh timezone issues, sau đó convert về local time
    let current = new Date(start);
    const slotDuration = 30 * 60 * 1000; // 30 phút

    while (current < end) {
      const slotStart = new Date(current);
      const slotEnd = new Date(current.getTime() + slotDuration);

      // Dừng nếu slotEnd vượt quá ket_thuc
      if (slotEnd > end) break;

      // Format giờ:phút (HH:mm) - sử dụng local time từ datetime của SQL Server
      // SQL Server datetime không có timezone, nên getHours() sẽ trả về giờ đúng
      const hours = slotStart.getHours().toString().padStart(2, '0');
      const minutes = slotStart.getMinutes().toString().padStart(2, '0');
      const startStr = `${hours}:${minutes}`;

      const endHours = slotEnd.getHours().toString().padStart(2, '0');
      const endMinutes = slotEnd.getMinutes().toString().padStart(2, '0');
      const endStr = `${endHours}:${endMinutes}`;

      slots.push(`${startStr}-${endStr}`);

      // Tiếp tục với slot tiếp theo
      current = slotEnd;
    }
  } catch (error) {
    console.error('❌ Error in generateTimeSlots:', error, { batDau, ketThuc });
    return [];
  }

  return slots;
}

// GET /api/patient/doctors/schedules - Lấy lịch làm việc của bác sĩ từ CA_BAC_SI
router.get('/doctors/schedules', async (req, res) => {
  try {
    const { doctorId, date } = req.query;
    const pool = await poolPromise;

    // Kiểm tra xem bảng BAC_SI có cột avatar_url không
    let hasAvatarUrl = false;
    try {
      const checkResult = await pool.request().query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'BAC_SI' 
        AND COLUMN_NAME = 'avatar_url'
      `);
      hasAvatarUrl = checkResult.recordset.length > 0;
    } catch (e) {
      console.warn('Could not check avatar_url column:', e);
    }

    // Build query để lấy ca làm việc
    let query = `
      SELECT 
        ca.ma_ca,
        ca.bat_dau,
        ca.ket_thuc,
        ca.suc_chua,
        ca.trang_thai,
        ca.ma_bac_si,
        u.id AS doctor_user_id,
        u.full_name AS doctor_full_name,
        u.specialization AS doctor_specialization,
        k.ten_khoa AS department_name,
        ${hasAvatarUrl ? 'bs.avatar_url' : 'NULL AS avatar_url'}
      FROM CA_BAC_SI ca
      INNER JOIN BAC_SI bs ON ca.ma_bac_si = bs.ma_bac_si
      LEFT JOIN ${TABLE} u ON bs.ma_bac_si = u.username
      LEFT JOIN KHOA k ON bs.ma_khoa = k.ma_khoa
      WHERE ca.trang_thai = 'active'
    `;

    const request = pool.request();

    // Filter theo doctorId (username hoặc id từ USERS_AUTH)
    if (doctorId) {
      query += ` AND (ca.ma_bac_si = @doctorId OR u.id = @doctorId)`;
      request.input('doctorId', doctorId);
    }

    // Filter theo date nếu có
    if (date) {
      const dateStr = date.toString();
      query += ` AND CAST(ca.bat_dau AS DATE) = CAST(@date AS DATE)`;
      request.input('date', dateStr);
    }

    query += ` ORDER BY ca.bat_dau`;

    const result = await request.query(query);

    // Lấy danh sách lịch hẹn đã đặt để tính booked slots (chỉ lấy của các ca trong result)
    const maCaList = result.recordset.map(ca => ca.ma_ca);
    let bookedAppointments = { recordset: [] };

    if (maCaList.length > 0) {
      const maCaParams = maCaList.map((_, idx) => `@ma_ca_${idx}`).join(',');
      const bookedRequest = pool.request();
      maCaList.forEach((maCa, idx) => {
        bookedRequest.input(`ma_ca_${idx}`, maCa);
      });

      bookedAppointments = await bookedRequest.query(`
        SELECT 
          lh.ma_ca,
          lh.thoi_gian_hen,
          lh.trang_thai
        FROM LICH_HEN lh
        WHERE lh.ma_ca IN (${maCaParams})
          AND lh.trang_thai NOT IN ('cancelled', 'huy', 'đã hủy')
      `);
    }

    // Map booked appointments by ma_ca
    const bookedByCa = {};
    bookedAppointments.recordset.forEach(apt => {
      if (!bookedByCa[apt.ma_ca]) {
        bookedByCa[apt.ma_ca] = [];
      }
      bookedByCa[apt.ma_ca].push(new Date(apt.thoi_gian_hen));
    });

    // Group schedules by doctor
    const schedulesByDoctor = {};

    result.recordset.forEach(ca => {
      const doctorIdKey = ca.doctor_user_id || ca.ma_bac_si;

      if (!schedulesByDoctor[doctorIdKey]) {
        schedulesByDoctor[doctorIdKey] = {
          id: doctorIdKey,
          _id: doctorIdKey,
          fullName: ca.doctor_full_name || 'Bác sĩ',
          specialty: ca.doctor_specialization || 'Chưa xác định',
          specialization: ca.doctor_specialization || 'Chưa xác định',
          department: ca.department_name || '',
          avatar_url: ca.avatar_url || null,
          allSlots: [],
          availableSlots: [],
          bookedSlots: []
        };
      }

      // Generate time slots từ bat_dau đến ket_thuc
      // Chỉ tạo slots trong khoảng thời gian thực tế của ca làm việc
      const slots = generateTimeSlots(ca.bat_dau, ca.ket_thuc);

      // Log để debug (chỉ trong development)
      if (process.env.NODE_ENV === 'development' && slots.length > 0) {
        console.log(`📅 Ca làm việc: ${ca.bat_dau} -> ${ca.ket_thuc}, Tạo ${slots.length} slots:`, slots.slice(0, 3), '...');
      }

      schedulesByDoctor[doctorIdKey].allSlots.push(...slots);

      // Kiểm tra slots đã được đặt
      const bookedTimes = bookedByCa[ca.ma_ca] || [];
      slots.forEach(slot => {
        const [slotStartStr] = slot.split('-');
        // Tạo thời gian slot dựa trên ngày của ca làm việc
        const caDate = new Date(ca.bat_dau);
        const [hours, minutes] = slotStartStr.split(':').map(Number);
        const slotStartTime = new Date(caDate);
        slotStartTime.setHours(hours, minutes, 0, 0);
        const slotEndTime = new Date(slotStartTime.getTime() + 30 * 60 * 1000);

        // Kiểm tra xem có lịch hẹn nào trong slot này không
        const isBooked = bookedTimes.some(bookedTime => {
          const booked = new Date(bookedTime);
          // So sánh cùng ngày và cùng giờ
          return booked >= slotStartTime && booked < slotEndTime;
        });

        if (isBooked) {
          if (!schedulesByDoctor[doctorIdKey].bookedSlots.includes(slot)) {
            schedulesByDoctor[doctorIdKey].bookedSlots.push(slot);
          }
        } else {
          if (!schedulesByDoctor[doctorIdKey].availableSlots.includes(slot)) {
            schedulesByDoctor[doctorIdKey].availableSlots.push(slot);
          }
        }
      });
    });

    // Convert to array và loại bỏ duplicate slots
    const schedules = Object.values(schedulesByDoctor).map((schedule) => {
      // Loại bỏ duplicate và sort - CHỈ giữ các slots từ allSlots
      schedule.allSlots = [...new Set(schedule.allSlots)].sort();

      // Đảm bảo availableSlots và bookedSlots chỉ chứa các slots có trong allSlots
      schedule.availableSlots = [...new Set(schedule.availableSlots)]
        .filter((slot) => schedule.allSlots.includes(slot) && !schedule.bookedSlots.includes(slot))
        .sort();
      schedule.bookedSlots = [...new Set(schedule.bookedSlots)]
        .filter((slot) => schedule.allSlots.includes(slot))
        .sort();

      // Log để debug
      if (process.env.NODE_ENV === 'development') {
        console.log(`👨‍⚕️ Bác sĩ ${schedule.fullName}: ${schedule.allSlots.length} slots, ${schedule.availableSlots.length} available, ${schedule.bookedSlots.length} booked`);
      }

      return schedule;
    });

    console.log(`✅ Found ${schedules.length} doctor schedules`);

    res.json({
      success: true,
      data: schedules,
      count: schedules.length
    });
  } catch (err) {
    console.error('❌ SQL get doctor schedules error:', err.message);
    console.error('Error stack:', err.stack);
    res.status(500).json({
      success: false,
      message: err.message || 'Lỗi khi lấy lịch làm việc của bác sĩ'
    });
  }
});

// POST /api/patient/appointments - Đặt lịch khám bệnh
router.post('/appointments', protect, async (req, res) => {
  try {
    const { doctorId, date, timeSlot, reason, symptoms } = req.body;
    const userId = req.user?.id;
    const username = req.user?.username;

    // Validation
    if (!doctorId || !date || !timeSlot || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng điền đầy đủ thông tin: doctorId, date, timeSlot, reason'
      });
    }

    if (!userId && !username) {
      return res.status(401).json({
        success: false,
        message: 'Không xác định được người dùng. Vui lòng đăng nhập lại.'
      });
    }

    const pool = await poolPromise;

    // 1. Tìm ma_benh_nhan từ USERS_AUTH hoặc BENH_NHAN
    let maBenhNhan = null;

    // Thử tìm từ USERS_AUTH trước (nếu có mapping)
    const userResult = await pool.request()
      .input('userId', userId || username)
      .query(`
        SELECT TOP 1 id, username, email, full_name 
        FROM ${TABLE} 
        WHERE (id = @userId OR username = @userId) AND role = 'patient'
      `);

    if (userResult.recordset.length > 0) {
      const user = userResult.recordset[0];

      // Tìm ma_benh_nhan từ BENH_NHAN dựa trên email hoặc tên
      const benhNhanResult = await pool.request()
        .input('email', user.email || '')
        .input('ten', user.full_name || '')
        .query(`
          SELECT TOP 1 ma_benh_nhan 
          FROM BENH_NHAN 
          WHERE email = @email OR ten_benh_nhan = @ten
        `);

      if (benhNhanResult.recordset.length > 0) {
        maBenhNhan = benhNhanResult.recordset[0].ma_benh_nhan;
      } else {
        // Nếu không tìm thấy, tạo mới BENH_NHAN
        maBenhNhan = uuidv4();
        await pool.request()
          .input('ma_benh_nhan', maBenhNhan)
          .input('ten_benh_nhan', user.full_name || 'Bệnh nhân')
          .input('email', user.email || '')
          .input('so_dien_thoai', '')
          .input('ngay_sinh', null)
          .input('gioi_tinh', '')
          .input('dia_chi', '')
          .query(`
            INSERT INTO BENH_NHAN (ma_benh_nhan, ten_benh_nhan, email, so_dien_thoai, ngay_sinh, gioi_tinh, dia_chi)
            VALUES (@ma_benh_nhan, @ten_benh_nhan, @email, @so_dien_thoai, @ngay_sinh, @gioi_tinh, @dia_chi)
          `);
      }
    } else {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin bệnh nhân'
      });
    }

    // 2. Tìm ma_ca từ CA_BAC_SI dựa trên doctorId, date, và timeSlot
    const [slotStart] = timeSlot.split('-');
    const [hours, minutes] = slotStart.split(':').map(Number);
    const appointmentDateTime = new Date(date);
    appointmentDateTime.setHours(hours, minutes, 0, 0);

    // Tìm ca làm việc chứa thời gian này
    const caResult = await pool.request()
      .input('doctorId', doctorId)
      .input('appointmentDate', appointmentDateTime)
      .query(`
        SELECT TOP 1 ca.ma_ca, ca.bat_dau, ca.ket_thuc
        FROM CA_BAC_SI ca
        INNER JOIN BAC_SI bs ON ca.ma_bac_si = bs.ma_bac_si
        LEFT JOIN ${TABLE} u ON bs.ma_bac_si = u.username
        WHERE (ca.ma_bac_si = @doctorId OR u.id = @doctorId)
          AND CAST(ca.bat_dau AS DATE) = CAST(@appointmentDate AS DATE)
          AND ca.trang_thai = 'active'
          AND @appointmentDate >= ca.bat_dau
          AND @appointmentDate < ca.ket_thuc
      `);

    if (caResult.recordset.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Không tìm thấy ca làm việc phù hợp. Vui lòng kiểm tra lại thời gian.'
      });
    }

    const maCa = caResult.recordset[0].ma_ca;

    // 3. Kiểm tra xem slot đã được đặt chưa
    const existingAppointment = await pool.request()
      .input('ma_ca', maCa)
      .input('thoi_gian_hen', appointmentDateTime)
      .query(`
        SELECT TOP 1 ma_lich_hen 
        FROM LICH_HEN 
        WHERE ma_ca = @ma_ca 
          AND thoi_gian_hen = @thoi_gian_hen
          AND trang_thai NOT IN ('cancelled', 'huy', 'đã hủy')
      `);

    if (existingAppointment.recordset.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Thời gian này đã được đặt. Vui lòng chọn thời gian khác.'
      });
    }

    // 4. Tạo lịch hẹn mới
    const maLichHen = uuidv4();
    await pool.request()
      .input('ma_lich_hen', maLichHen)
      .input('ma_ca', maCa)
      .input('thoi_gian_hen', appointmentDateTime)
      .input('trang_thai', 'pending')
      .input('ghi_chu', reason + (symptoms ? `\nTriệu chứng: ${symptoms}` : ''))
      .input('ma_benh_nhan', maBenhNhan)
      .query(`
        INSERT INTO LICH_HEN (ma_lich_hen, ma_ca, thoi_gian_hen, trang_thai, ghi_chu, ma_benh_nhan)
        VALUES (@ma_lich_hen, @ma_ca, @thoi_gian_hen, @trang_thai, @ghi_chu, @ma_benh_nhan)
      `);

    // 5. Lấy thông tin lịch hẹn vừa tạo để trả về
    const appointmentResult = await pool.request()
      .input('ma_lich_hen', maLichHen)
      .query(`
        SELECT 
          lh.ma_lich_hen,
          lh.thoi_gian_hen,
          lh.trang_thai,
          lh.ghi_chu,
          bn.ten_benh_nhan,
          bn.email,
          bn.so_dien_thoai,
          ca.ma_bac_si,
          u.full_name AS doctor_name,
          u.specialization AS doctor_specialty
        FROM LICH_HEN lh
        LEFT JOIN BENH_NHAN bn ON lh.ma_benh_nhan = bn.ma_benh_nhan
        LEFT JOIN CA_BAC_SI ca ON lh.ma_ca = ca.ma_ca
        LEFT JOIN BAC_SI bs ON ca.ma_bac_si = bs.ma_bac_si
        LEFT JOIN ${TABLE} u ON bs.ma_bac_si = u.username
        WHERE lh.ma_lich_hen = @ma_lich_hen
      `);

    console.log(`✅ Created appointment: ${maLichHen} for patient: ${maBenhNhan}`);

    res.status(201).json({
      success: true,
      message: 'Đặt lịch khám thành công!',
      data: appointmentResult.recordset[0]
    });
  } catch (err) {
    console.error('❌ Create appointment error:', err.message);
    console.error('Error stack:', err.stack);
    res.status(500).json({
      success: false,
      message: err.message || 'Lỗi khi đặt lịch khám'
    });
  }
});

// ==================== MOMO PAYMENT ROUTES ====================

const { createMomoPayment, verifyMomoCallback } = require('../services/momoService');

// POST /api/patient/payments/sync-status - Đồng bộ trạng thái thanh toán theo orderId
router.post('/payments/sync-status', async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'orderId is required'
      });
    }

    const pool = await poolPromise;

    // Tìm giao dịch thanh toán theo orderId
    const thanhToanResult = await pool.request()
      .input('ma_giao_dich', orderId)
      .query(`
        SELECT TOP 1 ma_thanh_toan, trang_thai, MaTrangThaiTT
        FROM THANH_TOAN
        WHERE ma_giao_dich = @ma_giao_dich
      `);

    if (thanhToanResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy giao dịch thanh toán'
      });
    }

    const thanhToan = thanhToanResult.recordset[0];

    // Nếu đã là PAID thì không cần update
    if (thanhToan.trang_thai === 'PAID' || thanhToan.MaTrangThaiTT === 'PAID') {
      return res.json({
        success: true,
        message: 'Đã cập nhật trạng thái trước đó'
      });
    }

    // Đảm bảo trạng thái PAID tồn tại
    try {
      await pool.request()
        .input('MaTrangThaiTT', 'PAID')
        .input('TenTT', 'Đã thanh toán')
        .query(`
          IF NOT EXISTS (SELECT 1 FROM TRANG_THAI_THANH_TOAN WHERE MaTrangThaiTT = @MaTrangThaiTT)
          BEGIN
            INSERT INTO TRANG_THAI_THANH_TOAN (MaTrangThaiTT, TenTT)
            VALUES (@MaTrangThaiTT, @TenTT)
          END
        `);
    } catch (err) {
      console.warn('Could not ensure PAID status exists:', err.message);
    }

    // Cập nhật trạng thái thanh toán
    await pool.request()
      .input('ma_giao_dich', orderId)
      .input('trang_thai', 'PAID')
      .input('ma_trang_thai_tt', 'PAID')
      .input('thanh_toan_luc', new Date())
      .query(`
        UPDATE THANH_TOAN
        SET 
          trang_thai = @trang_thai,
          MaTrangThaiTT = @ma_trang_thai_tt,
          thanh_toan_luc = @thanh_toan_luc
        WHERE ma_giao_dich = @ma_giao_dich
      `);

    return res.json({
      success: true,
      message: 'Đồng bộ trạng thái thanh toán thành công'
    });
  } catch (err) {
    console.error('❌ Sync payment status error:', err.message);
    return res.status(500).json({
      success: false,
      message: err.message || 'Lỗi khi đồng bộ trạng thái thanh toán'
    });
  }
});

// GET /api/patient/payments/all - Lấy tất cả thanh toán (cả invoices và hồ sơ khám)
router.get('/payments/all', protect, async (req, res) => {
  try {
    const username = req.user?.username;
    const userId = req.user?.id;
    const email = req.user?.email;
    const status = req.query.status; // Filter theo status: 'all', 'PAID', 'PENDING', 'UNPAID'

    if (!username && !userId && !email) {
      return res.status(401).json({
        success: false,
        message: 'Không xác định được bệnh nhân'
      });
    }

    const pool = await poolPromise;

    // Tìm ma_benh_nhan từ email hoặc username
    let maBenhNhan = null;

    if (email) {
      const emailResult = await pool.request()
        .input('email', email)
        .query(`
          SELECT TOP 1 ma_benh_nhan
          FROM BENH_NHAN
          WHERE email = @email
        `);

      if (emailResult.recordset.length > 0) {
        maBenhNhan = emailResult.recordset[0].ma_benh_nhan;
      }
    }

    if (!maBenhNhan && (username || userId)) {
      const identifier = username || userId;
      const isUserId = userId && isValidUUID(userId);

      let userResult;
      if (isUserId) {
        userResult = await pool.request()
          .input('identifier', identifier)
          .input('userId', userId)
          .query(`
          SELECT TOP 1 email, username
          FROM ${TABLE}
            WHERE (username = @identifier OR id = @userId) AND role = 'patient'
          `);
      } else {
        userResult = await pool.request()
          .input('identifier', identifier)
          .query(`
            SELECT TOP 1 email, username
            FROM ${TABLE}
            WHERE username = @identifier AND role = 'patient'
        `);
      }

      if (userResult.recordset.length > 0) {
        const userEmail = userResult.recordset[0].email || userResult.recordset[0].username;
        const emailResult = await pool.request()
          .input('email', userEmail)
          .query(`
            SELECT TOP 1 ma_benh_nhan
            FROM BENH_NHAN
            WHERE email = @email
          `);

        if (emailResult.recordset.length > 0) {
          maBenhNhan = emailResult.recordset[0].ma_benh_nhan;
        }
      }
    }

    if (!maBenhNhan) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin bệnh nhân',
        data: [],
        count: 0
      });
    }

    // Lấy tất cả thanh toán từ THANH_TOAN join với HO_SO_KHAM
    let query = `
      SELECT 
        tt.ma_thanh_toan,
        tt.ma_giao_dich,
        tt.tong_tien_truoc_bhyt as amount,
        tt.so_tien_benh_nhan_tra as finalAmount,
        tt.trang_thai,
        tt.MaTrangThaiTT,
        tt.thanh_toan_luc as paidAt,
        tt.tao_luc as createdAt,
        tt.MaPTTT as paymentMethod,
        hs.ma_ho_so,
        hs.ngay_kham as visitDate,
        hs.ly_do_kham as reason,
        'medical-record' as type
      FROM THANH_TOAN tt
      INNER JOIN HO_SO_KHAM hs ON tt.ma_thanh_toan = hs.ma_thanh_toan
      INNER JOIN LICH_HEN lh ON hs.ma_lich_hen = lh.ma_lich_hen
      WHERE lh.ma_benh_nhan = @ma_benh_nhan
    `;

    // Thêm filter theo status nếu có
    if (status && status !== 'all') {
      if (status === 'PAID') {
        query += ` AND (tt.trang_thai = 'PAID' OR tt.MaTrangThaiTT = 'PAID' OR tt.trang_thai = 'Đã thanh toán')`;
      } else if (status === 'PENDING') {
        query += ` AND (tt.trang_thai = 'PENDING' OR tt.MaTrangThaiTT = 'PENDING' OR tt.trang_thai = 'Chờ thanh toán')`;
      } else if (status === 'UNPAID') {
        query += ` AND (tt.trang_thai IS NULL OR tt.trang_thai = 'UNPAID' OR tt.MaTrangThaiTT = 'UNPAID')`;
      }
    }

    query += ` ORDER BY tt.tao_luc DESC`;

    const result = await pool.request()
      .input('ma_benh_nhan', maBenhNhan)
      .query(query);

    // Format dữ liệu để trả về
    const payments = result.recordset.map((row) => {
      // Xác định status
      let paymentStatus = 'UNPAID';
      if (row.trang_thai === 'PAID' || row.MaTrangThaiTT === 'PAID' || row.trang_thai === 'Đã thanh toán') {
        paymentStatus = 'PAID';
      } else if (row.trang_thai === 'PENDING' || row.MaTrangThaiTT === 'PENDING' || row.trang_thai === 'Chờ thanh toán') {
        paymentStatus = 'PENDING';
      }

      // Xác định payment method
      let paymentMethod = null;
      if (row.paymentMethod === 'MOMO' || row.paymentMethod === 'momo') {
        paymentMethod = 'momo';
      } else if (row.paymentMethod) {
        paymentMethod = row.paymentMethod.toLowerCase();
      }

      return {
        id: row.ma_thanh_toan,
        ma_ho_so: row.ma_ho_so,
        type: 'medical-record',
        amount: row.amount || row.finalAmount || 500000,
        status: paymentStatus,
        paymentMethod: paymentMethod,
        paidAt: row.paidAt ? new Date(row.paidAt).toISOString() : null,
        createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
        visitDate: row.visitDate ? new Date(row.visitDate).toISOString().split('T')[0] : null,
        reason: row.reason || 'Khám bệnh',
        ma_giao_dich: row.ma_giao_dich,
        // Thông tin để hiển thị
        title: `Hồ sơ khám #${row.ma_ho_so}`,
        description: row.reason || 'Thanh toán hồ sơ khám bệnh'
      };
    });

    res.json({
      success: true,
      data: payments,
      count: payments.length
    });
  } catch (err) {
    console.error('❌ Get all payments error:', err.message);
    res.status(500).json({
      success: false,
      message: err.message || 'Lỗi khi lấy danh sách thanh toán',
      data: [],
      count: 0
    });
  }
});

// GET /api/patient/medical-records/:id/payment-status - Kiểm tra trạng thái thanh toán của hồ sơ khám
router.get('/medical-records/:id/payment-status', protect, async (req, res) => {
  try {
    const { id } = req.params; // ma_ho_so
    const username = req.user?.username;
    const userId = req.user?.id;
    const email = req.user?.email;

    if (!username && !userId && !email) {
      return res.status(401).json({
        success: false,
        message: 'Không xác định được bệnh nhân'
      });
    }

    const pool = await poolPromise;

    // Tìm ma_benh_nhan từ email hoặc username
    let maBenhNhan = null;

    if (email) {
      const emailResult = await pool.request()
        .input('email', email)
        .query(`
          SELECT TOP 1 ma_benh_nhan
          FROM BENH_NHAN
          WHERE email = @email
        `);

      if (emailResult.recordset.length > 0) {
        maBenhNhan = emailResult.recordset[0].ma_benh_nhan;
      }
    }

    if (!maBenhNhan && (username || userId)) {
      const identifier = username || userId;
      const isUserId = userId && isValidUUID(userId);

      let userResult;
      if (isUserId) {
        userResult = await pool.request()
          .input('identifier', identifier)
          .input('userId', userId)
          .query(`
          SELECT TOP 1 email, username
          FROM ${TABLE}
            WHERE (username = @identifier OR id = @userId) AND role = 'patient'
          `);
      } else {
        userResult = await pool.request()
          .input('identifier', identifier)
          .query(`
            SELECT TOP 1 email, username
            FROM ${TABLE}
            WHERE username = @identifier AND role = 'patient'
        `);
      }

      if (userResult.recordset.length > 0) {
        const userEmail = userResult.recordset[0].email || userResult.recordset[0].username;
        const emailResult = await pool.request()
          .input('email', userEmail)
          .query(`
            SELECT TOP 1 ma_benh_nhan
            FROM BENH_NHAN
            WHERE email = @email
          `);

        if (emailResult.recordset.length > 0) {
          maBenhNhan = emailResult.recordset[0].ma_benh_nhan;
        }
      }
    }

    if (!maBenhNhan) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin bệnh nhân'
      });
    }

    // Kiểm tra hồ sơ khám và trạng thái thanh toán
    const result = await pool.request()
      .input('ma_ho_so', id)
      .input('ma_benh_nhan', maBenhNhan)
      .query(`
        SELECT 
          hs.ma_ho_so,
          hs.ngay_kham,
          hs.ly_do_kham,
          hs.ma_thanh_toan,
          tt.ma_thanh_toan as tt_ma_thanh_toan,
          tt.trang_thai as trang_thai_tt,
          tt.tong_tien_truoc_bhyt as so_tien,
          tt.thanh_toan_luc,
          tt.ma_giao_dich
        FROM HO_SO_KHAM hs
        LEFT JOIN LICH_HEN lh ON hs.ma_lich_hen = lh.ma_lich_hen
        LEFT JOIN THANH_TOAN tt ON hs.ma_thanh_toan = tt.ma_thanh_toan
        WHERE hs.ma_ho_so = @ma_ho_so AND lh.ma_benh_nhan = @ma_benh_nhan
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy hồ sơ khám hoặc bạn không có quyền truy cập'
      });
    }

    const record = result.recordset[0];
    const hasPayment = !!record.ma_thanh_toan;
    const isPaid = record.trang_thai_tt === 'PAID' || record.trang_thai_tt === 'Đã thanh toán';

    res.json({
      success: true,
      data: {
        ma_ho_so: record.ma_ho_so,
        hasPayment: hasPayment,
        isPaid: isPaid,
        paymentStatus: isPaid ? 'PAID' : (hasPayment ? 'PENDING' : 'UNPAID'),
        amount: record.so_tien || 500000, // Default 500,000 VND
        paidAt: record.thanh_toan_luc || null,
        ma_giao_dich: record.ma_giao_dich || null,
      }
    });
  } catch (err) {
    console.error('❌ Get payment status error:', err.message);
    res.status(500).json({
      success: false,
      message: err.message || 'Lỗi khi lấy trạng thái thanh toán'
    });
  }
});

// POST /api/patient/medical-records/:id/pay - Thanh toán hồ sơ khám qua MoMo
router.post('/medical-records/:id/pay', protect, async (req, res) => {
  try {
    const { id } = req.params; // ma_ho_so
    const { paymentMethod } = req.body;
    const username = req.user?.username;
    const userId = req.user?.id;
    const email = req.user?.email;

    if (!username && !userId && !email) {
      return res.status(401).json({
        success: false,
        message: 'Không xác định được bệnh nhân'
      });
    }

    if (paymentMethod !== 'momo') {
      return res.status(400).json({
        success: false,
        message: 'Chỉ hỗ trợ thanh toán qua MoMo'
      });
    }

    const pool = await poolPromise;

    // Tìm ma_benh_nhan từ email hoặc username
    let maBenhNhan = null;

    if (email) {
      const emailResult = await pool.request()
        .input('email', email)
        .query(`
          SELECT TOP 1 ma_benh_nhan
          FROM BENH_NHAN
          WHERE email = @email
        `);

      if (emailResult.recordset.length > 0) {
        maBenhNhan = emailResult.recordset[0].ma_benh_nhan;
      }
    }

    if (!maBenhNhan && (username || userId)) {
      const identifier = username || userId;
      const isUserId = userId && isValidUUID(userId);

      let userResult;
      if (isUserId) {
        userResult = await pool.request()
          .input('identifier', identifier)
          .input('userId', userId)
          .query(`
          SELECT TOP 1 email, username
          FROM ${TABLE}
            WHERE (username = @identifier OR id = @userId) AND role = 'patient'
          `);
      } else {
        userResult = await pool.request()
          .input('identifier', identifier)
          .query(`
            SELECT TOP 1 email, username
            FROM ${TABLE}
            WHERE username = @identifier AND role = 'patient'
        `);
      }

      if (userResult.recordset.length > 0) {
        const userEmail = userResult.recordset[0].email || userResult.recordset[0].username;
        const emailResult = await pool.request()
          .input('email', userEmail)
          .query(`
            SELECT TOP 1 ma_benh_nhan
            FROM BENH_NHAN
            WHERE email = @email
          `);

        if (emailResult.recordset.length > 0) {
          maBenhNhan = emailResult.recordset[0].ma_benh_nhan;
        }
      }
    }

    if (!maBenhNhan) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin bệnh nhân'
      });
    }

    // Tìm hồ sơ khám
    const hoSoResult = await pool.request()
      .input('ma_ho_so', id)
      .input('ma_benh_nhan', maBenhNhan)
      .query(`
        SELECT 
          hs.ma_ho_so,
          hs.ngay_kham,
          hs.ly_do_kham,
          hs.ma_thanh_toan,
          lh.ma_benh_nhan,
          lh.ma_lich_hen
        FROM HO_SO_KHAM hs
        LEFT JOIN LICH_HEN lh ON hs.ma_lich_hen = lh.ma_lich_hen
        WHERE hs.ma_ho_so = @ma_ho_so AND lh.ma_benh_nhan = @ma_benh_nhan
      `);

    if (hoSoResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy hồ sơ khám hoặc bạn không có quyền truy cập'
      });
    }

    const hoSo = hoSoResult.recordset[0];

    // Kiểm tra đã thanh toán chưa
    const hoSoCheckResult = await pool.request()
      .input('ma_ho_so', hoSo.ma_ho_so)
      .query(`
        SELECT TOP 1 hs.ma_thanh_toan, tt.trang_thai
        FROM HO_SO_KHAM hs
        LEFT JOIN THANH_TOAN tt ON hs.ma_thanh_toan = tt.ma_thanh_toan
        WHERE hs.ma_ho_so = @ma_ho_so AND hs.ma_thanh_toan IS NOT NULL
      `);

    if (hoSoCheckResult.recordset.length > 0) {
      const check = hoSoCheckResult.recordset[0];
      if (check.trang_thai === 'PAID' || check.trang_thai === 'Đã thanh toán') {
        return res.status(400).json({
          success: false,
          message: 'Hồ sơ khám đã được thanh toán'
        });
      }
    }

    // Tạo mã thanh toán
    const maThanhToan = uuidv4();
    const orderId = `HS-${hoSo.ma_ho_so}-${Date.now()}`;

    // Giả sử số tiền (có thể lấy từ bảng khác hoặc tính toán)
    const amount = 500000; // 500,000 VND - có thể lấy từ bảng HO_SO_KHAM hoặc bảng khác

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
    const redirectUrl = `${baseUrl}/patient/payments/callback?type=medical-record&id=${hoSo.ma_ho_so}`;
    const ipnUrl = `${backendUrl}/api/patient/medical-records/${hoSo.ma_ho_so}/momo-callback`;

    console.log('Creating MoMo payment for medical record:', {
      ma_ho_so: hoSo.ma_ho_so,
      orderId,
      amount,
      redirectUrl,
      ipnUrl
    });

    // Tạo payment link từ MoMo
    const momoResponse = await createMomoPayment({
      orderId: orderId,
      orderInfo: `Thanh toán hồ sơ khám #${hoSo.ma_ho_so}`,
      amount: amount,
      redirectUrl: redirectUrl,
      ipnUrl: ipnUrl,
      extraData: JSON.stringify({
        ma_ho_so: hoSo.ma_ho_so,
        patientId: maBenhNhan,
        maThanhToan: maThanhToan,
        type: 'medical-record'
      }),
    });

    console.log('MoMo payment created successfully:', {
      orderId: momoResponse.orderId,
      hasPayUrl: !!momoResponse.payUrl,
      hasDeeplink: !!momoResponse.deeplink
    });

    // Đảm bảo dữ liệu trong bảng TRANG_THAI_THANH_TOAN và PHUONG_THUC_THANH_TOAN tồn tại
    // Tự động tạo nếu chưa có
    try {
      await pool.request()
        .input('MaTrangThaiTT', 'PENDING')
        .input('TenTT', 'Chờ thanh toán')
        .query(`
          IF NOT EXISTS (SELECT 1 FROM TRANG_THAI_THANH_TOAN WHERE MaTrangThaiTT = @MaTrangThaiTT)
          BEGIN
            INSERT INTO TRANG_THAI_THANH_TOAN (MaTrangThaiTT, TenTT)
            VALUES (@MaTrangThaiTT, @TenTT)
          END
        `);
    } catch (err) {
      console.warn('Could not ensure PENDING status exists:', err.message);
    }

    try {
      await pool.request()
        .input('MaPTTT', 'MOMO')
        .input('TenPTTT', 'Ví MoMo')
        .query(`
          IF NOT EXISTS (SELECT 1 FROM PHUONG_THUC_THANH_TOAN WHERE MaPTTT = @MaPTTT)
          BEGIN
            INSERT INTO PHUONG_THUC_THANH_TOAN (MaPTTT, TenPTTT)
            VALUES (@MaPTTT, @TenPTTT)
          END
        `);
    } catch (err) {
      console.warn('Could not ensure MOMO payment method exists:', err.message);
    }

    // Lưu thông tin thanh toán vào bảng THANH_TOAN
    await pool.request()
      .input('ma_thanh_toan', maThanhToan)
      .input('tong_tien_truoc_bhyt', amount)
      .input('ap_dung_bhyt', 0)
      .input('so_tien_benh_nhan_tra', amount)
      .input('ma_giao_dich', orderId)
      .input('trang_thai', 'PENDING')
      .input('ma_pttt', 'MOMO')
      .input('ma_trang_thai_tt', 'PENDING')
      .input('tao_luc', new Date())
      .query(`
        INSERT INTO THANH_TOAN (
          ma_thanh_toan,
          tong_tien_truoc_bhyt,
          ap_dung_bhyt,
          so_tien_benh_nhan_tra,
          ma_giao_dich,
          trang_thai,
          tao_luc,
          MaPTTT,
          MaTrangThaiTT
        )
        VALUES (
          @ma_thanh_toan,
          @tong_tien_truoc_bhyt,
          @ap_dung_bhyt,
          @so_tien_benh_nhan_tra,
          @ma_giao_dich,
          @trang_thai,
          @tao_luc,
          @ma_pttt,
          @ma_trang_thai_tt
        )
      `);

    // Cập nhật HO_SO_KHAM với ma_thanh_toan
    try {
      await pool.request()
        .input('ma_ho_so', hoSo.ma_ho_so)
        .input('ma_thanh_toan', maThanhToan)
        .query(`
          UPDATE HO_SO_KHAM
          SET ma_thanh_toan = @ma_thanh_toan
          WHERE ma_ho_so = @ma_ho_so
        `);
    } catch (err) {
      console.warn('Could not update HO_SO_KHAM.ma_thanh_toan:', err.message);
    }

    res.json({
      success: true,
      data: {
        paymentUrl: momoResponse.payUrl,
        deeplink: momoResponse.deeplink,
        qrCodeUrl: momoResponse.qrCodeUrl,
        orderId: momoResponse.orderId,
        maThanhToan: maThanhToan,
        ma_ho_so: hoSo.ma_ho_so,
      },
      message: 'Tạo link thanh toán MoMo thành công'
    });
  } catch (err) {
    console.error('❌ MoMo payment error:', err.message);
    console.error('Error stack:', err.stack);
    res.status(500).json({
      success: false,
      message: err.message || 'Lỗi khi tạo thanh toán MoMo'
    });
  }
});

// POST /api/patient/medical-records/:id/momo-callback - Callback từ MoMo cho hồ sơ khám
router.post('/medical-records/:id/momo-callback', async (req, res) => {
  try {
    const { id } = req.params; // ma_ho_so
    const callbackData = req.body;

    console.log('MoMo callback received for medical record:', { ma_ho_so: id, resultCode: callbackData.resultCode });

    // Verify signature
    const isValid = verifyMomoCallback(callbackData);

    if (!isValid) {
      console.error('Invalid MoMo callback signature');
      return res.status(400).json({
        success: false,
        message: 'Invalid MoMo callback signature'
      });
    }

    const pool = await poolPromise;

    // Tìm thanh toán theo ma_giao_dich (orderId)
    const thanhToanResult = await pool.request()
      .input('ma_giao_dich', callbackData.orderId)
      .query(`
        SELECT TOP 1 tt.ma_thanh_toan, hs.ma_ho_so
        FROM THANH_TOAN tt
        LEFT JOIN HO_SO_KHAM hs ON tt.ma_thanh_toan = hs.ma_thanh_toan
        WHERE tt.ma_giao_dich = @ma_giao_dich
      `);

    if (thanhToanResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy giao dịch thanh toán'
      });
    }

    const thanhToan = thanhToanResult.recordset[0];

    // Đảm bảo các trạng thái tồn tại trước khi update
    try {
      await pool.request()
        .input('MaTrangThaiTT', 'PAID')
        .input('TenTT', 'Đã thanh toán')
        .query(`
          IF NOT EXISTS (SELECT 1 FROM TRANG_THAI_THANH_TOAN WHERE MaTrangThaiTT = @MaTrangThaiTT)
          BEGIN
            INSERT INTO TRANG_THAI_THANH_TOAN (MaTrangThaiTT, TenTT)
            VALUES (@MaTrangThaiTT, @TenTT)
          END
        `);
    } catch (err) {
      console.warn('Could not ensure PAID status exists:', err.message);
    }

    try {
      await pool.request()
        .input('MaTrangThaiTT', 'FAILED')
        .input('TenTT', 'Thanh toán thất bại')
        .query(`
          IF NOT EXISTS (SELECT 1 FROM TRANG_THAI_THANH_TOAN WHERE MaTrangThaiTT = @MaTrangThaiTT)
          BEGIN
            INSERT INTO TRANG_THAI_THANH_TOAN (MaTrangThaiTT, TenTT)
            VALUES (@MaTrangThaiTT, @TenTT)
          END
        `);
    } catch (err) {
      console.warn('Could not ensure FAILED status exists:', err.message);
    }

    // Kiểm tra resultCode
    if (callbackData.resultCode === 0) {
      // Thanh toán thành công
      await pool.request()
        .input('ma_thanh_toan', thanhToan.ma_thanh_toan)
        .input('trang_thai', 'PAID')
        .input('ma_trang_thai_tt', 'PAID')
        .input('thanh_toan_luc', new Date())
        .input('so_hoa_don', callbackData.transId || null)
        .query(`
          UPDATE THANH_TOAN
          SET 
            trang_thai = @trang_thai,
            MaTrangThaiTT = @ma_trang_thai_tt,
            thanh_toan_luc = @thanh_toan_luc,
            so_hoa_don = @so_hoa_don
          WHERE ma_thanh_toan = @ma_thanh_toan
        `);

      console.log('Payment successful for medical record:', thanhToan.ma_ho_so);
    } else {
      // Thanh toán thất bại
      await pool.request()
        .input('ma_thanh_toan', thanhToan.ma_thanh_toan)
        .input('trang_thai', 'FAILED')
        .input('ma_trang_thai_tt', 'FAILED')
        .query(`
          UPDATE THANH_TOAN
          SET 
            trang_thai = @trang_thai,
            MaTrangThaiTT = @ma_trang_thai_tt
          WHERE ma_thanh_toan = @ma_thanh_toan
        `);

      console.log('Payment failed:', callbackData.message);
    }

    return res.json({
      success: true,
      message: 'Callback received'
    });
  } catch (err) {
    console.error('❌ MoMo callback error:', err.message);
    console.error('Error stack:', err.stack);
    res.status(500).json({
      success: false,
      message: err.message || 'Lỗi khi xử lý callback từ MoMo'
    });
  }
});

// POST /api/patient/invoices/:id/pay - Thanh toán hóa đơn qua MoMo
router.post('/invoices/:id/pay', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentMethod } = req.body;
    const username = req.user?.username;
    const userId = req.user?.id;
    const email = req.user?.email;

    if (!username && !userId && !email) {
      return res.status(401).json({
        success: false,
        message: 'Không xác định được bệnh nhân'
      });
    }

    if (paymentMethod !== 'momo') {
      return res.status(400).json({
        success: false,
        message: 'Chỉ hỗ trợ thanh toán qua MoMo'
      });
    }

    const pool = await poolPromise;

    // Tìm ma_benh_nhan từ email hoặc username
    let maBenhNhan = null;

    if (email) {
      const emailResult = await pool.request()
        .input('email', email)
        .query(`
          SELECT TOP 1 ma_benh_nhan
          FROM BENH_NHAN
          WHERE email = @email
        `);

      if (emailResult.recordset.length > 0) {
        maBenhNhan = emailResult.recordset[0].ma_benh_nhan;
      }
    }

    if (!maBenhNhan && (username || userId)) {
      const identifier = username || userId;
      const isUserId = userId && isValidUUID(userId);

      let userResult;
      if (isUserId) {
        userResult = await pool.request()
          .input('identifier', identifier)
          .input('userId', userId)
          .query(`
          SELECT TOP 1 email, username
          FROM ${TABLE}
            WHERE (username = @identifier OR id = @userId) AND role = 'patient'
          `);
      } else {
        userResult = await pool.request()
          .input('identifier', identifier)
          .query(`
            SELECT TOP 1 email, username
            FROM ${TABLE}
            WHERE username = @identifier AND role = 'patient'
        `);
      }

      if (userResult.recordset.length > 0) {
        const userEmail = userResult.recordset[0].email || userResult.recordset[0].username;
        const emailResult = await pool.request()
          .input('email', userEmail)
          .query(`
            SELECT TOP 1 ma_benh_nhan
            FROM BENH_NHAN
            WHERE email = @email
          `);

        if (emailResult.recordset.length > 0) {
          maBenhNhan = emailResult.recordset[0].ma_benh_nhan;
        }
      }
    }

    if (!maBenhNhan) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin bệnh nhân'
      });
    }

    // Tìm hóa đơn từ HO_SO_KHAM hoặc LICH_HEN
    // Giả sử id là ma_ho_so hoặc ma_lich_hen
    const hoSoResult = await pool.request()
      .input('ma_ho_so', id)
      .input('ma_benh_nhan', maBenhNhan)
      .query(`
        SELECT 
          hs.ma_ho_so,
          hs.ngay_kham,
          hs.ly_do_kham,
          lh.ma_benh_nhan,
          lh.ma_lich_hen
        FROM HO_SO_KHAM hs
        LEFT JOIN LICH_HEN lh ON hs.ma_lich_hen = lh.ma_lich_hen
        WHERE hs.ma_ho_so = @ma_ho_so AND lh.ma_benh_nhan = @ma_benh_nhan
      `);

    if (hoSoResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy hóa đơn hoặc bạn không có quyền truy cập'
      });
    }

    const hoSo = hoSoResult.recordset[0];

    // Kiểm tra đã thanh toán chưa (thông qua HO_SO_KHAM.ma_thanh_toan)
    const hoSoCheckResult = await pool.request()
      .input('ma_ho_so', hoSo.ma_ho_so)
      .query(`
        SELECT TOP 1 hs.ma_thanh_toan, tt.trang_thai
        FROM HO_SO_KHAM hs
        LEFT JOIN THANH_TOAN tt ON hs.ma_thanh_toan = tt.ma_thanh_toan
        WHERE hs.ma_ho_so = @ma_ho_so AND hs.ma_thanh_toan IS NOT NULL
      `);

    if (hoSoCheckResult.recordset.length > 0) {
      const check = hoSoCheckResult.recordset[0];
      if (check.trang_thai === 'PAID' || check.trang_thai === 'Đã thanh toán') {
        return res.status(400).json({
          success: false,
          message: 'Hóa đơn đã được thanh toán'
        });
      }
    }

    // Tạo mã thanh toán
    const maThanhToan = uuidv4();
    const orderId = `INV-${hoSo.ma_ho_so}-${Date.now()}`;

    // Giả sử số tiền (có thể lấy từ bảng khác hoặc tính toán)
    const amount = 500000; // 500,000 VND - có thể lấy từ bảng HO_SO_KHAM hoặc bảng khác

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
    const redirectUrl = `${baseUrl}/patient/payments/callback?invoiceId=${hoSo.ma_ho_so}`;
    const ipnUrl = `${backendUrl}/api/patient/invoices/${hoSo.ma_ho_so}/momo-callback`;

    console.log('Creating MoMo payment:', {
      invoiceId: hoSo.ma_ho_so,
      orderId,
      amount,
      redirectUrl,
      ipnUrl
    });

    // Tạo payment link từ MoMo
    const momoResponse = await createMomoPayment({
      orderId: orderId,
      orderInfo: `Thanh toán hóa đơn #${hoSo.ma_ho_so}`,
      amount: amount,
      redirectUrl: redirectUrl,
      ipnUrl: ipnUrl,
      extraData: JSON.stringify({
        invoiceId: hoSo.ma_ho_so,
        patientId: maBenhNhan,
        maThanhToan: maThanhToan
      }),
    });

    console.log('MoMo payment created successfully:', {
      orderId: momoResponse.orderId,
      hasPayUrl: !!momoResponse.payUrl,
      hasDeeplink: !!momoResponse.deeplink
    });

    // Đảm bảo dữ liệu trong bảng TRANG_THAI_THANH_TOAN và PHUONG_THUC_THANH_TOAN tồn tại
    // Tự động tạo nếu chưa có
    try {
      await pool.request()
        .input('MaTrangThaiTT', 'PENDING')
        .input('TenTT', 'Chờ thanh toán')
        .query(`
          IF NOT EXISTS (SELECT 1 FROM TRANG_THAI_THANH_TOAN WHERE MaTrangThaiTT = @MaTrangThaiTT)
          BEGIN
            INSERT INTO TRANG_THAI_THANH_TOAN (MaTrangThaiTT, TenTT)
            VALUES (@MaTrangThaiTT, @TenTT)
          END
        `);
    } catch (err) {
      console.warn('Could not ensure PENDING status exists:', err.message);
    }

    try {
      await pool.request()
        .input('MaPTTT', 'MOMO')
        .input('TenPTTT', 'Ví MoMo')
        .query(`
          IF NOT EXISTS (SELECT 1 FROM PHUONG_THUC_THANH_TOAN WHERE MaPTTT = @MaPTTT)
          BEGIN
            INSERT INTO PHUONG_THUC_THANH_TOAN (MaPTTT, TenPTTT)
            VALUES (@MaPTTT, @TenPTTT)
          END
        `);
    } catch (err) {
      console.warn('Could not ensure MOMO payment method exists:', err.message);
    }

    // Lưu thông tin thanh toán vào bảng THANH_TOAN
    await pool.request()
      .input('ma_thanh_toan', maThanhToan)
      .input('tong_tien_truoc_bhyt', amount)
      .input('ap_dung_bhyt', 0) // 0 = false
      .input('so_tien_benh_nhan_tra', amount)
      .input('ma_giao_dich', orderId)
      .input('trang_thai', 'PENDING')
      .input('ma_pttt', 'MOMO') // Mã phương thức thanh toán MoMo
      .input('ma_trang_thai_tt', 'PENDING') // Mã trạng thái thanh toán
      .input('tao_luc', new Date())
      .query(`
        INSERT INTO THANH_TOAN (
          ma_thanh_toan,
          tong_tien_truoc_bhyt,
          ap_dung_bhyt,
          so_tien_benh_nhan_tra,
          ma_giao_dich,
          trang_thai,
          tao_luc,
          MaPTTT,
          MaTrangThaiTT
        )
        VALUES (
          @ma_thanh_toan,
          @tong_tien_truoc_bhyt,
          @ap_dung_bhyt,
          @so_tien_benh_nhan_tra,
          @ma_giao_dich,
          @trang_thai,
          @tao_luc,
          @ma_pttt,
          @ma_trang_thai_tt
        )
      `);

    // Cập nhật HO_SO_KHAM với ma_thanh_toan (nếu cột này tồn tại)
    try {
      await pool.request()
        .input('ma_ho_so', hoSo.ma_ho_so)
        .input('ma_thanh_toan', maThanhToan)
        .query(`
          UPDATE HO_SO_KHAM
          SET ma_thanh_toan = @ma_thanh_toan
          WHERE ma_ho_so = @ma_ho_so
        `);
    } catch (err) {
      console.warn('Could not update HO_SO_KHAM.ma_thanh_toan:', err.message);
      // Không throw error vì có thể cột này chưa tồn tại
    }

    res.json({
      success: true,
      data: {
        paymentUrl: momoResponse.payUrl,
        deeplink: momoResponse.deeplink,
        qrCodeUrl: momoResponse.qrCodeUrl,
        orderId: momoResponse.orderId,
        maThanhToan: maThanhToan,
      },
      message: 'Tạo link thanh toán MoMo thành công'
    });
  } catch (err) {
    console.error('❌ MoMo payment error:', err.message);
    console.error('Error stack:', err.stack);
    res.status(500).json({
      success: false,
      message: err.message || 'Lỗi khi tạo thanh toán MoMo'
    });
  }
});

// POST /api/patient/invoices/:id/momo-callback - Callback từ MoMo (IPN)
router.post('/invoices/:id/momo-callback', async (req, res) => {
  try {
    const { id } = req.params;
    const callbackData = req.body;

    console.log('MoMo callback received:', { invoiceId: id, resultCode: callbackData.resultCode });

    // Verify signature
    const isValid = verifyMomoCallback(callbackData);

    if (!isValid) {
      console.error('Invalid MoMo callback signature');
      return res.status(400).json({
        success: false,
        message: 'Invalid MoMo callback signature'
      });
    }

    const pool = await poolPromise;

    // Tìm thanh toán theo ma_giao_dich (orderId)
    const thanhToanResult = await pool.request()
      .input('ma_giao_dich', callbackData.orderId)
      .query(`
        SELECT TOP 1 tt.ma_thanh_toan, hs.ma_ho_so
        FROM THANH_TOAN tt
        LEFT JOIN HO_SO_KHAM hs ON tt.ma_thanh_toan = hs.ma_thanh_toan
        WHERE tt.ma_giao_dich = @ma_giao_dich
      `);

    if (thanhToanResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy giao dịch thanh toán'
      });
    }

    const thanhToan = thanhToanResult.recordset[0];

    // Kiểm tra resultCode
    // resultCode = 0: Thanh toán thành công
    // resultCode khác 0: Thanh toán thất bại
    if (callbackData.resultCode === 0) {
      // Thanh toán thành công
      await pool.request()
        .input('ma_thanh_toan', thanhToan.ma_thanh_toan)
        .input('trang_thai', 'PAID')
        .input('ma_trang_thai_tt', 'PAID')
        .input('thanh_toan_luc', new Date())
        .input('so_hoa_don', callbackData.transId || null)
        .query(`
          UPDATE THANH_TOAN
          SET 
            trang_thai = @trang_thai,
            MaTrangThaiTT = @ma_trang_thai_tt,
            thanh_toan_luc = @thanh_toan_luc,
            so_hoa_don = @so_hoa_don
          WHERE ma_thanh_toan = @ma_thanh_toan
        `);

      console.log('Payment successful:', thanhToan.ma_thanh_toan);
    } else {
      // Thanh toán thất bại
      await pool.request()
        .input('ma_thanh_toan', thanhToan.ma_thanh_toan)
        .input('trang_thai', 'FAILED')
        .input('ma_trang_thai_tt', 'FAILED')
        .query(`
          UPDATE THANH_TOAN
          SET 
            trang_thai = @trang_thai,
            MaTrangThaiTT = @ma_trang_thai_tt
          WHERE ma_thanh_toan = @ma_thanh_toan
        `);

      console.log('Payment failed:', callbackData.message);
    }

    // Trả về success để MoMo biết đã nhận được callback
    return res.json({
      success: true,
      message: 'Callback received'
    });
  } catch (err) {
    console.error('❌ MoMo callback error:', err.message);
    console.error('Error stack:', err.stack);
    res.status(500).json({
      success: false,
      message: err.message || 'Lỗi khi xử lý callback từ MoMo'
    });
  }
});

// GET /api/patient/profile - Lấy thông tin profile của bệnh nhân từ bảng BENH_NHAN
router.get('/profile', protect, async (req, res) => {
  try {
    const username = req.user?.username;
    const userId = req.user?.id;
    const email = req.user?.email;

    console.log('🔍 GET /api/patient/profile - User info:', { username, userId, email });

    if (!username && !userId && !email) {
      return res.status(401).json({
        success: false,
        message: 'Không xác định được bệnh nhân'
      });
    }

    const pool = await poolPromise;

    // Lấy thông tin từ USERS_AUTH trước
    const identifier = username || userId || email;
    const isUserId = userId && isValidUUID(userId);

    let userResult;
    if (isUserId) {
      // Nếu identifier là UUID, có thể so sánh với id
      userResult = await pool.request()
        .input('identifier', identifier)
        .input('userId', userId)
        .query(`
          SELECT TOP 1 id, username, full_name, email, phone, address, gender, date_of_birth, created_at
          FROM ${TABLE}
          WHERE (username = @identifier OR id = @userId OR email = @identifier) AND role = 'patient'
        `);
    } else {
      // Nếu không phải UUID, chỉ so sánh username và email
      userResult = await pool.request()
        .input('identifier', identifier)
        .query(`
          SELECT TOP 1 id, username, full_name, email, phone, address, gender, date_of_birth, created_at
          FROM ${TABLE}
          WHERE (username = @identifier OR email = @identifier) AND role = 'patient'
        `);
    }

    if (userResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin người dùng'
      });
    }

    const user = userResult.recordset[0];
    const userEmail = user.email || email;

    // Tìm ma_benh_nhan từ BENH_NHAN
    let maBenhNhan = null;
    let benhNhan = null;

    if (userEmail) {
      const benhNhanResult = await pool.request()
        .input('email', userEmail)
        .query(`
          SELECT TOP 1 
            ma_benh_nhan,
            ten_benh_nhan,
            gioi_tinh,
            ngay_sinh,
            dia_chi,
            ma_bhyt,
            nhom_mau,
            di_ung,
            tien_su_benh,
            so_dien_thoai,
            email
          FROM BENH_NHAN
          WHERE email = @email
        `);

      if (benhNhanResult.recordset.length > 0) {
        maBenhNhan = benhNhanResult.recordset[0].ma_benh_nhan;
        benhNhan = benhNhanResult.recordset[0];
      }
    }

    // Nếu không tìm thấy trong BENH_NHAN, tạo mới
    if (!maBenhNhan) {
      maBenhNhan = uuidv4();
      await pool.request()
        .input('ma_benh_nhan', maBenhNhan)
        .input('ten_benh_nhan', user.full_name || 'Bệnh nhân')
        .input('email', userEmail || '')
        .input('so_dien_thoai', user.phone || null)
        .input('ngay_sinh', user.date_of_birth || null)
        .input('gioi_tinh', user.gender || null)
        .input('dia_chi', user.address || null)
        .query(`
          INSERT INTO BENH_NHAN (ma_benh_nhan, ten_benh_nhan, email, so_dien_thoai, ngay_sinh, gioi_tinh, dia_chi)
          VALUES (@ma_benh_nhan, @ten_benh_nhan, @email, @so_dien_thoai, @ngay_sinh, @gioi_tinh, @dia_chi)
        `);

      // Lấy lại thông tin vừa tạo
      const newResult = await pool.request()
        .input('ma_benh_nhan', maBenhNhan)
        .query(`
          SELECT TOP 1 
            ma_benh_nhan,
            ten_benh_nhan,
            gioi_tinh,
            ngay_sinh,
            dia_chi,
            ma_bhyt,
            nhom_mau,
            di_ung,
            tien_su_benh,
            so_dien_thoai,
            email
          FROM BENH_NHAN
          WHERE ma_benh_nhan = @ma_benh_nhan
        `);

      benhNhan = newResult.recordset[0];
      console.log('✅ Created new BENH_NHAN record:', maBenhNhan);
    }

    // Map dữ liệu sang format frontend mong đợi
    const profile = {
      id: user.id || maBenhNhan,
      fullName: benhNhan.ten_benh_nhan || user.full_name || 'Bệnh nhân',
      email: benhNhan.email || user.email || '',
      phone: benhNhan.so_dien_thoai || user.phone || '',
      address: benhNhan.dia_chi || user.address || '',
      dateOfBirth: benhNhan.ngay_sinh
        ? new Date(benhNhan.ngay_sinh).toISOString().split('T')[0]
        : (user.date_of_birth ? new Date(user.date_of_birth).toISOString().split('T')[0] : null),
      gender: benhNhan.gioi_tinh || user.gender || 'other',
      bloodType: benhNhan.nhom_mau || null,
      allergies: benhNhan.di_ung || null,
      medicalHistory: benhNhan.tien_su_benh || null,
      insuranceNumber: benhNhan.ma_bhyt || null,
      emergencyContact: null, // Chưa có trong schema
      createdAt: user.created_at ? new Date(user.created_at).toISOString() : null,
      updatedAt: user.created_at ? new Date(user.created_at).toISOString() : null, // USERS_AUTH không có updated_at, dùng created_at
    };

    console.log('✅ Profile retrieved successfully for:', profile.email);

    res.json({
      success: true,
      data: profile
    });
  } catch (err) {
    console.error('❌ SQL patient profile GET error:', err.message);
    console.error('Error stack:', err.stack);
    res.status(500).json({
      success: false,
      message: err.message || 'Lỗi khi lấy thông tin profile',
      error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// PUT /api/patient/profile - Cập nhật thông tin profile của bệnh nhân vào bảng BENH_NHAN
router.put('/profile', protect, async (req, res) => {
  try {
    const username = req.user?.username;
    const userId = req.user?.id;
    const email = req.user?.email;

    if (!username && !userId && !email) {
      return res.status(401).json({
        success: false,
        message: 'Không xác định được bệnh nhân'
      });
    }

    const pool = await poolPromise;
    const maBenhNhan = await findMaBenhNhan(pool, username, userId, email);

    if (!maBenhNhan) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin bệnh nhân'
      });
    }

    const {
      email: newEmail,
      phone,
      address,
      dateOfBirth,
      emergencyContact,
      bloodType,
      allergies,
      medicalHistory,
      insuranceNumber
    } = req.body;

    // Lấy thông tin hiện tại
    const currentResult = await pool.request()
      .input('ma_benh_nhan', maBenhNhan)
      .query(`
        SELECT TOP 1 *
        FROM BENH_NHAN
        WHERE ma_benh_nhan = @ma_benh_nhan
      `);

    if (currentResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin bệnh nhân'
      });
    }

    const current = currentResult.recordset[0];

    // Cập nhật thông tin vào BENH_NHAN
    await pool.request()
      .input('ma_benh_nhan', maBenhNhan)
      .input('email', newEmail !== undefined ? newEmail : current.email)
      .input('so_dien_thoai', phone !== undefined ? phone : current.so_dien_thoai)
      .input('dia_chi', address !== undefined ? address : current.dia_chi)
      .input('ngay_sinh', dateOfBirth ? new Date(dateOfBirth) : (current.ngay_sinh || null))
      .input('nhom_mau', bloodType !== undefined ? bloodType : current.nhom_mau)
      .input('di_ung', allergies !== undefined ? allergies : current.di_ung)
      .input('tien_su_benh', medicalHistory !== undefined ? medicalHistory : current.tien_su_benh)
      .input('ma_bhyt', insuranceNumber !== undefined ? insuranceNumber : current.ma_bhyt)
      .query(`
        UPDATE BENH_NHAN
        SET 
          email = @email,
          so_dien_thoai = @so_dien_thoai,
          dia_chi = @dia_chi,
          ngay_sinh = @ngay_sinh,
          nhom_mau = @nhom_mau,
          di_ung = @di_ung,
          tien_su_benh = @tien_su_benh,
          ma_bhyt = @ma_bhyt
        WHERE ma_benh_nhan = @ma_benh_nhan
      `);

    // Cập nhật email trong USERS_AUTH nếu có thay đổi
    if (newEmail && newEmail !== current.email) {
      try {
        const identifier = username || userId || email;
        const isUserId = userId && isValidUUID(userId);

        if (isUserId) {
          await pool.request()
            .input('identifier', identifier)
            .input('userId', userId)
            .input('new_email', newEmail)
            .query(`
              UPDATE ${TABLE}
              SET email = @new_email
              WHERE (username = @identifier OR id = @userId OR email = @identifier) AND role = 'patient'
            `);
        } else {
          await pool.request()
            .input('identifier', identifier)
            .input('new_email', newEmail)
            .query(`
              UPDATE ${TABLE}
              SET email = @new_email
              WHERE (username = @identifier OR email = @identifier) AND role = 'patient'
            `);
        }
      } catch (userUpdateError) {
        console.warn('⚠️ Could not update email in USERS_AUTH:', userUpdateError.message);
        // Không fail nếu không update được USERS_AUTH
      }
    }

    // Lấy lại thông tin đã cập nhật
    const updatedResult = await pool.request()
      .input('ma_benh_nhan', maBenhNhan)
      .query(`
        SELECT 
          ma_benh_nhan,
          ten_benh_nhan,
          gioi_tinh,
          ngay_sinh,
          dia_chi,
          ma_bhyt,
          nhom_mau,
          di_ung,
          tien_su_benh,
          so_dien_thoai,
          email
        FROM BENH_NHAN
        WHERE ma_benh_nhan = @ma_benh_nhan
      `);

    const updated = updatedResult.recordset[0];

    // Lấy thông tin từ USERS_AUTH
    const identifier = username || userId || newEmail || email;
    const isUserId = userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);

    let userResult;
    if (isUserId) {
      userResult = await pool.request()
        .input('identifier', identifier)
        .input('userId', userId)
        .query(`
          SELECT TOP 1 id, full_name, email, created_at
          FROM ${TABLE}
          WHERE (username = @identifier OR id = @userId OR email = @identifier) AND role = 'patient'
        `);
    } else {
      userResult = await pool.request()
        .input('identifier', identifier)
        .query(`
          SELECT TOP 1 id, full_name, email, created_at
          FROM ${TABLE}
          WHERE (username = @identifier OR email = @identifier) AND role = 'patient'
        `);
    }

    const user = userResult.recordset[0] || {};

    // Map dữ liệu sang format frontend mong đợi
    const profile = {
      id: user.id || maBenhNhan,
      fullName: updated.ten_benh_nhan || user.full_name || 'Bệnh nhân',
      email: updated.email || user.email || '',
      phone: updated.so_dien_thoai || '',
      address: updated.dia_chi || '',
      dateOfBirth: updated.ngay_sinh ? new Date(updated.ngay_sinh).toISOString().split('T')[0] : null,
      gender: updated.gioi_tinh || 'other',
      bloodType: updated.nhom_mau || null,
      allergies: updated.di_ung || null,
      medicalHistory: updated.tien_su_benh || null,
      insuranceNumber: updated.ma_bhyt || null,
      emergencyContact: emergencyContact || null,
      createdAt: user.created_at ? new Date(user.created_at).toISOString() : null,
      updatedAt: new Date().toISOString(),
    };

    console.log(`✅ Updated patient profile: ${maBenhNhan}`);

    res.json({
      success: true,
      message: 'Cập nhật thông tin thành công',
      data: profile
    });
  } catch (err) {
    console.error('❌ SQL patient profile PUT error:', err.message);
    console.error('Error stack:', err.stack);
    res.status(500).json({
      success: false,
      message: err.message || 'Lỗi khi cập nhật thông tin profile'
    });
  }
});

// GET /api/patient/insurance - Lấy thông tin BHYT của bệnh nhân từ bảng BHYT_THE
router.get('/insurance', protect, async (req, res) => {
  try {
    const username = req.user?.username;
    const userId = req.user?.id;
    const email = req.user?.email;

    console.log('🔍 GET /api/patient/insurance - User info:', { username, userId, email });

    if (!username && !userId && !email) {
      return res.status(401).json({
        success: false,
        message: 'Không xác định được bệnh nhân'
      });
    }

    const pool = await poolPromise;

    // Lấy ma_benh_nhan từ USERS_AUTH và BENH_NHAN
    const identifier = username || userId || email;
    const isUserId = userId && isValidUUID(userId);

    let userResult;
    if (isUserId) {
      userResult = await pool.request()
        .input('identifier', identifier)
        .input('userId', userId)
        .query(`
          SELECT TOP 1 id, username, email
          FROM ${TABLE}
          WHERE (username = @identifier OR id = @userId OR email = @identifier) AND role = 'patient'
        `);
    } else {
      userResult = await pool.request()
        .input('identifier', identifier)
        .query(`
          SELECT TOP 1 id, username, email
          FROM ${TABLE}
          WHERE (username = @identifier OR email = @identifier) AND role = 'patient'
        `);
    }

    if (userResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin bệnh nhân'
      });
    }

    const userEmail = userResult.recordset[0].email || userResult.recordset[0].username;

    // Lấy ma_benh_nhan từ BENH_NHAN
    const benhNhanResult = await pool.request()
      .input('email', userEmail)
      .query(`
        SELECT TOP 1 ma_benh_nhan
        FROM BENH_NHAN
        WHERE email = @email
      `);

    if (benhNhanResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy mã bệnh nhân'
      });
    }

    const maBenhNhan = benhNhanResult.recordset[0].ma_benh_nhan;

    console.log('🔍 GET /api/patient/insurance - ma_benh_nhan:', maBenhNhan);

    // Lấy thông tin BHYT từ BHYT_THE
    // Try to get with image columns first, fallback if columns don't exist
    let bhytResult;
    try {
      bhytResult = await pool.request()
        .input('ma_benh_nhan', maBenhNhan)
        .query(`
          SELECT TOP 1
            so_the,
            ISNULL(ma_noi_dang_ky_kcb, '') as ma_noi_dang_ky_kcb,
            ty_le_chi_tra,
            ty_le_dong_chi_tra,
            hieu_luc_tu,
            hieu_luc_den,
            ISNULL(trang_thai, '') as trang_thai,
            ma_benh_nhan,
            ISNULL(anh_mat_truoc, '') as anh_mat_truoc,
            ISNULL(anh_mat_sau, '') as anh_mat_sau
          FROM BHYT_THE
          WHERE ma_benh_nhan = @ma_benh_nhan
          ORDER BY hieu_luc_den DESC
        `);
    } catch (queryError) {
      // If columns don't exist, try without image columns
      if (queryError.message && queryError.message.includes('Invalid column name')) {
        console.log('⚠️ Image columns not found, querying without them');
        bhytResult = await pool.request()
          .input('ma_benh_nhan', maBenhNhan)
          .query(`
            SELECT TOP 1
              so_the,
              ISNULL(ma_noi_dang_ky_kcb, '') as ma_noi_dang_ky_kcb,
              ty_le_chi_tra,
              ty_le_dong_chi_tra,
              hieu_luc_tu,
              hieu_luc_den,
              ISNULL(trang_thai, '') as trang_thai,
              ma_benh_nhan
            FROM BHYT_THE
            WHERE ma_benh_nhan = @ma_benh_nhan
            ORDER BY hieu_luc_den DESC
          `);
      } else {
        throw queryError;
      }
    }

    console.log('🔍 BHYT query result:', {
      recordCount: bhytResult.recordset.length,
      records: bhytResult.recordset
    });

    if (bhytResult.recordset.length === 0) {
      console.log('⚠️ No BHYT data found for ma_benh_nhan:', maBenhNhan);
      return res.json({
        success: true,
        data: null,
        message: 'Bệnh nhân chưa có thông tin BHYT'
      });
    }

    const bhyt = bhytResult.recordset[0];

    // Format dữ liệu
    const baseUrl = process.env.API_URL || 'http://localhost:5000';
    const insuranceData = {
      soThe: bhyt.so_the || '',
      maNoiDangKyKCB: bhyt.ma_noi_dang_ky_kcb || null,
      tyLeChiTra: bhyt.ty_le_chi_tra !== null && bhyt.ty_le_chi_tra !== undefined ? parseFloat(bhyt.ty_le_chi_tra) : null,
      tyLeDongChiTra: bhyt.ty_le_dong_chi_tra !== null && bhyt.ty_le_dong_chi_tra !== undefined ? parseFloat(bhyt.ty_le_dong_chi_tra) : null,
      hieuLucTu: bhyt.hieu_luc_tu ? new Date(bhyt.hieu_luc_tu).toISOString().split('T')[0] : null,
      hieuLucDen: bhyt.hieu_luc_den ? new Date(bhyt.hieu_luc_den).toISOString().split('T')[0] : null,
      trangThai: bhyt.trang_thai || null,
      maBenhNhan: bhyt.ma_benh_nhan,
      // Check if image columns exist in result
      anhMatTruoc: bhyt.anh_mat_truoc !== undefined && bhyt.anh_mat_truoc && bhyt.anh_mat_truoc !== '' ? `${baseUrl}/uploads/bhyt/${bhyt.anh_mat_truoc}` : null,
      anhMatSau: bhyt.anh_mat_sau !== undefined && bhyt.anh_mat_sau && bhyt.anh_mat_sau !== '' ? `${baseUrl}/uploads/bhyt/${bhyt.anh_mat_sau}` : null
    };

    console.log('📊 Formatted insurance data:', insuranceData);

    console.log('✅ BHYT retrieved successfully for:', maBenhNhan);

    res.json({
      success: true,
      data: insuranceData
    });
  } catch (err) {
    console.error('❌ SQL patient insurance GET error:', err.message);
    console.error('Error stack:', err.stack);

    // Check for specific error types
    if (err.message && err.message.includes('Invalid column name')) {
      return res.status(500).json({
        success: false,
        message: 'Database chưa có cột ảnh. Vui lòng chạy: ALTER TABLE BHYT_THE ADD anh_mat_truoc NVARCHAR(255) NULL, anh_mat_sau NVARCHAR(255) NULL;',
        error: process.env.NODE_ENV === 'development' ? err.stack : undefined
      });
    }

    res.status(500).json({
      success: false,
      message: err.message || 'Lỗi khi lấy thông tin BHYT',
      error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// POST /api/patient/insurance/upload - Upload ảnh BHYT (2 mặt)
router.post('/insurance/upload', protect, (req, res, next) => {
  uploadBHYT.fields([
    { name: 'mat_truoc', maxCount: 1 },
    { name: 'mat_sau', maxCount: 1 }
  ])(req, res, (err) => {
    if (err) {
      console.error('❌ Multer error:', err.message);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'Kích thước file quá lớn. Tối đa 5MB mỗi file.'
        });
      }
      if (err.message.includes('Invalid file type')) {
        return res.status(400).json({
          success: false,
          message: 'Loại file không hợp lệ. Chỉ chấp nhận JPG, PNG, WEBP.'
        });
      }
      return res.status(400).json({
        success: false,
        message: err.message || 'Lỗi khi upload file'
      });
    }
    next();
  });
}, async (req, res) => {
  try {
    console.log('📸 Upload BHYT request received');
    console.log('Request files:', req.files ? Object.keys(req.files) : 'No files');
    console.log('Request body:', req.body);

    const username = req.user?.username;
    const userId = req.user?.id;
    const email = req.user?.email;

    console.log('User info:', { username, userId, email });

    if (!req.files || (!req.files['mat_truoc'] && !req.files['mat_sau'])) {
      console.log('⚠️ No files in request');
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn ít nhất một ảnh để upload'
      });
    }

    const pool = await poolPromise;

    // Lấy ma_benh_nhan
    const identifier = username || userId || email;
    const isUserId = userId && isValidUUID(userId);

    let userResult;
    if (isUserId) {
      userResult = await pool.request()
        .input('identifier', identifier)
        .input('userId', userId)
        .query(`
          SELECT TOP 1 id, username, email
          FROM ${TABLE}
          WHERE (username = @identifier OR id = @userId OR email = @identifier) AND role = 'patient'
        `);
    } else {
      userResult = await pool.request()
        .input('identifier', identifier)
        .query(`
          SELECT TOP 1 id, username, email
          FROM ${TABLE}
          WHERE (username = @identifier OR email = @identifier) AND role = 'patient'
        `);
    }

    if (userResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin bệnh nhân'
      });
    }

    const userEmail = userResult.recordset[0].email || userResult.recordset[0].username;

    const benhNhanResult = await pool.request()
      .input('email', userEmail)
      .query(`
        SELECT TOP 1 ma_benh_nhan
        FROM BENH_NHAN
        WHERE email = @email
      `);

    if (benhNhanResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy mã bệnh nhân'
      });
    }

    const maBenhNhan = benhNhanResult.recordset[0].ma_benh_nhan;

    // Get filenames
    const matTruocFile = req.files['mat_truoc'] ? req.files['mat_truoc'][0] : null;
    const matSauFile = req.files['mat_sau'] ? req.files['mat_sau'][0] : null;

    const anhMatTruoc = matTruocFile ? matTruocFile.filename : null;
    const anhMatSau = matSauFile ? matSauFile.filename : null;

    console.log('📸 Upload BHYT images:', {
      maBenhNhan,
      anhMatTruoc,
      anhMatSau
    });

    // Check if BHYT record exists
    const existingResult = await pool.request()
      .input('ma_benh_nhan', maBenhNhan)
      .query(`
        SELECT TOP 1 so_the
        FROM BHYT_THE
        WHERE ma_benh_nhan = @ma_benh_nhan
      `);

    if (existingResult.recordset.length > 0) {
      // Update existing record
      const updateFields = [];
      const updateRequest = pool.request().input('ma_benh_nhan', maBenhNhan);

      if (anhMatTruoc) {
        updateFields.push('anh_mat_truoc = @anh_mat_truoc');
        updateRequest.input('anh_mat_truoc', anhMatTruoc);
      }
      if (anhMatSau) {
        updateFields.push('anh_mat_sau = @anh_mat_sau');
        updateRequest.input('anh_mat_sau', anhMatSau);
      }

      if (updateFields.length > 0) {
        try {
          const updateResult = await updateRequest.query(`
            UPDATE BHYT_THE
            SET ${updateFields.join(', ')}
            WHERE ma_benh_nhan = @ma_benh_nhan
          `);
          console.log('✅ BHYT images updated, rows affected:', updateResult.rowsAffected);
        } catch (dbError) {
          console.error('❌ Database update error:', dbError.message);
          // Check if columns exist
          if (dbError.message.includes('Invalid column name')) {
            return res.status(500).json({
              success: false,
              message: 'Cột ảnh chưa được tạo trong database. Vui lòng chạy: ALTER TABLE BHYT_THE ADD anh_mat_truoc NVARCHAR(255) NULL, anh_mat_sau NVARCHAR(255) NULL;'
            });
          }
          throw dbError;
        }
      }
    } else {
      return res.status(404).json({
        success: false,
        message: 'Chưa có thông tin BHYT. Vui lòng tạo thông tin BHYT trước khi upload ảnh.'
      });
    }

    const baseUrl = process.env.API_URL || 'http://localhost:5000';
    res.json({
      success: true,
      data: {
        anhMatTruoc: anhMatTruoc ? `${baseUrl}/uploads/bhyt/${anhMatTruoc}` : null,
        anhMatSau: anhMatSau ? `${baseUrl}/uploads/bhyt/${anhMatSau}` : null
      },
      message: 'Upload ảnh BHYT thành công'
    });
  } catch (err) {
    console.error('❌ Upload BHYT images error:', err.message);
    console.error('Error stack:', err.stack);
    console.error('Request details:', {
      hasFiles: !!req.files,
      filesKeys: req.files ? Object.keys(req.files) : [],
      user: req.user ? { username: req.user.username, id: req.user.id } : null
    });

    // Check for specific error types
    if (err.message && err.message.includes('Invalid column name')) {
      return res.status(500).json({
        success: false,
        message: 'Database chưa có cột ảnh. Vui lòng chạy: ALTER TABLE BHYT_THE ADD anh_mat_truoc NVARCHAR(255) NULL, anh_mat_sau NVARCHAR(255) NULL;'
      });
    }

    res.status(500).json({
      success: false,
      message: err.message || 'Lỗi khi upload ảnh BHYT',
      error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// PUT /api/patient/insurance - Cập nhật thông tin BHYT của bệnh nhân
router.put('/insurance', protect, async (req, res) => {
  try {
    const username = req.user?.username;
    const userId = req.user?.id;
    const email = req.user?.email;

    const {
      soThe,
      maNoiDangKyKCB,
      tyLeChiTra,
      tyLeDongChiTra,
      hieuLucTu,
      hieuLucDen,
      trangThai
    } = req.body;

    if (!soThe) {
      return res.status(400).json({
        success: false,
        message: 'Số thẻ BHYT không được để trống'
      });
    }

    const pool = await poolPromise;

    // Lấy ma_benh_nhan
    const identifier = username || userId || email;
    const isUserId = userId && isValidUUID(userId);

    let userResult;
    if (isUserId) {
      userResult = await pool.request()
        .input('identifier', identifier)
        .input('userId', userId)
        .query(`
          SELECT TOP 1 id, username, email
          FROM ${TABLE}
          WHERE (username = @identifier OR id = @userId OR email = @identifier) AND role = 'patient'
        `);
    } else {
      userResult = await pool.request()
        .input('identifier', identifier)
        .query(`
          SELECT TOP 1 id, username, email
          FROM ${TABLE}
          WHERE (username = @identifier OR email = @identifier) AND role = 'patient'
        `);
    }

    if (userResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin bệnh nhân'
      });
    }

    const userEmail = userResult.recordset[0].email || userResult.recordset[0].username;

    const benhNhanResult = await pool.request()
      .input('email', userEmail)
      .query(`
        SELECT TOP 1 ma_benh_nhan
        FROM BENH_NHAN
        WHERE email = @email
      `);

    if (benhNhanResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy mã bệnh nhân'
      });
    }

    const maBenhNhan = benhNhanResult.recordset[0].ma_benh_nhan;

    console.log('🔍 PUT /api/patient/insurance - Data received:', {
      soThe,
      maNoiDangKyKCB,
      tyLeChiTra,
      tyLeDongChiTra,
      hieuLucTu,
      hieuLucDen,
      trangThai,
      maBenhNhan
    });

    // Kiểm tra xem đã có BHYT cho bệnh nhân này chưa (theo ma_benh_nhan)
    const existingResult = await pool.request()
      .input('ma_benh_nhan', maBenhNhan)
      .query(`
        SELECT TOP 1 so_the
        FROM BHYT_THE
        WHERE ma_benh_nhan = @ma_benh_nhan
      `);

    console.log('🔍 Existing BHYT check:', {
      hasExisting: existingResult.recordset.length > 0,
      existingSoThe: existingResult.recordset.length > 0 ? existingResult.recordset[0].so_the : null
    });

    if (existingResult.recordset.length > 0) {
      // Cập nhật BHYT hiện có
      const existingSoThe = existingResult.recordset[0].so_the;
      console.log('📝 Updating existing BHYT:', existingSoThe);

      const updateResult = await pool.request()
        .input('so_the', soThe)
        .input('ma_noi_dang_ky_kcb', maNoiDangKyKCB || null)
        .input('ty_le_chi_tra', tyLeChiTra !== null && tyLeChiTra !== undefined ? tyLeChiTra : null)
        .input('ty_le_dong_chi_tra', tyLeDongChiTra !== null && tyLeDongChiTra !== undefined ? tyLeDongChiTra : null)
        .input('hieu_luc_tu', hieuLucTu || null)
        .input('hieu_luc_den', hieuLucDen || null)
        .input('trang_thai', trangThai || null)
        .input('ma_benh_nhan', maBenhNhan)
        .input('existing_so_the', existingSoThe)
        .query(`
          UPDATE BHYT_THE
          SET 
            so_the = @so_the,
            ma_noi_dang_ky_kcb = @ma_noi_dang_ky_kcb,
            ty_le_chi_tra = @ty_le_chi_tra,
            ty_le_dong_chi_tra = @ty_le_dong_chi_tra,
            hieu_luc_tu = @hieu_luc_tu,
            hieu_luc_den = @hieu_luc_den,
            trang_thai = @trang_thai,
            ma_benh_nhan = @ma_benh_nhan
          WHERE so_the = @existing_so_the
        `);

      console.log('✅ UPDATE executed, rows affected:', updateResult.rowsAffected);
    } else {
      // Tạo mới BHYT
      console.log('📝 Creating new BHYT for patient:', maBenhNhan);

      const insertResult = await pool.request()
        .input('so_the', soThe)
        .input('ma_noi_dang_ky_kcb', maNoiDangKyKCB || null)
        .input('ty_le_chi_tra', tyLeChiTra !== null && tyLeChiTra !== undefined ? tyLeChiTra : null)
        .input('ty_le_dong_chi_tra', tyLeDongChiTra !== null && tyLeDongChiTra !== undefined ? tyLeDongChiTra : null)
        .input('hieu_luc_tu', hieuLucTu || null)
        .input('hieu_luc_den', hieuLucDen || null)
        .input('trang_thai', trangThai || null)
        .input('ma_benh_nhan', maBenhNhan)
        .query(`
          INSERT INTO BHYT_THE (
            so_the,
            ma_noi_dang_ky_kcb,
            ty_le_chi_tra,
            ty_le_dong_chi_tra,
            hieu_luc_tu,
            hieu_luc_den,
            trang_thai,
            ma_benh_nhan
          )
          VALUES (
            @so_the,
            @ma_noi_dang_ky_kcb,
            @ty_le_chi_tra,
            @ty_le_dong_chi_tra,
            @hieu_luc_tu,
            @hieu_luc_den,
            @trang_thai,
            @ma_benh_nhan
          )
        `);

      console.log('✅ INSERT executed, rows affected:', insertResult.rowsAffected);
    }

    // Lấy lại thông tin đã cập nhật
    const updatedResult = await pool.request()
      .input('ma_benh_nhan', maBenhNhan)
      .query(`
        SELECT TOP 1
          so_the,
          ma_noi_dang_ky_kcb,
          ty_le_chi_tra,
          ty_le_dong_chi_tra,
          hieu_luc_tu,
          hieu_luc_den,
          trang_thai,
          ma_benh_nhan
        FROM BHYT_THE
        WHERE ma_benh_nhan = @ma_benh_nhan
        ORDER BY hieu_luc_den DESC
      `);

    if (updatedResult.recordset.length === 0) {
      console.error('❌ No data found after insert/update');
      return res.status(500).json({
        success: false,
        message: 'Lưu dữ liệu thành công nhưng không thể lấy lại thông tin'
      });
    }

    const bhyt = updatedResult.recordset[0];
    const insuranceData = {
      soThe: bhyt.so_the,
      maNoiDangKyKCB: bhyt.ma_noi_dang_ky_kcb || null,
      tyLeChiTra: bhyt.ty_le_chi_tra ? parseFloat(bhyt.ty_le_chi_tra) : null,
      tyLeDongChiTra: bhyt.ty_le_dong_chi_tra ? parseFloat(bhyt.ty_le_dong_chi_tra) : null,
      hieuLucTu: bhyt.hieu_luc_tu ? new Date(bhyt.hieu_luc_tu).toISOString().split('T')[0] : null,
      hieuLucDen: bhyt.hieu_luc_den ? new Date(bhyt.hieu_luc_den).toISOString().split('T')[0] : null,
      trangThai: bhyt.trang_thai || null,
      maBenhNhan: bhyt.ma_benh_nhan
    };

    console.log('✅ BHYT saved successfully for:', maBenhNhan);
    console.log('✅ Saved data:', insuranceData);

    res.json({
      success: true,
      data: insuranceData,
      message: 'Cập nhật thông tin BHYT thành công'
    });
  } catch (err) {
    console.error('❌ SQL patient insurance PUT error:', err.message);
    console.error('Error stack:', err.stack);
    console.error('Request body:', req.body);
    res.status(500).json({
      success: false,
      message: err.message || 'Lỗi khi cập nhật thông tin BHYT',
      error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

module.exports = router;

