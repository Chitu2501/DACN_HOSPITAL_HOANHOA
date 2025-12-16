'use client';

import { useState, useEffect } from 'react';
import { PatientLayout } from '@/components/Layout/PatientLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { medicalRecordsApi, api } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  FileText,
  Search,
  Filter,
  Calendar,
  Stethoscope,
  Pill,
  TestTube,
  User,
  ChevronRight,
  X,
  Download,
  Eye,
  FileCheck,
  AlertCircle,
  CheckCircle2,
  CalendarDays,
  MapPin,
  Phone,
  CreditCard,
  Smartphone,
  Activity,
  Thermometer,
  Ruler,
  Scale,
  Heart,
} from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/utils';

// ===== MEDICAL UI THEME (Clean / Clinical / Blue-Teal Accent) =====
const UI = {
  page: 'bg-slate-50',
  h1: 'text-2xl font-bold text-slate-900 flex items-center gap-3',
  h1Icon: 'w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm',
  sub: 'text-slate-600 mt-1',

  card: 'rounded-2xl bg-white border border-slate-200 shadow-sm',
  cardPad: 'p-6',
  cardHeader: 'p-6 border-b border-slate-200 flex items-center justify-between',

  chip: 'inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border',
  badgeActive: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  badgeArchived: 'bg-slate-100 text-slate-700 border-slate-200',
  badgeDefault: 'bg-blue-50 text-blue-800 border-blue-200',

  inputWrap: 'flex-1 relative',
  inputIcon: 'absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400',
  input:
    'w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition',

  btn:
    'px-6 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 hover:bg-slate-50 hover:border-slate-300 transition-colors flex items-center gap-2',
  btnPrimary:
    'px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-colors font-semibold flex items-center justify-center gap-2',
  btnGhost:
    'px-3 py-2 bg-slate-100 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors',

  statCard: 'rounded-2xl bg-white border border-slate-200 shadow-sm p-6',
  statLabel: 'text-slate-600 text-sm mb-1',
  statValue: 'text-3xl font-bold text-slate-900',
  statIconBox: 'w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700',

  recordItem:
    'p-6 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer group',

  softPanel: 'rounded-xl bg-slate-50 border border-slate-200',

  overlay: 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm',
  modal: 'bg-white rounded-3xl border border-slate-200/50 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl shadow-black/20',
  modalTop: 'sticky top-0 bg-white/90 backdrop-blur border-b border-slate-200 p-6 flex items-center justify-between',
  modalClose: 'p-2 hover:bg-slate-100 rounded-xl transition-colors',
};

const getStatusBadge = (status: string) => {
  if (status === 'active') {
    return (
      <span className={`${UI.chip} ${UI.badgeActive}`}>
        <CheckCircle2 className="w-3 h-3" />
        Đang điều trị
      </span>
    );
  }
  if (status === 'archived') {
    return (
      <span className={`${UI.chip} ${UI.badgeArchived}`}>
        <FileCheck className="w-3 h-3" />
        Đã lưu trữ
      </span>
    );
  }
  return <span className={`${UI.chip} ${UI.badgeDefault}`}>{status}</span>;
};

