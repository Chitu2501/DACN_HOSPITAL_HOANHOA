const router = require('express').Router();
const { poolPromise } = require('../database/db-config');
const { protect } = require('../middleware/auth.middleware');
const { v4: uuidv4 } = require('uuid');

// GET /api/doctor/dashboard - Lấy thống kê dashboard cho bác sĩ
router.get('/dashboard', protect, async (req, res) => {
  try {
    const username = req.user?.username;
    const userId = req.user?.id;
    
    if (!username && !userId) {
      return res.status(401).json({
        success: false,
        message: 'Không xác định được bác sĩ'
      });
    }

    const pool = await poolPromise;
    const TABLE = process.env.SQL_TABLE_USERS || 'USERS_AUTH';
    
    // Tìm ma_bac_si từ username hoặc id
    const userQuery = `
      SELECT TOP 1 username, id
      FROM ${TABLE}
      WHERE (username = @identifier OR id = @identifier) AND role = 'doctor'
    `;
    
    const userResult = await pool.request()
      .input('identifier', username || userId)
      .query(userQuery);
    
    if (userResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin bác sĩ'
      });
    }
    
    const doctorUsername = userResult.recordset[0].username;
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    
    // Tính ngày đầu tuần (Thứ 2)
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Nếu Chủ nhật thì lùi 6 ngày
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - diff);
    weekStart.setHours(0, 0, 0, 0);
    
    // 1. Số lịch hẹn hôm nay
    const todayAppointmentsResult = await pool.request()
      .input('ma_bac_si', doctorUsername)
      .input('today_start', todayStart)
      .input('today_end', todayEnd)
      .query(`
        SELECT COUNT(*) AS count
        FROM LICH_HEN lh
        INNER JOIN CA_BAC_SI ca ON lh.ma_ca = ca.ma_ca
        WHERE ca.ma_bac_si = @ma_bac_si
          AND CAST(lh.thoi_gian_hen AS DATE) = CAST(@today_start AS DATE)
          AND lh.trang_thai NOT IN ('cancelled', 'huy', 'đã hủy')
      `);
    
    const todayAppointmentsCount = todayAppointmentsResult.recordset[0]?.count || 0;
    
    // 2. Số lịch hẹn hôm qua để tính thay đổi
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStart = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
    const yesterdayEnd = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59);
    
    const yesterdayAppointmentsResult = await pool.request()
      .input('ma_bac_si', doctorUsername)
      .input('yesterday_start', yesterdayStart)
      .input('yesterday_end', yesterdayEnd)
      .query(`
        SELECT COUNT(*) AS count
        FROM LICH_HEN lh
        INNER JOIN CA_BAC_SI ca ON lh.ma_ca = ca.ma_ca
        WHERE ca.ma_bac_si = @ma_bac_si
          AND CAST(lh.thoi_gian_hen AS DATE) = CAST(@yesterday_start AS DATE)
          AND lh.trang_thai NOT IN ('cancelled', 'huy', 'đã hủy')
      `);
    
    const yesterdayAppointmentsCount = yesterdayAppointmentsResult.recordset[0]?.count || 0;
    const appointmentsChange = todayAppointmentsCount - yesterdayAppointmentsCount;
    
    // 3. Số bệnh nhân chờ khám (pending appointments hôm nay)
    const waitingPatientsResult = await pool.request()
      .input('ma_bac_si', doctorUsername)
      .input('today_start', todayStart)
      .input('today_end', todayEnd)
      .query(`
        SELECT COUNT(*) AS count
        FROM LICH_HEN lh
        INNER JOIN CA_BAC_SI ca ON lh.ma_ca = ca.ma_ca
        WHERE ca.ma_bac_si = @ma_bac_si
          AND CAST(lh.thoi_gian_hen AS DATE) = CAST(@today_start AS DATE)
          AND lh.trang_thai IN ('pending', 'chờ khám', 'đã xác nhận')
      `);
    
    const waitingPatientsCount = waitingPatientsResult.recordset[0]?.count || 0;
    
    // 4. Số bệnh nhân chờ hôm qua
    const yesterdayWaitingResult = await pool.request()
      .input('ma_bac_si', doctorUsername)
      .input('yesterday_start', yesterdayStart)
      .input('yesterday_end', yesterdayEnd)
      .query(`
        SELECT COUNT(*) AS count
        FROM LICH_HEN lh
        INNER JOIN CA_BAC_SI ca ON lh.ma_ca = ca.ma_ca
        WHERE ca.ma_bac_si = @ma_bac_si
          AND CAST(lh.thoi_gian_hen AS DATE) = CAST(@yesterday_start AS DATE)
          AND lh.trang_thai IN ('pending', 'chờ khám', 'đã xác nhận')
      `);
    
    const yesterdayWaitingCount = yesterdayWaitingResult.recordset[0]?.count || 0;
    const waitingChange = waitingPatientsCount - yesterdayWaitingCount;
    
    // 5. Số ca hoàn thành hôm nay
    const completedTodayResult = await pool.request()
      .input('ma_bac_si', doctorUsername)
      .input('today_start', todayStart)
      .input('today_end', todayEnd)
      .query(`
        SELECT COUNT(*) AS count
        FROM HO_SO_KHAM hs
        INNER JOIN LICH_HEN lh ON hs.ma_lich_hen = lh.ma_lich_hen
        INNER JOIN CA_BAC_SI ca ON lh.ma_ca = ca.ma_ca
        WHERE ca.ma_bac_si = @ma_bac_si
          AND CAST(hs.ngay_kham AS DATE) = CAST(@today_start AS DATE)
          AND hs.trang_thai IN ('completed', 'hoàn thành', 'done')
      `);
    
    const completedTodayCount = completedTodayResult.recordset[0]?.count || 0;
    
    // 6. Tỷ lệ hoàn thành
    const completionRate = todayAppointmentsCount > 0 
      ? Math.round((completedTodayCount / todayAppointmentsCount) * 100) 
      : 0;
    
    // 7. Số cảnh báo khẩn (appointments có ghi chú khẩn hoặc trạng thái urgent)
    const urgentCountResult = await pool.request()
      .input('ma_bac_si', doctorUsername)
      .input('today_start', todayStart)
      .input('today_end', todayEnd)
      .query(`
        SELECT COUNT(*) AS count
        FROM LICH_HEN lh
        INNER JOIN CA_BAC_SI ca ON lh.ma_ca = ca.ma_ca
        WHERE ca.ma_bac_si = @ma_bac_si
          AND CAST(lh.thoi_gian_hen AS DATE) = CAST(@today_start AS DATE)
          AND (lh.ghi_chu LIKE N'%khẩn%' OR lh.ghi_chu LIKE N'%urgent%' OR lh.trang_thai = 'urgent')
      `);
    
    const urgentCount = urgentCountResult.recordset[0]?.count || 0;
    
    // 8. Danh sách lịch hẹn hôm nay
    const appointmentsTodayResult = await pool.request()
      .input('ma_bac_si', doctorUsername)
      .input('today_start', todayStart)
      .input('today_end', todayEnd)
      .query(`
        SELECT 
          lh.ma_lich_hen,
          lh.thoi_gian_hen,
          lh.trang_thai,
          lh.ghi_chu,
          bn.ten_benh_nhan,
          bn.so_dien_thoai,
          bn.email,
          ca.bat_dau,
          ca.ket_thuc,
          ca.phong_kham,
          hs.trang_thai AS ho_so_trang_thai
        FROM LICH_HEN lh
        INNER JOIN CA_BAC_SI ca ON lh.ma_ca = ca.ma_ca
        LEFT JOIN BENH_NHAN bn ON lh.ma_benh_nhan = bn.ma_benh_nhan
        LEFT JOIN HO_SO_KHAM hs ON lh.ma_lich_hen = hs.ma_lich_hen
        WHERE ca.ma_bac_si = @ma_bac_si
          AND CAST(lh.thoi_gian_hen AS DATE) = CAST(@today_start AS DATE)
          AND lh.trang_thai NOT IN ('cancelled', 'huy', 'đã hủy')
        ORDER BY lh.thoi_gian_hen ASC
      `);
    
    // 9. Hàng đợi bệnh nhân (pending appointments)
    const waitingQueueResult = await pool.request()
      .input('ma_bac_si', doctorUsername)
      .input('today_start', todayStart)
      .input('today_end', todayEnd)
      .query(`
        SELECT TOP 10
          lh.ma_lich_hen,
          lh.thoi_gian_hen,
          bn.ten_benh_nhan,
          bn.so_dien_thoai,
          lh.ghi_chu,
          DATEDIFF(MINUTE, lh.thoi_gian_hen, GETDATE()) AS wait_minutes
        FROM LICH_HEN lh
        INNER JOIN CA_BAC_SI ca ON lh.ma_ca = ca.ma_ca
        LEFT JOIN BENH_NHAN bn ON lh.ma_benh_nhan = bn.ma_benh_nhan
        WHERE ca.ma_bac_si = @ma_bac_si
          AND CAST(lh.thoi_gian_hen AS DATE) = CAST(@today_start AS DATE)
          AND lh.trang_thai IN ('pending', 'chờ khám', 'đã xác nhận')
          AND lh.thoi_gian_hen <= GETDATE()
        ORDER BY lh.thoi_gian_hen ASC
      `);
    
    // 10. Thống kê tuần (7 ngày gần nhất)
    const weekStatsResult = await pool.request()
      .input('ma_bac_si', doctorUsername)
      .input('week_start', weekStart)
      .query(`
        SELECT 
          CAST(hs.ngay_kham AS DATE) AS ngay_kham,
          COUNT(CASE WHEN hs.trang_thai IN ('completed', 'hoàn thành', 'done') THEN 1 END) AS completed,
          COUNT(CASE WHEN lh.trang_thai IN ('pending', 'chờ khám', 'đã xác nhận') THEN 1 END) AS pending
        FROM LICH_HEN lh
        INNER JOIN CA_BAC_SI ca ON lh.ma_ca = ca.ma_ca
        LEFT JOIN HO_SO_KHAM hs ON lh.ma_lich_hen = hs.ma_lich_hen
        WHERE ca.ma_bac_si = @ma_bac_si
          AND CAST(lh.thoi_gian_hen AS DATE) >= CAST(@week_start AS DATE)
          AND CAST(lh.thoi_gian_hen AS DATE) <= CAST(GETDATE() AS DATE)
        GROUP BY CAST(hs.ngay_kham AS DATE), CAST(lh.thoi_gian_hen AS DATE)
        ORDER BY ngay_kham ASC
      `);
    
    // Format appointments
    const appointments = appointmentsTodayResult.recordset.map(item => {
      const time = new Date(item.thoi_gian_hen);
      const hours = time.getHours().toString().padStart(2, '0');
      const minutes = time.getMinutes().toString().padStart(2, '0');
      
      // Xác định trạng thái
      let status = 'pending';
      if (item.ho_so_trang_thai === 'completed' || item.ho_so_trang_thai === 'hoàn thành') {
        status = 'completed';
      } else if (item.trang_thai === 'confirmed' || item.trang_thai === 'đã xác nhận') {
        status = 'confirmed';
      }
      
      return {
        time: `${hours}:${minutes}`,
        patient: item.ten_benh_nhan || 'Bệnh nhân',
        reason: item.ghi_chu || 'Khám bệnh',
        status: status,
        room: item.phong_kham || 'P' + (item.ma_lich_hen?.substring(0, 3) || '000'),
        ma_lich_hen: item.ma_lich_hen
      };
    });
    
    // Format waiting queue
    const waitingQueue = waitingQueueResult.recordset.map((item, index) => {
      const waitMinutes = item.wait_minutes || 0;
      const waitText = waitMinutes < 60 ? `${waitMinutes} phút` : `${Math.floor(waitMinutes / 60)} giờ`;
      
      return {
        name: item.ten_benh_nhan || 'Bệnh nhân',
        ticket: `#A${String(index + 1).padStart(3, '0')}`,
        wait: waitText,
        priority: item.ghi_chu?.includes('khẩn') || item.ghi_chu?.includes('urgent') ? 'Cao' : 'Trung bình',
        note: item.ghi_chu || 'Khám bệnh',
        ma_lich_hen: item.ma_lich_hen
      };
    });
    
    // Format week stats
    const weekStats = [];
    const daysOfWeek = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      const dayName = daysOfWeek[date.getDay()];
      
      const dayStats = weekStatsResult.recordset.find(s => {
        const statDate = new Date(s.ngay_kham);
        return statDate.toDateString() === date.toDateString();
      });
      
      weekStats.push({
        day: dayName,
        completed: dayStats?.completed || 0,
        pending: dayStats?.pending || 0
      });
    }
    
    res.json({
      success: true,
      data: {
        metrics: {
          todayAppointments: todayAppointmentsCount,
          appointmentsChange: appointmentsChange,
          waitingPatients: waitingPatientsCount,
          waitingChange: waitingChange,
          completionRate: completionRate,
          urgentCount: urgentCount
        },
        appointments: appointments,
        waitingQueue: waitingQueue,
        weekStats: weekStats
      }
    });
  } catch (err) {
    console.error('❌ SQL doctor dashboard error:', err.message);
    console.error('Error stack:', err.stack);
    res.status(500).json({
      success: false,
      message: err.message || 'Lỗi khi lấy thống kê dashboard'
    });
  }
});

