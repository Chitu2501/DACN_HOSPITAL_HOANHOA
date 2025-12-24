'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/Layout/AdminLayout';
import { adminApi } from '@/lib/api';
import {
  FileText,
  Plus,
  Search,
  Edit,
  Trash2,
  X,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Pill,
  User,
  Calendar,
  DollarSign,
  Eye,
  Package,
  Clock
} from 'lucide-react';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import { useDebounce } from '@/lib/hooks/useDebounce';

interface Prescription {
  ma_don_thuoc: string;
  trang_thai: string;
  ky_luc: string;
  ghi_chu?: string;
  ma_ho_so: string;
  ma_thanh_toan?: string;
  ngay_kham?: string;
  ly_do_kham?: string;
  chan_doan_cuoi?: string;
  ten_benh_nhan?: string;
  ma_benh_nhan?: string;
  trang_thai_thanh_toan?: string;
  tong_tien: number;
  chi_tiet?: PrescriptionDetail[];
}

interface PrescriptionDetail {
  ma_chi_tiet_don: string;
  ma_thuoc: string;
  ten_thuoc: string;
  don_vi: string;
  ham_luong_lieu_dung?: string;
  tan_suat?: string;
  so_ngay?: number;
  so_luong: number;
  don_gia: number;
  gia_thuoc: number;
  huong_dan?: string;
  thanh_tien: number;
}

interface MedicalRecord {
  ma_ho_so: string;
  ngay_kham: string;
  ly_do_kham?: string;
  ten_benh_nhan?: string;
}

