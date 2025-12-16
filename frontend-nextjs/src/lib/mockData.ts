// Mock data for testing without backend

export const mockUsers = [
  {
    _id: '1',
    username: 'admin',
    email: 'admin@hospital.com',
    fullName: 'Quản trị viên Hệ thống',
    phone: '0123456789',
    role: 'admin',
    isActive: true,
    createdAt: new Date('2025-01-01'),
  },
  {
    _id: '2',
    username: 'dr.nguyen',
    email: 'bsnguyen@hospital.com',
    fullName: 'Bác sĩ Nguyễn Văn A',
    phone: '0912345678',
    role: 'doctor',
    specialization: 'Tim mạch',
    department: 'Khoa Tim mạch',
    licenseNumber: 'BS-001',
    isActive: true,
    createdAt: new Date('2025-01-05'),
  },
  {
    _id: '3',
    username: 'dr.tran',
    email: 'bstran@hospital.com',
    fullName: 'Bác sĩ Trần Thị B',
    phone: '0912345679',
    role: 'doctor',
    specialization: 'Nội khoa',
    department: 'Khoa Nội',
    licenseNumber: 'BS-002',
    isActive: true,
    createdAt: new Date('2025-01-06'),
  },
  {
    _id: '4',
    username: 'nurse.pham',
    email: 'ytpham@hospital.com',
    fullName: 'Y tá Phạm Thị D',
    phone: '0912345681',
    role: 'nurse',
    department: 'Khoa Tim mạch',
    licenseNumber: 'YT-001',
    isActive: true,
    createdAt: new Date('2025-01-07'),
  },
  {
    _id: '5',
    username: 'patient1',
    email: 'patient1@email.com',
    fullName: 'Bệnh nhân Nguyễn Thị F',
    phone: '0912345683',
    address: '123 Đường ABC, Quận 1, TP.HCM',
    role: 'patient',
    gender: 'female',
    isActive: true,
    createdAt: new Date('2025-01-10'),
  },
];

export const mockAppointments = [
  {
    _id: '1',
    patient: {
      _id: '5',
      fullName: 'Bệnh nhân Nguyễn Thị F',
      email: 'patient1@email.com',
      phone: '0912345683',
    },
    doctor: {
      _id: '2',
      fullName: 'Bác sĩ Nguyễn Văn A',
      specialization: 'Tim mạch',
    },
    appointmentDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    timeSlot: '09:00-10:00',
    reason: 'Khám tổng quát',
    symptoms: 'Đau ngực, khó thở',
    status: 'confirmed',
    fee: 500000,
    isPaid: false,
    createdAt: new Date(),
  },
  {
    _id: '2',
    patient: {
      _id: '5',
      fullName: 'Bệnh nhân Trần Văn G',
      email: 'patient2@email.com',
      phone: '0912345684',
    },
    doctor: {
      _id: '3',
      fullName: 'Bác sĩ Trần Thị B',
      specialization: 'Nội khoa',
    },
    appointmentDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    timeSlot: '10:00-11:00',
    reason: 'Tái khám',
    symptoms: 'Đau dạ dày',
    status: 'pending',
    fee: 300000,
    isPaid: false,
    createdAt: new Date(),
  },
  {
    _id: '3',
    patient: {
      _id: '5',
      fullName: 'Bệnh nhân Lê Thị H',
      email: 'patient3@email.com',
      phone: '0912345685',
    },
    doctor: {
      _id: '2',
      fullName: 'Bác sĩ Nguyễn Văn A',
      specialization: 'Tim mạch',
    },
    appointmentDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    timeSlot: '14:00-15:00',
    reason: 'Kiểm tra định kỳ',
    symptoms: 'Không có',
    status: 'completed',
    diagnosis: 'Sức khỏe tốt',
    prescription: 'Không cần thuốc',
    fee: 400000,
    isPaid: true,
    paymentMethod: 'cash',
    paidAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  },
];

