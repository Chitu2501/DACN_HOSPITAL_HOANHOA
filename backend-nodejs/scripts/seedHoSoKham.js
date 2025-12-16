require('dotenv').config();
const { poolPromise } = require('../database/db-config');
const { v4: uuidv4 } = require('uuid');

/**
 * Seed bảng HO_SO_KHAM với một vài hồ sơ mẫu.
 * Chạy: node scripts/seedHoSoKham.js
 */

const records = [
  {
    ngay_kham: '2025-12-12',
    ly_do_kham: 'Khám tổng quát',
    trieu_chung: 'Mệt nhẹ, cần kiểm tra định kỳ',
    chan_doan_so_bo: 'Theo dõi huyết áp',
    chan_doan_cuoi: 'Sức khỏe ổn',
    ghi_chu_bac_si: 'Khuyên tập thể dục nhẹ',
    trang_thai: 'in_progress',
  },
  {
    ngay_kham: '2025-12-13',
    ly_do_kham: 'Tái khám',
    trieu_chung: 'Khó thở khi gắng sức',
    chan_doan_so_bo: 'Theo dõi tim mạch',
    chan_doan_cuoi: 'Chờ xét nghiệm',
    ghi_chu_bac_si: 'Hẹn kiểm tra tiếp',
    trang_thai: 'in_progress',
  },
  {
    ngay_kham: '2025-05-12',
    ly_do_kham: 'Kiểm tra định kỳ',
    trieu_chung: 'Không triệu chứng',
    chan_doan_so_bo: 'Khỏe mạnh',
    chan_doan_cuoi: 'Hoàn thành',
    ghi_chu_bac_si: 'Tái khám sau 6 tháng',
    trang_thai: 'completed',
  },
];

async function seed() {
  console.log('⏳ Đang thêm dữ liệu mẫu vào HO_SO_KHAM...');
  const pool = await poolPromise;
  const now = new Date();

  for (const rec of records) {
    const ma_ho_so = uuidv4();
    const query = `
      INSERT INTO HO_SO_KHAM (
        ma_ho_so, ngay_kham, ly_do_kham, trieu_chung, chan_doan_so_bo, chan_doan_cuoi,
        ghi_chu_bac_si, trang_thai, tao_luc, cap_nhat_luc, ma_lich_hen, ma_y_ta, ma_thanh_toan
      )
      VALUES (
        @ma_ho_so, @ngay_kham, @ly_do_kham, @trieu_chung, @chan_doan_so_bo, @chan_doan_cuoi,
        @ghi_chu_bac_si, @trang_thai, @tao_luc, @cap_nhat_luc, NULL, NULL, NULL
      );
    `;
    await pool
      .request()
      .input('ma_ho_so', ma_ho_so)
      .input('ngay_kham', rec.ngay_kham)
      .input('ly_do_kham', rec.ly_do_kham)
      .input('trieu_chung', rec.trieu_chung)
      .input('chan_doan_so_bo', rec.chan_doan_so_bo)
      .input('chan_doan_cuoi', rec.chan_doan_cuoi)
      .input('ghi_chu_bac_si', rec.ghi_chu_bac_si)
      .input('trang_thai', rec.trang_thai)
      .input('tao_luc', now)
      .input('cap_nhat_luc', now)
      .query(query);
    console.log(`✅ Thêm hồ sơ ${ma_ho_so} (${rec.ly_do_kham})`);
  }

  console.log('🎉 Hoàn tất seed HO_SO_KHAM');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed lỗi:', err.message);
  process.exit(1);
});

