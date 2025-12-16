'use client';

import { useState, useEffect } from 'react';
import { DoctorLayout } from '@/components/Layout/DoctorLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { doctorApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import {
  Clock3,
  CalendarDays,
  Activity,
  Plus,
  Edit,
  Trash2,
  X,
  Save,
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export default function DoctorSchedulePage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<any>(null);
  const today = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(today);
  const getWeekStart = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = date.getDay();
    const diff = (day === 0 ? -6 : 1) - day; // Monday as first day
    const monday = new Date(date);
    monday.setDate(date.getDate() + diff);
    return monday.toISOString().slice(0, 10);
  };

  const [formData, setFormData] = useState({
    bat_dau: '',
    ket_thuc: '',
    suc_chua: '',
    trang_thai: 'active'
  });
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

  // Fetch schedules
  const { data: schedulesData, isLoading } = useQuery({
    queryKey: ['doctor-schedule'],
    queryFn: async () => {
      const response = await doctorApi.getSchedule();
      return response.data;
    },
  });

  const schedules = schedulesData?.data || [];
  const selectedDaySchedules = schedules.filter((s: any) =>
    isSameDay(s.bat_dau, selectedDate)
  );

  // Create schedule mutation
  const createMutation = useMutation({
    mutationFn: (data: any) => doctorApi.createSchedule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-schedule'] });
      toast.success('Đăng ký ca làm việc thành công!');
      setShowAddModal(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi đăng ký ca làm việc');
    }
  });

  // Update schedule mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => doctorApi.updateSchedule(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-schedule'] });
      toast.success('Cập nhật ca làm việc thành công!');
      setEditingSchedule(null);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi cập nhật');
    }
  });

  // Delete schedule mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => doctorApi.deleteSchedule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-schedule'] });
      toast.success('Xóa ca làm việc thành công!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi xóa');
    }
  });

  const resetForm = () => {
    setFormData({
      bat_dau: '',
      ket_thuc: '',
      suc_chua: '',
      trang_thai: 'active'
    });
    setSelectedDate(today);
    setWeekStart(getWeekStart(today));
  };

  const handleEdit = (schedule: any) => {
    setEditingSchedule(schedule);
    const start = schedule.bat_dau ? new Date(schedule.bat_dau) : null;
    setFormData({
      bat_dau: schedule.bat_dau ? new Date(schedule.bat_dau).toISOString().slice(0, 16) : '',
      ket_thuc: schedule.ket_thuc ? new Date(schedule.ket_thuc).toISOString().slice(0, 16) : '',
      suc_chua: schedule.suc_chua?.toString() || '',
      trang_thai: schedule.trang_thai || 'active'
    });
    if (start) {
      setSelectedDate(start.toISOString().slice(0, 10));
      setWeekStart(getWeekStart(start.toISOString().slice(0, 10)));
    }
    setShowAddModal(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa ca làm việc này?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.bat_dau || !formData.ket_thuc) {
      toast.error('Vui lòng nhập đầy đủ thời gian bắt đầu và kết thúc');
      return;
    }

    if (new Date(formData.bat_dau).getTime() >= new Date(formData.ket_thuc).getTime()) {
      toast.error('Thời gian bắt đầu phải trước thời gian kết thúc');
      return;
    }

    const now = Date.now();
    if (new Date(formData.bat_dau).getTime() < now) {
      toast.error('Không thể đăng ký ca trong thời gian đã qua');
      return;
    }

    const submitData = {
      bat_dau: new Date(formData.bat_dau).toISOString(),
      ket_thuc: new Date(formData.ket_thuc).toISOString(),
      suc_chua: formData.suc_chua ? parseInt(formData.suc_chua) : null,
      trang_thai: formData.trang_thai
    };

    // Kiểm tra trùng giờ với ca khác
    const newStart = new Date(submitData.bat_dau).getTime();
    const newEnd = new Date(submitData.ket_thuc).getTime();
    const isOverlap = schedules.some((s: any) => {
      if (editingSchedule && s.ma_ca === editingSchedule.ma_ca) return false;
      const sStart = new Date(s.bat_dau).getTime();
      const sEnd = new Date(s.ket_thuc).getTime();
      // cùng ngày
      const sameDay = new Date(s.bat_dau).toDateString() === new Date(submitData.bat_dau).toDateString();
      if (!sameDay) return false;
      return newStart < sEnd && newEnd > sStart;
    });
    if (isOverlap) {
      toast.error('Ca làm việc bị trùng thời gian với ca khác trong ngày này');
      return;
    }

    if (editingSchedule) {
      updateMutation.mutate({ id: editingSchedule.ma_ca, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const formatDateTime = (dateStr: string) => {
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

  // Group schedules by date
  const groupedSchedules = schedules.reduce((acc: any, schedule: any) => {
    const date = new Date(schedule.bat_dau).toDateString();
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(schedule);
    return acc;
  }, {});

  const hasOverlapOnDate = (dateStr: string, start: string, end: string) => {
    const targetStart = new Date(`${dateStr}T${start}`).getTime();
    const targetEnd = new Date(`${dateStr}T${end}`).getTime();
    return schedules.some((s: any) => {
      if (editingSchedule && s.ma_ca === editingSchedule.ma_ca) return false;
      const sameDay = isSameDay(s.bat_dau, dateStr);
      if (!sameDay) return false;
      const sStart = new Date(s.bat_dau).getTime();
      const sEnd = new Date(s.ket_thuc).getTime();
      return targetStart < sEnd && targetEnd > sStart;
    });
  };

  return (
    <DoctorLayout>
      <div className="space-y-6 bg-slate-50/60 text-slate-900">
        {/* Header */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-1">
              <p className="text-sm text-slate-500">Quản lý lịch làm việc</p>
              <h1 className="text-3xl font-bold text-slate-900">Ca làm việc của tôi</h1>
              <p className="text-slate-600">
                Chọn tuần, xem nhanh ca trong ngày và đăng ký ca mới theo preset sáng/chiều/tối.
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 flex items-center gap-2">
                <Activity className="h-4 w-4" />
                {schedules.length} ca đã đăng ký
              </div>
              <button
                onClick={() => {
                  setEditingSchedule(null);
                  resetForm();
                  setShowAddModal(true);
                }}
                className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-cyan-500 hover:to-blue-500 transition-all shadow-lg flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Đăng ký ca mới
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
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

          <div className="grid grid-cols-2 md:grid-cols-7 gap-2">
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

        {/* Schedules List */}
        {isLoading ? (
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
                resetForm();
                setShowAddModal(true);
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
                            onClick={() => handleEdit(schedule)}
                            className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                            title="Chỉnh sửa"
                          >
                            <Edit className="w-4 h-4 text-blue-600" />
                          </button>
                          <button
                            onClick={() => handleDelete(schedule.ma_ca)}
                            className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                            title="Xóa"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </div>
                      <div className="text-xs text-slate-500">
                        Đăng ký: {formatDateTime(schedule.bat_dau)}
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
                              onClick={() => handleEdit(schedule)}
                              className="flex-1 text-xs font-semibold px-3 py-2 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-700"
                            >
                              Chỉnh sửa
                            </button>
                            <button
                              onClick={() => handleDelete(schedule.ma_ca)}
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

        {/* Add/Edit Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 p-6 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-900">
                  {editingSchedule ? 'Chỉnh sửa ca làm việc' : 'Đăng ký ca làm việc mới'}
                </h2>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingSchedule(null);
                    resetForm();
                  }}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
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
                        if (formData.bat_dau) {
                          const timeStart = formData.bat_dau.split('T')[1];
                          const timeEnd = formData.ket_thuc.split('T')[1];
                          setFormData((prev) => ({
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
                      value={formData.bat_dau}
                      min={`${today}T00:00`}
                      onChange={(e) => setFormData({ ...formData, bat_dau: e.target.value })}
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
                      value={formData.ket_thuc}
                      min={formData.bat_dau || `${today}T00:00`}
                      onChange={(e) => setFormData({ ...formData, ket_thuc: e.target.value })}
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
                        if (hasOverlapOnDate(selectedDate, slot.start, slot.end)) {
                          toast.error('Ca preset trùng với ca đã đăng ký trong ngày.');
                          return;
                        }
                        const start = buildDateTime(selectedDate, slot.start);
                        const end = buildDateTime(selectedDate, slot.end);
                        setFormData((prev) => ({
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
                      value={formData.suc_chua}
                      onChange={(e) => setFormData({ ...formData, suc_chua: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                      placeholder="Ví dụ: 10"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Trạng thái
                    </label>
                    <select
                      value={formData.trang_thai}
                      onChange={(e) => setFormData({ ...formData, trang_thai: e.target.value })}
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
                      setShowAddModal(false);
                      setEditingSchedule(null);
                      resetForm();
                    }}
                    className="flex-1 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-semibold hover:from-cyan-500 hover:to-blue-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Save className="w-5 h-5" />
                    {createMutation.isPending || updateMutation.isPending
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
    </DoctorLayout>
  );
}
