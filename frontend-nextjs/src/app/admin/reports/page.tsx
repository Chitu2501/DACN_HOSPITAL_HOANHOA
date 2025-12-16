'use client';

import { useState } from 'react';
import { AdminLayout } from '@/components/Layout/AdminLayout';
import { statisticsApi } from '@/lib/api';
import { toast } from 'react-hot-toast';
import {
  FileDown,
  FileText,
  Calendar,
  Users,
  DollarSign,
  Download,
  Loader2
} from 'lucide-react';

export default function ReportsPage() {
  const [isExporting, setIsExporting] = useState(false);
  const [exportConfig, setExportConfig] = useState({
    reportType: 'full',
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const response = await statisticsApi.exportReport(exportConfig);
      
      // Create blob from response
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `hospital-report-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Xuất báo cáo thành công!');
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error('Xuất báo cáo thất bại');
    } finally {
      setIsExporting(false);
    }
  };

  const reportTemplates = [
    {
      id: 'full',
      name: 'Báo cáo tổng hợp',
      description: 'Bao gồm thống kê người dùng và doanh thu',
      icon: FileText,
      color: 'bg-blue-500',
    },
    {
      id: 'users',
      name: 'Báo cáo người dùng',
      description: 'Danh sách và thống kê người dùng',
      icon: Users,
      color: 'bg-green-500',
    },
    {
      id: 'revenue',
      name: 'Báo cáo doanh thu',
      description: 'Chi tiết doanh thu và thanh toán',
      icon: DollarSign,
      color: 'bg-purple-500',
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header với gradient xanh lá */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 p-8 text-white">
          <div className="relative z-10">
            <h1 className="text-4xl font-bold mb-2">Báo cáo Excel 📊</h1>
            <p className="text-green-100">Xuất báo cáo chi tiết và thống kê dữ liệu</p>
          </div>
          <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full -mr-36 -mt-36"></div>
          <div className="absolute bottom-0 left-10 w-48 h-48 bg-white/10 rounded-full -mb-24"></div>
        </div>

        {/* Export Configuration */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Cấu hình báo cáo</h2>
          <p className="text-gray-600 mb-8">Chọn loại báo cáo và khoảng thời gian</p>
          
          <div className="space-y-6">
            {/* Report Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Loại báo cáo
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {reportTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => setExportConfig({ ...exportConfig, reportType: template.id })}
                    className={`p-6 rounded-2xl border-2 transition-all transform hover:scale-105 ${
                      exportConfig.reportType === template.id
                        ? 'border-emerald-600 bg-emerald-50 shadow-lg'
                        : 'border-gray-200 hover:border-emerald-300 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`${template.color} w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md`}>
                        <template.icon className="w-7 h-7 text-white" />
                      </div>
                      <div className="text-left flex-1">
                        <h3 className="font-bold text-gray-900 text-lg">{template.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Từ ngày
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="date"
                    value={exportConfig.startDate}
                    onChange={(e) => setExportConfig({ ...exportConfig, startDate: e.target.value })}
                    className="input pl-10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Đến ngày
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="date"
                    value={exportConfig.endDate}
                    onChange={(e) => setExportConfig({ ...exportConfig, endDate: e.target.value })}
                    className="input pl-10"
                  />
                </div>
              </div>
            </div>

            {/* Export Button */}
            <div className="flex justify-end pt-4 border-t">
              <button
                onClick={handleExportExcel}
                disabled={isExporting}
                className="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Đang xuất...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    Xuất báo cáo Excel
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Report Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileDown className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Định dạng file</h3>
                <p className="text-sm text-gray-600">
                  Báo cáo được xuất dưới định dạng Excel (.xlsx) với nhiều sheet dữ liệu.
                  File có thể mở bằng Microsoft Excel, Google Sheets, hoặc các ứng dụng tương tự.
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileText className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Nội dung báo cáo</h3>
                <p className="text-sm text-gray-600">
                  Báo cáo bao gồm thống kê chi tiết về người dùng, doanh thu, lịch hẹn,
                  và các chỉ số quan trọng khác trong khoảng thời gian đã chọn.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Mẫu báo cáo</h3>
          <div className="prose prose-sm max-w-none text-gray-600">
            <p>Báo cáo Excel bao gồm các sheet sau:</p>
            <ul>
              <li>
                <strong>User Statistics:</strong> Danh sách người dùng với thông tin chi tiết,
                phân loại theo vai trò và trạng thái.
              </li>
              <li>
                <strong>Revenue Report:</strong> Chi tiết doanh thu từ các lịch hẹn,
                bao gồm thông tin bệnh nhân, bác sĩ, phí khám và trạng thái thanh toán.
              </li>
              <li>
                <strong>Summary:</strong> Tổng hợp các chỉ số quan trọng như tổng doanh thu,
                số lượng lịch hẹn, doanh thu trung bình.
              </li>
            </ul>
            <p className="mt-4">
              💡 <strong>Mẹo:</strong> Bạn có thể sử dụng các tính năng của Excel như filter,
              pivot table, và charts để phân tích sâu hơn dữ liệu sau khi xuất.
            </p>
          </div>
        </div>

        {/* Recent Exports Log (Optional) */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Hướng dẫn sử dụng</h3>
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                <span className="text-primary-600 font-semibold">1</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Chọn loại báo cáo</p>
                <p className="text-sm text-gray-600">Chọn một trong ba loại báo cáo có sẵn</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                <span className="text-primary-600 font-semibold">2</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Chọn khoảng thời gian</p>
                <p className="text-sm text-gray-600">Thiết lập ngày bắt đầu và kết thúc</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                <span className="text-primary-600 font-semibold">3</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Xuất báo cáo</p>
                <p className="text-sm text-gray-600">Nhấn nút "Xuất báo cáo Excel" và file sẽ tự động tải xuống</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