export default function PatientMedicalRecords() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [paymentStatuses, setPaymentStatuses] = useState<Record<string, any>>({});

  const { data: recordsData, isLoading, error } = useQuery({
    queryKey: ['patient-medical-records', filterStatus, fromDate, toDate],
    queryFn: async () => {
      const params: any = {};
      if (filterStatus !== 'all') params.status = filterStatus;
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;
      const response = await medicalRecordsApi.getAll(params);
      return response.data;
    },
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const records = recordsData?.data || recordsData || [];

  // Fetch payment status cho tất cả records khi load danh sách
  useEffect(() => {
    const fetchAllPaymentStatuses = async () => {
      if (records.length === 0) return;
      
      // Fetch payment status cho tất cả records (song song để tối ưu)
      const promises = records.map(async (record: any) => {
        const recordId = record.id || record._id;
        if (!recordId) return;
        
        try {
          const response = await medicalRecordsApi.getPaymentStatus(recordId);
          if (response.data?.success) {
            setPaymentStatuses(prev => ({
              ...prev,
              [recordId]: response.data.data
            }));
          }
        } catch (error) {
          // Không hiển thị lỗi nếu không tìm thấy payment status
          console.log('Payment status not found for record:', recordId);
        }
      });
      
      await Promise.all(promises);
    };
    
    fetchAllPaymentStatuses();
  }, [records]);

  const filteredRecords = records.filter((record: any) => {
    const q = searchTerm.toLowerCase();
    return (
      record.diagnosis?.toLowerCase().includes(q) ||
      record.doctor?.fullName?.toLowerCase().includes(q) ||
      record.symptoms?.toLowerCase().includes(q) ||
      record.prescription?.toLowerCase().includes(q)
    );
  });

  const handleViewDetail = async (record: any) => {
    setSelectedRecord(record);
    setShowDetailModal(true);
    // Lấy trạng thái thanh toán khi mở modal
    if (record.id || record._id) {
      await fetchPaymentStatus(record.id || record._id);
    }
  };

  // Fetch payment status cho một hồ sơ
  const fetchPaymentStatus = async (recordId: string) => {
    try {
      const response = await medicalRecordsApi.getPaymentStatus(recordId);
      if (response.data?.success) {
        setPaymentStatuses(prev => ({
          ...prev,
          [recordId]: response.data.data
        }));
      }
    } catch (error) {
      // Không hiển thị lỗi nếu không tìm thấy payment status
      console.log('Payment status not found for record:', recordId);
    }
  };

  // Mutation để thanh toán
  const payMutation = useMutation({
    mutationFn: async ({ id, paymentMethod }: { id: string; paymentMethod: string }) => {
      const response = await medicalRecordsApi.pay(id, paymentMethod);
      return response.data;
    },
    onSuccess: async (data: any, variables) => {
      // Refresh payment status cho record vừa thanh toán
      await fetchPaymentStatus(variables.id);
      
      // Refresh toàn bộ danh sách để cập nhật payment status
      queryClient.invalidateQueries({ queryKey: ['patient-medical-records'] });
      
      if (selectedRecord) {
        await fetchPaymentStatus(selectedRecord.id || selectedRecord._id);
      }
      
      if (data.data?.paymentUrl) {
        window.location.href = data.data.paymentUrl;
      } else if (data.data?.deeplink) {
        window.location.href = data.data.deeplink;
      } else {
        toast.error('Không thể tạo link thanh toán MoMo');
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi thanh toán');
    },
  });

  const handlePay = (record: any, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    const recordId = record.id || record._id;
    if (!recordId) {
      toast.error('Không tìm thấy mã hồ sơ');
      return;
    }
    payMutation.mutate({ id: recordId, paymentMethod: 'momo' });
  };

  const total = records.length;
  const activeCount = records.filter((r: any) => r.status === 'active').length;
  const archivedCount = records.filter((r: any) => r.status === 'archived').length;

  return (
    <PatientLayout>
      <div className={`${UI.page} p-6 space-y-6`}>
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className={UI.h1}>
              <div className={UI.h1Icon}>
                <FileText className="w-5 h-5 text-white" />
              </div>
              Hồ sơ bệnh án
            </h1>
            <p className={UI.sub}>Tra cứu hồ sơ, đơn thuốc và kết quả xét nghiệm</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={UI.statCard}>
            <div className="flex items-center justify-between">
              <div>
                <p className={UI.statLabel}>Tổng hồ sơ</p>
                <p className={UI.statValue}>{total}</p>
              </div>
              <div className={UI.statIconBox}>
                <FileText className="w-6 h-6" />
              </div>
            </div>
          </div>

          <div className={UI.statCard}>
            <div className="flex items-center justify-between">
              <div>
                <p className={UI.statLabel}>Đang điều trị</p>
                <p className={UI.statValue}>{activeCount}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>
          </div>

          <div className={UI.statCard}>
            <div className="flex items-center justify-between">
              <div>
                <p className={UI.statLabel}>Đã lưu trữ</p>
                <p className={UI.statValue}>{archivedCount}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
                <FileCheck className="w-6 h-6" />
              </div>
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className={UI.inputWrap}>
              <Search className={UI.inputIcon} />
              <input
                type="text"
                placeholder="Tìm theo chẩn đoán, bác sĩ, triệu chứng, đơn thuốc..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={UI.input}
              />
            </div>

            <button onClick={() => setShowFilters(!showFilters)} className={UI.btn}>
              <Filter className="w-5 h-5" />
              Bộ lọc
            </button>
          </div>

          {showFilters && (
            <div className={`${UI.card} ${UI.cardPad}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-slate-900 font-semibold">Bộ lọc nâng cao</h3>
                <button
                  onClick={() => {
                    setFilterStatus('all');
                    setFromDate('');
                    setToDate('');
                  }}
                  className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Xóa bộ lọc
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Trạng thái</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                  >
                    <option value="all">Tất cả</option>
                    <option value="active">Đang điều trị</option>
                    <option value="archived">Đã lưu trữ</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Từ ngày</label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Đến ngày</label>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Records List */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className={`${UI.card} text-center py-16`}>
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <p className="text-slate-700 text-lg font-semibold mb-2">Có lỗi xảy ra khi tải dữ liệu</p>
            <p className="text-slate-500 text-sm mb-4">
              {(error as any)?.response?.data?.message || (error as any)?.message || 'Vui lòng thử lại sau'}
            </p>
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ['patient-medical-records'] })}
              className={`${UI.btnPrimary} mx-auto`}
            >
              Thử lại
            </button>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className={`${UI.card} text-center py-16`}>
            <FileText className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-700 text-lg font-semibold mb-2">
              {records.length === 0 ? 'Chưa có hồ sơ bệnh án nào' : 'Không tìm thấy hồ sơ phù hợp'}
            </p>
            {records.length === 0 && (
              <p className="text-slate-500 text-sm">Hồ sơ bệnh án của bạn sẽ được hiển thị tại đây sau khi khám bệnh</p>
            )}
            {records.length > 0 && searchTerm && (
              <p className="text-slate-500 text-sm">Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRecords.map((record: any) => (
              <div
                key={record.id || record._id}
                className={UI.recordItem}
                onClick={() => handleViewDetail(record)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
                        <Stethoscope className="w-7 h-7 text-blue-700" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h3 className="font-semibold text-slate-900 text-lg">
                            {record.diagnosis || 'Chưa có chẩn đoán'}
                          </h3>
                          {getStatusBadge(record.status)}
                        </div>

                        <div className="space-y-2 text-slate-700 text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <span>{formatDate(record.visitDate)}</span>
                          </div>

                          {record.doctor && (
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-slate-400" />
                              <span className="truncate">
                                {record.doctor.fullName} - {record.doctor.specialty}
                              </span>
                            </div>
                          )}

                          {record.symptoms && (
                            <div className="flex items-start gap-2">
                              <AlertCircle className="w-4 h-4 text-slate-400 mt-0.5" />
                              <span className="line-clamp-2">{record.symptoms}</span>
                            </div>
                          )}
                        </div>

                        {record.prescription && (
                          <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                            <div className="flex items-center gap-2 mb-2">
                              <Pill className="w-4 h-4 text-emerald-700" />
                              <span className="text-sm font-medium text-slate-900">Đơn thuốc</span>
                            </div>
                            <p className="text-sm text-slate-700 line-clamp-2">{record.prescription}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className="flex gap-2">
                      {(() => {
                        const recordId = record.id || record._id;
                        const paymentStatus = paymentStatuses[recordId];
                        const isPaid = paymentStatus?.isPaid;
                        const hasPayment = paymentStatus?.hasPayment;
                        
                        // Chỉ hiển thị nút thanh toán nếu chưa thanh toán
                        // Nếu đã thanh toán (isPaid = true) thì ẩn nút
                        if (!isPaid && !hasPayment) {
                          return (
                            <button
                              onClick={(e) => handlePay(record, e)}
                              disabled={payMutation.isPending}
                              className="px-4 py-2 bg-pink-50 border border-pink-200 text-pink-800 rounded-xl hover:bg-pink-100 transition-colors text-sm font-medium flex items-center gap-2 disabled:opacity-50"
                            >
                              <Smartphone className="w-4 h-4" />
                              {payMutation.isPending ? 'Đang xử lý...' : 'Thanh toán'}
                            </button>
                          );
                        }
                        // Nếu đã thanh toán hoặc đang có payment, không hiển thị nút
                        return null;
                      })()}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDetail(record);
                        }}
                        className="px-4 py-2 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl hover:bg-blue-100 transition-colors text-sm font-medium flex items-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        Xem chi tiết
                      </button>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Detail Modal */}
        {showDetailModal && selectedRecord && (
          <div className={UI.overlay}>
            <div className={UI.modal}>
              <div className="flex-shrink-0 bg-gradient-to-r from-white via-blue-50/50 to-indigo-50/50 backdrop-blur-md border-b border-slate-200/50 p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-200/50 flex-shrink-0">
                    <FileText className="w-7 h-7 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-2xl font-bold text-slate-900 mb-1">Chi tiết hồ sơ bệnh án</h2>
                    <p className="text-sm text-slate-600 font-medium truncate">
                      Mã hồ sơ: <span className="text-slate-800 font-mono">#{selectedRecord.id || selectedRecord._id}</span>
                    </p>
                  </div>
                </div>

                <button 
                  onClick={() => setShowDetailModal(false)} 
                  className="p-2.5 hover:bg-slate-100 rounded-xl transition-all hover:scale-105 active:scale-95 flex-shrink-0"
                >
                  <X className="w-5 h-5 text-slate-600" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Status and Date */}
                <div className="flex items-center justify-between flex-wrap gap-4 p-4 bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-3">
                    {getStatusBadge(selectedRecord.status)}
                  </div>
                  <div className="flex items-center gap-2 text-slate-700 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                    <CalendarDays className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium">Ngày khám: {formatDate(selectedRecord.visitDate)}</span>
                  </div>
                </div>

                {/* Diagnosis */}
                <div className="relative p-6 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border border-blue-200/50 rounded-2xl shadow-sm">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-200/20 rounded-full blur-3xl opacity-50 pointer-events-none" style={{ transform: 'translate(30%, -30%)' }}></div>
                  <div className="relative z-0">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md flex-shrink-0">
                        <Stethoscope className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900">Chẩn đoán</h3>
                    </div>
                    <p className="text-slate-900 text-lg font-medium leading-relaxed">{selectedRecord.diagnosis || 'Chưa có chẩn đoán'}</p>
                  </div>
                </div>

                {/* Doctor Info */}
                {selectedRecord.doctor && (
                  <div className="relative p-6 bg-gradient-to-br from-slate-50 to-blue-50 border border-slate-200/50 rounded-2xl shadow-sm">
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-200/10 rounded-full blur-2xl opacity-50 pointer-events-none" style={{ transform: 'translate(-20%, 20%)' }}></div>
                    <div className="relative z-0">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
                          <User className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">Bác sĩ điều trị</h3>
                      </div>

                      <div className="space-y-3">
                        <div className="p-3 bg-white/60 backdrop-blur-sm rounded-lg border border-slate-200/50">
                          <p className="text-xs text-slate-600 mb-1">Tên bác sĩ</p>
                          <p className="text-slate-900 font-semibold text-base">{selectedRecord.doctor.fullName}</p>
                        </div>
                        
                        {selectedRecord.doctor.specialty && (
                          <div className="p-3 bg-white/60 backdrop-blur-sm rounded-lg border border-slate-200/50">
                            <p className="text-xs text-slate-600 mb-1">Chuyên khoa</p>
                            <p className="text-slate-700 text-sm">{selectedRecord.doctor.specialty}</p>
                          </div>
                        )}

                        {selectedRecord.doctor.department && (
                          <div className="p-3 bg-white/60 backdrop-blur-sm rounded-lg border border-slate-200/50 flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0" />
                            <div>
                              <p className="text-xs text-slate-600 mb-0.5">Khoa</p>
                              <p className="text-slate-700 text-sm font-medium">{selectedRecord.doctor.department}</p>
                            </div>
                          </div>
                        )}

                        {selectedRecord.doctor.phone && (
                          <div className="p-3 bg-white/60 backdrop-blur-sm rounded-lg border border-slate-200/50 flex items-center gap-2">
                            <Phone className="w-4 h-4 text-blue-600 flex-shrink-0" />
                            <div>
                              <p className="text-xs text-slate-600 mb-0.5">Số điện thoại</p>
                              <p className="text-slate-700 text-sm font-medium">{selectedRecord.doctor.phone}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Vital Signs (Sinh hiệu) - Hiển thị TẤT CẢ các lần đo - Design mới đẹp hơn */}
                {(selectedRecord.sinh_hieu_list && selectedRecord.sinh_hieu_list.length > 0) || selectedRecord.sinh_hieu ? (
                  <div className="relative p-6 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 border border-indigo-200/50 rounded-2xl shadow-sm">
                    {/* Decorative background elements */}
                    <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-purple-200/20 to-pink-200/20 rounded-full blur-3xl opacity-50 pointer-events-none" style={{ transform: 'translate(30%, -30%)' }}></div>
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-br from-blue-200/20 to-indigo-200/20 rounded-full blur-2xl opacity-50 pointer-events-none" style={{ transform: 'translate(-20%, 20%)' }}></div>
                    
                    <div className="relative z-0">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-200/50">
                            <Activity className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                              Thông tin đo sinh hiệu
                            </h3>
                            <p className="text-sm text-slate-600 mt-0.5">Các chỉ số sức khỏe quan trọng</p>
                          </div>
                        </div>
                        {(selectedRecord.sinh_hieu_list?.length || 0) > 1 && (
                          <span className="px-3 py-1.5 bg-white/80 backdrop-blur-sm border border-purple-200 text-purple-700 text-xs font-bold rounded-full shadow-sm">
                            {(selectedRecord.sinh_hieu_list?.length || 1)} lần đo
                          </span>
                        )}
                      </div>

                      {/* Hiển thị tất cả các lần đo */}
                      <div className="space-y-6">
                        {(selectedRecord.sinh_hieu_list && selectedRecord.sinh_hieu_list.length > 0 ? selectedRecord.sinh_hieu_list : [selectedRecord.sinh_hieu]).map((sinhHieu: any, index: number) => (
                          <div 
                            key={sinhHieu.ma_sinh_hieu || index} 
                            className={`relative bg-white/80 backdrop-blur-sm rounded-xl border border-white/50 shadow-md p-5 transition-all hover:shadow-lg ${
                              index > 0 ? 'mt-6 pt-6 border-t-2 border-purple-100' : ''
                            }`}
                          >
                            {/* Header cho mỗi lần đo nếu có nhiều lần */}
                            {selectedRecord.sinh_hieu_list && selectedRecord.sinh_hieu_list.length > 1 && (
                              <div className="mb-4 pb-4 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                                    <span className="text-white text-xs font-bold">{index + 1}</span>
                                  </div>
                                  <p className="text-sm font-bold text-slate-900">Lần đo {index + 1}</p>
                                </div>
                                {sinhHieu.do_luc && (
                                  <div className="flex items-center gap-2 text-xs text-slate-600">
                                    <Calendar className="w-3.5 h-3.5" />
                                    <span className="font-medium">
                                      {new Date(sinhHieu.do_luc).toLocaleString('vi-VN', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Grid các chỉ số sinh hiệu */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                              {sinhHieu.chieu_cao_cm && (
                                <div className="group relative p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 hover:border-blue-300 transition-all hover:shadow-md">
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                                      <Ruler className="w-5 h-5 text-blue-600" />
                                    </div>
                                  </div>
                                  <p className="text-xs font-semibold text-slate-600 uppercase mb-1">Chiều cao</p>
                                  <p className="text-2xl font-bold text-slate-900">
                                    {sinhHieu.chieu_cao_cm}
                                    <span className="text-sm font-normal text-slate-500 ml-1">cm</span>
                                  </p>
                                </div>
                              )}

                              {sinhHieu.can_nang_kg && (
                                <div className="group relative p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-100 hover:border-emerald-300 transition-all hover:shadow-md">
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                                      <Scale className="w-5 h-5 text-emerald-600" />
                                    </div>
                                  </div>
                                  <p className="text-xs font-semibold text-slate-600 uppercase mb-1">Cân nặng</p>
                                  <p className="text-2xl font-bold text-slate-900">
                                    {sinhHieu.can_nang_kg}
                                    <span className="text-sm font-normal text-slate-500 ml-1">kg</span>
                                  </p>
                                </div>
                              )}

                              {sinhHieu.nhiet_do_c && (
                                <div className="group relative p-4 bg-gradient-to-br from-red-50 to-orange-50 rounded-xl border border-red-100 hover:border-red-300 transition-all hover:shadow-md">
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center group-hover:bg-red-500/20 transition-colors">
                                      <Thermometer className="w-5 h-5 text-red-600" />
                                    </div>
                                  </div>
                                  <p className="text-xs font-semibold text-slate-600 uppercase mb-1">Nhiệt độ</p>
                                  <p className="text-2xl font-bold text-slate-900">
                                    {sinhHieu.nhiet_do_c}
                                    <span className="text-sm font-normal text-slate-500 ml-1">°C</span>
                                  </p>
                                </div>
                              )}

                              {sinhHieu.mach_lan_phut && (
                                <div className="group relative p-4 bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl border border-cyan-100 hover:border-cyan-300 transition-all hover:shadow-md">
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center group-hover:bg-cyan-500/20 transition-colors">
                                      <Activity className="w-5 h-5 text-cyan-600" />
                                    </div>
                                  </div>
                                  <p className="text-xs font-semibold text-slate-600 uppercase mb-1">Mạch</p>
                                  <p className="text-2xl font-bold text-slate-900">
                                    {sinhHieu.mach_lan_phut}
                                    <span className="text-sm font-normal text-slate-500 ml-1">lần/phút</span>
                                  </p>
                                </div>
                              )}

                              {(sinhHieu.huyet_ap_tam_thu || sinhHieu.huyet_ap_tam_truong) && (
                                <div className="group relative p-4 bg-gradient-to-br from-rose-50 to-pink-50 rounded-xl border border-rose-100 hover:border-rose-300 transition-all hover:shadow-md">
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="w-10 h-10 rounded-lg bg-rose-500/10 flex items-center justify-center group-hover:bg-rose-500/20 transition-colors">
                                      <Activity className="w-5 h-5 text-rose-600" />
                                    </div>
                                  </div>
                                  <p className="text-xs font-semibold text-slate-600 uppercase mb-1">Huyết áp</p>
                                  <p className="text-2xl font-bold text-slate-900">
                                    {sinhHieu.huyet_ap_tam_thu || '—'}/{sinhHieu.huyet_ap_tam_truong || '—'}
                                    <span className="text-sm font-normal text-slate-500 ml-1">mmHg</span>
                                  </p>
                                </div>
                              )}

                              {sinhHieu.spo2_phan_tram && (
                                <div className="group relative p-4 bg-gradient-to-br from-pink-50 to-rose-50 rounded-xl border border-pink-100 hover:border-pink-300 transition-all hover:shadow-md">
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="w-10 h-10 rounded-lg bg-pink-500/10 flex items-center justify-center group-hover:bg-pink-500/20 transition-colors">
                                      <Heart className="w-5 h-5 text-pink-600" />
                                    </div>
                                  </div>
                                  <p className="text-xs font-semibold text-slate-600 uppercase mb-1">SpO2</p>
                                  <p className="text-2xl font-bold text-slate-900">
                                    {sinhHieu.spo2_phan_tram}
                                    <span className="text-sm font-normal text-slate-500 ml-1">%</span>
                                  </p>
                                </div>
                              )}
                            </div>

                            {/* Hiển thị thời gian đo nếu chỉ có 1 lần đo */}
                            {(!selectedRecord.sinh_hieu_list || selectedRecord.sinh_hieu_list.length === 1) && sinhHieu.do_luc && (
                              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-slate-400" />
                                <p className="text-xs text-slate-600">
                                  <span className="font-semibold">Thời gian đo:</span>{' '}
                                  {new Date(sinhHieu.do_luc).toLocaleString('vi-VN', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* Symptoms */}
                {selectedRecord.symptoms && (
                  <div className="relative p-6 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 border border-amber-200/50 rounded-2xl shadow-sm">
                    <div className="absolute top-0 left-0 w-28 h-28 bg-amber-200/20 rounded-full blur-2xl opacity-50 pointer-events-none" style={{ transform: 'translate(-20%, -20%)' }}></div>
                    <div className="relative z-0">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-md">
                          <AlertCircle className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">Triệu chứng</h3>
                      </div>
                      <div className="p-4 bg-white/60 backdrop-blur-sm rounded-lg border border-amber-200/50">
                        <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{selectedRecord.symptoms}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Prescription */}
                {selectedRecord.prescription && (
                  <div className="relative p-6 bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50 border border-emerald-200/50 rounded-2xl shadow-sm">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-200/20 rounded-full blur-2xl opacity-50 pointer-events-none" style={{ transform: 'translate(30%, -30%)' }}></div>
                    <div className="relative z-0">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md">
                          <Pill className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">Đơn thuốc</h3>
                      </div>
                      <div className="p-4 bg-white/60 backdrop-blur-sm rounded-lg border border-emerald-200/50">
                        <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{selectedRecord.prescription}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Test Results */}
                {selectedRecord.testResults && selectedRecord.testResults.length > 0 && (
                  <div className="relative p-6 bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50 border border-cyan-200/50 rounded-2xl shadow-sm">
                    <div className="absolute bottom-0 right-0 w-36 h-36 bg-cyan-200/20 rounded-full blur-3xl opacity-50 pointer-events-none" style={{ transform: 'translate(30%, 30%)' }}></div>
                    <div className="relative z-0">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-md">
                          <TestTube className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">Kết quả xét nghiệm</h3>
                      </div>

                      <div className="space-y-3">
                        {selectedRecord.testResults.map((test: any, index: number) => (
                          <div key={index} className="p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-cyan-200/50 shadow-sm hover:shadow-md transition-all">
                            <div className="flex items-start justify-between mb-2 gap-2">
                              <p className="font-semibold text-slate-900">{test.testName}</p>
                              {test.date && (
                                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full font-medium">
                                  {formatDate(test.date)}
                                </span>
                              )}
                            </div>
                            <p className="text-slate-700 text-sm whitespace-pre-wrap leading-relaxed">{test.result}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Notes */}
                {selectedRecord.notes && (
                  <div className="relative p-6 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 border border-slate-200/50 rounded-2xl shadow-sm">
                    <div className="absolute top-0 left-0 w-32 h-32 bg-blue-200/10 rounded-full blur-2xl opacity-50 pointer-events-none" style={{ transform: 'translate(-20%, -20%)' }}></div>
                    <div className="relative z-0">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
                          <FileText className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">Ghi chú</h3>
                      </div>
                      <div className="p-4 bg-white/60 backdrop-blur-sm rounded-lg border border-slate-200/50">
                        <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{selectedRecord.notes}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Follow-up */}
                {selectedRecord.followUpDate && (
                  <div className="relative p-6 bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50 border border-emerald-200/50 rounded-2xl shadow-sm">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-200/20 rounded-full blur-3xl opacity-50 pointer-events-none" style={{ transform: 'translate(30%, -30%)' }}></div>
                    <div className="relative z-0">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md">
                          <Calendar className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">Ngày tái khám</h3>
                      </div>
                      <div className="p-4 bg-white/60 backdrop-blur-sm rounded-lg border border-emerald-200/50">
                        <p className="text-slate-900 text-xl font-bold">{formatDate(selectedRecord.followUpDate)}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Payment Status */}
                {(() => {
                  const recordId = selectedRecord.id || selectedRecord._id;
                  const paymentStatus = paymentStatuses[recordId];
                  const isPaid = paymentStatus?.isPaid;
                  const hasPayment = paymentStatus?.hasPayment;
                  const amount = paymentStatus?.amount || 500000;

                  if (!isPaid && !hasPayment) {
                    return (
                      <div className="p-6 bg-amber-50 border border-amber-200 rounded-xl">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-semibold text-slate-900 mb-1">Thanh toán hồ sơ khám</h3>
                            <p className="text-sm text-slate-600">Số tiền cần thanh toán: <span className="font-bold text-amber-700">{formatCurrency(amount)}</span></p>
                          </div>
                        </div>
                        <button
                          onClick={() => handlePay(selectedRecord)}
                          disabled={payMutation.isPending}
                          className="w-full px-4 py-3 bg-pink-600 text-white rounded-xl hover:bg-pink-700 transition-colors flex items-center justify-center gap-2 font-semibold disabled:opacity-50"
                        >
                          <Smartphone className="w-5 h-5" />
                          {payMutation.isPending ? 'Đang xử lý...' : 'Thanh toán qua MoMo'}
                        </button>
                      </div>
                    );
                  } else if (hasPayment && !isPaid) {
                    return (
                      <div className="p-6 bg-amber-50 border border-amber-200 rounded-xl">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle className="w-5 h-5 text-amber-700" />
                          <h3 className="text-lg font-semibold text-slate-900">Đang chờ thanh toán</h3>
                        </div>
                        <p className="text-sm text-slate-600 mb-4">Giao dịch đang được xử lý. Vui lòng đợi xác nhận từ MoMo.</p>
                        <button
                          onClick={() => handlePay(selectedRecord)}
                          disabled={payMutation.isPending}
                          className="w-full px-4 py-3 bg-pink-600 text-white rounded-xl hover:bg-pink-700 transition-colors flex items-center justify-center gap-2 font-semibold disabled:opacity-50"
                        >
                          <Smartphone className="w-5 h-5" />
                          {payMutation.isPending ? 'Đang xử lý...' : 'Thanh toán lại'}
                        </button>
                      </div>
                    );
                  } else if (isPaid) {
                    return (
                      <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-xl">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                          <h3 className="text-lg font-semibold text-slate-900">Đã thanh toán</h3>
                        </div>
                        <p className="text-sm text-slate-600">
                          Hồ sơ khám đã được thanh toán thành công.
                          {paymentStatus?.paidAt && (
                            <span className="block mt-1">Ngày thanh toán: {formatDate(paymentStatus.paidAt)}</span>
                          )}
                        </p>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Actions */}
                <div className="flex-shrink-0 flex gap-3 pt-4 border-t border-slate-200">
                  <button
                    onClick={() => {
                      alert('Tính năng tải xuống đang được phát triển');
                    }}
                    className="flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-800 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 font-semibold"
                  >
                    <Download className="w-5 h-5" />
                    Tải xuống PDF
                  </button>

                  <button onClick={() => setShowDetailModal(false)} className={`${UI.btnPrimary} flex-1`}>
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PatientLayout>
  );
}
