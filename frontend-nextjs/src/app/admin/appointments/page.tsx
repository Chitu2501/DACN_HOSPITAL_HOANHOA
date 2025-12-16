'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appointmentsApi } from '@/lib/api';
import { AdminLayout } from '@/components/Layout/AdminLayout';
import { toast } from 'react-hot-toast';
import {
  Calendar,
  Search,
  Filter,
  Eye,
  X,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { formatDateTime, formatCurrency, getStatusColor, getStatusName } from '@/lib/utils';

export default function AppointmentsPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);

  const { data: appointmentsData, isLoading } = useQuery({
    queryKey: ['appointments', statusFilter],
    queryFn: async () => {
      const response = await appointmentsApi.getAll({ status: statusFilter });
      return response.data;
    },
  });

  const updateAppointmentMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      appointmentsApi.update(id, data),
    onSuccess: () => {
      toast.success('Cập nhật thành công');
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      setSelectedAppointment(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Cập nhật thất bại');
    },
  });

  const filteredAppointments = appointmentsData?.data?.filter((apt: any) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      apt.patient?.fullName.toLowerCase().includes(searchLower) ||
      apt.doctor?.fullName.toLowerCase().includes(searchLower)
    );
  }) || [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header với gradient */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-8 text-white">
          <div className="relative z-10">
            <h1 className="text-4xl font-bold mb-2">Quản lý Lịch hẹn 📅</h1>
            <p className="text-emerald-100">Quản lý tất cả lịch hẹn khám bệnh trong hệ thống</p>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-20 w-48 h-48 bg-white/10 rounded-full -mb-24"></div>
        </div>

        {/* Filters với design hiện đại */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="🔍 Tìm kiếm theo bệnh nhân, bác sĩ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="md:w-56 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all font-medium"
            >
              <option value="">📋 Tất cả trạng thái</option>
              <option value="pending">⏳ Chờ xác nhận</option>
              <option value="confirmed">✅ Đã xác nhận</option>
              <option value="completed">🎉 Hoàn thành</option>
              <option value="cancelled">❌ Đã hủy</option>
            </select>
          </div>
        </div>

        {/* Appointments Table với border đẹp */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="mt-4 text-gray-600">Đang tải...</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Bệnh nhân
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Bác sĩ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Ngày hẹn
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Giờ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Trạng thái
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Phí khám
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAppointments.map((apt: any) => (
                    <tr key={apt._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="font-medium text-gray-900">{apt.patient?.fullName}</div>
                          <div className="text-sm text-gray-500">{apt.patient?.phone}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="font-medium text-gray-900">{apt.doctor?.fullName}</div>
                          <div className="text-sm text-gray-500">{apt.doctor?.specialization}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(apt.appointmentDate).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {apt.timeSlot}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`badge ${getStatusColor(apt.status)}`}>
                          {getStatusName(apt.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {formatCurrency(apt.fee)}
                          </div>
                          {apt.isPaid && (
                            <span className="text-xs text-green-600">Đã thanh toán</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => setSelectedAppointment(apt)}
                          className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg"
                          title="Xem chi tiết"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Appointment Detail Modal */}
      {selectedAppointment && (
        <AppointmentDetailModal
          appointment={selectedAppointment}
          onClose={() => setSelectedAppointment(null)}
          onUpdate={(data) => {
            updateAppointmentMutation.mutate({ id: selectedAppointment._id, data });
          }}
        />
      )}
    </AdminLayout>
  );
}

function AppointmentDetailModal({
  appointment,
  onClose,
  onUpdate,
}: {
  appointment: any;
  onClose: () => void;
  onUpdate: (data: any) => void;
}) {
  const [status, setStatus] = useState(appointment.status);
  const [fee, setFee] = useState(appointment.fee);
  const [isPaid, setIsPaid] = useState(appointment.isPaid);

  const handleUpdate = () => {
    onUpdate({ status, fee, isPaid });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-900/75" onClick={onClose} />
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Chi tiết lịch hẹn</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Patient Info */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Thông tin bệnh nhân</h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <p><strong>Họ tên:</strong> {appointment.patient?.fullName}</p>
                <p><strong>Email:</strong> {appointment.patient?.email}</p>
                <p><strong>Số điện thoại:</strong> {appointment.patient?.phone}</p>
              </div>
            </div>

            {/* Doctor Info */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Thông tin bác sĩ</h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <p><strong>Họ tên:</strong> {appointment.doctor?.fullName}</p>
                <p><strong>Chuyên khoa:</strong> {appointment.doctor?.specialization}</p>
                <p><strong>Khoa:</strong> {appointment.doctor?.department}</p>
              </div>
            </div>

            {/* Appointment Details */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Thông tin lịch hẹn</h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <p><strong>Ngày hẹn:</strong> {new Date(appointment.appointmentDate).toLocaleDateString('vi-VN')}</p>
                <p><strong>Giờ:</strong> {appointment.timeSlot}</p>
                <p><strong>Lý do:</strong> {appointment.reason}</p>
                {appointment.symptoms && <p><strong>Triệu chứng:</strong> {appointment.symptoms}</p>}
              </div>
            </div>

            {/* Update Form */}
            <div className="space-y-4 pt-4 border-t">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Trạng thái
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="input"
                >
                  <option value="pending">Chờ xác nhận</option>
                  <option value="confirmed">Đã xác nhận</option>
                  <option value="completed">Hoàn thành</option>
                  <option value="cancelled">Đã hủy</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phí khám (VNĐ)
                  </label>
                  <input
                    type="number"
                    value={fee}
                    onChange={(e) => setFee(Number(e.target.value))}
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Trạng thái thanh toán
                  </label>
                  <label className="flex items-center gap-2 h-10">
                    <input
                      type="checkbox"
                      checked={isPaid}
                      onChange={(e) => setIsPaid(e.target.checked)}
                      className="w-4 h-4 text-primary-600 rounded"
                    />
                    <span className="text-sm">Đã thanh toán</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button onClick={onClose} className="btn btn-secondary">
                Đóng
              </button>
              <button onClick={handleUpdate} className="btn btn-primary">
                Cập nhật
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

