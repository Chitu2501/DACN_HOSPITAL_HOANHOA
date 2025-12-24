'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import {
  Heart,
  Calendar,
  Clock,
  Shield,
  Users,
  Stethoscope,
  FileText,
  Bell,
  CheckCircle2,
  ArrowRight,
  Activity,
  Phone,
  Mail,
  MapPin,
  GraduationCap,
  Award,
  Building2,
  ChevronDown,
  ChevronUp,
  Star,
  Thermometer,
  Syringe,
  HeartPulse,
  Microscope,
  Pill,
  Baby,
  Eye,
  Bone
} from 'lucide-react';

// Counter Hook for animated numbers
function useCounter(end: number, duration: number = 2000, start: number = 0) {
  const [count, setCount] = useState(start);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!isVisible) return;

    let startTime: number;
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      setCount(Math.floor(progress * (end - start) + start));
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [end, duration, start, isVisible]);

  return { count, setIsVisible };
}

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, user, setAuth, initialize } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initialize();
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      if (token && userStr) {
        try {
          const user = JSON.parse(userStr);
          setAuth(user, token);
        } catch (e) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
    }
    setIsLoading(false);
  }, [initialize, setAuth]);

  useEffect(() => {
    if (isAuthenticated && user && !isLoading) {
      if (user.role === 'admin') router.push('/admin/dashboard');
      else if (user.role === 'doctor') router.push('/doctor/dashboard');
      else if (user.role === 'nurse') router.push('/nurse/dashboard');
      else router.push('/patient/dashboard');
    }
  }, [isAuthenticated, user, router, isLoading]);

  if (isLoading || isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sky-50 to-white">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-sky-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600">{isLoading ? 'Đang tải...' : 'Đang chuyển hướng...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/30">
                <Heart className="w-7 h-7 text-white" />
              </div>
              <div>
                <span className="text-xl font-bold text-gray-900">Hoàn Hảo</span>
                <span className="text-xs text-sky-600 block -mt-1">Hospital</span>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-8">
              <a href="#services" className="text-gray-600 hover:text-sky-600 transition-colors font-medium">Dịch vụ</a>
              <a href="#doctors" className="text-gray-600 hover:text-sky-600 transition-colors font-medium">Bác sĩ</a>
              <a href="#faq" className="text-gray-600 hover:text-sky-600 transition-colors font-medium">Hỏi đáp</a>
            </div>

            <div className="flex items-center gap-3">
              <Link href="/login" className="px-5 py-2.5 text-gray-700 font-medium hover:text-sky-600 transition-colors">
                Đăng nhập
              </Link>
              <Link href="/register" className="px-6 py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 text-white font-semibold rounded-xl shadow-lg shadow-sky-500/30 hover:shadow-xl hover:shadow-sky-500/40 transform hover:-translate-y-0.5 transition-all">
                Đăng ký
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-50 via-white to-blue-50"></div>
        <div className="absolute top-20 right-0 w-[600px] h-[600px] bg-sky-100/50 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-100/50 rounded-full blur-3xl"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-sky-100 border border-sky-200 rounded-full text-sm font-medium text-sky-700 mb-8">
              <HeartPulse className="w-4 h-4" />
              <span>Bệnh viện Đa khoa Hoàn Hảo</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
              Trao Hy Vọng
              <br />
              <span className="bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent">
                Bằng Cả Trái Tim
              </span>
            </h1>

            <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              Chung tay chăm sóc sức khỏe gia đình bạn với đội ngũ y bác sĩ chuyên nghiệp và hệ thống đặt lịch khám thông minh.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Link href="/register" className="group px-8 py-4 bg-gradient-to-r from-sky-500 to-blue-600 text-white font-semibold rounded-2xl shadow-xl shadow-sky-500/30 hover:shadow-2xl hover:shadow-sky-500/40 transform hover:-translate-y-1 transition-all flex items-center justify-center gap-2 text-lg">
                <Calendar className="w-5 h-5" />
                <span>Đặt lịch khám ngay</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a href="#services" className="px-8 py-4 bg-white text-gray-700 font-semibold rounded-2xl border-2 border-gray-200 hover:border-sky-300 hover:bg-sky-50 transform hover:-translate-y-1 transition-all flex items-center justify-center gap-2 text-lg shadow-lg">
                <span>Xem dịch vụ</span>
              </a>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { icon: Users, value: '50+', label: 'Bác sĩ chuyên khoa' },
                { icon: Heart, value: '10K+', label: 'Bệnh nhân tin tưởng' },
                { icon: Award, value: '15+', label: 'Năm kinh nghiệm' },
                { icon: Star, value: '4.9', label: 'Đánh giá trung bình' },
              ].map((stat, i) => (
                <div key={i} className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100">
                  <stat.icon className="w-8 h-8 text-sky-500 mx-auto mb-3" />
                  <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                  <div className="text-sm text-gray-600">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-sky-100 rounded-full text-sm font-medium text-sky-700 mb-4">
              <Stethoscope className="w-4 h-4" />
              <span>Dịch vụ y tế</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Gói khám sức khỏe <span className="text-sky-600">toàn diện</span>
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Được xây dựng theo nguyên tắc khoa học, hiệu quả và tiết kiệm chi phí cho khách hàng
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: HeartPulse, name: 'Khám Tổng Quát', desc: 'Kiểm tra sức khỏe định kỳ toàn diện', color: 'from-red-500 to-pink-500' },
              { icon: Microscope, name: 'Xét Nghiệm', desc: 'Xét nghiệm máu, nước tiểu, sinh hóa', color: 'from-purple-500 to-indigo-500' },
              { icon: Eye, name: 'Khám Chuyên Khoa', desc: 'Mắt, Tai mũi họng, Da liễu, Nhi', color: 'from-sky-500 to-blue-500' },
              { icon: Baby, name: 'Sản Phụ Khoa', desc: 'Chăm sóc thai sản và sức khỏe phụ nữ', color: 'from-emerald-500 to-teal-500' },
              { icon: Bone, name: 'Cơ Xương Khớp', desc: 'Chẩn đoán và điều trị xương khớp', color: 'from-orange-500 to-amber-500' },
              { icon: Thermometer, name: 'Nội Khoa', desc: 'Tim mạch, Tiêu hóa, Nội tiết', color: 'from-cyan-500 to-sky-500' },
              { icon: Syringe, name: 'Tiêm Chủng', desc: 'Vắc xin cho trẻ em và người lớn', color: 'from-green-500 to-emerald-500' },
              { icon: Pill, name: 'Dược Phẩm', desc: 'Nhà thuốc đạt chuẩn GPP', color: 'from-blue-500 to-indigo-500' },
            ].map((service, i) => (
              <div key={i} className="group bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-sky-200 transform hover:-translate-y-1">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${service.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform shadow-lg`}>
                  <service.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{service.name}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{service.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link href="/register" className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-sky-500 to-blue-600 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all">
              <Calendar className="w-5 h-5" />
              <span>Đặt lịch khám ngay</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <StatisticsSection />

      {/* Doctors Section */}
      <DoctorsSection />

      {/* FAQ Section */}
      <FAQSection />

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-sky-600 via-blue-600 to-indigo-700 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
        </div>

        <div className="max-w-4xl mx-auto text-center px-4 relative z-10">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
            Sẵn sàng chăm sóc sức khỏe của bạn?
          </h2>
          <p className="text-xl text-white/90 mb-10">
            Đăng ký tài khoản miễn phí và đặt lịch khám ngay hôm nay
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register" className="px-8 py-4 bg-white text-sky-600 font-semibold rounded-2xl shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all flex items-center justify-center gap-2 text-lg">
              <span>Đăng ký miễn phí</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
            <a href="tel:0828845959" className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white font-semibold rounded-2xl border-2 border-white/30 hover:bg-white/20 transform hover:-translate-y-1 transition-all flex items-center justify-center gap-2 text-lg">
              <Phone className="w-5 h-5" />
              <span>Hotline: 082 884 5959</span>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center">
                  <Heart className="w-7 h-7 text-white" />
                </div>
                <div>
                  <span className="text-xl font-bold text-white">Hoàn Hảo</span>
                  <span className="text-xs text-sky-400 block">Hospital</span>
                </div>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed">
                Bệnh viện Đa khoa Hoàn Hảo - Trao hy vọng bằng cả trái tim. Chung tay chăm sóc sức khỏe gia đình bạn.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Dịch vụ</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="#" className="hover:text-sky-400 transition-colors">Đặt lịch khám</a></li>
                <li><a href="#" className="hover:text-sky-400 transition-colors">Gói khám sức khỏe</a></li>
                <li><a href="#" className="hover:text-sky-400 transition-colors">Xét nghiệm</a></li>
                <li><a href="#" className="hover:text-sky-400 transition-colors">Tiêm chủng</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Chuyên khoa</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="#" className="hover:text-sky-400 transition-colors">Nội khoa</a></li>
                <li><a href="#" className="hover:text-sky-400 transition-colors">Ngoại khoa</a></li>
                <li><a href="#" className="hover:text-sky-400 transition-colors">Sản phụ khoa</a></li>
                <li><a href="#" className="hover:text-sky-400 transition-colors">Nhi khoa</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Liên hệ</h4>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-3">
                  <Phone className="w-4 h-4 mt-0.5 text-sky-400" />
                  <div>
                    <div>Hotline: 082 884 5959</div>
                    <div>Cấp cứu: (0274) 730 6411</div>
                  </div>
                </li>
                <li className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-sky-400" />
                  <span>support@hoanhao-hospital.com</span>
                </li>
                <li className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 mt-0.5 text-sky-400" />
                  <span>26/14 KP Bình Đường 2, P. An Bình, Dĩ An, Bình Dương</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-500">
              © 2024 Bệnh viện Hoàn Hảo. Bảo lưu mọi quyền.
            </p>
            <div className="flex items-center gap-6 text-sm text-gray-500">
              <a href="#" className="hover:text-sky-400 transition-colors">Chính sách bảo mật</a>
              <a href="#" className="hover:text-sky-400 transition-colors">Điều khoản sử dụng</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Statistics Section Component
function StatisticsSection() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold: 0.3 }
    );
    const el = document.getElementById('stats-section');
    if (el) observer.observe(el);
    return () => { if (el) observer.unobserve(el); };
  }, []);

  const stats = [
    { value: 2500, suffix: '+', label: 'Ca phẫu thuật/năm', icon: Activity },
    { value: 17000, suffix: '+', label: 'Điều trị sức khỏe', icon: HeartPulse },
    { value: 97, suffix: '%', label: 'Khách hàng hài lòng', icon: Star },
    { value: 1000000, suffix: '+', label: 'Bệnh nhân phục vụ', icon: Users },
  ];

  return (
    <section id="stats-section" className="py-20 bg-gradient-to-br from-sky-600 to-blue-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <div key={i} className="text-center">
              <stat.icon className="w-10 h-10 text-sky-200 mx-auto mb-4" />
              <div className="text-4xl lg:text-5xl font-bold text-white mb-2">
                {isVisible ? <CountUp end={stat.value} /> : 0}{stat.suffix}
              </div>
              <div className="text-sky-200 font-medium">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// CountUp Component
function CountUp({ end }: { end: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const increment = end / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [end]);

  return <>{count.toLocaleString()}</>;
}

// Doctors Section Component
function DoctorsSection() {
  const { data: doctorsResponse, isLoading } = useQuery({
    queryKey: ['public-doctors'],
    queryFn: async () => {
      try {
        const res = await api.get('/patient/doctors');
        return res.data;
      } catch (err) {
        return { success: false, data: [] };
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const doctors = doctorsResponse?.data || [];
  const hasDoctors = doctors.length > 0;

  return (
    <section id="doctors" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-sky-100 rounded-full text-sm font-medium text-sky-700 mb-4">
            <Stethoscope className="w-4 h-4" />
            <span>Đội ngũ chuyên gia</span>
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            Bác sĩ <span className="text-sky-600">tận tâm</span>
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Đội ngũ y bác sĩ giàu kinh nghiệm, được đào tạo bài bản
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-sky-600 border-t-transparent"></div>
          </div>
        ) : hasDoctors ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {doctors.slice(0, 8).map((doctor: any) => (
              <div key={doctor.id || doctor._id} className="group bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all border border-gray-100 hover:border-sky-200 transform hover:-translate-y-1">
                <div className="relative mb-5">
                  {doctor.avatar_url ? (
                    <img
                      src={doctor.avatar_url.startsWith('http') ? doctor.avatar_url : `http://localhost:5000${doctor.avatar_url}`}
                      alt={doctor.fullName || 'Bác sĩ'}
                      className="w-24 h-24 rounded-full object-cover mx-auto border-4 border-sky-100 shadow-lg"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-white text-3xl font-bold mx-auto shadow-lg">
                      {doctor.fullName?.charAt(0) || 'BS'}
                    </div>
                  )}
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-emerald-500 border-4 border-white flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div className="text-center">
                  <h3 className="font-bold text-gray-900 mb-1">{doctor.fullName || doctor.ten_bac_si}</h3>
                  <div className="flex items-center justify-center gap-1 text-sm text-sky-600 font-medium mb-1">
                    <GraduationCap className="w-4 h-4" />
                    <span>{doctor.specialization || doctor.chuyen_khoa || 'Chuyên khoa'}</span>
                  </div>
                  {doctor.department && (
                    <div className="flex items-center justify-center gap-1 text-xs text-gray-500">
                      <Building2 className="w-3 h-3" />
                      <span>{doctor.department}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-gray-50 rounded-2xl">
            <Stethoscope className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Đăng nhập để xem thông tin bác sĩ</p>
          </div>
        )}

        {hasDoctors && (
          <div className="text-center mt-12">
            <Link href="/register" className="inline-flex items-center gap-2 px-6 py-3 bg-white text-sky-600 font-semibold rounded-xl border-2 border-sky-200 hover:border-sky-300 hover:bg-sky-50 transition-all">
              <span>Xem thêm bác sĩ</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

// FAQ Section Component
function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    { q: 'Thời gian làm việc của bệnh viện?', a: 'Khám bệnh: 7h - 20h từ Thứ Hai đến Chủ Nhật. Cấp cứu: 24/24.' },
    { q: 'Làm thế nào để đặt lịch khám?', a: 'Bạn có thể đăng ký tài khoản trên website, sau đó chọn bác sĩ và thời gian phù hợp để đặt lịch trực tuyến.' },
    { q: 'Bệnh viện có khám bệnh tại nhà không?', a: 'Có, bệnh viện cung cấp dịch vụ khám tại nhà, lấy mẫu xét nghiệm và vận chuyển bệnh nhân. Liên hệ hotline 082 884 5959.' },
    { q: 'Phương thức thanh toán được chấp nhận?', a: 'Bệnh viện chấp nhận thanh toán bằng tiền mặt, chuyển khoản, thẻ tín dụng và ví điện tử (MoMo, ZaloPay).' },
    { q: 'Bệnh viện có hỗ trợ bảo hiểm y tế không?', a: 'Có, bệnh viện hỗ trợ thanh toán bằng thẻ BHYT theo quy định của Bộ Y tế.' },
  ];

  return (
    <section id="faq" className="py-20 bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Câu hỏi thường gặp</h2>
          <p className="text-gray-600">Giải đáp những thắc mắc phổ biến của khách hàng</p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 transition-colors"
              >
                <span className="font-semibold text-gray-900">{faq.q}</span>
                {openIndex === i ? <ChevronUp className="w-5 h-5 text-sky-600" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
              </button>
              {openIndex === i && (
                <div className="px-6 pb-6 text-gray-600 leading-relaxed">{faq.a}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