// GET /api/doctor/ho-so-kham - lấy danh sách hồ sơ khám từ SQL Server
// Bao gồm cả lịch hẹn từ LICH_HEN (khi bệnh nhân đặt lịch)
router.get('/ho-so-kham', protect, async (req, res) => {
  try {
    const username = req.user?.username;
    const userId = req.user?.id;
    
    if (!username && !userId) {
      return res.status(401).json({
        success: false,
        message: 'Không xác định được bác sĩ'
      });
    }

    const pool = await poolPromise;
    const TABLE = process.env.SQL_TABLE_USERS || 'USERS_AUTH';
    
    // Tìm ma_bac_si từ username hoặc id
    const userQuery = `
      SELECT TOP 1 username, id
      FROM ${TABLE}
      WHERE (username = @identifier OR id = @identifier) AND role = 'doctor'
    `;
    
    const userResult = await pool.request()
      .input('identifier', username || userId)
      .query(userQuery);
    
    if (userResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin bác sĩ'
      });
    }
    
    const doctorUsername = userResult.recordset[0].username;
    
    // 1. Lấy hồ sơ khám từ HO_SO_KHAM (nếu có) - join với LICH_HEN để lấy ma_bac_si và SINH_HIEU
    const hoSoResult = await pool.request()
      .input('ma_bac_si', doctorUsername)
      .query(`
        SELECT TOP (100)
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
          bn.ten_benh_nhan,
          bn.so_dien_thoai,
          bn.email,
          bn.gioi_tinh,
          bn.ngay_sinh,
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
        LEFT JOIN CA_BAC_SI ca ON lh.ma_ca = ca.ma_ca
        LEFT JOIN BAC_SI bs ON ca.ma_bac_si = bs.ma_bac_si
        LEFT JOIN BENH_NHAN bn ON lh.ma_benh_nhan = bn.ma_benh_nhan
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
        WHERE bs.ma_bac_si = @ma_bac_si
        ORDER BY hs.ngay_kham DESC, hs.tao_luc DESC
      `);
    
    // 2. Lấy lịch hẹn từ LICH_HEN (khi bệnh nhân đặt lịch)
    const lichHenResult = await pool.request()
      .input('ma_bac_si', doctorUsername)
      .query(`
        SELECT 
          lh.ma_lich_hen,
          lh.ma_lich_hen AS ma_ho_so,
          lh.thoi_gian_hen AS ngay_kham,
          lh.ghi_chu AS ly_do_kham,
          NULL AS trieu_chung,
          NULL AS chan_doan_so_bo,
          NULL AS chan_doan_cuoi,
          lh.ghi_chu AS ghi_chu_bac_si,
          lh.trang_thai,
          lh.thoi_gian_hen AS tao_luc,
          lh.thoi_gian_hen AS cap_nhat_luc,
          lh.ma_benh_nhan,
          ca.ma_bac_si,
          bn.ten_benh_nhan,
          bn.so_dien_thoai,
          bn.email,
          bn.gioi_tinh,
          bn.ngay_sinh
        FROM LICH_HEN lh
        LEFT JOIN BENH_NHAN bn ON lh.ma_benh_nhan = bn.ma_benh_nhan
        LEFT JOIN CA_BAC_SI ca ON lh.ma_ca = ca.ma_ca
        LEFT JOIN BAC_SI bs ON ca.ma_bac_si = bs.ma_bac_si
        WHERE bs.ma_bac_si = @ma_bac_si
          AND lh.trang_thai NOT IN ('cancelled', 'huy', 'đã hủy')
        ORDER BY lh.thoi_gian_hen DESC
      `);
    
    // 3. Kết hợp và format dữ liệu
    const allRecords = [];
    
    // Thêm hồ sơ khám từ HO_SO_KHAM
    hoSoResult.recordset.forEach(record => {
      allRecords.push({
        ma_ho_so: record.ma_ho_so,
        ngay_kham: record.ngay_kham,
        ly_do_kham: record.ly_do_kham,
        trieu_chung: record.trieu_chung,
        chan_doan_so_bo: record.chan_doan_so_bo,
        chan_doan_cuoi: record.chan_doan_cuoi,
        ghi_chu_bac_si: record.ghi_chu_bac_si,
        trang_thai: record.trang_thai || 'in_progress',
        tao_luc: record.tao_luc,
        cap_nhat_luc: record.cap_nhat_luc,
        ten_benh_nhan: record.ten_benh_nhan,
        so_dien_thoai: record.so_dien_thoai,
        email: record.email,
        gioi_tinh: record.gioi_tinh,
        ngay_sinh: record.ngay_sinh,
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
        source: 'ho_so_kham'
      });
    });
    
    // Thêm lịch hẹn từ LICH_HEN
    lichHenResult.recordset.forEach(record => {
      allRecords.push({
        ma_ho_so: record.ma_ho_so || record.ma_lich_hen || `lich-hen-${record.ma_benh_nhan}`, // Dùng ma_lich_hen làm ma_ho_so tạm thời
        ma_lich_hen: record.ma_lich_hen, // Lưu ma_lich_hen thực tế
        ngay_kham: record.ngay_kham,
        ly_do_kham: record.ly_do_kham || 'Đặt lịch khám',
        trieu_chung: record.trieu_chung || null,
        chan_doan_so_bo: record.chan_doan_so_bo || null,
        chan_doan_cuoi: record.chan_doan_cuoi || null,
        ghi_chu_bac_si: record.ghi_chu_bac_si || record.ly_do_kham || null,
        trang_thai: record.trang_thai || 'pending',
        tao_luc: record.tao_luc,
        cap_nhat_luc: record.cap_nhat_luc,
        ten_benh_nhan: record.ten_benh_nhan,
        so_dien_thoai: record.so_dien_thoai,
        email: record.email,
        gioi_tinh: record.gioi_tinh,
        ngay_sinh: record.ngay_sinh,
        source: 'lich_hen'
      });
    });
    
    // Sắp xếp theo ngày khám (mới nhất trước)
    allRecords.sort((a, b) => {
      const dateA = new Date(a.ngay_kham || a.tao_luc);
      const dateB = new Date(b.ngay_kham || b.tao_luc);
      return dateB.getTime() - dateA.getTime();
    });
    
    console.log(`✅ Found ${allRecords.length} records for doctor ${doctorUsername} (${hoSoResult.recordset.length} from HO_SO_KHAM, ${lichHenResult.recordset.length} from LICH_HEN)`);
    
    res.json({ 
      success: true, 
      data: allRecords,
      count: allRecords.length
    });
  } catch (err) {
    console.error('❌ SQL ho-so-kham error:', err.message);
    console.error('Error stack:', err.stack);
    res.status(500).json({ 
      success: false, 
      message: err.message || 'Lỗi khi lấy hồ sơ khám'
    });
  }
});

