import React, { useState } from 'react';

interface ErrorAttributionProps {
    questionId: string;
    questionText: string;
    onSubmit: (attribution: ErrorAttributionData) => void;
    onSkip: () => void;
}

export interface ErrorAttributionData {
    questionId: string;
    errorType: 'concept' | 'calculation' | 'reading' | 'careless' | 'unknown';
}

const ERROR_OPTIONS = [
    {
        id: 'concept',
        emoji: '🤔',
        label: '概念不懂',
        desc: '不太理解这个知识点',
        color: 'purple'
    },
    {
        id: 'calculation',
        emoji: '✏️',
        label: '算错了',
        desc: '方法对但计算出错',
        color: 'blue'
    },
    {
        id: 'reading',
        emoji: '👀',
        label: '没看清题',
        desc: '审题不仔细',
        color: 'orange'
    },
    {
        id: 'careless',
        emoji: '😅',
        label: '粗心写错',
        desc: '知道答案但写错了',
        color: 'green'
    },
    {
        id: 'unknown',
        emoji: '❓',
        label: '不知道',
        desc: '我也不清楚为什么错',
        color: 'gray'
    },
] as const;

export const ErrorAttribution: React.FC<ErrorAttributionProps> = ({
    questionId,
    questionText,
    onSubmit,
    onSkip,
}) => {
    const [selectedType, setSelectedType] = useState<ErrorAttributionData['errorType'] | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSelect = async (type: ErrorAttributionData['errorType']) => {
        setSelectedType(type);
        setIsSubmitting(true);
        await onSubmit({ questionId, errorType: type });
        setIsSubmitting(false);
    };

    return (
        <div className="mt-4 bg-gradient-to-br from-red-50 to-orange-50 border border-red-200 rounded-2xl p-4 animate-fade-in">
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-red-700 flex items-center gap-2">
                    <span>💭</span>
                    <span>这道题错在哪了？</span>
                </h3>
                <button
                    onClick={onSkip}
                    className="text-red-400 hover:text-red-600 text-sm"
                >
                    跳过
                </button>
            </div>

            {/* 题目预览 */}
            <div className="mb-3 py-2 px-3 bg-white/50 rounded-lg text-sm text-gray-600 line-clamp-2">
                {questionText.length > 50 ? questionText.substring(0, 50) + '...' : questionText}
            </div>

            <div className="space-y-2">
                {ERROR_OPTIONS.map(option => (
                    <button
                        key={option.id}
                        onClick={() => handleSelect(option.id)}
                        disabled={isSubmitting}
                        className={`w-full py-3 px-4 rounded-xl border-2 text-left transition-all flex items-center gap-3
              ${selectedType === option.id
                                ? 'bg-red-100 border-red-400 scale-[1.02]'
                                : 'bg-white border-gray-200 hover:border-red-300'
                            }
              ${isSubmitting ? 'opacity-50' : ''}`}
                    >
                        <span className="text-xl">{option.emoji}</span>
                        <div className="flex-1">
                            <div className="font-bold text-gray-800">{option.label}</div>
                            <div className="text-xs text-gray-500">{option.desc}</div>
                        </div>
                    </button>
                ))}
            </div>

            <p className="text-center text-xs text-red-400 mt-3">
                了解错误原因，帮助你更快进步 📈
            </p>
        </div>
    );
};
