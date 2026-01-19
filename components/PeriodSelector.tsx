import React from 'react';
import { LearningPeriod } from '../types';
import { getPeriodName } from '../services/learningModeService';

interface PeriodSelectorProps {
    value: LearningPeriod;
    onChange: (period: LearningPeriod) => void;
    className?: string;
}

const PERIOD_CONFIG: Record<LearningPeriod, { icon: string; subtitle: string; color: string }> = {
    'school': {
        icon: '📚',
        subtitle: '日常轻量',
        color: 'from-blue-500 to-blue-600',
    },
    'exam_prep': {
        icon: '📝',
        subtitle: '备考强化',
        color: 'from-orange-500 to-orange-600',
    },
    'vacation': {
        icon: '🌴',
        subtitle: '深度学习',
        color: 'from-green-500 to-green-600',
    },
};

export const PeriodSelector: React.FC<PeriodSelectorProps> = ({
    value,
    onChange,
    className = ''
}) => {
    const periods: LearningPeriod[] = ['school', 'exam_prep', 'vacation'];

    return (
        <div className={`space-y-4 ${className}`}>
            <div className="flex items-center gap-2 mb-2">
                <span className="text-lg font-semibold text-gray-800">当前学期状态</span>
            </div>

            <div className="grid grid-cols-3 gap-3">
                {periods.map((period) => {
                    const config = PERIOD_CONFIG[period];
                    const isSelected = value === period;

                    return (
                        <button
                            key={period}
                            onClick={() => onChange(period)}
                            className={`
                                relative p-4 rounded-2xl border-2 transition-all duration-300
                                flex flex-col items-center gap-2 text-center
                                ${isSelected
                                    ? `border-transparent bg-gradient-to-br ${config.color} text-white shadow-lg transform scale-105`
                                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                                }
                            `}
                        >
                            {/* 选中标记 */}
                            {isSelected && (
                                <div className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full shadow-md flex items-center justify-center">
                                    <span className="text-green-500 text-sm">✓</span>
                                </div>
                            )}

                            {/* 图标 */}
                            <span className="text-3xl">{config.icon}</span>

                            {/* 标题 */}
                            <span className={`font-bold text-base ${isSelected ? 'text-white' : 'text-gray-800'}`}>
                                {getPeriodName(period)}
                            </span>

                            {/* 副标题 */}
                            <span className={`text-xs ${isSelected ? 'text-white/80' : 'text-gray-500'}`}>
                                {config.subtitle}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* 提示信息 */}
            <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 rounded-xl p-3">
                <span className="text-lg">💡</span>
                <span>周末和法定节假日会自动调整学习强度</span>
            </div>
        </div>
    );
};
