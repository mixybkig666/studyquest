import React, { useState } from 'react';
import { Button } from '../components/Button';

interface WeeklyReportProps {
    userId: string;
    weekRange: string; // e.g., "1.15 - 1.21"
    onClose: () => void;
}

interface ReportData {
    weekRange: string;
    questionsCompleted: number;
    questionsDelta: number;
    accuracy: number;
    accuracyDelta: number;
    studyHours: number;
    achievements: {
        type: 'knowledge' | 'monster' | 'streak';
        title: string;
        emoji: string;
    }[];
    weakPoints: { name: string; errorCount: number }[];
    suggestion: string;
}

// 模拟数据
const mockReportData: ReportData = {
    weekRange: '1.15 - 1.21',
    questionsCompleted: 42,
    questionsDelta: 12,
    accuracy: 78,
    accuracyDelta: 5,
    studyHours: 2.5,
    achievements: [
        { type: 'knowledge', title: '分数加减法', emoji: '✅' },
        { type: 'monster', title: '马虎怪 ×3', emoji: '👀' },
        { type: 'streak', title: '连续5天学习', emoji: '🔥' },
    ],
    weakPoints: [
        { name: '速度公式', errorCount: 3 },
    ],
    suggestion: '继续巩固分数运算，可以开始分数应用题',
};

/**
 * 周报组件 - 每周学习总结
 * 以"信封"动画展示，让孩子有期待感
 */
export const WeeklyReport: React.FC<WeeklyReportProps> = ({ userId, weekRange, onClose }) => {
    const [isOpened, setIsOpened] = useState(false);
    const [report] = useState<ReportData>(mockReportData);

    // 信封开启动画
    if (!isOpened) {
        return (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
                <div
                    className="bg-gradient-to-br from-amber-100 to-orange-100 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl cursor-pointer transform hover:scale-105 transition-all"
                    onClick={() => setIsOpened(true)}
                >
                    <div className="text-6xl mb-4 animate-bounce">💌</div>
                    <h2 className="text-2xl font-black text-amber-800 mb-2">本周学习报告</h2>
                    <p className="text-amber-600 mb-6">{weekRange}</p>
                    <div className="text-sm text-amber-500 animate-pulse">
                        点击打开 →
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-gradient-to-b from-teal-50 to-cyan-50 z-50 overflow-y-auto">
            <div className="min-h-screen p-4 pb-20">
                {/* Header */}
                <header className="flex items-center justify-between mb-6">
                    <button onClick={onClose} className="w-10 h-10 bg-white rounded-full shadow flex items-center justify-center">
                        <span className="text-gray-600">×</span>
                    </button>
                    <h1 className="text-lg font-black text-teal-800">📊 本周学习报告</h1>
                    <div className="w-10"></div>
                </header>

                {/* 日期 */}
                <div className="text-center mb-6">
                    <span className="px-4 py-2 bg-teal-100 text-teal-700 rounded-full text-sm font-bold">
                        {report.weekRange}
                    </span>
                </div>

                {/* 完成情况 */}
                <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <span>🎯</span>
                        <span>完成情况</span>
                    </h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-gray-600">练习题目</span>
                            <div className="flex items-center gap-2">
                                <span className="text-2xl font-black text-gray-800">{report.questionsCompleted}</span>
                                {report.questionsDelta !== 0 && (
                                    <span className={`text-sm ${report.questionsDelta > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                        {report.questionsDelta > 0 ? '↑' : '↓'}{Math.abs(report.questionsDelta)}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-gray-600">正确率</span>
                            <div className="flex items-center gap-2">
                                <span className="text-2xl font-black text-gray-800">{report.accuracy}%</span>
                                {report.accuracyDelta !== 0 && (
                                    <span className={`text-sm ${report.accuracyDelta > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                        {report.accuracyDelta > 0 ? '↑' : '↓'}{Math.abs(report.accuracyDelta)}%
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-gray-600">学习时长</span>
                            <span className="text-2xl font-black text-gray-800">{report.studyHours}小时</span>
                        </div>
                    </div>
                </div>

                {/* 本周成就 */}
                <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <span>🏆</span>
                        <span>本周成就</span>
                    </h3>
                    <div className="space-y-3">
                        {report.achievements.map((achievement, idx) => (
                            <div key={idx} className="flex items-center gap-3 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl">
                                <span className="text-2xl">{achievement.emoji}</span>
                                <span className="font-medium text-gray-700">{achievement.title}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 需要加强 */}
                {report.weakPoints.length > 0 && (
                    <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
                        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <span>⚠️</span>
                            <span>需要加强</span>
                        </h3>
                        <div className="space-y-2">
                            {report.weakPoints.map((point, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-red-50 rounded-xl">
                                    <span className="text-red-700 font-medium">{point.name}</span>
                                    <span className="text-red-500 text-sm">错了{point.errorCount}次</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 下周建议 */}
                <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl p-5 shadow-sm mb-4 text-white">
                    <h3 className="font-bold mb-2 flex items-center gap-2">
                        <span>💡</span>
                        <span>下周建议</span>
                    </h3>
                    <p className="text-blue-100 leading-relaxed">{report.suggestion}</p>
                </div>

                {/* 关闭按钮 */}
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white">
                    <Button onClick={onClose} variant="primary" size="lg" className="w-full">
                        知道了 ✨
                    </Button>
                </div>
            </div>
        </div>
    );
};
