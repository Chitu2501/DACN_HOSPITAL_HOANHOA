'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/Layout/AdminLayout';
import { adminApi } from '@/lib/api';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { toast } from 'react-hot-toast';
import {
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  Phone,
  Mail,
  X,
  Stethoscope,
  Loader2
} from 'lucide-react';
import { useForm } from 'react-hook-form';

export default function DoctorsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();

  // Debounce search term để tránh quá nhiều API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Fetch doctors từ API thật
  const { data: doctorsResponse, isLoading, error } = useQuery({
    queryKey: ['admin-doctors', debouncedSearchTerm],
    queryFn: async () => {
      try {
        const res = await adminApi.getDoctors({
          search: debouncedSearchTerm || undefined,
        });
        if (!res.data?.success) {
          throw new Error(res.data?.message || 'Không thể tải danh sách bác sĩ');
        }
        return res.data;
      } catch (err: any) {
        console.error('Error fetching doctors:', err);
        throw err;
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  const doctors = doctorsResponse?.data || [];

  // Filter đã được xử lý ở backend, nhưng có thể filter thêm ở frontend nếu cần
  const filteredDoctors = doctors;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Quản lý Bác sĩ</h1>
            <p className="text-gray-600 mt-1">Quản lý thông tin bác sĩ trong bệnh viện</p>
          </div>
          <button
            onClick={() => {
              setSelectedDoctor(null);
              setIsModalOpen(true);
            }}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Thêm bác sĩ
          </button>
        </div>

        {/* Search */}
        <div className="card">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên, chuyên khoa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10 w-full"
            />
          </div>
        </div>

        {/* Doctors Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-primary-600 animate-spin mx-auto" />
              <p className="mt-4 text-gray-600">Đang tải danh sách bác sĩ...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-red-600">Có lỗi xảy ra khi tải danh sách bác sĩ</p>
              <button
                onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-doctors'] })}
                className="mt-4 btn btn-secondary"
              >
                Thử lại
              </button>
            </div>
          </div>
        ) : filteredDoctors.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Không tìm thấy bác sĩ nào</p>
              {searchTerm && (
                <p className="text-sm text-gray-500 mt-2">
                  Thử tìm kiếm với từ khóa khác
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDoctors?.map((doctor: any) => (
              <div key={doctor._id || doctor.id || doctor.ma_bac_si} className="card hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {doctor.avatar_url ? (
                      <img 
                        src={doctor.avatar_url.startsWith('http') 
                          ? doctor.avatar_url 
                          : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000'}${doctor.avatar_url.startsWith('/') ? '' : '/'}${doctor.avatar_url}`
                        }
                        alt={doctor.fullName}
                        className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const fallback = target.nextElementSibling as HTMLElement;
                          if (fallback) fallback.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={`w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 ${doctor.avatar_url ? 'hidden' : ''}`}>
                      <Stethoscope className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{doctor.fullName}</h3>
                      <span className="text-xs text-gray-500">{doctor.code || doctor.ma_bac_si}</span>
                    </div>
                  </div>
                  <span className={`badge flex-shrink-0 ${doctor.isActive !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {doctor.isActive !== false ? 'Hoạt động' : 'Nghỉ'}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  {doctor.specialization && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Stethoscope className="w-4 h-4" />
                      <span className="font-medium">{doctor.specialization}</span>
                    </div>
                  )}
                  {doctor.department && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Users className="w-4 h-4" />
                      <span>{doctor.department}</span>
                    </div>
                  )}
                  {doctor.email && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="w-4 h-4" />
                      <span className="truncate">{doctor.email}</span>
                    </div>
                  )}
                  {doctor.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="w-4 h-4" />
                      <span>{doctor.phone}</span>
                    </div>
                  )}
                  {doctor.licenseNumber && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="font-medium">Chứng chỉ:</span>
                      <span>{doctor.licenseNumber}</span>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t">
                  {doctor.workSchedule && (
                    <p className="text-xs text-gray-500 mb-3">
                      <strong>Lịch làm việc:</strong> {doctor.workSchedule}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedDoctor(doctor);
                        setIsModalOpen(true);
                      }}
                      className="btn btn-secondary flex-1 flex items-center justify-center gap-1"
                    >
                      <Edit className="w-4 h-4" />
                      Sửa
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Bạn có chắc muốn xóa bác sĩ này?')) {
                          toast.error('Chức năng xóa bác sĩ đang được phát triển');
                          // TODO: Implement delete doctor API
                        }
                      }}
                      className="btn btn-danger flex items-center justify-center gap-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal Form */}
        {isModalOpen && (
          <DoctorFormModal
            doctor={selectedDoctor}
            onClose={() => setIsModalOpen(false)}
            onSuccess={() => {
              setIsModalOpen(false);
              toast.success(selectedDoctor ? 'Cập nhật thành công' : 'Thêm bác sĩ thành công');
            }}
          />
        )}
      </div>
    </AdminLayout>
  );
}

function DoctorFormModal({
  doctor,
  onClose,
  onSuccess,
}: {
  doctor?: any;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: doctor || {},
  });

  const onSubmit = (data: any) => {
    console.log('Form data:', data);
    onSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-900/75" onClick={onClose} />
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {doctor ? 'Chỉnh sửa bác sĩ' : 'Thêm bác sĩ mới'}
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mã bác sĩ <span className="text-red-500">*</span>
                </label>
                <input {...register('code', { required: true })} className="input" placeholder="BS001" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Họ và tên <span className="text-red-500">*</span>
                </label>
                <input {...register('fullName', { required: true })} className="input" placeholder="Bác sĩ Nguyễn Văn A" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input {...register('email', { required: true })} type="email" className="input" placeholder="email@example.com" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Số điện thoại <span className="text-red-500">*</span>
                </label>
                <input {...register('phone', { required: true })} className="input" placeholder="0123456789" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Chuyên khoa <span className="text-red-500">*</span>
                </label>
                <input {...register('specialization', { required: true })} className="input" placeholder="Tim mạch" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Khoa/Phòng
                </label>
                <input {...register('department')} className="input" placeholder="Khoa Tim mạch" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Số chứng chỉ hành nghề
                </label>
                <input {...register('licenseNumber')} className="input" placeholder="BS-001" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lịch làm việc
                </label>
                <input {...register('workSchedule')} className="input" placeholder="Thứ 2, 4, 6" />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button type="button" onClick={onClose} className="btn btn-secondary">
                Hủy
              </button>
              <button type="submit" className="btn btn-primary">
                {doctor ? 'Cập nhật' : 'Thêm bác sĩ'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

