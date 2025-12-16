'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/Layout/AdminLayout';
import { toast } from 'react-hot-toast';
import {
  Building2,
  Plus,
  Search,
  Edit,
  Trash2,
  Phone,
  MapPin,
  Users,
  X,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { adminApi } from '@/lib/api';

export default function DepartmentsPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: departments, isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const res = await adminApi.getDepartments();
      return res.data.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteDepartment(id),
    onSuccess: () => {
      toast.success('Xóa chuyên khoa thành công');
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Lỗi xóa chuyên khoa');
    }
  });

  const filteredDepts = (departments as any[])?.filter((dept: any) => {
    const q = searchTerm.toLowerCase();
    return (
      dept.ten_khoa?.toLowerCase().includes(q) ||
      dept.ma_khoa?.toLowerCase().includes(q)
    );
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="rounded-2xl bg-white border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Quản lý chuyên khoa</h1>
              <p className="text-gray-600">Thêm / chỉnh sửa thông tin khoa trong bệnh viện</p>
            </div>
            <button
              onClick={() => {
                setSelectedDept(null);
                setIsModalOpen(true);
              }}
              className="bg-gray-900 text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-800 transition-all shadow-sm flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Thêm chuyên khoa
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="text-sm text-gray-600">Tổng số khoa</div>
              <div className="text-3xl font-bold text-gray-900 mt-1">{departments?.length || 0}</div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="text-sm text-gray-600">Đang hoạt động</div>
              <div className="text-3xl font-bold text-gray-900 mt-1">
                {departments?.filter((d: any) => d.isActive !== false).length || 0}
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="text-sm text-gray-600">Có mô tả</div>
              <div className="text-3xl font-bold text-gray-900 mt-1">
                {departments?.filter((d: any) => d.mo_ta)?.length || 0}
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="card shadow-lg border-0">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên khoa, mã khoa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all"
            />
          </div>
        </div>

        {/* Departments Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="mt-4 text-gray-600 font-medium">Đang tải dữ liệu...</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredDepts?.map((dept: any) => (
              <div
                key={dept.ma_khoa}
                className="group relative bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden border border-gray-200"
              >
                <div className="p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center border border-gray-200">
                        <Building2 className="w-6 h-6 text-gray-700" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900">{dept.ten_khoa}</h3>
                        <span className="inline-flex items-center px-3 py-1 mt-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                          {dept.ma_khoa}
                        </span>
                      </div>
                    </div>
                  </div>

                  {dept.mo_ta && (
                    <p className="text-gray-600 text-sm line-clamp-2">{dept.mo_ta}</p>
                  )}

                  <div className="space-y-2 text-sm text-gray-700">
                    {dept.vi_tri && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-600" />
                        <span>{dept.vi_tri}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => {
                        setSelectedDept(dept);
                        setIsModalOpen(true);
                      }}
                      className="flex-1 bg-gray-900 text-white py-3 rounded-xl font-semibold hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      Chỉnh sửa
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Bạn có chắc muốn xóa khoa này?')) {
                          deleteMutation.mutate(dept.ma_khoa);
                        }
                      }}
                      className="px-4 bg-white text-red-600 border border-red-200 py-3 rounded-xl font-semibold hover:bg-red-50 transition-all flex items-center justify-center gap-2"
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
          <DepartmentFormModal
            department={selectedDept}
            onClose={() => setIsModalOpen(false)}
            onSuccess={() => {
              setIsModalOpen(false);
              toast.success(selectedDept ? 'Cập nhật thành công' : 'Thêm khoa thành công');
            }}
          />
        )}
      </div>
    </AdminLayout>
  );
}

function DepartmentFormModal({
  department,
  onClose,
  onSuccess,
}: {
  department?: any;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    defaultValues: department || {},
  });

  useEffect(() => {
    reset(department || {});
  }, [department, reset]);

  const createMutation = useMutation({
    mutationFn: (data: any) => adminApi.createDepartment(data),
    retry: (failureCount, error: any) => {
      // Don't retry on 401 (authentication errors)
      if (error?.response?.status === 401) {
        return false;
      }
      // Retry other errors up to 1 time
      return failureCount < 1;
    },
    onSuccess: () => {
      toast.success('Thêm chuyên khoa thành công');
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      onSuccess();
    },
    onError: (err: any) => {
      const errorMessage = err?.response?.data?.message || 'Lỗi thêm chuyên khoa';
      // Only show error if it's not already being handled by the interceptor
      if (err?.response?.status === 401) {
        // For 401 errors, show a more user-friendly message
        toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      } else {
        toast.error(errorMessage);
      }
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => adminApi.updateDepartment(department.ma_khoa, data),
    retry: (failureCount, error: any) => {
      // Don't retry on 401 (authentication errors)
      if (error?.response?.status === 401) {
        return false;
      }
      // Retry other errors up to 1 time
      return failureCount < 1;
    },
    onSuccess: () => {
      toast.success('Cập nhật chuyên khoa thành công');
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      onSuccess();
    },
    onError: (err: any) => {
      const errorMessage = err?.response?.data?.message || 'Lỗi cập nhật chuyên khoa';
      // Only show error if it's not already being handled by the interceptor
      if (err?.response?.status === 401) {
        // For 401 errors, show a more user-friendly message
        toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      } else {
        toast.error(errorMessage);
      }
    }
  });

  const onSubmit = (data: any) => {
    if (department?.ma_khoa) {
      return updateMutation.mutate(data);
    }
    return createMutation.mutate(data);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-900/75 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-8 transform transition-all">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {department ? 'Chỉnh sửa khoa' : 'Thêm khoa mới'}
              </h2>
              <p className="text-gray-600 mt-1">Nhập đầy đủ thông tin bên dưới</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Mã khoa <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('ma_khoa', { required: true })}
                  className="input"
                  placeholder="KTM"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tên khoa <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('ten_khoa', { required: true })}
                  className="input"
                  placeholder="Khoa Tim mạch"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Mô tả
                </label>
                <textarea
                  {...register('mo_ta')}
                  className="input min-h-[100px]"
                  placeholder="Mô tả về khoa..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Vị trí
                </label>
                <input
                  {...register('vi_tri')}
                  className="input"
                  placeholder="Tầng 3, Khu A"
                />
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-6 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
              >
                {department ? 'Cập nhật' : 'Thêm khoa'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

