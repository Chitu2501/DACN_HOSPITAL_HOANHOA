import express, { Response } from 'express';
import { appointments, doctors, invoices, getNextAppointmentId, getNextInvoiceId } from '../data/mockData';
import { AuthenticatedRequest, ApiResponse, Appointment } from '../types';
import { mockPatientAuth } from '../middlewares/mockPatientAuth';

const router = express.Router();

// Tất cả routes cần authentication
router.use(mockPatientAuth);

/**
 * GET /api/patient/doctors
 * Lấy danh sách tất cả bác sĩ (để bệnh nhân chọn khi đặt lịch)
 */
router.get('/doctors', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { specialty, department } = req.query;

    let filteredDoctors = doctors.map(doctor => ({
      id: doctor.id,
      fullName: doctor.fullName,
      email: doctor.email,
      phone: doctor.phone,
      specialty: doctor.specialty,
      department: doctor.department,
      licenseNumber: doctor.licenseNumber
    }));

    // Filter theo specialty (nếu có)
    if (specialty) {
      const specialtyStr = typeof specialty === 'string' ? specialty : String(specialty);
      filteredDoctors = filteredDoctors.filter(
        doc => doc.specialty.toLowerCase().includes(specialtyStr.toLowerCase())
      );
    }

    // Filter theo department (nếu có)
    if (department) {
      const departmentStr = typeof department === 'string' ? department : String(department);
      filteredDoctors = filteredDoctors.filter(
        doc => doc.department.toLowerCase().includes(departmentStr.toLowerCase())
      );
    }

    res.json({
      success: true,
      data: filteredDoctors,
      count: filteredDoctors.length
    } as ApiResponse<typeof filteredDoctors>);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse<null>);
  }
});

/**
 * GET /api/patient/appointments
 * Lấy danh sách lịch khám của bệnh nhân hiện tại
 * Query params: status, date
 */
router.get('/appointments', (req: AuthenticatedRequest, res: Response) => {
  try {
    const patientId = req.user?.patientId;
    
    if (!patientId) {
      return res.status(401).json({
        success: false,
        message: 'Không xác định được bệnh nhân'
      } as ApiResponse<null>);
    }

    // Lọc appointments theo patientId
    let filteredAppointments = appointments.filter(apt => apt.patientId === patientId);

    // Filter theo status (nếu có)
    const { status, date } = req.query;
    
    if (status) {
      filteredAppointments = filteredAppointments.filter(
        apt => apt.status === status
      );
    }

    // Filter theo ngày (nếu có)
    if (date) {
      filteredAppointments = filteredAppointments.filter(
        apt => apt.date === date
      );
    }

    // Sắp xếp theo ngày (mới nhất trước)
    filteredAppointments.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // Populate thông tin bác sĩ
    const appointmentsWithDoctor = filteredAppointments.map(apt => {
      const doctor = doctors.find(d => d.id === apt.doctorId);
      return {
        ...apt,
        doctor: doctor ? {
          id: doctor.id,
          fullName: doctor.fullName,
          specialty: doctor.specialty,
          department: doctor.department
        } : null
      };
    });

    res.json({
      success: true,
      data: appointmentsWithDoctor,
      count: appointmentsWithDoctor.length
    } as ApiResponse<typeof appointmentsWithDoctor>);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse<null>);
  }
});

/**
 * GET /api/patient/doctors/schedules
 * Lấy lịch làm việc của các bác sĩ (để bệnh nhân chọn khi đặt lịch)
 */
router.get('/doctors/schedules', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { doctorId, date } = req.query;

    let schedules = doctors.map(doctor => ({
      id: doctor.id,
      fullName: doctor.fullName,
      specialty: doctor.specialty,
      department: doctor.department,
      schedule: doctor.schedule
    }));

    // Nếu có doctorId, chỉ trả về lịch của bác sĩ đó
    if (doctorId) {
      const doctorIdNum = parseInt(doctorId as string);
      schedules = schedules.filter(s => s.id === doctorIdNum);
    }

    // Nếu có date, tính toán các slot còn trống
    if (date) {
      const dateStr = date as string;
      const dayOfWeek = new Date(dateStr).getDay(); // 0 = Sunday, 1 = Monday, ...
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayName = dayNames[dayOfWeek];

      schedules = schedules.map(schedule => {
        const doctor = doctors.find(d => d.id === schedule.id);
        if (!doctor) return schedule;

        const availableSlots = doctor.schedule[dayName as keyof typeof doctor.schedule] || [];
        
        // Lọc ra các slot đã bị đặt
        const bookedSlots = appointments
          .filter(apt => 
            apt.doctorId === schedule.id && 
            apt.date === dateStr &&
            apt.status !== 'cancelled'
          )
          .map(apt => apt.timeSlot);

        const freeSlots = availableSlots.filter(slot => !bookedSlots.includes(slot));

        return {
          ...schedule,
          availableSlots: freeSlots,
          allSlots: availableSlots,
          bookedSlots
        };
      });
    }

    res.json({
      success: true,
      data: schedules
    } as ApiResponse<typeof schedules>);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse<null>);
  }
});

