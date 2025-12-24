'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { LogIn, Mail, Lock, Eye, EyeOff, Heart, Shield, Clock, Users } from 'lucide-react';

interface LoginForm {
  email: string;
  password: string;
}

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    console.log('=== LOGIN FORM SUBMITTED ===');
    console.log('Form Data:', data);
    setIsLoading(true);
    try {
      console.log('Calling authApi.login...');
      const response = await authApi.login(data.email, data.password);
      console.log('Login Response:', response);
      
      // Handle different response structures
      let user, token;
      if (response.data?.data) {
        // Standard structure: response.data.data
        user = response.data.data.user;
        token = response.data.data.token;
      } else if (response.data?.user) {
        // Alternative structure: response.data.user
        user = response.data.user;
        token = response.data.token;
      } else {
        throw new Error('Invalid response structure');
      }
      
      if (!user || !token) {
        throw new Error('Missing user or token in response');
      }
      
      console.log('Setting auth...', { user, token });
      setAuth(user, token);
      
      // Verify token was saved
      const savedToken = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');
      console.log('✅ Auth saved:', { 
        tokenSaved: !!savedToken, 
        userSaved: !!savedUser,
        tokenLength: savedToken?.length 
      });
      
      // Wait a bit to ensure state is set
      await new Promise(resolve => setTimeout(resolve, 200));
      
      toast.success('Đăng nhập thành công!');
      
      // Redirect based on role
      console.log('Redirecting based on role:', user.role);
      if (user.role === 'admin') {
        router.push('/admin/dashboard');
      } else if (user.role === 'doctor') {
        router.push('/doctor/dashboard');
      } else if (user.role === 'nurse') {
        router.push('/nurse/dashboard');
      } else if (user.role === 'patient') {
        router.push('/patient/dashboard');
      } else {
        router.push('/login');
      }
    } catch (error: any) {
      console.error('Login Error:', error);
      console.error('Error Response:', error.response);
      console.error('Error Details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url
      });
      
      // Hiển thị thông báo lỗi chi tiết hơn
      let errorMessage = 'Đăng nhập thất bại';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      } else if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
        errorMessage = 'Không thể kết nối đến server. Vui lòng kiểm tra backend server có đang chạy không.';
      }
      
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Decorative */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-800">
        {/* Animated Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-emerald-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-teal-300/10 rounded-full blur-2xl animate-bounce-slow"></div>
        </div>
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }}></div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Heart className="w-8 h-8 text-white" />
              </div>
              <span className="text-2xl font-bold tracking-tight">Hoàn Hảo Hospital</span>
            </div>
            <h1 className="text-5xl font-bold leading-tight mb-6">
              Chăm sóc sức khỏe<br />
              <span className="text-emerald-300">toàn diện</span>
            </h1>
            <p className="text-xl text-white/80 leading-relaxed max-w-md">
              Hệ thống quản lý y tế thông minh, giúp kết nối bệnh nhân với đội ngũ y bác sĩ chuyên nghiệp.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-4 mt-8">
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/10 backdrop-blur-sm">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold">Bảo mật cao</h3>
                <p className="text-sm text-white/70">Dữ liệu được mã hóa và bảo vệ</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/10 backdrop-blur-sm">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold">Đặt lịch nhanh chóng</h3>
                <p className="text-sm text-white/70">Tiết kiệm thời gian chờ đợi</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/10 backdrop-blur-sm">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold">Đội ngũ chuyên gia</h3>
                <p className="text-sm text-white/70">Hơn 500+ bác sĩ hàng đầu</p>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative Shapes */}
        <div className="absolute -bottom-32 -left-32 w-64 h-64 border border-white/20 rounded-full"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 border border-white/10 rounded-full"></div>
        <div className="absolute -top-20 -right-20 w-40 h-40 border border-white/20 rounded-full"></div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center">
                <Heart className="w-7 h-7 text-white" />
              </div>
              <span className="text-2xl font-bold text-gray-900">MediCare+</span>
            </div>
          </div>

          {/* Welcome Text */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Chào mừng trở lại!</h2>
            <p className="text-gray-500">Đăng nhập để tiếp tục sử dụng hệ thống</p>
          </div>

          {/* Login Form Card */}
          <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Email Field */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">
                Email
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
                    className={`w-full pl-12 pr-4 py-4 rounded-xl border-2 bg-gray-50 text-gray-900 placeholder-gray-400 transition-all duration-200 outline-none
                      ${errors.email 
                        ? 'border-red-300 focus:border-red-500 focus:bg-red-50/50' 
                        : 'border-gray-100 focus:border-teal-500 focus:bg-white hover:border-gray-200'
                      }`}
                  placeholder="your.email@example.com"
                  disabled={isLoading}
                />
              </div>
              {errors.email && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <span className="inline-block w-1 h-1 rounded-full bg-red-500"></span>
                    {errors.email.message}
                  </p>
              )}
            </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">
                Mật khẩu
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
                    className={`w-full pl-12 pr-12 py-4 rounded-xl border-2 bg-gray-50 text-gray-900 placeholder-gray-400 transition-all duration-200 outline-none
                      ${errors.password 
                        ? 'border-red-300 focus:border-red-500 focus:bg-red-50/50' 
                        : 'border-gray-100 focus:border-teal-500 focus:bg-white hover:border-gray-200'
                      }`}
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
              {errors.password && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <span className="inline-block w-1 h-1 rounded-full bg-red-500"></span>
                    {errors.password.message}
                  </p>
              )}
            </div>

              {/* Remember & Forgot */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500" />
                  <span className="text-sm text-gray-600">Ghi nhớ đăng nhập</span>
                </label>
                <a href="#" className="text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors">
                  Quên mật khẩu?
                </a>
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
                    <span>Đang đăng nhập...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                    <span>Đăng nhập</span>
                </>
              )}
            </button>
          </form>

            {/* Divider */}
            <div className="my-8 flex items-center gap-4">
              <div className="flex-1 h-px bg-gray-200"></div>
              <span className="text-sm text-gray-400">hoặc</span>
              <div className="flex-1 h-px bg-gray-200"></div>
            </div>

          {/* Register Link */}
            <p className="text-center text-gray-600">
              Chưa có tài khoản?{' '}
              <Link href="/register" className="font-semibold text-teal-600 hover:text-teal-700 transition-colors">
                Đăng ký ngay
              </Link>
            </p>
        </div>

        {/* Demo Credentials */}
          <div className="mt-6 p-5 bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <p className="text-xs font-semibold text-gray-700">MOCK MODE - Tài khoản demo</p>
            </div>
            <div className="space-y-2 text-xs text-gray-600">
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">Admin</span>
                <span className="text-gray-500">admin@hospital.com / admin123456</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded font-medium">Bác sĩ</span>
                <span className="text-gray-500">bsnguyen@hospital.com / doctor123</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded font-medium">Bệnh nhân</span>
                <span className="text-gray-500">patient1@email.com / patient123</span>
              </div>
          </div>
          </div>
        </div>
      </div>

      {/* Custom Styles */}
      <style jsx>{`
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 6s ease-in-out infinite;
        }
        .delay-1000 {
          animation-delay: 1s;
        }
      `}</style>
    </div>
  );
}
