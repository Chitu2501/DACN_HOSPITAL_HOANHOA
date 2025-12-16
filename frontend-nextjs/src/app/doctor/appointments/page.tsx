'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DoctorLayout } from '@/components/Layout/DoctorLayout';
import { api } from '@/lib/api';
import { Calendar, Clock3, User, Stethoscope, CheckCircle2, AlertCircle, X, FileText, Phone, Mail, MapPin, CalendarDays, PlayCircle, Save } from 'lucide-react';
import toast from 'react-hot-toast';

type Appointment = {
  id: string;
  patientName?: string;
  patientPhone?: string;
  patientEmail?: string;
  time?: string;
  status?: string;
  room?: string;
  doctorName?: string;
  doctorId?: string;
  ma_benh_nhan?: string;
};

type MedicalRecordDetail = {
  ma_ho_so?: string;
  ma_lich_hen?: string;
  ngay_kham?: string;
  ly_do_kham?: string;
  trieu_chung?: string;
  chan_doan_so_bo?: string;
  chan_doan_cuoi?: string;
  ghi_chu_bac_si?: string;
  trang_thai?: string;
  ten_benh_nhan?: string;
  so_dien_thoai?: string;
  email?: string;
  gioi_tinh?: string;
  ngay_sinh?: string;
  dia_chi?: string;
  ten_bac_si?: string;
  ma_bac_si?: string;
  bat_dau?: string;
  ket_thuc?: string;
  thoi_gian_hen?: string;
  source?: string;
  has_ho_so?: boolean;
};

const statusStyle: Record<string, string> = {
  confirmed: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  pending: 'bg-amber-50 text-amber-700 border border-amber-200',
  completed: 'bg-slate-50 text-slate-700 border border-slate-200',
  cancelled: 'bg-rose-50 text-rose-700 border border-rose-200',
};

const statusLabel = (status?: string) => {
  switch (status) {
    case 'confirmed': return 'Đã xác nhận';
    case 'pending': return 'Chờ khám';
    case 'completed': return 'Hoàn thành';
    case 'cancelled': return 'Đã hủy';
    default: return 'Chờ khám';
  }
};

