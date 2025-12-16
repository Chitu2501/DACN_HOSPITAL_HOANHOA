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
  Clock,
  Search,
  Settings,
  ChevronRight,
  Sparkles,
  Heart,
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  { 
    name: 'Tổng quan', 
    href: '/doctor/dashboard', 
    icon: LayoutDashboard,
    gradient: 'from-violet-500 to-purple-600'
  },
  { 
    name: 'Lịch khám', 
    href: '/doctor/appointments', 
    icon: Calendar,
    gradient: 'from-cyan-500 to-blue-600'
  },
  { 
    name: 'Hồ sơ bệnh án', 
    href: '/doctor/medical-records', 
    icon: FileText,
    gradient: 'from-emerald-500 to-teal-600'
  },
  { 
    name: 'Lịch làm việc', 
    href: '/doctor/schedule', 
    icon: Clock,
    gradient: 'from-orange-500 to-red-600'
  },
  { 
    name: 'Hồ sơ cá nhân', 
    href: '/doctor/profile', 
    icon: User,
    gradient: 'from-pink-500 to-rose-600'
  },
];

export function DoctorLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  useEffect(() => {
    const tick = () => setCurrentTime(new Date());
    tick();
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
    const hour = currentTime?.getHours() ?? 9;
    if (hour < 12) return 'Chào buổi sáng';
    if (hour < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 overflow-x-hidden">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 z-50 h-full w-72 transition-all duration-500 lg:translate-x-0",
        "bg-white border-r border-slate-200 shadow-sm",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Logo */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-md shadow-cyan-500/30">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 text-lg tracking-tight">MediCare+</h1>
              <p className="text-xs text-slate-500">Doctor Portal</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="px-4 py-6 space-y-2">
          {navigation.map((item, index) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "group relative flex items-center gap-3 px-4 py-3.5 rounded-xl font-medium transition-all duration-300",
                  isActive
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Active Indicator */}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full bg-cyan-500" />
                )}
                
                {/* Icon with Gradient Background */}
                <div className={cn(
                  "w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-300 border",
                  isActive 
                    ? "border-cyan-200 bg-cyan-50 text-cyan-700 shadow-sm" 
                    : "border-slate-200 bg-white text-slate-500 group-hover:border-cyan-200 group-hover:text-cyan-700"
                )}>
                  <item.icon className="w-5 h-5" />
                </div>
                
                <span className="flex-1">{item.name}</span>
                
                {isActive && (
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Promo Card */}
        <div className="mx-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-violet-500" />
            <span className="text-sm font-semibold text-slate-800">Pro Features</span>
          </div>
          <p className="text-xs text-slate-600 mb-3">Nâng cấp để mở khóa tất cả tính năng cao cấp</p>
          <button className="w-full py-2 px-4 bg-gradient-to-r from-violet-500 to-indigo-500 rounded-lg text-sm font-medium text-white hover:from-violet-400 hover:to-indigo-400 transition-all shadow-sm">
            Nâng cấp ngay
          </button>
        </div>

        {/* User Info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200 bg-white">
          <div className="flex items-center gap-3 mb-3">
            <div className="relative">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white">
                <span className="font-bold">
                  {user?.fullName?.charAt(0) || 'D'}
                </span>
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{user?.fullName || 'Bác sĩ'}</p>
              <p className="text-xs text-slate-600 truncate">{user?.specialization || 'Chuyên khoa'}</p>
            </div>
            <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <Settings className="w-5 h-5 text-slate-500" />
            </button>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-72 relative z-10">
        {/* Top bar */}
        <header className={cn(
          "sticky top-0 z-30 transition-all duration-300 border-b border-slate-200 bg-white/90 backdrop-blur",
          scrolled ? "shadow-sm" : ""
        )}>
          <div className="h-20 px-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2.5 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <Menu className="w-6 h-6 text-slate-700" />
              </button>
              
              <div className="hidden sm:block">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-900">
                    {getGreeting()}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-blue-600">{user?.fullName?.split(' ').pop() || 'Bác sĩ'}!</span>
                  </h2>
                  <span className="text-2xl animate-wave">👋</span>
                </div>
                <p className="text-sm text-slate-600 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {currentTime
                    ? currentTime.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                    : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="hidden md:flex items-center gap-2 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                <Search className="w-4 h-4 text-slate-500" />
                <input 
                  type="text" 
                  placeholder="Tìm kiếm..." 
                  className="bg-transparent text-sm text-slate-800 placeholder-slate-500 outline-none w-40"
                />
                <kbd className="px-2 py-0.5 text-xs bg-slate-100 rounded text-slate-600">⌘K</kbd>
              </div>

              {/* Live Time */}
              <div className="hidden sm:flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 rounded-xl">
                <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                <span className="text-sm font-mono text-cyan-700">
                  {currentTime
                    ? currentTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                    : '--:--:--'}
                </span>
              </div>
              
              {/* Notifications */}
              <button className="relative p-2.5 hover:bg-slate-100 rounded-xl transition-colors group">
                <Bell className="w-5 h-5 text-slate-500 group-hover:text-slate-800 transition-colors" />
                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse" />
              </button>

              {/* Activity Status */}
              <div className="hidden lg:flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl">
                <Activity className="w-4 h-4 text-emerald-600 animate-pulse" />
                <span className="text-xs font-medium text-emerald-700">Trực tuyến</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6 min-h-[calc(100vh-80px)]">
          {children}
        </main>

        {/* Footer */}
        <footer className="px-6 py-4 border-t border-slate-200 bg-white/70">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-600">
            <p>© 2024 MediCare+ Healthcare System. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <a href="#" className="hover:text-slate-900 transition-colors">Hỗ trợ</a>
              <a href="#" className="hover:text-slate-900 transition-colors">Điều khoản</a>
              <a href="#" className="hover:text-slate-900 transition-colors">Bảo mật</a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
