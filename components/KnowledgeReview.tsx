import React, { useState } from 'react';

interface KnowledgeReviewProps {
    subject: string;
    topic: string;
    relatedTopics?: string[];
    onComplete: (assessment: KnowledgeAssessment) => void;
    onSkip: () => void;
}

export interface KnowledgeAssessment {
    topic: string;
    masteryLevel: 'mastered' | 'mostly' | 'partial' | 'forgot';
    relatedAssessments?: { topic: string; level: string }[];
}

type MasteryLevel = 'mastered' | 'mostly' | 'partial' | 'forgot';

const MASTERY_OPTIONS: { value: MasteryLevel; emoji?: string; label: string; color: string }[] = [
    { value: 'mastered', label: '✅ 我会做', color: 'green' },
    { value: 'partial', label: '🤔 不太熟', color: 'yellow' },
    { value: 'forgot', label: '❌ 没学过/忘了', color: 'red' },
];

/**
 * 知识回顾组件 - 练习开始前让学生评估前置知识掌握情况
 * 用于突破"颗粒化投喂"机制，重建知识地图
 */
export const KnowledgeReview: React.FC<KnowledgeReviewProps> = ({
    subject,
    topic,
    relatedTopics = [],
    onComplete,
    onSkip,
}) => {
    const [step, setStep] = useState<'main' | 'related'>('main');
    const [mainMastery, setMainMastery] = useState<MasteryLevel | null>(null);
    const [relatedMasteries, setRelatedMasteries] = useState<Record<string, MasteryLevel>>({});

    const subjectEmoji: Record<string, string> = {
        math: '📐',
        chinese: '📚',
        english: '🔤',
        science: '🔬',
        other: '📖',
    };

    const handleMainSelect = (level: MasteryLevel) => {
        setMainMastery(level);
        if (relatedTopics.length > 0 && (level === 'partial' || level === 'forgot')) {
            // 如果前置知识不熟，询问相关知识点
            setStep('related');
        } else {
            // 直接完成
            onComplete({
                topic,
                masteryLevel: level,
            });
        }
    };

    const handleRelatedSelect = (relatedTopic: string, level: MasteryLevel) => {
        setRelatedMasteries(prev => ({ ...prev, [relatedTopic]: level }));
    };

    const handleComplete = () => {
        onComplete({
            topic,
            masteryLevel: mainMastery!,
            relatedAssessments: Object.entries(relatedMasteries).map(([t, l]) => ({
                topic: t,
                level: l,
            })),
        });
    };

    // 步骤1：评估主题掌握情况
    if (step === 'main') {
        return (
            <div className="bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-200 rounded-2xl p-5 animate-fade-in">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-teal-800 flex items-center gap-2">
                        <span>{subjectEmoji[subject] || '📖'}</span>
                        <span>开始前，先回顾一下</span>
                    </h3>
                    <button onClick={onSkip} className="text-teal-400 hover:text-teal-600 text-sm">
                        跳过
                    </button>
                </div>

                <div className="bg-white/60 py-3 px-4 rounded-xl mb-4 text-center">
                    <p className="text-sm text-gray-600 mb-1">今天练习的知识点：</p>
                    <p className="font-bold text-lg text-teal-800">{topic}</p>
                </div>

                <p className="text-sm text-teal-700 font-medium mb-3 text-center">
                    这个知识点你掌握得怎么样？
                </p>

                <div className="flex flex-col gap-3">
                    {MASTERY_OPTIONS.map(option => (
                        <button
                            key={option.value}
                            onClick={() => handleMainSelect(option.value)}
                            className={`py-4 px-4 rounded-xl border-2 text-left transition-all flex items-center justify-between
                                bg-white border-teal-100 hover:border-teal-400 hover:bg-teal-50 group shadow-sm`}
                        >
                            <span className="font-bold text-gray-800 text-lg group-hover:text-teal-700">{option.label}</span>
                            <span className={`w-4 h-4 rounded-full border-2 border-${option.color}-400 group-hover:bg-${option.color}-400 transition-colors`}></span>
                        </button>
                    ))}
                </div>

                <p className="text-center text-xs text-teal-400 mt-3">
                    诚实评估，帮助 AI 更好地出题 ✨
                </p>
            </div>
        );
    }

    // 步骤2：评估相关知识点（如果需要）
    return (
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-2xl p-5 animate-fade-in">
            <div className="text-center mb-4">
                <div className="text-3xl mb-2">🔗</div>
                <h3 className="font-bold text-purple-800">相关知识点自查</h3>
                <p className="text-sm text-purple-600 mt-1">
                    这些知识点和今天练习相关，快速评估一下
                </p>
            </div>

            <div className="space-y-3 mb-4">
                {relatedTopics.map(relatedTopic => (
                    <div key={relatedTopic} className="bg-white/60 p-3 rounded-xl">
                        <p className="font-medium text-gray-800 text-sm mb-2">{relatedTopic}</p>
                        <div className="flex gap-1">
                            {MASTERY_OPTIONS.map(option => (
                                <button
                                    key={option.value}
                                    onClick={() => handleRelatedSelect(relatedTopic, option.value)}
                                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all border
                                        ${relatedMasteries[relatedTopic] === option.value
                                            ? 'bg-purple-600 text-white border-purple-600'
                                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                >
                                    {option.label.split(' ')[1] || option.label}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex gap-2">
                <button
                    onClick={() => setStep('main')}
                    className="flex-1 py-2 text-purple-400 text-sm hover:text-purple-600"
                >
                    ← 返回
                </button>
                <button
                    onClick={handleComplete}
                    className="flex-1 py-2.5 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700"
                >
                    开始练习 →
                </button>
            </div>
        </div>
    );
};
