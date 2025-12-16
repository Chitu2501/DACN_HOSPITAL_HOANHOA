'use client';

import { useState, useEffect } from 'react';
import { PatientLayout } from '@/components/Layout/PatientLayout';
import { useQuery } from '@tanstack/react-query';
import { appointmentsApi } from '@/lib/api';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  Activity,
  Zap,
  Target,
  TrendingUp,
  Bell,
  FileText,
  CreditCard,
} from 'lucide-react';
import { getStatusName } from '@/lib/utils';

// Mock data for when API is not available
const mockStats = {
  upcomingAppointments: 3,
  completedAppointments: 12,
  pendingAppointments: 2,
  totalAppointments: 17,
  nextAppointment: {
    date: '2024-12-05T08:00:00',
    doctor: 'BS. Nguyễn Văn A',
    specialization: 'Tim mạch',
    status: 'confirmed',
  },
};

const mockUpcomingAppointments = [
  {
    _id: '1',
    appointmentDate: '2024-12-05T08:00:00',
    timeSlot: '08:00 - 08:30',
    status: 'confirmed',
    doctor: {
      fullName: 'BS. Nguyễn Văn A',
      specialization: 'Tim mạch',
      department: 'Khoa Tim mạch',
    },
    reason: 'Tái khám định kỳ',
    fee: 500000,
    isPaid: false,
  },
  {
    _id: '2',
    appointmentDate: '2024-12-07T14:00:00',
    timeSlot: '14:00 - 14:30',
    status: 'confirmed',
    doctor: {
      fullName: 'BS. Trần Thị B',
      specialization: 'Nội tiết',
      department: 'Khoa Nội tiết',
    },
    reason: 'Kiểm tra đường huyết',
    fee: 400000,
    isPaid: true,
  },
  {
    _id: '3',
    appointmentDate: '2024-12-10T09:00:00',
    timeSlot: '09:00 - 09:30',
    status: 'pending',
    doctor: {
      fullName: 'BS. Lê Văn C',
      specialization: 'Tiêu hóa',
      department: 'Khoa Tiêu hóa',
    },
    reason: 'Đau bụng',
    fee: 450000,
    isPaid: false,
  },
];

const mockRecentRecords = [
  {
    _id: '1',
    date: '2024-11-28',
    doctor: 'BS. Nguyễn Văn A',
    diagnosis: 'Cao huyết áp',
    prescription: 'Thuốc hạ huyết áp',
    status: 'completed',
  },
  {
    _id: '2',
    date: '2024-11-15',
    doctor: 'BS. Trần Thị B',
    diagnosis: 'Tiểu đường type 2',
    prescription: 'Thuốc điều trị tiểu đường',
    status: 'completed',
  },
];

// ===== THEME: Medical Neutral + Blue Accent =====
const UI = {
  page: 'bg-slate-50',
  card: 'rounded-2xl bg-white border border-slate-200 shadow-sm',
  cardHover: 'hover:bg-slate-50 transition-colors',
  title: 'text-slate-900',
  sub: 'text-slate-600',
  muted: 'text-slate-500',
  btnPrimary:
    'group flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-500 transition-all shadow-sm',
  btnPrimary2:
    'px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-500 transition-all shadow-sm',
  btnOutline:
    'inline-block px-4 py-2 bg-white border border-slate-200 text-slate-800 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-colors',
  chip:
    'px-3 py-1 bg-slate-100 rounded-full text-sm font-medium text-slate-700 flex items-center gap-2',
  iconBox:
    'w-12 h-12 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center',
  iconBoxDark:
    'w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center',
  quickItem:
    'flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-200 text-slate-800 hover:bg-slate-50 hover:border-slate-300 transition-all group',
};

const getStatusBadgeColor = (status: string) => {
  switch (status) {
    case 'confirmed':
      return 'bg-blue-50 text-blue-800 border border-blue-200';
    case 'pending':
      return 'bg-amber-50 text-amber-800 border border-amber-200';
    case 'completed':
      return 'bg-emerald-50 text-emerald-800 border border-emerald-200';
    case 'cancelled':
      return 'bg-red-50 text-red-800 border border-red-200';
    default:
      return 'bg-slate-50 text-slate-800 border border-slate-200';
  }
};