export const mockDashboardStats = {
  users: {
    total: 50,
    patients: 35,
    doctors: 10,
    nurses: 4,
    active: 48,
    byRole: [
      { role: 'admin', total: 1, active: 1 },
      { role: 'doctor', total: 10, active: 10 },
      { role: 'nurse', total: 4, active: 4 },
      { role: 'patient', total: 35, active: 33 },
    ],
  },
  appointments: {
    total: 120,
    pending: 15,
    confirmed: 25,
    completed: 70,
    cancelled: 10,
  },
  revenue: {
    total: 48000000,
    paidAppointments: 70,
    byPaymentMethod: [
      { _id: 'cash', revenue: 28000000, count: 40 },
      { _id: 'momo', revenue: 15000000, count: 20 },
      { _id: 'bank_transfer', revenue: 5000000, count: 10 },
    ],
  },
  recent: {
    users: mockUsers.slice(0, 5),
    appointments: mockAppointments,
  },
};

export const mockRevenueStats = {
  summary: {
    totalRevenue: 48000000,
    totalAppointments: 70,
    averageRevenue: 685714,
  },
  byDate: [
    { _id: '2025-01', revenue: 12000000, appointments: 18 },
    { _id: '2025-02', revenue: 15000000, appointments: 20 },
    { _id: '2025-03', revenue: 13000000, appointments: 17 },
    { _id: '2025-04', revenue: 8000000, appointments: 15 },
  ],
  byDoctor: [
    {
      doctorId: '2',
      doctorName: 'Bác sĩ Nguyễn Văn A',
      specialization: 'Tim mạch',
      revenue: 18000000,
      appointments: 30,
    },
    {
      doctorId: '3',
      doctorName: 'Bác sĩ Trần Thị B',
      specialization: 'Nội khoa',
      revenue: 15000000,
      appointments: 25,
    },
  ],
};

export const mockAppointmentStats = {
  byStatus: [
    { _id: 'pending', count: 15 },
    { _id: 'confirmed', count: 25 },
    { _id: 'completed', count: 70 },
    { _id: 'cancelled', count: 10 },
  ],
  byDoctor: [
    {
      doctorId: '2',
      doctorName: 'Bác sĩ Nguyễn Văn A',
      specialization: 'Tim mạch',
      totalAppointments: 30,
      completed: 25,
    },
    {
      doctorId: '3',
      doctorName: 'Bác sĩ Trần Thị B',
      specialization: 'Nội khoa',
      totalAppointments: 25,
      completed: 20,
    },
  ],
};

// Mock Authentication
export const mockLogin = (email: string, password: string) => {
  // Simulate API delay
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // Normalize email (trim and lowercase)
      const normalizedEmail = email.trim().toLowerCase();
      const normalizedPassword = password.trim();
      
      console.log('Mock Login Attempt:', { email: normalizedEmail, password: normalizedPassword });
      
      // Find user by email (case-insensitive)
      const user = mockUsers.find((u) => u.email.toLowerCase() === normalizedEmail);
      
      console.log('User found:', user ? user.email : 'not found');

      // Simple password check (in real app, this would be hashed)
      const validPasswords: Record<string, string> = {
        'admin@hospital.com': 'admin123456',
        'bsnguyen@hospital.com': 'doctor123',
        'bstran@hospital.com': 'doctor123',
        'ytpham@hospital.com': 'nurse123',
        'patient1@email.com': 'patient123',
      };

      if (user && validPasswords[normalizedEmail] === normalizedPassword) {
        console.log('Login successful!');
        resolve({
          data: {
            success: true,
            data: {
              user: {
                id: user._id,
                username: user.username,
                email: user.email,
                fullName: user.fullName,
                role: user.role,
                phone: user.phone,
                specialization: user.specialization,
                department: user.department,
              },
              token: 'mock_jwt_token_' + user._id,
            },
          },
        });
      } else {
        console.log('Login failed - Invalid credentials');
        reject({
          response: {
            data: {
              message: 'Email hoặc mật khẩu không đúng',
            },
          },
        });
      }
    }, 500);
  });
};

// Mock Register
export const mockRegister = (data: any) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const newUser = {
        id: Date.now().toString(),
        username: data.username,
        email: data.email,
        fullName: data.fullName,
        role: 'patient',
        phone: data.phone,
      };

      resolve({
        data: {
          success: true,
          data: {
            user: newUser,
            token: 'mock_jwt_token_' + newUser.id,
          },
        },
      });
    }, 500);
  });
};

// Enable/disable mock mode
export const USE_MOCK_DATA = false; // Set false để dùng API thật từ backend

