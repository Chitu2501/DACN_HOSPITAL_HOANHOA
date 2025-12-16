'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { UserPlus, Mail, Lock, User, Phone, Eye, EyeOff, Heart, CheckCircle2, ArrowLeft, Sparkles } from 'lucide-react';

interface RegisterForm {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  phone: string;
  gender: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<RegisterForm>();
  const password = watch('password');
  const watchedPassword = watch('password', '');

  // Password strength checker
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: '', color: '' };
    let score = 0;
    if (pwd.length >= 6) score++;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    
    if (score <= 2) return { score, label: 'Yếu', color: 'bg-red-500' };
    if (score <= 3) return { score, label: 'Trung bình', color: 'bg-yellow-500' };
    if (score <= 4) return { score, label: 'Mạnh', color: 'bg-emerald-500' };
    return { score, label: 'Rất mạnh', color: 'bg-teal-500' };
  };

  const passwordStrength = getPasswordStrength(watchedPassword);

  const onSubmit = async (data: RegisterForm) => {
    setIsLoading(true);
    try {
      const { confirmPassword, ...registerData } = data;
      const response = await authApi.register(registerData);
      const { user, token } = response.data.data;
      
      setAuth(user, token);
      toast.success('Đăng ký thành công!');
      router.push('/patient/dashboard');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Đăng ký thất bại');
    } finally {
      setIsLoading(false);
    }
  };

  const inputBaseClass = "w-full pl-12 pr-4 py-4 rounded-xl border-2 bg-gray-50 text-gray-900 placeholder-gray-400 transition-all duration-200 outline-none";
  const inputErrorClass = "border-red-300 focus:border-red-500 focus:bg-red-50/50";
  const inputNormalClass = "border-gray-100 focus:border-teal-500 focus:bg-white hover:border-gray-200";

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Decorative */}
      <div className="hidden lg:flex lg:w-2/5 relative overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-700 to-cyan-800">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute top-10 right-10 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-10 left-10 w-80 h-80 bg-teal-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/3 left-1/2 w-48 h-48 bg-emerald-300/10 rounded-full blur-2xl animate-float"></div>
        </div>

        {/* Dotted Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '32px 32px'
          }}></div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 text-white">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Heart className="w-7 h-7 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight">MediCare+</span>
            </div>
            
            <h1 className="text-4xl font-bold leading-tight mb-4">
              Bắt đầu hành trình<br />
              <span className="text-emerald-300">chăm sóc sức khỏe</span>
            </h1>
            <p className="text-lg text-white/80 leading-relaxed">
              Tạo tài khoản để trải nghiệm dịch vụ y tế hiện đại và tiện lợi.
            </p>
          </div>

          {/* Benefits */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <span className="text-white/90">Đặt lịch khám trực tuyến 24/7</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <span className="text-white/90">Quản lý hồ sơ bệnh án điện tử</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <span className="text-white/90">Nhắc lịch khám và uống thuốc</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <span className="text-white/90">Kết nối với bác sĩ chuyên khoa</span>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-12 flex gap-8">
            <div>
              <div className="text-3xl font-bold">500+</div>
              <div className="text-sm text-white/70">Bác sĩ</div>
            </div>
            <div>
              <div className="text-3xl font-bold">50K+</div>
              <div className="text-sm text-white/70">Bệnh nhân</div>
            </div>
            <div>
              <div className="text-3xl font-bold">4.9</div>
              <div className="text-sm text-white/70">Đánh giá</div>
            </div>
          </div>
        </div>

        {/* Decorative Circles */}
        <div className="absolute -bottom-20 -left-20 w-48 h-48 border border-white/20 rounded-full"></div>
        <div className="absolute -bottom-32 -left-32 w-72 h-72 border border-white/10 rounded-full"></div>
      </div>

      {/* Right Side - Register Form */}
      <div className="w-full lg:w-3/5 flex items-center justify-center p-6 sm:p-8 bg-gradient-to-br from-gray-50 to-gray-100 overflow-y-auto">
        <div className="w-full max-w-2xl">
          {/* Back to Login */}
          <Link href="/login" className="inline-flex items-center gap-2 text-gray-500 hover:text-teal-600 transition-colors mb-6 group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Quay lại đăng nhập</span>
          </Link>

          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-3xl font-bold text-gray-900">Tạo tài khoản mới</h2>
              <Sparkles className="w-6 h-6 text-yellow-500" />
            </div>
            <p className="text-gray-500">Điền thông tin để bắt đầu sử dụng hệ thống</p>
          </div>

          {/* Register Form Card */}
          <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 p-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Username */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">
                    Tên đăng nhập <span className="text-red-500">*</span>
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <User className="w-5 h-5 text-gray-400 group-focus-within:text-teal-500 transition-colors" />
                    </div>
                    <input
                      {...register('username', { 
                        required: 'Tên đăng nhập là bắt buộc',
                        minLength: {
                          value: 3,
                          message: 'Tên đăng nhập phải có ít nhất 3 ký tự'
                        }
                      })}
                      className={`${inputBaseClass} ${errors.username ? inputErrorClass : inputNormalClass}`}
                      placeholder="username"
                      disabled={isLoading}
                    />
                  </div>
                  {errors.username && (
                    <p className="text-sm text-red-500">{errors.username.message}</p>
                  )}
                </div>

                {/* Full Name */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">
                    Họ và tên <span className="text-red-500">*</span>
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <User className="w-5 h-5 text-gray-400 group-focus-within:text-teal-500 transition-colors" />
                    </div>
                    <input
                      {...register('fullName', { required: 'Họ và tên là bắt buộc' })}
                      className={`${inputBaseClass} ${errors.fullName ? inputErrorClass : inputNormalClass}`}
                      placeholder="Nguyễn Văn A"
                      disabled={isLoading}
                    />
                  </div>
                  {errors.fullName && (
                    <p className="text-sm text-red-500">{errors.fullName.message}</p>
                  )}
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail className="w-5 h-5 text-gray-400 group-focus-within:text-teal-500 transition-colors" />
                    </div>
                    <input
                      {...register('email', { 
                        required: 'Email là bắt buộc',
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: 'Email không hợp lệ'
                        }
                      })}
                      type="email"
                      className={`${inputBaseClass} ${errors.email ? inputErrorClass : inputNormalClass}`}
                      placeholder="email@example.com"
                      disabled={isLoading}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-sm text-red-500">{errors.email.message}</p>
                  )}
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">
                    Số điện thoại <span className="text-red-500">*</span>
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Phone className="w-5 h-5 text-gray-400 group-focus-within:text-teal-500 transition-colors" />
                    </div>
                    <input
                      {...register('phone', { 
                        required: 'Số điện thoại là bắt buộc',
                        pattern: {
                          value: /^[0-9]{10,11}$/,
                          message: 'Số điện thoại không hợp lệ'
                        }
                      })}
                      className={`${inputBaseClass} ${errors.phone ? inputErrorClass : inputNormalClass}`}
                      placeholder="0123456789"
                      disabled={isLoading}
                    />
                  </div>
                  {errors.phone && (
                    <p className="text-sm text-red-500">{errors.phone.message}</p>
                  )}
                </div>

                {/* Gender */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">
                    Giới tính
                  </label>
                  <div className="flex gap-3">
                    {[
                      { value: 'male', label: 'Nam', icon: '👨' },
                      { value: 'female', label: 'Nữ', icon: '👩' },
                      { value: 'other', label: 'Khác', icon: '🧑' }
                    ].map((option) => (
                      <label key={option.value} className="flex-1 cursor-pointer">
                        <input
                          type="radio"
                          {...register('gender')}
                          value={option.value}
                          className="sr-only peer"
                          defaultChecked={option.value === 'male'}
                          disabled={isLoading}
                        />
                        <div className="py-3 px-4 rounded-xl border-2 border-gray-100 bg-gray-50 text-center text-sm font-medium text-gray-600
                          peer-checked:border-teal-500 peer-checked:bg-teal-50 peer-checked:text-teal-700
                          hover:border-gray-200 transition-all">
                          <span className="mr-1">{option.icon}</span>
                          {option.label}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Spacer for grid alignment */}
                <div className="hidden md:block"></div>

                {/* Password */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">
                    Mật khẩu <span className="text-red-500">*</span>
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="w-5 h-5 text-gray-400 group-focus-within:text-teal-500 transition-colors" />
                    </div>
                    <input
                      {...register('password', { 
                        required: 'Mật khẩu là bắt buộc',
                        minLength: {
                          value: 6,
                          message: 'Mật khẩu phải có ít nhất 6 ký tự'
                        }
                      })}
                      type={showPassword ? 'text' : 'password'}
                      className={`${inputBaseClass} pr-12 ${errors.password ? inputErrorClass : inputNormalClass}`}
                      placeholder="••••••••"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {/* Password Strength */}
                  {watchedPassword && (
                    <div className="space-y-1">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((level) => (
                          <div
                            key={level}
                            className={`h-1 flex-1 rounded-full transition-all ${
                              level <= passwordStrength.score ? passwordStrength.color : 'bg-gray-200'
                            }`}
                          />
                        ))}
                      </div>
                      <p className={`text-xs font-medium ${
                        passwordStrength.score <= 2 ? 'text-red-500' : 
                        passwordStrength.score <= 3 ? 'text-yellow-600' : 'text-emerald-600'
                      }`}>
                        Độ mạnh: {passwordStrength.label}
                      </p>
                    </div>
                  )}
                  {errors.password && (
                    <p className="text-sm text-red-500">{errors.password.message}</p>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">
                    Xác nhận mật khẩu <span className="text-red-500">*</span>
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="w-5 h-5 text-gray-400 group-focus-within:text-teal-500 transition-colors" />
                    </div>
                    <input
                      {...register('confirmPassword', { 
                        required: 'Vui lòng xác nhận mật khẩu',
                        validate: value => value === password || 'Mật khẩu không khớp'
                      })}
                      type={showConfirmPassword ? 'text' : 'password'}
                      className={`${inputBaseClass} pr-12 ${errors.confirmPassword ? inputErrorClass : inputNormalClass}`}
                      placeholder="••••••••"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
                  )}
                </div>
              </div>

              {/* Terms */}
              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                <input 
                  type="checkbox" 
                  id="terms"
                  className="mt-1 w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500" 
                  required
                />
                <label htmlFor="terms" className="text-sm text-gray-600 cursor-pointer">
                  Tôi đồng ý với{' '}
                  <a href="#" className="text-teal-600 hover:underline font-medium">Điều khoản sử dụng</a>
                  {' '}và{' '}
                  <a href="#" className="text-teal-600 hover:underline font-medium">Chính sách bảo mật</a>
                  {' '}của MediCare+
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-semibold 
                  shadow-lg shadow-teal-500/30 hover:shadow-xl hover:shadow-teal-500/40 hover:from-teal-500 hover:to-emerald-500
                  transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none
                  flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Đang tạo tài khoản...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-5 h-5" />
                    <span>Tạo tài khoản</span>
                  </>
                )}
              </button>
            </form>

            {/* Login Link */}
            <div className="mt-6 text-center">
              <p className="text-gray-600">
                Đã có tài khoản?{' '}
                <Link href="/login" className="font-semibold text-teal-600 hover:text-teal-700 transition-colors">
                  Đăng nhập ngay
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Styles */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
        .animate-float {
          animation: float 8s ease-in-out infinite;
        }
        .delay-1000 {
          animation-delay: 1s;
        }
      `}</style>
    </div>
  );
}
