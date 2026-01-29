import React, { useState } from 'react';
import { Button } from '../../components/Button';
import { Confetti, Sparkles } from '../../components/Confetti';
import { EmotionRecord, EmotionData } from '../../components/EmotionRecord';
import { MetaCognitionFeedback, FeedbackData } from '../../components/MetaCognitionFeedback';
import { saveTaskFeedback } from '../../services/feedbackService';
import { saveEmotionRecord } from '../../services/emotionService';
import {
    TrophyIcon,
    TabletIcon,
    OutdoorIcon,
    XpIcon,
    LoadingIcon,
} from '../../components/IconLibrary';

interface CertificateViewProps {
    rewards: {
        xp: number;
        tablet: number;
        outdoor: number;
    };
    onClaim: () => Promise<void>;
    wisdomShard: string | null;
    taskId: string;
    userId: string;
    scorePercentage: number;
}

/**
 * 奖励领取视图 - 任务完成后显示
 * 从 QuestMode 抽取，处理奖励展示、情绪记录、反馈收集
 */
export const CertificateView: React.FC<CertificateViewProps> = ({
    rewards,
    onClaim,
    wisdomShard,
    taskId,
    userId,
    scorePercentage,
}) => {
    const [isClaiming, setIsClaiming] = useState(false);
    const [step, setStep] = useState<'emotion' | 'feedback' | 'done'>('emotion');
    const [pendingEmotion, setPendingEmotion] = useState<EmotionData | null>(null);
    const [pendingFeedback, setPendingFeedback] = useState<FeedbackData | null>(null);

    const handleEmotionSelect = (emotion: EmotionData) => {
        setPendingEmotion(emotion);
        setStep('feedback');
    };

    const handleFeedbackSelect = (feedback: FeedbackData) => {
        setPendingFeedback(feedback);
    };

    const handleClaim = async () => {
        if (isClaiming) return;
        setIsClaiming(true);

        try {
            if (pendingEmotion && userId && taskId) {
                await saveEmotionRecord({
                    task_id: taskId,
                    user_id: userId,
                    emotion: pendingEmotion.emotion,
                    score_percentage: pendingEmotion.scorePercentage,
                });
            }

            if (pendingFeedback && pendingFeedback.overallRating && userId && taskId) {
                await saveTaskFeedback({
                    task_id: taskId,
                    user_id: userId,
                    overall_rating: pendingFeedback.overallRating,
                    positive_tags: pendingFeedback.positiveTags,
                    negative_tags: pendingFeedback.negativeTags,
                });
            }

            await onClaim();
        } finally {
            // 页面会跳转
        }
    };

    const handleSkipEmotion = () => setStep('feedback');
    const handleSkipFeedback = () => setStep('done');

    return (
        <div className="min-h-screen bg-brand-bg flex items-center justify-center p-6 animate-fade-in text-center">
            <Confetti show={true} count={60} />

            <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-md w-full relative overflow-hidden">
                <Sparkles show={true} />

                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-brand-teal to-brand-orange"></div>
                <div className="icon-container-xl mx-auto mb-4 animate-float icon-secondary">
                    <TrophyIcon size="xl" />
                </div>
                <h2 className="text-3xl font-black mb-6 text-brand-darkTeal">挑战成功！</h2>

                <div className="bg-yellow-50 p-6 rounded-2xl mb-6 border border-yellow-100 transform rotate-1">
                    <p className="text-gray-700 font-bold text-lg leading-relaxed">"{wisdomShard}"</p>
                </div>

                <div className="flex justify-around mb-6">
                    <div className="flex flex-col items-center">
                        <div className="icon-container-lg mb-1 icon-primary"><TabletIcon size="lg" /></div>
                        <span className="font-black text-blue-600 text-xl">+{rewards.tablet}m</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <div className="icon-container-lg mb-1 icon-success"><OutdoorIcon size="lg" /></div>
                        <span className="font-black text-green-600 text-xl">+{rewards.outdoor}m</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <div className="icon-container-lg mb-1 icon-primary"><XpIcon size="lg" /></div>
                        <span className="font-black text-brand-orange text-xl">+{rewards.xp} XP</span>
                    </div>
                </div>

                {step === 'emotion' && taskId && (
                    <EmotionRecord
                        taskId={taskId}
                        scorePercentage={scorePercentage || 0}
                        onSubmit={handleEmotionSelect}
                        onSkip={handleSkipEmotion}
                    />
                )}

                {step === 'feedback' && taskId && (
                    <>
                        {pendingEmotion && (
                            <div className="mb-3 text-sm text-gray-500 flex items-center justify-center gap-2">
                                <span>心情已记录</span>
                                <span className="text-lg">{
                                    pendingEmotion.emotion === 'happy' ? '😊' :
                                        pendingEmotion.emotion === 'calm' ? '😌' :
                                            pendingEmotion.emotion === 'tired' ? '😫' : '😢'
                                }</span>
                            </div>
                        )}
                        <MetaCognitionFeedback
                            taskId={taskId}
                            onSubmit={handleFeedbackSelect}
                            onSkip={handleSkipFeedback}
                        />
                    </>
                )}

                {step === 'done' && (
                    <div className="mb-4 py-3 px-4 bg-gradient-to-r from-green-50 to-teal-50 border border-green-200 rounded-xl text-green-700 text-sm animate-fade-in">
                        <div className="flex items-center justify-center gap-2 mb-1">
                            <span className="text-lg">✨</span>
                            <span className="font-bold">感谢反馈！</span>
                        </div>
                        <p className="text-xs text-green-600">你的意见会帮助 AI 出更适合你的题目</p>
                    </div>
                )}

                <Button
                    onClick={handleClaim}
                    variant="primary"
                    size="xl"
                    className="w-full shadow-xl hover:scale-105 transition-transform"
                    disabled={isClaiming}
                >
                    {isClaiming ? (
                        <span className="flex items-center justify-center gap-2">
                            <LoadingIcon size="sm" />
                            保存中...
                        </span>
                    ) : (step === 'done' || pendingFeedback?.overallRating) ? '收下奖励 ✨' : '跳过并收下奖励'}
                </Button>
            </div>
        </div>
    );
};
