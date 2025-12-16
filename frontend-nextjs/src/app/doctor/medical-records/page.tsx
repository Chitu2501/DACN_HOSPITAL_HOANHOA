'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DoctorLayout } from '@/components/Layout/DoctorLayout';
import { api } from '@/lib/api';
import { USE_MOCK_DATA, mockDashboardStats } from '@/lib/mockData';
import { FileText, Calendar, Stethoscope, Activity, Download, Plus, X, Save } from 'lucide-react';
import toast from 'react-hot-toast';

type MedicalRecord = {
  _id: string;
  visitDate?: string;
  diagnosis?: string;
  doctorNotes?: string;
  status?: string;
  reason?: string;
  source?: string;
  ma_lich_hen?: string; // Mã lịch hẹn để tạo hồ sơ khám
  patient?: { 
    fullName?: string;
    phone?: string;
    email?: string;
    gender?: string;
    birthDate?: string;
  };
  doctor?: { fullName?: string; specialization?: string; department?: string };
};

const statusStyle: Record<string, string> = {
  in_progress: 'bg-amber-50 text-amber-700 border border-amber-200',
  completed: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  cancelled: 'bg-rose-50 text-rose-700 border border-rose-200',
  archived: 'bg-slate-50 text-slate-700 border border-slate-200',
  active: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
};

const statusLabels: Record<string, string> = {
  in_progress: 'Đang theo dõi',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
  archived: 'Lưu trữ',
  active: 'Đang theo dõi',
};