// GET /api/doctor/appointments-sql - lịch hẹn từ SQL (LICH_HEN + BENH_NHAN + CA_BAC_SI)
// Lấy toàn bộ lịch hẹn (không lọc theo bác sĩ)
router.get('/appointments-sql', protect, async (req, res) => {
  try {
    const pool = await poolPromise;
    
    // Lấy toàn bộ lịch hẹn (không lọc theo bác sĩ)
    const result = await pool.request()
      .query(`
        SELECT 
          lh.ma_lich_hen,
          lh.thoi_gian_hen,
          lh.trang_thai,
          lh.ma_ca,
          lh.ma_benh_nhan,
          lh.ghi_chu,
          bn.ten_benh_nhan,
          bn.so_dien_thoai,
          bn.email,
          bn.gioi_tinh,
          bn.ngay_sinh,
          ca.ma_bac_si,
          ca.bat_dau,
          ca.ket_thuc,
          bs.ten_bac_si
        FROM LICH_HEN lh
        LEFT JOIN BENH_NHAN bn ON lh.ma_benh_nhan = bn.ma_benh_nhan
        LEFT JOIN CA_BAC_SI ca ON lh.ma_ca = ca.ma_ca
        LEFT JOIN BAC_SI bs ON ca.ma_bac_si = bs.ma_bac_si
        WHERE lh.trang_thai NOT IN ('cancelled', 'huy', 'đã hủy')
        ORDER BY lh.thoi_gian_hen DESC
      `);
    
    console.log(`✅ Found ${result.recordset.length} appointments (all doctors)`);
    
    res.json({ 
      success: true, 
      data: result.recordset,
      count: result.recordset.length
    });
  } catch (err) {
    console.error('❌ SQL appointments error:', err.message);
    console.error('Error stack:', err.stack);
    res.status(500).json({ 
      success: false, 
      message: err.message || 'Lỗi khi lấy lịch hẹn'
    });
  }
});

