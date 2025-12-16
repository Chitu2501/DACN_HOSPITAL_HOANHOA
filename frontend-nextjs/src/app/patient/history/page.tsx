'use client';

import { useState } from 'react';
import { PatientLayout } from '@/components/Layout/PatientLayout';
import { useQuery } from '@tanstack/react-query';
import { medicalRecordsApi } from '@/lib/api';
import { Calendar, Search, Clock, FileText, XCircle, Eye, Stethoscope, CreditCard, Activity, Thermometer, Ruler, Scale, Heart } from 'lucide-react';
import { getStatusName } from '@/lib/utils';

// ===== THEME: Medical Neutral + Blue Accent =====
const UI = {
  page: 'bg-slate-50',
  titleRow: 'flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4',

  h1: 'text-2xl font-bold text-slate-900 flex items-center gap-3',
  h1Icon: 'w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm',
  sub: 'text-slate-600 mt-1',

  card: 'rounded-2xl bg-white border border-slate-200 shadow-sm',
  cardHover: 'hover:border-slate-300 hover:shadow-sm transition-all',
  pill:
    'p-6 rounded-2xl border transition-all text-left',
  pillActive: 'bg-blue-600 border-blue-600 text-white shadow-sm',
  pillInactive: 'bg-white border-slate-200 text-slate-900 hover:border-slate-300',

  inputWrap: 'flex-1 relative',
  inputIcon: 'absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400',
  input:
    'w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition',

  listItem:
    'p-6 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer',

  badgeBase: 'px-3 py-1 rounded-lg text-xs font-medium border',

  sectionBlock: 'p-5 rounded-xl bg-slate-50 border border-slate-200',

  overlay: 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm',
  modal: 'w-full max-w-3xl bg-white rounded-2xl border border-slate-200 p-6 max-h-[90vh] overflow-y-auto shadow-xl',
  modalTitle: 'text-2xl font-bold text-slate-900',
  modalClose: 'p-2 hover:bg-slate-100 rounded-lg transition-colors',

  btnSoft:
    'px-4 py-2 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium flex items-center gap-2',
};

const getStatusBadgeColor = (status: string) => {
  switch (status) {
    case 'archived':
    case 'completed':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    case 'cancelled':
      return 'bg-red-50 text-red-800 border-red-200';
    default:
      return 'bg-slate-50 text-slate-800 border-slate-200';
  }
};

