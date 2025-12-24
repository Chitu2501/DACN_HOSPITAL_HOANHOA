-- Migration script for Doctor Profile Management
-- Adds avatar_url, created_at, updated_at columns to BAC_SI table
-- Ensures KHOA table exists

USE HOSPITAL_DACN;
GO

-- Check if columns exist before adding
IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'BAC_SI' AND COLUMN_NAME = 'avatar_url'
)
BEGIN
    ALTER TABLE BAC_SI
    ADD avatar_url NVARCHAR(500) NULL;
    PRINT '✅ Added avatar_url column to BAC_SI';
END
ELSE
BEGIN
    PRINT '⚠️ Column avatar_url already exists in BAC_SI';
END
GO

IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'BAC_SI' AND COLUMN_NAME = 'created_at'
)
BEGIN
    ALTER TABLE BAC_SI
    ADD created_at DATETIME2 DEFAULT GETDATE();
    PRINT '✅ Added created_at column to BAC_SI';
END
ELSE
BEGIN
    PRINT '⚠️ Column created_at already exists in BAC_SI';
END
GO

IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'BAC_SI' AND COLUMN_NAME = 'updated_at'
)
BEGIN
    ALTER TABLE BAC_SI
    ADD updated_at DATETIME2 NULL;
    PRINT '✅ Added updated_at column to BAC_SI';
END
ELSE
BEGIN
    PRINT '⚠️ Column updated_at already exists in BAC_SI';
END
GO

-- Update existing records to set created_at if NULL
UPDATE BAC_SI
SET created_at = GETDATE()
WHERE created_at IS NULL;
GO

-- Ensure KHOA table exists (minimal structure)
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'KHOA')
BEGIN
    CREATE TABLE KHOA (
        ma_khoa VARCHAR(20) NOT NULL PRIMARY KEY,
        ten_khoa NVARCHAR(100) NOT NULL,
        mo_ta NVARCHAR(255),
        vi_tri NVARCHAR(100)
    );
    PRINT '✅ Created KHOA table';
    
    -- Insert sample departments if table is empty
    IF NOT EXISTS (SELECT 1 FROM KHOA)
    BEGIN
        INSERT INTO KHOA (ma_khoa, ten_khoa) VALUES
        ('KHOA001', N'Khoa Nội'),
        ('KHOA002', N'Khoa Ngoại'),
        ('KHOA003', N'Khoa Tim mạch'),
        ('KHOA004', N'Khoa Nhi'),
        ('KHOA005', N'Khoa Sản');
        PRINT '✅ Inserted sample departments';
    END
END
ELSE
BEGIN
    PRINT '⚠️ KHOA table already exists';
END
GO

PRINT '✅ Migration completed successfully';
GO
