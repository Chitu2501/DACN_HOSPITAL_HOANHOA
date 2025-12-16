'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '@/components/Layout/AdminLayout';
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
  Stethoscope
} from 'lucide-react';
import { useForm } from 'react-hook-form';

// Mock data cho bác sĩ
const mockDoctors = [
  {
    _id: '2',
    code: 'BS001',
    fullName: 'Bác sĩ Nguyễn Văn A',
    email: 'bsnguyen@hospital.com',
    phone: '0912345678',
    specialization: 'Tim mạch',
    department: 'Khoa Tim mạch',
    licenseNumber: 'BS-001',
    workSchedule: 'Thứ 2, 4, 6 (8h-17h)',
    isActive: true,
  },
  {
    _id: '3',
    code: 'BS002',
    fullName: 'Bác sĩ Trần Thị B',
    email: 'bstran@hospital.com',
    phone: '0912345679',
    specialization: 'Nội khoa',
    department: 'Khoa Nội',
    licenseNumber: 'BS-002',
    workSchedule: 'Thứ 3, 5, 7 (8h-17h)',
    isActive: true,
  },
  {
    _id: '4',
    code: 'BS003',
    fullName: 'Bác sĩ Lê Văn C',
    email: 'bsle@hospital.com',
    phone: '0912345680',
    specialization: 'Ngoại khoa',
    department: 'Khoa Ngoại',
    licenseNumber: 'BS-003',
    workSchedule: 'Thứ 2-6 (8h-12h)',
    isActive: true,
  },
];

export default function DoctorsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Mock query
  const { data: doctors, isLoading } = useQuery({
    queryKey: ['doctors'],
    queryFn: async () => {
      return new Promise((resolve) => {
        setTimeout(() => resolve(mockDoctors), 500);
      });
    },
  });

  const filteredDoctors = (doctors as any[])?.filter((doctor) =>
    doctor.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doctor.specialization.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
              <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="mt-4 text-gray-600">Đang tải...</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDoctors?.map((doctor) => (
              <div key={doctor._id} className="card hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <Stethoscope className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{doctor.fullName}</h3>
                      <span className="text-xs text-gray-500">{doctor.code}</span>
                    </div>
                  </div>
                  <span className={`badge ${doctor.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {doctor.isActive ? 'Hoạt động' : 'Nghỉ'}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Stethoscope className="w-4 h-4" />
                    <span className="font-medium">{doctor.specialization}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="w-4 h-4" />
                    <span>{doctor.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="w-4 h-4" />
                    <span>{doctor.phone}</span>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-xs text-gray-500 mb-3">
                    <strong>Lịch làm việc:</strong> {doctor.workSchedule}
                  </p>
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
                          toast.success('Xóa bác sĩ thành công (Mock)');
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

