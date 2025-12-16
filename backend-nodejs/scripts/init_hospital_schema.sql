-- Khởi tạo schema bệnh viện (SQL Server)
-- Chạy bằng sqlcmd hoặc SSMS:
--   sqlcmd -S . -d HOSPITAL_DACN -i scripts/init_hospital_schema.sql

/* Dọn dẹp (bỏ qua lỗi nếu chưa tồn tại) */
IF OBJECT_ID('DON_THUOC_CHI_TIET', 'U') IS NOT NULL DROP TABLE DON_THUOC_CHI_TIET;
IF OBJECT_ID('DON_THUOC', 'U') IS NOT NULL DROP TABLE DON_THUOC;
IF OBJECT_ID('THUOC', 'U') IS NOT NULL DROP TABLE THUOC;
IF OBJECT_ID('KHO_THUOC', 'U') IS NOT NULL DROP TABLE KHO_THUOC;
IF OBJECT_ID('CT_KQ_XN', 'U') IS NOT NULL DROP TABLE CT_KQ_XN;
IF OBJECT_ID('KET_QUA_XN', 'U') IS NOT NULL DROP TABLE KET_QUA_XN;
IF OBJECT_ID('SINH_HIEU', 'U') IS NOT NULL DROP TABLE SINH_HIEU;
IF OBJECT_ID('HO_SO_KHAM', 'U') IS NOT NULL DROP TABLE HO_SO_KHAM;
IF OBJECT_ID('THANH_TOAN', 'U') IS NOT NULL DROP TABLE THANH_TOAN;
IF OBJECT_ID('PHUONG_THUC_THANH_TOAN', 'U') IS NOT NULL DROP TABLE PHUONG_THUC_THANH_TOAN;
IF OBJECT_ID('TRANG_THAI_THANH_TOAN', 'U') IS NOT NULL DROP TABLE TRANG_THAI_THANH_TOAN;
IF OBJECT_ID('LICH_HEN', 'U') IS NOT NULL DROP TABLE LICH_HEN;
IF OBJECT_ID('CA_BAC_SI', 'U') IS NOT NULL DROP TABLE CA_BAC_SI;
IF OBJECT_ID('BHYT_THE', 'U') IS NOT NULL DROP TABLE BHYT_THE;
IF OBJECT_ID('Y_TA', 'U') IS NOT NULL DROP TABLE Y_TA;
IF OBJECT_ID('BAC_SI', 'U') IS NOT NULL DROP TABLE BAC_SI;
IF OBJECT_ID('BENH_NHAN', 'U') IS NOT NULL DROP TABLE BENH_NHAN;
IF OBJECT_ID('THONG_BAO', 'U') IS NOT NULL DROP TABLE THONG_BAO;
IF OBJECT_ID('KHOA', 'U') IS NOT NULL DROP TABLE KHOA;
GO

-- R1: KHOA
CREATE TABLE KHOA (
  ma_khoa  VARCHAR(20)   NOT NULL PRIMARY KEY,
  ten_khoa NVARCHAR(100) NOT NULL,
  mo_ta    NVARCHAR(255),
  vi_tri   NVARCHAR(100)
);
GO

-- R5: THONG_BAO
CREATE TABLE THONG_BAO (
  ma_thong_bao    VARCHAR(36)   NOT NULL PRIMARY KEY,
  loai            NVARCHAR(50),
  kenh            NVARCHAR(50),
  noi_dung        NVARCHAR(MAX),
  trang_thai      NVARCHAR(50),
  hen_gio_gui     DATETIME2,
  gui_luc         DATETIME2,
  ma_nha_cung_cap NVARCHAR(100)
);
GO

-- R2: BENH_NHAN
CREATE TABLE BENH_NHAN (
  ma_benh_nhan  VARCHAR(36)   NOT NULL PRIMARY KEY,
  ten_benh_nhan NVARCHAR(100) NOT NULL,
  gioi_tinh     NVARCHAR(10),
  ngay_sinh     DATE,
  dia_chi       NVARCHAR(255),
  ma_bhyt       NVARCHAR(50),
  nhom_mau      NVARCHAR(10),
  di_ung        NVARCHAR(255),
  tien_su_benh  NVARCHAR(MAX),
  so_dien_thoai VARCHAR(20),
  email         NVARCHAR(100),
  ma_thong_bao  VARCHAR(36) NULL,
  CONSTRAINT FK_BENHNHAN_THONGBAO FOREIGN KEY (ma_thong_bao) REFERENCES THONG_BAO(ma_thong_bao)
);
GO

