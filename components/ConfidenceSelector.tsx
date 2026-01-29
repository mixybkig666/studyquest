import React from 'react';

interface ConfidenceSelectorProps {
    onSelect: (confidence: 'confident' | 'unsure' | 'guessing') => void;
}

/**
 * 答题后自评组件 - 在揭晓答案前让学生评估自己的把握程度
 * 用于突破"反馈外包"机制，建立内部评价体系
 */
export const ConfidenceSelector: React.FC<ConfidenceSelectorProps> = ({ onSelect }) => {
    const options = [
        {
            value: 'confident' as const,
            emoji: '😎',
            label: '稳了',
            desc: '我很确定答案对',
            bgColor: 'bg-green-50',
            borderColor: 'border-green-300',
            hoverBorder: 'hover:border-green-400'
        },
        {
            value: 'unsure' as const,
            emoji: '🤔',
            label: '不太确定',
            desc: '可能对也可能错',
            bgColor: 'bg-yellow-50',
            borderColor: 'border-yellow-300',
            hoverBorder: 'hover:border-yellow-400'
        },
        {
            value: 'guessing' as const,
            emoji: '😰',
            label: '靠蒙',
            desc: '完全不确定',
            bgColor: 'bg-red-50',
            borderColor: 'border-red-300',
            hoverBorder: 'hover:border-red-400'
        },
    ];

    return (
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-2xl p-4 animate-fade-in">
            <div className="flex items-center justify-center gap-2 mb-3">
                <span className="text-lg">📊</span>
                <h3 className="font-bold text-indigo-800">你觉得这道题...</h3>
            </div>

            <div className="flex gap-2">
                {options.map(option => (
                    <button
                        key={option.value}
                        onClick={() => onSelect(option.value)}
                        className={`flex-1 py-3 px-2 rounded-xl border-2 transition-all flex flex-col items-center gap-1
                            ${option.bgColor} ${option.borderColor} ${option.hoverBorder}
                            hover:scale-105 active:scale-95`}
                    >
                        <span className="text-2xl">{option.emoji}</span>
                        <span className="font-bold text-gray-800 text-sm">{option.label}</span>
                    </button>
                ))}
            </div>

            <p className="text-center text-xs text-indigo-400 mt-3">
                选择后揭晓答案 👆
            </p>
        </div>
    );
};

export type ConfidenceLevel = 'confident' | 'unsure' | 'guessing';
