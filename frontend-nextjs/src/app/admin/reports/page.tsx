'use client';

import { useState } from 'react';
import { AdminLayout } from '@/components/Layout/AdminLayout';
import { statisticsApi } from '@/lib/api';
import { toast } from 'react-hot-toast';
import {
  FileSpreadsheet,
  Calendar,
  Users,
  DollarSign,
  Download,
  Loader2,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  CheckCircle
} from 'lucide-react';

interface PreviewData {
  reportType: string;
  users?: {
    data: any[];
    total: number;
    columns: string[];
    byRole?: { role: string; count: number }[];
  };
  revenue?: {
    data: any[];
    total: number;
    grandTotal: number;
    totalTransactions: number;
    avgPerTransaction: number;
    columns: string[];
  };
}

export default function ReportsPage() {
  const [isExporting, setIsExporting] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [previewPage, setPreviewPage] = useState(1);
  const pageSize = 10;

  const [reportType, setReportType] = useState('users');
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  const handlePreview = async () => {
    setIsPreviewing(true);
    try {
      const response = await statisticsApi.previewReport({ reportType, startDate, endDate });
      if (response.data?.success) {
        setPreviewData(response.data.data);
        setPreviewPage(1);
        setShowPreviewModal(true);
      } else {
        toast.error('Không thể tải dữ liệu xem trước');
      }
    } catch (error: any) {
      console.error('Preview error:', error);
      toast.error('Lỗi khi tải dữ liệu xem trước');
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const response = await statisticsApi.exportReport({ reportType, startDate, endDate });

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bao-cao-${reportType}-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Xuất báo cáo thành công!');
      setShowPreviewModal(false);
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error('Xuất báo cáo thất bại');
    } finally {
      setIsExporting(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN').format(value) + ' ₫';
  };

  const getPaginatedData = (data: any[] | undefined) => {
    if (!data) return [];
    const start = (previewPage - 1) * pageSize;
    return data.slice(start, start + pageSize);
  };

  const getTotalPages = (data: any[] | undefined) => {
    if (!data) return 1;
    return Math.ceil(data.length / pageSize);
  };

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto px-8 py-6">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center justify-center gap-3">
            <FileSpreadsheet className="w-8 h-8 text-emerald-600" />
            Xuất báo cáo Excel
          </h1>
          <p className="text-gray-500 mt-2">Chọn loại báo cáo và khoảng thời gian để xuất file</p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-8">

          {/* Step 1: Report Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              1. Chọn loại báo cáo
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setReportType('users')}
                className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${reportType === 'users'
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-gray-200 hover:border-gray-300'
                  }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${reportType === 'users' ? 'bg-emerald-500' : 'bg-gray-100'
                  }`}>
                  <Users className={`w-5 h-5 ${reportType === 'users' ? 'text-white' : 'text-gray-500'}`} />
                </div>
                <div className="text-left">
                  <div className={`font-medium ${reportType === 'users' ? 'text-emerald-700' : 'text-gray-900'}`}>
                    Người dùng
                  </div>
                  <div className="text-xs text-gray-500">Danh sách tất cả người dùng</div>
                </div>
                {reportType === 'users' && (
                  <CheckCircle className="w-5 h-5 text-emerald-500 ml-auto" />
                )}
              </button>

              <button
                onClick={() => setReportType('revenue')}
                className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${reportType === 'revenue'
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-gray-200 hover:border-gray-300'
                  }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${reportType === 'revenue' ? 'bg-emerald-500' : 'bg-gray-100'
                  }`}>
                  <DollarSign className={`w-5 h-5 ${reportType === 'revenue' ? 'text-white' : 'text-gray-500'}`} />
                </div>
                <div className="text-left">
                  <div className={`font-medium ${reportType === 'revenue' ? 'text-emerald-700' : 'text-gray-900'}`}>
                    Doanh thu
                  </div>
                  <div className="text-xs text-gray-500">Tổng doanh thu theo ngày</div>
                </div>
                {reportType === 'revenue' && (
                  <CheckCircle className="w-5 h-5 text-emerald-500 ml-auto" />
                )}
              </button>
            </div>
          </div>

          {/* Step 2: Date Range */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              2. Chọn khoảng thời gian
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Từ ngày</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Đến ngày</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Step 3: Actions */}
          <div className="pt-4 border-t">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              3. Xem trước và xuất file
            </label>
            <div className="flex gap-3">
              <button
                onClick={handlePreview}
                disabled={isPreviewing}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-emerald-500 text-emerald-600 rounded-lg font-medium hover:bg-emerald-50 transition-colors disabled:opacity-50"
              >
                {isPreviewing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
                Xem trước
              </button>
              <button
                onClick={handleExportExcel}
                disabled={isExporting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                {isExporting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Download className="w-5 h-5" />
                )}
                Xuất Excel
              </button>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-2">📋 Thông tin báo cáo</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• <strong>Người dùng:</strong> Xuất danh sách đầy đủ thông tin (tên, email, vai trò, trạng thái...)</li>
            <li>• <strong>Doanh thu:</strong> Tổng doanh thu theo từng ngày trong khoảng thời gian đã chọn</li>
          </ul>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreviewModal && previewData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-bold text-gray-900">
                📄 Xem trước: {reportType === 'users' ? 'Báo cáo Người dùng' : 'Báo cáo Doanh thu'}
              </h2>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4">
              {/* Users Table */}
              {previewData.users && reportType === 'users' && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-gray-600">
                      Tổng: <strong>{previewData.users.total}</strong> người dùng
                    </span>
                    {previewData.users.byRole && (
                      <div className="flex gap-2 text-xs">
                        {previewData.users.byRole.map((stat) => (
                          <span key={stat.role} className="px-2 py-1 bg-gray-100 rounded">
                            {stat.role}: {stat.count}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-3 py-2 text-left">STT</th>
                          <th className="px-3 py-2 text-left">Tên đăng nhập</th>
                          <th className="px-3 py-2 text-left">Họ và tên</th>
                          <th className="px-3 py-2 text-left">Email</th>
                          <th className="px-3 py-2 text-left">Vai trò</th>
                          <th className="px-3 py-2 text-left">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getPaginatedData(previewData.users.data).map((row, idx) => (
                          <tr key={idx} className="border-t hover:bg-gray-50">
                            <td className="px-3 py-2">{row.stt}</td>
                            <td className="px-3 py-2">{row.username}</td>
                            <td className="px-3 py-2">{row.fullName}</td>
                            <td className="px-3 py-2 text-gray-500">{row.email}</td>
                            <td className="px-3 py-2">{row.role}</td>
                            <td className="px-3 py-2">
                              <span className={`px-2 py-0.5 rounded text-xs ${row.status === 'Hoạt động' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                }`}>
                                {row.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Pagination */}
                  {previewData.users.data.length > pageSize && (
                    <div className="flex items-center justify-center gap-3 mt-3 text-sm">
                      <button
                        onClick={() => setPreviewPage(p => Math.max(1, p - 1))}
                        disabled={previewPage === 1}
                        className="p-1.5 hover:bg-gray-100 rounded disabled:opacity-40"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-gray-600">
                        {previewPage} / {getTotalPages(previewData.users.data)}
                      </span>
                      <button
                        onClick={() => setPreviewPage(p => Math.min(getTotalPages(previewData.users.data), p + 1))}
                        disabled={previewPage === getTotalPages(previewData.users.data)}
                        className="p-1.5 hover:bg-gray-100 rounded disabled:opacity-40"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Revenue Table */}
              {previewData.revenue && reportType === 'revenue' && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-gray-600">
                      <strong>{previewData.revenue.total}</strong> ngày có doanh thu
                    </span>
                    <span className="text-sm font-medium text-emerald-600">
                      Tổng: {formatCurrency(previewData.revenue.grandTotal)}
                    </span>
                  </div>
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-3 py-2 text-left">STT</th>
                          <th className="px-3 py-2 text-left">Ngày</th>
                          <th className="px-3 py-2 text-right">Số giao dịch</th>
                          <th className="px-3 py-2 text-right">Doanh thu</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getPaginatedData(previewData.revenue.data).map((row, idx) => (
                          <tr key={idx} className="border-t hover:bg-gray-50">
                            <td className="px-3 py-2">{row.stt}</td>
                            <td className="px-3 py-2">{row.date}</td>
                            <td className="px-3 py-2 text-right">{row.transactions}</td>
                            <td className="px-3 py-2 text-right font-medium text-emerald-600">
                              {formatCurrency(row.revenue)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {previewData.revenue.data.length > pageSize && (
                    <div className="flex items-center justify-center gap-3 mt-3 text-sm">
                      <button
                        onClick={() => setPreviewPage(p => Math.max(1, p - 1))}
                        disabled={previewPage === 1}
                        className="p-1.5 hover:bg-gray-100 rounded disabled:opacity-40"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-gray-600">
                        {previewPage} / {getTotalPages(previewData.revenue.data)}
                      </span>
                      <button
                        onClick={() => setPreviewPage(p => Math.min(getTotalPages(previewData.revenue.data), p + 1))}
                        disabled={previewPage === getTotalPages(previewData.revenue.data)}
                        className="p-1.5 hover:bg-gray-100 rounded disabled:opacity-40"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-4 border-t bg-gray-50">
              <button
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Đóng
              </button>
              <button
                onClick={handleExportExcel}
                disabled={isExporting}
                className="flex items-center gap-2 px-5 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                {isExporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Xuất Excel
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