-- R3: BAC_SI
CREATE TABLE BAC_SI (
  ma_bac_si               VARCHAR(36)   NOT NULL PRIMARY KEY,
  ma_khoa                 VARCHAR(20)   NOT NULL,
  ten_bac_si              NVARCHAR(100) NOT NULL,
  chuyen_khoa             NVARCHAR(100),
  sdt                     VARCHAR(20),
  dia_chi                 NVARCHAR(255),
  email                   NVARCHAR(100),
  tieu_su                 NVARCHAR(MAX),
  so_chung_chi_hanh_nghe  NVARCHAR(50),
  ma_thong_bao            VARCHAR(36) NULL,
  CONSTRAINT FK_BACSI_KHOA     FOREIGN KEY (ma_khoa)     REFERENCES KHOA(ma_khoa),
  CONSTRAINT FK_BACSI_THONGBAO FOREIGN KEY (ma_thong_bao) REFERENCES THONG_BAO(ma_thong_bao)
);
GO

-- R4: Y_TA
CREATE TABLE Y_TA (
  ma_y_ta       VARCHAR(36)   NOT NULL PRIMARY KEY,
  ho_ten        NVARCHAR(100) NOT NULL,
  email         NVARCHAR(100),
  so_dien_thoai VARCHAR(20),
  trinh_do      NVARCHAR(100),
  kinh_nghiem   NVARCHAR(255),
  trang_thai    NVARCHAR(50),
  ma_khoa       VARCHAR(20)   NOT NULL,
  ma_thong_bao  VARCHAR(36)   NULL,
  CONSTRAINT FK_YTA_KHOA      FOREIGN KEY (ma_khoa)      REFERENCES KHOA(ma_khoa),
  CONSTRAINT FK_YTA_THONGBAO  FOREIGN KEY (ma_thong_bao)  REFERENCES THONG_BAO(ma_thong_bao)
);
GO

-- R6: BHYT_THE
CREATE TABLE BHYT_THE (
  so_the              VARCHAR(30)  NOT NULL PRIMARY KEY,
  ma_noi_dang_ky_kcb  NVARCHAR(100),
  ty_le_chi_tra       DECIMAL(5,2),
  ty_le_dong_chi_tra  DECIMAL(5,2),
  hieu_luc_tu         DATE,
  hieu_luc_den        DATE,
  trang_thai          NVARCHAR(50),
  ma_benh_nhan        VARCHAR(36) NOT NULL,
  CONSTRAINT FK_BHYT_BENHNHAN FOREIGN KEY (ma_benh_nhan) REFERENCES BENH_NHAN(ma_benh_nhan)
);
GO

-- R7: CA_BAC_SI
CREATE TABLE CA_BAC_SI (
  ma_ca      VARCHAR(36) NOT NULL PRIMARY KEY,
  bat_dau    DATETIME2   NOT NULL,
  ket_thuc   DATETIME2   NOT NULL,
  suc_chua   INT,
  trang_thai NVARCHAR(50),
  ma_bac_si  VARCHAR(36) NOT NULL,
  CONSTRAINT FK_CA_BACSI FOREIGN KEY (ma_bac_si) REFERENCES BAC_SI(ma_bac_si)
);
GO

-- R8: LICH_HEN
CREATE TABLE LICH_HEN (
  ma_lich_hen   VARCHAR(36) NOT NULL PRIMARY KEY,
  ma_ca         VARCHAR(36) NOT NULL,
  thoi_gian_hen DATETIME2   NOT NULL,
  trang_thai    NVARCHAR(50),
  ma_checkin    NVARCHAR(50),
  ghi_chu       NVARCHAR(255),
  ma_benh_nhan  VARCHAR(36) NOT NULL,
  CONSTRAINT FK_LICH_CA        FOREIGN KEY (ma_ca)        REFERENCES CA_BAC_SI(ma_ca),
  CONSTRAINT FK_LICH_BENHNHAN  FOREIGN KEY (ma_benh_nhan) REFERENCES BENH_NHAN(ma_benh_nhan)
);
GO

