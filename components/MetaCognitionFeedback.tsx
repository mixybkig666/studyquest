import React, { useState } from 'react';
import { Button } from './Button';

interface MetaCognitionFeedbackProps {
    taskId: string;
    onSubmit: (feedback: FeedbackData) => void;
    onSkip: () => void;
}

export interface FeedbackData {
    taskId: string;
    overallRating: 'great' | 'ok' | 'bad' | null;
    positiveTags: string[];
    negativeTags: string[];
}

const POSITIVE_OPTIONS = [
    { id: 'targeted', emoji: '🎯', label: '精准', desc: '考到了我不懂的地方' },
    { id: 'challenge', emoji: '🎢', label: '适度', desc: '难度刚好，动脑能做对' },
    { id: 'insight', emoji: '💡', label: '启发', desc: '学到了新方法/新思路' },
    { id: 'clear', emoji: '📝', label: '清晰', desc: '题目和解析都很好懂' },
];

const NEGATIVE_OPTIONS = [
    { id: 'too_easy', emoji: '😴', label: '太简单', desc: '一眼看出答案' },
    { id: 'too_hard', emoji: '🤯', label: '太难', desc: '完全没思路' },
    { id: 'irrelevant', emoji: '🤷', label: '不相关', desc: '跟我的学习内容没关系' },
    { id: 'buggy', emoji: '🐛', label: '有错误', desc: '题目或答案有问题' },
];

export const MetaCognitionFeedback: React.FC<MetaCognitionFeedbackProps> = ({
    taskId,
    onSubmit,
    onSkip,
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [overallRating, setOverallRating] = useState<'great' | 'ok' | 'bad' | null>(null);
    const [positiveTags, setPositiveTags] = useState<string[]>([]);
    const [negativeTags, setNegativeTags] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const toggleTag = (tag: string, isPositive: boolean) => {
        if (isPositive) {
            setPositiveTags(prev =>
                prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
            );
        } else {
            setNegativeTags(prev =>
                prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
            );
        }
    };

    const handleSubmit = async () => {
        if (!overallRating) return;
        setIsSubmitting(true);
        await onSubmit({
            taskId,
            overallRating,
            positiveTags,
            negativeTags,
        });
        setIsSubmitting(false);
    };

    if (!isExpanded) {
        return (
            <button
                onClick={() => setIsExpanded(true)}
                className="w-full mt-4 py-3 px-4 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl text-purple-700 font-medium text-sm flex items-center justify-center gap-2 transition-colors"
            >
                <span>🧠</span>
                <span>给 AI 出题打个分？</span>
                <span className="text-purple-400 text-xs">(可选)</span>
            </button>
        );
    }

    return (
        <div className="mt-4 bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-2xl p-4 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-purple-800 flex items-center gap-2">
                    <span>🧠</span>
                    <span>AI 出题反馈</span>
                </h3>
                <button
                    onClick={() => setIsExpanded(false)}
                    className="text-purple-400 hover:text-purple-600 w-6 h-6 flex items-center justify-center"
                >
                    ✕
                </button>
            </div>

            {/* 总体评价 */}
            <div className="mb-4">
                <p className="text-sm text-purple-700 font-medium mb-2">1️⃣ 这组题目出得怎么样？</p>
                <div className="flex gap-2">
                    {[
                        { value: 'great' as const, emoji: '⭐', label: '很棒' },
                        { value: 'ok' as const, emoji: '👌', label: '一般' },
                        { value: 'bad' as const, emoji: '😕', label: '不行' },
                    ].map(option => (
                        <button
                            key={option.value}
                            onClick={() => setOverallRating(option.value)}
                            className={`flex-1 py-2 px-3 rounded-xl border-2 text-sm font-medium transition-all flex items-center justify-center gap-1.5
                ${overallRating === option.value
                                    ? 'bg-purple-600 border-purple-600 text-white'
                                    : 'bg-white border-purple-200 text-purple-700 hover:border-purple-400'}`}
                        >
                            <span>{option.emoji}</span>
                            <span>{option.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* 好的地方 */}
            {overallRating && (
                <div className="mb-4 animate-fade-in">
                    <p className="text-sm text-purple-700 font-medium mb-2">2️⃣ 觉得好在哪里？<span className="text-purple-400 text-xs ml-1">(多选)</span></p>
                    <div className="grid grid-cols-2 gap-2">
                        {POSITIVE_OPTIONS.map(option => (
                            <button
                                key={option.id}
                                onClick={() => toggleTag(option.id, true)}
                                className={`py-2 px-3 rounded-xl border-2 text-left text-sm transition-all
                  ${positiveTags.includes(option.id)
                                        ? 'bg-green-100 border-green-400 text-green-800'
                                        : 'bg-white border-gray-200 text-gray-700 hover:border-green-300'}`}
                            >
                                <div className="flex items-center gap-1.5">
                                    <span>{option.emoji}</span>
                                    <span className="font-medium">{option.label}</span>
                                </div>
                                <div className="text-xs text-gray-500 mt-0.5">{option.desc}</div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* 不好的地方 */}
            {overallRating && (overallRating === 'ok' || overallRating === 'bad') && (
                <div className="mb-4 animate-fade-in">
                    <p className="text-sm text-purple-700 font-medium mb-2">3️⃣ 觉得不好在哪里？<span className="text-purple-400 text-xs ml-1">(多选)</span></p>
                    <div className="grid grid-cols-2 gap-2">
                        {NEGATIVE_OPTIONS.map(option => (
                            <button
                                key={option.id}
                                onClick={() => toggleTag(option.id, false)}
                                className={`py-2 px-3 rounded-xl border-2 text-left text-sm transition-all
                  ${negativeTags.includes(option.id)
                                        ? 'bg-red-100 border-red-400 text-red-800'
                                        : 'bg-white border-gray-200 text-gray-700 hover:border-red-300'}`}
                            >
                                <div className="flex items-center gap-1.5">
                                    <span>{option.emoji}</span>
                                    <span className="font-medium">{option.label}</span>
                                </div>
                                <div className="text-xs text-gray-500 mt-0.5">{option.desc}</div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* 提交按钮 */}
            <div className="flex gap-2 mt-4">
                <button
                    onClick={onSkip}
                    className="flex-1 py-2 text-purple-400 text-sm hover:text-purple-600"
                >
                    跳过
                </button>
                <Button
                    onClick={handleSubmit}
                    disabled={!overallRating || isSubmitting}
                    className="flex-1"
                    size="md"
                >
                    {isSubmitting ? '提交中...' : '提交反馈 ✓'}
                </Button>
            </div>

            <p className="text-center text-xs text-purple-400 mt-3">
                你的反馈会帮助 AI 出更好的题目哦 💪
            </p>
        </div>
    );
};
