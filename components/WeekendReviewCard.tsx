import React from 'react';
import { WeeklyReviewSummary } from '../types';
import { Button } from './Button';

interface WeekendReviewCardProps {
    summary: WeeklyReviewSummary;
    onGeneratePractice: () => void;
    onSkip: () => void;
    isLoading?: boolean;
}

export const WeekendReviewCard: React.FC<WeekendReviewCardProps> = ({
    summary,
    onGeneratePractice,
    onSkip,
    isLoading = false,
}) => {
    const hasWeakPoints = summary.weak_points.length > 0;
    const hasCarryover = summary.carryover_points?.length > 0;

    if (!hasWeakPoints && !hasCarryover) {
        return null; // 没有薄弱点和遗留项就不显示
    }

    const getSeverityColor = (errorCount: number) => {
        if (errorCount >= 3) return 'text-red-500';
        if (errorCount >= 2) return 'text-yellow-500';
        return 'text-orange-400';
    };

    const getSeverityDot = (errorCount: number) => {
        if (errorCount >= 3) return '🔴';
        if (errorCount >= 2) return '🟡';
        return '🟠';
    };

    return (
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-3xl p-5 border border-indigo-100 shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <span className="text-2xl">📅</span>
                    <h3 className="text-lg font-bold text-gray-800">本周学习整理</h3>
                </div>
                <span className="text-sm text-indigo-600 bg-indigo-100 px-3 py-1 rounded-full">
                    周末
                </span>
            </div>

            {/* Carryover Section - 遗留项优先显示 */}
            {hasCarryover && (
                <div className="mb-4 bg-amber-50 rounded-xl p-3 border border-amber-200">
                    <div className="flex items-center gap-2 mb-2">
                        <span>⚠️</span>
                        <span className="text-sm font-bold text-amber-700">持续未掌握（需重点复习）</span>
                    </div>
                    <div className="space-y-1.5">
                        {summary.carryover_points.map((point, index) => (
                            <div
                                key={`carryover-${index}`}
                                className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 text-sm"
                            >
                                <span>🔥</span>
                                <span className="flex-1 text-gray-800 font-medium">{point.knowledge_point}</span>
                                <span className="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                                    第 {point.weeks_unmastered} 周
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* This Week's Weak Points */}
            {hasWeakPoints && (
                <>
                    <p className="text-gray-600 text-sm mb-3">
                        本周新增 <span className="font-bold text-indigo-600">
                            {summary.weak_points.filter(p => p.is_new).length}
                        </span> 个薄弱点：
                    </p>
                    <div className="space-y-2 mb-5">
                        {summary.weak_points.slice(0, 5).map((point, index) => (
                            <div
                                key={index}
                                className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 shadow-sm"
                            >
                                <span>{getSeverityDot(point.error_count)}</span>
                                <span className="flex-1 text-gray-800 font-medium">
                                    {point.knowledge_point}
                                    {point.is_new && (
                                        <span className="ml-2 text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded">新</span>
                                    )}
                                </span>
                                <span className={`text-sm ${getSeverityColor(point.error_count)}`}>
                                    出错 {point.error_count} 次
                                </span>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
                <Button
                    onClick={onGeneratePractice}
                    disabled={isLoading}
                    className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
                >
                    {isLoading ? (
                        <span className="flex items-center gap-2">
                            <span className="animate-spin">⏳</span> 生成中...
                        </span>
                    ) : (
                        <span className="flex items-center gap-2">
                            🎯 生成巩固练习
                            <span className="text-xs opacity-80">约{summary.suggested_practice_minutes}分钟</span>
                        </span>
                    )}
                </Button>
                <Button
                    onClick={onSkip}
                    variant="secondary"
                    className="px-6"
                    disabled={isLoading}
                >
                    ⏭️ 本周跳过
                </Button>
            </div>
        </div>
    );
};

