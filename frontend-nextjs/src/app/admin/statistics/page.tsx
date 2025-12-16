'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { statisticsApi } from '@/lib/api';
import { AdminLayout } from '@/components/Layout/AdminLayout';
import { formatCurrency } from '@/lib/utils';
import {
  DollarSign,
  TrendingUp,
  Calendar,
  Users,
  Download
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function StatisticsPage() {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [groupBy, setGroupBy] = useState<'day' | 'month' | 'year'>('month');

  const { data: revenueData, isLoading: revenueLoading } = useQuery({
    queryKey: ['revenue-stats', dateRange, groupBy],
    queryFn: async () => {
      const response = await statisticsApi.getRevenue({
        ...dateRange,
        groupBy,
      });
      return response.data.data;
    },
  });

  const { data: appointmentData, isLoading: appointmentLoading } = useQuery({
    queryKey: ['appointment-stats', dateRange],
    queryFn: async () => {
      const response = await statisticsApi.getAppointments(dateRange);
      return response.data.data;
    },
  });

  const isLoading = revenueLoading || appointmentLoading;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header với gradient */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 p-8 text-white">
          <div className="relative z-10">
            <h1 className="text-4xl font-bold mb-2">Thống kê & Phân tích 📊</h1>
            <p className="text-violet-100">Phân tích chi tiết doanh thu và hoạt động bệnh viện</p>
          </div>
          <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full -mr-36 -mt-36"></div>
          <div className="absolute bottom-0 left-10 w-56 h-56 bg-white/10 rounded-full -mb-28"></div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Từ ngày
              </label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Đến ngày
              </label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nhóm theo
              </label>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as any)}
                className="input"
              >
                <option value="day">Ngày</option>
                <option value="month">Tháng</option>
                <option value="year">Năm</option>
              </select>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="mt-4 text-gray-600">Đang tải dữ liệu...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Summary Cards với gradient */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Tổng doanh thu</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {formatCurrency(revenueData?.summary?.totalRevenue || 0)}
                    </p>
                  </div>
                  <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <DollarSign className="w-7 h-7 text-white" />
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Lịch hẹn đã thanh toán</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {revenueData?.summary?.totalAppointments || 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Doanh thu TB/Lịch</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {formatCurrency(revenueData?.summary?.averageRevenue || 0)}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Tổng bác sĩ</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {revenueData?.byDoctor?.length || 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-500 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
            </div>

            {/* Revenue Trend Chart */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Xu hướng doanh thu</h3>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={revenueData?.byDate || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="_id" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: any) => formatCurrency(value)}
                    labelFormatter={(label) => `Thời gian: ${label}`}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    name="Doanh thu"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="appointments" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    name="Số lịch hẹn"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Revenue by Doctor */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Doanh thu theo bác sĩ
                </h3>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={revenueData?.byDoctor?.slice(0, 10) || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="doctorName" 
                      angle={-45}
                      textAnchor="end"
                      height={100}
                    />
                    <YAxis />
                    <Tooltip formatter={(value: any) => formatCurrency(value)} />
                    <Bar dataKey="revenue" fill="#3b82f6" name="Doanh thu" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Appointment Status Distribution */}
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Phân bố trạng thái lịch hẹn
                </h3>
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={appointmentData?.byStatus || []}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ _id, count }) => `${_id}: ${count}`}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {(appointmentData?.byStatus || []).map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Doctors Table */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Top 10 Bác sĩ theo doanh thu
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        #
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Bác sĩ
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Chuyên khoa
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Số lịch hẹn
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Doanh thu
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {revenueData?.byDoctor?.slice(0, 10).map((doctor: any, index: number) => (
                      <tr key={doctor.doctorId} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">{index + 1}</td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {doctor.doctorName}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {doctor.specialization || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 text-right">
                          {doctor.appointments}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                          {formatCurrency(doctor.revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}

