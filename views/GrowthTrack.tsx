import React, { useState, useEffect } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';

interface GrowthTrackProps {
    userId: string;
    onBack: () => void;
}

interface WeekStats {
    totalQuestions: number;
    correctCount: number;
    accuracy: number;
    studyMinutes: number;
    knowledgePointsMastered: string[];
    errorTypeDistribution: { type: string; count: number; emoji: string }[];
    dailyAccuracy: { day: string; accuracy: number }[];
    selfAssessmentAccuracy: number; // 自评准确率
}

// 模拟数据（实际应从数据库获取）
const mockWeekStats: WeekStats = {
    totalQuestions: 42,
    correctCount: 33,
    accuracy: 78,
    studyMinutes: 150,
    knowledgePointsMastered: ['分数加减法', '小数运算'],
    errorTypeDistribution: [
        { type: '概念不懂', count: 3, emoji: '🧠' },
        { type: '算错了', count: 4, emoji: '🔢' },
        { type: '没看清题', count: 2, emoji: '👀' },
        { type: '粗心写错', count: 1, emoji: '✍️' },
    ],
    dailyAccuracy: [
        { day: '周一', accuracy: 70 },
        { day: '周二', accuracy: 75 },
        { day: '周三', accuracy: 80 },
        { day: '周四', accuracy: 85 },
        { day: '周五', accuracy: 78 },
    ],
    selfAssessmentAccuracy: 72,
};

/**
 * 成长轨迹页 - 可视化展示学习成长
 */
export const GrowthTrack: React.FC<GrowthTrackProps> = ({ userId, onBack }) => {
    const [stats, setStats] = useState<WeekStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // TODO: 从数据库加载真实数据
        setTimeout(() => {
            setStats(mockWeekStats);
            setLoading(false);
        }, 500);
    }, [userId]);

    if (loading) {
        return (
            <div className="min-h-screen bg-brand-bg flex items-center justify-center">
                <div className="text-center">
                    <div className="text-4xl mb-4 animate-bounce">📊</div>
                    <p className="text-gray-600">加载成长数据...</p>
                </div>
            </div>
        );
    }

    if (!stats) return null;

    const accuracyChange = stats.dailyAccuracy.length >= 2
        ? stats.dailyAccuracy[stats.dailyAccuracy.length - 1].accuracy - stats.dailyAccuracy[0].accuracy
        : 0;

    return (
        <div className="min-h-screen bg-gradient-to-b from-teal-50 to-cyan-50 p-4 pb-20">
            {/* Header */}
            <header className="flex items-center justify-between mb-6">
                <button onClick={onBack} className="w-10 h-10 bg-white rounded-full shadow flex items-center justify-center">
                    <span className="text-gray-600">←</span>
                </button>
                <h1 className="text-xl font-black text-teal-800">📈 成长轨迹</h1>
                <div className="w-10"></div>
            </header>

            {/* 本周概览 */}
            <Card className="mb-4 bg-gradient-to-r from-teal-500 to-cyan-500 text-white">
                <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <span>🎯</span>
                    <span>本周概览</span>
                </h2>
                <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                        <div className="text-3xl font-black">{stats.totalQuestions}</div>
                        <div className="text-xs opacity-80">完成题目</div>
                    </div>
                    <div className="text-center">
                        <div className="text-3xl font-black">{stats.accuracy}%</div>
                        <div className="text-xs opacity-80">正确率</div>
                    </div>
                    <div className="text-center">
                        <div className="text-3xl font-black">{Math.floor(stats.studyMinutes / 60)}h</div>
                        <div className="text-xs opacity-80">学习时长</div>
                    </div>
                </div>
                {accuracyChange !== 0 && (
                    <div className={`mt-3 text-center text-sm ${accuracyChange > 0 ? 'text-green-200' : 'text-red-200'}`}>
                        {accuracyChange > 0 ? '📈' : '📉'}
                        正确率比周初 {accuracyChange > 0 ? '+' : ''}{accuracyChange}%
                    </div>
                )}
            </Card>

            {/* 正确率趋势 */}
            <Card className="mb-4">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <span>📊</span>
                    <span>正确率趋势</span>
                </h3>
                <div className="flex items-end justify-between h-32 px-2">
                    {stats.dailyAccuracy.map((day, idx) => (
                        <div key={idx} className="flex flex-col items-center">
                            <div
                                className="w-8 bg-gradient-to-t from-teal-500 to-cyan-400 rounded-t-lg transition-all"
                                style={{ height: `${day.accuracy}%` }}
                            >
                                <div className="text-xs text-white text-center pt-1 font-bold">
                                    {day.accuracy}
                                </div>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">{day.day}</div>
                        </div>
                    ))}
                </div>
            </Card>

            {/* 自评准确度 */}
            <Card className="mb-4">
                <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <span>🎯</span>
                    <span>自评准确度</span>
                </h3>
                <div className="flex items-center gap-4">
                    <div className="flex-1">
                        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all"
                                style={{ width: `${stats.selfAssessmentAccuracy}%` }}
                            />
                        </div>
                    </div>
                    <div className="text-xl font-black text-purple-600">{stats.selfAssessmentAccuracy}%</div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                    说"稳了"时有 {stats.selfAssessmentAccuracy}% 确实答对了
                </p>
            </Card>

            {/* 错误类型分布 */}
            <Card className="mb-4">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <span>😈</span>
                    <span>错误类型分布</span>
                </h3>
                <div className="space-y-3">
                    {stats.errorTypeDistribution.map((error, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                            <div className="text-2xl">{error.emoji}</div>
                            <div className="flex-1">
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-700">{error.type}</span>
                                    <span className="text-gray-500">{error.count}次</span>
                                </div>
                                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-red-400 to-orange-400 rounded-full"
                                        style={{ width: `${(error.count / 10) * 100}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>

            {/* 掌握的知识点 */}
            <Card className="mb-4">
                <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <span>✅</span>
                    <span>本周攻克的知识点</span>
                </h3>
                <div className="flex flex-wrap gap-2">
                    {stats.knowledgePointsMastered.map((kp, idx) => (
                        <span
                            key={idx}
                            className="px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-medium"
                        >
                            ✓ {kp}
                        </span>
                    ))}
                </div>
            </Card>

            {/* 返回按钮 */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white">
                <Button onClick={onBack} variant="primary" size="lg" className="w-full">
                    返回主页
                </Button>
            </div>
        </div>
    );
};
