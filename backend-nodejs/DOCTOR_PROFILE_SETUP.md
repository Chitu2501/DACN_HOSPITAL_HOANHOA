# Doctor Profile Management - Setup Guide

## Overview
Complete feature for doctors to view and update their profile information, including avatar upload.

## Database Setup

1. **Run SQL Migration Script**
   ```bash
   sqlcmd -S localhost -d HOSPITAL_DACN -i scripts/migrate_doctor_profile.sql
   ```
   
   Or execute the script in SSMS:
   - Open `backend-nodejs/scripts/migrate_doctor_profile.sql`
   - Execute against `HOSPITAL_DACN` database

2. **Verify Schema Changes**
   The script adds to `BAC_SI` table:
   - `avatar_url NVARCHAR(500)`
   - `created_at DATETIME2`
   - `updated_at DATETIME2`
   
   Ensures `KHOA` table exists for foreign key.

## Backend Setup

1. **Install Dependencies** (if not already installed)
   ```bash
   npm install multer @types/multer
   ```

2. **Configure Environment Variables**
   Copy `.env.example` to `.env` and update:
   ```env
   UPLOADS_BASE_URL=/uploads/avatars
   JWT_SECRET=your_secret_key
   ```

3. **Create Uploads Directory**
   ```bash
   mkdir -p uploads/avatars
   ```

4. **Start Server**
   ```bash
   npm start
   # or
   node server.js
   ```

## API Endpoints

### GET /api/doctor/profile
Get doctor profile by `ma_bac_si` from JWT token.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "ma_bac_si": "BS001",
    "ma_khoa": "KHOA001",
    "ten_bac_si": "Nguyễn Văn A",
    "chuyen_khoa": "Tim mạch",
    "sdt": "0912345678",
    "dia_chi": "123 Đường ABC",
    "email": "bs@hospital.com",
    "tieu_su": "Bác sĩ có 10 năm kinh nghiệm...",
    "so_chung_chi_hanh_nghe": "CHN-001",
    "ma_thong_bao": null,
    "avatar_url": "/uploads/avatars/BS001_1234567890.jpg",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-15T00:00:00Z",
    "ten_khoa": "Khoa Tim mạch"
  }
}
```

### PUT /api/doctor/profile
Update doctor profile.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Body:**
```json
{
  "ten_bac_si": "Nguyễn Văn A",
  "ma_khoa": "KHOA001",
  "chuyen_khoa": "Tim mạch",
  "sdt": "0912345678",
  "dia_chi": "123 Đường ABC",
  "email": "bs@hospital.com",
  "tieu_su": "Tiểu sử...",
  "so_chung_chi_hanh_nghe": "CHN-001",
  "ma_thong_bao": null
}
```

**Validation Rules:**
- `ten_bac_si`: required, not empty
- `ma_khoa`: required
- `email`: valid format (if provided)
- `sdt`: numeric, 9-15 characters (if provided)

### POST /api/doctor/profile/avatar
Upload avatar image.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: multipart/form-data
```

**Body:**
- `avatar`: File (jpg, png, webp, max 2MB)

**Response:**
```json
{
  "success": true,
  "message": "Avatar uploaded successfully",
  "data": {
    "avatar_url": "/uploads/avatars/BS001_1234567890.jpg"
  }
}
```

## Example cURL Commands

### Get Profile
```bash
curl -X GET http://localhost:5000/api/doctor/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Update Profile
```bash
curl -X PUT http://localhost:5000/api/doctor/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ten_bac_si": "Nguyễn Văn A",
    "ma_khoa": "KHOA001",
    "chuyen_khoa": "Tim mạch",
    "sdt": "0912345678",
    "email": "bs@hospital.com"
  }'
```

### Upload Avatar
```bash
curl -X POST http://localhost:5000/api/doctor/profile/avatar \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "avatar=@/path/to/image.jpg"
```

## Frontend Usage

1. **Navigate to Profile Page**
   ```
   http://localhost:3000/doctor/profile
   ```

2. **Features:**
   - View profile information
   - Click "Chỉnh sửa" to edit
   - Click avatar to upload new image
   - Form validation and error handling
   - Loading states and progress indicators

## Security Notes

- All endpoints require JWT authentication
- Only users with `role = 'doctor'` or `role = 'admin'` can access
- File uploads validated: jpg/png/webp only, max 2MB
- SQL queries use parameterized statements (SQL injection prevention)
- `ma_bac_si` is NOT editable (from JWT token)

## Troubleshooting

1. **Routes not found**
   - Ensure TypeScript is compiled or ts-node is configured
   - Check `server.js` route registration

2. **Upload fails**
   - Verify `uploads/avatars` directory exists
   - Check file permissions
   - Verify `UPLOADS_BASE_URL` in `.env`

3. **Database errors**
   - Run migration script
   - Verify `KHOA` table exists
   - Check foreign key constraints

4. **Authentication errors**
   - Verify JWT token is valid
   - Check user role is 'doctor' or 'admin'
   - Ensure token includes `ma_bac_si` or `username`