// POST /api/doctor/ho-so-kham - Tạo hồ sơ khám từ lịch hẹn
router.post('/ho-so-kham', protect, async (req, res) => {
  try {
    const { 
      ma_lich_hen, 
      ly_do_kham, 
      trieu_chung, 
      chan_doan_so_bo, 
      chan_doan_cuoi, 
      ghi_chu_bac_si, 
      trang_thai 
    } = req.body;

    if (!ma_lich_hen) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu mã lịch hẹn'
      });
    }

    const username = req.user?.username;
    const userId = req.user?.id;
    
    if (!username && !userId) {
      return res.status(401).json({
        success: false,
        message: 'Không xác định được bác sĩ'
      });
    }

    const pool = await poolPromise;
    const TABLE = process.env.SQL_TABLE_USERS || 'USERS_AUTH';
    
    // 1. Kiểm tra lịch hẹn có tồn tại và thuộc về bác sĩ này không
    const lichHenCheck = await pool.request()
      .input('ma_lich_hen', ma_lich_hen)
      .input('ma_bac_si', username || userId)
      .query(`
        SELECT 
          lh.ma_lich_hen,
          lh.thoi_gian_hen,
          lh.ghi_chu AS ghi_chu_lich_hen,
          lh.ma_benh_nhan,
          lh.ma_ca,
          ca.ma_bac_si,
          bs.ma_bac_si AS ma_bac_si_confirm
        FROM LICH_HEN lh
        LEFT JOIN CA_BAC_SI ca ON lh.ma_ca = ca.ma_ca
        LEFT JOIN BAC_SI bs ON ca.ma_bac_si = bs.ma_bac_si
        WHERE lh.ma_lich_hen = @ma_lich_hen
          AND bs.ma_bac_si = @ma_bac_si
      `);

    if (lichHenCheck.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy lịch hẹn hoặc lịch hẹn không thuộc về bác sĩ này'
      });
    }

    const lichHen = lichHenCheck.recordset[0];

    // 2. Kiểm tra xem đã có hồ sơ khám cho lịch hẹn này chưa
    const existingHoSo = await pool.request()
      .input('ma_lich_hen', ma_lich_hen)
      .query(`
        SELECT TOP 1 ma_ho_so 
        FROM HO_SO_KHAM 
        WHERE ma_lich_hen = @ma_lich_hen
      `);

    if (existingHoSo.recordset.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Đã có hồ sơ khám cho lịch hẹn này. Vui lòng cập nhật hồ sơ hiện có.'
      });
    }

    // 3. Tạo hồ sơ khám mới
    const maHoSo = uuidv4();
    const ngayKham = new Date(lichHen.thoi_gian_hen);
    
    await pool.request()
      .input('ma_ho_so', maHoSo)
      .input('ngay_kham', ngayKham.toISOString().split('T')[0]) // DATE format
      .input('ly_do_kham', ly_do_kham || lichHen.ghi_chu_lich_hen || 'Khám bệnh')
      .input('trieu_chung', trieu_chung || null)
      .input('chan_doan_so_bo', chan_doan_so_bo || null)
      .input('chan_doan_cuoi', chan_doan_cuoi || null)
      .input('ghi_chu_bac_si', ghi_chu_bac_si || null)
      .input('trang_thai', trang_thai || 'in_progress')
      .input('ma_lich_hen', ma_lich_hen)
      .input('tao_luc', new Date())
      .query(`
        INSERT INTO HO_SO_KHAM (
          ma_ho_so, 
          ngay_kham, 
          ly_do_kham, 
          trieu_chung, 
          chan_doan_so_bo, 
          chan_doan_cuoi, 
          ghi_chu_bac_si, 
          trang_thai, 
          ma_lich_hen, 
          tao_luc
        )
        VALUES (
          @ma_ho_so,
          @ngay_kham,
          @ly_do_kham,
          @trieu_chung,
          @chan_doan_so_bo,
          @chan_doan_cuoi,
          @ghi_chu_bac_si,
          @trang_thai,
          @ma_lich_hen,
          @tao_luc
        )
      `);

    // 4. Cập nhật trạng thái lịch hẹn thành 'confirmed' hoặc 'completed'
    await pool.request()
      .input('ma_lich_hen', ma_lich_hen)
      .input('trang_thai', trang_thai === 'completed' ? 'completed' : 'confirmed')
      .query(`
        UPDATE LICH_HEN
        SET trang_thai = @trang_thai
        WHERE ma_lich_hen = @ma_lich_hen
      `);

    // 5. Lấy thông tin hồ sơ vừa tạo
    const hoSoResult = await pool.request()
      .input('ma_ho_so', maHoSo)
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
          hs.ma_lich_hen,
          hs.tao_luc,
          bn.ten_benh_nhan,
          bn.so_dien_thoai,
          bn.email
        FROM HO_SO_KHAM hs
        LEFT JOIN LICH_HEN lh ON hs.ma_lich_hen = lh.ma_lich_hen
        LEFT JOIN BENH_NHAN bn ON lh.ma_benh_nhan = bn.ma_benh_nhan
        WHERE hs.ma_ho_so = @ma_ho_so
      `);

    console.log(`✅ Created medical record: ${maHoSo} from appointment: ${ma_lich_hen}`);

    res.status(201).json({
      success: true,
      message: 'Tạo hồ sơ khám thành công!',
      data: hoSoResult.recordset[0]
    });
  } catch (err) {
    console.error('❌ Create ho-so-kham error:', err.message);
    console.error('Error stack:', err.stack);
    res.status(500).json({
      success: false,
      message: err.message || 'Lỗi khi tạo hồ sơ khám'
    });
  }
});

// GET /api/doctor/ho-so-kham/by-lich-hen/:ma_lich_hen - Lấy chi tiết hồ sơ khám theo mã lịch hẹn
router.get('/ho-so-kham/by-lich-hen/:ma_lich_hen', protect, async (req, res) => {
  try {
    const { ma_lich_hen } = req.params;
    
    if (!ma_lich_hen) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu mã lịch hẹn'
      });
    }

    const pool = await poolPromise;
    
    // 1. Tìm hồ sơ khám từ HO_SO_KHAM (nếu đã tạo) với sinh hiệu
    const hoSoResult = await pool.request()
      .input('ma_lich_hen', ma_lich_hen)
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
          lh.ghi_chu as ghi_chu_lich_hen,
          bn.ten_benh_nhan,
          bn.so_dien_thoai,
          bn.email,
          bn.gioi_tinh,
          bn.ngay_sinh,
          bn.dia_chi,
          ca.ma_bac_si,
          ca.bat_dau,
          ca.ket_thuc,
          bs.ten_bac_si,
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
        LEFT JOIN BAC_SI bs ON ca.ma_bac_si = bs.ma_bac_si
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
        WHERE hs.ma_lich_hen = @ma_lich_hen
      `);
    
    // 2. Nếu chưa có hồ sơ khám, lấy thông tin từ lịch hẹn
    if (hoSoResult.recordset.length === 0) {
      const lichHenResult = await pool.request()
        .input('ma_lich_hen', ma_lich_hen)
        .query(`
          SELECT 
            lh.ma_lich_hen,
            lh.thoi_gian_hen,
            lh.trang_thai,
            lh.ghi_chu,
            lh.ma_benh_nhan,
            lh.ma_ca,
            bn.ten_benh_nhan,
            bn.so_dien_thoai,
            bn.email,
            bn.gioi_tinh,
            bn.ngay_sinh,
            bn.dia_chi,
            ca.ma_bac_si,
            ca.bat_dau,
            ca.ket_thuc,
            bs.ten_bac_si
          FROM LICH_HEN lh
          LEFT JOIN BENH_NHAN bn ON lh.ma_benh_nhan = bn.ma_benh_nhan
          LEFT JOIN CA_BAC_SI ca ON lh.ma_ca = ca.ma_ca
          LEFT JOIN BAC_SI bs ON ca.ma_bac_si = bs.ma_bac_si
          WHERE lh.ma_lich_hen = @ma_lich_hen
        `);
      
      if (lichHenResult.recordset.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy lịch hẹn'
        });
      }
      
      const lichHen = lichHenResult.recordset[0];
      return res.json({
        success: true,
        data: {
          ma_lich_hen: lichHen.ma_lich_hen,
          ngay_kham: lichHen.thoi_gian_hen,
          ly_do_kham: lichHen.ghi_chu || 'Đặt lịch khám',
          trieu_chung: null,
          chan_doan_so_bo: null,
          chan_doan_cuoi: null,
          ghi_chu_bac_si: lichHen.ghi_chu || null,
          trang_thai: lichHen.trang_thai || 'pending',
          ten_benh_nhan: lichHen.ten_benh_nhan,
          so_dien_thoai: lichHen.so_dien_thoai,
          email: lichHen.email,
          gioi_tinh: lichHen.gioi_tinh,
          ngay_sinh: lichHen.ngay_sinh,
          dia_chi: lichHen.dia_chi,
          ten_bac_si: lichHen.ten_bac_si,
          ma_bac_si: lichHen.ma_bac_si,
          bat_dau: lichHen.bat_dau,
          ket_thuc: lichHen.ket_thuc,
          source: 'lich_hen',
          has_ho_so: false
        }
      });
    }
    
    // 3. Trả về hồ sơ khám đã có
    const hoSo = hoSoResult.recordset[0];
    return res.json({
      success: true,
      data: {
        ma_ho_so: hoSo.ma_ho_so,
        ma_lich_hen: hoSo.ma_lich_hen,
        ngay_kham: hoSo.ngay_kham,
        ly_do_kham: hoSo.ly_do_kham,
        trieu_chung: hoSo.trieu_chung,
        chan_doan_so_bo: hoSo.chan_doan_so_bo,
        chan_doan_cuoi: hoSo.chan_doan_cuoi,
        ghi_chu_bac_si: hoSo.ghi_chu_bac_si,
        trang_thai: hoSo.trang_thai,
        tao_luc: hoSo.tao_luc,
        cap_nhat_luc: hoSo.cap_nhat_luc,
        ten_benh_nhan: hoSo.ten_benh_nhan,
        so_dien_thoai: hoSo.so_dien_thoai,
        email: hoSo.email,
        gioi_tinh: hoSo.gioi_tinh,
        ngay_sinh: hoSo.ngay_sinh,
        dia_chi: hoSo.dia_chi,
        ten_bac_si: hoSo.ten_bac_si,
        ma_bac_si: hoSo.ma_bac_si,
        bat_dau: hoSo.bat_dau,
        ket_thuc: hoSo.ket_thuc,
        thoi_gian_hen: hoSo.thoi_gian_hen,
        sinh_hieu: hoSo.ma_sinh_hieu ? {
          ma_sinh_hieu: hoSo.ma_sinh_hieu,
          do_luc: hoSo.do_luc,
          chieu_cao_cm: hoSo.chieu_cao_cm,
          can_nang_kg: hoSo.can_nang_kg,
          nhiet_do_c: hoSo.nhiet_do_c,
          mach_lan_phut: hoSo.mach_lan_phut,
          huyet_ap_tam_thu: hoSo.huyet_ap_tam_thu,
          huyet_ap_tam_truong: hoSo.huyet_ap_tam_truong,
          spo2_phan_tram: hoSo.spo2_phan_tram,
          ma_y_ta: hoSo.ma_y_ta_do_sinh_hieu,
        } : null,
        source: 'ho_so_kham',
        has_ho_so: true
      }
    });
  } catch (err) {
    console.error('❌ SQL get ho-so-kham by lich-hen error:', err.message);
    console.error('Error stack:', err.stack);
    res.status(500).json({
      success: false,
      message: err.message || 'Lỗi khi lấy hồ sơ khám'
    });
  }
});

