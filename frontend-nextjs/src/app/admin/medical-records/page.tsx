'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '@/components/Layout/AdminLayout';
import { FileText, Search, Eye, Edit, Filter } from 'lucide-react';
import { formatCurrency, formatDateTime } from '@/lib/utils';

// Mock data hồ sơ bệnh án
const mockMedicalRecords = [
  {
    _id: '1',
    recordNumber: 'MR2025000001',
    patient: { fullName: 'Nguyễn Thị F', code: 'BN001' },
    doctor: { fullName: 'BS Nguyễn Văn A', specialization: 'Tim mạch' },
    department: { name: 'Khoa Tim mạch', code: 'KTM' },
    visitDate: '2025-11-15',
    reason: 'Đau ngực, khó thở',
    diagnosis: 'Rối loạn nhịp tim',
    status: 'completed',
    totalFee: 1500000,
    isPaid: true,
  },
  {
    _id: '2',
    recordNumber: 'MR2025000002',
    patient: { fullName: 'Trần Văn G', code: 'BN002' },
    doctor: { fullName: 'BS Trần Thị B', specialization: 'Nội khoa' },
    department: { name: 'Khoa Nội', code: 'KNK' },
    visitDate: '2025-11-20',
    reason: 'Đau bụng, tiêu chảy',
    diagnosis: 'Viêm đại tràng',
    status: 'in_progress',
    totalFee: 800000,
    isPaid: false,
  },
];

export default function MedicalRecordsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data: records, isLoading } = useQuery({
    queryKey: ['medical-records'],
    queryFn: async () => {
      return new Promise((resolve) => {
        setTimeout(() => resolve(mockMedicalRecords), 500);
      });
    },
  });

  const filtered = (records as any[])?.filter((r) => {
    const matchesSearch = r.recordNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          r.patient.fullName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      in_progress: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    const labels: Record<string, string> = {
      in_progress: 'Đang điều trị',
      completed: 'Hoàn tất',
      cancelled: 'Đã hủy',
    };
    return (
      <span className={`badge ${badges[status]}`}>
        {labels[status]}
      </span>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Quản lý Hồ sơ bệnh án</h1>
          <p className="text-gray-600 mt-1">Xem và quản lý hồ sơ khám bệnh</p>
        </div>

        {/* Filters */}
        <div className="card">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm theo mã hồ sơ, tên bệnh nhân..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10 w-full"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input md:w-48"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="in_progress">Đang điều trị</option>
              <option value="completed">Hoàn tất</option>
              <option value="cancelled">Đã hủy</option>
            </select>
          </div>
        </div>

        {/* Records Table */}
        <div className="card overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mã hồ sơ</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bệnh nhân</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bác sĩ</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Khoa</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày khám</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Chẩn đoán</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Chi phí</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filtered?.map((record) => (
                    <tr key={record._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{record.recordNumber}</td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900">{record.patient.fullName}</div>
                          <div className="text-xs text-gray-500">{record.patient.code}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-gray-900">{record.doctor.fullName}</div>
                          <div className="text-xs text-gray-500">{record.doctor.specialization}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{record.department.name}</td>
                      <td className="px-6 py-4 text-gray-600">{new Date(record.visitDate).toLocaleDateString('vi-VN')}</td>
                      <td className="px-6 py-4 text-gray-600">{record.diagnosis || 'Chưa có'}</td>
                      <td className="px-6 py-4">{getStatusBadge(record.status)}</td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900">{formatCurrency(record.totalFee)}</div>
                          <div className="text-xs">
                            {record.isPaid ? (
                              <span className="text-green-600">Đã thanh toán</span>
                            ) : (
                              <span className="text-orange-600">Chưa thanh toán</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Xem chi tiết">
                            <Eye className="w-5 h-5" />
                          </button>
                          <button className="p-2 text-green-600 hover:bg-green-50 rounded-lg" title="Chỉnh sửa">
                            <Edit className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Statistics Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tổng hồ sơ</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{filtered?.length || 0}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Đang điều trị</p>
                <p className="text-2xl font-bold text-yellow-600 mt-1">
                  {filtered?.filter(r => r.status === 'in_progress').length || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Hoàn tất</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {filtered?.filter(r => r.status === 'completed').length || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

