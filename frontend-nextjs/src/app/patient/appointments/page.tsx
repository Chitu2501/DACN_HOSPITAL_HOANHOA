'use client';

import { useState, useEffect, useMemo } from 'react';
import { PatientLayout } from '@/components/Layout/PatientLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appointmentsApi } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Calendar,
  Search,
  Clock,
  FileText,
  ChevronLeft,
  ChevronRight,
  X,
  AlertCircle,
  Stethoscope,
  Phone,
  Mail,
  CalendarDays,
  Users,
  Check,
  X as XIcon,
  List,
} from 'lucide-react';
import { formatDate, getStatusName } from '@/lib/utils';
import { api as axiosApi } from '@/lib/api';

const apiHelpers = {
  getDoctors: async (params?: { specialty?: string; department?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.specialty) queryParams.append('specialty', params.specialty);
    if (params?.department) queryParams.append('department', params.department);
    const response = await axiosApi.get(`/patient/doctors?${queryParams.toString()}`);
    return response.data; // { data: [...] } hoặc [...]
  },
  getDoctorSchedules: async (params?: { doctorId?: string; date?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.date) queryParams.append('date', params.date);
    if (params?.doctorId) queryParams.append('doctorId', params.doctorId);
    const response = await axiosApi.get(`/patient/doctors/schedules?${queryParams.toString()}`);
    return response.data; // { data: [...] } hoặc [...]
  },
  createAppointment: async (data: any) => {
    const response = await axiosApi.post('/patient/appointments', data);
    return response.data;
  },
  getAppointments: (params?: any) => appointmentsApi.getAll(params),
};

// ===== THEME: Medical Neutral + Blue Accent =====
const UI = {
  page: 'bg-slate-50',
  container: 'space-y-6',
  h1Wrap: 'flex items-center gap-3',
  h1Icon: 'w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm',
  h1: 'text-2xl font-bold text-slate-900',
  sub: 'text-slate-600 mt-1',

  divider: 'border-b border-slate-200',

  // Tabs
  tabBtn: 'px-6 py-3 font-semibold transition-all border-b-2',
  tabActive: 'text-slate-900 border-blue-600',
  tabInactive: 'text-slate-500 border-transparent hover:text-slate-900',

  // Surface
  card: 'bg-white border border-slate-200 rounded-2xl',
  cardHover: 'hover:border-slate-300 hover:shadow-sm transition-all',
  sectionTitle: 'text-sm font-medium text-slate-700 mb-2',

  // Inputs
  input:
    'w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition',
  inputWithIcon:
    'w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition',
  select:
    'w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition',

  // Buttons
  btnPrimary:
    'px-4 py-2 rounded-xl font-semibold bg-blue-600 text-white hover:bg-blue-500 active:bg-blue-600 transition shadow-sm',
  btnPrimaryWide:
    'w-full px-4 py-2 rounded-xl font-semibold bg-blue-600 text-white hover:bg-blue-500 active:bg-blue-600 transition shadow-sm',
  btnGhost:
    'px-4 py-2 rounded-xl font-semibold bg-white border border-slate-200 text-slate-800 hover:bg-slate-50 hover:border-slate-300 transition',
  btnDangerSoft:
    'w-full px-4 py-2 rounded-lg font-medium bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 transition',
  btnIcon:
    'p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition disabled:opacity-50 disabled:cursor-not-allowed',

  // Toggle pills
  pill:
    'px-4 py-2 rounded-xl font-semibold transition border',
  pillActive:
    'bg-blue-600 text-white border-blue-600 shadow-sm',
  pillInactive:
    'bg-white text-slate-800 border-slate-200 hover:bg-slate-50 hover:border-slate-300',

  // Legend
  legendWrap: 'flex flex-wrap gap-4 p-4 bg-white border border-slate-200 rounded-xl',

  // Modals
  overlay: 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm',
  modal: 'w-full max-w-2xl bg-white rounded-2xl border border-slate-200 p-6 shadow-xl',
  modalTitle: 'text-2xl font-bold text-slate-900',
  modalClose: 'p-2 hover:bg-slate-100 rounded-lg transition-colors',
};

