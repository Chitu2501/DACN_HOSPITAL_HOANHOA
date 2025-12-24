const fetch = require('node-fetch');

// Gemini API configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

/**
 * Gọi Gemini API với prompt
 * @param {string} prompt - Nội dung prompt
 * @param {Array} history - Lịch sử chat (optional)
 * @returns {Promise<string>} - Response từ Gemini
 */
async function callGemini(prompt, history = []) {
    try {
        console.log('🤖 Calling Gemini API...');
        console.log('📝 Prompt length:', prompt.length);

        if (!GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY is not configured');
        }

        const contents = [];

        // Thêm lịch sử chat nếu có
        if (history && history.length > 0) {
            history.forEach(msg => {
                contents.push({
                    role: msg.role === 'user' ? 'user' : 'model',
                    parts: [{ text: msg.content }]
                });
            });
        }

        // Thêm prompt hiện tại
        contents.push({
            role: 'user',
            parts: [{ text: prompt }]
        });

        const requestBody = {
            contents,
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 2048,
            }
        };

        console.log('🔗 API URL:', GEMINI_API_URL);

        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('❌ Gemini API Error Response:', JSON.stringify(data, null, 2));
            throw new Error(`Gemini API error: ${response.status} - ${data.error?.message || JSON.stringify(data)}`);
        }

        console.log('✅ Gemini API Response received');

        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
            const responseText = data.candidates[0].content.parts[0].text;
            console.log('📤 Response length:', responseText.length);
            return responseText;
        }

        console.error('❌ Invalid response format:', JSON.stringify(data, null, 2));
        throw new Error('Invalid response format from Gemini API');
    } catch (error) {
        console.error('❌ Error calling Gemini API:', error.message);
        throw error;
    }
}

/**
 * Phân tích dữ liệu bệnh viện và tạo insights
 * @param {Object} data - Dữ liệu thống kê từ database
 * @returns {Promise<Object>} - Insights và phân tích
 */
async function analyzeHospitalData(data) {
    const prompt = `
Bạn là AI Assistant quản lý bệnh viện. Hãy phân tích dữ liệu sau và đưa ra insights hữu ích bằng tiếng Việt.

DỮ LIỆU HỆ THỐNG:
- Tổng người dùng: ${data.users?.total || 0}
- Bệnh nhân: ${data.users?.patients || 0}
- Bác sĩ: ${data.users?.doctors || 0}
- Y tá: ${data.users?.nurses || 0}
- Người dùng hoạt động: ${data.users?.active || 0}

- Tổng lịch hẹn: ${data.appointments?.total || 0}
- Lịch hẹn hôm nay: ${data.appointments?.today || 0}
- Đang chờ: ${data.appointments?.pending || 0}
- Đã xác nhận: ${data.appointments?.confirmed || 0}
- Đã hoàn thành: ${data.appointments?.completed || 0}
- Đã hủy: ${data.appointments?.cancelled || 0}

- Tổng doanh thu: ${data.revenue?.total || 0} VNĐ
- Số giao dịch thanh toán: ${data.revenue?.paidAppointments || 0}

- Tổng hồ sơ khám: ${data.medicalRecords?.total || 0}
- Hồ sơ hoàn thành: ${data.medicalRecords?.completed || 0}
- Đang xử lý: ${data.medicalRecords?.inProgress || 0}

Hãy trả về JSON với format sau (không có markdown, chỉ JSON thuần):
{
  "summary": "Tóm tắt ngắn gọn tình hình hoạt động",
  "insights": [
    {"title": "Tiêu đề insight", "description": "Mô tả chi tiết", "type": "positive/warning/info"}
  ],
  "metrics": {
    "appointmentCompletionRate": "xx%",
    "cancellationRate": "xx%", 
    "userActivityRate": "xx%"
  }
}
`;

    const response = await callGemini(prompt);

    try {
        // Loại bỏ markdown code block nếu có
        let cleanResponse = response.trim();
        if (cleanResponse.startsWith('```json')) {
            cleanResponse = cleanResponse.slice(7);
        }
        if (cleanResponse.startsWith('```')) {
            cleanResponse = cleanResponse.slice(3);
        }
        if (cleanResponse.endsWith('```')) {
            cleanResponse = cleanResponse.slice(0, -3);
        }

        return JSON.parse(cleanResponse.trim());
    } catch (e) {
        // Nếu không parse được JSON, trả về response dạng text
        return {
            summary: response,
            insights: [],
            metrics: {}
        };
    }
}

/**
 * Tạo đề xuất quản lý dựa trên context
 * @param {Object} context - Context và dữ liệu hiện tại
 * @returns {Promise<Object>} - Danh sách đề xuất
 */
