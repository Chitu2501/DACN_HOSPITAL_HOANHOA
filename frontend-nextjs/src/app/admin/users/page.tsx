'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { AdminLayout } from '@/components/Layout/AdminLayout';
import { toast } from 'react-hot-toast';
import {
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  Shield,
  Power,
  Filter,
  MoreVertical,
  X
} from 'lucide-react';
import { getRoleName } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { useWatch } from 'react-hook-form';

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await adminApi.getAllUsers();
      return response.data;
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteUser(id),
    onSuccess: () => {
      toast.success('Xóa người dùng thành công');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Xóa người dùng thất bại');
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      adminApi.updateUserStatus(id, isActive),
    onSuccess: () => {
      toast.success('Cập nhật trạng thái thành công');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Cập nhật thất bại');
    },
  });

  const handleDelete = (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa người dùng này?')) {
      deleteUserMutation.mutate(id);
    }
  };

  const handleToggleStatus = (id: string, currentStatus: boolean) => {
    updateStatusMutation.mutate({ id, isActive: !currentStatus });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header với gradient background */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-8 text-white">
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold mb-2">Quản lý người dùng</h1>
                <p className="text-blue-100">Quản lý tất cả người dùng trong hệ thống</p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-white text-indigo-600 px-6 py-3 rounded-xl font-semibold hover:bg-blue-50 transition-all transform hover:scale-105 shadow-lg flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Thêm người dùng
              </button>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-20 w-40 h-40 bg-white/10 rounded-full -mb-20"></div>
        </div>

        {/* Filters với shadow đẹp */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm theo tên, email, số điện thoại..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
                      className="md:w-56 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all font-medium"
            >
              <option value="">🔍 Tất cả vai trò</option>
              <option value="admin">👑 Quản trị viên</option>
              <option value="doctor">🩺 Bác sĩ</option>
              <option value="nurse">💉 Y tá</option>
              <option value="patient">🏥 Bệnh nhân</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="mt-4 text-gray-600">Đang tải...</p>
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Người dùng
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Vai trò
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Chuyên khoa
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Trạng thái
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ngày tạo
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Thao tác
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(usersData?.data || []).filter((user: any) => {
                      const q = searchTerm.toLowerCase();
                      const roleOk = !roleFilter || user.role === roleFilter;
                      const textOk =
                        user.fullName?.toLowerCase().includes(q) ||
                        user.email?.toLowerCase().includes(q) ||
                        user.username?.toLowerCase().includes(q) ||
                        user.phone?.toLowerCase().includes(q);
                      return roleOk && textOk;
                    }).map((user: any) => (
                      <tr key={user.id || user._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="font-medium text-gray-900">{user.fullName}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                            {user.phone && (
                              <div className="text-xs text-gray-400">{user.phone}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`badge ${
                            user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                            user.role === 'doctor' ? 'bg-blue-100 text-blue-800' :
                            user.role === 'nurse' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {getRoleName(user.role)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.specialization || user.department || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`badge ${
                            user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                          {user.isActive ? 'Hoạt động' : 'Vô hiệu hóa'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(user.createdAt || user.created_at).toLocaleDateString('vi-VN')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleToggleStatus(user.id || user._id, user.isActive)}
                              className={`p-2 rounded-lg ${
                                user.isActive
                                  ? 'text-red-600 hover:bg-red-50'
                                  : 'text-green-600 hover:bg-green-50'
                              }`}
                              title={user.isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}
                            >
                              <Power className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => setSelectedUser(user)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                              title="Chỉnh sửa"
                            >
                              <Edit className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(user.id || user._id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                              title="Xóa"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {usersData?.pagination && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <div className="text-sm text-gray-700">
                    Hiển thị <span className="font-medium">{usersData.data.length}</span> trong{' '}
                    <span className="font-medium">{usersData.pagination.totalItems}</span> người dùng
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="btn btn-secondary disabled:opacity-50"
                    >
                      Trước
                    </button>
                    <span className="px-4 py-2 text-sm">
                      Trang {currentPage} / {usersData.pagination.totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(usersData.pagination.totalPages, p + 1))}
                      disabled={currentPage === usersData.pagination.totalPages}
                      className="btn btn-secondary disabled:opacity-50"
                    >
                      Sau
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Create User Modal */}
      {isCreateModalOpen && (
        <CreateUserModal
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            setIsCreateModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ['users'] });
          }}
        />
      )}
    </AdminLayout>
  );
}

function CreateUserModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { register, handleSubmit, formState: { errors }, control } = useForm({ defaultValues: { role: 'patient' } });
  const role = useWatch({ control, name: 'role' });
  const [isLoading, setIsLoading] = useState(false);

  // Lấy danh sách khoa để chọn
  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const res = await adminApi.getDepartments();
      return res.data.data || [];
    },
  });

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    try {
      await adminApi.createUser(data);
      toast.success('Tạo người dùng thành công');
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Tạo người dùng thất bại');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-900/75" onClick={onClose} />
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Tạo người dùng mới</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tên đăng nhập <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('username', { required: true })}
                  className="input"
                  placeholder="username"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Họ và tên <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('fullName', { required: true })}
                  className="input"
                  placeholder="Nguyễn Văn A"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('email', { required: true })}
                  type="email"
                  className="input"
                  placeholder="email@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Số điện thoại
                </label>
                <input
                  {...register('phone')}
                  className="input"
                  placeholder="0123456789"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mật khẩu <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('password', { required: true, minLength: 6 })}
                  type="password"
                  className="input"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vai trò <span className="text-red-500">*</span>
                </label>
                <select {...register('role', { required: true })} className="input">
                  <option value="patient">Bệnh nhân</option>
                  <option value="doctor">Bác sĩ</option>
                  <option value="nurse">Y tá</option>
                  <option value="admin">Quản trị viên</option>
                </select>
              </div>

              {role === 'doctor' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Chuyên khoa
                    </label>
                    <input
                      {...register('specialization')}
                      className="input"
                      placeholder="Tim mạch"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Khoa
                    </label>
                    <select
                      {...register('department')}
                      className="input"
                    >
                      <option value="">-- Chọn khoa --</option>
                      {departments?.map((dept: any) => (
                        <option key={dept.ma_khoa} value={dept.ma_khoa}>
                          {dept.ten_khoa} ({dept.ma_khoa})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Số chứng chỉ
                    </label>
                    <input
                      {...register('licenseNumber')}
                      className="input"
                      placeholder="CHN-001"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Địa chỉ
                    </label>
                    <input
                      {...register('address')}
                      className="input"
                      placeholder="Địa chỉ phòng khám / nơi làm việc"
                    />
                  </div>
                </>
              )}

              {role === 'nurse' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Khoa
                  </label>
                  <select
                    {...register('department')}
                    className="input"
                  >
                    <option value="">-- Chọn khoa --</option>
                    {departments?.map((dept: any) => (
                      <option key={dept.ma_khoa} value={dept.ma_khoa}>
                        {dept.ten_khoa} ({dept.ma_khoa})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {role === 'patient' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Địa chỉ
                    </label>
                    <input
                      {...register('address')}
                      className="input"
                      placeholder="123 Đường ABC"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ngày sinh
                    </label>
                    <input
                      {...register('dateOfBirth')}
                      type="date"
                      className="input"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button type="button" onClick={onClose} className="btn btn-secondary">
                Hủy
              </button>
              <button type="submit" disabled={isLoading} className="btn btn-primary">
                {isLoading ? 'Đang tạo...' : 'Tạo người dùng'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