/**
 * POST /api/patient/appointments
 * Đặt lịch khám mới
 */
router.post('/appointments', (req: AuthenticatedRequest, res: Response) => {
  try {
    const patientId = req.user?.patientId;
    
    if (!patientId) {
      return res.status(401).json({
        success: false,
        message: 'Không xác định được bệnh nhân'
      } as ApiResponse<null>);
    }

    const { doctorId, date, timeSlot, reason, symptoms } = req.body;

    // Validation
    if (!doctorId || !date || !timeSlot || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng điền đầy đủ thông tin: doctorId, date, timeSlot, reason'
      } as ApiResponse<null>);
    }

    // Kiểm tra bác sĩ có tồn tại không
    const doctor = doctors.find(d => d.id === parseInt(doctorId));
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bác sĩ'
      } as ApiResponse<null>);
    }

    // Kiểm tra slot có trùng không
    const existingAppointment = appointments.find(
      apt =>
        apt.doctorId === parseInt(doctorId) &&
        apt.date === date &&
        apt.timeSlot === timeSlot &&
        apt.status !== 'cancelled'
    );

    if (existingAppointment) {
      return res.status(400).json({
        success: false,
        message: 'Thời gian này đã được đặt. Vui lòng chọn thời gian khác'
      } as ApiResponse<null>);
    }

    // Kiểm tra slot có trong lịch làm việc của bác sĩ không
    const dayOfWeek = new Date(date).getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];
    const availableSlots = doctor.schedule[dayName as keyof typeof doctor.schedule] || [];

    if (!availableSlots.includes(timeSlot)) {
      return res.status(400).json({
        success: false,
        message: 'Bác sĩ không làm việc vào thời gian này'
      } as ApiResponse<null>);
    }

    // Tạo appointment mới
    const newAppointment: Appointment = {
      id: getNextAppointmentId(),
      patientId,
      doctorId: parseInt(doctorId),
      date,
      timeSlot,
      reason,
      symptoms: symptoms || undefined,
      status: 'pending', // Mặc định là pending, chờ bác sĩ xác nhận
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    appointments.push(newAppointment);

    // Tạo hóa đơn tạm thời (có thể thanh toán sau)
    const newInvoice = {
      id: getNextInvoiceId(),
      patientId,
      appointmentId: newAppointment.id,
      amount: 300000, // Phí đặt lịch mặc định
      items: [
        {
          description: 'Phí đặt lịch khám',
          quantity: 1,
          unitPrice: 300000,
          total: 300000
        }
      ],
      status: 'UNPAID' as const,
      createdAt: new Date().toISOString(),
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 7 ngày sau
    };

    invoices.push(newInvoice);

    // Populate thông tin bác sĩ
    const appointmentWithDoctor = {
      ...newAppointment,
      doctor: {
        id: doctor.id,
        fullName: doctor.fullName,
        specialty: doctor.specialty,
        department: doctor.department
      },
      invoice: {
        id: newInvoice.id,
        amount: newInvoice.amount,
        status: newInvoice.status
      }
    };

    res.status(201).json({
      success: true,
      data: appointmentWithDoctor,
      message: 'Đặt lịch khám thành công'
    } as ApiResponse<typeof appointmentWithDoctor>);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse<null>);
  }
});

/**
 * GET /api/patient/appointments/:id
 * Lấy chi tiết 1 lịch khám
 */
router.get('/appointments/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const patientId = req.user?.patientId;
    const appointmentId = parseInt(req.params.id);

    if (!patientId) {
      return res.status(401).json({
        success: false,
        message: 'Không xác định được bệnh nhân'
      } as ApiResponse<null>);
    }

    if (isNaN(appointmentId)) {
      return res.status(400).json({
        success: false,
        message: 'ID lịch khám không hợp lệ'
      } as ApiResponse<null>);
    }

    const appointment = appointments.find(
      apt => apt.id === appointmentId && apt.patientId === patientId
    );

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy lịch khám hoặc bạn không có quyền truy cập'
      } as ApiResponse<null>);
    }

    // Populate thông tin
    const doctor = doctors.find(d => d.id === appointment.doctorId);
    const invoice = invoices.find(inv => inv.appointmentId === appointmentId);

    const appointmentDetail = {
      ...appointment,
      doctor: doctor ? {
        id: doctor.id,
        fullName: doctor.fullName,
        specialty: doctor.specialty,
        department: doctor.department,
        phone: doctor.phone
      } : null,
      invoice: invoice || null
    };

    res.json({
      success: true,
      data: appointmentDetail
    } as ApiResponse<typeof appointmentDetail>);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse<null>);
  }
});

export default router;

