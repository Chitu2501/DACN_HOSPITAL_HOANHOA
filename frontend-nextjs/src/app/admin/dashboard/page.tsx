'use client';

import { useQuery } from '@tanstack/react-query';
import { statisticsApi } from '@/lib/api';
import { AdminLayout } from '@/components/Layout/AdminLayout';
import {
  Users,
  UserCheck,
  Calendar,
  DollarSign,
  TrendingUp,
  Activity,
  Stethoscope,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Building2,
  Heart,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function AdminDashboard() {
  const { data: dashboardData, isLoading, error } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: async () => {
      const response = await statisticsApi.getDashboard();
      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Không thể tải dữ liệu dashboard');
      }
      return response.data.data;
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
  });

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[600px]">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-sky-600 animate-spin mx-auto mb-4" />
            <p className="text-slate-600 font-medium">Đang tải dữ liệu dashboard...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[600px]">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 font-semibold text-lg mb-2">Có lỗi xảy ra khi tải dữ liệu</p>
            <p className="text-sm text-slate-600 mb-6">
              {(error as any)?.response?.data?.message || (error as any)?.message || 'Vui lòng thử lại sau'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-medium transition-colors"
            >
              Tải lại trang
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const stats = [
    {
      name: 'Tổng người dùng',
      value: dashboardData?.users?.total || 0,
      icon: Users,
      color: 'sky',
      bgGradient: 'from-sky-50 to-blue-50',
      iconBg: 'bg-sky-100',
      iconColor: 'text-sky-600',
      borderColor: 'border-sky-200',
      change: `${dashboardData?.users?.active || 0} hoạt động`,
      changeColor: 'text-sky-600'
    },
    {
      name: 'Người dùng hoạt động',
      value: dashboardData?.users?.active || 0,
      icon: UserCheck,
      color: 'emerald',
      bgGradient: 'from-emerald-50 to-green-50',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      borderColor: 'border-emerald-200',
      change: `${Math.round(((dashboardData?.users?.active || 0) / Math.max(dashboardData?.users?.total || 1, 1)) * 100)}% tổng số`,
      changeColor: 'text-emerald-600'
    },
    {
      name: 'Lịch hẹn hôm nay',
      value: dashboardData?.appointments?.today || 0,
      icon: Calendar,
      color: 'amber',
      bgGradient: 'from-amber-50 to-orange-50',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      borderColor: 'border-amber-200',
      change: `${dashboardData?.appointments?.total || 0} tổng cộng`,
      changeColor: 'text-amber-600'
    },
    {
      name: 'Doanh thu',
      value: formatCurrency(dashboardData?.revenue?.total || 0),
      icon: DollarSign,
      color: 'violet',
      bgGradient: 'from-violet-50 to-purple-50',
      iconBg: 'bg-violet-100',
      iconColor: 'text-violet-600',
      borderColor: 'border-violet-200',
      change: `${dashboardData?.revenue?.paidAppointments || 0} giao dịch`,
      changeColor: 'text-violet-600'
    },
  ];

  const roleData = dashboardData?.users?.byRole?.map((item: any) => ({
    name: item.role === 'doctor' ? 'Bác sĩ' : 
          item.role === 'nurse' ? 'Y tá' :
          item.role === 'patient' ? 'Bệnh nhân' : 'Admin',
    value: item.total,
    active: item.active,
  })) || [];

  const appointmentStatusData = [
    { name: 'Chờ xác nhận', value: dashboardData?.appointments?.pending || 0, color: '#f59e0b' },
    { name: 'Đã xác nhận', value: dashboardData?.appointments?.confirmed || 0, color: '#0ea5e9' },
    { name: 'Hoàn thành', value: dashboardData?.appointments?.completed || 0, color: '#10b981' },
    { name: 'Đã hủy', value: dashboardData?.appointments?.cancelled || 0, color: '#ef4444' },
  ];

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-sky-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          {/* Header Section */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-600 via-blue-600 to-indigo-700 p-8 md:p-10 text-white shadow-xl">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Stethoscope className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold mb-1">Dashboard Quản trị</h1>
                  <p className="text-sky-100 text-sm md:text-base">Tổng quan hệ thống quản lý bệnh viện</p>
                </div>
              </div>
              <div className="mt-6 flex flex-wrap gap-4">
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
                  <Activity className="w-4 h-4" />
                  <span className="text-sm font-medium">Hệ thống hoạt động bình thường</span>
                </div>
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-medium">{new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
              </div>
            </div>
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full -mr-36 -mt-36 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full -ml-32 -mb-32 blur-3xl"></div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat) => (
              <div 
                key={stat.name} 
                className={`group relative bg-white rounded-xl border ${stat.borderColor} shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden`}
              >
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${stat.bgGradient}`}></div>
                
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`${stat.iconBg} w-12 h-12 rounded-xl flex items-center justify-center shadow-sm`}>
                      <stat.icon className={`w-6 h-6 ${stat.iconColor}`} />
                    </div>
                    <div className={`flex items-center gap-1 ${stat.changeColor} text-xs font-semibold`}>
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>{stat.change}</span>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-2">{stat.name}</p>
                    <p className={`text-2xl md:text-3xl font-bold text-slate-900 mb-1`}>{stat.value}</p>
                    <p className="text-xs text-slate-500">Cập nhật theo thời gian thực</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Role Distribution */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-sky-100 flex items-center justify-center">
                    <Users className="w-5 h-5 text-sky-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Phân bố theo vai trò</h3>
                    <p className="text-xs text-slate-500">Tổng số người dùng trong hệ thống</p>
                  </div>
                </div>
              </div>
              {roleData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={roleData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={90}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {roleData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[280px] text-slate-400">
                  <p>Chưa có dữ liệu</p>
                </div>
              )}
            </div>

            {/* Appointment Status */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Trạng thái lịch hẹn</h3>
                    <p className="text-xs text-slate-500">Phân bố theo trạng thái</p>
                  </div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={appointmentStatusData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Bar 
                    dataKey="value" 
                    radius={[8, 8, 0, 0]}
                  >
                    {appointmentStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Additional Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Medical Records */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Hồ sơ khám</p>
                  <p className="text-2xl font-bold text-slate-900">{dashboardData?.medicalRecords?.total || 0}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-100">
                <div className="flex-1">
                  <p className="text-xs text-slate-500">Hoàn thành</p>
                  <p className="text-lg font-semibold text-emerald-600">{dashboardData?.medicalRecords?.completed || 0}</p>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-500">Đang xử lý</p>
                  <p className="text-lg font-semibold text-amber-600">{dashboardData?.medicalRecords?.inProgress || 0}</p>
                </div>
              </div>
            </div>

            {/* Departments */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Khoa/Phòng</p>
                  <p className="text-2xl font-bold text-slate-900">-</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs text-slate-500">Tổng số khoa trong hệ thống</p>
              </div>
            </div>

            {/* Revenue Summary */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Giao dịch</p>
                  <p className="text-2xl font-bold text-slate-900">{dashboardData?.revenue?.paidAppointments || 0}</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs text-slate-500">Hóa đơn đã thanh toán</p>
                {dashboardData?.revenue?.byPaymentMethod && dashboardData.revenue.byPaymentMethod.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {dashboardData.revenue.byPaymentMethod.slice(0, 2).map((method: any) => (
                      <div key={method._id} className="flex items-center justify-between text-xs">
                        <span className="text-slate-600">{method.paymentMethod || method._id}</span>
                        <span className="font-semibold text-slate-900">{method.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Users */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-sky-100 flex items-center justify-center">
                    <Users className="w-5 h-5 text-sky-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Người dùng mới</h3>
                    <p className="text-xs text-slate-500">5 người dùng gần nhất</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                {dashboardData?.recent?.users && dashboardData.recent.users.length > 0 ? (
                  dashboardData.recent.users.map((user: any, index: number) => (
                    <div 
                      key={user._id || user.id} 
                      className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg hover:bg-sky-50 transition-colors border border-slate-100"
                    >
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                        {user.fullName?.charAt(0)?.toUpperCase() || user.full_name?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 truncate">{user.fullName || user.full_name || 'Người dùng'}</p>
                        <p className="text-sm text-slate-600 truncate">{user.username || user.email} • <span className="capitalize">{user.role || 'N/A'}</span></p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-medium text-slate-500 bg-white px-2.5 py-1 rounded-md border border-slate-200">
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : 'N/A'}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 text-sm">Chưa có người dùng mới</p>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Appointments */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Lịch hẹn gần đây</h3>
                    <p className="text-xs text-slate-500">5 lịch hẹn mới nhất</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                {dashboardData?.recent?.appointments && dashboardData.recent.appointments.length > 0 ? (
                  dashboardData.recent.appointments.map((apt: any) => {
                    const statusConfig = {
                      'confirmed': { label: 'Đã xác nhận', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
                      'đã xác nhận': { label: 'Đã xác nhận', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
                      'completed': { label: 'Hoàn thành', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
                      'hoàn thành': { label: 'Hoàn thành', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
                      'pending': { label: 'Chờ khám', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
                      'chờ khám': { label: 'Chờ khám', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
                    };
                    const status = statusConfig[apt.status as keyof typeof statusConfig] || { label: apt.status || 'N/A', bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' };
                    
                    return (
                      <div 
                        key={apt._id || apt.ma_lich_hen} 
                        className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg hover:bg-emerald-50 transition-colors border border-slate-100"
                      >
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-sm">
                          <Calendar className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-900 truncate">{apt.patient?.fullName || apt.patient_name || 'Bệnh nhân'}</p>
                          <p className="text-sm text-slate-600 truncate">BS: {apt.doctor?.fullName || apt.doctor_name || 'Bác sĩ'}</p>
                          {apt.appointmentDate && (
                            <p className="text-xs text-slate-400 mt-1">
                              {new Date(apt.appointmentDate).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          )}
                        </div>
                        <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${status.bg} ${status.text} ${status.border}`}>
                          {status.label}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-12">
                    <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 text-sm">Chưa có lịch hẹn gần đây</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
