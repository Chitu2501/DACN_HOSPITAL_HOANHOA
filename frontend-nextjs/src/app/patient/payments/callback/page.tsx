'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PatientLayout } from '@/components/Layout/PatientLayout';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { patientInvoicesApi, medicalRecordsApi, patientPaymentsApi } from '@/lib/api';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export default function PaymentCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const invoiceId = searchParams.get('invoiceId');
  const paymentType = searchParams.get('type'); // 'medical-record' or null
  const medicalRecordId = searchParams.get('id'); // For medical record payments
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Đang xử lý...');

  // Determine if this is a medical record payment
  const isMedicalRecordPayment = paymentType === 'medical-record' && medicalRecordId;

  // Fetch invoice để kiểm tra trạng thái (for regular invoices)
  const { data: invoiceData } = useQuery({
    queryKey: ['patient-invoice', invoiceId],
    queryFn: async () => {
      if (!invoiceId) return null;
      const response = await patientInvoicesApi.getById(invoiceId);
      return response.data;
    },
    enabled: !!invoiceId && !isMedicalRecordPayment,
    refetchInterval: (query) => {
      // Nếu invoice đã paid thì dừng refetch
      const data = query.state.data as any;
      if (data?.data?.status === 'PAID') {
        return false;
      }
      return 2000; // Refetch mỗi 2 giây
    },
  });

  // Fetch payment status for medical record
  const { data: paymentStatusData } = useQuery({
    queryKey: ['medical-record-payment-status', medicalRecordId],
    queryFn: async () => {
      if (!medicalRecordId) return null;
      const response = await medicalRecordsApi.getPaymentStatus(medicalRecordId);
      return response.data;
    },
    enabled: !!isMedicalRecordPayment,
    refetchInterval: (query) => {
      // Nếu đã paid thì dừng refetch
      const data = query.state.data as any;
      if (data?.data?.isPaid || data?.data?.paymentStatus === 'PAID') {
        return false;
      }
      return 2000; // Refetch mỗi 2 giây
    },
  });

  useEffect(() => {
    // Kiểm tra query params từ MoMo redirect
    const resultCode = searchParams.get('resultCode');
    const orderId = searchParams.get('orderId');
    const momoMessage = searchParams.get('message');

    if (isMedicalRecordPayment) {
      // Xử lý thanh toán hồ sơ khám
      const syncPayment = async () => {
        try {
          if (resultCode === '0' && orderId) {
            // Đồng bộ trạng thái thủ công đề phòng IPN chậm
            await patientPaymentsApi.syncStatus(orderId);
          }
        } catch (err) {
          console.warn('Sync payment status error:', err);
        }
      };

      syncPayment();

      if (resultCode) {
        if (resultCode === '0') {
          // Thanh toán thành công
          setStatus('success');
          setMessage('Thanh toán thành công!');
          
          // Invalidate query cache để refresh dữ liệu khi quay lại trang
          queryClient.invalidateQueries({ queryKey: ['patient-medical-records'] });
          queryClient.invalidateQueries({ queryKey: ['medical-record-payment-status', medicalRecordId] });
          queryClient.invalidateQueries({ queryKey: ['patient-all-payments'] }); // Quan trọng: invalidate payments page
          queryClient.invalidateQueries({ queryKey: ['patient-invoices'] }); // Cũng invalidate invoices để đảm bảo
          
          // Đợi một chút để backend xử lý callback
          setTimeout(() => {
            router.push('/patient/payments?paymentSuccess=true'); // Thêm param để payments page biết cần refetch
          }, 2000); // Giảm thời gian chờ xuống 2 giây
        } else {
          // Thanh toán thất bại
          setStatus('error');
          setMessage(momoMessage || 'Thanh toán thất bại');
        }
      } else {
        // Nếu không có resultCode, kiểm tra trạng thái payment
        if (paymentStatusData?.data?.isPaid || paymentStatusData?.data?.paymentStatus === 'PAID') {
          setStatus('success');
          setMessage('Thanh toán thành công!');
          
          // Invalidate query cache để refresh dữ liệu khi quay lại trang
          queryClient.invalidateQueries({ queryKey: ['patient-medical-records'] });
          queryClient.invalidateQueries({ queryKey: ['medical-record-payment-status', medicalRecordId] });
          queryClient.invalidateQueries({ queryKey: ['patient-all-payments'] }); // Quan trọng: invalidate payments page
          queryClient.invalidateQueries({ queryKey: ['patient-invoices'] }); // Cũng invalidate invoices để đảm bảo
          
          setTimeout(() => {
            router.push('/patient/payments?paymentSuccess=true'); // Thêm param để payments page biết cần refetch
          }, 2000); // Giảm thời gian chờ xuống 2 giây
        } else {
          // Vẫn đang chờ xử lý
          setStatus('loading');
          setMessage('Đang xử lý thanh toán...');
        }
      }
    } else {
      // Xử lý thanh toán hóa đơn thông thường
      if (!invoiceId) {
        setStatus('error');
        setMessage('Không tìm thấy thông tin hóa đơn');
        return;
      }

      if (resultCode) {
        if (resultCode === '0') {
          // Thanh toán thành công
          setStatus('success');
          setMessage('Thanh toán thành công!');
          
          // Invalidate query cache để refresh dữ liệu khi quay lại trang payments
          queryClient.invalidateQueries({ queryKey: ['patient-invoices'] });
          queryClient.invalidateQueries({ queryKey: ['patient-invoice', invoiceId] });
          queryClient.invalidateQueries({ queryKey: ['patient-all-payments'] }); // Cũng invalidate all payments
          
          // Đợi một chút để backend xử lý callback
          setTimeout(() => {
            router.push('/patient/payments?paymentSuccess=true'); // Thêm param để payments page biết cần refetch
          }, 2000); // Giảm thời gian chờ xuống 2 giây
        } else {
          // Thanh toán thất bại
          setStatus('error');
          setMessage(momoMessage || 'Thanh toán thất bại');
        }
      } else {
        // Nếu không có resultCode, kiểm tra trạng thái invoice
        if (invoiceData?.data?.status === 'PAID') {
          setStatus('success');
          setMessage('Thanh toán thành công!');
          
          // Invalidate query cache để refresh dữ liệu khi quay lại trang payments
          queryClient.invalidateQueries({ queryKey: ['patient-invoices'] });
          queryClient.invalidateQueries({ queryKey: ['patient-invoice', invoiceId] });
          queryClient.invalidateQueries({ queryKey: ['patient-all-payments'] }); // Cũng invalidate all payments
          
          setTimeout(() => {
            router.push('/patient/payments');
          }, 2000); // Giảm thời gian chờ xuống 2 giây
        } else {
          // Vẫn đang chờ xử lý
          setStatus('loading');
          setMessage('Đang xử lý thanh toán...');
        }
      }
    }
  }, [invoiceId, searchParams, invoiceData, paymentStatusData, isMedicalRecordPayment, router, queryClient]);

  return (
    <PatientLayout>
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-full max-w-md">
          <div className="p-8 rounded-2xl bg-slate-900/50 border border-white/10 text-center">
            {status === 'loading' && (
              <>
                <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
                <h2 className="text-2xl font-bold text-white mb-2">Đang xử lý thanh toán</h2>
                <p className="text-slate-400">{message}</p>
                {invoiceData?.data && (
                  <div className="mt-6 p-4 bg-slate-800/50 rounded-xl">
                    <p className="text-sm text-slate-400 mb-1">Hóa đơn #{invoiceData.data.id}</p>
                    <p className="text-xl font-bold text-white">
                      {formatCurrency(invoiceData.data.amount)}
                    </p>
                  </div>
                )}
                {isMedicalRecordPayment && paymentStatusData?.data && (
                  <div className="mt-6 p-4 bg-slate-800/50 rounded-xl">
                    <p className="text-sm text-slate-400 mb-1">Hồ sơ khám #{paymentStatusData.data.ma_ho_so}</p>
                    <p className="text-xl font-bold text-white">
                      {formatCurrency(paymentStatusData.data.amount)}
                    </p>
                  </div>
                )}
              </>
            )}

            {status === 'success' && (
              <>
                <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Thanh toán thành công!</h2>
                <p className="text-slate-400 mb-6">{message}</p>
                {invoiceData?.data && (
                  <div className="mb-6 p-4 bg-slate-800/50 rounded-xl">
                    <p className="text-sm text-slate-400 mb-1">Hóa đơn #{invoiceData.data.id}</p>
                    <p className="text-xl font-bold text-white">
                      {formatCurrency(invoiceData.data.amount)}
                    </p>
                    <p className="text-xs text-emerald-400 mt-2">
                      Đã thanh toán qua {invoiceData.data.paymentMethod === 'momo' ? 'MoMo' : 'Phương thức khác'}
                    </p>
                  </div>
                )}
                {isMedicalRecordPayment && paymentStatusData?.data && (
                  <div className="mb-6 p-4 bg-slate-800/50 rounded-xl">
                    <p className="text-sm text-slate-400 mb-1">Hồ sơ khám #{paymentStatusData.data.ma_ho_so}</p>
                    <p className="text-xl font-bold text-white">
                      {formatCurrency(paymentStatusData.data.amount)}
                    </p>
                    <p className="text-xs text-emerald-400 mt-2">
                      Đã thanh toán qua MoMo
                    </p>
                  </div>
                )}
                <p className="text-sm text-slate-400">
                  Đang chuyển hướng...
                </p>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <XCircle className="w-10 h-10 text-red-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Thanh toán thất bại</h2>
                <p className="text-slate-400 mb-6">{message}</p>
                <button
                  onClick={() => router.push(isMedicalRecordPayment ? '/patient/medical-records' : '/patient/payments')}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-500 transition-colors"
                >
                  {isMedicalRecordPayment ? 'Quay lại hồ sơ khám' : 'Quay lại trang thanh toán'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </PatientLayout>
  );
}