export default function DoctorAppointmentsPage() {
  const queryClient = useQueryClient();
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [showMedicalRecordModal, setShowMedicalRecordModal] = useState(false);
  const [showExaminationModal, setShowExaminationModal] = useState(false);
  const [examinationFormData, setExaminationFormData] = useState({
    ly_do_kham: '',
    trieu_chung: '',
    chan_doan_so_bo: '',
    chan_doan_cuoi: '',
    ghi_chu_bac_si: '',
    trang_thai: 'in_progress',
  });
  
  const { data, isLoading } = useQuery({
    queryKey: ['doctor-appointments-sql'],
    queryFn: async () => {
      const res = await api.get('/doctor/appointments-sql');
      const raw = res.data?.data || [];
      const mapped: Appointment[] = raw.map((item: any, idx: number) => ({
        id: item.ma_lich_hen || `apt-${idx}`,
        patientName: item.ten_benh_nhan || 'Bệnh nhân',
        patientPhone: item.so_dien_thoai,
        patientEmail: item.email,
        time: item.thoi_gian_hen,
        status: item.trang_thai || 'pending',
        room: item.ma_ca || 'Phòng',
        doctorName: item.ten_bac_si || 'Bác sĩ',
        doctorId: item.ma_bac_si,
        ma_benh_nhan: item.ma_benh_nhan,
      }));
      return mapped;
    },
  });

  // Query để lấy chi tiết hồ sơ khám
  const { data: medicalRecordData, isLoading: isLoadingRecord } = useQuery({
    queryKey: ['doctor-medical-record', selectedAppointmentId],
    queryFn: async () => {
      if (!selectedAppointmentId) return null;
      const res = await api.get(`/doctor/ho-so-kham/by-lich-hen/${selectedAppointmentId}`);
      return res.data?.data || null;
    },
    enabled: !!selectedAppointmentId && showMedicalRecordModal,
  });

  const medicalRecord: MedicalRecordDetail | null = medicalRecordData || null;

  const handleViewMedicalRecord = (appointmentId: string) => {
    setSelectedAppointmentId(appointmentId);
    setShowMedicalRecordModal(true);
  };

  const handleCloseModal = () => {
    setShowMedicalRecordModal(false);
    setSelectedAppointmentId(null);
  };

  const handleStartExamination = (appointmentId: string) => {
    setSelectedAppointmentId(appointmentId);
    setShowExaminationModal(true);
    // Lấy thông tin lịch hẹn để điền sẵn lý do khám
    const appointment = appointments.find(apt => apt.id === appointmentId);
    if (appointment) {
      setExaminationFormData({
        ly_do_kham: '',
        trieu_chung: '',
        chan_doan_so_bo: '',
        chan_doan_cuoi: '',
        ghi_chu_bac_si: '',
        trang_thai: 'in_progress',
      });
    }
  };

  const handleCloseExaminationModal = () => {
    setShowExaminationModal(false);
    setSelectedAppointmentId(null);
    setExaminationFormData({
      ly_do_kham: '',
      trieu_chung: '',
      chan_doan_so_bo: '',
      chan_doan_cuoi: '',
      ghi_chu_bac_si: '',
      trang_thai: 'in_progress',
    });
  };

  // Mutation để tạo hồ sơ khám
  const createMedicalRecord = useMutation({
    mutationFn: async (data: any) => {
      return api.post('/doctor/ho-so-kham', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-appointments-sql'] });
      queryClient.invalidateQueries({ queryKey: ['doctor-medical-record', selectedAppointmentId] });
      toast.success('Tạo hồ sơ khám thành công!');
      handleCloseExaminationModal();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi tạo hồ sơ khám');
    },
  });

  const handleSubmitExamination = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppointmentId) return;

    createMedicalRecord.mutate({
      ma_lich_hen: selectedAppointmentId,
      ...examinationFormData,
    });
  };

  const appointments = useMemo(() => data || [], [data]);
  const summary = useMemo(() => {
    const confirmed = appointments.filter((a) => a.status === 'confirmed').length;
    const pending = appointments.filter((a) => a.status === 'pending' || !a.status).length;
    const completed = appointments.filter((a) => a.status === 'completed').length;
    return { confirmed, pending, completed, total: appointments.length };
  }, [appointments]);

  const formatTime = (value?: string) => {
    if (!value) return '—';
    const d = new Date(value);
    return `${d.toLocaleDateString('vi-VN')} • ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <DoctorLayout>
      <div className="space-y-6 bg-slate-50/60 text-slate-900">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-slate-500">Quản lý lịch khám</p>
              <h1 className="text-3xl font-bold text-slate-900">Lịch hẹn</h1>
              <p className="mt-2 text-slate-600">Hiển thị toàn bộ lịch hẹn kèm thông tin bệnh nhân và bác sĩ từ SQL Server.</p>
            </div>
            <div className="rounded-xl bg-cyan-50 px-4 py-3 text-sm font-semibold text-cyan-700 border border-cyan-200 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {summary.total} lịch hẹn
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Clock3 className="h-5 w-5 text-cyan-600" />
            <h2 className="text-lg font-semibold text-slate-900">Danh sách lịch</h2>
          </div>

          {isLoading && (
            <div className="p-6 text-sm text-slate-600">Đang tải dữ liệu...</div>
          )}

          {!isLoading && appointments.length === 0 && (
            <div className="p-6 text-sm text-slate-600">Chưa có lịch hẹn.</div>
          )}

          {!isLoading && appointments.length > 0 && (
            <div className="divide-y divide-slate-100">
              {appointments.map((apt) => (
                <div key={apt.id} className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center">
                      <p className="text-base font-semibold text-slate-900">
                        {formatTime(apt.time)}
                      </p>
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">
                        Ca: {apt.room || '—'}
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 flex items-center gap-2">
                        <User className="h-4 w-4 text-slate-500" />
                        {apt.patientName}
                      </p>
                      <p className="text-sm text-slate-600 flex items-center gap-2">
                        <Stethoscope className="h-4 w-4 text-cyan-500" />
                        {apt.patientPhone || 'Chưa có số'} • {apt.patientEmail || 'Chưa có email'}
                      </p>
                      {apt.doctorName && (
                        <p className="text-sm text-slate-500 flex items-center gap-2 mt-1">
                          <Stethoscope className="h-3 w-3 text-slate-400" />
                          Bác sĩ: {apt.doctorName}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyle[apt.status || 'pending'] || statusStyle.pending}`}>
                      {statusLabel(apt.status)}
                    </span>
                    {(apt.status === 'pending' || !apt.status) && (
                      <button 
                        onClick={() => handleStartExamination(apt.id)}
                        className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 hover:border-amber-300 hover:bg-amber-100 transition-colors flex items-center gap-1"
                      >
                        <PlayCircle className="h-3 w-3" />
                        Tiến hành khám
                      </button>
                    )}
                    <button 
                      onClick={() => handleViewMedicalRecord(apt.id)}
                      className="rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-700 hover:border-cyan-300 hover:bg-cyan-100 transition-colors"
                    >
                      Xem hồ sơ
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <CheckCircle2 className="h-5 h-5 text-emerald-600" />
              <h3 className="font-semibold text-slate-900">Tóm tắt nhanh</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm text-slate-600">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs text-slate-500 uppercase">Đã xác nhận</p>
                <p className="text-2xl font-bold text-slate-900">{summary.confirmed}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs text-slate-500 uppercase">Chờ khám</p>
                <p className="text-2xl font-bold text-slate-900">{summary.pending}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs text-slate-500 uppercase">Hoàn thành</p>
                <p className="text-2xl font-bold text-slate-900">{summary.completed}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs text-slate-500 uppercase">Tổng</p>
                <p className="text-2xl font-bold text-slate-900">{summary.total}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <h3 className="font-semibold text-slate-900">Ghi chú</h3>
            </div>
            <ul className="space-y-3 text-sm text-slate-700">
              <li className="rounded-xl border border-slate-200 bg-slate-50 p-3">Chuẩn bị kết quả xét nghiệm cho ca sáng.</li>
              <li className="rounded-xl border border-slate-200 bg-slate-50 p-3">Liên hệ điều dưỡng trước ca có bệnh nhân mới.</li>
              <li className="rounded-xl border border-slate-200 bg-slate-50 p-3">Cập nhật tình trạng thanh toán nếu có.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Modal xem hồ sơ khám */}
      {showMedicalRecordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl">
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-cyan-100 p-3">
                  <FileText className="h-6 w-6 text-cyan-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Chi tiết hồ sơ khám</h2>
                  <p className="text-sm text-slate-600">
                    {medicalRecord?.has_ho_so 
                      ? `Mã hồ sơ: ${medicalRecord.ma_ho_so}` 
                      : `Mã lịch hẹn: ${medicalRecord?.ma_lich_hen || selectedAppointmentId}`}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {isLoadingRecord ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-sm text-slate-600">Đang tải thông tin...</div>
                </div>
              ) : medicalRecord ? (
                <>
                  {/* Thông tin bệnh nhân */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
                    <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
                      <User className="h-5 w-5 text-cyan-600" />
                      Thông tin bệnh nhân
                    </h3>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <p className="text-xs font-semibold uppercase text-slate-500">Họ và tên</p>
                        <p className="text-base font-semibold text-slate-900">{medicalRecord.ten_benh_nhan || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase text-slate-500">Giới tính</p>
                        <p className="text-base text-slate-900">{medicalRecord.gioi_tinh || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase text-slate-500">Ngày sinh</p>
                        <p className="text-base text-slate-900">
                          {medicalRecord.ngay_sinh 
                            ? new Date(medicalRecord.ngay_sinh).toLocaleDateString('vi-VN')
                            : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase text-slate-500">Số điện thoại</p>
                        <p className="text-base text-slate-900 flex items-center gap-2">
                          <Phone className="h-4 w-4 text-slate-400" />
                          {medicalRecord.so_dien_thoai || '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase text-slate-500">Email</p>
                        <p className="text-base text-slate-900 flex items-center gap-2">
                          <Mail className="h-4 w-4 text-slate-400" />
                          {medicalRecord.email || '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase text-slate-500">Địa chỉ</p>
                        <p className="text-base text-slate-900 flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-slate-400" />
                          {medicalRecord.dia_chi || '—'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Thông tin lịch hẹn */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
                    <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
                      <CalendarDays className="h-5 w-5 text-cyan-600" />
                      Thông tin lịch hẹn
                    </h3>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <p className="text-xs font-semibold uppercase text-slate-500">Thời gian hẹn</p>
                        <p className="text-base text-slate-900">
                          {medicalRecord.thoi_gian_hen || medicalRecord.ngay_kham
                            ? formatTime(medicalRecord.thoi_gian_hen || medicalRecord.ngay_kham)
                            : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase text-slate-500">Bác sĩ</p>
                        <p className="text-base text-slate-900 flex items-center gap-2">
                          <Stethoscope className="h-4 w-4 text-cyan-500" />
                          {medicalRecord.ten_bac_si || '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase text-slate-500">Trạng thái</p>
                        <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${statusStyle[medicalRecord.trang_thai || 'pending'] || statusStyle.pending}`}>
                          {statusLabel(medicalRecord.trang_thai)}
                        </span>
                      </div>
                      {medicalRecord.bat_dau && medicalRecord.ket_thuc && (
                        <div>
                          <p className="text-xs font-semibold uppercase text-slate-500">Ca khám</p>
                          <p className="text-base text-slate-900">
                            {new Date(medicalRecord.bat_dau).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - {new Date(medicalRecord.ket_thuc).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Thông tin khám bệnh */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
                    <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
                      <FileText className="h-5 w-5 text-cyan-600" />
                      Thông tin khám bệnh
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs font-semibold uppercase text-slate-500 mb-1">Lý do khám</p>
                        <p className="text-base text-slate-900 bg-white rounded-lg p-3 border border-slate-200">
                          {medicalRecord.ly_do_kham || 'Chưa có thông tin'}
                        </p>
                      </div>
                      {medicalRecord.trieu_chung && (
                        <div>
                          <p className="text-xs font-semibold uppercase text-slate-500 mb-1">Triệu chứng</p>
                          <p className="text-base text-slate-900 bg-white rounded-lg p-3 border border-slate-200">
                            {medicalRecord.trieu_chung}
                          </p>
                        </div>
                      )}
                      {medicalRecord.chan_doan_so_bo && (
                        <div>
                          <p className="text-xs font-semibold uppercase text-slate-500 mb-1">Chẩn đoán sơ bộ</p>
                          <p className="text-base text-slate-900 bg-white rounded-lg p-3 border border-slate-200">
                            {medicalRecord.chan_doan_so_bo}
                          </p>
                        </div>
                      )}
                      {medicalRecord.chan_doan_cuoi && (
                        <div>
                          <p className="text-xs font-semibold uppercase text-slate-500 mb-1">Chẩn đoán cuối</p>
                          <p className="text-base text-slate-900 bg-white rounded-lg p-3 border border-slate-200">
                            {medicalRecord.chan_doan_cuoi}
                          </p>
                        </div>
                      )}
                      {medicalRecord.ghi_chu_bac_si && (
                        <div>
                          <p className="text-xs font-semibold uppercase text-slate-500 mb-1">Ghi chú bác sĩ</p>
                          <p className="text-base text-slate-900 bg-white rounded-lg p-3 border border-slate-200">
                            {medicalRecord.ghi_chu_bac_si}
                          </p>
                        </div>
                      )}
                      {!medicalRecord.has_ho_so && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                          <p className="text-sm text-amber-800">
                            <AlertCircle className="h-4 w-4 inline mr-2" />
                            Chưa có hồ sơ khám. Hồ sơ sẽ được tạo sau khi bác sĩ khám bệnh.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center py-12">
                  <div className="text-sm text-slate-600">Không tìm thấy thông tin hồ sơ khám</div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 border-t border-slate-200 bg-slate-50 p-6">
              <div className="flex justify-end gap-3">
                <button
                  onClick={handleCloseModal}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal tiến hành khám bệnh */}
      {showExaminationModal && selectedAppointmentId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl">
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-amber-100 p-3">
                  <Stethoscope className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Tiến hành khám bệnh</h2>
                  <p className="text-sm text-slate-600">
                    Mã lịch hẹn: {selectedAppointmentId}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseExaminationModal}
                className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form Content */}
            <form onSubmit={handleSubmitExamination}>
              <div className="p-6 space-y-6">
                {/* Thông tin bệnh nhân */}
                {(() => {
                  const appointment = appointments.find(apt => apt.id === selectedAppointmentId);
                  return appointment ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <h3 className="mb-3 text-sm font-semibold text-slate-700">Thông tin bệnh nhân</h3>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-slate-500">Họ và tên</p>
                          <p className="font-semibold text-slate-900">{appointment.patientName}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Số điện thoại</p>
                          <p className="text-slate-900">{appointment.patientPhone || '—'}</p>
                        </div>
                      </div>
                    </div>
                  ) : null;
                })()}

                {/* Form fields */}
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-900">
                      Lý do khám <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={examinationFormData.ly_do_kham}
                      onChange={(e) => setExaminationFormData({ ...examinationFormData, ly_do_kham: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                      placeholder="Ví dụ: Khám tổng quát, đau đầu, sốt..."
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-900">
                      Triệu chứng
                    </label>
                    <textarea
                      value={examinationFormData.trieu_chung}
                      onChange={(e) => setExaminationFormData({ ...examinationFormData, trieu_chung: e.target.value })}
                      rows={3}
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                      placeholder="Mô tả các triệu chứng của bệnh nhân..."
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-900">
                      Chẩn đoán sơ bộ
                    </label>
                    <textarea
                      value={examinationFormData.chan_doan_so_bo}
                      onChange={(e) => setExaminationFormData({ ...examinationFormData, chan_doan_so_bo: e.target.value })}
                      rows={2}
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                      placeholder="Chẩn đoán ban đầu..."
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-900">
                      Chẩn đoán cuối
                    </label>
                    <textarea
                      value={examinationFormData.chan_doan_cuoi}
                      onChange={(e) => setExaminationFormData({ ...examinationFormData, chan_doan_cuoi: e.target.value })}
                      rows={2}
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                      placeholder="Chẩn đoán cuối cùng..."
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-900">
                      Ghi chú bác sĩ
                    </label>
                    <textarea
                      value={examinationFormData.ghi_chu_bac_si}
                      onChange={(e) => setExaminationFormData({ ...examinationFormData, ghi_chu_bac_si: e.target.value })}
                      rows={3}
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                      placeholder="Ghi chú, hướng dẫn điều trị, lời dặn..."
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-900">
                      Trạng thái
                    </label>
                    <select
                      value={examinationFormData.trang_thai}
                      onChange={(e) => setExaminationFormData({ ...examinationFormData, trang_thai: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                    >
                      <option value="in_progress">Đang theo dõi</option>
                      <option value="completed">Hoàn thành</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="sticky bottom-0 border-t border-slate-200 bg-slate-50 p-6">
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleCloseExaminationModal}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                    disabled={createMedicalRecord.isPending}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={createMedicalRecord.isPending}
                    className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {createMedicalRecord.isPending ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                        Đang lưu...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Lưu hồ sơ khám
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </DoctorLayout>
  );
}

