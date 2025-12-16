import express, { Response } from 'express';
import { invoices, appointments } from '../data/mockData';
import { AuthenticatedRequest, ApiResponse, Invoice } from '../types';
import { mockPatientAuth } from '../middlewares/mockPatientAuth';
import { createMomoPayment, verifyMomoCallback } from '../services/momoService';

// Import types để đảm bảo Express types được load
import '../types/express';

const router = express.Router();

// Callback route từ MoMo - KHÔNG cần authentication (đặt trước middleware)
/**
 * POST /api/patient/invoices/:id/momo-callback
 * Callback từ MoMo (IPN - Instant Payment Notification)
 * Route này KHÔNG cần authentication vì MoMo gọi từ bên ngoài
 */
router.post('/invoices/:id/momo-callback', (req: express.Request, res: Response) => {
  try {
    // req.params có type: { [key: string]: string }
    const invoiceIdParam = req.params.id;
    if (!invoiceIdParam) {
      return res.status(400).json({
        success: false,
        message: 'ID hóa đơn không hợp lệ'
      });
    }
    const invoiceId = parseInt(invoiceIdParam);
    
    // req.body có type: any - MoMo callback data
    interface MomoCallbackBody {
      resultCode: number;
      message?: string;
      transId?: string;
      [key: string]: any;
    }
    const callbackData = req.body as MomoCallbackBody;

    console.log('MoMo callback received:', { invoiceId, resultCode: callbackData.resultCode });

    // Verify signature
    const isValid = verifyMomoCallback(callbackData);

    if (!isValid) {
      console.error('Invalid MoMo callback signature');
      return res.status(400).json({
        success: false,
        message: 'Invalid MoMo callback signature'
      });
    }

    // Tìm invoice
    const invoiceIndex = invoices.findIndex(inv => inv.id === invoiceId);

    if (invoiceIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // Kiểm tra resultCode
    // resultCode = 0: Thanh toán thành công
    // resultCode khác 0: Thanh toán thất bại
    if (callbackData.resultCode === 0) {
      // Thanh toán thành công
      invoices[invoiceIndex].status = 'PAID';
      invoices[invoiceIndex].paymentMethod = 'momo';
      invoices[invoiceIndex].paidAt = new Date().toISOString();
      console.log('Invoice paid successfully:', invoiceId);
    } else {
      console.log('Payment failed:', callbackData.message);
    }

    // Trả về success để MoMo biết đã nhận được callback
    return res.json({
      success: true,
      message: 'Callback received'
    });
  } catch (error) {
    console.error('MoMo callback error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error processing MoMo callback'
    });
  }
});

// Tất cả routes còn lại cần authentication
router.use((req: express.Request, res: Response, next: express.NextFunction) => {
  mockPatientAuth(req as AuthenticatedRequest, res, next);
});

/**
 * GET /api/patient/invoices
 * Lấy danh sách hóa đơn của bệnh nhân hiện tại
 */
router.get('/invoices', (req: express.Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const patientId = authReq.user?.patientId;
    
    if (!patientId) {
      return res.status(401).json({
        success: false,
        message: 'Không xác định được bệnh nhân'
      } as ApiResponse<null>);
    }

    // Lọc invoices theo patientId
    let filteredInvoices = invoices.filter(inv => inv.patientId === Number(patientId));

    // Filter theo status (nếu có)
    // req.query có type: ParsedQs từ Express
    const status = typeof authReq.query.status === 'string' ? authReq.query.status : undefined;
    if (status) {
      filteredInvoices = filteredInvoices.filter(
        inv => inv.status === status
      );
    }

    // Sắp xếp theo ngày tạo (mới nhất trước)
    filteredInvoices.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Populate thông tin appointment nếu có
    const invoicesWithAppointment = filteredInvoices.map(inv => {
      const appointment = inv.appointmentId 
        ? appointments.find(apt => apt.id === inv.appointmentId)
        : null;

      return {
        ...inv,
        appointment: appointment ? {
          id: appointment.id,
          date: appointment.date,
          timeSlot: appointment.timeSlot,
          reason: appointment.reason,
          status: appointment.status
        } : null
      };
    });

    return res.json({
      success: true,
      data: invoicesWithAppointment,
      count: invoicesWithAppointment.length
    } as ApiResponse<typeof invoicesWithAppointment>);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse<null>);
  }
});