export default function PatientHistory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedRecord, setSelectedRecord] = useState<any>(null);

  const { data: recordsData, isLoading } = useQuery({
    queryKey: ['patient-history', filterStatus],
    queryFn: async () => {
      const params: any = {};
      if (filterStatus !== 'all') params.status = filterStatus;
      const response = await medicalRecordsApi.getAll(params);
      return response.data;
    },
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  const records = recordsData?.data || recordsData || [];

  const filteredRecords = records.filter((rec: any) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      rec.doctor?.fullName?.toLowerCase().includes(q) ||
      rec.diagnosis?.toLowerCase().includes(q) ||
      rec.symptoms?.toLowerCase().includes(q) ||
      rec.notes?.toLowerCase().includes(q);
    const matchesStatus = filterStatus === 'all' || rec.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('vi-VN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

  const formatTime = (dateString: string) =>
    new Date(dateString).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });

  const statusCounts = {
    all: records.length,
    archived: records.filter((r: any) => r.status === 'archived').length,
    active: records.filter((r: any) => r.status === 'active').length,
  };

  return (
    <PatientLayout>
      <div className={`${UI.page} p-6 space-y-6`}>
        {/* Header */}
        <div className={UI.titleRow}>
          <div>
            <h1 className={UI.h1}>
              <div className={UI.h1Icon}>
                <Clock className="w-5 h-5 text-white" />
              </div>
              Lịch sử khám
            </h1>
            <p className={UI.sub}>Xem lại lịch sử khám bệnh của bạn</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {[
              { key: 'all', label: 'Tổng số hồ sơ', count: statusCounts.all },
              { key: 'archived', label: 'Đã hoàn thành', count: statusCounts.archived },
              { key: 'active', label: 'Đang hoạt động', count: statusCounts.active },
            ].map((stat) => (
            <button
              key={stat.key}
              onClick={() => setFilterStatus(stat.key)}
              className={`${UI.pill} ${filterStatus === stat.key ? UI.pillActive : UI.pillInactive}`}
            >
              <p className="text-4xl font-bold mb-2">{stat.count}</p>
              <p className={`text-sm ${filterStatus === stat.key ? 'text-white/90' : 'text-slate-600'}`}>
                {stat.label}
              </p>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className={UI.inputWrap}>
            <Search className={UI.inputIcon} />
            <input
              type="text"
              placeholder="Tìm kiếm theo bác sĩ hoặc lý do khám..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={UI.input}
            />
          </div>
        </div>

        {/* Medical Records List */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className={`${UI.card} text-center py-16`}>
            <Clock className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-700 text-lg">Chưa có lịch sử khám nào</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRecords.map((record: any) => (
              <div
                key={record._id || record.id}
                className={UI.listItem}
                onClick={() => setSelectedRecord(record)}
              >
                <div className="flex items-start justify-between mb-4 gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                      <Stethoscope className="w-7 h-7 text-blue-700" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 text-lg mb-1">
                        {record.doctor?.fullName || 'Bác sĩ'}
                      </h3>
                      <p className="text-sm text-slate-600">
                        {record.doctor?.specialization || record.doctor?.specialty || 'Chuyên khoa'}
                      </p>
                    </div>
                  </div>

                  <span className={`${UI.badgeBase} ${getStatusBadgeColor(record.status)}`}>
                    {getStatusName(record.status === 'archived' ? 'completed' : record.status)}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center gap-3 text-slate-700">
                    <Calendar className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {formatDate(record.visitDate || record.appointmentDate || record.createdAt)}
                      </p>
                      <p className="text-xs text-slate-600">{formatTime(record.visitDate || record.appointmentDate || record.createdAt)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-slate-700">
                    <FileText className="w-5 h-5 text-slate-400" />
                    <p className="text-sm">{record.diagnosis || record.reason || 'Lý do khám'}</p>
                  </div>
                </div>

                {record.diagnosis && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 mb-3">
                    <p className="text-xs text-slate-600 mb-1">Chẩn đoán</p>
                    <p className="text-sm text-slate-900">{record.diagnosis}</p>
                  </div>
                )}

                {record.fee && (
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-2 text-slate-700">
                      <CreditCard className="w-4 h-4 text-slate-400" />
                      <span className="text-sm font-medium text-slate-900">
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(record.fee)}
                      </span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedRecord(record);
                      }}
                      className={UI.btnSoft}
                    >
                      <Eye className="w-4 h-4" />
                      Xem chi tiết
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Medical Record Detail Modal */}
        {selectedRecord && (
          <div className={UI.overlay}>
            <div className={UI.modal}>
              <div className="flex items-center justify-between mb-6">
                <h2 className={UI.modalTitle}>Chi tiết lịch khám</h2>
                <button onClick={() => setSelectedRecord(null)} className={UI.modalClose}>
                  <XCircle className="w-5 h-5 text-slate-600" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Doctor Info */}
                <div className={UI.sectionBlock}>
                  <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <Stethoscope className="w-5 h-5 text-blue-700" />
                    Thông tin bác sĩ
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-700">
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Tên bác sĩ</p>
                      <p className="font-medium text-slate-900">{selectedRecord.doctor?.fullName || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Chuyên khoa</p>
                      <p className="font-medium text-slate-900">{selectedRecord.doctor?.specialization || selectedRecord.doctor?.specialty || 'N/A'}</p>
                    </div>
                    {selectedRecord.doctor?.department && (
                      <div>
                        <p className="text-sm text-slate-600 mb-1">Khoa</p>
                        <p className="font-medium text-slate-900">{selectedRecord.doctor.department}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Record Info */}
                <div className={UI.sectionBlock}>
                  <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-700" />
                    Thông tin hồ sơ
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-700">
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Ngày khám</p>
                      <p className="font-medium text-slate-900">
                        {formatDate(selectedRecord.visitDate || selectedRecord.appointmentDate || selectedRecord.createdAt)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Trạng thái</p>
                      <span className={`inline-block ${UI.badgeBase} ${getStatusBadgeColor(selectedRecord.status)}`}>
                        {getStatusName(selectedRecord.status === 'archived' ? 'completed' : selectedRecord.status)}
                      </span>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-sm text-slate-600 mb-1">Lý do khám</p>
                      <p className="font-medium text-slate-900">{selectedRecord.diagnosis || selectedRecord.reason || 'Khám bệnh'}</p>
                    </div>
                    {selectedRecord.symptoms && (
                      <div className="md:col-span-2">
                        <p className="text-sm text-slate-600 mb-1">Triệu chứng</p>
                        <p className="font-medium text-slate-900">{selectedRecord.symptoms}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Vital Signs (Sinh hiệu) - Hiển thị TẤT CẢ các lần đo */}
                {(selectedRecord.sinh_hieu_list && selectedRecord.sinh_hieu_list.length > 0) || selectedRecord.sinh_hieu ? (
                  <div className="p-5 rounded-xl bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200">
                    <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                      <Activity className="w-5 h-5 text-purple-700" />
                      Thông tin đo sinh hiệu
                      {(selectedRecord.sinh_hieu_list?.length || 0) > 1 && (
                        <span className="ml-2 px-2 py-1 bg-purple-200 text-purple-800 text-xs font-semibold rounded-full">
                          {(selectedRecord.sinh_hieu_list?.length || 1)} lần đo
                        </span>
                      )}
                    </h3>

                    {/* Hiển thị tất cả các lần đo */}
                    {(selectedRecord.sinh_hieu_list && selectedRecord.sinh_hieu_list.length > 0 ? selectedRecord.sinh_hieu_list : [selectedRecord.sinh_hieu]).map((sinhHieu: any, index: number) => (
                      <div key={sinhHieu.ma_sinh_hieu || index} className={`mb-4 ${index > 0 ? 'pt-4 border-t border-purple-200' : ''}`}>
                        {selectedRecord.sinh_hieu_list && selectedRecord.sinh_hieu_list.length > 1 && (
                          <div className="mb-3 flex items-center justify-between">
                            <p className="text-xs font-semibold text-purple-700 uppercase">
                              Lần đo {index + 1}
                            </p>
                            {sinhHieu.do_luc && (
                              <p className="text-xs text-slate-600">
                                {new Date(sinhHieu.do_luc).toLocaleString('vi-VN', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                            )}
                          </div>
                        )}

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {sinhHieu.chieu_cao_cm && (
                            <div className="p-3 bg-white rounded-lg border border-purple-100">
                              <div className="flex items-center gap-2 mb-1">
                                <Ruler className="w-3 h-3 text-purple-600" />
                                <p className="text-xs font-semibold text-slate-600 uppercase">Chiều cao</p>
                              </div>
                              <p className="text-base font-bold text-slate-900">
                                {sinhHieu.chieu_cao_cm} <span className="text-xs font-normal text-slate-600">cm</span>
                              </p>
                            </div>
                          )}

                          {sinhHieu.can_nang_kg && (
                            <div className="p-3 bg-white rounded-lg border border-purple-100">
                              <div className="flex items-center gap-2 mb-1">
                                <Scale className="w-3 h-3 text-purple-600" />
                                <p className="text-xs font-semibold text-slate-600 uppercase">Cân nặng</p>
                              </div>
                              <p className="text-base font-bold text-slate-900">
                                {sinhHieu.can_nang_kg} <span className="text-xs font-normal text-slate-600">kg</span>
                              </p>
                            </div>
                          )}

                          {sinhHieu.nhiet_do_c && (
                            <div className="p-3 bg-white rounded-lg border border-purple-100">
                              <div className="flex items-center gap-2 mb-1">
                                <Thermometer className="w-3 h-3 text-red-600" />
                                <p className="text-xs font-semibold text-slate-600 uppercase">Nhiệt độ</p>
                              </div>
                              <p className="text-base font-bold text-slate-900">
                                {sinhHieu.nhiet_do_c} <span className="text-xs font-normal text-slate-600">°C</span>
                              </p>
                            </div>
                          )}

                          {sinhHieu.mach_lan_phut && (
                            <div className="p-3 bg-white rounded-lg border border-purple-100">
                              <div className="flex items-center gap-2 mb-1">
                                <Activity className="w-3 h-3 text-blue-600" />
                                <p className="text-xs font-semibold text-slate-600 uppercase">Mạch</p>
                              </div>
                              <p className="text-base font-bold text-slate-900">
                                {sinhHieu.mach_lan_phut} <span className="text-xs font-normal text-slate-600">lần/phút</span>
                              </p>
                            </div>
                          )}

                          {(sinhHieu.huyet_ap_tam_thu || sinhHieu.huyet_ap_tam_truong) && (
                            <div className="p-3 bg-white rounded-lg border border-purple-100">
                              <div className="flex items-center gap-2 mb-1">
                                <Activity className="w-3 h-3 text-red-600" />
                                <p className="text-xs font-semibold text-slate-600 uppercase">Huyết áp</p>
                              </div>
                              <p className="text-base font-bold text-slate-900">
                                {sinhHieu.huyet_ap_tam_thu || '—'}/{sinhHieu.huyet_ap_tam_truong || '—'} 
                                <span className="text-xs font-normal text-slate-600 ml-1">mmHg</span>
                              </p>
                            </div>
                          )}

                          {sinhHieu.spo2_phan_tram && (
                            <div className="p-3 bg-white rounded-lg border border-purple-100">
                              <div className="flex items-center gap-2 mb-1">
                                <Heart className="w-3 h-3 text-pink-600" />
                                <p className="text-xs font-semibold text-slate-600 uppercase">SpO2</p>
                              </div>
                              <p className="text-base font-bold text-slate-900">
                                {sinhHieu.spo2_phan_tram} <span className="text-xs font-normal text-slate-600">%</span>
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Hiển thị thời gian đo nếu chỉ có 1 lần đo */}
                        {(!selectedRecord.sinh_hieu_list || selectedRecord.sinh_hieu_list.length === 1) && sinhHieu.do_luc && (
                          <div className="mt-3 pt-3 border-t border-purple-200">
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
                ) : null}

                {/* Diagnosis & Notes */}
                {(selectedRecord.diagnosis || selectedRecord.notes) && (
                  <div className={UI.sectionBlock}>
                    <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-700" />
                      Kết quả khám
                    </h3>

                    {selectedRecord.diagnosis && (
                      <div className="mb-4">
                        <p className="text-sm text-slate-600 mb-2">Chẩn đoán</p>
                        <p className="text-slate-800">{selectedRecord.diagnosis}</p>
                      </div>
                    )}

                    {selectedRecord.notes && (
                      <div>
                        <p className="text-sm text-slate-600 mb-2">Ghi chú</p>
                        <p className="text-slate-800 whitespace-pre-line">{selectedRecord.notes}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Payment Info */}
                {selectedRecord.fee && (
                  <div className={UI.sectionBlock}>
                    <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-blue-700" />
                      Thông tin thanh toán
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-700">
                      <div>
                        <p className="text-sm text-slate-600 mb-1">Phí khám</p>
                        <p className="font-semibold text-lg text-slate-900">
                          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(selectedRecord.fee)}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-slate-600 mb-1">Trạng thái thanh toán</p>
                        <p className={`font-medium ${selectedRecord.isPaid ? 'text-emerald-700' : 'text-amber-700'}`}>
                          {selectedRecord.isPaid ? 'Đã thanh toán' : 'Chưa thanh toán'}
                        </p>
                      </div>

                      {selectedRecord.paymentMethod && (
                        <div>
                          <p className="text-sm text-slate-600 mb-1">Phương thức thanh toán</p>
                          <p className="font-medium text-slate-900">
                            {selectedRecord.paymentMethod === 'cash'
                              ? 'Tiền mặt'
                              : selectedRecord.paymentMethod === 'card'
                              ? 'Thẻ'
                              : selectedRecord.paymentMethod === 'momo'
                              ? 'MoMo'
                              : selectedRecord.paymentMethod === 'bank_transfer'
                              ? 'Chuyển khoản'
                              : 'N/A'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </PatientLayout>
  );
}