const getSlotClasses = (status: 'available' | 'booked' | 'not-available') => {
  switch (status) {
    case 'available':
      return 'bg-blue-50 border-blue-300 text-blue-800 hover:bg-blue-100';
    case 'booked':
      return 'bg-slate-200 border-slate-200 text-slate-500 cursor-not-allowed';
    case 'not-available':
      return 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed';
    default:
      return 'bg-white border-slate-200 text-slate-700';
  }
};

const getStatusBadge = (status: string) => {
  // High-contrast, but still medical-friendly
  switch (status) {
    case 'pending':
      return 'bg-amber-50 text-amber-800 border border-amber-200';
    case 'confirmed':
      return 'bg-blue-50 text-blue-800 border border-blue-200';
    case 'completed':
      return 'bg-emerald-50 text-emerald-800 border border-emerald-200';
    case 'cancelled':
      return 'bg-red-50 text-red-800 border border-red-200';
    default:
      return 'bg-slate-50 text-slate-800 border border-slate-200';
  }
};

export default function PatientAppointments() {
  const [activeTab, setActiveTab] = useState<'my-appointments' | 'book-appointment'>('book-appointment');
  const [selectedDoctor, setSelectedDoctor] = useState<string>('');
  const [viewMode, setViewMode] = useState<'list' | 'schedule'>('list');

  const [selectedDate, setSelectedDate] = useState<string>(''); // set in useEffect
  const [isClient, setIsClient] = useState(false);

  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingData, setBookingData] = useState({
    doctorId: '',
    date: '',
    timeSlot: '',
    reason: '',
    symptoms: '',
  });

  // My appointments filters
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Doctors filters
  const [doctorSearchTerm, setDoctorSearchTerm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('');

  const queryClient = useQueryClient();

  useEffect(() => {
    setIsClient(true);
    const d = new Date();
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  }, []);

  // Doctors
  const { data: doctorsData, isLoading: doctorsLoading, error: doctorsError } = useQuery({
    queryKey: ['doctors', selectedSpecialty],
    queryFn: async () => {
      const params: any = {};
      if (selectedSpecialty) params.specialty = selectedSpecialty;
      return apiHelpers.getDoctors(params);
    },
    retry: 2,
    staleTime: 5 * 60 * 1000,
  });

  // Schedules
  const { data: schedulesData, isLoading: schedulesLoading } = useQuery({
    queryKey: ['doctor-schedules', selectedDate, selectedDoctor],
    queryFn: async () => {
      const params: any = { date: selectedDate };
      if (selectedDoctor) params.doctorId = selectedDoctor;
      // IMPORTANT: apiHelpers.getDoctorSchedules đã return response.data
      return apiHelpers.getDoctorSchedules(params);
    },
    enabled: activeTab === 'book-appointment' && isClient && !!selectedDate,
  });

  // My appointments
  const { data: appointmentsData, isLoading: appointmentsLoading } = useQuery({
    queryKey: ['patient-appointments', filterStatus],
    queryFn: async () => {
      const params: any = {};
      if (filterStatus !== 'all') params.status = filterStatus;
      const response = await apiHelpers.getAppointments(params);
      return response.data;
    },
    enabled: activeTab === 'my-appointments',
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => apiHelpers.createAppointment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['doctor-schedules'] });
      toast.success('Đặt lịch khám thành công!');
      setShowBookingModal(false);
      setBookingData({ doctorId: '', date: '', timeSlot: '', reason: '', symptoms: '' });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi đặt lịch');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => appointmentsApi.cancel(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['doctor-schedules'] });
      toast.success('Hủy lịch hẹn thành công!');
      setSelectedAppointment(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi hủy lịch');
    },
  });

  // Normalize data shapes
  const doctors = useMemo(() => {
    const raw = doctorsData as any;
    return raw?.data || raw || [];
  }, [doctorsData]);

  const schedules = useMemo(() => {
    const raw = schedulesData as any;
    return Array.isArray(raw) ? raw : raw?.data || [];
  }, [schedulesData]);

  const appointments = appointmentsData?.data || appointmentsData || [];

  const specialties: string[] = useMemo(() => {
    return Array.from(new Set(doctors.map((d: any) => d.specialization).filter(Boolean))) as string[];
  }, [doctors]);

  const filteredDoctors = useMemo(() => {
    return doctors.filter((doctor: any) => {
      const q = doctorSearchTerm.toLowerCase();
      const matchesSearch =
        doctor.fullName?.toLowerCase().includes(q) ||
        doctor.specialization?.toLowerCase().includes(q) ||
        doctor.department?.toLowerCase().includes(q);

      const matchesSpecialty = !selectedSpecialty || doctor.specialization === selectedSpecialty;
      return matchesSearch && matchesSpecialty;
    });
  }, [doctors, doctorSearchTerm, selectedSpecialty]);

  const filteredAppointments = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return appointments.filter((apt: any) => {
      const matchesSearch =
        apt.doctor?.fullName?.toLowerCase().includes(q) ||
        apt.reason?.toLowerCase().includes(q);
      return matchesSearch;
    });
  }, [appointments, searchTerm]);

  const statusCounts = useMemo(() => {
    return {
      all: appointments.length,
      pending: appointments.filter((a: any) => a.status === 'pending').length,
      confirmed: appointments.filter((a: any) => a.status === 'confirmed').length,
      completed: appointments.filter((a: any) => a.status === 'completed').length,
      cancelled: appointments.filter((a: any) => a.status === 'cancelled').length,
    };
  }, [appointments]);

  const getDayName = (dateStr: string) => {
    if (!dateStr || !isClient) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    return days[date.getDay()];
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    if (!selectedDate) return;
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + (direction === 'next' ? 1 : -1));
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const getSlotStatus = (schedule: any, timeSlot: string): 'available' | 'booked' | 'not-available' => {
    if (!schedule.allSlots || !schedule.allSlots.includes(timeSlot)) return 'not-available';
    if (schedule.bookedSlots && schedule.bookedSlots.includes(timeSlot)) return 'booked';
    return 'available';
  };

  const handleBookSlot = (doctorId: string, date: string, timeSlot: string) => {
    setBookingData({ doctorId: doctorId.toString(), date, timeSlot, reason: '', symptoms: '' });
    setShowBookingModal(true);
  };

  const handleConfirmBooking = () => {
    if (!bookingData.reason) {
      toast.error('Vui lòng nhập lý do khám');
      return;
    }
    createMutation.mutate(bookingData);
  };

  const findDoctorNameById = (id: string) => {
    const d = doctors.find((x: any) => (x._id || x.id)?.toString() === id);
    return d?.fullName || '';
  };

  if (!isClient) {
    return (
      <PatientLayout>
        <div className={`${UI.page} p-6 text-slate-700`}>Đang tải...</div>
      </PatientLayout>
    );
  }

  return (
    <PatientLayout>
      <div className={`${UI.page} p-6`}>
        <div className={UI.container}>
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className={UI.h1Wrap}>
                <div className={UI.h1Icon}>
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <h1 className={UI.h1}>Đặt lịch khám</h1>
              </div>
              <p className={UI.sub}>Xem lịch bác sĩ và đặt lịch khám bệnh</p>
            </div>
          </div>

          {/* Tabs */}
          <div className={`flex gap-2 ${UI.divider}`}>
            <button
              onClick={() => setActiveTab('book-appointment')}
              className={`${UI.tabBtn} ${activeTab === 'book-appointment' ? UI.tabActive : UI.tabInactive}`}
            >
              <div className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5" />
                Đặt lịch mới
              </div>
            </button>
            <button
              onClick={() => setActiveTab('my-appointments')}
              className={`${UI.tabBtn} ${activeTab === 'my-appointments' ? UI.tabActive : UI.tabInactive}`}
            >
              <div className="flex items-center gap-2">
                <List className="w-5 h-5" />
                Lịch của tôi ({statusCounts.all})
              </div>
            </button>
          </div>

          {/* Book Appointment Tab */}
          {activeTab === 'book-appointment' && (
            <div className="space-y-6">
              {/* View Mode Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`${UI.pill} ${viewMode === 'list' ? UI.pillActive : UI.pillInactive}`}
                  >
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Danh sách bác sĩ
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setViewMode('schedule');
                      if (!selectedDate && isClient) {
                        const date = new Date();
                        date.setDate(date.getDate() + 1);
                        setSelectedDate(date.toISOString().split('T')[0]);
                      }
                    }}
                    className={`${UI.pill} ${viewMode === 'schedule' ? UI.pillActive : UI.pillInactive}`}
                  >
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-4 h-4" />
                      Lịch khám
                    </div>
                  </button>
                </div>
              </div>

              {/* Doctors List View */}
              {viewMode === 'list' && (
                <div className="space-y-6">
                  {/* Search and Filter */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Tìm kiếm bác sĩ theo tên, chuyên khoa..."
                        value={doctorSearchTerm}
                        onChange={(e) => setDoctorSearchTerm(e.target.value)}
                        className={UI.inputWithIcon}
                      />
                    </div>
                    <div className="sm:w-64">
                      <select
                        value={selectedSpecialty}
                        onChange={(e) => setSelectedSpecialty(e.target.value)}
                        className={UI.select}
                      >
                        <option value="">Tất cả chuyên khoa</option>
                        {specialties.map((spec: string) => (
                          <option key={spec} value={spec}>
                            {spec}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Doctors Grid */}
                  {doctorsLoading ? (
                    <div className={`${UI.card} flex items-center justify-center h-64`}>
                      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <p className="ml-4 text-slate-600">Đang tải danh sách bác sĩ...</p>
                    </div>
                  ) : doctorsError ? (
                    <div className={`${UI.card} text-center py-16 border-red-200`}>
                      <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                      <p className="text-red-700 text-lg mb-2">Lỗi khi tải danh sách bác sĩ</p>
                      <p className="text-slate-600 text-sm">{(doctorsError as any)?.message || 'Vui lòng thử lại sau'}</p>
                      <button
                        onClick={() => queryClient.invalidateQueries({ queryKey: ['doctors'] })}
                        className={`mt-4 ${UI.btnPrimary}`}
                      >
                        Thử lại
                      </button>
                    </div>
                  ) : filteredDoctors.length === 0 ? (
                    <div className={`${UI.card} text-center py-16`}>
                      <Stethoscope className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                      <p className="text-slate-700 text-lg mb-2">
                        {doctors.length === 0 ? 'Chưa có bác sĩ nào trong hệ thống' : 'Không tìm thấy bác sĩ phù hợp với bộ lọc'}
                      </p>
                      {doctors.length === 0 && <p className="text-slate-500 text-sm">Vui lòng liên hệ quản trị viên để thêm bác sĩ</p>}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-slate-600">
                          Tìm thấy <span className="font-semibold text-slate-900">{filteredDoctors.length}</span> bác sĩ
                          {doctors.length !== filteredDoctors.length && (
                            <span className="text-slate-500"> (trong tổng số {doctors.length} bác sĩ)</span>
                          )}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredDoctors.map((doctor: any) => {
                          const doctorKey = doctor.id?.toString() || doctor._id;
                          const isSelected = selectedDoctor === doctorKey;

                          return (
                            <div
                              key={doctorKey}
                              className={`${UI.card} p-6 cursor-pointer ${UI.cardHover} ${
                                isSelected ? 'border-blue-300 ring-2 ring-blue-100' : ''
                              }`}
                              onClick={() => {
                                setSelectedDoctor(doctorKey);
                                setViewMode('schedule');
                                if (!selectedDate && isClient) {
                                  const date = new Date();
                                  date.setDate(date.getDate() + 1);
                                  setSelectedDate(date.toISOString().split('T')[0]);
                                }
                              }}
                            >
                              <div className="flex items-start gap-4 mb-4">
                                <div className="w-16 h-16 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0 border border-blue-100">
                                  <Stethoscope className="w-8 h-8 text-blue-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-semibold text-slate-900 text-lg mb-1 truncate">{doctor.fullName}</h3>
                                  <p className="text-sm text-blue-700 font-medium mb-1">{doctor.specialization}</p>
                                  {doctor.department && <p className="text-xs text-slate-500 truncate">{doctor.department}</p>}
                                </div>
                              </div>

                              <div className="space-y-2 pt-4 border-t border-slate-100">
                                {doctor.phone && (
                                  <div className="flex items-center gap-2 text-slate-700 text-sm">
                                    <Phone className="w-4 h-4 text-slate-500" />
                                    <span className="truncate">{doctor.phone}</span>
                                  </div>
                                )}
                                {doctor.email && (
                                  <div className="flex items-center gap-2 text-slate-700 text-sm">
                                    <Mail className="w-4 h-4 text-slate-500" />
                                    <span className="truncate text-xs">{doctor.email}</span>
                                  </div>
                                )}
                              </div>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedDoctor(doctorKey);
                                  setViewMode('schedule');
                                  if (!selectedDate && isClient) {
                                    const date = new Date();
                                    date.setDate(date.getDate() + 1);
                                    setSelectedDate(date.toISOString().split('T')[0]);
                                  }
                                }}
                                className={`mt-4 ${UI.btnPrimaryWide}`}
                              >
                                Xem lịch khám
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Schedule View */}
              {viewMode === 'schedule' && (
                <div className="space-y-6">
                  {/* Back */}
                  <button onClick={() => setViewMode('list')} className={UI.btnGhost}>
                    <div className="flex items-center gap-2">
                      <ChevronLeft className="w-4 h-4" />
                      Quay lại danh sách
                    </div>
                  </button>

                  {/* Filters */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={UI.sectionTitle}>Chọn bác sĩ</label>
                      <select value={selectedDoctor} onChange={(e) => setSelectedDoctor(e.target.value)} className={UI.select}>
                        <option value="">Tất cả bác sĩ</option>
                        {doctors.map((doctor: any) => (
                          <option key={doctor.id || doctor._id} value={doctor.id?.toString() || doctor._id}>
                            {doctor.fullName} - {doctor.specialty || doctor.specialization}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className={UI.sectionTitle}>Chọn ngày</label>
                      <div className="flex gap-2">
                        <button onClick={() => navigateDate('prev')} disabled={!selectedDate} className={UI.btnIcon}>
                          <ChevronLeft className="w-5 h-5 text-slate-600" />
                        </button>
                        <input
                          type="date"
                          value={selectedDate || ''}
                          onChange={(e) => setSelectedDate(e.target.value)}
                          min={isClient ? new Date().toISOString().split('T')[0] : undefined}
                          className={UI.input}
                        />
                        <button onClick={() => navigateDate('next')} disabled={!selectedDate} className={UI.btnIcon}>
                          <ChevronRight className="w-5 h-5 text-slate-600" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className={UI.legendWrap}>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-blue-50 border border-blue-300" />
                      <span className="text-sm text-slate-700">Còn trống</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-slate-200 border border-slate-200" />
                      <span className="text-sm text-slate-700">Đã đặt</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-slate-100 border border-slate-200" />
                      <span className="text-sm text-slate-700">Không làm việc</span>
                    </div>
                  </div>

                  {/* Schedules */}
                  {schedulesLoading ? (
                    <div className={`${UI.card} flex items-center justify-center h-64`}>
                      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : !Array.isArray(schedules) || schedules.length === 0 ? (
                    <div className={`${UI.card} text-center py-16`}>
                      <Calendar className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                      <p className="text-slate-700 text-lg">Không có lịch khám vào ngày này</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {schedules.map((schedule: any) => {
                        const allTimeSlots: string[] = schedule.allSlots && schedule.allSlots.length > 0 ? schedule.allSlots : [];
                        const availableCount = schedule.availableSlots?.length || 0;
                        const bookedCount = schedule.bookedSlots?.length || 0;

                        return (
                          <div key={schedule.id} className={`${UI.card} p-6`}>
                            <div className="flex items-start justify-between mb-6 gap-4">
                              <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                                  <Stethoscope className="w-7 h-7 text-blue-600" />
                                </div>
                                <div>
                                  <h3 className="font-semibold text-slate-900 text-lg mb-1">{schedule.fullName}</h3>
                                  <p className="text-sm text-slate-600 mb-1">{schedule.specialty || schedule.specialization}</p>
                                  {schedule.department && <p className="text-xs text-slate-500">{schedule.department}</p>}
                                </div>
                              </div>

                              <div className="text-right">
                                <p className="text-sm text-slate-500">{isClient && selectedDate ? getDayName(selectedDate) : ''}</p>
                                <p className="text-lg font-semibold text-slate-900">{isClient && selectedDate ? (formatDate(selectedDate) || selectedDate) : ''}</p>
                              </div>
                            </div>

                            {allTimeSlots.length === 0 ? (
                              <div className="text-center py-8 text-slate-600">
                                <p>Bác sĩ chưa đăng ký ca làm việc cho ngày này</p>
                              </div>
                            ) : (
                              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                                {allTimeSlots.map((timeSlot: string) => {
                                  const status = getSlotStatus(schedule, timeSlot);
                                  const isAvailable = status === 'available';

                                  return (
                                    <button
                                      key={timeSlot}
                                      onClick={() => isAvailable && selectedDate && handleBookSlot(schedule.id, selectedDate, timeSlot)}
                                      disabled={!isAvailable}
                                      className={`p-3 rounded-xl border text-xs font-medium transition-all ${getSlotClasses(status)} ${
                                        isAvailable ? 'hover:shadow-sm hover:-translate-y-[1px]' : ''
                                      }`}
                                      title={
                                        status === 'available'
                                          ? 'Click để đặt lịch'
                                          : status === 'booked'
                                          ? 'Đã có người đặt'
                                          : 'Bác sĩ không làm việc vào giờ này'
                                      }
                                    >
                                      <div className="flex flex-col items-center gap-1">
                                        {status === 'available' && <Check className="w-4 h-4" />}
                                        {status === 'booked' && <XIcon className="w-4 h-4" />}
                                        <span className="text-[10px]">{timeSlot.split('-')[0]}</span>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-sm">
                              <div className="flex items-center gap-4 text-slate-600">
                                <span>
                                  Còn trống: <span className="text-slate-900 font-semibold">{availableCount}</span>
                                </span>
                                <span>
                                  Đã đặt: <span className="text-slate-900 font-semibold">{bookedCount}</span>
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* My Appointments Tab */}
          {activeTab === 'my-appointments' && (
            <div className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                  { key: 'all', label: 'Tất cả', count: statusCounts.all },
                  { key: 'pending', label: 'Chờ xác nhận', count: statusCounts.pending },
                  { key: 'confirmed', label: 'Đã xác nhận', count: statusCounts.confirmed },
                  { key: 'completed', label: 'Hoàn thành', count: statusCounts.completed },
                  { key: 'cancelled', label: 'Đã hủy', count: statusCounts.cancelled },
                ].map((stat) => (
                  <button
                    key={stat.key}
                    onClick={() => setFilterStatus(stat.key)}
                    className={`p-4 rounded-2xl border transition-all text-left ${
                      filterStatus === stat.key
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300 hover:shadow-sm'
                    }`}
                  >
                    <p className="text-3xl font-bold mb-1">{stat.count}</p>
                    <p className={`text-sm ${filterStatus === stat.key ? 'text-white/90' : 'text-slate-600'}`}>{stat.label}</p>
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm theo bác sĩ hoặc lý do khám..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={UI.inputWithIcon}
                  />
                </div>
              </div>

              {/* List */}
              {appointmentsLoading ? (
                <div className={`${UI.card} flex items-center justify-center h-64`}>
                  <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredAppointments.length === 0 ? (
                <div className={`${UI.card} text-center py-16`}>
                  <Calendar className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-700 text-lg mb-2">Chưa có lịch hẹn nào</p>
                  <button onClick={() => setActiveTab('book-appointment')} className={UI.btnPrimary}>
                    Đặt lịch ngay
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {filteredAppointments.map((appointment: any) => (
                    <div
                      key={appointment._id || appointment.id}
                      className={`${UI.card} p-6 cursor-pointer ${UI.cardHover}`}
                      onClick={() => setSelectedAppointment(appointment)}
                    >
                      <div className="flex items-start justify-between mb-4 gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                            <Stethoscope className="w-6 h-6 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-900 text-lg">{appointment.doctor?.fullName || 'Bác sĩ'}</h3>
                            <p className="text-sm text-slate-600">
                              {appointment.doctor?.specialization || appointment.doctor?.specialty || 'Chuyên khoa'}
                            </p>
                          </div>
                        </div>

                        <span className={`px-3 py-1 rounded-lg text-xs font-medium ${getStatusBadge(appointment.status)}`}>
                          {getStatusName(appointment.status)}
                        </span>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-slate-700">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span className="text-sm">{formatDate(appointment.appointmentDate || appointment.date)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-700">
                          <Clock className="w-4 h-4 text-slate-400" />
                          <span className="text-sm">{appointment.timeSlot || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-700">
                          <FileText className="w-4 h-4 text-slate-400" />
                          <span className="text-sm">{appointment.reason}</span>
                        </div>
                      </div>

                      {appointment.status !== 'completed' && appointment.status !== 'cancelled' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Bạn có chắc chắn muốn hủy lịch hẹn này?')) {
                              cancelMutation.mutate({ id: appointment._id || appointment.id.toString() });
                            }
                          }}
                          className={UI.btnDangerSoft}
                        >
                          Hủy lịch hẹn
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Booking Modal */}
          {showBookingModal && (
            <div className={UI.overlay}>
              <div className={UI.modal}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className={UI.modalTitle}>Xác nhận đặt lịch</h2>
                  <button onClick={() => setShowBookingModal(false)} className={UI.modalClose}>
                    <X className="w-5 h-5 text-slate-600" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="space-y-2 text-slate-700">
                      <p>
                        <span className="font-semibold text-slate-900">Bác sĩ:</span> {findDoctorNameById(bookingData.doctorId)}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-900">Ngày:</span> {bookingData.date ? formatDate(bookingData.date) : 'Chưa chọn'}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-900">Giờ:</span> {bookingData.timeSlot}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Lý do khám <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={bookingData.reason}
                      onChange={(e) => setBookingData({ ...bookingData, reason: e.target.value })}
                      placeholder="Ví dụ: Khám tổng quát, Đau đầu, Tái khám..."
                      className={UI.input}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Triệu chứng (tùy chọn)</label>
                    <textarea
                      value={bookingData.symptoms}
                      onChange={(e) => setBookingData({ ...bookingData, symptoms: e.target.value })}
                      placeholder="Mô tả các triệu chứng bạn đang gặp phải..."
                      rows={3}
                      className={`${UI.input} resize-none`}
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button onClick={() => setShowBookingModal(false)} className={`flex-1 ${UI.btnGhost}`}>
                    Hủy
                  </button>
                  <button
                    onClick={handleConfirmBooking}
                    disabled={createMutation.isPending || !bookingData.reason}
                    className={`flex-1 px-6 py-3 rounded-xl font-semibold bg-blue-600 text-white hover:bg-blue-500 transition disabled:opacity-50`}
                  >
                    {createMutation.isPending ? 'Đang xử lý...' : 'Xác nhận đặt lịch'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Appointment Detail Modal */}
          {selectedAppointment && (
            <div className={UI.overlay}>
              <div className={`${UI.modal} max-h-[90vh] overflow-y-auto`}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className={UI.modalTitle}>Chi tiết lịch hẹn</h2>
                  <button onClick={() => setSelectedAppointment(null)} className={UI.modalClose}>
                    <X className="w-5 h-5 text-slate-600" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <Stethoscope className="w-5 h-5 text-blue-600" />
                      Thông tin bác sĩ
                    </h3>
                    <div className="space-y-2 text-slate-700">
                      <p>
                        <span className="font-medium">Tên:</span> {selectedAppointment.doctor?.fullName}
                      </p>
                      <p>
                        <span className="font-medium">Chuyên khoa:</span>{' '}
                        {selectedAppointment.doctor?.specialization || selectedAppointment.doctor?.specialty}
                      </p>
                      {selectedAppointment.doctor?.department && (
                        <p>
                          <span className="font-medium">Khoa:</span> {selectedAppointment.doctor.department}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-blue-600" />
                      Thông tin lịch hẹn
                    </h3>
                    <div className="space-y-2 text-slate-700">
                      <p>
                        <span className="font-medium">Ngày:</span>{' '}
                        {selectedAppointment?.appointmentDate || selectedAppointment?.date
                          ? formatDate(selectedAppointment.appointmentDate || selectedAppointment.date)
                          : 'N/A'}
                      </p>
                      <p>
                        <span className="font-medium">Giờ:</span> {selectedAppointment.timeSlot || 'N/A'}
                      </p>
                      <p>
                        <span className="font-medium">Lý do:</span> {selectedAppointment.reason}
                      </p>
                      {selectedAppointment.symptoms && (
                        <p>
                          <span className="font-medium">Triệu chứng:</span> {selectedAppointment.symptoms}
                        </p>
                      )}
                      <p>
                        <span className="font-medium">Trạng thái:</span>{' '}
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(selectedAppointment.status)}`}>
                          {getStatusName(selectedAppointment.status)}
                        </span>
                      </p>
                    </div>
                  </div>

                  {selectedAppointment.status !== 'completed' && selectedAppointment.status !== 'cancelled' && (
                    <button
                      onClick={() => {
                        if (confirm('Bạn có chắc chắn muốn hủy lịch hẹn này?')) {
                          cancelMutation.mutate({ id: selectedAppointment._id || selectedAppointment.id.toString() });
                        }
                      }}
                      className="w-full px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-500 transition"
                    >
                      Hủy lịch hẹn
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </PatientLayout>
  );
}
