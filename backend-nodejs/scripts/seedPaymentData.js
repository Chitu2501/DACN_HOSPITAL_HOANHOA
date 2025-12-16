const { poolPromise } = require('../database/db-config');

/**
 * Seed dữ liệu cho bảng TRANG_THAI_THANH_TOAN và PHUONG_THUC_THANH_TOAN
 * Chạy: node scripts/seedPaymentData.js
 */

async function seed() {
  console.log('⏳ Đang seed dữ liệu thanh toán...');
  const pool = await poolPromise;

  try {
    // 1. Seed TRANG_THAI_THANH_TOAN
    console.log('📝 Đang thêm dữ liệu vào TRANG_THAI_THANH_TOAN...');
    
    const trangThaiData = [
      { MaTrangThaiTT: 'PENDING', TenTT: 'Chờ thanh toán' },
      { MaTrangThaiTT: 'PAID', TenTT: 'Đã thanh toán' },
      { MaTrangThaiTT: 'FAILED', TenTT: 'Thanh toán thất bại' },
      { MaTrangThaiTT: 'CANCELLED', TenTT: 'Đã hủy' },
    ];

    for (const item of trangThaiData) {
      try {
        await pool.request()
          .input('MaTrangThaiTT', item.MaTrangThaiTT)
          .input('TenTT', item.TenTT)
          .query(`
            IF NOT EXISTS (SELECT 1 FROM TRANG_THAI_THANH_TOAN WHERE MaTrangThaiTT = @MaTrangThaiTT)
            BEGIN
              INSERT INTO TRANG_THAI_THANH_TOAN (MaTrangThaiTT, TenTT)
              VALUES (@MaTrangThaiTT, @TenTT)
            END
          `);
        console.log(`✅ Đã thêm trạng thái: ${item.MaTrangThaiTT} - ${item.TenTT}`);
      } catch (err) {
        console.log(`⚠️ Trạng thái ${item.MaTrangThaiTT} đã tồn tại hoặc có lỗi: ${err.message}`);
      }
    }

    // 2. Seed PHUONG_THUC_THANH_TOAN
    console.log('📝 Đang thêm dữ liệu vào PHUONG_THUC_THANH_TOAN...');
    
    const phuongThucData = [
      { MaPTTT: 'MOMO', TenPTTT: 'Ví MoMo' },
      { MaPTTT: 'CASH', TenPTTT: 'Tiền mặt' },
      { MaPTTT: 'CARD', TenPTTT: 'Thẻ tín dụng/Ghi nợ' },
      { MaPTTT: 'BANK', TenPTTT: 'Chuyển khoản ngân hàng' },
    ];

    for (const item of phuongThucData) {
      try {
        await pool.request()
          .input('MaPTTT', item.MaPTTT)
          .input('TenPTTT', item.TenPTTT)
          .query(`
            IF NOT EXISTS (SELECT 1 FROM PHUONG_THUC_THANH_TOAN WHERE MaPTTT = @MaPTTT)
            BEGIN
              INSERT INTO PHUONG_THUC_THANH_TOAN (MaPTTT, TenPTTT)
              VALUES (@MaPTTT, @TenPTTT)
            END
          `);
        console.log(`✅ Đã thêm phương thức: ${item.MaPTTT} - ${item.TenPTTT}`);
      } catch (err) {
        console.log(`⚠️ Phương thức ${item.MaPTTT} đã tồn tại hoặc có lỗi: ${err.message}`);
      }
    }

    console.log('🎉 Hoàn tất seed dữ liệu thanh toán!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed lỗi:', err.message);
    console.error('Error stack:', err.stack);
    process.exit(1);
  }
}

seed();
