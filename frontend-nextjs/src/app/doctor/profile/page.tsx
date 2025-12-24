'use client';

import { useState, useEffect, useRef } from 'react';
import { DoctorLayout } from '@/components/Layout/DoctorLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useStaticQuery } from '@/lib/hooks/useOptimizedQuery';
import { doctorProfileApi, adminApi } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Edit2,
  Save,
  X,
  Stethoscope,
  Shield,
  UserCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader,
  FileText,
  CreditCard,
  Upload,
  Building2,
  GraduationCap,
  Award,
  Briefcase,
  BadgeCheck
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

// Backend base URL (without /api)
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';

export default function DoctorProfilePage() {
  const [isEditing, setIsEditing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    ma_khoa: '',
    ten_bac_si: '',
    chuyen_khoa: '',
    sdt: '',
    dia_chi: '',
    email: '',
    tieu_su: '',
    so_chung_chi_hanh_nghe: '',
    ma_thong_bao: ''
  });

  const queryClient = useQueryClient();

  // Fetch departments
  const { data: departmentsData } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const res = await adminApi.getDepartments();
      return res.data.data || [];
    },
  });

  const departments = departmentsData || [];

  // Fetch profile với static query (data ít thay đổi)
  const { data: profileData, isLoading, error: profileError } = useStaticQuery(
    ['doctor-profile'],
    async () => {
      const response = await doctorProfileApi.get();
      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Không thể tải thông tin profile');
      }
      return response.data;
    }
  );

  const profile = profileData?.data;

  // Update form data when profile loads
  useEffect(() => {
    if (profile && !isEditing) {
      setFormData({
        ma_khoa: profile.ma_khoa || '',
        ten_bac_si: profile.ten_bac_si || '',
        chuyen_khoa: profile.chuyen_khoa || '',
        sdt: profile.sdt || '',
        dia_chi: profile.dia_chi || '',
        email: profile.email || '',
        tieu_su: profile.tieu_su || '',
        so_chung_chi_hanh_nghe: profile.so_chung_chi_hanh_nghe || '',
        ma_thong_bao: profile.ma_thong_bao || ''
      });
    }
  }, [profile, isEditing]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log('📤 Sending update request:', data);
      const response = await doctorProfileApi.update(data);
      return response.data;
    },
    onSuccess: (data) => {
      console.log('✅ Update successful:', data);
      queryClient.invalidateQueries({ queryKey: ['doctor-profile'] });
      toast.success(data.message || 'Cập nhật thông tin thành công!');
      setIsEditing(false);
    },
    onError: (error: any) => {
      console.error('❌ Update error:', error);
      console.error('❌ Error response:', error.response);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error?.message ||
                          error.message || 
                          'Có lỗi xảy ra khi cập nhật thông tin';
      toast.error(errorMessage);
    }
  });

  // Avatar upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      return await doctorProfileApi.uploadAvatar(file, (progress) => {
        setUploadProgress(progress);
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['doctor-profile'] });
      toast.success(data.data?.message || 'Tải lên avatar thành công!');
      setUploadProgress(0);
      setIsUploading(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi tải lên avatar');
      setUploadProgress(0);
      setIsUploading(false);
    }
  });

  const handleEdit = () => {
    if (profile) {
      setFormData({
        ma_khoa: profile.ma_khoa || '',
        ten_bac_si: profile.ten_bac_si || '',
        chuyen_khoa: profile.chuyen_khoa || '',
        sdt: profile.sdt || '',
        dia_chi: profile.dia_chi || '',
        email: profile.email || '',
        tieu_su: profile.tieu_su || '',
        so_chung_chi_hanh_nghe: profile.so_chung_chi_hanh_nghe || '',
        ma_thong_bao: profile.ma_thong_bao || ''
      });
    }
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (profile) {
      setFormData({
        ma_khoa: profile.ma_khoa || '',
        ten_bac_si: profile.ten_bac_si || '',
        chuyen_khoa: profile.chuyen_khoa || '',
        sdt: profile.sdt || '',
        dia_chi: profile.dia_chi || '',
        email: profile.email || '',
        tieu_su: profile.tieu_su || '',
        so_chung_chi_hanh_nghe: profile.so_chung_chi_hanh_nghe || '',
        ma_thong_bao: profile.ma_thong_bao || ''
      });
    }
    setIsEditing(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Chỉ chấp nhận file JPG, PNG hoặc WEBP');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Kích thước file không được vượt quá 2MB');
      return;
    }

    setIsUploading(true);
    uploadMutation.mutate(file);
  };

  const getAvatarUrl = () => {
    if (profile?.avatar_url) {
      if (profile.avatar_url.startsWith('http://') || profile.avatar_url.startsWith('https://')) {
        return profile.avatar_url;
      }
      if (profile.avatar_url.startsWith('/')) {
        const backendUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
        return `${backendUrl}${profile.avatar_url}`;
      }
      const backendUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
      return `${backendUrl}/uploads/avatars/${profile.avatar_url}`;
    }
    return null;
  };

  if (isLoading) {
    return (
      <DoctorLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
            <p className="text-slate-400 text-sm">Đang tải thông tin...</p>
          </div>
        </div>
      </DoctorLayout>
    );
  }

  if (profileError) {
    return (
      <DoctorLayout>
        <div className="max-w-2xl mx-auto">
          <div className="text-center py-20 px-6">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Có lỗi xảy ra</h2>
            <p className="text-slate-400 mb-6">
              {(profileError as any)?.response?.data?.message || (profileError as any)?.message || 'Không thể tải thông tin profile'}
            </p>
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ['doctor-profile'] })}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Thử lại
            </button>
          </div>
        </div>
      </DoctorLayout>
    );
  }

  if (!profile) {
    return (
      <DoctorLayout>
        <div className="max-w-2xl mx-auto">
          <div className="text-center py-20 px-6">
            <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Không tìm thấy thông tin</h2>
            <p className="text-slate-400 mb-6">
              Hệ thống đang tạo hồ sơ bác sĩ cho bạn. Vui lòng thử lại sau vài giây.
            </p>
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ['doctor-profile'] })}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Tải lại
            </button>
          </div>
        </div>
      </DoctorLayout>
    );
  }

  return (
    <DoctorLayout>
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                <UserCircle className="w-6 h-6 text-white" />
              </div>
              Hồ sơ cá nhân
            </h1>
            <p className="text-slate-400 mt-1">Quản lý thông tin tài khoản của bạn</p>
          </div>
          
          {!isEditing ? (
            <button
              onClick={handleEdit}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2 shadow-lg"
            >
              <Edit2 className="w-5 h-5" />
              Chỉnh sửa
            </button>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
              >
                <X className="w-5 h-5" />
                Hủy
              </button>
              <button
                onClick={handleSubmit}
                disabled={updateMutation.isPending}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updateMutation.isPending ? (
                  <Loader className="w-5 h-5 animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                Lưu thay đổi
              </button>
            </div>
          )}
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Profile Header */}
          <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-cyan-600 px-8 py-8">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              {/* Avatar Section */}
              <div className="relative group">
                <div 
                  className="relative w-28 h-28 rounded-2xl bg-white/20 backdrop-blur-sm border-4 border-white/40 shadow-2xl overflow-hidden cursor-pointer hover:border-white/60 transition-all"
                  onClick={handleAvatarClick}
                >
                  {getAvatarUrl() ? (
                    <img 
                      src={getAvatarUrl()!} 
                      alt={profile.ten_bac_si || 'Doctor avatar'}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-white/10">
                      <UserCircle className="w-16 h-16 text-white" />
                    </div>
                  )}
                  
                  {/* Upload Overlay */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Upload className="w-8 h-8 text-white" />
                  </div>
                  
                  {/* Upload Progress */}
                  {isUploading && (
                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                      <div className="text-center">
                        <Loader className="w-8 h-8 text-white animate-spin mx-auto mb-2" />
                        <p className="text-white text-xs font-semibold">{uploadProgress}%</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Status Badge */}
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-emerald-500 rounded-full border-4 border-blue-700 flex items-center justify-center shadow-lg">
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  </div>
                </div>
              </div>

              {/* Doctor Info */}
              <div className="flex-1 text-white">
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="text-3xl font-bold">{profile.ten_bac_si || 'Bác sĩ'}</h2>
                  <Stethoscope className="w-6 h-6 text-white/90" />
                </div>
                
                <div className="flex flex-wrap items-center gap-4 mb-4">
                  {profile.email && (
                    <div className="flex items-center gap-2 text-blue-100">
                      <Mail className="w-4 h-4" />
                      <span className="text-sm">{profile.email}</span>
                    </div>
                  )}
                  {profile.sdt && (
                    <div className="flex items-center gap-2 text-blue-100">
                      <Phone className="w-4 h-4" />
                      <span className="text-sm">{profile.sdt}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-lg text-xs font-semibold text-white border border-white/30">
                    Bác sĩ
                  </span>
                  {profile.chuyen_khoa && (
                    <span className="px-3 py-1.5 bg-emerald-500/30 backdrop-blur-sm rounded-lg text-xs font-semibold text-white border border-emerald-400/30 flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5" />
                      {profile.chuyen_khoa}
                    </span>
                  )}
                  {profile.ten_khoa && (
                    <span className="px-3 py-1.5 bg-purple-500/30 backdrop-blur-sm rounded-lg text-xs font-semibold text-white border border-purple-400/30 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5" />
                      {profile.ten_khoa}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Profile Content */}
          <form onSubmit={handleSubmit} className="p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Personal Information */}
                <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">Thông tin cá nhân</h3>
                  </div>

                  <div className="space-y-4">
                    {/* Ma Bac Si */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Mã bác sĩ
                      </label>
                      <div className="px-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium">
                        {profile.ma_bac_si}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">Không thể thay đổi</p>
                    </div>

                    {/* Ten Bac Si */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Họ và tên <span className="text-red-500">*</span>
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={formData.ten_bac_si}
                          onChange={(e) => handleInputChange('ten_bac_si', e.target.value)}
                          className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                          required
                        />
                      ) : (
                        <div className="px-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-900">
                          {profile.ten_bac_si || 'Chưa cập nhật'}
                        </div>
                      )}
                    </div>

                    {/* Ma Khoa */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        <Building2 className="w-4 h-4 inline mr-1.5 text-blue-600" />
                        Khoa <span className="text-red-500">*</span>
                      </label>
                      {isEditing ? (
                        <select
                          value={formData.ma_khoa}
                          onChange={(e) => handleInputChange('ma_khoa', e.target.value)}
                          className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                          required
                        >
                          <option value="">-- Chọn khoa --</option>
                          {departments.map((dept: any) => (
                            <option key={dept.ma_khoa} value={dept.ma_khoa}>
                              {dept.ten_khoa}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="px-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-900">
                          {profile.ten_khoa || profile.ma_khoa || 'Chưa cập nhật'}
                        </div>
                      )}
                    </div>

                    {/* Chuyen Khoa */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        <GraduationCap className="w-4 h-4 inline mr-1.5 text-emerald-600" />
                        Chuyên khoa
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={formData.chuyen_khoa}
                          onChange={(e) => handleInputChange('chuyen_khoa', e.target.value)}
                          className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                          placeholder="VD: Tim mạch, Nội tiết..."
                        />
                      ) : (
                        <div className="px-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-900">
                          {profile.chuyen_khoa || 'Chưa cập nhật'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                      <Phone className="w-5 h-5 text-purple-600" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">Thông tin liên hệ</h3>
                  </div>

                  <div className="space-y-4">
                    {/* Email */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        <Mail className="w-4 h-4 inline mr-1.5 text-blue-600" />
                        Email
                      </label>
                      {isEditing ? (
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        />
                      ) : (
                        <div className="px-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-900">
                          {profile.email || 'Chưa cập nhật'}
                        </div>
                      )}
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        <Phone className="w-4 h-4 inline mr-1.5 text-purple-600" />
                        Số điện thoại
                      </label>
                      {isEditing ? (
                        <input
                          type="tel"
                          value={formData.sdt}
                          onChange={(e) => handleInputChange('sdt', e.target.value)}
                          className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                          placeholder="9-15 chữ số"
                        />
                      ) : (
                        <div className="px-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-900">
                          {profile.sdt || 'Chưa cập nhật'}
                        </div>
                      )}
                    </div>

                    {/* Address */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        <MapPin className="w-4 h-4 inline mr-1.5 text-red-600" />
                        Địa chỉ
                      </label>
                      {isEditing ? (
                        <textarea
                          value={formData.dia_chi}
                          onChange={(e) => handleInputChange('dia_chi', e.target.value)}
                          rows={3}
                          className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                        />
                      ) : (
                        <div className="px-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-900 min-h-[80px]">
                          {profile.dia_chi || 'Chưa cập nhật'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Professional Information */}
                <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <Stethoscope className="w-5 h-5 text-emerald-600" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">Thông tin chuyên môn</h3>
                  </div>

                  <div className="space-y-4">
                    {/* License Number */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        <BadgeCheck className="w-4 h-4 inline mr-1.5 text-emerald-600" />
                        Số chứng chỉ hành nghề
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={formData.so_chung_chi_hanh_nghe}
                          onChange={(e) => handleInputChange('so_chung_chi_hanh_nghe', e.target.value)}
                          className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                          placeholder="VD: CHN-001"
                        />
                      ) : (
                        <div className="px-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-900">
                          {profile.so_chung_chi_hanh_nghe || 'Chưa cập nhật'}
                        </div>
                      )}
                    </div>

                    {/* Ma Thong Bao */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        <Shield className="w-4 h-4 inline mr-1.5 text-amber-600" />
                        Mã thông báo
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={formData.ma_thong_bao}
                          onChange={(e) => handleInputChange('ma_thong_bao', e.target.value)}
                          className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        />
                      ) : (
                        <div className="px-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-900">
                          {profile.ma_thong_bao || 'Chưa cập nhật'}
                        </div>
                      )}
                    </div>

                    {/* Tieu Su */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        <FileText className="w-4 h-4 inline mr-1.5 text-blue-600" />
                        Tiểu sử chuyên môn
                      </label>
                      {isEditing ? (
                        <textarea
                          value={formData.tieu_su}
                          onChange={(e) => handleInputChange('tieu_su', e.target.value)}
                          rows={8}
                          className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                          placeholder="Nhập tiểu sử chuyên môn, kinh nghiệm làm việc..."
                        />
                      ) : (
                        <div className="px-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-900 min-h-[200px] whitespace-pre-wrap">
                          {profile.tieu_su || 'Chưa cập nhật'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Account Information */}
                <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-lg bg-slate-200 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-slate-600" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">Thông tin tài khoản</h3>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Ngày tạo tài khoản
                      </label>
                      <div className="px-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-900">
                        {profile.created_at ? formatDate(profile.created_at) : 'N/A'}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Cập nhật lần cuối
                      </label>
                      <div className="px-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-900">
                        {profile.updated_at ? formatDate(profile.updated_at) : 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </DoctorLayout>
  );
}
