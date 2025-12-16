'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { doctorApi, nurseApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import {
  Activity,
  CalendarClock,
  Droplets,
  HeartPulse,
  Save,
  Stethoscope,
  Thermometer,
  X,
  Plus,
  Edit,
  Trash2,
  Clock3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react';

type Appointment = {
  ma_lich_hen: string;
  thoi_gian_hen: string;
  ten_benh_nhan?: string;
  ma_benh_nhan?: string;
  ten_bac_si?: string;
  ma_bac_si?: string;
  trang_thai?: string;
  ghi_chu?: string;
};

type Vitals = {
  mach?: number | null;
  nhiet_do?: number | null;
  huyet_ap_tam_thu?: number | null;
  huyet_ap_tam_truong?: number | null;
  nhip_tho?: number | null;
  spo2?: number | null;
  chieu_cao_cm?: number | null;
  can_nang_kg?: number | null;
  bmi?: number | null;
  ghi_chu?: string | null;
};

type HoSo = {
  ma_ho_so: string;
  ma_lich_hen?: string;
  ten_benh_nhan?: string;
  ly_do_kham?: string;
  chan_doan_cuoi?: string;
  ngay_kham?: string;
  trang_thai?: string;
};

type Medication = {
  thuoc_json?: string | null;
  ghi_chu?: string | null;
  trang_thai?: string | null;
};

type Schedule = {
  ma_ca: string;
  bat_dau: string;
  ket_thuc: string;
  suc_chua?: number | null;
  trang_thai?: string;
  ma_y_ta?: string;
};

const emptyVitals: Vitals = {
  mach: null,
  nhiet_do: null,
  huyet_ap_tam_thu: null,
  huyet_ap_tam_truong: null,
  nhip_tho: null,
  spo2: null,
  chieu_cao_cm: null,
  can_nang_kg: null,
  bmi: null,
  ghi_chu: '',
};

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

const calcBMI = (height?: number | null, weight?: number | null) => {
  if (!height || !weight) return null;
  const h = height / 100;
  if (!h) return null;
  const bmi = weight / (h * h);
  if (!isFinite(bmi)) return null;
  return Number(bmi.toFixed(2));
};

