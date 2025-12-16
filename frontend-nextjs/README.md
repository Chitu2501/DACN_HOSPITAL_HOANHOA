# Hospital Management System - Frontend

Frontend cho Hệ thống Quản lý Bệnh viện được xây dựng bằng Next.js 14, React, TypeScript và TailwindCSS.

## 🎨 Tính năng

### 🔐 Authentication
- ✅ Trang đăng nhập đẹp mắt với validation
- ✅ Trang đăng ký người dùng mới
- ✅ JWT authentication với auto-redirect
- ✅ State management với Zustand

### 👑 Admin Dashboard
- ✅ **Dashboard tổng quan** với thống kê realtime
  - Biểu đồ phân bố người dùng
  - Thống kê lịch hẹn
  - Danh sách hoạt động gần đây
- ✅ **Quản lý người dùng**
  - CRUD operations đầy đủ
  - Tìm kiếm và lọc
  - Phân quyền (Admin, Doctor, Nurse, Patient)
  - Kích hoạt/vô hiệu hóa tài khoản
  - Pagination
- ✅ **Quản lý lịch hẹn**
  - Xem tất cả lịch hẹn
  - Cập nhật trạng thái
  - Chi tiết lịch hẹn
  - Quản lý thanh toán
- ✅ **Thống kê nâng cao**
  - Biểu đồ doanh thu theo thời gian
  - Thống kê theo bác sĩ
  - Phân tích xu hướng
  - Nhiều loại biểu đồ (Line, Bar, Pie)
- ✅ **Xuất báo cáo Excel**
  - Báo cáo tổng hợp
  - Báo cáo người dùng
  - Báo cáo doanh thu
  - Tùy chỉnh khoảng thời gian

## 🚀 Công nghệ sử dụng

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** TailwindCSS
- **State Management:** Zustand
- **Data Fetching:** TanStack Query (React Query)
- **Forms:** React Hook Form
- **Charts:** Recharts
- **HTTP Client:** Axios
- **Icons:** Lucide React
- **Notifications:** React Hot Toast

## 📦 Cài đặt

### Yêu cầu
- Node.js >= 18.x
- npm hoặc yarn

### Các bước cài đặt

1. **Cài đặt dependencies**
```bash
cd frontend-nextjs
npm install
```

2. **Cấu hình môi trường**
File `.env.local` đã được tạo với cấu hình mặc định:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

3. **Khởi chạy development server**
```bash
npm run dev
```

Ứng dụng sẽ chạy tại: `http://localhost:3000`

4. **Build cho production**
```bash
npm run build
npm start
```

## 📁 Cấu trúc thư mục

```
frontend-nextjs/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── admin/             # Admin pages
│   │   │   ├── dashboard/
│   │   │   ├── users/
│   │   │   ├── appointments/
│   │   │   ├── statistics/
│   │   │   └── reports/
│   │   ├── login/
│   │   ├── register/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/            # React components
│   │   ├── Layout/
│   │   │   └── AdminLayout.tsx
│   │   └── Providers.tsx
│   ├── lib/                   # Utilities
│   │   ├── api.ts            # API client & endpoints
│   │   └── utils.ts          # Helper functions
│   └── store/                # State management
│       └── authStore.ts      # Auth state
├── public/                   # Static files
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── next.config.js
```

## 🎯 Các trang chính

### Public Pages
- `/` - Home (auto-redirect dựa trên role)
- `/login` - Trang đăng nhập
- `/register` - Trang đăng ký

### Admin Pages
- `/admin/dashboard` - Dashboard tổng quan
- `/admin/users` - Quản lý người dùng
- `/admin/appointments` - Quản lý lịch hẹn
- `/admin/statistics` - Thống kê chi tiết
- `/admin/reports` - Xuất báo cáo Excel

## 🎨 UI/UX Features

### Design System
- **Màu sắc:** Professional blue theme
- **Typography:** Inter font family
- **Components:** Custom reusable components
- **Responsive:** Mobile-first design
- **Icons:** Lucide React icons

### User Experience
- Loading states với spinners
- Toast notifications cho feedback
- Form validation realtime
- Smooth transitions & animations
- Error handling graceful
- Pagination cho danh sách dài

## 🔧 Tính năng kỹ thuật

### API Integration
- Axios instance với interceptors
- Automatic token management
- Error handling centralized
- Request/Response typing với TypeScript

### State Management
- Zustand store cho authentication
- Persistent state với localStorage
- React Query cho server state
- Optimistic updates

### Performance
- Code splitting tự động với Next.js
- Image optimization
- Lazy loading components
- Query caching với React Query

## 📊 Biểu đồ & Thống kê

### Loại biểu đồ
- **Line Chart:** Xu hướng doanh thu theo thời gian
- **Bar Chart:** So sánh doanh thu theo bác sĩ
- **Pie Chart:** Phân bố người dùng theo role

### Dữ liệu thống kê
- Tổng số người dùng
- Người dùng hoạt động
- Tổng doanh thu
- Số lịch hẹn
- Phân tích theo bác sĩ
- Thống kê thanh toán

## 📥 Xuất báo cáo

### Các loại báo cáo
1. **Báo cáo tổng hợp:** Bao gồm cả người dùng và doanh thu
2. **Báo cáo người dùng:** Chi tiết về tài khoản
3. **Báo cáo doanh thu:** Chi tiết thu chi

### Định dạng
- File Excel (.xlsx)
- Nhiều sheets
- Formatting chuyên nghiệp
- Tự động tính toán tổng

## 🔒 Bảo mật

- JWT token authentication
- Auto logout khi token expire
- Protected routes
- Role-based access control
- Input sanitization
- XSS protection

## 🚦 Scripts

```bash
# Development
npm run dev          # Start dev server

# Production
npm run build        # Build for production
npm start            # Start production server

# Linting
npm run lint         # Run ESLint
```

## 🌐 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## 📱 Responsive Breakpoints

- **Mobile:** < 768px
- **Tablet:** 768px - 1024px
- **Desktop:** > 1024px

## 🎯 Tài khoản demo

Để test ứng dụng, sử dụng các tài khoản sau:

**Admin:**
- Email: `admin@hospital.com`
- Password: `admin123456`

**Bác sĩ:**
- Email: `bsnguyen@hospital.com`
- Password: `doctor123`

**Bệnh nhân:**
- Email: `patient1@email.com`
- Password: `patient123`

## 🐛 Troubleshooting

### Lỗi kết nối API
Kiểm tra:
1. Backend server đang chạy tại `http://localhost:5000`
2. Biến `NEXT_PUBLIC_API_URL` trong `.env.local`
3. CORS được cấu hình đúng trên backend

### Lỗi build
```bash
# Xóa cache và rebuild
rm -rf .next
npm run build
```

## 📄 License

ISC

## 🤝 Contributing

Đây là project học tập. Mọi đóng góp đều được hoan nghênh!

