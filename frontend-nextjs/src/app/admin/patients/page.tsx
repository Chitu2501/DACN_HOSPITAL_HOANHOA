'use client';

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { AdminLayout } from '@/components/Layout/AdminLayout';
import { toast } from 'react-hot-toast';
import { Plus, Search, Edit, Eye, Trash2 } from 'lucide-react';

// Tạm thời dùng dữ liệu mock và thao tác cục bộ (chưa gọi API thực)
const mockPatients = [
  {
    _id: 'BN001',
    code: 'BN001',
    fullName: 'Nguyễn Thị F',
    dateOfBirth: '1990-05-15',
    gender: 'Nữ',
    phone: '0912345683',
    idCard: '0123456789',
    address: '123 Đường ABC, Q1, TP.HCM',
    insurance: 'BHYT123456',
  },
  {
    _id: 'BN002',
    code: 'BN002',
    fullName: 'Trần Văn G',
    dateOfBirth: '1985-08-20',
    gender: 'Nam',
    phone: '0912345684',
    idCard: '0987654321',
    address: '456 Đường XYZ, Q2, TP.HCM',
    insurance: 'BHYT654321',
  },
];

type Patient = typeof mockPatients[number];

export default function PatientsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [patients, setPatients] = useState<Patient[]>(mockPatients);
  const [viewing, setViewing] = useState<Patient | null>(null);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return patients.filter(
      (p) =>
        p.fullName.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q)
    );
  }, [patients, searchTerm]);

  const { register, handleSubmit, reset } = useForm<Patient>({
    defaultValues: editing || {},
  });

  const onSubmitEdit = (data: Patient) => {
    setIsSubmitting(true);
    try {
      setPatients((prev) =>
        prev.map((p) => (p._id === (editing?._id || data._id) ? { ...p, ...data } : p))
      );
      toast.success('Cập nhật bệnh nhân thành công');
      setEditing(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: string) => {
    if (!confirm('Bạn chắc chắn muốn xóa bệnh nhân này?')) return;
    setPatients((prev) => prev.filter((p) => p._id !== id));
    toast.success('Đã xóa bệnh nhân');
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Quản lý Bệnh nhân</h1>
            <p className="text-gray-600 mt-1">Quản lý thông tin bệnh nhân</p>
          </div>
          <button
            onClick={() => toast.info('Chức năng thêm mới đang phát triển')}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Thêm bệnh nhân
          </button>
        </div>

        <div className="card">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên, mã bệnh nhân..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10 w-full"
            />
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mã BN</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Họ tên</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày sinh</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Giới tính</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SĐT</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">BHYT</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered?.map((patient) => (
                  <tr key={patient._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{patient.code}</td>
                    <td className="px-6 py-4 text-gray-900">{patient.fullName}</td>
                    <td className="px-6 py-4 text-gray-600">
                      {new Date(patient.dateOfBirth).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-6 py-4 text-gray-600">{patient.gender}</td>
                    <td className="px-6 py-4 text-gray-600">{patient.phone}</td>
                    <td className="px-6 py-4 text-gray-600">{patient.insurance}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          onClick={() => setViewing(patient)}
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                          onClick={() => {
                            setEditing(patient);
                            reset(patient);
                          }}
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          onClick={() => handleDelete(patient._id)}
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
        </div>
      </div>

      {/* Modal xem */}
      {viewing && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-3">
            <h3 className="text-xl font-semibold text-gray-900">Thông tin bệnh nhân</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <p><strong>Mã BN:</strong> {viewing.code}</p>
              <p><strong>Họ tên:</strong> {viewing.fullName}</p>
              <p><strong>Ngày sinh:</strong> {new Date(viewing.dateOfBirth).toLocaleDateString('vi-VN')}</p>
              <p><strong>Giới tính:</strong> {viewing.gender}</p>
              <p><strong>SĐT:</strong> {viewing.phone}</p>
              <p><strong>BHYT:</strong> {viewing.insurance}</p>
              <p className="col-span-2"><strong>Địa chỉ:</strong> {viewing.address}</p>
              <p><strong>CCCD:</strong> {viewing.idCard}</p>
            </div>
            <div className="flex justify-end">
              <button
                className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                onClick={() => setViewing(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal sửa */}
      {editing && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl p-6 space-y-4">
            <h3 className="text-xl font-semibold text-gray-900">Chỉnh sửa bệnh nhân</h3>
            <form onSubmit={handleSubmit(onSubmitEdit)} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Mã BN</label>
                  <input className="input" {...register('code', { required: true })} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Họ tên</label>
                  <input className="input" {...register('fullName', { required: true })} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Ngày sinh</label>
                  <input type="date" className="input" {...register('dateOfBirth', { required: true })} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Giới tính</label>
                  <select className="input" {...register('gender', { required: true })}>
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">SĐT</label>
                  <input className="input" {...register('phone')} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">BHYT</label>
                  <input className="input" {...register('insurance')} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">CCCD</label>
                  <input className="input" {...register('idCard')} />
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-700">Địa chỉ</label>
                  <input className="input" {...register('address')} />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                  onClick={() => setEditing(null)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

