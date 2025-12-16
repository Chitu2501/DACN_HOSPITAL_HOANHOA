'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import {
  LayoutDashboard,
  Calendar,
  FileText,
  User,
  LogOut,
  Menu,
  X,
  Bell,
  Settings,
  ChevronRight,
  Heart,
  CreditCard,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Tổng quan', href: '/patient/dashboard', icon: LayoutDashboard },
  { name: 'Đặt lịch khám', href: '/patient/appointments', icon: Calendar },
  { name: 'Lịch sử khám', href: '/patient/history', icon: Clock },
  { name: 'Hồ sơ bệnh án', href: '/patient/medical-records', icon: FileText },
  { name: 'Thanh toán', href: '/patient/payments', icon: CreditCard },
  { name: 'Hồ sơ cá nhân', href: '/patient/profile', icon: User },
];

export function PatientLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isAuthenticated, initialize, initialized } = useAuthStore();

  useEffect(() => {
    if (!initialized) {
      initialize();
    }
  }, [initialize, initialized]);

  useEffect(() => {
    if (pathname === '/login' || pathname === '/register') {
      return;
    }
    if (!initialized) return;
    if (isAuthenticated && user && user.role === 'patient') return;

    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      if (!token || !userStr) {
        router.push('/login');
        return;
      }
      try {
        const parsedUser = JSON.parse(userStr);
        if (parsedUser.role !== 'patient') {
          router.push('/login');
        }
      } catch (e) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
      }
    }
  }, [isAuthenticated, user, initialized, pathname, router]);

  useEffect(() => {
    // Chỉ set thời gian trên client để tránh hydration error
    const tick = () => setCurrentTime(new Date());
    tick(); // Set ngay lập tức khi component mount trên client
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const getGreeting = () => {
    const hour = currentTime?.getHours() ?? 9; // Default 9 giờ nếu chưa có thời gian
    if (hour < 12) return 'Chào buổi sáng';
    if (hour < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-x-hidden">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={cn(
        'fixed top-0 left-0 z-50 h-full w-64 transition-transform duration-300 lg:translate-x-0',
        'bg-white border-r border-gray-200',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center">
              <Heart className="w-5 h-5 text-gray-900" />
            </div>
            <div>
              <h1 className="font-semibold text-gray-900 text-base">MediCare+</h1>
              <p className="text-xs text-gray-500">Patient Portal</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 hover:bg-gray-100 rounded"
            aria-label="Đóng menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="px-3 py-4 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100'
                )}
              >
                <div
                  className={cn(
                    'w-9 h-9 rounded border border-gray-300 flex items-center justify-center',
                    isActive ? 'bg-gray-800 text-white' : 'bg-white text-gray-700'
                  )}
                >
                  <item.icon className="w-5 h-5" />
                </div>
                <span className="flex-1">{item.name}</span>
                {isActive && <ChevronRight className="w-4 h-4" />}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center">
              <span className="text-sm font-semibold">
                {user?.fullName?.charAt(0) || 'P'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {user?.fullName || 'Bệnh nhân'}
              </p>
              <p className="text-xs text-gray-500 truncate">{user?.email || 'Email'}</p>
            </div>
            <button className="p-2 rounded hover:bg-gray-100" aria-label="Cài đặt">
              <Settings className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-800 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium"
          >
            <LogOut className="w-4 h-4" />
            Đăng xuất
          </button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header
          className={cn(
            'sticky top-0 z-30 bg-white border-b border-gray-200',
            scrolled ? 'shadow-sm' : ''
          )}
        >
          <div className="h-16 px-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded"
                aria-label="Mở menu"
              >
                <Menu className="w-5 h-5 text-gray-800" />
              </button>

              <div className="hidden sm:block">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {getGreeting()}, {user?.fullName?.split(' ').pop() || 'Bệnh nhân'}
                  </h2>
                  <span className="text-xl">👋</span>
                </div>
                <p className="text-sm text-gray-600 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-700" />
                  {currentTime
                    ? currentTime.toLocaleDateString('vi-VN', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })
                    : 'Đang tải...'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg bg-white">
                <div className="w-2 h-2 rounded-full bg-green-600" />
                <span className="text-sm font-mono text-gray-800">
                  {currentTime
                    ? currentTime.toLocaleTimeString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })
                    : '--:--:--'}
                </span>
              </div>

              <button className="relative p-2 hover:bg-gray-100 rounded" aria-label="Thông báo">
                <Bell className="w-5 h-5 text-gray-700" />
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
              </button>
            </div>
          </div>
        </header>

        <main className="p-4 lg:p-6 min-h-[calc(100vh-64px)] bg-white">
          {children}
        </main>

        <footer className="px-4 lg:px-6 py-4 border-t border-gray-200 bg-white">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-600">
            <p>© 2024 MediCare+ Healthcare System.</p>
            <div className="flex items-center gap-4">
              <a href="#" className="hover:text-gray-900">
                Hỗ trợ
              </a>
              <a href="#" className="hover:text-gray-900">
                Điều khoản
              </a>
              <a href="#" className="hover:text-gray-900">
                Bảo mật
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

