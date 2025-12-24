'use client';

import { DoctorLayout } from '@/components/Layout/DoctorLayout';
import { useAuthStore } from '@/store/authStore';
import { doctorApi } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import {
  Calendar,
  Clock3,
  Activity,
  Users,
  AlertCircle,
  CheckCircle2,
  Timer,
  TrendingUp,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';

const statusStyles: Record<string, string> = {
  confirmed: 'bg-emerald-500/15 text-emerald-200 border border-emerald-500/30',
  pending: 'bg-amber-500/15 text-amber-200 border border-amber-500/30',
  completed: 'bg-cyan-500/15 text-cyan-200 border border-cyan-500/30',
  cancelled: 'bg-rose-500/15 text-rose-200 border border-rose-500/30',
};

export default function DoctorDashboard() {
  const { user } = useAuthStore();
  
  // Fetch dashboard data from API with optimized caching
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['doctor-dashboard'],
    queryFn: async () => {
      const res = await doctorApi.getDashboard();
      return res.data?.data || {};
    },
    staleTime: 2 * 60 * 1000, // Data is fresh for 2 minutes
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchInterval: 30000, // Refetch every 30 seconds
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: true, // Refetch when component mounts
  });

  const metrics = dashboardData?.metrics || {};
  const appointments = dashboardData?.appointments || [];
  const waitingQueue = dashboardData?.waitingQueue || [];
  const weekStats = dashboardData?.weekStats || [];

  // Calculate metrics for display
  const metricsData = [
    {
      title: 'Lịch hẹn hôm nay',
      value: metrics.todayAppointments || 0,
      change: metrics.appointmentsChange > 0 
        ? `+${metrics.appointmentsChange} ca` 
        : metrics.appointmentsChange < 0 
        ? `${metrics.appointmentsChange} ca` 
        : 'Không đổi',
      icon: Calendar,
      gradient: 'from-cyan-500 to-blue-600'
    },
    {
      title: 'Bệnh nhân chờ',
      value: metrics.waitingPatients || 0,
      change: metrics.waitingChange > 0 
        ? `+${metrics.waitingChange} so với hôm qua` 
        : metrics.waitingChange < 0 
        ? `${metrics.waitingChange} so với hôm qua` 
        : 'Không đổi',
      icon: Users,
      gradient: 'from-violet-500 to-fuchsia-600'
    },
    {
      title: 'Hoàn thành',
      value: `${metrics.completionRate || 0}%`,
      change: 'Tỷ lệ xử lý',
      icon: CheckCircle2,
      gradient: 'from-emerald-500 to-teal-600'
    },
    {
      title: 'Cảnh báo',
      value: metrics.urgentCount || 0,
      change: 'Trạng thái khẩn',
      icon: AlertCircle,
      gradient: 'from-amber-500 to-orange-600'
    }
  ];

  if (isLoading) {
    return (
      <DoctorLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-600" />
        </div>
      </DoctorLayout>
    );
  }

  return (
    <DoctorLayout>
      <div className="space-y-6 bg-slate-50/60 text-slate-900">
        {/* Welcome banner */}
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm text-slate-500">Hệ thống hỗ trợ bác sĩ</p>
              <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">
                Chào {user?.fullName || 'Bác sĩ'} 👋
              </h1>
              <p className="mt-2 max-w-2xl text-slate-600">
                Theo dõi lịch khám, hàng đợi bệnh nhân và hiệu suất làm việc trong ngày.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">
                  <Activity className="h-4 w-4" /> Trực tuyến
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm font-medium text-cyan-700">
                  <Clock3 className="h-4 w-4" /> {new Date().toLocaleDateString('vi-VN', { weekday: 'long' })} • {new Date().toLocaleDateString('vi-VN')}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm text-slate-600">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-slate-500">Lịch hôm nay</p>
                <div className="mt-2 flex items-center gap-2 text-xl font-semibold text-slate-900">
                  <Calendar className="h-5 w-5 text-cyan-500" />
                  {metrics.todayAppointments || 0} ca
                </div>
                <p className={`text-xs ${metrics.appointmentsChange > 0 ? 'text-emerald-600' : metrics.appointmentsChange < 0 ? 'text-rose-600' : 'text-slate-600'}`}>
                  {metrics.appointmentsChange > 0 ? `+${metrics.appointmentsChange}` : metrics.appointmentsChange < 0 ? metrics.appointmentsChange : 'Không đổi'} so với hôm qua
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-slate-500">Bệnh nhân chờ</p>
                <div className="mt-2 flex items-center gap-2 text-xl font-semibold text-slate-900">
                  <Users className="h-5 w-5 text-fuchsia-500" />
                  {metrics.waitingPatients || 0} người
                </div>
                <p className="text-xs text-amber-600">
                  {waitingQueue.filter((p: any) => p.priority === 'Cao').length} ưu tiên cao
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metricsData.map((metric) => (
            <div
              key={metric.title}
              className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-slate-200 to-transparent" />
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500">{metric.title}</p>
                  <h3 className="mt-2 text-3xl font-bold text-slate-900">{metric.value}</h3>
                  <p className="mt-2 text-xs font-medium text-slate-500">{metric.change}</p>
                </div>
                <div
                  className={`rounded-xl bg-gradient-to-br ${metric.gradient} p-3 text-white shadow-sm`}
                >
                  <metric.icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          {/* Lịch khám hôm nay */}
          <div className="xl:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-cyan-50 p-2.5 text-cyan-600">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Lịch khám hôm nay</h3>
                  <p className="text-sm text-slate-500">Theo dõi thời gian, phòng khám và trạng thái</p>
                </div>
              </div>
              <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-cyan-300 hover:text-cyan-700">
                Xem tất cả
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {appointments.length === 0 ? (
                <div className="py-8 text-center text-slate-500">
                  <Calendar className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                  <p>Không có lịch hẹn nào hôm nay</p>
                </div>
              ) : (
                appointments.map((item: any) => (
                <div key={item.time} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center">
                      <p className="text-xl font-semibold text-slate-900">{item.time}</p>
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">Phòng {item.room}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{item.patient}</p>
                      <p className="text-sm text-slate-600">{item.reason}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[item.status]}`}>
                      {item.status === 'confirmed' && 'Đã xác nhận'}
                      {item.status === 'pending' && 'Chờ khám'}
                      {item.status === 'completed' && 'Hoàn thành'}
                    </span>
                    <button className="rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-700 hover:border-cyan-300">
                      Mở hồ sơ
                    </button>
                  </div>
                </div>
                ))
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Hàng đợi bệnh nhân */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Timer className="h-5 w-5 text-amber-500" />
                  <h3 className="text-lg font-semibold text-slate-900">Hàng đợi</h3>
                </div>
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 border border-amber-200">
                  {waitingQueue.length} bệnh nhân
                </span>
              </div>

              <div className="space-y-3">
                {waitingQueue.length === 0 ? (
                  <div className="py-6 text-center text-slate-500">
                    <Users className="h-10 w-10 mx-auto mb-2 text-slate-300" />
                    <p className="text-sm">Không có bệnh nhân chờ</p>
                  </div>
                ) : (
                  waitingQueue.map((patient: any) => (
                  <div
                    key={patient.ticket}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-cyan-200 hover:bg-white"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{patient.name}</p>
                        <p className="text-xs text-slate-600">{patient.note}</p>
                      </div>
                      <span className="text-xs font-semibold text-slate-500">{patient.ticket}</span>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-xs text-slate-600">
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700 border border-emerald-200">
                        Ưu tiên: {patient.priority}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700 border border-slate-200">
                        Chờ: {patient.wait}
                      </span>
                    </div>
                  </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Hiệu suất tuần */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Hiệu suất tuần</h3>
                <p className="text-sm text-slate-600">Số ca hoàn thành và đang chờ</p>
              </div>
            </div>
            {weekStats.length > 0 && (
              <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                {weekStats.reduce((sum: number, day: { completed?: number }) => sum + (day.completed || 0), 0)} ca hoàn thành tuần này
              </div>
            )}
          </div>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weekStats.length > 0 ? weekStats : [{ day: 'T2', completed: 0, pending: 0 }]} margin={{ top: 10, left: 0, right: 0 }}>
                <defs>
                  <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis dataKey="day" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.08)' }}
                  labelStyle={{ color: 'white' }}
                  cursor={{ stroke: 'rgba(255,255,255,0.15)' }}
                />
                <Area type="monotone" dataKey="completed" name="Hoàn thành" stroke="#22d3ee" fillOpacity={1} fill="url(#colorCompleted)" />
                <Area type="monotone" dataKey="pending" name="Chờ khám" stroke="#fbbf24" fillOpacity={1} fill="url(#colorPending)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </DoctorLayout>
  );
}

