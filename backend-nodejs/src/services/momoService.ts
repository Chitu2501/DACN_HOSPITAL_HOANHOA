import * as crypto from 'crypto';
import * as https from 'https';
import { validateMomoConfig } from '../utils/momoDebug';

// MoMo Payment Configuration
const MOMO_CONFIG = {
  partnerCode: process.env.MOMO_PARTNER_CODE || 'MOMO',
  accessKey: process.env.MOMO_ACCESS_KEY || 'F8BBA842ECF85',
  secretKey: process.env.MOMO_SECRET_KEY || 'K951B6PE1waDMi640xX08PD3vg6EkVlz',
  endpoint: process.env.MOMO_ENDPOINT || 'test-payment.momo.vn', // test-payment.momo.vn for test, payment.momo.vn for production
  path: '/v2/gateway/api/create',
};

// Validate config on module load
if (typeof process !== 'undefined') {
  validateMomoConfig();
}

export interface MomoPaymentRequest {
  orderId: string;
  orderInfo: string;
  amount: number;
  redirectUrl: string;
  ipnUrl: string;
  extraData?: string;
  requestId?: string;
}

export interface MomoPaymentResponse {
  partnerCode: string;
  orderId: string;
  requestId: string;
  amount: number;
  responseTime: number;
  message: string;
  resultCode: number;
  payUrl?: string;
  deeplink?: string;
  qrCodeUrl?: string;
}

/**
 * Tạo chữ ký HMAC SHA256 cho MoMo
 */
function createSignature(params: Record<string, string | number>): string {
  const sortedKeys = Object.keys(params).sort();
  const rawSignature = sortedKeys
    .map(key => `${key}=${params[key]}`)
    .join('&');

  const signature = crypto
    .createHmac('sha256', MOMO_CONFIG.secretKey)
    .update(rawSignature)
    .digest('hex');

  return signature;
}

/**
 * Tạo payment link từ MoMo
 */
export function createMomoPayment(request: MomoPaymentRequest): Promise<MomoPaymentResponse> {
  return new Promise((resolve, reject) => {
    const requestId = request.requestId || `${MOMO_CONFIG.partnerCode}${Date.now()}`;
    const amount = request.amount.toString();
    const extraData = request.extraData || '';

    // Tạo signature
    const params = {
      accessKey: MOMO_CONFIG.accessKey,
      amount: amount,
      extraData: extraData,
      ipnUrl: request.ipnUrl,
      orderId: request.orderId,
      orderInfo: request.orderInfo,
      partnerCode: MOMO_CONFIG.partnerCode,
      redirectUrl: request.redirectUrl,
      requestId: requestId,
      requestType: 'captureWallet',
    };

    const signature = createSignature(params);

    // Log request for debugging (không log secret key)
    console.log('MoMo Payment Request:', {
      partnerCode: MOMO_CONFIG.partnerCode,
      orderId: request.orderId,
      amount: amount,
      requestId: requestId,
      redirectUrl: request.redirectUrl,
      ipnUrl: request.ipnUrl,
      signatureLength: signature.length
    });

    // Request body
    const requestBody = JSON.stringify({
      partnerCode: MOMO_CONFIG.partnerCode,
      accessKey: MOMO_CONFIG.accessKey,
      requestId: requestId,
      amount: amount,
      orderId: request.orderId,
      orderInfo: request.orderInfo,
      redirectUrl: request.redirectUrl,
      ipnUrl: request.ipnUrl,
      extraData: extraData,
      requestType: 'captureWallet',
      signature: signature,
      lang: 'vi',
    });

    // HTTPS request options
    const options = {
      hostname: MOMO_CONFIG.endpoint,
      port: 443,
      path: MOMO_CONFIG.path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestBody),
      },
    };

    // Send request
    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          
          // Log response for debugging
          console.log('MoMo API Response:', {
            statusCode: res.statusCode,
            resultCode: response.resultCode,
            message: response.message,
            payUrl: response.payUrl ? 'Present' : 'Missing'
          });
          
          if (response.resultCode === 0) {
            if (!response.payUrl) {
              console.warn('MoMo returned success but no payUrl');
            }
            resolve(response as MomoPaymentResponse);
          } else {
            const errorMsg = response.message || `MoMo payment creation failed (resultCode: ${response.resultCode})`;
            console.error('MoMo API Error:', errorMsg);
            reject(new Error(errorMsg));
          }
        } catch (error) {
          console.error('Failed to parse MoMo response:', data);
          reject(new Error('Failed to parse MoMo response'));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(requestBody);
    req.end();
  });
}

/**
 * Xác thực callback từ MoMo (IPN)
 */
export function verifyMomoCallback(data: any): boolean {
  try {
    const {
      partnerCode,
      accessKey,
      requestId,
      amount,
      orderId,
      orderInfo,
      orderType,
      transId,
      resultCode,
      message,
      payType,
      responseTime,
      extraData,
      signature,
    } = data;

    // Tạo signature để so sánh
    const params = {
      accessKey: accessKey,
      amount: amount,
      extraData: extraData || '',
      message: message,
      orderId: orderId,
      orderInfo: orderInfo,
      orderType: orderType || '',
      partnerCode: partnerCode,
      payType: payType || '',
      requestId: requestId,
      responseTime: responseTime,
      resultCode: resultCode,
      transId: transId,
    };

    const calculatedSignature = createSignature(params);

    return calculatedSignature === signature;
  } catch (error) {
    return false;
  }
}