export default function PatientDashboard() {
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [animatedStats, setAnimatedStats] = useState({
    upcomingAppointments: 0,
    completedAppointments: 0,
    totalAppointments: 0,
  });

  const { data: appointmentsData, isLoading: appointmentsLoading } = useQuery({
    queryKey: ['patient-appointments'],
    queryFn: async () => {
      const response = await appointmentsApi.getAll({ status: 'confirmed,pending' });
      return response.data;
    },
    retry: 1,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    const tick = () => setCurrentTime(new Date());
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const duration = 1500;
    const steps = 60;
    const stepTime = duration / steps;

    let step = 0;
    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      const easeOut = 1 - Math.pow(1 - progress, 3);

      setAnimatedStats({
        upcomingAppointments: Math.round(mockStats.upcomingAppointments * easeOut),
        completedAppointments: Math.round(mockStats.completedAppointments * easeOut),
        totalAppointments: Math.round(mockStats.totalAppointments * easeOut),
      });

      if (step >= steps) clearInterval(timer);
    }, stepTime);

    return () => clearInterval(timer);
  }, []);

  const appointments = appointmentsData?.data || mockUpcomingAppointments;

  const stats = {
    upcomingAppointments:
      appointments?.filter((apt: any) => ['confirmed', 'pending'].includes(apt.status)).length ||
      mockStats.upcomingAppointments,
    completedAppointments: mockStats.completedAppointments,
    pendingAppointments:
      appointments?.filter((apt: any) => apt.status === 'pending').length || mockStats.pendingAppointments,
    totalAppointments: mockStats.totalAppointments,
  };

  const formatTime = (dateString: string) =>
    new Date(dateString).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('vi-VN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

  const nextAppointment =
    appointments?.find(
      (apt: any) => ['confirmed', 'pending'].includes(apt.status) && new Date(apt.appointmentDate) >= new Date()
    ) || mockStats.nextAppointment;

  return (
    <PatientLayout>
      <div className={`${UI.page} p-6 space-y-6`}>
        {/* Welcome Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-white border border-slate-200 p-8 shadow-sm">
          <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className={UI.chip}>
                  Tổng quan ngày {currentTime ? currentTime.toLocaleDateString('vi-VN') : '...'}
                </div>
              </div>

              <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-2">Chào mừng trở lại</h1>

              <p className="text-slate-700 text-lg max-w-xl">
                Bạn có <span className="font-semibold text-slate-900">{stats.upcomingAppointments} lịch hẹn sắp tới</span>.
              </p>
            </div>

            <div className="flex gap-4">
              <a href="/patient/appointments" className={UI.btnPrimary}>
                <Calendar className="w-5 h-5 text-white" />
                Đặt lịch khám
                <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform" />
              </a>
            </div>
          </div>
        </div>

        {/* Next Appointment Card */}
        {nextAppointment && (
          <div className={UI.card}>
            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Bell className="w-5 h-5 text-slate-700" />
                <span className="text-sm font-semibold text-slate-800">Lịch hẹn sắp tới</span>
              </div>

              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">
                    {nextAppointment.doctor?.fullName || nextAppointment.doctor}
                  </h3>
                  <p className="text-slate-600 mb-1">
                    {nextAppointment.doctor?.specialization || nextAppointment.specialization}
                  </p>
                  <p className="text-slate-600 text-sm">
                    {nextAppointment.appointmentDate ? formatDate(nextAppointment.appointmentDate) : formatDate(nextAppointment.date)}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-3xl font-bold text-slate-900">
                      {nextAppointment.appointmentDate ? formatTime(nextAppointment.appointmentDate) : '08:00'}
                    </p>
                    <p className="text-slate-600 text-sm">Thời gian khám</p>
                  </div>

                  <a href="/patient/appointments" className={UI.btnPrimary2}>
                    Xem chi tiết
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={UI.card}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={UI.iconBoxDark}>
                  <Calendar className="w-6 h-6" />
                </div>
                <div className="flex items-center gap-1 text-slate-600 text-sm font-medium">
                  <TrendingUp className="w-4 h-4" />
                  Sắp tới
                </div>
              </div>
              <p className="text-4xl font-bold text-slate-900 mb-1">{animatedStats.upcomingAppointments}</p>
              <p className="text-sm text-slate-600">Lịch hẹn sắp tới</p>
            </div>
          </div>

          <div className={UI.card}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={UI.iconBoxDark}>
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-full border border-slate-200">
                  {Math.round((mockStats.completedAppointments / mockStats.totalAppointments) * 100)}%
                </span>
              </div>
              <p className="text-4xl font-bold text-slate-900 mb-1">{animatedStats.completedAppointments}</p>
              <p className="text-sm text-slate-600">Đã hoàn thành</p>
            </div>
          </div>

          <div className={UI.card}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={UI.iconBoxDark}>
                  <Clock className="w-6 h-6" />
                </div>
                <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-full border border-slate-200">
                  Chờ xác nhận
                </span>
              </div>
              <p className="text-4xl font-bold text-slate-900 mb-1">{stats.pendingAppointments}</p>
              <p className="text-sm text-slate-600">Chờ xác nhận</p>
            </div>
          </div>

          <div className={UI.card}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={UI.iconBoxDark}>
                  <Activity className="w-6 h-6" />
                </div>
              </div>
              <p className="text-4xl font-bold text-slate-900 mb-1">{animatedStats.totalAppointments}</p>
              <p className="text-sm text-slate-600">Tổng lịch hẹn</p>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upcoming Appointments */}
          <div className="lg:col-span-2 rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900">Lịch hẹn sắp tới</h2>
                  <p className="text-sm text-slate-600">{stats.upcomingAppointments} lịch hẹn</p>
                </div>
              </div>
              <a
                href="/patient/appointments"
                className="flex items-center gap-1 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
              >
                Xem tất cả
                <ArrowUpRight className="w-4 h-4" />
              </a>
            </div>

            <div className="divide-y divide-slate-100">
              {appointmentsLoading ? (
                <div className="p-8 text-center">
                  <div className="w-8 h-8 border-4 border-slate-300 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-slate-600">Đang tải...</p>
                </div>
              ) : appointments && appointments.length > 0 ? (
                appointments.slice(0, 3).map((appointment: any, index: number) => (
                  <a
                    href="/patient/appointments"
                    key={appointment._id || index}
                    className="p-4 hover:bg-slate-50 transition-colors flex items-center gap-4 cursor-pointer"
                  >
                    <div className="text-center min-w-[70px]">
                      <p className="text-lg font-bold text-slate-900">{formatTime(appointment.appointmentDate)}</p>
                      <p className="text-xs text-slate-600">
                        {new Date(appointment.appointmentDate).toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{appointment.doctor?.fullName || 'Bác sĩ'}</p>
                      <p className="text-sm text-slate-600 truncate">
                        {appointment.doctor?.specialization || appointment.specialization} • {appointment.reason}
                      </p>
                    </div>

                    <span className={`px-3 py-1.5 rounded-lg text-xs font-medium ${getStatusBadgeColor(appointment.status)}`}>
                      {getStatusName(appointment.status)}
                    </span>

                    <div className="p-2.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </a>
                ))
              ) : (
                <div className="p-8 text-center">
                  <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600">Chưa có lịch hẹn nào</p>
                  <a href="/patient/appointments" className={UI.btnOutline}>
                    Đặt lịch ngay
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className={UI.card}>
              <div className="p-6">
                <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-slate-700" />
                  Thao tác nhanh
                </h3>
                <div className="space-y-3">
                  <a href="/patient/appointments" className={UI.quickItem}>
                    <Calendar className="w-5 h-5 text-slate-800" />
                    <span className="flex-1 font-medium">Đặt lịch khám</span>
                    <ArrowRight className="w-4 h-4 text-slate-700 group-hover:translate-x-1 transition-transform" />
                  </a>
                  <a href="/patient/history" className={UI.quickItem}>
                    <Clock className="w-5 h-5 text-slate-800" />
                    <span className="flex-1 font-medium">Lịch sử khám</span>
                    <ArrowRight className="w-4 h-4 text-slate-700 group-hover:translate-x-1 transition-transform" />
                  </a>
                  <a href="/patient/medical-records" className={UI.quickItem}>
                    <FileText className="w-5 h-5 text-slate-800" />
                    <span className="flex-1 font-medium">Hồ sơ bệnh án</span>
                    <ArrowRight className="w-4 h-4 text-slate-700 group-hover:translate-x-1 transition-transform" />
                  </a>
                  <a href="/patient/payments" className={UI.quickItem}>
                    <CreditCard className="w-5 h-5 text-slate-800" />
                    <span className="flex-1 font-medium">Thanh toán</span>
                    <ArrowRight className="w-4 h-4 text-slate-700 group-hover:translate-x-1 transition-transform" />
                  </a>
                </div>
              </div>
            </div>

            {/* Recent Medical Records */}
            <div className={UI.card}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-slate-700" />
                    Hồ sơ gần đây
                  </h3>
                  <a href="/patient/medical-records" className="text-xs text-slate-700 hover:text-slate-900">
                    Xem tất cả
                  </a>
                </div>

                <div className="space-y-3">
                  {mockRecentRecords.map((record) => (
                    <div
                      key={record._id}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-all"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium text-slate-900 text-sm">{record.doctor}</p>
                          <p className="text-xs text-slate-600">{record.date}</p>
                        </div>
                        <CheckCircle2 className="w-4 h-4 text-slate-700" />
                      </div>
                      <p className="text-xs text-slate-700 mb-1">
                        <span className="font-medium">Chẩn đoán:</span> {record.diagnosis}
                      </p>
                      <p className="text-xs text-slate-600">
                        <span className="font-medium">Đơn thuốc:</span> {record.prescription}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Health Summary Card */}
            <div className={UI.card}>
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="w-5 h-5 text-slate-700" />
                  <h3 className="font-semibold text-slate-900">Tóm tắt sức khỏe</h3>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 text-sm">Lần khám gần nhất</span>
                    <span className="text-slate-900 font-semibold">28/11/2024</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 text-sm">Tổng lần khám</span>
                    <span className="text-slate-900 font-semibold">{mockStats.totalAppointments}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 text-sm">Tình trạng</span>
                    <span className="px-2 py-1 bg-emerald-50 text-emerald-800 text-xs font-medium rounded-full border border-emerald-200">
                      Ổn định
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Optional note */}
            <div className="rounded-2xl bg-white border border-slate-200 p-4 text-sm text-slate-600">
              Màu nhấn: <span className="font-semibold text-slate-900">blue</span>. Nền: <span className="font-semibold text-slate-900">slate-50</span>.
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .animation-delay-2000 {
          animation-delay: 2s;
        }
      `}</style>
    </PatientLayout>
  );
}