export default function NurseDashboardPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const nurseName = user?.fullName || user?.username || 'Y tá';
  
  const handleLogout = () => {
    logout();
    toast.success('Đã đăng xuất thành công');
    router.push('/login');
  };
  const [tab, setTab] = useState<'appointments' | 'records' | 'schedule'>('appointments');
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [vitals, setVitals] = useState<Vitals>(emptyVitals);
  const [selectedHoSo, setSelectedHoSo] = useState<HoSo | null>(null);
  const [medication, setMedication] = useState<Medication>({});
  
  // Schedule states
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(today);
  const [scheduleFormData, setScheduleFormData] = useState({
    bat_dau: '',
    ket_thuc: '',
    suc_chua: '',
    trang_thai: 'active'
  });
  
  const getWeekStart = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = date.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    const monday = new Date(date);
    monday.setDate(date.getDate() + diff);
    return monday.toISOString().slice(0, 10);
  };
  const [weekStart, setWeekStart] = useState(getWeekStart(today));
  
  const slotPresets = [
    { label: 'Ca sáng (08:00-11:30)', start: '08:00', end: '11:30', capacity: 10 },
    { label: 'Ca chiều (13:00-16:30)', start: '13:00', end: '16:30', capacity: 10 },
    { label: 'Ca tối (17:30-20:00)', start: '17:30', end: '20:00', capacity: 8 },
  ];
  
  const buildDateTime = (date: string, time: string) => {
    if (!date || !time) return '';
    return `${date}T${time}`;
  };
  
  const isSameDay = (d1: string, d2: string) =>
    new Date(d1).toDateString() === new Date(d2).toDateString();
  
  const getWeekDays = (startDate: string) => {
    const start = new Date(startDate);
    return Array.from({ length: 7 }).map((_, idx) => {
      const d = new Date(start);
      d.setDate(start.getDate() + idx);
      return d.toISOString().slice(0, 10);
    });
  };
  
  const weekDays = getWeekDays(weekStart);
  
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };
  
  const formatTime = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const formatDateTimeFull = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'inactive':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'cancelled':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };
  
  const getStatusName = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'Đang hoạt động';
      case 'inactive':
        return 'Tạm dừng';
      case 'cancelled':
        return 'Đã hủy';
      default:
        return status || 'Chưa xác định';
    }
  };

  const getStatusConfig = (status: string) => {
    const statusLower = status?.toLowerCase() || '';
    switch (statusLower) {
      case 'in_progress':
      case 'active':
        return {
          label: 'Đang xử lý',
          className: 'bg-blue-100 text-blue-700 border-blue-200'
        };
      case 'completed':
      case 'done':
        return {
          label: 'Hoàn thành',
          className: 'bg-emerald-100 text-emerald-700 border-emerald-200'
        };
      case 'cancelled':
      case 'canceled':
        return {
          label: 'Đã hủy',
          className: 'bg-red-100 text-red-700 border-red-200'
        };
      case 'pending':
        return {
          label: 'Chờ xử lý',
          className: 'bg-amber-100 text-amber-700 border-amber-200'
        };
      default:
        return {
          label: status || 'Chưa xác định',
          className: 'bg-slate-100 text-slate-700 border-slate-200'
        };
    }
  };

  const { data: appointmentsRes, isLoading: loadingAppointments } = useQuery({
    queryKey: ['nurse-appointments'],
    queryFn: async () => {
      const res = await doctorApi.getAppointments();
      return res.data?.data || res.data || [];
    },
  });

  const { data: hoSoRes, isLoading: loadingHoSo } = useQuery({
    queryKey: ['nurse-ho-so'],
    queryFn: async () => {
      const res = await nurseApi.getHoSoKham();
      return res.data?.data || res.data || [];
    },
  });

  // Schedule queries
  const { data: schedulesData, isLoading: loadingSchedules } = useQuery({
    queryKey: ['nurse-schedule'],
    queryFn: async () => {
      const res = await nurseApi.getSchedule();
      return res.data;
    },
  });

  const schedules = schedulesData?.data || [];
  const selectedDaySchedules = schedules.filter((s: any) =>
    isSameDay(s.bat_dau, selectedDate)
  );

  // Schedule mutations
  const createScheduleMutation = useMutation({
    mutationFn: (data: any) => nurseApi.createSchedule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nurse-schedule'] });
      toast.success('Đăng ký ca làm việc thành công!');
      setShowScheduleModal(false);
      resetScheduleForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi đăng ký ca làm việc');
    }
  });

  const updateScheduleMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => nurseApi.updateSchedule(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nurse-schedule'] });
      toast.success('Cập nhật ca làm việc thành công!');
      setEditingSchedule(null);
      setShowScheduleModal(false);
      resetScheduleForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi cập nhật');
    }
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: (id: string) => nurseApi.deleteSchedule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nurse-schedule'] });
      toast.success('Xóa ca làm việc thành công!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi xóa');
    }
  });

  const resetScheduleForm = () => {
    setScheduleFormData({
      bat_dau: '',
      ket_thuc: '',
      suc_chua: '',
      trang_thai: 'active'
    });
    setSelectedDate(today);
    setWeekStart(getWeekStart(today));
  };

  const handleEditSchedule = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    const start = schedule.bat_dau ? new Date(schedule.bat_dau) : null;
    setScheduleFormData({
      bat_dau: schedule.bat_dau ? new Date(schedule.bat_dau).toISOString().slice(0, 16) : '',
      ket_thuc: schedule.ket_thuc ? new Date(schedule.ket_thuc).toISOString().slice(0, 16) : '',
      suc_chua: schedule.suc_chua?.toString() || '',
      trang_thai: schedule.trang_thai || 'active'
    });
    if (start) {
      setSelectedDate(start.toISOString().slice(0, 10));
      setWeekStart(getWeekStart(start.toISOString().slice(0, 10)));
    }
    setShowScheduleModal(true);
  };

  const handleDeleteSchedule = (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa ca làm việc này?')) {
      deleteScheduleMutation.mutate(id);
    }
  };

  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!scheduleFormData.bat_dau || !scheduleFormData.ket_thuc) {
      toast.error('Vui lòng nhập đầy đủ thời gian bắt đầu và kết thúc');
      return;
    }

    if (new Date(scheduleFormData.bat_dau).getTime() >= new Date(scheduleFormData.ket_thuc).getTime()) {
      toast.error('Thời gian bắt đầu phải trước thời gian kết thúc');
      return;
    }

    const now = Date.now();
    if (new Date(scheduleFormData.bat_dau).getTime() < now) {
      toast.error('Không thể đăng ký ca trong thời gian đã qua');
      return;
    }

    const submitData = {
      bat_dau: new Date(scheduleFormData.bat_dau).toISOString(),
      ket_thuc: new Date(scheduleFormData.ket_thuc).toISOString(),
      suc_chua: scheduleFormData.suc_chua ? parseInt(scheduleFormData.suc_chua) : null,
      trang_thai: scheduleFormData.trang_thai
    };

    // Kiểm tra trùng giờ với ca khác
    const newStart = new Date(submitData.bat_dau).getTime();
    const newEnd = new Date(submitData.ket_thuc).getTime();
    const isOverlap = schedules.some((s: any) => {
      if (editingSchedule && s.ma_ca === editingSchedule.ma_ca) return false;
      const sStart = new Date(s.bat_dau).getTime();
      const sEnd = new Date(s.ket_thuc).getTime();
      const sameDay = new Date(s.bat_dau).toDateString() === new Date(submitData.bat_dau).toDateString();
      if (!sameDay) return false;
      return newStart < sEnd && newEnd > sStart;
    });
    if (isOverlap) {
      toast.error('Ca làm việc bị trùng thời gian với ca khác trong ngày này');
      return;
    }

    if (editingSchedule) {
      updateScheduleMutation.mutate({ id: editingSchedule.ma_ca, data: submitData });
    } else {
      createScheduleMutation.mutate(submitData);
    }
  };

  const groupedSchedules = schedules.reduce((acc: any, schedule: any) => {
    const date = new Date(schedule.bat_dau).toDateString();
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(schedule);
    return acc;
  }, {});

  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);

  const upcomingAppointments: Appointment[] = useMemo(() => {
    const list: Appointment[] = appointmentsRes || [];
    return list
      .filter((apt) => {
        const time = new Date(apt.thoi_gian_hen);
        return time.getTime() >= todayDate.getTime();
      })
      .sort((a, b) => new Date(a.thoi_gian_hen).getTime() - new Date(b.thoi_gian_hen).getTime());
  }, [appointmentsRes, todayDate]);

  const { data: vitalsRes, isFetching: loadingVitals } = useQuery({
    queryKey: ['nurse-vitals', selected?.ma_lich_hen],
    enabled: !!selected?.ma_lich_hen,
    queryFn: async () => {
      const res = await nurseApi.getVitals({ ma_lich_hen: selected?.ma_lich_hen });
      return res.data?.data || res.data;
    },
  });

  const { data: medRes, isFetching: loadingMed } = useQuery({
    queryKey: ['nurse-medications', selectedHoSo?.ma_ho_so || selected?.ma_lich_hen],
    enabled: !!selectedHoSo?.ma_ho_so || !!selected?.ma_lich_hen,
    queryFn: async () => {
      const res = await nurseApi.getMedications({
        ma_ho_so: selectedHoSo?.ma_ho_so,
        ma_lich_hen: selected?.ma_lich_hen,
      });
      return res.data?.data || res.data;
    },
  });

  useEffect(() => {
    if (vitalsRes) {
      setVitals({
        mach: vitalsRes.mach ?? null,
        nhiet_do: vitalsRes.nhiet_do ?? null,
        huyet_ap_tam_thu: vitalsRes.huyet_ap_tam_thu ?? null,
        huyet_ap_tam_truong: vitalsRes.huyet_ap_tam_truong ?? null,
        nhip_tho: vitalsRes.nhip_tho ?? null,
        spo2: vitalsRes.spo2 ?? null,
        chieu_cao_cm: vitalsRes.chieu_cao_cm ?? null,
        can_nang_kg: vitalsRes.can_nang_kg ?? null,
        bmi: vitalsRes.bmi ?? null,
        ghi_chu: vitalsRes.ghi_chu ?? '',
      });
    } else {
      setVitals(emptyVitals);
    }
  }, [vitalsRes, selected?.ma_lich_hen]);

  useEffect(() => {
    if (medRes) {
      setMedication({
        thuoc_json: medRes.thuoc_json || '',
        ghi_chu: medRes.ghi_chu || '',
        trang_thai: medRes.trang_thai || 'dispensed',
      });
    } else {
      setMedication({});
    }
  }, [medRes, selectedHoSo?.ma_ho_so, selected?.ma_lich_hen]);

  // Auto compute BMI when height/weight change
  useEffect(() => {
    const bmiValue = calcBMI(vitals.chieu_cao_cm ?? null, vitals.can_nang_kg ?? null);
    if (bmiValue !== null && bmiValue !== vitals.bmi) {
      setVitals((prev) => ({ ...prev, bmi: bmiValue }));
    }
  }, [vitals.chieu_cao_cm, vitals.can_nang_kg]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveMutation = useMutation({
    mutationFn: async (body: any) => nurseApi.upsertVitals(body),
    onSuccess: async () => {
      toast.success('Đã lưu sinh hiệu');
      await queryClient.invalidateQueries({ queryKey: ['nurse-vitals', selected?.ma_lich_hen] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Lưu sinh hiệu thất bại');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected?.ma_lich_hen) return;
    saveMutation.mutate({
      ma_lich_hen: selected.ma_lich_hen,
      ...vitals,
    });
  };

  const saveMedicationMutation = useMutation({
    mutationFn: async (body: any) => nurseApi.upsertMedications(body),
    onSuccess: async () => {
      toast.success('Đã lưu cấp thuốc');
      await queryClient.invalidateQueries({ queryKey: ['nurse-medications', selectedHoSo?.ma_ho_so || selected?.ma_lich_hen] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Lưu cấp thuốc thất bại'),
  });

  const handleSaveMedication = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      ma_ho_so: selectedHoSo?.ma_ho_so,
      ma_lich_hen: selected?.ma_lich_hen || selectedHoSo?.ma_lich_hen,
      thuoc_json: medication.thuoc_json || null,
      ghi_chu: medication.ghi_chu || null,
      trang_thai: medication.trang_thai || 'dispensed',
    };
    if (!payload.ma_ho_so && !payload.ma_lich_hen) {
      toast.error('Cần chọn hồ sơ hoặc lịch hẹn để lưu cấp thuốc');
      return;
    }
    saveMedicationMutation.mutate(payload);
  };

  const measuredCount = useMemo(() => (appointmentsRes?.filter?.((apt: any) => apt.ma_lich_hen && apt.hasVitals) || []).length, [appointmentsRes]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-slate-500">Y tá: {nurseName}</p>
              <h1 className="text-2xl font-bold text-slate-900">Danh sách bệnh nhân sắp khám</h1>
              <p className="text-slate-600">Đo sinh hiệu trước khi bác sĩ bắt đầu khám.</p>
              {user?.email && (
                <p className="mt-1 text-xs text-slate-500">
                  Email: {user.email}
                </p>
              )}
              <div className="mt-3 flex items-center gap-3">
                <Link
                  href="/nurse/profile"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:border-cyan-300 hover:text-cyan-700"
                >
                  Xem / cập nhật thông tin cá nhân
                </Link>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 hover:border-red-300 hover:bg-red-100 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Đăng xuất
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
                <CalendarClock className="h-4 w-4" />
                {upcomingAppointments.length} lịch hẹn
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
                <HeartPulse className="h-4 w-4" />
                {measuredCount || 0} đã đo
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => setTab('appointments')}
              className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                tab === 'appointments' ? 'bg-cyan-100 text-cyan-800 border border-cyan-200' : 'bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              Lịch hẹn & sinh hiệu
            </button>
            <button
              onClick={() => setTab('records')}
              className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                tab === 'records' ? 'bg-cyan-100 text-cyan-800 border border-cyan-200' : 'bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              Hồ sơ khám & cấp thuốc
            </button>
            <button
              onClick={() => setTab('schedule')}
              className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                tab === 'schedule' ? 'bg-cyan-100 text-cyan-800 border border-cyan-200' : 'bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              Lịch làm việc
            </button>
          </div>
        </div>

        {tab === 'appointments' && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-cyan-600" />
                Lịch hẹn (từ hôm nay trở đi)
              </h2>
              <div className="text-sm text-slate-600">Chọn lịch hẹn để nhập sinh hiệu</div>
            </div>

            {loadingAppointments ? (
              <div className="flex h-40 items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent" />
              </div>
            ) : upcomingAppointments.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-600">
                Không có lịch hẹn cần đo sinh hiệu.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {upcomingAppointments.map((apt) => (
                  <button
                    key={apt.ma_lich_hen}
                    onClick={() => setSelected(apt)}
                    className={`flex flex-col rounded-xl border p-4 text-left transition-all ${
                      selected?.ma_lich_hen === apt.ma_lich_hen
                        ? 'border-cyan-400 bg-cyan-50 shadow-sm'
                        : 'border-slate-200 bg-slate-50 hover:border-cyan-300 hover:bg-cyan-50/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-slate-900">{apt.ten_benh_nhan || 'Bệnh nhân'}</div>
                      <span className="text-[11px] font-medium text-slate-600 bg-white border border-slate-200 px-2 py-1 rounded-lg">
                        {apt.trang_thai || 'pending'}
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-slate-700">
                      <CalendarClock className="mr-1 inline h-4 w-4 text-cyan-600" />
                      {formatDateTime(apt.thoi_gian_hen)}
                    </div>
                    <div className="mt-1 text-xs text-slate-600">Bác sĩ: {apt.ten_bac_si || apt.ma_bac_si || 'Chưa rõ'}</div>
                    {apt.ghi_chu && <div className="mt-2 text-xs text-slate-500 line-clamp-2">Ghi chú: {apt.ghi_chu}</div>}
                  </button>
                ))}
              </div>
            )}

            {selected && (
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <HeartPulse className="h-5 w-5 text-rose-500" />
                  Nhập sinh hiệu
                </h3>
                <p className="text-sm text-slate-600">
                  Bệnh nhân: <span className="font-semibold text-slate-900">{selected.ten_benh_nhan || '---'}</span> ·{' '}
                  {formatDateTime(selected.thoi_gian_hen)}
                </p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
                Đóng
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <label className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <span className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                    <HeartPulse className="h-4 w-4 text-rose-500" />
                    Mạch (lần/phút)
                  </span>
                  <input
                    type="number"
                    value={vitals.mach ?? ''}
                    onChange={(e) => setVitals((prev) => ({ ...prev, mach: e.target.value ? Number(e.target.value) : null }))}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200"
                    min={0}
                    step="1"
                  />
                </label>

                <label className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <span className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                    <Thermometer className="h-4 w-4 text-amber-500" />
                    Nhiệt độ (°C)
                  </span>
                  <input
                    type="number"
                    value={vitals.nhiet_do ?? ''}
                    onChange={(e) => setVitals((prev) => ({ ...prev, nhiet_do: e.target.value ? Number(e.target.value) : null }))}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200"
                    step="0.1"
                  />
                </label>

                <label className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <span className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                    <Droplets className="h-4 w-4 text-indigo-500" />
                    Huyết áp (tâm thu/tâm trương)
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={vitals.huyet_ap_tam_thu ?? ''}
                      onChange={(e) => setVitals((prev) => ({ ...prev, huyet_ap_tam_thu: e.target.value ? Number(e.target.value) : null }))}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200"
                      placeholder="120"
                    />
                    <span className="text-sm text-slate-500">/</span>
                    <input
                      type="number"
                      value={vitals.huyet_ap_tam_truong ?? ''}
                      onChange={(e) => setVitals((prev) => ({ ...prev, huyet_ap_tam_truong: e.target.value ? Number(e.target.value) : null }))}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200"
                      placeholder="80"
                    />
                  </div>
                </label>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <label className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <span className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-emerald-500" />
                    Nhịp thở (lần/phút)
                  </span>
                  <input
                    type="number"
                    value={vitals.nhip_tho ?? ''}
                    onChange={(e) => setVitals((prev) => ({ ...prev, nhip_tho: e.target.value ? Number(e.target.value) : null }))}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200"
                    min={0}
                    step="1"
                  />
                </label>

                <label className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <span className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                    <HeartPulse className="h-4 w-4 text-rose-500" />
                    SpO₂ (%)
                  </span>
                  <input
                    type="number"
                    value={vitals.spo2 ?? ''}
                    onChange={(e) => setVitals((prev) => ({ ...prev, spo2: e.target.value ? Number(e.target.value) : null }))}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200"
                    min={0}
                    max={100}
                    step="1"
                  />
                </label>

                <label className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <span className="text-sm font-semibold text-slate-800">Ghi chú</span>
                  <textarea
                    value={vitals.ghi_chu || ''}
                    onChange={(e) => setVitals((prev) => ({ ...prev, ghi_chu: e.target.value }))}
                    className="h-20 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200"
                    placeholder="Ghi chú nhanh (nếu có)"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <label className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <span className="text-sm font-semibold text-slate-800">Chiều cao (cm)</span>
                  <input
                    type="number"
                    value={vitals.chieu_cao_cm ?? ''}
                    onChange={(e) => setVitals((prev) => ({ ...prev, chieu_cao_cm: e.target.value ? Number(e.target.value) : null }))}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200"
                    step="0.1"
                    min={0}
                  />
                </label>

                <label className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <span className="text-sm font-semibold text-slate-800">Cân nặng (kg)</span>
                  <input
                    type="number"
                    value={vitals.can_nang_kg ?? ''}
                    onChange={(e) => setVitals((prev) => ({ ...prev, can_nang_kg: e.target.value ? Number(e.target.value) : null }))}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200"
                    step="0.1"
                    min={0}
                  />
                </label>

                <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <span className="text-sm font-semibold text-slate-800">BMI</span>
                  <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900">
                    {vitals.bmi ?? '-'}
                  </div>
                  <p className="text-xs text-slate-500">Tự tính khi có chiều cao & cân nặng</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-5 py-3 text-sm font-semibold text-white transition-all hover:from-cyan-500 hover:to-blue-500 disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {saveMutation.isPending ? 'Đang lưu...' : 'Lưu sinh hiệu'}
                </button>
                {loadingVitals && <span className="text-sm text-slate-500">Đang tải sinh hiệu...</span>}
              </div>
            </form>
          </div>
        )}
          </div>
        )}

        {tab === 'records' && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <Stethoscope className="h-5 w-5 text-cyan-600" />
                  Tất cả hồ sơ khám
                </h2>
                <p className="text-sm text-slate-600 mt-1">Hiển thị tất cả hồ sơ khám với mọi trạng thái</p>
              </div>
              {hoSoRes && hoSoRes.length > 0 && (
                <div className="text-sm font-semibold text-cyan-700 bg-cyan-50 px-4 py-2 rounded-lg border border-cyan-200">
                  Tổng: {hoSoRes.length} hồ sơ
                </div>
              )}
            </div>
            {loadingHoSo ? (
              <div className="flex h-32 items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent" />
              </div>
            ) : !hoSoRes?.length ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-600">
                Chưa có hồ sơ khám.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {(hoSoRes as HoSo[]).map((hs) => {
                  const status = hs.trang_thai || 'in_progress';
                  const statusConfig = getStatusConfig(status);
                  
                  return (
                    <button
                      key={hs.ma_ho_so}
                      onClick={() => {
                        setSelectedHoSo(hs);
                        setSelected((prev) => prev); // giữ lịch hẹn hiện có
                      }}
                      className={`flex flex-col rounded-xl border p-4 text-left transition-all ${
                        selectedHoSo?.ma_ho_so === hs.ma_ho_so
                          ? 'border-cyan-400 bg-cyan-50 shadow-sm'
                          : 'border-slate-200 bg-slate-50 hover:border-cyan-300 hover:bg-cyan-50/60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="text-sm font-semibold text-slate-900 truncate">{hs.ten_benh_nhan || 'Bệnh nhân'}</div>
                        <span className={`text-[11px] font-medium px-2 py-1 rounded-lg border flex-shrink-0 ${statusConfig.className}`}>
                          {statusConfig.label}
                        </span>
                      </div>
                      <div className="mt-1 text-sm text-slate-700">
                        <span className="font-medium">Ngày khám:</span> {hs.ngay_kham ? formatDate(hs.ngay_kham) : '---'}
                      </div>
                      <div className="mt-1 text-xs text-slate-600 line-clamp-2">
                        <span className="font-medium">Lý do:</span> {hs.ly_do_kham || '---'}
                      </div>
                      <div className="mt-1 text-xs text-slate-600 line-clamp-2">
                        <span className="font-medium">Chẩn đoán:</span> {hs.chan_doan_cuoi || hs.ly_do_kham || '---'}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {selectedHoSo && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Thông tin hồ sơ</h3>
                    <p className="text-sm text-slate-600">
                      BN: {selectedHoSo.ten_benh_nhan || '---'} · Mã hồ sơ: {selectedHoSo.ma_ho_so}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedHoSo(null)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Đóng
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="rounded-xl bg-white p-3 text-sm text-slate-700">
                    <div className="font-semibold text-slate-900">Lý do khám</div>
                    <div>{selectedHoSo.ly_do_kham || '---'}</div>
                  </div>
                  <div className="rounded-xl bg-white p-3 text-sm text-slate-700">
                    <div className="font-semibold text-slate-900">Chẩn đoán</div>
                    <div>{selectedHoSo.chan_doan_cuoi || selectedHoSo.ly_do_kham || '---'}</div>
                  </div>
                </div>

                <form onSubmit={handleSaveMedication} className="space-y-3">
                  <div className="text-base font-semibold text-slate-900 flex items-center gap-2">
                    <HeartPulse className="h-4 w-4 text-rose-500" />
                    Cấp thuốc theo toa
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <label className="flex flex-col gap-2 text-sm text-slate-800">
                      Thuốc (JSON hoặc danh sách)
                      <textarea
                        value={medication.thuoc_json || ''}
                        onChange={(e) => setMedication((prev) => ({ ...prev, thuoc_json: e.target.value }))}
                        className="min-h-[120px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200"
                        placeholder='Ví dụ: [{"ten":"Paracetamol 500mg","so_luong":10,"huong_dan":"Uống sau ăn"}]'
                      />
                    </label>
                    <div className="flex flex-col gap-2 text-sm text-slate-800">
                      Ghi chú
                      <textarea
                        value={medication.ghi_chu || ''}
                        onChange={(e) => setMedication((prev) => ({ ...prev, ghi_chu: e.target.value }))}
                        className="h-full min-h-[120px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200"
                        placeholder="Ghi chú thêm (đã giao đủ, thiếu thuốc, hướng dẫn bệnh nhân...)"
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <select
                      value={medication.trang_thai || 'dispensed'}
                      onChange={(e) => setMedication((prev) => ({ ...prev, trang_thai: e.target.value }))}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200"
                    >
                      <option value="dispensed">Đã cấp</option>
                      <option value="partial">Cấp một phần</option>
                      <option value="pending">Chờ cấp</option>
                    </select>
                    <button
                      type="submit"
                      disabled={saveMedicationMutation.isPending}
                      className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-5 py-3 text-sm font-semibold text-white transition-all hover:from-cyan-500 hover:to-blue-500 disabled:opacity-60"
                    >
                      <Save className="h-4 w-4" />
                      {saveMedicationMutation.isPending ? 'Đang lưu...' : 'Lưu cấp thuốc'}
                    </button>
                    {loadingMed && <span className="text-sm text-slate-500">Đang tải thông tin cấp thuốc...</span>}
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {tab === 'schedule' && (
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Lịch làm việc của tôi</h2>
                  <p className="mt-2 text-slate-600">Đăng ký và quản lý các ca làm việc của bạn.</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    {schedules.length} ca đã đăng ký
                  </div>
                  <button
                    onClick={() => {
                      setEditingSchedule(null);
                      resetScheduleForm();
                      setShowScheduleModal(true);
                    }}
                    className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-cyan-500 hover:to-blue-500 transition-all shadow-lg flex items-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Đăng ký ca mới
                  </button>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      const prevWeek = new Date(weekStart);
                      prevWeek.setDate(prevWeek.getDate() - 7);
                      const newStart = prevWeek.toISOString().slice(0, 10);
                      setWeekStart(newStart);
                      setSelectedDate(newStart);
                    }}
                    className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-100"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="text-sm font-semibold text-slate-800">
                    Tuần {formatDate(weekStart)} - {formatDate(weekDays[6])}
                  </div>
                  <button
                    onClick={() => {
                      const nextWeek = new Date(weekStart);
                      nextWeek.setDate(nextWeek.getDate() + 7);
                      const newStart = nextWeek.toISOString().slice(0, 10);
                      setWeekStart(newStart);
                      setSelectedDate(newStart);
                    }}
                    className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-100"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedDate(today);
                      setWeekStart(getWeekStart(today));
                    }}
                    className="text-xs font-semibold px-3 py-2 rounded-lg bg-white border border-cyan-200 text-cyan-700 hover:bg-cyan-50"
                  >
                    Hôm nay
                  </button>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-700">
                  <div className="px-3 py-2 rounded-lg bg-white border border-slate-200">
                    Ngày chọn: <span className="font-semibold text-cyan-700">{formatDate(selectedDate)}</span>
                  </div>
                  <div className="px-3 py-2 rounded-lg bg-white border border-slate-200">
                    {selectedDaySchedules.length} ca trong ngày
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 md:grid-cols-7 gap-2">
                {weekDays.map((day) => {
                  const daySchedules = schedules.filter((s: any) => isSameDay(s.bat_dau, day));
                  const isSelected = isSameDay(day, selectedDate);
                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDate(day)}
                      className={`rounded-xl border px-3 py-3 text-left transition-all ${
                        isSelected
                          ? 'border-cyan-400 bg-cyan-50 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-cyan-300 hover:bg-cyan-50/60'
                      }`}
                    >
                      <div className="text-xs text-slate-500">
                        {new Date(day).toLocaleDateString('vi-VN', { weekday: 'short' })}
                      </div>
                      <div className="text-sm font-semibold text-slate-900">
                        {new Date(day).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                      </div>
                      <div className="mt-1 text-xs text-slate-600">{daySchedules.length} ca</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {loadingSchedules ? (
              <div className="flex items-center justify-center h-64">
                <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : schedules.length === 0 ? (
              <div className="text-center py-16 rounded-2xl bg-white border border-slate-200">
                <CalendarDays className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600 text-lg mb-2">Chưa có ca làm việc nào</p>
                <p className="text-slate-500 text-sm mb-4">Hãy đăng ký ca làm việc đầu tiên của bạn</p>
                <button
                  onClick={() => {
                    setEditingSchedule(null);
                    resetScheduleForm();
                    setShowScheduleModal(true);
                  }}
                  className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-cyan-500 hover:to-blue-500 transition-all"
                >
                  Đăng ký ca mới
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                      <CalendarDays className="w-5 h-5 text-cyan-600" />
                      Ca trong ngày {formatDate(selectedDate)}
                    </h3>
                    <div className="text-sm text-slate-600">
                      {selectedDaySchedules.length} ca · {schedules.length} ca toàn bộ
                    </div>
                  </div>
                  {selectedDaySchedules.length === 0 ? (
                    <div className="text-sm text-slate-600">Chưa có ca trong ngày này.</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {selectedDaySchedules.map((schedule: any) => (
                        <div
                          key={schedule.ma_ca}
                          className="rounded-xl border border-slate-200 bg-slate-50 p-5 hover:shadow-md transition-all"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Clock3 className="w-4 h-4 text-slate-500" />
                                <span className="text-sm font-semibold text-slate-900">
                                  {formatTime(schedule.bat_dau)} - {formatTime(schedule.ket_thuc)}
                                </span>
                              </div>
                              {schedule.suc_chua && (
                                <div className="text-xs text-slate-600 mb-2">
                                  Sức chứa: {schedule.suc_chua} bệnh nhân
                                </div>
                              )}
                              <span className={`inline-block px-2 py-1 rounded text-xs font-medium border ${getStatusColor(schedule.trang_thai)}`}>
                                {getStatusName(schedule.trang_thai)}
                              </span>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEditSchedule(schedule)}
                                className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                                title="Chỉnh sửa"
                              >
                                <Edit className="w-4 h-4 text-blue-600" />
                              </button>
                              <button
                                onClick={() => handleDeleteSchedule(schedule.ma_ca)}
                                className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                                title="Xóa"
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </button>
                            </div>
                          </div>
                          <div className="text-xs text-slate-500">
                            Đăng ký: {formatDateTimeFull(schedule.bat_dau)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-cyan-600" />
                    Toàn bộ ca đã đăng ký
                  </h3>
                  <div className="space-y-6">
                    {Object.entries(groupedSchedules).map(([date, daySchedules]: [string, any]) => (
                      <div key={date} className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                        <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                          <Clock3 className="w-4 h-4 text-slate-500" />
                          {formatDate(daySchedules[0].bat_dau)}
                          <span className="text-xs font-medium text-slate-500">({daySchedules.length} ca)</span>
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {daySchedules.map((schedule: any) => (
                            <div
                              key={schedule.ma_ca}
                              className="rounded-lg border border-slate-200 bg-white p-4 hover:border-cyan-200 transition-colors"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="text-sm font-semibold text-slate-900">
                                  {formatTime(schedule.bat_dau)} - {formatTime(schedule.ket_thuc)}
                                </div>
                                <span className={`inline-block px-2 py-1 rounded text-[11px] font-medium border ${getStatusColor(schedule.trang_thai)}`}>
                                  {getStatusName(schedule.trang_thai)}
                                </span>
                              </div>
                              {schedule.suc_chua && (
                                <div className="text-xs text-slate-600">Sức chứa: {schedule.suc_chua}</div>
                              )}
                              <div className="flex gap-2 mt-3">
                                <button
                                  onClick={() => handleEditSchedule(schedule)}
                                  className="flex-1 text-xs font-semibold px-3 py-2 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-700"
                                >
                                  Chỉnh sửa
                                </button>
                                <button
                                  onClick={() => handleDeleteSchedule(schedule.ma_ca)}
                                  className="flex-1 text-xs font-semibold px-3 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600"
                                >
                                  Xóa
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Schedule Modal */}
            {showScheduleModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <div className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 p-6 shadow-xl">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-slate-900">
                      {editingSchedule ? 'Chỉnh sửa ca làm việc' : 'Đăng ký ca làm việc mới'}
                    </h2>
                    <button
                      onClick={() => {
                        setShowScheduleModal(false);
                        setEditingSchedule(null);
                        resetScheduleForm();
                      }}
                      className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5 text-slate-500" />
                    </button>
                  </div>

                  <form onSubmit={handleScheduleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Chọn ngày</label>
                        <input
                          type="date"
                          value={selectedDate}
                          min={today}
                          onChange={(e) => {
                            setSelectedDate(e.target.value);
                            setWeekStart(getWeekStart(e.target.value));
                            if (scheduleFormData.bat_dau) {
                              const timeStart = scheduleFormData.bat_dau.split('T')[1];
                              const timeEnd = scheduleFormData.ket_thuc.split('T')[1];
                              setScheduleFormData((prev) => ({
                                ...prev,
                                bat_dau: buildDateTime(e.target.value, timeStart),
                                ket_thuc: buildDateTime(e.target.value, timeEnd),
                              }));
                            }
                          }}
                          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Thời gian bắt đầu <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="datetime-local"
                          value={scheduleFormData.bat_dau}
                          min={`${today}T00:00`}
                          onChange={(e) => setScheduleFormData({ ...scheduleFormData, bat_dau: e.target.value })}
                          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Thời gian kết thúc <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="datetime-local"
                          value={scheduleFormData.ket_thuc}
                          min={scheduleFormData.bat_dau || `${today}T00:00`}
                          onChange={(e) => setScheduleFormData({ ...scheduleFormData, ket_thuc: e.target.value })}
                          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                          required
                        />
                      </div>
                    </div>

                    {/* Quick presets */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {slotPresets.map((slot) => (
                        <button
                          key={slot.label}
                          type="button"
                          onClick={() => {
                            const start = buildDateTime(selectedDate, slot.start);
                            const end = buildDateTime(selectedDate, slot.end);
                            setScheduleFormData((prev) => ({
                              ...prev,
                              bat_dau: start,
                              ket_thuc: end,
                              suc_chua: prev.suc_chua || slot.capacity.toString(),
                            }));
                          }}
                          className="p-3 rounded-xl border border-slate-200 hover:border-cyan-400 hover:bg-cyan-50 text-left text-sm font-semibold transition-colors"
                        >
                          <div className="text-slate-900">{slot.label}</div>
                          <div className="text-xs text-slate-600">Gợi ý sức chứa: {slot.capacity}</div>
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Sức chứa (số bệnh nhân tối đa)
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={scheduleFormData.suc_chua}
                          onChange={(e) => setScheduleFormData({ ...scheduleFormData, suc_chua: e.target.value })}
                          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                          placeholder="Ví dụ: 10"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Trạng thái
                        </label>
                        <select
                          value={scheduleFormData.trang_thai}
                          onChange={(e) => setScheduleFormData({ ...scheduleFormData, trang_thai: e.target.value })}
                          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                        >
                          <option value="active">Đang hoạt động</option>
                          <option value="inactive">Tạm dừng</option>
                          <option value="cancelled">Đã hủy</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setShowScheduleModal(false);
                          setEditingSchedule(null);
                          resetScheduleForm();
                        }}
                        className="flex-1 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-colors"
                      >
                        Hủy
                      </button>
                      <button
                        type="submit"
                        disabled={createScheduleMutation.isPending || updateScheduleMutation.isPending}
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-semibold hover:from-cyan-500 hover:to-blue-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <Save className="w-5 h-5" />
                        {createScheduleMutation.isPending || updateScheduleMutation.isPending
                          ? 'Đang xử lý...'
                          : editingSchedule
                          ? 'Cập nhật'
                          : 'Đăng ký'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