/**
 * GET /api/patient/invoices/:id
 * Lấy chi tiết 1 hóa đơn
 */
router.get('/invoices/:id', (req: express.Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const patientId = authReq.user?.patientId;
    // req.params có type: { [key: string]: string }
    const invoiceIdParam = authReq.params.id;
    if (!invoiceIdParam) {
      return res.status(400).json({
        success: false,
        message: 'ID hóa đơn không hợp lệ'
      } as ApiResponse<null>);
    }
    const invoiceId = parseInt(invoiceIdParam);

    if (!patientId) {
      return res.status(401).json({
        success: false,
        message: 'Không xác định được bệnh nhân'
      } as ApiResponse<null>);
    }

    if (isNaN(invoiceId)) {
      return res.status(400).json({
        success: false,
        message: 'ID hóa đơn không hợp lệ'
      } as ApiResponse<null>);
    }

    const invoice = invoices.find(
      inv => inv.id === invoiceId && inv.patientId === Number(patientId)
    );

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy hóa đơn hoặc bạn không có quyền truy cập'
      } as ApiResponse<null>);
    }

    // Populate thông tin appointment nếu có
    const appointment = invoice.appointmentId 
      ? appointments.find(apt => apt.id === invoice.appointmentId)
      : null;

    const invoiceDetail = {
      ...invoice,
      appointment: appointment ? {
        id: appointment.id,
        date: appointment.date,
        timeSlot: appointment.timeSlot,
        reason: appointment.reason,
        status: appointment.status
      } : null
    };

    return res.json({
      success: true,
      data: invoiceDetail
    } as ApiResponse<typeof invoiceDetail>);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse<null>);
  }
});

/**
 * POST /api/patient/invoices/:id/pay
 * Thanh toán hóa đơn
 * Nếu paymentMethod = 'momo' → tạo payment link MoMo
 * Nếu paymentMethod khác → cập nhật trạng thái trực tiếp (demo)
 */
