'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/Layout/AdminLayout';
import { adminApi } from '@/lib/api';
import {
  Pill,
  Plus,
  Search,
  Edit,
  Trash2,
  X,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Package,
  DollarSign,
  Building2,
  Layers
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useDebounce } from '@/lib/hooks/useDebounce';

interface Medicine {
  ma_thuoc: string;
  ten_thuoc: string;
  don_vi: string;
  gia: number;
  ma_kho_thuoc?: string;
  ten_kho?: string;
  ton_kho?: number;
  hoat_dong?: boolean;
}

interface Warehouse {
  ma_kho_thuoc: string;
  ten_kho: string;
  don_vi_tinh?: string;
  duong_dung?: string;
  gia_niem_yet: number;
  ton_kho: number;
  hoat_dong: boolean;
}

export default function MedicinesManagement() {
  const [activeTab, setActiveTab] = useState<'medicines' | 'warehouses'>('medicines');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [formData, setFormData] = useState({
    ten_thuoc: '',
    don_vi: '',
    gia: '',
    ma_kho_thuoc: '',
  });
  const [warehouseFormData, setWarehouseFormData] = useState({
    ten_kho: '',
    don_vi_tinh: '',
    duong_dung: '',
    gia_niem_yet: '',
    ton_kho: '',
    hoat_dong: true,
  });
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteWarehouseConfirm, setDeleteWarehouseConfirm] = useState<string | null>(null);
  
  const queryClient = useQueryClient();
  const debouncedSearch = useDebounce(searchTerm, 500);

  // Fetch medicines
  const { data: medicinesData, isLoading, error } = useQuery({
    queryKey: ['medicines', debouncedSearch, selectedWarehouse],
    queryFn: async () => {
      const params: any = { page: 1, limit: 100 };
      if (debouncedSearch) params.search = debouncedSearch;
      if (selectedWarehouse) params.ma_kho_thuoc = selectedWarehouse;
      const response = await adminApi.getMedicines(params);
      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Không thể tải danh sách thuốc');
      }
      return response.data;
    },
    staleTime: 2 * 60 * 1000,
  });

  // Fetch warehouses (for dropdown)
  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const response = await adminApi.getWarehouses();
      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Không thể tải danh sách kho');
      }
      return response.data.data || [];
    },
    staleTime: 10 * 60 * 1000,
  });

  // Fetch all warehouses (for management)
  const { data: allWarehousesData, isLoading: isLoadingWarehouses, refetch: refetchWarehouses } = useQuery({
    queryKey: ['all-warehouses', debouncedSearch],
    queryFn: async () => {
      const params: any = {};
      if (debouncedSearch) params.search = debouncedSearch;
      const response = await adminApi.getAllWarehouses(params);
      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Không thể tải danh sách kho');
      }
      return response.data.data || [];
    },
    enabled: activeTab === 'warehouses',
    staleTime: 0, // Always refetch to get latest data
    refetchOnWindowFocus: true,
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingMedicine) {
        return adminApi.updateMedicine(editingMedicine.ma_thuoc, data);
      } else {
        return adminApi.createMedicine(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicines'] });
      setIsModalOpen(false);
      setEditingMedicine(null);
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
      return adminApi.deleteMedicine(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicines'] });
      setDeleteConfirm(null);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
    },
    onError: (error: any) => {
      setShowErrorToast(error?.response?.data?.message || 'Không thể xóa thuốc');
      setTimeout(() => setShowErrorToast(''), 5000);
      setDeleteConfirm(null);
    },
  });

  // Warehouse mutations
  const saveWarehouseMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingWarehouse) {
        return adminApi.updateWarehouse(editingWarehouse.ma_kho_thuoc, data);
      } else {
        return adminApi.createWarehouse(data);
      }
    },
    onSuccess: async () => {
      setIsModalOpen(false);
      setEditingWarehouse(null);
      resetWarehouseForm();
      
      // Invalidate và refetch queries
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      queryClient.invalidateQueries({ queryKey: ['all-warehouses'] });
      
      // Force refetch để đảm bảo dữ liệu được cập nhật ngay lập tức
      if (activeTab === 'warehouses') {
        await refetchWarehouses();
      }
      
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
    },
    onError: (error: any) => {
      setShowErrorToast(error?.response?.data?.message || 'Có lỗi xảy ra');
      setTimeout(() => setShowErrorToast(''), 5000);
    },
  });

  const deleteWarehouseMutation = useMutation({
    mutationFn: async (id: string) => {
      return adminApi.deleteWarehouse(id);
    },
    onSuccess: async () => {
      // Invalidate và refetch queries
      await queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      await queryClient.invalidateQueries({ queryKey: ['all-warehouses'] });
      // Force refetch để đảm bảo dữ liệu được cập nhật ngay lập tức
      await refetchWarehouses();
      setDeleteWarehouseConfirm(null);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
    },
    onError: (error: any) => {
      setShowErrorToast(error?.response?.data?.message || 'Không thể xóa kho thuốc');
      setTimeout(() => setShowErrorToast(''), 5000);
      setDeleteWarehouseConfirm(null);
    },
  });

  const resetForm = () => {
    setFormData({
      ten_thuoc: '',
      don_vi: '',
      gia: '',
      ma_kho_thuoc: '',
    });
  };

  const resetWarehouseForm = () => {
    setWarehouseFormData({
      ten_kho: '',
      don_vi_tinh: '',
      duong_dung: '',
      gia_niem_yet: '',
      ton_kho: '',
      hoat_dong: true,
    });
  };

  const handleOpenModal = (medicine?: Medicine) => {
    if (medicine) {
      setEditingMedicine(medicine);
      setFormData({
        ten_thuoc: medicine.ten_thuoc,
        don_vi: medicine.don_vi,
        gia: medicine.gia.toString(),
        ma_kho_thuoc: medicine.ma_kho_thuoc || '',
      });
    } else {
      setEditingMedicine(null);
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handleOpenWarehouseModal = (warehouse?: Warehouse) => {
    if (warehouse) {
      setEditingWarehouse(warehouse);
      setWarehouseFormData({
        ten_kho: warehouse.ten_kho,
        don_vi_tinh: warehouse.don_vi_tinh || '',
        duong_dung: warehouse.duong_dung || '',
        gia_niem_yet: warehouse.gia_niem_yet.toString(),
        ton_kho: warehouse.ton_kho.toString(),
        hoat_dong: warehouse.hoat_dong,
      });
    } else {
      setEditingWarehouse(null);
      resetWarehouseForm();
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingMedicine(null);
    setEditingWarehouse(null);
    resetForm();
    resetWarehouseForm();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      ten_thuoc: formData.ten_thuoc,
      don_vi: formData.don_vi,
      gia: parseFloat(formData.gia),
      ma_kho_thuoc: formData.ma_kho_thuoc || undefined,
    });
  };

  const handleWarehouseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveWarehouseMutation.mutate({
      ten_kho: warehouseFormData.ten_kho,
      don_vi_tinh: warehouseFormData.don_vi_tinh || undefined,
      duong_dung: warehouseFormData.duong_dung || undefined,
      gia_niem_yet: warehouseFormData.gia_niem_yet ? parseFloat(warehouseFormData.gia_niem_yet) : undefined,
      ton_kho: warehouseFormData.ton_kho ? parseInt(warehouseFormData.ton_kho) : 0,
      hoat_dong: warehouseFormData.hoat_dong,
    });
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const medicines = medicinesData?.data || [];
  const warehouses = warehousesData || [];

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-sky-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                  <Pill className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-slate-900">Quản lý thuốc</h1>
                  <p className="text-slate-600 mt-1">Quản lý danh mục thuốc và kho thuốc</p>
                </div>
              </div>
              {activeTab === 'medicines' ? (
                <button
                  onClick={() => handleOpenModal()}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
                >
                  <Plus className="w-5 h-5" />
                  Thêm thuốc mới
                </button>
              ) : (
                <button
                  onClick={() => handleOpenWarehouseModal()}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
                >
                  <Plus className="w-5 h-5" />
                  Thêm kho thuốc mới
                </button>
              )}
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-4 border-b border-slate-200">
              <button
                onClick={() => {
                  setActiveTab('medicines');
                  setSearchTerm('');
                }}
                className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
                  activeTab === 'medicines'
                    ? 'border-emerald-600 text-emerald-600'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Pill className="w-5 h-5" />
                  Thuốc
                </div>
              </button>
              <button
                onClick={() => {
                  setActiveTab('warehouses');
                  setSearchTerm('');
                }}
                className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
                  activeTab === 'warehouses'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5" />
                  Kho thuốc
                </div>
              </button>
            </div>

            {/* Filters */}
            {activeTab === 'medicines' && (
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm theo tên thuốc..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
                <select
                  value={selectedWarehouse}
                  onChange={(e) => setSelectedWarehouse(e.target.value)}
                  className="px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
                >
                  <option value="">Tất cả kho</option>
                  {warehouses.map((wh: Warehouse) => (
                    <option key={wh.ma_kho_thuoc} value={wh.ma_kho_thuoc}>
                      {wh.ten_kho}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {activeTab === 'warehouses' && (
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm theo tên kho..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}
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
          {((activeTab === 'medicines' && isLoading) || (activeTab === 'warehouses' && isLoadingWarehouses)) && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
            </div>
          )}

          {/* Error State */}
          {error && activeTab === 'medicines' && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
              <p className="text-red-700 font-semibold">Có lỗi xảy ra khi tải dữ liệu</p>
              <p className="text-red-600 text-sm mt-1">{(error as any)?.message || 'Vui lòng thử lại sau'}</p>
            </div>
          )}

          {/* Medicines Grid */}
          {activeTab === 'medicines' && !isLoading && !error && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {medicines.length === 0 ? (
                <div className="col-span-full text-center py-20">
                  <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 text-lg">Chưa có thuốc nào</p>
                  <p className="text-slate-400 text-sm mt-2">Hãy thêm thuốc mới để bắt đầu</p>
                </div>
              ) : (
                medicines.map((medicine: Medicine) => (
                  <div
                    key={medicine.ma_thuoc}
                    className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden"
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-slate-900 mb-1">{medicine.ten_thuoc}</h3>
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Package className="w-4 h-4" />
                            <span>{medicine.don_vi}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleOpenModal(medicine)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(medicine.ma_thuoc)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2 pt-4 border-t border-slate-100">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-600 flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />
                            Giá:
                          </span>
                          <span className="font-semibold text-emerald-600">{formatCurrency(medicine.gia)}</span>
                        </div>
                        {medicine.ten_kho && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-600 flex items-center gap-1">
                              <Building2 className="w-4 h-4" />
                              Kho:
                            </span>
                            <span className="text-sm font-medium text-slate-900">{medicine.ten_kho}</span>
                          </div>
                        )}
                        {medicine.ton_kho !== undefined && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-600">Tồn kho:</span>
                            <span className={`text-sm font-semibold ${
                              medicine.ton_kho > 0 ? 'text-emerald-600' : 'text-red-600'
                            }`}>
                              {medicine.ton_kho}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Warehouses Grid */}
          {activeTab === 'warehouses' && (
            <>
              {isLoadingWarehouses ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {!allWarehousesData || allWarehousesData.length === 0 ? (
                    <div className="col-span-full text-center py-20">
                      <Layers className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-500 text-lg">Chưa có kho thuốc nào</p>
                      <p className="text-slate-400 text-sm mt-2">Hãy thêm kho thuốc mới để bắt đầu</p>
                    </div>
                  ) : (
                    allWarehousesData.map((warehouse: Warehouse) => (
                      <div
                        key={warehouse.ma_kho_thuoc}
                        className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden"
                      >
                        <div className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <h3 className="text-lg font-bold text-slate-900 mb-1">{warehouse.ten_kho}</h3>
                              <div className="flex items-center gap-2 text-sm text-slate-600">
                                <Layers className="w-4 h-4" />
                                <span className={warehouse.hoat_dong ? 'text-emerald-600' : 'text-red-600'}>
                                  {warehouse.hoat_dong ? 'Đang hoạt động' : 'Ngừng hoạt động'}
                                </span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleOpenWarehouseModal(warehouse)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeleteWarehouseConfirm(warehouse.ma_kho_thuoc)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <div className="space-y-2 pt-4 border-t border-slate-100">
                            {warehouse.don_vi_tinh && (
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-600">Đơn vị tính:</span>
                                <span className="text-sm font-medium text-slate-900">{warehouse.don_vi_tinh}</span>
                              </div>
                            )}
                            {warehouse.duong_dung && (
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-600">Đường dùng:</span>
                                <span className="text-sm font-medium text-slate-900">{warehouse.duong_dung}</span>
                              </div>
                            )}
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-slate-600 flex items-center gap-1">
                                <DollarSign className="w-4 h-4" />
                                Giá niêm yết:
                              </span>
                              <span className="font-semibold text-blue-600">{formatCurrency(warehouse.gia_niem_yet)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-slate-600">Tồn kho:</span>
                              <span className={`text-sm font-semibold ${
                                warehouse.ton_kho > 0 ? 'text-emerald-600' : 'text-red-600'
                              }`}>
                                {warehouse.ton_kho}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}

          {/* Create/Edit Modal - Medicine */}
          {isModalOpen && activeTab === 'medicines' && editingWarehouse === null && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-slate-900">
                    {editingMedicine ? 'Chỉnh sửa thuốc' : 'Thêm thuốc mới'}
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
                      Tên thuốc <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.ten_thuoc}
                      onChange={(e) => setFormData({ ...formData, ten_thuoc: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="Nhập tên thuốc"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Đơn vị <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.don_vi}
                      onChange={(e) => setFormData({ ...formData, don_vi: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="Ví dụ: viên, gói, chai..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Giá <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={formData.gia}
                      onChange={(e) => setFormData({ ...formData, gia: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Kho thuốc
                    </label>
                    <select
                      value={formData.ma_kho_thuoc}
                      onChange={(e) => setFormData({ ...formData, ma_kho_thuoc: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value="">Không chọn</option>
                      {warehouses.map((wh: Warehouse) => (
                        <option key={wh.ma_kho_thuoc} value={wh.ma_kho_thuoc}>
                          {wh.ten_kho}
                        </option>
                      ))}
                    </select>
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
                      className="flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
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

          {/* Create/Edit Modal - Warehouse */}
          {isModalOpen && activeTab === 'warehouses' && editingMedicine === null && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-slate-900">
                    {editingWarehouse ? 'Chỉnh sửa kho thuốc' : 'Thêm kho thuốc mới'}
                  </h2>
                  <button
                    onClick={handleCloseModal}
                    className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleWarehouseSubmit} className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Tên kho <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={warehouseFormData.ten_kho}
                      onChange={(e) => setWarehouseFormData({ ...warehouseFormData, ten_kho: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Nhập tên kho"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Đơn vị tính
                    </label>
                    <input
                      type="text"
                      value={warehouseFormData.don_vi_tinh}
                      onChange={(e) => setWarehouseFormData({ ...warehouseFormData, don_vi_tinh: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Ví dụ: viên, gói, chai..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Đường dùng
                    </label>
                    <input
                      type="text"
                      value={warehouseFormData.duong_dung}
                      onChange={(e) => setWarehouseFormData({ ...warehouseFormData, duong_dung: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Ví dụ: uống, tiêm, bôi..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Giá niêm yết
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={warehouseFormData.gia_niem_yet}
                      onChange={(e) => setWarehouseFormData({ ...warehouseFormData, gia_niem_yet: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Tồn kho
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={warehouseFormData.ton_kho}
                      onChange={(e) => setWarehouseFormData({ ...warehouseFormData, ton_kho: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={warehouseFormData.hoat_dong}
                        onChange={(e) => setWarehouseFormData({ ...warehouseFormData, hoat_dong: e.target.checked })}
                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-slate-700">Đang hoạt động</span>
                    </label>
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
                      disabled={saveWarehouseMutation.isPending}
                      className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {saveWarehouseMutation.isPending ? (
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

          {/* Delete Confirmation Modal - Medicine */}
          {deleteConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Xác nhận xóa</h3>
                    <p className="text-sm text-slate-600">Bạn có chắc chắn muốn xóa thuốc này?</p>
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

          {/* Delete Confirmation Modal - Warehouse */}
          {deleteWarehouseConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Xác nhận xóa</h3>
                    <p className="text-sm text-slate-600">Bạn có chắc chắn muốn xóa kho thuốc này?</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteWarehouseConfirm(null)}
                    className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={() => deleteWarehouseMutation.mutate(deleteWarehouseConfirm)}
                    disabled={deleteWarehouseMutation.isPending}
                    className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {deleteWarehouseMutation.isPending ? (
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