export default function PrescriptionsManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [editingPrescription, setEditingPrescription] = useState<Prescription | null>(null);
  const [formData, setFormData] = useState({
    ma_ho_so: '',
    trang_thai: 'draft',
    ghi_chu: '',
    ma_thanh_toan: '',
  });
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  
  const queryClient = useQueryClient();
  const debouncedSearch = useDebounce(searchTerm, 500);

  // Fetch prescriptions
  const { data: prescriptionsData, isLoading, error } = useQuery({
    queryKey: ['prescriptions', debouncedSearch, statusFilter],
    queryFn: async () => {
      const params: any = { page: 1, limit: 100 };
      if (debouncedSearch) params.search = debouncedSearch;
      if (statusFilter) params.trang_thai = statusFilter;
      const response = await adminApi.getPrescriptions(params);
      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Không thể tải danh sách đơn thuốc');
      }
      return response.data;
    },
    staleTime: 2 * 60 * 1000,
  });

  // Fetch medical records for creating prescription
  const { data: medicalRecordsData } = useQuery({
    queryKey: ['medical-records-for-prescription'],
    queryFn: async () => {
      // You may need to create an API endpoint to get medical records
      // For now, we'll use an empty array
      return { data: [] };
    },
    enabled: isModalOpen && !editingPrescription,
  });

  // Fetch medicines for adding to prescription
  const { data: medicinesData } = useQuery({
    queryKey: ['medicines-for-prescription'],
    queryFn: async () => {
      const response = await adminApi.getMedicines({ limit: 1000 });
      if (!response.data?.success) {
        return { data: [] };
      }
      return response.data.data || [];
    },
    enabled: isDetailModalOpen,
  });

  // Fetch prescription detail
  const { data: prescriptionDetailData, refetch: refetchDetail } = useQuery({
    queryKey: ['prescription-detail', selectedPrescription?.ma_don_thuoc],
    queryFn: async () => {
      if (!selectedPrescription) return null;
      const response = await adminApi.getPrescriptionById(selectedPrescription.ma_don_thuoc);
      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Không thể tải chi tiết đơn thuốc');
      }
      return response.data.data;
    },
    enabled: !!selectedPrescription && isDetailModalOpen,
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingPrescription) {
        return adminApi.updatePrescription(editingPrescription.ma_don_thuoc, data);
      } else {
        return adminApi.createPrescription(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      setIsModalOpen(false);
      setEditingPrescription(null);
      resetForm();
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
    },
    onError: (error: any) => {
      setShowErrorToast(error?.response?.data?.message || 'Có lỗi xảy ra');
      setTimeout(() => setShowErrorToast(''), 5000);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return adminApi.deletePrescription(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      setDeleteConfirm(null);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
    },
    onError: (error: any) => {
      setShowErrorToast(error?.response?.data?.message || 'Không thể xóa đơn thuốc');
      setTimeout(() => setShowErrorToast(''), 5000);
      setDeleteConfirm(null);
    },
  });

  const resetForm = () => {
    setFormData({
      ma_ho_so: '',
      trang_thai: 'draft',
      ghi_chu: '',
      ma_thanh_toan: '',
    });
  };

  const handleOpenModal = (prescription?: Prescription) => {
    if (prescription) {
      setEditingPrescription(prescription);
      setFormData({
        ma_ho_so: prescription.ma_ho_so,
        trang_thai: prescription.trang_thai || 'draft',
        ghi_chu: prescription.ghi_chu || '',
        ma_thanh_toan: prescription.ma_thanh_toan || '',
      });
    } else {
      setEditingPrescription(null);
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPrescription(null);
    resetForm();
  };

  const handleViewDetail = (prescription: Prescription) => {
    setSelectedPrescription(prescription);
    setIsDetailModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      ma_ho_so: formData.ma_ho_so,
      trang_thai: formData.trang_thai,
      ghi_chu: formData.ghi_chu || undefined,
      ma_thanh_toan: formData.ma_thanh_toan || undefined,
    });
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
      draft: { label: 'Nháp', bg: 'bg-slate-100', text: 'text-slate-700' },
      pending: { label: 'Chờ xác nhận', bg: 'bg-amber-100', text: 'text-amber-700' },
      confirmed: { label: 'Đã xác nhận', bg: 'bg-blue-100', text: 'text-blue-700' },
      dispensed: { label: 'Đã phát thuốc', bg: 'bg-emerald-100', text: 'text-emerald-700' },
      cancelled: { label: 'Đã hủy', bg: 'bg-red-100', text: 'text-red-700' },
    };
    const config = statusConfig[status] || { label: status, bg: 'bg-gray-100', text: 'text-gray-700' };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const prescriptions = prescriptionsData?.data || [];
  const prescriptionDetail = prescriptionDetailData || null;
  const medicines = medicinesData || [];

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-sky-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-slate-900">Quản lý đơn thuốc</h1>
                  <p className="text-slate-600 mt-1">Quản lý đơn thuốc và chi tiết thuốc</p>
                </div>
              </div>
              <button
                onClick={() => handleOpenModal()}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                <Plus className="w-5 h-5" />
                Tạo đơn thuốc mới
              </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm theo mã đơn, tên bệnh nhân..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="draft">Nháp</option>
                <option value="pending">Chờ xác nhận</option>
                <option value="confirmed">Đã xác nhận</option>
                <option value="dispensed">Đã phát thuốc</option>
                <option value="cancelled">Đã hủy</option>
              </select>
            </div>
          </div>

          {/* Success Toast */}
          {showSuccessToast && (
            <div className="fixed top-20 right-4 z-50 flex items-center gap-2 bg-emerald-500 text-white px-6 py-4 rounded-xl shadow-xl animate-slide-in">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-medium">Thao tác thành công!</span>
            </div>
          )}

          {/* Error Toast */}
          {showErrorToast && (
            <div className="fixed top-20 right-4 z-50 flex items-center gap-2 bg-red-500 text-white px-6 py-4 rounded-xl shadow-xl animate-slide-in">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">{showErrorToast}</span>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
              <p className="text-red-700 font-semibold">Có lỗi xảy ra khi tải dữ liệu</p>
              <p className="text-red-600 text-sm mt-1">{(error as any)?.message || 'Vui lòng thử lại sau'}</p>
            </div>
          )}

          {/* Prescriptions Table */}
          {!isLoading && !error && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase">Mã đơn</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase">Bệnh nhân</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase">Ngày ký</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase">Trạng thái</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase">Tổng tiền</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-slate-700 uppercase">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {prescriptions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center">
                          <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                          <p className="text-slate-500">Chưa có đơn thuốc nào</p>
                        </td>
                      </tr>
                    ) : (
                      prescriptions.map((prescription: Prescription) => (
                        <tr key={prescription.ma_don_thuoc} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-mono text-sm font-semibold text-slate-900">
                              {prescription.ma_don_thuoc.substring(0, 8)}...
                            </div>
                            <div className="text-xs text-slate-500 mt-1">HS: {prescription.ma_ho_so.substring(0, 8)}...</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-medium text-slate-900">{prescription.ten_benh_nhan || 'N/A'}</div>
                            {prescription.ngay_kham && (
                              <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {formatDate(prescription.ngay_kham)}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {prescription.ky_luc ? (
                              <div className="text-sm text-slate-700 flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {formatDateTime(prescription.ky_luc)}
                              </div>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {getStatusBadge(prescription.trang_thai)}
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-semibold text-emerald-600">
                              {formatCurrency(prescription.tong_tien)}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleViewDetail(prescription)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Xem chi tiết"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleOpenModal(prescription)}
                                className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                title="Chỉnh sửa"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(prescription.ma_don_thuoc)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Xóa"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Create/Edit Modal */}
          {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-slate-900">
                    {editingPrescription ? 'Chỉnh sửa đơn thuốc' : 'Tạo đơn thuốc mới'}
                  </h2>
                  <button
                    onClick={handleCloseModal}
                    className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Mã hồ sơ khám <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.ma_ho_so}
                      onChange={(e) => setFormData({ ...formData, ma_ho_so: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Nhập mã hồ sơ khám"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Trạng thái <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.trang_thai}
                      onChange={(e) => setFormData({ ...formData, trang_thai: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="draft">Nháp</option>
                      <option value="pending">Chờ xác nhận</option>
                      <option value="confirmed">Đã xác nhận</option>
                      <option value="dispensed">Đã phát thuốc</option>
                      <option value="cancelled">Đã hủy</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Ghi chú
                    </label>
                    <textarea
                      value={formData.ghi_chu}
                      onChange={(e) => setFormData({ ...formData, ghi_chu: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Nhập ghi chú (nếu có)"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Mã thanh toán
                    </label>
                    <input
                      type="text"
                      value={formData.ma_thanh_toan}
                      onChange={(e) => setFormData({ ...formData, ma_thanh_toan: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Nhập mã thanh toán (nếu có)"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={saveMutation.isPending}
                      className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {saveMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Đang lưu...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Lưu
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Detail Modal - Will be implemented in next part */}
          {isDetailModalOpen && selectedPrescription && (
            <PrescriptionDetailModal
              prescription={prescriptionDetail || selectedPrescription}
              medicines={medicines}
              onClose={() => {
                setIsDetailModalOpen(false);
                setSelectedPrescription(null);
              }}
              onRefresh={refetchDetail}
            />
          )}

          {/* Delete Confirmation Modal */}
          {deleteConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Xác nhận xóa</h3>
                    <p className="text-sm text-slate-600">Bạn có chắc chắn muốn xóa đơn thuốc này?</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={() => handleDelete(deleteConfirm)}
                    disabled={deleteMutation.isPending}
                    className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {deleteMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Đang xóa...
                      </>
                    ) : (
                      'Xóa'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

// Prescription Detail Modal Component
function PrescriptionDetailModal({
  prescription,
  medicines,
  onClose,
  onRefresh
}: {
  prescription: Prescription;
  medicines: any[];
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [isAddingMedicine, setIsAddingMedicine] = useState(false);
  const [medicineForm, setMedicineForm] = useState({
    ma_thuoc: '',
    ham_luong_lieu_dung: '',
    tan_suat: '',
    so_ngay: '',
    so_luong: '',
    don_gia: '',
    huong_dan: '',
  });
  const queryClient = useQueryClient();

  const addMedicineMutation = useMutation({
    mutationFn: async (data: any) => {
      return adminApi.addPrescriptionDetail(prescription.ma_don_thuoc, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescription-detail'] });
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      setIsAddingMedicine(false);
      setMedicineForm({
        ma_thuoc: '',
        ham_luong_lieu_dung: '',
        tan_suat: '',
        so_ngay: '',
        so_luong: '',
        don_gia: '',
        huong_dan: '',
      });
      onRefresh();
    },
  });

  const deleteDetailMutation = useMutation({
    mutationFn: async (detailId: string) => {
      return adminApi.deletePrescriptionDetail(prescription.ma_don_thuoc, detailId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescription-detail'] });
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      onRefresh();
    },
  });

  const selectedMedicine = medicines.find((m: any) => m.ma_thuoc === medicineForm.ma_thuoc);
  const totalAmount = prescription.chi_tiet?.reduce((sum, item) => sum + item.thanh_tien, 0) || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Chi tiết đơn thuốc</h2>
            <p className="text-sm text-slate-500 mt-1">Mã đơn: {prescription.ma_don_thuoc.substring(0, 8)}...</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Patient Info */}
          <div className="bg-slate-50 rounded-lg p-4">
            <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <User className="w-5 h-5" />
              Thông tin bệnh nhân
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-600">Tên bệnh nhân:</span>
                <span className="ml-2 font-medium text-slate-900">{prescription.ten_benh_nhan || 'N/A'}</span>
              </div>
              {prescription.ngay_kham && (
                <div>
                  <span className="text-slate-600">Ngày khám:</span>
                  <span className="ml-2 font-medium text-slate-900">{formatDate(prescription.ngay_kham)}</span>
                </div>
              )}
              {prescription.ly_do_kham && (
                <div className="col-span-2">
                  <span className="text-slate-600">Lý do khám:</span>
                  <span className="ml-2 font-medium text-slate-900">{prescription.ly_do_kham}</span>
                </div>
              )}
              {prescription.chan_doan_cuoi && (
                <div className="col-span-2">
                  <span className="text-slate-600">Chẩn đoán:</span>
                  <span className="ml-2 font-medium text-slate-900">{prescription.chan_doan_cuoi}</span>
                </div>
              )}
            </div>
          </div>

          {/* Medicines List */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <Pill className="w-5 h-5" />
                Danh sách thuốc
              </h3>
              <button
                onClick={() => setIsAddingMedicine(!isAddingMedicine)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Thêm thuốc
              </button>
            </div>

            {/* Add Medicine Form */}
            {isAddingMedicine && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h4 className="font-semibold text-blue-900 mb-3">Thêm thuốc mới</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Thuốc *</label>
                    <select
                      value={medicineForm.ma_thuoc}
                      onChange={(e) => {
                        const med = medicines.find((m: any) => m.ma_thuoc === e.target.value);
                        setMedicineForm({
                          ...medicineForm,
                          ma_thuoc: e.target.value,
                          don_gia: med?.gia?.toString() || '',
                        });
                      }}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Chọn thuốc</option>
                      {medicines.map((med: any) => (
                        <option key={med.ma_thuoc} value={med.ma_thuoc}>
                          {med.ten_thuoc} - {formatCurrency(med.gia)}/{med.don_vi}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Hàm lượng/Liều dùng</label>
                    <input
                      type="text"
                      value={medicineForm.ham_luong_lieu_dung}
                      onChange={(e) => setMedicineForm({ ...medicineForm, ham_luong_lieu_dung: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      placeholder="Ví dụ: 500mg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Tần suất</label>
                    <input
                      type="text"
                      value={medicineForm.tan_suat}
                      onChange={(e) => setMedicineForm({ ...medicineForm, tan_suat: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      placeholder="Ví dụ: 2 lần/ngày"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Số ngày</label>
                    <input
                      type="number"
                      value={medicineForm.so_ngay}
                      onChange={(e) => setMedicineForm({ ...medicineForm, so_ngay: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      placeholder="7"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Số lượng *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={medicineForm.so_luong}
                      onChange={(e) => setMedicineForm({ ...medicineForm, so_luong: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      placeholder="10"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Đơn giá</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={medicineForm.don_gia}
                      onChange={(e) => setMedicineForm({ ...medicineForm, don_gia: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      placeholder={selectedMedicine?.gia?.toString() || '0'}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Hướng dẫn sử dụng</label>
                    <textarea
                      value={medicineForm.huong_dan}
                      onChange={(e) => setMedicineForm({ ...medicineForm, huong_dan: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      placeholder="Uống sau bữa ăn..."
                    />
                  </div>
                  <div className="col-span-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingMedicine(false);
                        setMedicineForm({
                          ma_thuoc: '',
                          ham_luong_lieu_dung: '',
                          tan_suat: '',
                          so_ngay: '',
                          so_luong: '',
                          don_gia: '',
                          huong_dan: '',
                        });
                      }}
                      className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!medicineForm.ma_thuoc || !medicineForm.so_luong) return;
                        addMedicineMutation.mutate({
                          ma_thuoc: medicineForm.ma_thuoc,
                          ham_luong_lieu_dung: medicineForm.ham_luong_lieu_dung || undefined,
                          tan_suat: medicineForm.tan_suat || undefined,
                          so_ngay: medicineForm.so_ngay ? parseInt(medicineForm.so_ngay) : undefined,
                          so_luong: parseInt(medicineForm.so_luong),
                          don_gia: medicineForm.don_gia ? parseFloat(medicineForm.don_gia) : undefined,
                          huong_dan: medicineForm.huong_dan || undefined,
                        });
                      }}
                      disabled={addMedicineMutation.isPending || !medicineForm.ma_thuoc || !medicineForm.so_luong}
                      className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
                    >
                      {addMedicineMutation.isPending ? 'Đang thêm...' : 'Thêm thuốc'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Medicines Table */}
            {prescription.chi_tiet && prescription.chi_tiet.length > 0 ? (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Thuốc</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Liều dùng</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">SL</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Đơn giá</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700">Thành tiền</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {prescription.chi_tiet.map((detail: PrescriptionDetail) => (
                      <tr key={detail.ma_chi_tiet_don}>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900">{detail.ten_thuoc}</div>
                          <div className="text-xs text-slate-500">{detail.don_vi}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-slate-700">
                            {detail.ham_luong_lieu_dung && <div>{detail.ham_luong_lieu_dung}</div>}
                            {detail.tan_suat && <div className="text-xs text-slate-500">{detail.tan_suat}</div>}
                            {detail.so_ngay && <div className="text-xs text-slate-500">{detail.so_ngay} ngày</div>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">{detail.so_luong}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{formatCurrency(detail.don_gia)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                          {formatCurrency(detail.thanh_tien)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => deleteDetailMutation.mutate(detail.ma_chi_tiet_don)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Xóa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50">
                    <tr>
                      <td colSpan={4} className="px-4 py-3 text-right font-semibold text-slate-900">
                        Tổng cộng:
                      </td>
                      <td colSpan={2} className="px-4 py-3 text-right font-bold text-lg text-emerald-600">
                        {formatCurrency(totalAmount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <Pill className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p>Chưa có thuốc nào trong đơn</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              onClick={onClose}
              className="px-6 py-2.5 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

