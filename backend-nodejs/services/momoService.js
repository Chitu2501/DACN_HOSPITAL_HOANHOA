const crypto = require('crypto');
const https = require('https');

// MoMo Payment Configuration
const MOMO_CONFIG = {
  partnerCode: process.env.MOMO_PARTNER_CODE || 'MOMO',
  accessKey: process.env.MOMO_ACCESS_KEY || 'F8BBA842ECF85',
  secretKey: process.env.MOMO_SECRET_KEY || 'K951B6PE1waDMi640xX08PD3vg6EkVlz',
  endpoint: process.env.MOMO_ENDPOINT || 'test-payment.momo.vn', // test-payment.momo.vn for test, payment.momo.vn for production
  path: '/v2/gateway/api/create',
};

/**
 * Tạo chữ ký HMAC SHA256 cho MoMo
 * Format: accessKey=$accessKey&amount=$amount&extraData=$extraData&ipnUrl=$ipnUrl&orderId=$orderId&orderInfo=$orderInfo&partnerCode=$partnerCode&redirectUrl=$redirectUrl&requestId=$requestId&requestType=$requestType
 */
function createSignature(params) {
  // Sắp xếp keys theo thứ tự alphabet như MoMo yêu cầu
  const sortedKeys = Object.keys(params).sort();
  const rawSignature = sortedKeys
    .map(key => `${key}=${params[key]}`)
    .join('&');

  console.log('--------------------RAW SIGNATURE----------------');
  console.log(rawSignature);

  const signature = crypto
    .createHmac('sha256', MOMO_CONFIG.secretKey)
    .update(rawSignature)
    .digest('hex');

  console.log('--------------------SIGNATURE----------------');
  console.log(signature);

  return signature;
}

/**
 * Tạo payment link từ MoMo
 * @param {Object} request - Thông tin thanh toán
 * @param {string} request.orderId - Mã đơn hàng
 * @param {string} request.orderInfo - Thông tin đơn hàng
 * @param {number} request.amount - Số tiền
 * @param {string} request.redirectUrl - URL redirect sau khi thanh toán
 * @param {string} request.ipnUrl - URL callback từ MoMo
 * @param {string} request.extraData - Dữ liệu bổ sung
 * @param {string} request.requestId - Mã request (optional)
 * @returns {Promise<Object>} Response từ MoMo
 */
function createMomoPayment(request) {
  return new Promise((resolve, reject) => {
    const requestId = request.requestId || `${MOMO_CONFIG.partnerCode}${Date.now()}`;
    const amount = request.amount.toString();
    const extraData = request.extraData || '';
    const orderId = request.orderId;
    const orderInfo = request.orderInfo;
    const redirectUrl = request.redirectUrl;
    const ipnUrl = request.ipnUrl;
    const requestType = 'captureWallet';

    // Tạo signature theo đúng format MoMo yêu cầu
    // Thứ tự: accessKey, amount, extraData, ipnUrl, orderId, orderInfo, partnerCode, redirectUrl, requestId, requestType
    const params = {
      accessKey: MOMO_CONFIG.accessKey,
      amount: amount,
      extraData: extraData,
      ipnUrl: ipnUrl,
      orderId: orderId,
      orderInfo: orderInfo,
      partnerCode: MOMO_CONFIG.partnerCode,
      redirectUrl: redirectUrl,
      requestId: requestId,
      requestType: requestType,
    };

    const signature = createSignature(params);

    // Log request for debugging (không log secret key)
    console.log('MoMo Payment Request:', {
      partnerCode: MOMO_CONFIG.partnerCode,
      orderId: orderId,
      amount: amount,
      requestId: requestId,
      redirectUrl: redirectUrl,
      ipnUrl: ipnUrl,
      signatureLength: signature.length
    });

    // Request body theo đúng format MoMo yêu cầu
    const requestBody = JSON.stringify({
      partnerCode: MOMO_CONFIG.partnerCode,
      accessKey: MOMO_CONFIG.accessKey,
      requestId: requestId,
      amount: amount,
      orderId: orderId,
      orderInfo: orderInfo,
      redirectUrl: redirectUrl,
      ipnUrl: ipnUrl,
      extraData: extraData,
      requestType: requestType,
      signature: signature,
      lang: 'vi', // 'vi' cho tiếng Việt, 'en' cho tiếng Anh
    });

    console.log('Sending MoMo payment request...');

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
      console.log(`Status: ${res.statusCode}`);
      console.log(`Headers: ${JSON.stringify(res.headers)}`);
      
      res.setEncoding('utf8');
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log('Body: ');
        console.log(data);
        
        try {
          const response = JSON.parse(data);
          
          if (response.resultCode === 0) {
            console.log('payUrl: ', response.payUrl);
            
            resolve({
              partnerCode: response.partnerCode,
              orderId: response.orderId,
              requestId: response.requestId,
              amount: parseInt(response.amount),
              responseTime: response.responseTime,
              message: response.message,
              resultCode: response.resultCode,
              payUrl: response.payUrl,
              deeplink: response.deeplink,
              qrCodeUrl: response.qrCodeUrl,
            });
          } else {
            console.error('MoMo payment failed:', response.message);
            reject(new Error(response.message || 'MoMo payment creation failed'));
          }
        } catch (error) {
          console.error('Failed to parse MoMo response:', error);
          reject(new Error(`Failed to parse MoMo response: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error(`Problem with request: ${error.message}`);
      reject(new Error(`MoMo request failed: ${error.message}`));
    });

    // Write data to request body
    req.write(requestBody);
    req.end();
  });
}

/**
 * Xác thực callback từ MoMo (IPN)
 * @param {Object} data - Dữ liệu callback từ MoMo
 * @returns {boolean} true nếu signature hợp lệ
 */
function verifyMomoCallback(data) {
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

    // Tạo signature để so sánh theo đúng format MoMo
    // Thứ tự: accessKey, amount, extraData, message, orderId, orderInfo, orderType, partnerCode, payType, requestId, responseTime, resultCode, transId
    const params = {
      accessKey: accessKey || MOMO_CONFIG.accessKey,
      amount: amount,
      extraData: extraData || '',
      message: message || '',
      orderId: orderId,
      orderInfo: orderInfo || '',
      orderType: orderType || '',
      partnerCode: partnerCode || MOMO_CONFIG.partnerCode,
      payType: payType || '',
      requestId: requestId,
      responseTime: responseTime,
      resultCode: resultCode,
      transId: transId || '',
    };

    console.log('Verifying MoMo callback signature...');
    const calculatedSignature = createSignature(params);
    const isValid = calculatedSignature === signature;
    
    console.log('Signature verification:', isValid ? 'VALID' : 'INVALID');
    
    return isValid;
  } catch (error) {
    console.error('Error verifying MoMo callback:', error);
    return false;
  }
}

module.exports = {
  createMomoPayment,
  verifyMomoCallback,
  MOMO_CONFIG,
};


