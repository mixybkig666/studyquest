import React from 'react';

interface EmotionRecordProps {
    taskId: string;
    scorePercentage: number;
    onSubmit: (emotion: EmotionData) => void;
    onSkip: () => void;
}

export interface EmotionData {
    taskId: string;
    emotion: 'happy' | 'calm' | 'tired' | 'frustrated';
    scorePercentage: number;
}

const EMOTION_OPTIONS = [
    { id: 'happy', emoji: '😊', label: '开心', desc: '题目有趣，做得顺利' },
    { id: 'calm', emoji: '😌', label: '平静', desc: '正常发挥，没什么特别' },
    { id: 'tired', emoji: '😤', label: '有点累', desc: '题目有点多或有点难' },
    { id: 'frustrated', emoji: '😢', label: '沮丧', desc: '错太多了，有点不开心' },
] as const;

export const EmotionRecord: React.FC<EmotionRecordProps> = ({
    taskId,
    scorePercentage,
    onSubmit,
    onSkip,
}) => {
    // 点选即触发，不需要额外状态
    const handleSelect = (emotion: EmotionData['emotion']) => {
        onSubmit({
            taskId,
            emotion,
            scorePercentage,
        });
    };

    return (
        <div className="mb-4 bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-2xl p-4 animate-fade-in">
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-blue-800 flex items-center gap-2">
                    <span>💭</span>
                    <span>今天做题的感觉怎么样？</span>
                </h3>
                <button
                    onClick={onSkip}
                    className="text-blue-400 hover:text-blue-600 text-sm"
                >
                    跳过
                </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
                {EMOTION_OPTIONS.map(option => (
                    <button
                        key={option.id}
                        onClick={() => handleSelect(option.id)}
                        className="py-3 px-3 rounded-xl border-2 text-left transition-all bg-white border-gray-200 text-gray-700 hover:border-blue-400 hover:bg-blue-50 hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xl">{option.emoji}</span>
                            <span className="font-bold">{option.label}</span>
                        </div>
                        <div className="text-xs text-gray-500">{option.desc}</div>
                    </button>
                ))}
            </div>

            <p className="text-center text-xs text-blue-400 mt-3">
                点选心情，帮助 AI 更好地安排学习节奏 🎵
            </p>
        </div>
    );
};