async function generateRecommendations(context) {
    const prompt = `
Bạn là AI tư vấn quản lý bệnh viện. Dựa trên dữ liệu sau, hãy đưa ra các đề xuất cải thiện quản lý bằng tiếng Việt.

CONTEXT:
${JSON.stringify(context, null, 2)}

Hãy trả về JSON với format sau (không có markdown):
{
  "recommendations": [
    {
      "title": "Tiêu đề đề xuất",
      "description": "Mô tả chi tiết",
      "priority": "high/medium/low",
      "category": "operations/revenue/staff/patient_care",
      "impact": "Tác động dự kiến"
    }
  ],
  "urgentActions": [
    "Các hành động cần thực hiện ngay"
  ]
}
`;

    const response = await callGemini(prompt);

    try {
        let cleanResponse = response.trim();
        if (cleanResponse.startsWith('```json')) {
            cleanResponse = cleanResponse.slice(7);
        }
        if (cleanResponse.startsWith('```')) {
            cleanResponse = cleanResponse.slice(3);
        }
        if (cleanResponse.endsWith('```')) {
            cleanResponse = cleanResponse.slice(0, -3);
        }

        return JSON.parse(cleanResponse.trim());
    } catch (e) {
        return {
            recommendations: [{
                title: 'Phân tích',
                description: response,
                priority: 'medium',
                category: 'operations',
                impact: 'N/A'
            }],
            urgentActions: []
        };
    }
}

/**
 * Chat với AI Assistant
 * @param {string} message - Tin nhắn từ user
 * @param {Array} history - Lịch sử chat
 * @param {Object} context - Context dữ liệu hiện tại
 * @returns {Promise<string>} - Phản hồi từ AI
 */
async function chat(message, history = [], context = {}) {
    const systemPrompt = `
Bạn là AI Assistant thông minh chuyên về quản lý bệnh viện. Bạn có thể:
- Phân tích dữ liệu hoạt động bệnh viện
- Đưa ra đề xuất cải thiện
- Trả lời các câu hỏi về quản lý y tế
- Hỗ trợ ra quyết định cho admin

Dữ liệu hệ thống hiện tại:
${JSON.stringify(context, null, 2)}

Hãy trả lời bằng tiếng Việt, ngắn gọn, chuyên nghiệp và hữu ích.

Câu hỏi của admin: ${message}
`;

    return await callGemini(systemPrompt, history);
}

/**
 * Tạo báo cáo tự động
 * @param {string} type - Loại báo cáo (daily/weekly/monthly)
 * @param {Object} data - Dữ liệu để tạo báo cáo
 * @returns {Promise<Object>} - Báo cáo
 */
async function generateReport(type, data) {
    const prompt = `
Bạn là AI tạo báo cáo cho bệnh viện. Hãy tạo báo cáo ${type === 'daily' ? 'hàng ngày' : type === 'weekly' ? 'hàng tuần' : 'hàng tháng'} dựa trên dữ liệu sau bằng tiếng Việt.

DỮ LIỆU:
${JSON.stringify(data, null, 2)}

Hãy trả về JSON với format sau (không có markdown):
{
  "title": "Tiêu đề báo cáo",
  "period": "Khoảng thời gian",
  "generatedAt": "${new Date().toISOString()}",
  "summary": "Tóm tắt executive",
  "sections": [
    {
      "title": "Tên phần",
      "content": "Nội dung phân tích",
      "metrics": [
        {"label": "Tên metric", "value": "Giá trị", "trend": "up/down/stable"}
      ]
    }
  ],
  "conclusions": ["Kết luận 1", "Kết luận 2"],
  "nextSteps": ["Bước tiếp theo 1", "Bước tiếp theo 2"]
}
`;

    const response = await callGemini(prompt);

    try {
        let cleanResponse = response.trim();
        if (cleanResponse.startsWith('```json')) {
            cleanResponse = cleanResponse.slice(7);
        }
        if (cleanResponse.startsWith('```')) {
            cleanResponse = cleanResponse.slice(3);
        }
        if (cleanResponse.endsWith('```')) {
            cleanResponse = cleanResponse.slice(0, -3);
        }

        return JSON.parse(cleanResponse.trim());
    } catch (e) {
        return {
            title: `Báo cáo ${type}`,
            period: type,
            generatedAt: new Date().toISOString(),
            summary: response,
            sections: [],
            conclusions: [],
            nextSteps: []
        };
    }
}

module.exports = {
    callGemini,
    analyzeHospitalData,
    generateRecommendations,
    chat,
    generateReport
};