// PUT /api/doctor/ho-so-kham/:id - cập nhật trạng thái / ghi chú bác sĩ
router.put('/ho-so-kham/:id', protect, async (req, res) => {
  const { id } = req.params;
  const { trang_thai, ghi_chu_bac_si, chan_doan_so_bo, chan_doan_cuoi, trieu_chung } = req.body || {};

  if (!id) {
    return res.status(400).json({ success: false, message: 'Thiếu mã hồ sơ' });
  }

  try {
    const pool = await poolPromise;
    const request = pool.request();
    request.input('ma_ho_so', id);
    
    // Build dynamic UPDATE query
    let updateFields = [];
    if (trang_thai) {
      request.input('trang_thai', trang_thai);
      updateFields.push('trang_thai = @trang_thai');
    }
    if (ghi_chu_bac_si !== undefined) {
      request.input('ghi_chu_bac_si', ghi_chu_bac_si || null);
      updateFields.push('ghi_chu_bac_si = @ghi_chu_bac_si');
    }
    if (chan_doan_so_bo !== undefined) {
      request.input('chan_doan_so_bo', chan_doan_so_bo || null);
      updateFields.push('chan_doan_so_bo = @chan_doan_so_bo');
    }
    if (chan_doan_cuoi !== undefined) {
      request.input('chan_doan_cuoi', chan_doan_cuoi || null);
      updateFields.push('chan_doan_cuoi = @chan_doan_cuoi');
    }
    if (trieu_chung !== undefined) {
      request.input('trieu_chung', trieu_chung || null);
      updateFields.push('trieu_chung = @trieu_chung');
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ success: false, message: 'Không có trường nào để cập nhật' });
    }

    updateFields.push('cap_nhat_luc = SYSUTCDATETIME()');

    const query = `
      UPDATE HO_SO_KHAM
      SET ${updateFields.join(', ')}
      WHERE ma_ho_so = @ma_ho_so;
      SELECT @@ROWCOUNT as affected;
    `;

    const result = await request.query(query);

    const affected = result.recordset?.[0]?.affected || 0;
    if (!affected) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ' });
    }

    res.json({ success: true, message: 'Cập nhật thành công', affected });
  } catch (err) {
    console.error('❌ SQL update ho-so-kham error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== DOCTOR SCHEDULE ROUTES (CA_BAC_SI) ====================

// Helper function: Lấy hoặc tạo ma_bac_si từ username của bác sĩ
async function getOrCreateMaBacSi(pool, username, userInfo) {
  // Thử tìm trong bảng BAC_SI trước
  const bacSiResult = await pool
    .request()
    .input('username', username)
    .query('SELECT TOP 1 ma_bac_si FROM BAC_SI WHERE ma_bac_si = @username');
  
  if (bacSiResult.recordset.length > 0) {
    return bacSiResult.recordset[0].ma_bac_si;
  }
  
  // Nếu không có trong BAC_SI, tạo mới record trong BAC_SI
  // Lấy thông tin từ USERS_AUTH
  const userResult = await pool
    .request()
    .input('username', username)
    .query(`
      SELECT TOP 1 
        username, email, full_name, phone, address, specialization, department, license_number
      FROM USERS_AUTH 
      WHERE username = @username AND role = 'doctor'
    `);
  
  if (userResult.recordset.length === 0) {
    throw new Error('Không tìm thấy thông tin bác sĩ trong hệ thống');
  }
  
  const user = userResult.recordset[0];
  const ma_bac_si = username; // Dùng username làm ma_bac_si
  
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
      console.log(`⚠️  Không tìm thấy khoa cho bác sĩ ${username}, sử dụng khoa mặc định: ${ma_khoa}`);
    } else {
      // Nếu không có khoa nào trong hệ thống, throw error
      throw new Error('Hệ thống chưa có khoa nào. Vui lòng tạo khoa trước khi đăng ký ca làm việc.');
    }
  }
  
  // Tạo record trong BAC_SI
  await pool
    .request()
    .input('ma_bac_si', ma_bac_si)
    .input('ma_khoa', ma_khoa)
    .input('ten_bac_si', user.full_name || username)
    .input('chuyen_khoa', user.specialization || null)
    .input('sdt', user.phone || null)
    .input('dia_chi', user.address || null)
    .input('email', user.email || null)
    .input('so_chung_chi_hanh_nghe', user.license_number || null)
    .query(`
      INSERT INTO BAC_SI (ma_bac_si, ma_khoa, ten_bac_si, chuyen_khoa, sdt, dia_chi, email, so_chung_chi_hanh_nghe)
      VALUES (@ma_bac_si, @ma_khoa, @ten_bac_si, @chuyen_khoa, @sdt, @dia_chi, @email, @so_chung_chi_hanh_nghe)
    `);
  
  console.log(`✅ Created BAC_SI record for doctor: ${username}`);
  return ma_bac_si;
}

