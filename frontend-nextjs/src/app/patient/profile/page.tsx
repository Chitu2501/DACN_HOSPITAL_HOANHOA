'use client';

import { useState, useEffect } from 'react';
import { PatientLayout } from '@/components/Layout/PatientLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { patientProfileApi } from '@/lib/api';
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
  Heart,
  Shield,
  UserCircle,
  Home,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader,
  Stethoscope,
  Activity,
  FileText,
  CreditCard,
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function PatientProfile() {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    address: '',
    dateOfBirth: '',
    bloodType: '',
    allergies: '',
    medicalHistory: '',
    insuranceNumber: '',
    emergencyContact: {
      name: '',
      phone: '',
      relationship: ''
    }
  });

  const queryClient = useQueryClient();

  // Fetch profile
  const { data: profileData, isLoading, error: profileError } = useQuery({
    queryKey: ['patient-profile'],
    queryFn: async () => {
      const response = await patientProfileApi.get();
      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Không thể tải thông tin profile');
      }
      return response.data;
    },
    retry: 2,
    refetchOnWindowFocus: false,
  });

  const profile = profileData?.data;

  // Update form data when profile loads
  useEffect(() => {
    if (profile && !isEditing) {
      setFormData({
        email: profile.email || '',
        phone: profile.phone || '',
        address: profile.address || '',
        dateOfBirth: profile.dateOfBirth || '',
        bloodType: profile.bloodType || '',
        allergies: profile.allergies || '',
        medicalHistory: profile.medicalHistory || '',
        insuranceNumber: profile.insuranceNumber || '',
        emergencyContact: profile.emergencyContact || {
          name: '',
          phone: '',
          relationship: ''
        }
      });
    }
  }, [profile, isEditing]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await patientProfileApi.update(data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['patient-profile'] });
      toast.success(data.message || 'Cập nhật thông tin thành công!');
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi cập nhật thông tin');
    }
  });

  const handleEdit = () => {
    if (profile) {
      setFormData({
        email: profile.email || '',
        phone: profile.phone || '',
        address: profile.address || '',
        dateOfBirth: profile.dateOfBirth || '',
        bloodType: profile.bloodType || '',
        allergies: profile.allergies || '',
        medicalHistory: profile.medicalHistory || '',
        insuranceNumber: profile.insuranceNumber || '',
        emergencyContact: profile.emergencyContact || {
          name: '',
          phone: '',
          relationship: ''
        }
      });
    }
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (profile) {
      setFormData({
        email: profile.email || '',
        phone: profile.phone || '',
        address: profile.address || '',
        dateOfBirth: profile.dateOfBirth || '',
        bloodType: profile.bloodType || '',
        allergies: profile.allergies || '',
        medicalHistory: profile.medicalHistory || '',
        insuranceNumber: profile.insuranceNumber || '',
        emergencyContact: profile.emergencyContact || {
          name: '',
          phone: '',
          relationship: ''
        }
      });
    }
    setIsEditing(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const handleInputChange = (field: string, value: any) => {
    if (field.startsWith('emergencyContact.')) {
      const subField = field.split('.')[1];
      setFormData(prev => ({
        ...prev,
        emergencyContact: {
          ...prev.emergencyContact,
          [subField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const getGenderLabel = (gender: string) => {
    switch (gender) {
      case 'male': return 'Nam';
      case 'female': return 'Nữ';
      case 'other': return 'Khác';
      default: return gender;
    }
  };

  const getGenderIcon = (gender: string) => {
    switch (gender) {
      case 'male': return '♂';
      case 'female': return '♀';
      default: return '⚧';
    }
  };

  if (isLoading) {
    return (
      <PatientLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-400 text-sm">Đang tải thông tin...</p>
          </div>
        </div>
      </PatientLayout>
    );
  }

  if (profileError) {
    return (
      <PatientLayout>
        <div className="max-w-2xl mx-auto">
          <div className="text-center py-20 px-6">
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Có lỗi xảy ra</h2>
            <p className="text-slate-400 mb-6">
              {(profileError as any)?.response?.data?.message || (profileError as any)?.message || 'Không thể tải thông tin profile'}
            </p>
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ['patient-profile'] })}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold hover:from-blue-500 hover:to-cyan-500 transition-all shadow-lg shadow-blue-500/25"
            >
              Thử lại
            </button>
          </div>
        </div>
      </PatientLayout>
    );
  }

  if (!profile) {
    return (
      <PatientLayout>
        <div className="max-w-2xl mx-auto">
          <div className="text-center py-20 px-6">
            <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-amber-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Không tìm thấy thông tin</h2>
            <p className="text-slate-400 mb-6">
              Hệ thống đang tạo hồ sơ bệnh nhân cho bạn. Vui lòng thử lại sau vài giây.
            </p>
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ['patient-profile'] })}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold hover:from-blue-500 hover:to-cyan-500 transition-all shadow-lg shadow-blue-500/25"
            >
              Tải lại
            </button>
          </div>
        </div>
      </PatientLayout>
    );
  }

  return (
    <PatientLayout>
      <div className="space-y-8 pb-8">
        {/* Hero Header Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-cyan-600 p-8 md:p-12 shadow-2xl">
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-cyan-400/10 rounded-full blur-2xl"></div>
          
          <div className="relative z-10">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="flex items-center gap-6">
                {/* Avatar */}
                <div className="relative">
                  <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-white/20 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center shadow-xl">
                    <UserCircle className="w-16 h-16 md:w-20 md:h-20 text-white" />
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full border-4 border-blue-700 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  </div>
                </div>
                
                {/* User Info */}
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 flex items-center gap-3">
                    {profile.fullName || 'Bệnh nhân'}
                    <span className="text-2xl">{getGenderIcon(profile.gender)}</span>
                  </h1>
                  <div className="flex flex-wrap items-center gap-4 text-blue-100">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      <span className="text-sm">{profile.email}</span>
                    </div>
                    {profile.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        <span className="text-sm">{profile.phone}</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-semibold text-white border border-white/30">
                      Bệnh nhân
                    </span>
                    {profile.bloodType && (
                      <span className="px-3 py-1 bg-red-500/30 backdrop-blur-sm rounded-full text-xs font-semibold text-white border border-red-400/30 flex items-center gap-1">
                        <Heart className="w-3 h-3" />
                        {profile.bloodType}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-3">
                {!isEditing ? (
                  <button
                    onClick={handleEdit}
                    className="px-6 py-3 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white rounded-xl font-semibold transition-all flex items-center gap-2 border border-white/30 shadow-lg"
                  >
                    <Edit2 className="w-5 h-5" />
                    Chỉnh sửa
                  </button>
                ) : (
                  <div className="flex gap-3">
                    <button
                      onClick={handleCancel}
                      className="px-6 py-3 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white rounded-xl font-semibold transition-all flex items-center gap-2 border border-white/20"
                    >
                      <X className="w-5 h-5" />
                      Hủy
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={updateMutation.isPending}
                      className="px-6 py-3 bg-white text-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition-all flex items-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {updateMutation.isPending ? (
                        <Loader className="w-5 h-5 animate-spin" />
                      ) : (
                        <Save className="w-5 h-5" />
                      )}
                      Lưu
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Ngày sinh</p>
                  <p className="text-sm font-semibold text-white">
                    {profile.dateOfBirth ? formatDate(profile.dateOfBirth) : 'Chưa cập nhật'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-5 rounded-2xl bg-gradient-to-br from-red-500/10 to-red-600/5 border border-red-500/20 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                  <Heart className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Nhóm máu</p>
                  <p className="text-sm font-semibold text-white">
                    {profile.bloodType || 'Chưa cập nhật'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Dị ứng</p>
                  <p className="text-sm font-semibold text-white">
                    {profile.allergies ? 'Có' : 'Không có'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">BHYT</p>
                  <p className="text-sm font-semibold text-white">
                    {profile.insuranceNumber ? 'Đã đăng ký' : 'Chưa đăng ký'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Personal Information Card */}
            <div className="p-6 rounded-2xl bg-slate-900/60 backdrop-blur-sm border border-white/10 shadow-xl hover:shadow-2xl transition-all">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg">
                  <User className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-xl font-bold text-white">Thông tin cá nhân</h2>
              </div>

              <div className="space-y-4">
                {/* Full Name - Read Only */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">
                    Họ và tên
                  </label>
                  <div className="px-4 py-3 bg-slate-800/50 border border-white/5 rounded-xl text-white font-medium">
                    {profile.fullName}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Gender - Read Only */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">
                      Giới tính
                    </label>
                    <div className="px-4 py-3 bg-slate-800/50 border border-white/5 rounded-xl text-white font-medium">
                      {getGenderLabel(profile.gender)}
                    </div>
                  </div>

                  {/* Date of Birth */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">
                      <Calendar className="w-3 h-3 inline mr-1" />
                      Ngày sinh
                    </label>
                    {isEditing ? (
                      <input
                        type="date"
                        value={formData.dateOfBirth}
                        onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                        className="w-full px-4 py-3 bg-slate-800/50 border border-blue-500/30 rounded-xl text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      />
                    ) : (
                      <div className="px-4 py-3 bg-slate-800/50 border border-white/5 rounded-xl text-white">
                        {profile.dateOfBirth ? formatDate(profile.dateOfBirth) : 'Chưa cập nhật'}
                      </div>
                    )}
                  </div>
                </div>

                {/* Blood Type */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">
                    <Heart className="w-3 h-3 inline mr-1 text-red-400" />
                    Nhóm máu
                  </label>
                  {isEditing ? (
                    <select
                      value={formData.bloodType}
                      onChange={(e) => handleInputChange('bloodType', e.target.value)}
                      className="w-full px-4 py-3 bg-slate-800/50 border border-blue-500/30 rounded-xl text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    >
                      <option value="">Chọn nhóm máu</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </select>
                  ) : (
                    <div className="px-4 py-3 bg-slate-800/50 border border-white/5 rounded-xl text-white">
                      {profile.bloodType || 'Chưa cập nhật'}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Contact Information Card */}
            <div className="p-6 rounded-2xl bg-slate-900/60 backdrop-blur-sm border border-white/10 shadow-xl hover:shadow-2xl transition-all">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg">
                  <Phone className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-xl font-bold text-white">Thông tin liên hệ</h2>
              </div>

              <div className="space-y-4">
                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">
                    <Mail className="w-3 h-3 inline mr-1" />
                    Email
                  </label>
                  {isEditing ? (
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="w-full px-4 py-3 bg-slate-800/50 border border-blue-500/30 rounded-xl text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      required
                    />
                  ) : (
                    <div className="px-4 py-3 bg-slate-800/50 border border-white/5 rounded-xl text-white">
                      {profile.email}
                    </div>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">
                    <Phone className="w-3 h-3 inline mr-1" />
                    Số điện thoại
                  </label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="w-full px-4 py-3 bg-slate-800/50 border border-blue-500/30 rounded-xl text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      required
                    />
                  ) : (
                    <div className="px-4 py-3 bg-slate-800/50 border border-white/5 rounded-xl text-white">
                      {profile.phone || 'Chưa cập nhật'}
                    </div>
                  )}
                </div>

                {/* Address */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">
                    <MapPin className="w-3 h-3 inline mr-1" />
                    Địa chỉ
                  </label>
                  {isEditing ? (
                    <textarea
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 bg-slate-800/50 border border-blue-500/30 rounded-xl text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                      required
                    />
                  ) : (
                    <div className="px-4 py-3 bg-slate-800/50 border border-white/5 rounded-xl text-white min-h-[80px]">
                      {profile.address || 'Chưa cập nhật'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Medical Information Card */}
          <div className="p-6 rounded-2xl bg-slate-900/60 backdrop-blur-sm border border-white/10 shadow-xl hover:shadow-2xl transition-all">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                <Stethoscope className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white">Thông tin y tế</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Insurance Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">
                  <CreditCard className="w-3 h-3 inline mr-1" />
                  Số thẻ BHYT
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.insuranceNumber}
                    onChange={(e) => handleInputChange('insuranceNumber', e.target.value)}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-blue-500/30 rounded-xl text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    placeholder="Nhập số thẻ BHYT"
                  />
                ) : (
                  <div className="px-4 py-3 bg-slate-800/50 border border-white/5 rounded-xl text-white">
                    {profile.insuranceNumber || 'Chưa cập nhật'}
                  </div>
                )}
              </div>

              {/* Allergies */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">
                  <AlertTriangle className="w-3 h-3 inline mr-1 text-amber-400" />
                  Dị ứng
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.allergies}
                    onChange={(e) => handleInputChange('allergies', e.target.value)}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-blue-500/30 rounded-xl text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    placeholder="VD: Penicillin, Thuốc giảm đau..."
                  />
                ) : (
                  <div className="px-4 py-3 bg-slate-800/50 border border-white/5 rounded-xl text-white">
                    {profile.allergies || 'Không có'}
                  </div>
                )}
              </div>

              {/* Medical History */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">
                  <FileText className="w-3 h-3 inline mr-1" />
                  Tiền sử bệnh
                </label>
                {isEditing ? (
                  <textarea
                    value={formData.medicalHistory}
                    onChange={(e) => handleInputChange('medicalHistory', e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-blue-500/30 rounded-xl text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                    placeholder="Nhập tiền sử bệnh (nếu có)"
                  />
                ) : (
                  <div className="px-4 py-3 bg-slate-800/50 border border-white/5 rounded-xl text-white min-h-[100px] whitespace-pre-wrap">
                    {profile.medicalHistory || 'Không có'}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Emergency Contact Card */}
          <div className="p-6 rounded-2xl bg-slate-900/60 backdrop-blur-sm border border-red-500/20 shadow-xl hover:shadow-2xl transition-all">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center shadow-lg">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white">Liên hệ khẩn cấp</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Emergency Contact Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">
                  <User className="w-3 h-3 inline mr-1" />
                  Họ và tên
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.emergencyContact.name}
                    onChange={(e) => handleInputChange('emergencyContact.name', e.target.value)}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-blue-500/30 rounded-xl text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    placeholder="Nhập họ và tên"
                  />
                ) : (
                  <div className="px-4 py-3 bg-slate-800/50 border border-white/5 rounded-xl text-white">
                    {profile.emergencyContact?.name || 'Chưa cập nhật'}
                  </div>
                )}
              </div>

              {/* Emergency Contact Phone */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">
                  <Phone className="w-3 h-3 inline mr-1" />
                  Số điện thoại
                </label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={formData.emergencyContact.phone}
                    onChange={(e) => handleInputChange('emergencyContact.phone', e.target.value)}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-blue-500/30 rounded-xl text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    placeholder="Nhập số điện thoại"
                  />
                ) : (
                  <div className="px-4 py-3 bg-slate-800/50 border border-white/5 rounded-xl text-white">
                    {profile.emergencyContact?.phone || 'Chưa cập nhật'}
                  </div>
                )}
              </div>

              {/* Relationship */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">
                  <UserCircle className="w-3 h-3 inline mr-1" />
                  Mối quan hệ
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.emergencyContact.relationship}
                    onChange={(e) => handleInputChange('emergencyContact.relationship', e.target.value)}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-blue-500/30 rounded-xl text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    placeholder="VD: Vợ, Chồng, Bố, Mẹ..."
                  />
                ) : (
                  <div className="px-4 py-3 bg-slate-800/50 border border-white/5 rounded-xl text-white">
                    {profile.emergencyContact?.relationship || 'Chưa cập nhật'}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Account Info Card */}
          <div className="p-6 rounded-2xl bg-slate-900/60 backdrop-blur-sm border border-white/10 shadow-xl">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center shadow-lg">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white">Thông tin tài khoản</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">
                  Ngày tạo tài khoản
                </label>
                <div className="px-4 py-3 bg-slate-800/50 border border-white/5 rounded-xl text-white">
                  {profile.createdAt ? formatDate(profile.createdAt) : 'N/A'}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">
                  Cập nhật lần cuối
                </label>
                <div className="px-4 py-3 bg-slate-800/50 border border-white/5 rounded-xl text-white">
                  {profile.updatedAt ? formatDate(profile.updatedAt) : 'N/A'}
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </PatientLayout>
  );
}
