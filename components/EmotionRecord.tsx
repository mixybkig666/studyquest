import React, { useState } from 'react';

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
    const [selectedEmotion, setSelectedEmotion] = useState<EmotionData['emotion'] | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!selectedEmotion) return;
        setIsSubmitting(true);
        await onSubmit({
            taskId,
            emotion: selectedEmotion,
            scorePercentage,
        });
        setIsSubmitting(false);
    };

    return (
        <div className="mt-4 bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-2xl p-4 animate-fade-in">
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

            <div className="grid grid-cols-2 gap-2 mb-4">
                {EMOTION_OPTIONS.map(option => (
                    <button
                        key={option.id}
                        onClick={() => setSelectedEmotion(option.id)}
                        className={`py-3 px-3 rounded-xl border-2 text-left transition-all
              ${selectedEmotion === option.id
                                ? 'bg-blue-100 border-blue-400 text-blue-800 scale-[1.02]'
                                : 'bg-white border-gray-200 text-gray-700 hover:border-blue-300'}`}
                    >
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xl">{option.emoji}</span>
                            <span className="font-bold">{option.label}</span>
                        </div>
                        <div className="text-xs text-gray-500">{option.desc}</div>
                    </button>
                ))}
            </div>

            {selectedEmotion && (
                <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="w-full py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
                >
                    {isSubmitting ? '记录中...' : '记录心情 ✓'}
                </button>
            )}

            <p className="text-center text-xs text-blue-400 mt-2">
                记录心情帮助 AI 更好地安排学习节奏 🎵
            </p>
        </div>
    );
};
