'use client';

import { DoctorLayout } from '@/components/Layout/DoctorLayout';
import { User, Mail, Phone, MapPin, Stethoscope, ShieldCheck, Edit3 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

const info = {
  fullName: 'BS. Nguyễn Văn A',
  specialization: 'Tim mạch',
  department: 'Khoa Tim mạch',
  email: 'bsnguyen@hospital.com',
  phone: '0912 345 678',
  address: '123 Đường ABC, Quận 1, TP.HCM',
  license: 'BS-001',
  experience: '12 năm',
};

export default function DoctorProfilePage() {
  const { user } = useAuthStore();
  const displayName = user?.fullName || info.fullName;

  return (
    <DoctorLayout>
      <div className="space-y-6 bg-slate-50/60 text-slate-900">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700 border border-cyan-200 text-xl font-bold">
              {displayName.charAt(0)}
            </div>
            <div>
              <p className="text-sm text-slate-500">Hồ sơ cá nhân</p>
              <h1 className="text-3xl font-bold text-slate-900">{displayName}</h1>
              <p className="mt-1 text-slate-600 flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-cyan-600" />
                {user?.specialization || info.specialization} • {user?.department || info.department}
              </p>
              <p className="text-sm text-slate-500">Giấy phép: {info.license} • Kinh nghiệm: {info.experience}</p>
            </div>
          </div>
          <button className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-cyan-300 hover:text-cyan-700 flex items-center gap-2">
            <Edit3 className="h-4 w-4" />
            Cập nhật
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <User className="h-5 w-5 text-slate-600" />
              <h3 className="text-lg font-semibold text-slate-900">Thông tin liên hệ</h3>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <Mail className="h-4 w-4 text-slate-500" />
              <span>{user?.email || info.email}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <Phone className="h-4 w-4 text-slate-500" />
              <span>{info.phone}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <MapPin className="h-4 w-4 text-slate-500" />
              <span>{info.address}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              <h3 className="text-lg font-semibold text-slate-900">Thông tin chuyên môn</h3>
            </div>
            <p className="text-sm text-slate-700">
              Chuyên khoa: <span className="font-semibold text-slate-900">{user?.specialization || info.specialization}</span>
            </p>
            <p className="text-sm text-slate-700">
              Phòng ban: <span className="font-semibold text-slate-900">{user?.department || info.department}</span>
            </p>
            <p className="text-sm text-slate-700">Giấy phép hành nghề: {info.license}</p>
            <p className="text-sm text-slate-700">Kinh nghiệm: {info.experience}</p>
          </div>
        </div>
      </div>
    </DoctorLayout>
  );
}

