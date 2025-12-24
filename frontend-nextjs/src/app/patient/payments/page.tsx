'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { PatientLayout } from '@/components/Layout/PatientLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { patientInvoicesApi, patientPaymentsApi, medicalRecordsApi, patientProfileApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import {
  CreditCard,
  Search,
  CheckCircle2,
  Clock,
  Eye,
  X,
  Calendar,
  FileText,
  Wallet,
  Banknote,
  Smartphone,
  Building2,
  Receipt,
  Printer,
} from 'lucide-react';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';

const paymentMethods = [
  { value: 'cash', label: 'Tiền mặt', icon: Banknote, color: 'from-emerald-500 to-emerald-600' },
  { value: 'card', label: 'Thẻ tín dụng/Ghi nợ', icon: CreditCard, color: 'from-sky-500 to-sky-600' },
  { value: 'momo', label: 'Ví MoMo', icon: Smartphone, color: 'from-pink-500 to-pink-600' },
  { value: 'bank_transfer', label: 'Chuyển khoản', icon: Building2, color: 'from-indigo-500 to-indigo-600' },
];

export default function PatientPayments() {
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('momo');
  const [showPrintInvoice, setShowPrintInvoice] = useState(false);
  const searchParams = useSearchParams();
  const { user } = useAuthStore();

  const queryClient = useQueryClient();

  // Fetch patient profile for invoice
  const { data: patientProfile } = useQuery({
    queryKey: ['patient-profile-for-invoice'],
    queryFn: async () => {
      const response = await patientProfileApi.get();
      return response.data?.data;
    },
    enabled: showPrintInvoice,
  });

  // Lấy tất cả thanh toán (cả invoices và medical records)
  const { data: allPaymentsData, isLoading: isLoadingPayments, refetch: refetchAllPayments } = useQuery({
    queryKey: ['patient-all-payments', filterStatus],
    queryFn: async () => {
      const params: any = {};
      if (filterStatus !== 'all') params.status = filterStatus;
      const response = await patientPaymentsApi.getAll(params);
      return response.data;
    },
    refetchOnWindowFocus: true, // Tự động refetch khi quay lại tab
    refetchOnMount: true, // Tự động refetch khi component mount lại
  });

  // Lấy invoices (để tương thích với code cũ)
  const { data: invoicesData, isLoading: isLoadingInvoices, refetch: refetchInvoices } = useQuery({
    queryKey: ['patient-invoices', filterStatus],
    queryFn: async () => {
      const params: any = {};
      if (filterStatus !== 'all') params.status = filterStatus;
      const response = await patientInvoicesApi.getAll(params);
      return response.data;
    },
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  const isLoading = isLoadingPayments || isLoadingInvoices;

  // Tự động refetch khi quay lại từ callback page (có paymentSuccess param)
  useEffect(() => {
    const paymentSuccess = searchParams.get('paymentSuccess');
    if (paymentSuccess === 'true') {
      // Force refetch để cập nhật dữ liệu ngay lập tức
      queryClient.invalidateQueries({ queryKey: ['patient-all-payments'] });
      queryClient.invalidateQueries({ queryKey: ['patient-invoices'] });
      refetchAllPayments();
      refetchInvoices();
      // Xóa param để tránh refetch lại
      window.history.replaceState({}, '', '/patient/payments');
      toast.success('Thanh toán thành công!');
    }
  }, [searchParams, queryClient, refetchAllPayments, refetchInvoices]);

  const payMutation = useMutation({
    mutationFn: async ({ id, paymentMethod }: { id: string; paymentMethod: string }) => {
      const response = await patientInvoicesApi.pay(id, paymentMethod);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['patient-all-payments'] });
      toast.success('Thanh toán thành công!');
      setShowPayModal(false);
      setSelectedInvoice(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi thanh toán');
    },
  });

  // Merge dữ liệu từ medical records payments và invoices
  const medicalRecordPayments = allPaymentsData?.data || [];
  const invoices = invoicesData?.data || [];
  
  // Chuyển đổi medical record payments thành format tương tự invoices
  const formattedMedicalPayments = medicalRecordPayments.map((payment: any) => ({
    ...payment,
    id: payment.id || payment.ma_thanh_toan,
    type: 'medical-record',
    // Tạo items giả để hiển thị
    items: [{
      description: payment.description || payment.reason || 'Thanh toán hồ sơ khám bệnh',
      quantity: 1,
      unitPrice: payment.amount,
      total: payment.amount
    }],
    // Thêm appointment info từ medical record
    appointment: payment.visitDate ? {
      date: payment.visitDate,
      reason: payment.reason || 'Khám bệnh',
      status: 'completed'
    } : null
  }));

  // Merge và sắp xếp tất cả payments
  const allPayments = [...formattedMedicalPayments, ...invoices].sort((a: any, b: any) => {
    const dateA = new Date(a.createdAt || a.paidAt || 0).getTime();
    const dateB = new Date(b.createdAt || b.paidAt || 0).getTime();
    return dateB - dateA; // Mới nhất trước
  });

  const filteredInvoices = allPayments.filter((inv: any) => {
    const matchesSearch =
      inv.id?.toString().includes(searchTerm) ||
      inv.ma_ho_so?.toString().includes(searchTerm) ||
      inv.appointment?.reason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.reason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const confirmPayment = () => {
    if (!selectedInvoice) return;

    if (selectedPaymentMethod === 'momo') {
      payMutation.mutate(
        {
          id: selectedInvoice.id?.toString() || selectedInvoice._id,
          paymentMethod: selectedPaymentMethod,
        },
        {
          onSuccess: (data: any) => {
            if (data.data?.paymentUrl) window.location.href = data.data.paymentUrl;
            else if (data.data?.deeplink) window.location.href = data.data.deeplink;
            else toast.error('Không thể tạo link thanh toán MoMo');
          },
        }
      );
    } else {
      payMutation.mutate({
        id: selectedInvoice.id?.toString() || selectedInvoice._id,
        paymentMethod: selectedPaymentMethod,
      });
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'UNPAID':
      case 'PENDING':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'CANCELLED':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'Đã thanh toán';
      case 'UNPAID':
        return 'Chưa thanh toán';
      case 'PENDING':
        return 'Chờ thanh toán';
      case 'CANCELLED':
        return 'Đã hủy';
      default:
        return status;
    }
  };

  const getPaymentMethodLabel = (method?: string) => {
    if (!method) return 'N/A';
    const methodObj = paymentMethods.find((m) => m.value === method);
    return methodObj?.label || method;
  };

  const statusCounts = {
    all: allPayments.length,
    UNPAID: allPayments.filter((inv: any) => inv.status === 'UNPAID' || inv.status === 'PENDING').length,
    PAID: allPayments.filter((inv: any) => inv.status === 'PAID').length,
    CANCELLED: allPayments.filter((inv: any) => inv.status === 'CANCELLED').length,
  };

  const totalUnpaid = allPayments
    .filter((inv: any) => inv.status === 'UNPAID' || inv.status === 'PENDING')
    .reduce((sum: number, inv: any) => sum + (inv.amount || 0), 0);

  const totalPaid = allPayments
    .filter((inv: any) => inv.status === 'PAID')
    .reduce((sum: number, inv: any) => sum + (inv.amount || 0), 0);

  const CardShell = ({ children }: { children: React.ReactNode }) => (
    <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm">{children}</div>
  );

  const IconBox = ({
    children,
    variant = 'slate',
  }: {
    children: React.ReactNode;
    variant?: 'slate' | 'amber' | 'emerald' | 'indigo';
  }) => {
    const map: Record<string, string> = {
      slate: 'bg-slate-50 border-slate-200 text-slate-800',
      amber: 'bg-amber-50 border-amber-200 text-amber-800',
      emerald: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      indigo: 'bg-indigo-50 border-indigo-200 text-indigo-800',
    };
    return (
      <div className={`w-12 h-12 rounded-lg border flex items-center justify-center ${map[variant]}`}>
        {children}
      </div>
    );
  };

  return (
    <PatientLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                <CreditCard className="w-5 h-5" />
              </div>
              Thanh toán
            </h1>
            <p className="text-slate-600 mt-1">Quản lý và thanh toán hóa đơn của bạn</p>
          </div>
        </div>

        {/* Summary Cards – bo gọn & thu nhỏ */}
<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
  <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-sm">
    <div className="flex items-center justify-between mb-2">
      <div className="w-9 h-9 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-800">
        <Receipt className="w-5 h-5" />
      </div>
    </div>
    <p className="text-2xl font-semibold text-slate-900 leading-tight">
      {statusCounts.all}
    </p>
    <p className="text-xs text-slate-600">Tổng hóa đơn</p>
  </div>

  <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-sm">
    <div className="flex items-center justify-between mb-2">
      <div className="w-9 h-9 rounded-md bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
        <Clock className="w-5 h-5" />
      </div>
    </div>
    <p className="text-2xl font-semibold text-slate-900 leading-tight">
      {statusCounts.UNPAID}
    </p>
    <p className="text-xs text-slate-600">Chưa thanh toán</p>
    <p className="text-[11px] text-amber-700 font-medium mt-1">
      {formatCurrency(totalUnpaid)}
    </p>
  </div>

  <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-sm">
    <div className="flex items-center justify-between mb-2">
      <div className="w-9 h-9 rounded-md bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
        <CheckCircle2 className="w-5 h-5" />
      </div>
    </div>
    <p className="text-2xl font-semibold text-slate-900 leading-tight">
      {statusCounts.PAID}
    </p>
    <p className="text-xs text-slate-600">Đã thanh toán</p>
    <p className="text-[11px] text-emerald-700 font-medium mt-1">
      {formatCurrency(totalPaid)}
    </p>
  </div>

  <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-sm">
    <div className="flex items-center justify-between mb-2">
      <div className="w-9 h-9 rounded-md bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700">
        <Wallet className="w-5 h-5" />
      </div>
    </div>
    <p className="text-xl font-semibold text-slate-900 leading-tight">
      {formatCurrency(totalUnpaid + totalPaid)}
    </p>
    <p className="text-xs text-slate-600">Tổng giá trị</p>
  </div>
</div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'all', label: 'Tất cả' },
            { key: 'UNPAID', label: 'Chưa thanh toán' },
            { key: 'PAID', label: 'Đã thanh toán' },
            { key: 'CANCELLED', label: 'Đã hủy' },
          ].map((t) => {
            const active = filterStatus === t.key;
            const count =
              t.key === 'all' ? statusCounts.all : (statusCounts as any)[t.key] ?? 0;
            return (
              <button
                key={t.key}
                onClick={() => setFilterStatus(t.key)}
                className={`px-4 py-2 rounded-lg font-semibold border transition-all ${
                  active
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
              >
                {t.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm theo mã hóa đơn hoặc lý do khám..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>
        </div>

        {/* Invoices List */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-12 h-12 border-4 border-slate-300 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="text-center py-16 rounded-xl bg-white border border-slate-200">
            <CreditCard className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-700 text-lg">Chưa có hóa đơn nào</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredInvoices.map((invoice: any) => (
              <div
                key={invoice.id || invoice._id}
                className="p-6 rounded-xl bg-white border border-slate-200 hover:border-slate-300 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                      <Receipt className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 text-lg mb-1">
                        {invoice.type === 'medical-record' 
                          ? `Hồ sơ khám #${invoice.ma_ho_so || invoice.id}` 
                          : `Hóa đơn #${invoice.id || invoice._id}`}
                      </h3>
                      <p className="text-sm text-slate-600">
                        {formatDate(invoice.createdAt || invoice.visitDate)}
                        {invoice.type === 'medical-record' && (
                          <span className="ml-2 px-2 py-0.5 text-xs bg-indigo-100 text-indigo-700 rounded">
                            Hồ sơ khám
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-3 py-1 rounded-lg text-xs font-semibold border ${getStatusBadgeColor(
                        invoice.status
                      )}`}
                    >
                      {getStatusLabel(invoice.status)}
                    </span>
                    <button
                      onClick={() => setSelectedInvoice(invoice)}
                      className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <Eye className="w-5 h-5 text-slate-600" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center gap-3 text-slate-700">
                    <Calendar className="w-5 h-5 text-slate-500" />
                    <div>
                      <p className="text-xs text-slate-500">Ngày tạo</p>
                      <p className="text-sm font-semibold">{formatDate(invoice.createdAt)}</p>
                    </div>
                  </div>

                  {invoice.dueDate && (
                    <div className="flex items-center gap-3 text-slate-700">
                      <Clock className="w-5 h-5 text-slate-500" />
                      <div>
                        <p className="text-xs text-slate-500">Hạn thanh toán</p>
                        <p className="text-sm font-semibold">{formatDate(invoice.dueDate)}</p>
                      </div>
                    </div>
                  )}

                  {(invoice.appointment || invoice.reason) && (
                    <div className="flex items-center gap-3 text-slate-700">
                      <FileText className="w-5 h-5 text-slate-500" />
                      <div>
                        <p className="text-xs text-slate-500">Lý do</p>
                        <p className="text-sm font-semibold">
                          {invoice.appointment?.reason || invoice.reason || 'Khám bệnh'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Tổng tiền</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {formatCurrency(invoice.amount)}
                    </p>
                  </div>

                  <div className="flex gap-3 items-center">
                    {(invoice.status === 'UNPAID' || invoice.status === 'PENDING') && (
                      <button
                        onClick={() => {
                          if (invoice.type === 'medical-record') {
                            // Thanh toán hồ sơ khám
                            medicalRecordsApi.pay(invoice.ma_ho_so || invoice.id, 'momo')
                              .then((response: any) => {
                                if (response.data?.data?.paymentUrl) {
                                  window.location.href = response.data.data.paymentUrl;
                                } else if (response.data?.data?.deeplink) {
                                  window.location.href = response.data.data.deeplink;
                                } else {
                                  toast.error('Không thể tạo link thanh toán MoMo');
                                }
                              })
                              .catch((error: any) => {
                                toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi thanh toán');
                              });
                          } else {
                            // Thanh toán hóa đơn thông thường
                            setSelectedInvoice(invoice);
                            setShowPayModal(true);
                          }
                        }}
                        className="px-5 py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-all"
                      >
                        Thanh toán ngay
                      </button>
                    )}

                    {invoice.status === 'PAID' && invoice.paymentMethod && (
                      <>
                        <div className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-200">
                          <p className="text-xs text-slate-500 mb-1">Phương thức</p>
                          <p className="text-sm font-semibold text-slate-900">
                            {getPaymentMethodLabel(invoice.paymentMethod)}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedInvoice(invoice);
                            setShowPrintInvoice(true);
                          }}
                          className="px-4 py-2 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-all flex items-center gap-2"
                        >
                          <Printer className="w-4 h-4" />
                          In hóa đơn
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Invoice Detail Modal */}
        {selectedInvoice && !showPayModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-3xl bg-white rounded-2xl border border-slate-200 p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Chi tiết hóa đơn</h2>
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-600" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="p-5 rounded-xl bg-slate-50 border border-slate-200">
                  <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-slate-700" />
                    {selectedInvoice.type === 'medical-record' ? 'Thông tin thanh toán hồ sơ khám' : 'Thông tin hóa đơn'}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-700">
                    <div>
                      <p className="text-sm text-slate-500 mb-1">
                        {selectedInvoice.type === 'medical-record' ? 'Mã hồ sơ khám' : 'Mã hóa đơn'}
                      </p>
                      <p className="font-semibold">
                        #{selectedInvoice.type === 'medical-record' 
                          ? (selectedInvoice.ma_ho_so || selectedInvoice.id) 
                          : (selectedInvoice.id || selectedInvoice._id)}
                      </p>
                    </div>
                    {selectedInvoice.type === 'medical-record' && selectedInvoice.ma_thanh_toan && (
                      <div>
                        <p className="text-sm text-slate-500 mb-1">Mã thanh toán</p>
                        <p className="font-semibold">#{selectedInvoice.ma_thanh_toan}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-slate-500 mb-1">Ngày tạo</p>
                      <p className="font-semibold">{formatDate(selectedInvoice.createdAt)}</p>
                    </div>
                    {selectedInvoice.dueDate && (
                      <div>
                        <p className="text-sm text-slate-500 mb-1">Hạn thanh toán</p>
                        <p className="font-semibold">{formatDate(selectedInvoice.dueDate)}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-slate-500 mb-1">Trạng thái</p>
                      <span
                        className={`inline-block px-3 py-1 rounded-lg text-xs font-semibold border ${getStatusBadgeColor(
                          selectedInvoice.status
                        )}`}
                      >
                        {getStatusLabel(selectedInvoice.status)}
                      </span>
                    </div>
                    {selectedInvoice.paymentMethod && (
                      <div>
                        <p className="text-sm text-slate-500 mb-1">Phương thức thanh toán</p>
                        <p className="font-semibold">{getPaymentMethodLabel(selectedInvoice.paymentMethod)}</p>
                      </div>
                    )}
                    {selectedInvoice.paidAt && (
                      <div>
                        <p className="text-sm text-slate-500 mb-1">Ngày thanh toán</p>
                        <p className="font-semibold">{formatDateTime(selectedInvoice.paidAt)}</p>
                      </div>
                    )}
                  </div>
                </div>

                {(selectedInvoice.appointment || selectedInvoice.visitDate || selectedInvoice.reason) && (
                  <div className="p-5 rounded-xl bg-slate-50 border border-slate-200">
                    <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-slate-700" />
                      {selectedInvoice.type === 'medical-record' ? 'Thông tin hồ sơ khám' : 'Thông tin lịch khám'}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-700">
                      {(selectedInvoice.appointment?.date || selectedInvoice.visitDate) && (
                        <div>
                          <p className="text-sm text-slate-500 mb-1">Ngày khám</p>
                          <p className="font-semibold">
                            {formatDate(selectedInvoice.appointment?.date || selectedInvoice.visitDate)}
                          </p>
                        </div>
                      )}
                      {selectedInvoice.appointment?.timeSlot && (
                        <div>
                          <p className="text-sm text-slate-500 mb-1">Giờ khám</p>
                          <p className="font-semibold">{selectedInvoice.appointment.timeSlot}</p>
                        </div>
                      )}
                      <div className="md:col-span-2">
                        <p className="text-sm text-slate-500 mb-1">Lý do khám</p>
                        <p className="font-semibold">
                          {selectedInvoice.appointment?.reason || selectedInvoice.reason || 'Khám bệnh'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-5 rounded-xl bg-slate-50 border border-slate-200">
                  <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-slate-700" />
                    Chi tiết hóa đơn
                  </h3>
                  <div className="space-y-3">
                    {selectedInvoice.items?.map((item: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
                        <div className="flex-1">
                          <p className="font-semibold text-slate-900">{item.description}</p>
                          <p className="text-sm text-slate-600">
                            {item.quantity} x {formatCurrency(item.unitPrice)}
                          </p>
                        </div>
                        <p className="font-bold text-slate-900">{formatCurrency(item.total)}</p>
                      </div>
                    ))}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                      <p className="text-lg font-semibold text-slate-900">Tổng cộng</p>
                      <p className="text-2xl font-bold text-slate-900">{formatCurrency(selectedInvoice.amount)}</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  {selectedInvoice.status === 'PAID' && (
                    <button
                      onClick={() => {
                        setShowPrintInvoice(true);
                      }}
                      className="flex-1 px-6 py-4 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-all flex items-center justify-center gap-2"
                    >
                      <Printer className="w-5 h-5" />
                      In hóa đơn
                    </button>
                  )}
                  {(selectedInvoice.status === 'UNPAID' || selectedInvoice.status === 'PENDING') && (
                    <button
                      onClick={() => {
                        if (selectedInvoice.type === 'medical-record') {
                          medicalRecordsApi.pay(selectedInvoice.ma_ho_so || selectedInvoice.id, 'momo')
                            .then((response: any) => {
                              if (response.data?.data?.paymentUrl) {
                                window.location.href = response.data.data.paymentUrl;
                              } else if (response.data?.data?.deeplink) {
                                window.location.href = response.data.data.deeplink;
                              } else {
                                toast.error('Không thể tạo link thanh toán MoMo');
                              }
                            })
                            .catch((error: any) => {
                              toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi thanh toán');
                            });
                        } else {
                          setShowPayModal(true);
                        }
                      }}
                      className="w-full px-6 py-4 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-all"
                    >
                      Thanh toán ngay
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Modal */}
        {showPayModal && selectedInvoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Thanh toán hóa đơn</h2>
                <button
                  onClick={() => {
                    setShowPayModal(false);
                    setSelectedInvoice(null);
                  }}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-600" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="p-5 rounded-xl bg-slate-50 border border-slate-200">
                  <p className="text-sm text-slate-600">Hóa đơn #{selectedInvoice.id || selectedInvoice._id}</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(selectedInvoice.amount)}</p>
                </div>

                <div>
                  <h3 className="font-semibold text-slate-900 mb-4">Chọn phương thức thanh toán</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {paymentMethods.map((method) => {
                      const Icon = method.icon;
                      const active = selectedPaymentMethod === method.value;
                      return (
                        <button
                          key={method.value}
                          onClick={() => setSelectedPaymentMethod(method.value)}
                          className={`p-4 rounded-xl border-2 transition-all text-left ${
                            active
                              ? 'border-slate-900 bg-slate-900 text-white'
                              : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-lg border flex items-center justify-center ${
                                active ? 'border-white/15 bg-white/10' : 'border-slate-200 bg-slate-50'
                              }`}
                            >
                              <Icon className={`w-5 h-5 ${active ? 'text-white' : 'text-slate-800'}`} />
                            </div>
                            <span className="font-semibold">{method.label}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowPayModal(false);
                      setSelectedInvoice(null);
                    }}
                    className="flex-1 px-6 py-3 bg-white border border-slate-200 text-slate-900 rounded-xl font-semibold hover:bg-slate-50 transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={confirmPayment}
                    disabled={payMutation.isPending}
                    className="flex-1 px-6 py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-all disabled:opacity-50"
                  >
                    {payMutation.isPending ? 'Đang xử lý...' : 'Xác nhận thanh toán'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Print Invoice Modal */}
        {showPrintInvoice && selectedInvoice && (
          <InvoicePrintView
            invoice={selectedInvoice}
            patient={patientProfile || user}
            onClose={() => {
              setShowPrintInvoice(false);
              setSelectedInvoice(null);
            }}
          />
        )}
      </div>
    </PatientLayout>
  );
}

// Invoice Print Component
function InvoicePrintView({ invoice, patient, onClose }: { invoice: any; patient: any; onClose: () => void }) {
  const { user } = useAuthStore();
  
  const getPaymentMethodLabel = (method?: string) => {
    if (!method) return 'N/A';
    const methodObj = paymentMethods.find((m) => m.value === method);
    return methodObj?.label || method;
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-invoice, .print-invoice * {
            visibility: visible;
          }
          .print-invoice {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0;
            margin: 0;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
      
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm no-print">
        <div className="w-full max-w-4xl bg-white rounded-2xl border border-slate-200 p-6 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6 no-print">
            <h2 className="text-2xl font-bold text-slate-900">Xem trước hóa đơn</h2>
            <div className="flex gap-3">
              <button
                onClick={handlePrint}
                className="px-6 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-all flex items-center gap-2"
              >
                <Printer className="w-5 h-5" />
                In hóa đơn
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>
          </div>

          <div className="print-invoice bg-white p-8">
            {/* Header */}
            <div className="text-center mb-8 pb-6 border-b-2 border-slate-300">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center">
                  <Receipt className="w-10 h-10 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-slate-900">HoanHao Hospital</h1>
                  <p className="text-sm text-slate-600">Hệ thống quản lý y tế</p>
                </div>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mt-4">
                {invoice.type === 'medical-record' ? 'HÓA ĐƠN THANH TOÁN HỒ SƠ KHÁM' : 'HÓA ĐƠN THANH TOÁN'}
              </h2>
            </div>

            {/* Invoice Info */}
            <div className="grid grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-4 pb-2 border-b border-slate-200">
                  Thông tin bệnh nhân
                </h3>
                <div className="space-y-2 text-slate-700">
                  <p><span className="font-semibold">Họ và tên:</span> {patient?.fullName || user?.fullName || 'N/A'}</p>
                  <p><span className="font-semibold">Email:</span> {patient?.email || user?.email || 'N/A'}</p>
                  <p><span className="font-semibold">Số điện thoại:</span> {patient?.phone || user?.phone || 'N/A'}</p>
                  {patient?.address && (
                    <p><span className="font-semibold">Địa chỉ:</span> {patient.address}</p>
                  )}
                </div>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-4 pb-2 border-b border-slate-200">
                  Thông tin hóa đơn
                </h3>
                <div className="space-y-2 text-slate-700">
                  <p>
                    <span className="font-semibold">
                      {invoice.type === 'medical-record' ? 'Mã hồ sơ khám:' : 'Mã hóa đơn:'}
                    </span>{' '}
                    #{invoice.type === 'medical-record' 
                      ? (invoice.ma_ho_so || invoice.id) 
                      : (invoice.id || invoice._id)}
                  </p>
                  {invoice.type === 'medical-record' && invoice.ma_thanh_toan && (
                    <p><span className="font-semibold">Mã thanh toán:</span> #{invoice.ma_thanh_toan}</p>
                  )}
                  <p><span className="font-semibold">Ngày tạo:</span> {formatDate(invoice.createdAt || invoice.visitDate)}</p>
                  {invoice.paidAt && (
                    <p><span className="font-semibold">Ngày thanh toán:</span> {formatDateTime(invoice.paidAt)}</p>
                  )}
                  {invoice.paymentMethod && (
                    <p>
                      <span className="font-semibold">Phương thức:</span>{' '}
                      {getPaymentMethodLabel(invoice.paymentMethod)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Appointment Info */}
            {(invoice.appointment || invoice.visitDate || invoice.reason) && (
              <div className="mb-8 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <h3 className="text-lg font-bold text-slate-900 mb-3">
                  {invoice.type === 'medical-record' ? 'Thông tin hồ sơ khám' : 'Thông tin lịch khám'}
                </h3>
                <div className="grid grid-cols-2 gap-4 text-slate-700">
                  {(invoice.appointment?.date || invoice.visitDate) && (
                    <p>
                      <span className="font-semibold">Ngày khám:</span>{' '}
                      {formatDate(invoice.appointment?.date || invoice.visitDate)}
                    </p>
                  )}
                  {invoice.appointment?.timeSlot && (
                    <p>
                      <span className="font-semibold">Giờ khám:</span> {invoice.appointment.timeSlot}
                    </p>
                  )}
                  <p className="col-span-2">
                    <span className="font-semibold">Lý do khám:</span>{' '}
                    {invoice.appointment?.reason || invoice.reason || 'Khám bệnh'}
                  </p>
                </div>
              </div>
            )}

            {/* Invoice Items */}
            <div className="mb-8">
              <h3 className="text-lg font-bold text-slate-900 mb-4 pb-2 border-b border-slate-200">
                Chi tiết hóa đơn
              </h3>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-slate-300 px-4 py-3 text-left font-semibold text-slate-900">
                      STT
                    </th>
                    <th className="border border-slate-300 px-4 py-3 text-left font-semibold text-slate-900">
                      Mô tả dịch vụ
                    </th>
                    <th className="border border-slate-300 px-4 py-3 text-center font-semibold text-slate-900">
                      Số lượng
                    </th>
                    <th className="border border-slate-300 px-4 py-3 text-right font-semibold text-slate-900">
                      Đơn giá
                    </th>
                    <th className="border border-slate-300 px-4 py-3 text-right font-semibold text-slate-900">
                      Thành tiền
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items?.map((item: any, index: number) => (
                    <tr key={index}>
                      <td className="border border-slate-300 px-4 py-3 text-slate-700">{index + 1}</td>
                      <td className="border border-slate-300 px-4 py-3 text-slate-700">{item.description}</td>
                      <td className="border border-slate-300 px-4 py-3 text-center text-slate-700">
                        {item.quantity}
                      </td>
                      <td className="border border-slate-300 px-4 py-3 text-right text-slate-700">
                        {formatCurrency(item.unitPrice)}
                      </td>
                      <td className="border border-slate-300 px-4 py-3 text-right font-semibold text-slate-900">
                        {formatCurrency(item.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50">
                    <td colSpan={4} className="border border-slate-300 px-4 py-4 text-right font-bold text-slate-900">
                      TỔNG CỘNG:
                    </td>
                    <td className="border border-slate-300 px-4 py-4 text-right font-bold text-xl text-slate-900">
                      {formatCurrency(invoice.amount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Footer */}
            <div className="mt-12 pt-6 border-t-2 border-slate-300">
              <div className="grid grid-cols-2 gap-8">
                <div className="text-center">
                  <p className="font-semibold text-slate-900 mb-2">Người lập hóa đơn</p>
                  <div className="mt-16">
                    <p className="text-slate-700">(Ký và ghi rõ họ tên)</p>
                  </div>
                </div>
                <div className="text-center">
                  <p className="font-semibold text-slate-900 mb-2">Bệnh nhân</p>
                  <div className="mt-16">
                    <p className="text-slate-700">{patient?.fullName || user?.fullName || ''}</p>
                    <p className="text-slate-700 text-sm mt-2">(Ký và ghi rõ họ tên)</p>
                  </div>
                </div>
              </div>
              <div className="mt-8 text-center text-sm text-slate-600">
                <p>Cảm ơn quý khách đã sử dụng dịch vụ của HoanHao Hospital!</p>
                <p className="mt-2">
                  Hóa đơn này có giá trị pháp lý và được lưu trữ trong hệ thống.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