-- R17: TRANG_THAI_THANH_TOAN
CREATE TABLE TRANG_THAI_THANH_TOAN (
  MaTrangThaiTT VARCHAR(20)   NOT NULL PRIMARY KEY,
  TenTT         NVARCHAR(100) NOT NULL
);
GO

-- R18: PHUONG_THUC_THANH_TOAN
CREATE TABLE PHUONG_THUC_THANH_TOAN (
  MaPTTT  VARCHAR(20)   NOT NULL PRIMARY KEY,
  TenPTTT NVARCHAR(100) NOT NULL
);
GO

-- R19: THANH_TOAN
CREATE TABLE THANH_TOAN (
  ma_thanh_toan         VARCHAR(36)  NOT NULL PRIMARY KEY,
  tong_tien_truoc_bhyt  DECIMAL(18,2) NOT NULL,
  ap_dung_bhyt          BIT           NOT NULL,
  so_tien_quy_chi_tra   DECIMAL(18,2),
  so_tien_benh_nhan_tra DECIMAL(18,2),
  cong_thanh_toan       NVARCHAR(50),
  ma_giao_dich          NVARCHAR(100),
  so_hoa_don            NVARCHAR(50),
  trang_thai            NVARCHAR(50),
  tao_luc               DATETIME2     NOT NULL,
  thanh_toan_luc        DATETIME2,
  MaTrangThaiTT         VARCHAR(20),
  MaPTTT                VARCHAR(20),
  CONSTRAINT FK_TT_TRANGTHAI FOREIGN KEY (MaTrangThaiTT) REFERENCES TRANG_THAI_THANH_TOAN(MaTrangThaiTT),
  CONSTRAINT FK_TT_PTTT      FOREIGN KEY (MaPTTT)        REFERENCES PHUONG_THUC_THANH_TOAN(MaPTTT)
);
GO

-- R9: HO_SO_KHAM
CREATE TABLE HO_SO_KHAM (
  ma_ho_so        VARCHAR(36)  NOT NULL PRIMARY KEY,
  ngay_kham       DATE         NOT NULL,
  ly_do_kham      NVARCHAR(255),
  trieu_chung     NVARCHAR(MAX),
  chan_doan_so_bo NVARCHAR(MAX),
  chan_doan_cuoi  NVARCHAR(MAX),
  ghi_chu_bac_si  NVARCHAR(MAX),
  trang_thai      NVARCHAR(50),
  tao_luc         DATETIME2    NOT NULL,
  cap_nhat_luc    DATETIME2,
  ma_lich_hen     VARCHAR(36),
  ma_y_ta         VARCHAR(36),
  ma_thanh_toan   VARCHAR(36),
  CONSTRAINT FK_HS_LICH      FOREIGN KEY (ma_lich_hen)   REFERENCES LICH_HEN(ma_lich_hen),
  CONSTRAINT FK_HS_YTA       FOREIGN KEY (ma_y_ta)       REFERENCES Y_TA(ma_y_ta),
  CONSTRAINT FK_HS_THANHTOAN FOREIGN KEY (ma_thanh_toan) REFERENCES THANH_TOAN(ma_thanh_toan)
);
GO

-- R10: SINH_HIEU
CREATE TABLE SINH_HIEU (
  ma_sinh_hieu        VARCHAR(36) NOT NULL PRIMARY KEY,
  do_luc              DATETIME2   NOT NULL,
  chieu_cao_cm        DECIMAL(5,2),
  can_nang_kg         DECIMAL(5,2),
  nhiet_do_c          DECIMAL(4,1),
  mach_lan_phut       INT,
  huyet_ap_tam_thu    INT,
  huyet_ap_tam_truong INT,
  spo2_phan_tram      INT,
  ma_ho_so            VARCHAR(36) NOT NULL,
  ma_y_ta             VARCHAR(36) NOT NULL,
  CONSTRAINT FK_SH_HOSO FOREIGN KEY (ma_ho_so) REFERENCES HO_SO_KHAM(ma_ho_so),
  CONSTRAINT FK_SH_YTA  FOREIGN KEY (ma_y_ta)  REFERENCES Y_TA(ma_y_ta)
);
GO