// GET /api/doctor/schedule - Lấy danh sách ca làm việc của bác sĩ hiện tại
router.get('/schedule', protect, async (req, res) => {
  try {
    const doctorUsername = req.user.username;
    const pool = await poolPromise;
    const ma_bac_si = await getOrCreateMaBacSi(pool, doctorUsername, req.user);
    
    const result = await pool
      .request()
      .input('ma_bac_si', ma_bac_si)
      .query(`
        SELECT 
          ma_ca,
          bat_dau,
          ket_thuc,
          suc_chua,
          trang_thai,
          ma_bac_si
        FROM CA_BAC_SI
        WHERE ma_bac_si = @ma_bac_si
        ORDER BY bat_dau DESC
      `);
    
    res.json({ 
      success: true, 
      data: result.recordset,
      count: result.recordset.length
    });
  } catch (err) {
    console.error('❌ SQL get schedule error:', err.message);
    res.status(500).json({ 
      success: false, 
      message: err.message || 'Lỗi khi lấy danh sách ca làm việc'
    });
  }
});

// POST /api/doctor/schedule - Tạo ca làm việc mới
router.post('/schedule', protect, async (req, res) => {
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
    
    const doctorUsername = req.user.username;
    const pool = await poolPromise;
    const ma_bac_si = await getOrCreateMaBacSi(pool, doctorUsername, req.user);
    const ma_ca = uuidv4();
    
    await pool
      .request()
      .input('ma_ca', ma_ca)
      .input('bat_dau', new Date(bat_dau))
      .input('ket_thuc', new Date(ket_thuc))
      .input('suc_chua', suc_chua || null)
      .input('trang_thai', trang_thai || 'active')
      .input('ma_bac_si', ma_bac_si)
      .query(`
        INSERT INTO CA_BAC_SI (ma_ca, bat_dau, ket_thuc, suc_chua, trang_thai, ma_bac_si)
        VALUES (@ma_ca, @bat_dau, @ket_thuc, @suc_chua, @trang_thai, @ma_bac_si)
      `);
    
    console.log(`✅ Created schedule for doctor ${doctorUsername}: ${ma_ca}`);
    
    res.status(201).json({
      success: true,
      message: 'Đăng ký ca làm việc thành công',
      data: { ma_ca, bat_dau, ket_thuc, suc_chua, trang_thai, ma_bac_si }
    });
  } catch (err) {
    console.error('❌ SQL create schedule error:', err.message);
    res.status(500).json({
      success: false,
      message: err.message || 'Lỗi khi đăng ký ca làm việc'
    });
  }
});