export default function DoctorMedicalRecordsPage() {
  const queryClient = useQueryClient();
  const [draftStatus, setDraftStatus] = useState<Record<string, string>>({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);
  const [formData, setFormData] = useState({
    ly_do_kham: '',
    trieu_chung: '',
    chan_doan_so_bo: '',
    chan_doan_cuoi: '',
    ghi_chu_bac_si: '',
    trang_thai: 'in_progress'
  });
  const { data, isLoading } = useQuery({
    queryKey: ['doctor-medical-records'],
    queryFn: async () => {
      if (USE_MOCK_DATA) {
        // Fallback mock data from dashboard stats if backend chưa sẵn sàng
        const mock = mockDashboardStats?.recent?.appointments || [];
        return { data: mock.map((item: any, idx: number) => ({
          _id: item._id || `mock-${idx}`,
          visitDate: item.appointmentDate || item.date,
          diagnosis: item.diagnosis || item.reason || 'Chưa có chẩn đoán',
          doctorNotes: item.notes || item.reason || '',
          status: item.status || 'in_progress',
          patient: item.patient ? { fullName: item.patient.fullName } : undefined,
          doctor: item.doctor ? { fullName: item.doctor.fullName, specialization: item.doctor.specialization, department: item.doctor.department } : undefined,
        })), source: 'mock', error: false };
      }
      const res = await api.get('/doctor/ho-so-kham');
      const raw = res.data?.data || [];
      const mapped = raw.map((item: any, idx: number) => ({
        _id: item.ma_ho_so || `hs-${idx}`,
        visitDate: item.ngay_kham || item.tao_luc,
        diagnosis: item.chan_doan_cuoi || item.chan_doan_so_bo || item.ly_do_kham || 'Chưa có chẩn đoán',
        doctorNotes: item.ghi_chu_bac_si || item.trieu_chung || item.ly_do_kham || 'Chưa có ghi chú',
        status: item.trang_thai || 'pending',
        reason: item.ly_do_kham || 'Đặt lịch khám',
        ma_lich_hen: item.ma_lich_hen || (item.source === 'lich_hen' ? item.ma_ho_so : undefined), // Lưu ma_lich_hen nếu là lịch hẹn
        patient: { 
          fullName: item.ten_benh_nhan || `Bệnh nhân ${idx + 1}`,
          phone: item.so_dien_thoai,
          email: item.email,
          gender: item.gioi_tinh,
          birthDate: item.ngay_sinh
        },
        source: item.source || 'ho_so_kham'
      }));
      return { data: mapped, source: 'api', error: false };
    },
  });

  const records: MedicalRecord[] = useMemo(() => data?.data || [], [data]);
  const loadError = data?.error;
  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return api.put(`/doctor/ho-so-kham/${id}`, { trang_thai: status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-medical-records'] });
      toast.success('Cập nhật trạng thái thành công!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi cập nhật');
    }
  });

  const createMedicalRecord = useMutation({
    mutationFn: async (data: any) => {
      return api.post('/doctor/ho-so-kham', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-medical-records'] });
      toast.success('Tạo hồ sơ khám thành công!');
      setShowCreateModal(false);
      setSelectedRecord(null);
      setFormData({
        ly_do_kham: '',
        trieu_chung: '',
        chan_doan_so_bo: '',
        chan_doan_cuoi: '',
        ghi_chu_bac_si: '',
        trang_thai: 'in_progress'
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi tạo hồ sơ');
    }
  });

  const handleChangeStatus = (id: string, value: string) => {
    setDraftStatus((prev) => ({ ...prev, [id]: value }));
  };

  const handleSave = (id: string) => {
    const status = draftStatus[id];
    if (!status) return;
    updateStatus.mutate({ id, status });
  };

  const handleCreateRecord = (record: MedicalRecord) => {
    setSelectedRecord(record);
    setFormData({
      ly_do_kham: record.reason || '',
      trieu_chung: '',
      chan_doan_so_bo: '',
      chan_doan_cuoi: '',
      ghi_chu_bac_si: '',
      trang_thai: 'in_progress'
    });
    setShowCreateModal(true);
  };

  const handleSubmitCreate = () => {
    if (!selectedRecord) {
      toast.error('Không tìm thấy lịch hẹn');
      return;
    }

    if (!formData.ly_do_kham.trim()) {
      toast.error('Vui lòng nhập lý do khám');
      return;
    }

    // Lấy ma_lich_hen từ record
    const maLichHen = selectedRecord.ma_lich_hen || selectedRecord._id;

    if (!maLichHen) {
      toast.error('Không tìm thấy mã lịch hẹn');
      return;
    }

    createMedicalRecord.mutate({
      ma_lich_hen: maLichHen,
      ...formData
    });
  };

  const counts = useMemo(() => {
    const total = records.length;
    const active = records.filter((r) => ['in_progress', 'completed', 'active'].includes(r.status || '')).length;
    const archived = records.filter((r) => r.status === 'archived' || r.status === 'cancelled').length;
    return { total, active, archived };
  }, [records]);

  return (
    <DoctorLayout>
      <div className="space-y-6 bg-slate-50/60 text-slate-900">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-slate-500">Hồ sơ bệnh án</p>
              <h1 className="text-3xl font-bold text-slate-900">Danh sách hồ sơ</h1>
              <p className="mt-2 text-slate-600">Xem nhanh chẩn đoán và ghi chú điều trị (dữ liệu từ SQL Server).</p>
            </div>
            <button className="rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-700 hover:border-cyan-300 flex items-center gap-2">
              <Download className="h-4 w-4" />
              Xuất danh sách
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="h-5 w-5 text-cyan-600" />
            <h2 className="text-lg font-semibold text-slate-900">Hồ sơ gần đây</h2>
          </div>

          {isLoading && (
            <div className="p-6 text-sm text-slate-600">Đang tải dữ liệu...</div>
          )}

          {loadError && (
            <div className="p-6 text-sm text-rose-600">
              Không thể tải hồ sơ từ API. Đang hiển thị dữ liệu mock. Kiểm tra lại kết nối API/SQL Server hoặc quyền truy cập.
            </div>
          )}

          {!isLoading && (
            <div className="grid grid-cols-1 gap-3">
              {records.map((rec) => (
                <div key={rec._id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-white px-3 py-2 border border-slate-200 text-center">
                      <p className="text-sm font-semibold text-slate-900">
                        {rec.visitDate ? new Date(rec.visitDate).toLocaleDateString('vi-VN') : '—'}
                      </p>
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">Ngày khám</p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 flex items-center gap-2">
                        <Stethoscope className="h-4 w-4 text-cyan-600" />
                        {rec.patient?.fullName || 'Bệnh nhân'}
                        {rec.source === 'lich_hen' && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-normal">
                            Lịch hẹn mới
                          </span>
                        )}
                      </p>
                      {(rec.patient?.phone || rec.patient?.email) && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          {rec.patient?.phone && `📞 ${rec.patient.phone}`}
                          {rec.patient?.phone && rec.patient?.email && ' • '}
                          {rec.patient?.email && `✉️ ${rec.patient.email}`}
                        </p>
                      )}
                      <p className="text-sm text-slate-700 mt-1">
                        {rec.diagnosis || rec.reason || 'Chưa có chẩn đoán'}
                      </p>
                      <p className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                        <Activity className="h-4 w-4 text-emerald-500" />
                        {rec.doctorNotes || 'Chưa có ghi chú'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    {rec.source === 'lich_hen' && (
                      <button
                        onClick={() => handleCreateRecord(rec)}
                        className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:border-blue-300 hover:bg-blue-100 flex items-center gap-1.5"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Tạo hồ sơ khám
                      </button>
                    )}
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyle[rec.status || 'active'] || statusStyle.active}`}>
                      {statusLabels[rec.status || 'active'] || 'Đang theo dõi'}
                    </span>
                    {rec.source !== 'lich_hen' && (
                      <>
                        <select
                          value={draftStatus[rec._id] ?? rec.status ?? 'in_progress'}
                          onChange={(e) => handleChangeStatus(rec._id, e.target.value)}
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700"
                        >
                          <option value="in_progress">Đang theo dõi</option>
                          <option value="completed">Hoàn thành</option>
                          <option value="cancelled">Đã hủy</option>
                          <option value="archived">Lưu trữ</option>
                        </select>
                        <button
                          onClick={() => handleSave(rec._id)}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-emerald-300 hover:text-emerald-700"
                        >
                          Lưu
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
              {records.length === 0 && (
                <div className="p-6 text-sm text-slate-600">Chưa có hồ sơ.</div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-cyan-600" />
              <p className="text-sm font-semibold text-slate-900">Tổng hồ sơ</p>
            </div>
            <p className="mt-2 text-3xl font-bold text-slate-900">{counts.total}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-emerald-600" />
              <p className="text-sm font-semibold text-slate-900">Ca đang theo dõi</p>
            </div>
            <p className="mt-2 text-3xl font-bold text-slate-900">{counts.active}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-amber-600" />
              <p className="text-sm font-semibold text-slate-900">Hồ sơ lưu trữ/hủy</p>
            </div>
            <p className="mt-2 text-3xl font-bold text-slate-900">{counts.archived}</p>
          </div>
        </div>
      </div>

      {/* Modal tạo hồ sơ khám */}
      {showCreateModal && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-3xl bg-white rounded-2xl border border-slate-200 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Tạo hồ sơ khám</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setSelectedRecord(null);
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            {/* Thông tin bệnh nhân */}
            <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <h3 className="font-semibold text-slate-900 mb-3">Thông tin bệnh nhân</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">Tên bệnh nhân</p>
                  <p className="font-medium text-slate-900">{selectedRecord.patient?.fullName || '—'}</p>
                </div>
                <div>
                  <p className="text-slate-500">Số điện thoại</p>
                  <p className="font-medium text-slate-900">{selectedRecord.patient?.phone || '—'}</p>
                </div>
                <div>
                  <p className="text-slate-500">Email</p>
                  <p className="font-medium text-slate-900">{selectedRecord.patient?.email || '—'}</p>
                </div>
                <div>
                  <p className="text-slate-500">Ngày khám</p>
                  <p className="font-medium text-slate-900">
                    {selectedRecord.visitDate ? new Date(selectedRecord.visitDate).toLocaleDateString('vi-VN') : '—'}
                  </p>
                </div>
              </div>
            </div>

            {/* Form nhập thông tin */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Lý do khám <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.ly_do_kham}
                  onChange={(e) => setFormData({ ...formData, ly_do_kham: e.target.value })}
                  placeholder="Nhập lý do khám"
                  className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Triệu chứng
                </label>
                <textarea
                  value={formData.trieu_chung}
                  onChange={(e) => setFormData({ ...formData, trieu_chung: e.target.value })}
                  placeholder="Mô tả các triệu chứng bệnh nhân gặp phải..."
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Chẩn đoán sơ bộ
                </label>
                <textarea
                  value={formData.chan_doan_so_bo}
                  onChange={(e) => setFormData({ ...formData, chan_doan_so_bo: e.target.value })}
                  placeholder="Chẩn đoán ban đầu..."
                  rows={2}
                  className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Chẩn đoán cuối
                </label>
                <textarea
                  value={formData.chan_doan_cuoi}
                  onChange={(e) => setFormData({ ...formData, chan_doan_cuoi: e.target.value })}
                  placeholder="Chẩn đoán cuối cùng..."
                  rows={2}
                  className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Ghi chú bác sĩ
                </label>
                <textarea
                  value={formData.ghi_chu_bac_si}
                  onChange={(e) => setFormData({ ...formData, ghi_chu_bac_si: e.target.value })}
                  placeholder="Ghi chú điều trị, hướng dẫn..."
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Trạng thái
                </label>
                <select
                  value={formData.trang_thai}
                  onChange={(e) => setFormData({ ...formData, trang_thai: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="in_progress">Đang theo dõi</option>
                  <option value="completed">Hoàn thành</option>
                  <option value="cancelled">Đã hủy</option>
                </select>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setSelectedRecord(null);
                }}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleSubmitCreate}
                disabled={createMedicalRecord.isPending || !formData.ly_do_kham}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {createMedicalRecord.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Đang tạo...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Tạo hồ sơ khám
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </DoctorLayout>
  );
}