-- R11: KET_QUA_XN
CREATE TABLE KET_QUA_XN (
  ma_kq_xn        VARCHAR(36)  NOT NULL PRIMARY KEY,
  tom_tat         NVARCHAR(255),
  tep_dinh_kem_url NVARCHAR(255),
  ket_qua_json    NVARCHAR(MAX),
  xac_nhan_boi    NVARCHAR(100),
  xac_nhan_luc    DATETIME2,
  ma_bac_si       VARCHAR(36),
  CONSTRAINT FK_KQXN_BACSI FOREIGN KEY (ma_bac_si) REFERENCES BAC_SI(ma_bac_si)
);
GO

-- R12: CT_KQ_XN
CREATE TABLE CT_KQ_XN (
  ma_ho_so VARCHAR(36) NOT NULL,
  ma_kq_xn VARCHAR(36) NOT NULL,
  ngay_gio DATETIME2,
  ghi_chu  NVARCHAR(255),
  CONSTRAINT PK_CT_KQ_XN PRIMARY KEY (ma_ho_so, ma_kq_xn),
  CONSTRAINT FK_CTXN_HOSO FOREIGN KEY (ma_ho_so) REFERENCES HO_SO_KHAM(ma_ho_so),
  CONSTRAINT FK_CTXN_KQXN FOREIGN KEY (ma_kq_xn) REFERENCES KET_QUA_XN(ma_kq_xn)
);
GO

-- R16: KHO_THUOC
CREATE TABLE KHO_THUOC (
  ma_kho_thuoc VARCHAR(36)   NOT NULL PRIMARY KEY,
  ten_kho      NVARCHAR(100) NOT NULL,
  don_vi_tinh  NVARCHAR(50),
  duong_dung   NVARCHAR(50),
  gia_niem_yet DECIMAL(18,2),
  ton_kho      INT,
  hoat_dong    BIT NOT NULL
);
GO

-- R15: THUOC
CREATE TABLE THUOC (
  ma_thuoc     VARCHAR(36)   NOT NULL PRIMARY KEY,
  ten_thuoc    NVARCHAR(100) NOT NULL,
  don_vi       NVARCHAR(50),
  gia          DECIMAL(18,2),
  ma_kho_thuoc VARCHAR(36),
  CONSTRAINT FK_THUOC_KHO FOREIGN KEY (ma_kho_thuoc) REFERENCES KHO_THUOC(ma_kho_thuoc)
);
GO

-- R14: DON_THUOC_CHI_TIET hỗ trợ DON_THUOC, nên tạo DON_THUOC trước
-- R13: DON_THUOC
CREATE TABLE DON_THUOC (
  ma_don_thuoc  VARCHAR(36) NOT NULL PRIMARY KEY,
  trang_thai    NVARCHAR(50),
  ky_luc        DATETIME2,
  ghi_chu       NVARCHAR(MAX),
  ma_ho_so      VARCHAR(36) NOT NULL,
  ma_thanh_toan VARCHAR(36),
  CONSTRAINT FK_DONTHUOC_HOSO FOREIGN KEY (ma_ho_so)      REFERENCES HO_SO_KHAM(ma_ho_so),
  CONSTRAINT FK_DONTHUOC_TT   FOREIGN KEY (ma_thanh_toan) REFERENCES THANH_TOAN(ma_thanh_toan)
);
GO

-- R14: DON_THUOC_CHI_TIET
CREATE TABLE DON_THUOC_CHI_TIET (
  ma_chi_tiet_don    VARCHAR(36) NOT NULL PRIMARY KEY,
  ma_thuoc           VARCHAR(36) NOT NULL,
  ma_don_thuoc       VARCHAR(36) NOT NULL,
  ham_luong_lieu_dung NVARCHAR(100),
  tan_suat           NVARCHAR(50),
  so_ngay            INT,
  so_luong           INT,
  don_gia            DECIMAL(18,2),
  huong_dan          NVARCHAR(MAX),
  CONSTRAINT FK_CTDT_THUOC    FOREIGN KEY (ma_thuoc)     REFERENCES THUOC(ma_thuoc),
  CONSTRAINT FK_CTDT_DONTHUOC FOREIGN KEY (ma_don_thuoc) REFERENCES DON_THUOC(ma_don_thuoc)
);
GO

PRINT '✅ Tạo schema hoàn tất';