// PUT /api/doctor/schedule/:id - Cập nhật ca làm việc
router.put('/schedule/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { bat_dau, ket_thuc, suc_chua, trang_thai } = req.body;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu mã ca làm việc'
      });
    }
    
    const doctorUsername = req.user.username;
    const pool = await poolPromise;
    const ma_bac_si = await getOrCreateMaBacSi(pool, doctorUsername, req.user);
    
    // Kiểm tra ca làm việc có thuộc về bác sĩ này không
    const checkResult = await pool
      .request()
      .input('ma_ca', id)
      .input('ma_bac_si', ma_bac_si)
      .query('SELECT TOP 1 ma_ca FROM CA_BAC_SI WHERE ma_ca = @ma_ca AND ma_bac_si = @ma_bac_si');
    
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
      UPDATE CA_BAC_SI
      SET ${updates.join(', ')}
      WHERE ma_ca = @ma_ca
    `);
    
    res.json({
      success: true,
      message: 'Cập nhật ca làm việc thành công'
    });
  } catch (err) {
    console.error('❌ SQL update schedule error:', err.message);
    res.status(500).json({
      success: false,
      message: err.message || 'Lỗi khi cập nhật ca làm việc'
    });
  }
});

// DELETE /api/doctor/schedule/:id - Xóa ca làm việc
router.delete('/schedule/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu mã ca làm việc'
      });
    }
    
    const doctorUsername = req.user.username;
    const pool = await poolPromise;
    const ma_bac_si = await getOrCreateMaBacSi(pool, doctorUsername, req.user);
    
    // Kiểm tra ca làm việc có thuộc về bác sĩ này không
    const checkResult = await pool
      .request()
      .input('ma_ca', id)
      .input('ma_bac_si', ma_bac_si)
      .query('SELECT TOP 1 ma_ca FROM CA_BAC_SI WHERE ma_ca = @ma_ca AND ma_bac_si = @ma_bac_si');
    
    if (checkResult.recordset.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xóa ca làm việc này'
      });
    }
    
    // Kiểm tra xem có lịch hẹn nào đang sử dụng ca này không
    const lichHenCheck = await pool
      .request()
      .input('ma_ca', id)
      .query('SELECT TOP 1 ma_lich_hen FROM LICH_HEN WHERE ma_ca = @ma_ca');
    
    if (lichHenCheck.recordset.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Không thể xóa ca làm việc vì đã có lịch hẹn sử dụng ca này'
      });
    }
    
    await pool
      .request()
      .input('ma_ca', id)
      .query('DELETE FROM CA_BAC_SI WHERE ma_ca = @ma_ca');
    
    res.json({
      success: true,
      message: 'Xóa ca làm việc thành công'
    });
  } catch (err) {
    console.error('❌ SQL delete schedule error:', err.message);
    res.status(500).json({
      success: false,
      message: err.message || 'Lỗi khi xóa ca làm việc'
    });
  }
});

module.exports = router;

