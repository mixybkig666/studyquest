/**
 * TodayIntentCard - 今日教学意图卡片
 * 
 * 展示 Master Agent 的决策结果给家长：
 * - 今日教学意图类型（巩固/验证/挑战/轻松）
 * - 一句话总结
 * - 深度洞察
 * - 可执行建议
 */

import React from 'react';
import {
    BookIcon,
    TargetIcon,
    LightbulbIcon,
    QuizIcon,
    DifficultyDot,
} from './IconLibrary';

// Intent 配置
const INTENT_CONFIG = {
    reinforce: {
        icon: '📚',
        label: '巩固练习',
        color: 'blue',
        bgGradient: 'from-blue-50 to-blue-100',
        borderColor: 'border-blue-200',
        textColor: 'text-blue-700',
        badgeColor: 'bg-blue-100 text-blue-700'
    },
    verify: {
        icon: '🔍',
        label: '验证检测',
        color: 'purple',
        bgGradient: 'from-purple-50 to-purple-100',
        borderColor: 'border-purple-200',
        textColor: 'text-purple-700',
        badgeColor: 'bg-purple-100 text-purple-700'
    },
    challenge: {
        icon: '🚀',
        label: '挑战提升',
        color: 'orange',
        bgGradient: 'from-orange-50 to-orange-100',
        borderColor: 'border-orange-200',
        textColor: 'text-orange-700',
        badgeColor: 'bg-orange-100 text-orange-700'
    },
    lighten: {
        icon: '🌿',
        label: '轻松模式',
        color: 'green',
        bgGradient: 'from-green-50 to-green-100',
        borderColor: 'border-green-200',
        textColor: 'text-green-700',
        badgeColor: 'bg-green-100 text-green-700'
    },
    introduce: {
        icon: '✨',
        label: '新知识',
        color: 'teal',
        bgGradient: 'from-teal-50 to-teal-100',
        borderColor: 'border-teal-200',
        textColor: 'text-teal-700',
        badgeColor: 'bg-teal-100 text-teal-700'
    },
    pause: {
        icon: '☕',
        label: '休息调整',
        color: 'gray',
        bgGradient: 'from-gray-50 to-gray-100',
        borderColor: 'border-gray-200',
        textColor: 'text-gray-600',
        badgeColor: 'bg-gray-100 text-gray-600'
    }
} as const;

type IntentType = keyof typeof INTENT_CONFIG;

interface ParentSummary {
    headline: string;
    insight: string;
    action: string;
}

interface TodayIntentCardProps {
    intentType: IntentType;
    parentSummary: ParentSummary;
    questionCount?: number;
    difficultyLevel?: 'low' | 'medium' | 'high';
    focusPoints?: string[];
    isLoading?: boolean;
}

export const TodayIntentCard: React.FC<TodayIntentCardProps> = ({
    intentType,
    parentSummary,
    questionCount,
    difficultyLevel,
    focusPoints,
    isLoading = false
}) => {
    const config = INTENT_CONFIG[intentType] || INTENT_CONFIG.reinforce;

    if (isLoading) {
        return (
            <div className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                    <div className="h-6 bg-gray-200 rounded w-24"></div>
                </div>
                <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-full mb-4"></div>
                <div className="h-16 bg-gray-100 rounded-xl"></div>
            </div>
        );
    }

    const difficultyLabels = {
        low: { label: '简单', level: 'low' as const },
        medium: { label: '适中', level: 'medium' as const },
        high: { label: '挑战', level: 'high' as const }
    };

    return (
        <div className={`bg-gradient-to-br ${config.bgGradient} rounded-2xl border ${config.borderColor} p-5 transition-all hover:shadow-md`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <span className="text-3xl">{config.icon}</span>
                    <span className={`px-3 py-1.5 rounded-full text-sm font-bold ${config.badgeColor}`}>
                        {config.label}
                    </span>
                </div>

                {/* Meta info */}
                <div className="flex items-center gap-2 text-xs text-gray-500">
                    {questionCount && questionCount > 0 && (
                        <span className="bg-white/60 px-2 py-1 rounded-full flex items-center gap-1">
                            <QuizIcon size="sm" /> {questionCount}题
                        </span>
                    )}
                    {difficultyLevel && (
                        <span className="bg-white/60 px-2 py-1 rounded-full flex items-center gap-1">
                            <DifficultyDot level={difficultyLabels[difficultyLevel].level} size="sm" /> {difficultyLabels[difficultyLevel].label}
                        </span>
                    )}
                </div>
            </div>

            {/* Headline */}
            <h3 className={`font-bold text-lg mb-2 ${config.textColor}`}>
                {parentSummary.headline}
            </h3>

            {/* Insight */}
            <p className="text-gray-600 text-sm mb-4 leading-relaxed">
                {parentSummary.insight}
            </p>

            {/* Focus Points */}
            {focusPoints && focusPoints.length > 0 && (
                <div className="mb-4">
                    <div className="text-xs text-gray-500 mb-1.5">今日聚焦:</div>
                    <div className="flex flex-wrap gap-1.5">
                        {focusPoints.slice(0, 3).map((point, index) => (
                            <span
                                key={index}
                                className="bg-white/70 text-gray-700 text-xs px-2 py-1 rounded-full border border-gray-200"
                            >
                                {point}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Action - 可执行建议 */}
            <div className="bg-white/80 backdrop-blur rounded-xl p-4 border border-white">
                <div className="flex items-start gap-2">
                    <LightbulbIcon size="md" className="icon-secondary shrink-0" />
                    <div>
                        <div className="text-xs text-gray-500 font-medium mb-1">今天你可以这样做</div>
                        <p className="text-gray-700 text-sm font-medium leading-relaxed">
                            {parentSummary.action}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

// 简化版：只显示核心信息
export const TodayIntentBadge: React.FC<{ intentType: IntentType; headline?: string }> = ({
    intentType,
    headline
}) => {
    const config = INTENT_CONFIG[intentType] || INTENT_CONFIG.reinforce;

    return (
        <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl ${config.badgeColor}`}>
            <span>{config.icon}</span>
            <span className="font-medium text-sm">{headline || config.label}</span>
        </div>
    );
};

export default TodayIntentCard;
