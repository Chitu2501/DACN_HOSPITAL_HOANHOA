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
  TrendingDown,
  Activity
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

export default function AdminDashboard() {
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const response = await statisticsApi.getDashboard();
      return response.data.data;
    },
  });

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="mt-4 text-gray-600">Đang tải dữ liệu...</p>
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
      gradient: 'from-blue-500 to-cyan-500',
      bgLight: 'bg-blue-50',
      textColor: 'text-blue-600',
      change: '+12%',
      trending: 'up'
    },
    {
      name: 'Người dùng hoạt động',
      value: dashboardData?.users?.active || 0,
      icon: UserCheck,
      gradient: 'from-green-500 to-emerald-500',
      bgLight: 'bg-green-50',
      textColor: 'text-green-600',
      change: '+8%',
      trending: 'up'
    },
    {
      name: 'Lịch hẹn hôm nay',
      value: dashboardData?.appointments?.confirmed || 0,
      icon: Calendar,
      gradient: 'from-yellow-500 to-orange-500',
      bgLight: 'bg-yellow-50',
      textColor: 'text-yellow-600',
      change: '+5%',
      trending: 'up'
    },
    {
      name: 'Doanh thu',
      value: formatCurrency(dashboardData?.revenue?.total || 0),
      icon: DollarSign,
      gradient: 'from-purple-500 to-pink-500',
      bgLight: 'bg-purple-50',
      textColor: 'text-purple-600',
      change: '+15%',
      trending: 'up'
    },
  ];

  const roleData = dashboardData?.users?.byRole?.map((item: any) => ({
    name: item.role === 'doctor' ? 'Bác sĩ' : 
          item.role === 'nurse' ? 'Y tá' :
          item.role === 'patient' ? 'Bệnh nhân' : 'Admin',
    value: item.total,
    active: item.active,
  })) || [];

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Page Header với gradient */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-8 text-white">
          <div className="relative z-10">
            <h1 className="text-4xl font-bold mb-2">Chào mừng trở lại! 👋</h1>
            <p className="text-indigo-100">Tổng quan hệ thống quản lý bệnh viện</p>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 right-20 w-40 h-40 bg-white/10 rounded-full"></div>
        </div>

        {/* Stats Grid với gradient cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => (
            <div key={stat.name} className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100">
              {/* Gradient top border */}
              <div className={`h-1 bg-gradient-to-r ${stat.gradient}`}></div>
              
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`${stat.bgLight} w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm`}>
                    <stat.icon className={`w-7 h-7 ${stat.textColor}`} />
                  </div>
                  <div className="flex items-center gap-1">
                    {stat.trending === 'up' ? (
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-600" />
                    )}
                    <span className={`text-sm font-semibold ${stat.trending === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                      {stat.change}
                    </span>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">{stat.name}</p>
                  <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-500 mt-2">so với tháng trước</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Role Distribution */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Phân bố theo vai trò</h3>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={roleData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={100}
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
          </div>

          {/* Appointment Status */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Trạng thái lịch hẹn</h3>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={[
                { name: 'Chờ xác nhận', value: dashboardData?.appointments?.pending || 0 },
                { name: 'Đã xác nhận', value: dashboardData?.appointments?.confirmed || 0 },
                { name: 'Hoàn thành', value: dashboardData?.appointments?.completed || 0 },
                { name: 'Đã hủy', value: dashboardData?.appointments?.cancelled || 0 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Users */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Người dùng mới</h3>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="space-y-3">
              {dashboardData?.recent?.users?.map((user: any) => (
                <div key={user._id} className="flex items-center gap-4 p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl hover:from-blue-50 hover:to-indigo-50 transition-all border border-gray-100">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{user.fullName}</p>
                    <p className="text-sm text-gray-500">{user.username} • {user.role}</p>
                  </div>
                  <span className="text-xs font-medium text-gray-500 bg-white px-3 py-1 rounded-full">
                    {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Appointments */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Lịch hẹn gần đây</h3>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="space-y-3">
              {dashboardData?.recent?.appointments?.map((apt: any) => (
                <div key={apt._id} className="flex items-center gap-4 p-4 bg-gradient-to-r from-gray-50 to-green-50 rounded-xl hover:from-green-50 hover:to-emerald-50 transition-all border border-gray-100">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-md">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{apt.patient?.fullName}</p>
                    <p className="text-sm text-gray-500">BS: {apt.doctor?.fullName}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    apt.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                    apt.status === 'completed' ? 'bg-green-100 text-green-700' :
                    apt.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {apt.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

