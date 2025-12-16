/**
 * Utility functions để debug MoMo payment integration
 */

export function logMomoRequest(params: {
  partnerCode: string;
  orderId: string;
  amount: string;
  requestId: string;
  redirectUrl: string;
  ipnUrl: string;
  signature: string;
}) {
  console.log('=== MoMo Payment Request Debug ===');
  console.log('Partner Code:', params.partnerCode);
  console.log('Order ID:', params.orderId);
  console.log('Amount:', params.amount);
  console.log('Request ID:', params.requestId);
  console.log('Redirect URL:', params.redirectUrl);
  console.log('IPN URL:', params.ipnUrl);
  console.log('Signature (first 20 chars):', params.signature.substring(0, 20) + '...');
  console.log('===================================');
}

export function logMomoResponse(response: any) {
  console.log('=== MoMo Payment Response Debug ===');
  console.log('Result Code:', response.resultCode);
  console.log('Message:', response.message);
  console.log('Pay URL:', response.payUrl || 'NOT PROVIDED');
  console.log('Deep Link:', response.deeplink || 'NOT PROVIDED');
  console.log('QR Code URL:', response.qrCodeUrl || 'NOT PROVIDED');
  console.log('===================================');
}

export function validateMomoConfig() {
  const required = [
    'MOMO_PARTNER_CODE',
    'MOMO_ACCESS_KEY',
    'MOMO_SECRET_KEY'
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.warn('⚠️  Missing MoMo environment variables:', missing.join(', '));
    console.warn('Using default test credentials. This may not work!');
    return false;
  }

  return true;
}