router.post('/invoices/:id/pay', async (req: express.Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const patientId = authReq.user?.patientId;
    
    // req.params có type: { [key: string]: string }
    const invoiceIdParam = authReq.params.id;
    if (!invoiceIdParam) {
      return res.status(400).json({
        success: false,
        message: 'ID hóa đơn không hợp lệ'
      } as ApiResponse<null>);
    }
    const invoiceId = parseInt(invoiceIdParam);
    
    // req.body có type: any (có thể type-safe hơn với interface)
    interface PayInvoiceBody {
      paymentMethod?: 'cash' | 'card' | 'momo' | 'bank_transfer';
    }
    const body = authReq.body as PayInvoiceBody;
    const { paymentMethod } = body;

    if (!patientId) {
      return res.status(401).json({
        success: false,
        message: 'Không xác định được bệnh nhân'
      } as ApiResponse<null>);
    }

    if (isNaN(invoiceId)) {
      return res.status(400).json({
        success: false,
        message: 'ID hóa đơn không hợp lệ'
      } as ApiResponse<null>);
    }

    const invoiceIndex = invoices.findIndex(
      inv => inv.id === invoiceId && inv.patientId === Number(patientId)
    );

    if (invoiceIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy hóa đơn hoặc bạn không có quyền truy cập'
      } as ApiResponse<null>);
    }

    const invoice = invoices[invoiceIndex];

    // Kiểm tra hóa đơn đã thanh toán chưa
    if (invoice.status === 'PAID') {
      return res.status(400).json({
        success: false,
        message: 'Hóa đơn đã được thanh toán'
      } as ApiResponse<null>);
    }

    if (invoice.status === 'CANCELLED') {
      return res.status(400).json({
        success: false,
        message: 'Hóa đơn đã bị hủy'
      } as ApiResponse<null>);
    }

    // Validate paymentMethod
    const validPaymentMethods = ['cash', 'card', 'momo', 'bank_transfer'];
    if (paymentMethod && !validPaymentMethods.includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: `Phương thức thanh toán không hợp lệ. Chọn một trong: ${validPaymentMethods.join(', ')}`
      } as ApiResponse<null>);
    }

    // Nếu thanh toán qua MoMo
    if (paymentMethod === 'momo') {
      try {
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:5001';
        const redirectUrl = `${baseUrl}/patient/payments/callback?invoiceId=${invoiceId}`;
        const ipnUrl = `${backendUrl}/api/patient/invoices/${invoiceId}/momo-callback`;

        // Tạo orderId unique
        const orderId = `INV-${invoiceId}-${Date.now()}`;

        console.log('Creating MoMo payment:', {
          invoiceId,
          orderId,
          amount: invoice.amount,
          redirectUrl,
          ipnUrl
        });

        const momoResponse = await createMomoPayment({
          orderId: orderId,
          orderInfo: `Thanh toán hóa đơn #${invoiceId}`,
          amount: invoice.amount,
          redirectUrl: redirectUrl,
          ipnUrl: ipnUrl,
          extraData: JSON.stringify({ invoiceId, patientId }),
        });

        console.log('MoMo payment created successfully:', {
          orderId: momoResponse.orderId,
          hasPayUrl: !!momoResponse.payUrl,
          hasDeeplink: !!momoResponse.deeplink
        });

        // Lưu thông tin payment vào invoice (tạm thời)
        // Trong thực tế, nên lưu vào database
        invoices[invoiceIndex].paymentMethod = 'momo';
        // invoices[invoiceIndex].momoOrderId = momoResponse.orderId;
        // invoices[invoiceIndex].momoRequestId = momoResponse.requestId;

        return res.json({
          success: true,
          data: {
            paymentUrl: momoResponse.payUrl,
            deeplink: momoResponse.deeplink,
            qrCodeUrl: momoResponse.qrCodeUrl,
            orderId: momoResponse.orderId,
            invoice: invoices[invoiceIndex],
          },
          message: 'Tạo link thanh toán MoMo thành công'
        } as ApiResponse<any>);
      } catch (error) {
        console.error('MoMo payment error:', error);
        return res.status(500).json({
          success: false,
          message: 'Lỗi khi tạo thanh toán MoMo',
          error: error instanceof Error ? error.message : 'Unknown error'
        } as ApiResponse<null>);
      }
    } else {
      // Thanh toán trực tiếp (cash, card, bank_transfer) - demo
      invoices[invoiceIndex].status = 'PAID';
      invoices[invoiceIndex].paymentMethod = paymentMethod || 'cash';
      invoices[invoiceIndex].paidAt = new Date().toISOString();

      return res.json({
        success: true,
        data: invoices[invoiceIndex],
        message: 'Thanh toán thành công'
      } as ApiResponse<Invoice>);
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse<null>);
  }
});

/**
 * POST /api/patient/invoices/:id/momo-callback
 * Callback từ MoMo (IPN - Instant Payment Notification)
 * Route này KHÔNG cần authentication vì MoMo gọi từ bên ngoài
 */
router.post('/invoices/:id/momo-callback', (req: express.Request, res: Response) => {
  try {
    const invoiceId = parseInt(req.params.id);
    const callbackData = req.body;

    // Verify signature
    const isValid = verifyMomoCallback(callbackData);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid MoMo callback signature'
      });
    }

    // Tìm invoice
    const invoiceIndex = invoices.findIndex(inv => inv.id === invoiceId);

    if (invoiceIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // Kiểm tra resultCode
    // resultCode = 0: Thanh toán thành công
    // resultCode khác 0: Thanh toán thất bại
    if (callbackData.resultCode === 0) {
      // Thanh toán thành công
      invoices[invoiceIndex].status = 'PAID';
      invoices[invoiceIndex].paymentMethod = 'momo';
      invoices[invoiceIndex].paidAt = new Date().toISOString();
      // invoices[invoiceIndex].momoTransId = callbackData.transId;
    }

    // Trả về success để MoMo biết đã nhận được callback
    return res.json({
      success: true,
      message: 'Callback received'
    });
  } catch (error) {
    console.error('MoMo callback error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error processing MoMo callback'
    });
  }
});

export default router;

