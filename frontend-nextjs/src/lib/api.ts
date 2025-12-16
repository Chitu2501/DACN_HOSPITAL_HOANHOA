import axios from 'axios';
import {
  USE_MOCK_DATA,
  mockLogin,
  mockRegister,
  mockUsers,
  mockAppointments,
  mockDashboardStats,
  mockRevenueStats,
  mockAppointmentStats,
} from './mockData';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      // Log token for debugging (only in development)
      if (process.env.NODE_ENV === 'development' && config.url?.includes('/statistics')) {
        console.log('📤 API Request:', {
          url: config.url,
          hasToken: !!token,
          tokenPreview: token.substring(0, 20) + '...'
        });
      }
    } else {
      console.warn('⚠️ No token found for request:', config.url);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      // Only redirect if not already on login/register page and not in patient routes
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
      const isAuthPage = currentPath === '/login' || currentPath === '/register';
      const isPatientRoute = currentPath.startsWith('/patient');
      const isDoctorRoute = currentPath.startsWith('/doctor');
      
      // Don't redirect if:
      // 1. Already on auth pages
      // 2. On patient routes (let PatientLayout handle it)
      // 3. On doctor routes (let DoctorLayout/page handle it)
      // 4. On admin routes (let AdminLayout handle it)
      // 5. Error is from login/register endpoints (let login page handle the error)
      const isAuthEndpoint = error.config?.url?.includes('/auth/login') || 
                             error.config?.url?.includes('/auth/register');
      const isAdminRoute = currentPath.startsWith('/admin');
      
      // Only redirect on 401 if NOT on auth pages and NOT from auth endpoints
      // This prevents redirect loop when login fails
      // Also don't redirect on admin routes - let the page handle the error gracefully
      if (!isAuthPage && !isPatientRoute && !isDoctorRoute && !isAdminRoute && !isAuthEndpoint) {
        console.warn('401 Unauthorized - redirecting to login', {
          path: currentPath,
          url: error.config?.url
        });
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      } else {
        // Log 401 errors but don't redirect for admin/patient/doctor routes
        console.warn('401 Unauthorized (not redirecting)', {
          path: currentPath,
          url: error.config?.url,
          reason: isAuthPage ? 'on auth page' : 
                  isPatientRoute ? 'on patient route' : 
                  isDoctorRoute ? 'on doctor route' : 
                  isAdminRoute ? 'on admin route' : 
                  isAuthEndpoint ? 'auth endpoint' : 'unknown'
        });
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: (email: string, password: string) => {
    if (USE_MOCK_DATA) {
      return mockLogin(email, password) as any;
    }
    return api.post('/auth/login', { email, password });
  },
  
  register: (data: any) => {
    if (USE_MOCK_DATA) {
      return mockRegister(data) as any;
    }
    return api.post('/auth/register', data);
  },
  
  getCurrentUser: () =>
    api.get('/auth/me'),
  
  updateProfile: (data: any) =>
    api.put('/auth/profile', data),
  
  changePassword: (currentPassword: string, newPassword: string) =>
    api.put('/auth/change-password', { currentPassword, newPassword }),
};

// Admin API
export const adminApi = {
  // User Management
  createUser: (data: any) => {
    if (USE_MOCK_DATA) {
      return Promise.resolve({
        data: {
          success: true,
          message: 'User created successfully',
          data: { ...data, _id: Date.now().toString(), createdAt: new Date() },
        },
      });
    }
    return api.post('/admin/users', data);
  },
  
  getAllUsers: () => {
    if (USE_MOCK_DATA) {
      return Promise.resolve({
        data: {
          success: true,
          data: mockUsers,
        },
      });
    }
    return api.get('/admin/users');
  },
  
  getUserById: (id: string) => {
    if (USE_MOCK_DATA) {
      const user = mockUsers.find(u => u._id === id);
      return Promise.resolve({ data: { success: true, data: user } });
    }
    return api.get(`/admin/users/${id}`);
  },
  
  updateUser: (id: string, data: any) => {
    if (USE_MOCK_DATA) {
      return Promise.resolve({
        data: { success: true, message: 'User updated successfully', data },
      });
    }
    return api.put(`/admin/users/${id}`, data);
  },
  
  deleteUser: (id: string) => {
    if (USE_MOCK_DATA) {
      return Promise.resolve({
        data: { success: true, message: 'User deleted successfully' },
      });
    }
    return api.delete(`/admin/users/${id}`);
  },
  
  updateUserRole: (id: string, role: string) => {
    if (USE_MOCK_DATA) {
      return Promise.resolve({
        data: { success: true, message: 'User role updated successfully' },
      });
    }
    return api.put(`/admin/users/${id}/role`, { role });
  },
  
  updateUserStatus: (id: string, isActive: boolean) => {
    if (USE_MOCK_DATA) {
      return Promise.resolve({
        data: { success: true, message: 'User status updated successfully' },
      });
    }
    return api.put(`/admin/users/${id}/status`, { isActive });
  },
  
  getUserStatistics: () => {
    if (USE_MOCK_DATA) {
      return Promise.resolve({
        data: {
          success: true,
          data: mockDashboardStats.users,
        },
      });
    }
    return api.get('/admin/statistics/users');
  },

  // Departments
  getDepartments: () => api.get('/admin/departments'),
  createDepartment: (data: any) => api.post('/admin/departments', data),
  updateDepartment: (id: string, data: any) => api.put(`/admin/departments/${id}`, data),
  deleteDepartment: (id: string) => api.delete(`/admin/departments/${id}`),
};

// Statistics API
export const statisticsApi = {
  getDashboard: (params?: any) => {
    if (USE_MOCK_DATA) {
      return Promise.resolve({
        data: {
          success: true,
          data: mockDashboardStats,
        },
      });
    }
    return api.get('/statistics/dashboard', { params });
  },
  
  getRevenue: (params?: any) => {
    if (USE_MOCK_DATA) {
      return Promise.resolve({
        data: {
          success: true,
          data: mockRevenueStats,
        },
      });
    }
    return api.get('/statistics/revenue', { params });
  },
  
  getAppointments: (params?: any) => {
    if (USE_MOCK_DATA) {
      return Promise.resolve({
        data: {
          success: true,
          data: mockAppointmentStats,
        },
      });
    }
    return api.get('/statistics/appointments', { params });
  },
  
  exportReport: (params?: any) => {
    if (USE_MOCK_DATA) {
      // For mock, we'll just alert the user
      alert('Mock mode: Excel export not available. Connect to real backend to export reports.');
      return Promise.reject(new Error('Mock mode: Export not available'));
    }
    return api.get('/statistics/export', { 
      params,
      responseType: 'blob' 
    });
  },
};

// Patient Profile API
export const patientProfileApi = {
  get: () => {
    if (USE_MOCK_DATA) {
      const mockPatient = {
        id: 1,
        fullName: 'Nguyễn Văn An',
        email: 'nguyenvanan@example.com',
        phone: '0901234567',
        address: '123 Đường ABC, Quận 1, TP.HCM',
        dateOfBirth: '1990-05-15',
        gender: 'male',
        bloodType: 'O+',
        emergencyContact: {
          name: 'Nguyễn Thị Bình',
          phone: '0912345678',
          relationship: 'Vợ'
        },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };
      return Promise.resolve({
        data: {
          success: true,
          data: mockPatient,
        },
      });
    }
    return api.get('/patient/profile');
  },
  
  update: (data: any) => {
    if (USE_MOCK_DATA) {
      return Promise.resolve({
        data: {
          success: true,
          message: 'Cập nhật thông tin thành công',
          data: { ...data, updatedAt: new Date().toISOString() },
        },
      });
    }
    return api.put('/patient/profile', data);
  },
};

// Users API
export const usersApi = {
  getDoctors: (params?: any) =>
    api.get('/users/doctors', { params }),
  
  getNurses: (params?: any) =>
    api.get('/users/nurses', { params }),
  
  getUserById: (id: string) =>
    api.get(`/users/${id}`),
};

// Doctor API
export const doctorApi = {
  // Schedule management (CA_BAC_SI)
  getSchedule: () => api.get('/doctor/schedule'),
  createSchedule: (data: any) => api.post('/doctor/schedule', data),
  updateSchedule: (id: string, data: any) => api.put(`/doctor/schedule/${id}`, data),
  deleteSchedule: (id: string) => api.delete(`/doctor/schedule/${id}`),
  
  // Medical records
  getHoSoKham: () => api.get('/doctor/ho-so-kham'),
  updateHoSoKham: (id: string, data: any) => api.put(`/doctor/ho-so-kham/${id}`, data),
  getAppointments: () => api.get('/doctor/appointments-sql'),
};

// Nurse API
export const nurseApi = {
  getVitals: (params: { ma_lich_hen?: string; ma_ho_so?: string }) =>
    api.get('/nurse/vitals', { params }),
  upsertVitals: (data: any) => api.post('/nurse/vitals', data),
  getHoSoKham: () => api.get('/nurse/ho-so-kham'),
  getHoSoDetail: (id: string) => api.get(`/nurse/ho-so-kham/${id}`),
  getMedications: (params: { ma_lich_hen?: string; ma_ho_so?: string }) =>
    api.get('/nurse/medications', { params }),
  upsertMedications: (data: any) => api.post('/nurse/medications', data),
  // Schedule management
  getSchedule: () => api.get('/nurse/schedule'),
  createSchedule: (data: any) => api.post('/nurse/schedule', data),
  updateSchedule: (id: string, data: any) => api.put(`/nurse/schedule/${id}`, data),
  deleteSchedule: (id: string) => api.delete(`/nurse/schedule/${id}`),
};

// Medical Records API
export const medicalRecordsApi = {
  getAll: (params?: any) => {
    if (USE_MOCK_DATA) {
      const mockRecords = [
        {
          id: 1,
          patientId: 1,
          doctorId: 1,
          appointmentId: 3,
          visitDate: '2024-11-28',
          diagnosis: 'Cao huyết áp giai đoạn 1',
          symptoms: 'Huyết áp cao, đau đầu nhẹ',
          prescription: 'Thuốc hạ huyết áp: 1 viên/ngày, uống buổi sáng',
          notes: 'Bệnh nhân cần theo dõi huyết áp hàng ngày. Tái khám sau 1 tháng.',
          testResults: [
            { testName: 'Đo huyết áp', result: '150/95 mmHg', date: '2024-11-28' },
            { testName: 'Xét nghiệm máu', result: 'Bình thường', date: '2024-11-28' }
          ],
          followUpDate: '2024-12-28',
          status: 'active',
          doctor: {
            id: 1,
            fullName: 'BS. Nguyễn Văn A',
            specialty: 'Tim mạch',
            department: 'Khoa Tim mạch'
          }
        },
        {
          id: 2,
          patientId: 1,
          doctorId: 2,
          visitDate: '2024-11-15',
          diagnosis: 'Tiểu đường type 2',
          symptoms: 'Khát nước nhiều, đi tiểu nhiều',
          prescription: 'Metformin 500mg: 2 viên/ngày, chia 2 lần',
          notes: 'Cần kiểm soát chế độ ăn uống, hạn chế đường. Tái khám sau 2 tuần.',
          testResults: [
            { testName: 'Đường huyết lúc đói', result: '180 mg/dL (cao)', date: '2024-11-15' }
          ],
          followUpDate: '2024-11-29',
          status: 'active',
          doctor: {
            id: 2,
            fullName: 'BS. Trần Thị B',
            specialty: 'Nội tiết',
            department: 'Khoa Nội tiết'
          }
        }
      ];
      
      let filtered = [...mockRecords];
      if (params?.status) {
        filtered = filtered.filter(r => r.status === params.status);
      }
      if (params?.fromDate) {
        filtered = filtered.filter(r => r.visitDate >= params.fromDate);
      }
      if (params?.toDate) {
        filtered = filtered.filter(r => r.visitDate <= params.toDate);
      }
      
      return Promise.resolve({
        data: {
          success: true,
          count: filtered.length,
          data: filtered,
        },
      });
    }
    return api.get('/patient/medical-records', { params });
  },
  
  getById: (id: string) => {
    if (USE_MOCK_DATA) {
      const mockRecord = {
        id: 1,
        patientId: 1,
        doctorId: 1,
        appointmentId: 3,
        visitDate: '2024-11-28',
        diagnosis: 'Cao huyết áp giai đoạn 1',
        symptoms: 'Huyết áp cao, đau đầu nhẹ',
        prescription: 'Thuốc hạ huyết áp: 1 viên/ngày, uống buổi sáng',
        notes: 'Bệnh nhân cần theo dõi huyết áp hàng ngày. Tái khám sau 1 tháng.',
        testResults: [
          { testName: 'Đo huyết áp', result: '150/95 mmHg', date: '2024-11-28' },
          { testName: 'Xét nghiệm máu', result: 'Bình thường', date: '2024-11-28' }
        ],
        followUpDate: '2024-12-28',
        status: 'active',
        doctor: {
          id: 1,
          fullName: 'BS. Nguyễn Văn A',
          specialty: 'Tim mạch',
          department: 'Khoa Tim mạch',
          phone: '0987654321'
        }
      };
      return Promise.resolve({ data: { success: true, data: mockRecord } });
    }
    return api.get(`/patient/medical-records/${id}`);
  },

  getPaymentStatus: (id: string) => {
    return api.get(`/patient/medical-records/${id}/payment-status`);
  },

  pay: (id: string, paymentMethod: string = 'momo') => {
    return api.post(`/patient/medical-records/${id}/pay`, { paymentMethod });
  },
};

// Appointments API
export const appointmentsApi = {
  getAll: (params?: any) => {
    if (USE_MOCK_DATA) {
      let filtered = [...mockAppointments];
      if (params?.status) {
        filtered = filtered.filter(a => a.status === params.status);
      }
      return Promise.resolve({
        data: {
          success: true,
          count: filtered.length,
          data: filtered,
        },
      });
    }
    return api.get('/appointments', { params });
  },
  
  create: (data: any) => {
    if (USE_MOCK_DATA) {
      return Promise.resolve({
        data: {
          success: true,
          message: 'Appointment created successfully',
          data: { ...data, _id: Date.now().toString() },
        },
      });
    }
    return api.post('/appointments', data);
  },
  
  getById: (id: string) => {
    if (USE_MOCK_DATA) {
      const apt = mockAppointments.find(a => a._id === id);
      return Promise.resolve({ data: { success: true, data: apt } });
    }
    return api.get(`/appointments/${id}`);
  },
  
  update: (id: string, data: any) => {
    if (USE_MOCK_DATA) {
      return Promise.resolve({
        data: { success: true, message: 'Appointment updated successfully', data },
      });
    }
    return api.put(`/appointments/${id}`, data);
  },
  
  cancel: (id: string, reason?: string) => {
    if (USE_MOCK_DATA) {
      return Promise.resolve({
        data: { success: true, message: 'Appointment cancelled successfully' },
      });
    }
    return api.delete(`/appointments/${id}`, { data: { reason } });
  },
};

// Patient Payments API - Lấy tất cả thanh toán (cả invoices và medical records)
export const patientPaymentsApi = {
  getAll: (params?: any) => {
    if (USE_MOCK_DATA) {
      // Mock data sẽ được merge với invoices
      return Promise.resolve({
        data: {
          success: true,
          count: 0,
          data: [],
        },
      });
    }
    return api.get('/patient/payments/all', { params });
  },

  // Đồng bộ trạng thái thanh toán theo orderId (fallback khi IPN không cập nhật kịp)
  syncStatus: (orderId: string) => {
    return api.post('/patient/payments/sync-status', { orderId });
  },
};

// Patient Invoices API
export const patientInvoicesApi = {
  getAll: (params?: any) => {
    if (USE_MOCK_DATA) {
      // Mock invoices data
      const mockInvoices = [
        {
          id: 1,
          appointmentId: 1,
          amount: 500000,
          items: [
            { description: 'Phí khám bệnh', quantity: 1, unitPrice: 300000, total: 300000 },
            { description: 'Xét nghiệm máu', quantity: 1, unitPrice: 200000, total: 200000 }
          ],
          status: 'PAID',
          paymentMethod: 'momo',
          paidAt: '2024-11-28T11:30:00Z',
          createdAt: '2024-11-28T11:00:00Z',
          dueDate: '2024-12-05'
        },
        {
          id: 2,
          appointmentId: null,
          amount: 450000,
          items: [
            { description: 'Phí khám bệnh', quantity: 1, unitPrice: 300000, total: 300000 },
            { description: 'Xét nghiệm đường huyết', quantity: 1, unitPrice: 150000, total: 150000 }
          ],
          status: 'PAID',
          paymentMethod: 'cash',
          paidAt: '2024-11-15T10:30:00Z',
          createdAt: '2024-11-15T10:00:00Z',
          dueDate: '2024-11-22'
        },
        {
          id: 3,
          appointmentId: 1,
          amount: 300000,
          items: [
            { description: 'Phí đặt lịch khám', quantity: 1, unitPrice: 300000, total: 300000 }
          ],
          status: 'UNPAID',
          createdAt: '2024-12-01T10:00:00Z',
          dueDate: '2024-12-08'
        }
      ];

      let filtered = [...mockInvoices];
      if (params?.status) {
        filtered = filtered.filter(inv => inv.status === params.status);
      }
      return Promise.resolve({
        data: {
          success: true,
          count: filtered.length,
          data: filtered,
        },
      });
    }
    return api.get('/patient/invoices', { params });
  },

  getById: (id: string) => {
    if (USE_MOCK_DATA) {
      const mockInvoices = [
        {
          id: 1,
          appointmentId: 1,
          amount: 500000,
          items: [
            { description: 'Phí khám bệnh', quantity: 1, unitPrice: 300000, total: 300000 },
            { description: 'Xét nghiệm máu', quantity: 1, unitPrice: 200000, total: 200000 }
          ],
          status: 'PAID',
          paymentMethod: 'momo',
          paidAt: '2024-11-28T11:30:00Z',
          createdAt: '2024-11-28T11:00:00Z',
          dueDate: '2024-12-05',
          appointment: {
            id: 1,
            date: '2024-11-28',
            timeSlot: '10:00-11:00',
            reason: 'Tái khám tim mạch',
            status: 'completed'
          }
        }
      ];
      const invoice = mockInvoices.find(inv => inv.id === parseInt(id));
      return Promise.resolve({ data: { success: true, data: invoice } });
    }
    return api.get(`/patient/invoices/${id}`);
  },

  pay: (id: string, paymentMethod: string) => {
    if (USE_MOCK_DATA) {
      // Mock MoMo payment
      if (paymentMethod === 'momo') {
        return Promise.resolve({
          data: {
            success: true,
            message: 'Tạo link thanh toán MoMo thành công',
            data: {
              paymentUrl: 'https://test-payment.momo.vn/v2/gateway/pay?t=1234567890',
              deeplink: 'momo://app',
              qrCodeUrl: 'https://test-payment.momo.vn/qr/1234567890',
              orderId: `INV-${id}-${Date.now()}`,
              invoice: {
                id: parseInt(id),
                status: 'UNPAID',
                paymentMethod: 'momo',
              }
            }
          },
        });
      }
      
      // Mock other payment methods
      return Promise.resolve({
        data: {
          success: true,
          message: 'Thanh toán thành công',
          data: {
            id: parseInt(id),
            status: 'PAID',
            paymentMethod,
            paidAt: new Date().toISOString()
          }
        },
      });
    }
    return api.post(`/patient/invoices/${id}/pay`, { paymentMethod });
  },
};

