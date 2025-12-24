'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { aiApi, statisticsApi } from '@/lib/api';
import { AdminLayout } from '@/components/Layout/AdminLayout';
import {
    Sparkles,
    Send,
    AlertCircle,
    Loader2,
    TrendingUp,
    TrendingDown,
    Lightbulb,
    MessageSquare,
    FileText,
    RefreshCw,
    Brain,
    Zap,
    Target,
    BarChart3,
    Calendar,
    CheckCircle2,
    Info
} from 'lucide-react';

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

interface Insight {
    title: string;
    description: string;
    type: 'positive' | 'warning' | 'info';
}

interface Recommendation {
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    category: string;
    impact: string;
}

export default function AIAssistantPage() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [activeTab, setActiveTab] = useState<'chat' | 'insights' | 'recommendations'>('chat');
    const [isClient, setIsClient] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Initialize on client side only to avoid hydration mismatch
    useEffect(() => {
        setIsClient(true);
        if (messages.length === 0) {
            setMessages([{
                role: 'assistant',
                content: 'Xin chào! Tôi là AI Assistant quản lý bệnh viện. Tôi có thể giúp bạn phân tích dữ liệu, đưa ra đề xuất và trả lời các câu hỏi về quản lý. Bạn cần hỗ trợ gì?',
                timestamp: new Date()
            }]);
        }
    }, []);

    // Fetch AI Analysis
    const { data: analysisData, isLoading: isAnalyzing, refetch: refetchAnalysis } = useQuery({
        queryKey: ['ai-analysis'],
        queryFn: async () => {
            const response = await aiApi.analyze();
            return response.data;
        },
        staleTime: 5 * 60 * 1000,
        retry: 2
    });

    // Fetch Recommendations
    const { data: recommendationsData, isLoading: isLoadingRecommendations, refetch: refetchRecommendations } = useQuery({
        queryKey: ['ai-recommendations'],
        queryFn: async () => {
            const response = await aiApi.getRecommendations();
            return response.data;
        },
        staleTime: 5 * 60 * 1000,
        retry: 2
    });

    // Chat mutation
    const chatMutation = useMutation({
        mutationFn: async (message: string) => {
            const history = messages.slice(-10).map(msg => ({
                role: msg.role,
                content: msg.content
            }));
            const response = await aiApi.chat(message, history);
            return response.data;
        },
        onSuccess: (data) => {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: data.data.response,
                timestamp: new Date()
            }]);
        },
        onError: (error: any) => {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại sau.',
                timestamp: new Date()
            }]);
        }
    });

    // Auto scroll to bottom when new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = () => {
        if (!inputMessage.trim() || chatMutation.isPending) return;

        const userMessage: ChatMessage = {
            role: 'user',
            content: inputMessage.trim(),
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        chatMutation.mutate(inputMessage.trim());
        setInputMessage('');
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const analysis = analysisData?.data?.analysis;
    const recommendations = recommendationsData?.data;

    const getInsightIcon = (type: string) => {
        switch (type) {
            case 'positive':
                return <TrendingUp className="w-5 h-5 text-emerald-500" />;
            case 'warning':
                return <AlertCircle className="w-5 h-5 text-amber-500" />;
            default:
                return <Info className="w-5 h-5 text-sky-500" />;
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high':
                return 'bg-red-100 text-red-700 border-red-200';
            case 'medium':
                return 'bg-amber-100 text-amber-700 border-amber-200';
            default:
                return 'bg-sky-100 text-sky-700 border-sky-200';
        }
    };

    return (
        <AdminLayout>
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/30 to-indigo-50/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                    {/* Header */}
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-8 text-white shadow-xl">
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                    <Sparkles className="w-6 h-6" />
                                </div>
                                <div>
                                    <h1 className="text-3xl md:text-4xl font-bold mb-1">AI Assistant</h1>
                                    <p className="text-violet-100 text-sm md:text-base">Quản lý thông minh với Gemini AI</p>
                                </div>
                            </div>
                            <div className="mt-4 flex flex-wrap gap-3">
                                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
                                    <Brain className="w-4 h-4" />
                                    <span className="text-sm font-medium">Phân tích dữ liệu thời gian thực</span>
                                </div>
                                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
                                    <Zap className="w-4 h-4" />
                                    <span className="text-sm font-medium">Gemini 2.0 Flash</span>
                                </div>
                            </div>
                        </div>
                        <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full -mr-36 -mt-36 blur-3xl"></div>
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full -ml-32 -mb-32 blur-3xl"></div>
                    </div>

                    {/* Tab Navigation */}
                    <div className="flex gap-2 bg-white rounded-xl p-2 shadow-sm border border-slate-200">
                        <button
                            onClick={() => setActiveTab('chat')}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${activeTab === 'chat'
                                ? 'bg-violet-600 text-white shadow-md'
                                : 'text-slate-600 hover:bg-slate-100'
                                }`}
                        >
                            <MessageSquare className="w-5 h-5" />
                            <span>Chat với AI</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('insights')}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${activeTab === 'insights'
                                ? 'bg-violet-600 text-white shadow-md'
                                : 'text-slate-600 hover:bg-slate-100'
                                }`}
                        >
                            <BarChart3 className="w-5 h-5" />
                            <span>AI Insights</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('recommendations')}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${activeTab === 'recommendations'
                                ? 'bg-violet-600 text-white shadow-md'
                                : 'text-slate-600 hover:bg-slate-100'
                                }`}
                        >
                            <Target className="w-5 h-5" />
                            <span>Đề xuất</span>
                        </button>
                    </div>

                    {/* Chat Tab */}
                    {activeTab === 'chat' && (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            {/* Messages Area */}
                            <div className="h-[500px] overflow-y-auto p-6 space-y-4">
                                {messages.map((msg, idx) => (
                                    <div
                                        key={idx}
                                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`max-w-[80%] rounded-2xl px-5 py-3 ${msg.role === 'user'
                                                ? 'bg-violet-600 text-white'
                                                : 'bg-slate-100 text-slate-800'
                                                }`}
                                        >
                                            {msg.role === 'assistant' && (
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Sparkles className="w-4 h-4 text-violet-500" />
                                                    <span className="text-xs font-semibold text-violet-600">AI Assistant</span>
                                                </div>
                                            )}
                                            <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                                            <p className={`text-xs mt-2 ${msg.role === 'user' ? 'text-violet-200' : 'text-slate-400'}`}>
                                                {msg.timestamp.toLocaleTimeString('vi-VN')}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                {chatMutation.isPending && (
                                    <div className="flex justify-start">
                                        <div className="bg-slate-100 rounded-2xl px-5 py-3">
                                            <div className="flex items-center gap-2">
                                                <Loader2 className="w-4 h-4 animate-spin text-violet-500" />
                                                <span className="text-sm text-slate-500">AI đang suy nghĩ...</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input Area */}
                            <div className="border-t border-slate-200 p-4 bg-slate-50">
                                <div className="flex gap-3">
                                    <input
                                        type="text"
                                        value={inputMessage}
                                        onChange={(e) => setInputMessage(e.target.value)}
                                        onKeyPress={handleKeyPress}
                                        placeholder="Nhập câu hỏi của bạn..."
                                        className="flex-1 px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm"
                                        disabled={chatMutation.isPending}
                                    />
                                    <button
                                        onClick={handleSendMessage}
                                        disabled={!inputMessage.trim() || chatMutation.isPending}
                                        className="px-6 py-3 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-300 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
                                    >
                                        <Send className="w-5 h-5" />
                                        <span className="hidden sm:inline">Gửi</span>
                                    </button>
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {['Phân tích lịch hẹn hôm nay', 'Top bác sĩ hiệu suất cao', 'Dự đoán doanh thu tuần tới'].map((suggestion) => (
                                        <button
                                            key={suggestion}
                                            onClick={() => setInputMessage(suggestion)}
                                            className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-full text-slate-600 hover:bg-slate-100 transition-colors"
                                        >
                                            {suggestion}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Insights Tab */}
                    {activeTab === 'insights' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h2 className="text-xl font-bold text-slate-900">AI Insights</h2>
                                <button
                                    onClick={() => refetchAnalysis()}
                                    disabled={isAnalyzing}
                                    className="flex items-center gap-2 px-4 py-2 bg-violet-100 text-violet-700 rounded-lg hover:bg-violet-200 transition-colors"
                                >
                                    <RefreshCw className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
                                    Làm mới
                                </button>
                            </div>

                            {isAnalyzing ? (
                                <div className="flex items-center justify-center py-20">
                                    <div className="text-center">
                                        <Loader2 className="w-12 h-12 text-violet-600 animate-spin mx-auto mb-4" />
                                        <p className="text-slate-600">AI đang phân tích dữ liệu...</p>
                                    </div>
                                </div>
                            ) : analysis ? (
                                <div className="grid gap-6">
                                    {/* Summary Card */}
                                    <div className="bg-white rounded-xl border border-slate-200 p-6">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center">
                                                <Brain className="w-5 h-5 text-violet-600" />
                                            </div>
                                            <h3 className="text-lg font-bold text-slate-900">Tóm tắt</h3>
                                        </div>
                                        <p className="text-slate-700 leading-relaxed">{analysis.summary}</p>
                                    </div>

                                    {/* Metrics */}
                                    {analysis.metrics && (
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            {analysis.metrics.appointmentCompletionRate && (
                                                <div className="bg-white rounded-xl border border-slate-200 p-5">
                                                    <p className="text-sm text-slate-500 mb-1">Tỷ lệ hoàn thành lịch hẹn</p>
                                                    <p className="text-2xl font-bold text-emerald-600">{analysis.metrics.appointmentCompletionRate}</p>
                                                </div>
                                            )}
                                            {analysis.metrics.cancellationRate && (
                                                <div className="bg-white rounded-xl border border-slate-200 p-5">
                                                    <p className="text-sm text-slate-500 mb-1">Tỷ lệ hủy</p>
                                                    <p className="text-2xl font-bold text-amber-600">{analysis.metrics.cancellationRate}</p>
                                                </div>
                                            )}
                                            {analysis.metrics.userActivityRate && (
                                                <div className="bg-white rounded-xl border border-slate-200 p-5">
                                                    <p className="text-sm text-slate-500 mb-1">Tỷ lệ user hoạt động</p>
                                                    <p className="text-2xl font-bold text-sky-600">{analysis.metrics.userActivityRate}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Insights List */}
                                    {analysis.insights && analysis.insights.length > 0 && (
                                        <div className="bg-white rounded-xl border border-slate-200 p-6">
                                            <h3 className="text-lg font-bold text-slate-900 mb-4">Chi tiết Insights</h3>
                                            <div className="space-y-4">
                                                {analysis.insights.map((insight: Insight, idx: number) => (
                                                    <div key={idx} className="flex gap-4 p-4 rounded-lg bg-slate-50">
                                                        {getInsightIcon(insight.type)}
                                                        <div>
                                                            <h4 className="font-semibold text-slate-900">{insight.title}</h4>
                                                            <p className="text-sm text-slate-600 mt-1">{insight.description}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-20 bg-white rounded-xl border border-slate-200">
                                    <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                    <p className="text-slate-500">Không thể tải dữ liệu phân tích</p>
                                    <button
                                        onClick={() => refetchAnalysis()}
                                        className="mt-4 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
                                    >
                                        Thử lại
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Recommendations Tab */}
                    {activeTab === 'recommendations' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h2 className="text-xl font-bold text-slate-900">Đề xuất từ AI</h2>
                                <button
                                    onClick={() => refetchRecommendations()}
                                    disabled={isLoadingRecommendations}
                                    className="flex items-center gap-2 px-4 py-2 bg-violet-100 text-violet-700 rounded-lg hover:bg-violet-200 transition-colors"
                                >
                                    <RefreshCw className={`w-4 h-4 ${isLoadingRecommendations ? 'animate-spin' : ''}`} />
                                    Làm mới
                                </button>
                            </div>

                            {isLoadingRecommendations ? (
                                <div className="flex items-center justify-center py-20">
                                    <div className="text-center">
                                        <Loader2 className="w-12 h-12 text-violet-600 animate-spin mx-auto mb-4" />
                                        <p className="text-slate-600">AI đang tạo đề xuất...</p>
                                    </div>
                                </div>
                            ) : recommendations ? (
                                <div className="grid gap-6">
                                    {/* Urgent Actions */}
                                    {recommendations.urgentActions && recommendations.urgentActions.length > 0 && (
                                        <div className="bg-red-50 rounded-xl border border-red-200 p-6">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                                                    <AlertCircle className="w-5 h-5 text-red-600" />
                                                </div>
                                                <h3 className="text-lg font-bold text-red-900">Hành động cần thiết</h3>
                                            </div>
                                            <ul className="space-y-2">
                                                {recommendations.urgentActions.map((action: string, idx: number) => (
                                                    <li key={idx} className="flex items-start gap-2 text-red-800">
                                                        <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
                                                        <span>{action}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Recommendations List */}
                                    {recommendations.recommendations && recommendations.recommendations.length > 0 && (
                                        <div className="grid gap-4">
                                            {recommendations.recommendations.map((rec: Recommendation, idx: number) => (
                                                <div key={idx} className="bg-white rounded-xl border border-slate-200 p-6">
                                                    <div className="flex items-start justify-between mb-3">
                                                        <div className="flex items-center gap-3">
                                                            <Lightbulb className="w-5 h-5 text-amber-500" />
                                                            <h4 className="font-bold text-slate-900">{rec.title}</h4>
                                                        </div>
                                                        <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getPriorityColor(rec.priority)}`}>
                                                            {rec.priority === 'high' ? 'Cao' : rec.priority === 'medium' ? 'Trung bình' : 'Thấp'}
                                                        </span>
                                                    </div>
                                                    <p className="text-slate-600 mb-4">{rec.description}</p>
                                                    <div className="flex flex-wrap gap-3 text-sm">
                                                        <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full">
                                                            {rec.category}
                                                        </span>
                                                        {rec.impact && (
                                                            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full">
                                                                Tác động: {rec.impact}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-20 bg-white rounded-xl border border-slate-200">
                                    <Lightbulb className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                    <p className="text-slate-500">Không thể tải đề xuất</p>
                                    <button
                                        onClick={() => refetchRecommendations()}
                                        className="mt-4 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
                                    >
                                        Thử lại
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
