import React, { useState, useEffect } from 'react';
import { DailyTask, OpenEndedResult } from '../types';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { explainQuestionSimple, evaluateSubjectiveAnswer, evaluateOpenEndedAnswer } from '../services/aiService';
import { checkUserAnswer } from '../services/answerNormalizer';
import { updateMasteriesFromQuestions } from '../services/knowledgeService';
import { Confetti, Sparkles } from '../components/Confetti';
import { ENCOURAGEMENT } from '../constants/copywriting';
import { MetaCognitionFeedback, FeedbackData } from '../components/MetaCognitionFeedback';
import { EmotionRecord, EmotionData } from '../components/EmotionRecord';
import { ErrorAttribution, ErrorAttributionData } from '../components/ErrorAttribution';
import { saveTaskFeedback } from '../services/feedbackService';
import { saveEmotionRecord } from '../services/emotionService';
import { saveErrorAttribution } from '../services/errorAttributionService';
import {
    TrophyIcon,
    TabletIcon,
    OutdoorIcon,
    XpIcon,
    CheckIcon,
    CrossIcon,
    BookIcon,
    LoadingIcon,
    LightbulbIcon,
    ArrowRightIcon,
} from '../components/IconLibrary';
import 'katex/dist/katex.min.css';
import Latex from 'react-latex-next';

// 安全的文本渲染组件：只对数学公式使用 Latex，普通文字直接显示
// 解决 react-latex-next 导致的长文本无法换行问题
const SafeText: React.FC<{ children: string; className?: string }> = ({ children, className }) => {
    if (!children) return null;
    const text = String(children);

    // 检测是否包含 LaTeX 公式（使用字符串 includes 检测反斜杠命令）
    // 支持更多常见的数学符号
    const latexPattern = /\\(frac|times|div|sqrt|sum|int|cdot|leq|geq|neq|pm|infty|alpha|beta|pi|theta)/;
    const hasLatex = text.includes('$') || latexPattern.test(text);

    if (!hasLatex) {
        // 普通文本直接显示
        return <span className={className}>{text}</span>;
    }

    // 包裹 LaTeX 公式的辅助函数
    const wrapLatexFormulas = (input: string): string => {
        let result = input;

        // 1. 处理带双参数的命令 (如 \frac{a}{b})
        result = result.replace(
            /(\\frac\{[^}]*\}\{[^}]*\})/g,
            ' $$$1$$ '
        );

        // 2. 处理带单参数的命令 (如 \sqrt{x})
        result = result.replace(
            /(\\sqrt\{[^}]*\})/g,
            ' $$$1$$ '
        );

        // 3. 处理独立的操作符命令 (如 \times, \div, \cdot, \pm 等)
        // 这些命令后面没有花括号参数
        result = result.replace(
            /\\(times|div|cdot|pm|leq|geq|neq|infty|alpha|beta|pi|theta)(?![a-zA-Z{])/g,
            ' $$$\\$1$$ '
        );

        return result;
    };

    // 如果文本较短（<100字符），直接用 Latex 渲染整个文本
    if (text.length < 100) {
        const wrappedText = wrapLatexFormulas(text);
        return <span className={className} style={{ display: 'inline' }}><Latex>{wrappedText}</Latex></span>;
    }

    // 长文本：按句子分割，每段单独处理以实现换行
    const parts = text.split(/([。！？\n])/);
    return (
        <span className={className}>
            {parts.map((part, i) => {
                if (!part) return null;
                const partHasLatex = latexPattern.test(part) || part.includes('$');
                if (partHasLatex) {
                    const wrappedPart = wrapLatexFormulas(part);
                    return <span key={i} style={{ display: 'inline' }}><Latex>{wrappedPart}</Latex></span>;
                }
                return <span key={i}>{part}</span>;
            })}
        </span>
    );
};


interface QuestModeProps {
    task: DailyTask;
    onExit: () => void;
    onComplete: (rewards: { xp: number, tablet: number, outdoor: number, correctCount: number, scorePercentage: number }, updatedQuestions: any[]) => void;
}

// 使用统一的鼓励语库
const VICTORY_QUOTES = ENCOURAGEMENT.correct;

const CertificateView: React.FC<any> = ({ rewards, onClaim, wisdomShard, taskId, userId, scorePercentage }) => {
    const [isClaiming, setIsClaiming] = React.useState(false);
    const [feedbackSubmitted, setFeedbackSubmitted] = React.useState(false);
    const [emotionSubmitted, setEmotionSubmitted] = React.useState(false);

    const handleClaim = async () => {
        if (isClaiming) return;
        setIsClaiming(true);
        try {
            await onClaim();
        } finally {
            // Don't reset - page will navigate away
        }
    };

    const handleFeedbackSubmit = async (feedback: FeedbackData) => {
        if (userId && taskId) {
            await saveTaskFeedback({
                task_id: taskId,
                user_id: userId,
                overall_rating: feedback.overallRating!,
                positive_tags: feedback.positiveTags,
                negative_tags: feedback.negativeTags,
            });
        }
        setFeedbackSubmitted(true);
    };

    const handleEmotionSubmit = async (emotion: EmotionData) => {
        if (userId && taskId) {
            await saveEmotionRecord({
                task_id: taskId,
                user_id: userId,
                emotion: emotion.emotion,
                score_percentage: emotion.scorePercentage,
            });
        }
        setEmotionSubmitted(true);
    };

    return (
        <div className="min-h-screen bg-brand-bg flex items-center justify-center p-6 animate-fade-in text-center">
            {/* 彩纸庆祝动效 */}
            <Confetti show={true} count={60} />

            <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-md w-full relative overflow-hidden">
                {/* 星星闪烁 */}
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

                {/* 情绪记录组件 - 优先显示 */}
                {!emotionSubmitted && taskId && (
                    <EmotionRecord
                        taskId={taskId}
                        scorePercentage={scorePercentage || 0}
                        onSubmit={handleEmotionSubmit}
                        onSkip={() => setEmotionSubmitted(true)}
                    />
                )}

                {/* 元认知反馈组件 - 情绪提交后显示 */}
                {emotionSubmitted && !feedbackSubmitted && taskId && (
                    <MetaCognitionFeedback
                        taskId={taskId}
                        onSubmit={handleFeedbackSubmit}
                        onSkip={() => setFeedbackSubmitted(true)}
                    />
                )}

                {/* 反馈完成提示 */}
                {emotionSubmitted && feedbackSubmitted && (
                    <div className="mb-4 py-2 px-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
                        感谢反馈！你的意见会帮助 AI 变得更聪明 🧠
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
                    ) : '收下奖励'}
                </Button>
            </div>
        </div>
    )
}

// 简化的文本格式化（移除 emoji 装饰，使用简洁设计）
const formatTextWithEmojis = (text: string) => {
    if (!text) return [];

    // 基础清理
    const cleanText = text.replace(/\\n/g, '\n');

    return cleanText.split('\n').filter(p => p.trim()).map((para, idx) => {
        // 解析 **Bold**
        const parts = para.split(/(\*\*.*?\*\*)/g).map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <span key={i} className="font-bold text-brand-darkTeal">{part.slice(2, -2)}</span>;
            }
            return part;
        });

        return { content: parts, icon: null };
    });
};

export const QuestMode: React.FC<QuestModeProps> = ({ task, onExit, onComplete }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [userAnswer, setUserAnswer] = useState<string | number | null>(null);
    const [showResult, setShowResult] = useState(false);
    const [correctCount, setCorrectCount] = useState(0);
    const [accumulatedXP, setAccumulatedXP] = useState(0);

    const [isReadingCollapsed, setIsReadingCollapsed] = useState(false);
    const [questionsState, setQuestionsState] = useState(task.questions || []);

    const [rewardsEarned, setRewardsEarned] = useState<any>(null);
    const [wisdomShard, setWisdomShard] = useState<string | null>(null);
    const [isGrading, setIsGrading] = useState(false);
    const [gradingResult, setGradingResult] = useState<{ isCorrect: boolean, feedback: string, score: number } | null>(null);
    const [openEndedResult, setOpenEndedResult] = useState<OpenEndedResult | null>(null);
    const [isExplaining, setIsExplaining] = useState(false);
    const [aiExplanation, setAiExplanation] = useState<string | null>(null);

    // 新版：阅读材料变为折叠式参考，不再强制阅读
    const isTaskCompleted = task.status === 'completed' || (window as any).__questReviewMode === true;
    const isReviewMode = isTaskCompleted;

    // 知识点抽屉状态
    const [showKnowledgeDrawer, setShowKnowledgeDrawer] = useState(false);
    // 记录每道题是否查看了知识点（用于 XP 奖励计算）
    const [viewedKnowledgeForQuestion, setViewedKnowledgeForQuestion] = useState<Set<number>>(new Set());
    const [attributionSubmittedForQuestion, setAttributionSubmittedForQuestion] = useState<Set<number>>(new Set());

    // 回顾模式：题目抽屉状态
    const [showQuestionsDrawer, setShowQuestionsDrawer] = useState(false);
    const [reviewingQuestion, setReviewingQuestion] = useState<number | null>(null);

    const getReadingData = () => {
        // Priority 1: Task level (usually from immediate generation)
        // [FIX] 增强鲁棒性：task.reading_material 可能是 { content: ... } 或 { daily_challenge: { reading_material: ... } }
        let material = task.reading_material;

        // 如果 reading_material 里面还包了一层 reading_material (之前嵌套 bug 导致的脏数据)
        if (material && (material as any).reading_material) {
            material = (material as any).reading_material;
        }

        if (material?.content) {
            return {
                title: material.title || task.learning_material?.title || "学习材料",
                content: material.content
            };
        }

        // Priority 2: Extracted Content (DB)
        const extracted = task.learning_material?.extracted_content as any;
        // [FIX] 同样处理 extracted_content 的嵌套可能性
        const extractedMaterial = extracted?.daily_challenge?.reading_material || extracted?.reading_material;

        if (extractedMaterial?.content) {
            return {
                title: extractedMaterial.title || extracted?.daily_challenge?.title || task.learning_material?.title,
                content: extractedMaterial.content
            };
        }

        // Priority 3: Description/Summary
        if (task.learning_material?.description || task.learning_material?.ai_analysis?.summary) {
            return {
                title: task.learning_material?.title,
                content: task.learning_material?.description || task.learning_material?.ai_analysis?.summary
            };
        }

        return null;
    };

    const readingData = getReadingData();
    const hasReadingMaterial = !!readingData?.content;
    const formattedParagraphs = hasReadingMaterial ? formatTextWithEmojis(readingData.content) : [];

    // 新版：不再强制阅读，直接允许做题
    const canAnswerQuestions = true;

    // 处理查看知识点按钮点击
    const handleViewKnowledge = () => {
        setShowKnowledgeDrawer(true);
        // 记录当前题目已查看知识点
        setViewedKnowledgeForQuestion(prev => new Set(prev).add(currentStep));
    };

    // 计算 XP 奖励（不看知识点答对 +15，看了答对 +10）
    const calculateXP = (baseScore: number, isCorrect: boolean): number => {
        if (!isCorrect) return 0;
        const viewedKnowledge = viewedKnowledgeForQuestion.has(currentStep);
        return viewedKnowledge ? baseScore : Math.floor(baseScore * 1.5); // 不看知识点答对 +50% 奖励
    };

    if (questionsState.length === 0) return <div>Data Error: No questions found.</div>;

    const currentQ = questionsState[currentStep];
    const isLastQuestion = currentStep === questionsState.length - 1;
    const progress = ((currentStep + 1) / questionsState.length) * 100;

    const getCorrectOptionIndex = (): number => {
        if (currentQ.question_type !== 'choice' || !currentQ.options) return -1;
        const expectedVal = String(currentQ.expected?.value || currentQ.correct_answer).trim();
        if (!expectedVal) return -1;

        // 归一化函数：去除标点、空格，转小写
        const normalize = (s: string) => s.toLowerCase().replace(/[，。,.、!?！？;；:：'\"'""''《》\s\-_]/g, '');

        const normalizedExpected = normalize(expectedVal);

        // 1. 完全匹配
        const exactIdx = currentQ.options.findIndex(opt => String(opt).trim() === expectedVal);
        if (exactIdx !== -1) return exactIdx;

        // 2. 归一化后完全匹配
        const normalizedIdx = currentQ.options.findIndex(opt => normalize(String(opt)) === normalizedExpected);
        if (normalizedIdx !== -1) return normalizedIdx;

        // 3. 选项包含期望值（期望值是选项的子串）
        const containsIdx = currentQ.options.findIndex(opt =>
            normalize(String(opt)).includes(normalizedExpected)
        );
        if (containsIdx !== -1) return containsIdx;

        // 4. 期望值包含选项（选项是期望值的子串）
        const reverseContainsIdx = currentQ.options.findIndex(opt =>
            normalizedExpected.includes(normalize(String(opt))) && normalize(String(opt)).length > 2
        );
        if (reverseContainsIdx !== -1) return reverseContainsIdx;

        // 5. 使用 checkUserAnswer 进行模糊匹配
        const fuzzyIdx = currentQ.options.findIndex(opt =>
            checkUserAnswer(opt, currentQ.expected, currentQ.correct_answer, 'choice')
        );
        if (fuzzyIdx !== -1) return fuzzyIdx;

        // 6. A/B/C/D 字母映射
        if (expectedVal.length === 1 && /^[A-D]$/i.test(expectedVal)) {
            const charCode = expectedVal.toUpperCase().charCodeAt(0);
            const targetIdx = charCode - 65;
            if (targetIdx >= 0 && targetIdx < currentQ.options.length) {
                return targetIdx;
            }
        }

        // 7. 最后尝试：如果期望值开头是 A./B./C./D.，提取后面的内容匹配
        const letterMatch = expectedVal.match(/^[A-D][.、:：\s]*(.+)$/i);
        if (letterMatch) {
            const contentPart = normalize(letterMatch[1]);
            const contentIdx = currentQ.options.findIndex(opt =>
                normalize(String(opt)) === contentPart || normalize(String(opt)).includes(contentPart)
            );
            if (contentIdx !== -1) return contentIdx;
        }

        console.warn('Could not find correct option for:', expectedVal, 'in', currentQ.options);
        return -1;
    };

    const isCorrect = () => {
        if (currentQ.question_type === 'short_answer' && gradingResult) return gradingResult.isCorrect;

        if (currentQ.question_type === 'true_false') {
            return checkUserAnswer(userAnswer as string, currentQ.expected, currentQ.correct_answer, 'true_false');
        }

        if (currentQ.question_type === 'choice') {
            const correctIdx = getCorrectOptionIndex();
            // User answer is index for choice
            return Number(userAnswer) === correctIdx;
        }

        return checkUserAnswer(userAnswer as string, currentQ.expected, currentQ.correct_answer, currentQ.question_type);
    };

    const handleAnswer = async () => {
        if (userAnswer === null || (typeof userAnswer === 'string' && userAnswer.trim() === '')) return;

        let currentIsCorrect = false;
        let feedback = "";
        let openEndedEvaluation: OpenEndedResult | null = null;

        if (currentQ.question_type === 'open_ended') {
            // 开放式题目：调用 AI 深度评判
            setIsGrading(true);
            const result = await evaluateOpenEndedAnswer(
                currentQ.question_text,
                String(userAnswer),
                String(currentQ.expected?.value || currentQ.correct_answer),
                currentQ.expected?.evaluation_hints || ["是否有个人想法", "是否结合文章内容"],
                4 // TODO: 从用户配置获取年级
            );
            openEndedEvaluation = result;
            setOpenEndedResult(result);
            // 开放式题目：只要认真回答就算"正确"（鼓励性评分）
            currentIsCorrect = result.score >= 50;
            feedback = result.feedback;
            setIsGrading(false);
        } else if (currentQ.question_type === 'short_answer') {
            setIsGrading(true);
            const result = await evaluateSubjectiveAnswer(currentQ.question_text, String(userAnswer), String(currentQ.expected?.value || currentQ.correct_answer));
            setGradingResult(result);
            currentIsCorrect = result.isCorrect;
            feedback = result.feedback;
            setIsGrading(false);
        } else {
            currentIsCorrect = isCorrect();
        }

        const updatedQs = [...questionsState];
        updatedQs[currentStep] = {
            ...updatedQs[currentStep],
            user_result: {
                user_answer: userAnswer,
                is_correct: currentIsCorrect,
                ai_feedback: feedback,
                open_ended_result: openEndedEvaluation || undefined
            }
        };
        setQuestionsState(updatedQs);

        if (currentIsCorrect) {
            setCorrectCount(prev => prev + 1);
            // 开放式题目根据评分给予 XP
            const baseScore = currentQ.score_value || 10;
            const xpEarned = currentQ.question_type === 'open_ended' && openEndedEvaluation
                ? Math.floor(baseScore * (openEndedEvaluation.score / 100))
                : baseScore;
            setAccumulatedXP(prev => prev + xpEarned);
        }
        setShowResult(true);
    };

    const handleNext = async () => {
        if (isLastQuestion) {
            const accuracy = correctCount / questionsState.length;
            const scorePercentage = Math.round(accuracy * 100);
            const isPerfect = accuracy >= 0.9;
            const bonusTime = isPerfect ? 5 : 0;
            const bonusXP = isPerfect ? 50 : 0;

            const rewards = {
                xp: accumulatedXP + bonusXP,
                tablet: Math.floor(5 + (correctCount * 1.5) + bonusTime),
                outdoor: Math.floor(10 + (correctCount * 3) + bonusTime * 2),
                correctCount: correctCount,
                scorePercentage: scorePercentage
            };
            setRewardsEarned(rewards);
            setWisdomShard(VICTORY_QUOTES[Math.floor(Math.random() * VICTORY_QUOTES.length)]);

            // 更新知识点掌握情况（异步执行，不阻塞UI）
            const userId = task.user_id; // 正确使用任务的 user_id
            const subject = task.learning_material?.subject || 'other';
            console.log('[QuestMode] Completing task:', { userId, subject, questionsCount: questionsState.length });

            if (userId) {
                console.log('[QuestMode] Updating masteries...');
                updateMasteriesFromQuestions(userId, subject, questionsState)
                    .then(() => console.log('[QuestMode] Masteries updated successfully'))
                    .catch(e => console.error('[QuestMode] Failed to update masteries:', e));
            } else {
                console.error('[QuestMode] Missing userId, cannot update masteries');
            }
        } else {
            setCurrentStep(prev => prev + 1);
            setUserAnswer(null);
            setShowResult(false);
            setGradingResult(null);
            setOpenEndedResult(null);
            setAiExplanation(null);
        }
    };

    const handleExplainMore = async () => {
        setIsExplaining(true);
        const txt = await explainQuestionSimple(currentQ.question_text, currentQ.correct_answer, 4);
        setAiExplanation(txt);
        setIsExplaining(false);
    }

    // --- Render Helpers ---
    const isSelected = (val: string) => userAnswer === val;
    const isCorrectOption = (val: string) => checkUserAnswer(val, currentQ.expected, currentQ.correct_answer, 'true_false');

    const renderInteraction = () => {
        if (isGrading) return <div className="text-center p-8 text-brand-teal animate-pulse font-bold">AI 老师正在认真批改...</div>;

        if (currentQ.question_type === 'true_false') {
            return (
                <div className="flex gap-4">
                    <button
                        disabled={showResult}
                        onClick={() => setUserAnswer('True')}
                        className={`flex-1 py-6 rounded-2xl border-2 font-bold text-lg flex flex-col items-center gap-2 transition-all
                           ${showResult
                                ? (isCorrectOption('True')
                                    ? 'bg-green-100 border-green-500 text-green-700'
                                    : isSelected('True')
                                        ? 'bg-red-50 border-red-500 text-red-700'
                                        : 'opacity-50 border-gray-100')
                                : (isSelected('True')
                                    ? 'bg-brand-mint border-brand-teal text-brand-darkTeal ring-2 ring-brand-teal/30'
                                    : 'bg-white border-gray-200 hover:border-brand-teal/50 hover:bg-brand-mint/10')
                            }
                       `}
                    >
                        <CheckIcon size="lg" circle className="icon-success" />
                        <span>对 (True)</span>
                    </button>
                    <button
                        disabled={showResult}
                        onClick={() => setUserAnswer('False')}
                        className={`flex-1 py-6 rounded-2xl border-2 font-bold text-lg flex flex-col items-center gap-2 transition-all
                           ${showResult
                                ? (isCorrectOption('False')
                                    ? 'bg-green-100 border-green-500 text-green-700'
                                    : isSelected('False')
                                        ? 'bg-red-50 border-red-500 text-red-700'
                                        : 'opacity-50 border-gray-100')
                                : (isSelected('False')
                                    ? 'bg-red-50 border-red-500 text-red-700 ring-2 ring-red-200'
                                    : 'bg-white border-gray-200 hover:border-red-300 hover:bg-red-50')
                            }
                       `}
                    >
                        <CrossIcon size="lg" circle className="icon-primary" />
                        <span>错 (False)</span>
                    </button>
                </div>
            );
        }

        if (currentQ.question_type === 'choice') {
            const optionLabels = ['A', 'B', 'C', 'D', 'E', 'F'];
            return <div className="space-y-3">{currentQ.options?.map((o, i) => {
                const optionText = String(o || '').trim();
                const label = optionLabels[i] || String(i + 1);
                // 如果选项为空或无效，显示占位符
                const displayText = optionText.length > 0 ? optionText : `(选项 ${label} 内容缺失)`;
                return (
                    <button
                        key={i}
                        disabled={showResult || optionText.length === 0}
                        onClick={() => setUserAnswer(i)}
                        className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-start gap-3 ${showResult ? (i === getCorrectOptionIndex() ? 'bg-green-100 border-green-500 shadow-sm' : userAnswer === i ? 'bg-red-50 border-red-500' : 'opacity-50 border-transparent bg-gray-50') : (userAnswer === i ? 'border-brand-teal bg-brand-mint shadow-md transform scale-[1.01]' : 'border-gray-100 bg-white hover:border-brand-teal/30 hover:bg-gray-50')}`}
                    >
                        <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${userAnswer === i ? 'bg-brand-teal text-white' : 'bg-gray-100 text-gray-600'}`}>
                            {label}
                        </span>
                        <span className="flex-1">
                            <Latex>{optionText.includes('\\') ? `$${optionText}$` : displayText}</Latex>
                        </span>
                    </button>
                );
            })}</div>
        }

        // 开放式题目的专门渲染
        if (currentQ.question_type === 'open_ended') {
            return <div className="space-y-4">
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-purple-700 text-sm">
                    <span className="font-bold flex items-center gap-1"><LightbulbIcon size="sm" /> 开放思考题</span>
                    <span className="ml-2">这道题没有标准答案，请说出你的想法！</span>
                </div>
                <textarea
                    disabled={showResult}
                    value={userAnswer as string || ''}
                    onChange={e => setUserAnswer(e.target.value)}
                    className="w-full p-4 border-2 border-purple-200 rounded-xl text-lg focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none transition-all"
                    rows={5}
                    placeholder="写下你的想法，可以结合文章内容来说..."
                />
                {showResult && openEndedResult && (
                    <div className="space-y-4 animate-fade-in">
                        {/* 分数和鼓励反馈 */}
                        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 p-4 rounded-xl">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="bg-purple-500 text-white font-black text-lg px-3 py-1 rounded-full">
                                    {openEndedResult.score}分
                                </div>
                                <div className="text-purple-700 font-bold text-lg">
                                    {openEndedResult.feedback}
                                </div>
                            </div>

                            {/* 亮点 */}
                            {openEndedResult.strengths && openEndedResult.strengths.length > 0 && (
                                <div className="mb-3">
                                    <div className="text-sm text-purple-600 font-bold mb-1">✨ 你的亮点：</div>
                                    <div className="flex flex-wrap gap-2">
                                        {openEndedResult.strengths.map((s, i) => (
                                            <span key={i} className="bg-white text-purple-600 px-2 py-1 rounded-full text-sm border border-purple-200">
                                                {s}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 示范答案 */}
                        <div className="bg-green-50 border border-green-200 p-4 rounded-xl">
                            <div className="flex items-center gap-2 text-green-700 font-bold mb-2">
                                <span>📝</span>
                                <span>优秀回答示范：</span>
                            </div>
                            <div className="text-green-800 leading-relaxed">
                                {openEndedResult.sample_answer}
                            </div>
                        </div>

                        {/* 改进建议 */}
                        {openEndedResult.improvement_tips && openEndedResult.improvement_tips.length > 0 && (
                            <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl">
                                <div className="flex items-center gap-2 text-blue-700 font-bold mb-2">
                                    <span>💡</span>
                                    <span>下次可以这样做：</span>
                                </div>
                                <ul className="text-blue-800 space-y-1">
                                    {openEndedResult.improvement_tips.map((tip, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <span className="text-blue-400">•</span>
                                            <span>{tip}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </div>
        }

        return <div className="space-y-4">
            <textarea disabled={showResult} value={userAnswer as string || ''} onChange={e => setUserAnswer(e.target.value)} className="w-full p-4 border-2 border-gray-200 rounded-xl text-lg focus:border-brand-teal focus:ring-4 focus:ring-brand-teal/10 outline-none transition-all" rows={4} placeholder="在这里写下你的答案..." />
            {showResult && !isCorrect() && (
                <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl">
                    <div className="flex items-center gap-2 text-orange-700 font-bold mb-2">
                        <span>📝</span>
                        <span>参考答案: {currentQ.expected?.value || currentQ.correct_answer}</span>
                    </div>
                    {currentQ.expected?.synonyms && currentQ.expected.synonyms.length > 0 && (
                        <div className="text-sm text-orange-600/80 mt-1">
                            💡 也可以写作: {currentQ.expected.synonyms.slice(0, 4).join('、')}
                        </div>
                    )}
                    {currentQ.expected?.unit && (
                        <div className="text-xs text-gray-500 mt-2">
                            提示: 记得写上单位哦！
                        </div>
                    )}
                </div>
            )}
        </div>
    }

    if (wisdomShard && rewardsEarned) {
        return <CertificateView rewards={rewardsEarned} wisdomShard={wisdomShard} onClaim={() => onComplete({ ...rewardsEarned, correctCount }, questionsState)} taskId={task.id} userId={task.user_id} scorePercentage={rewardsEarned.scorePercentage} />
    }

    // ========== 回顾模式：阅读材料为主，题目列表为辅 ==========
    if (isReviewMode && hasReadingMaterial) {
        const reviewQ = reviewingQuestion !== null ? questionsState[reviewingQuestion] : null;

        // 从历史数据计算正确数量
        const reviewCorrectCount = questionsState.filter((q: any) => q.is_correct === true).length;

        return (
            <div className="fixed inset-0 bg-[#FFFBF0] flex flex-col overflow-hidden">
                {/* Header */}
                <header className="p-4 flex justify-between items-center bg-white/80 backdrop-blur border-b border-orange-100 sticky top-0 z-20">
                    <button onClick={onExit} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <i className="fas fa-arrow-left text-xl"></i>
                    </button>
                    <div className="flex-1 text-center">
                        <h1 className="font-bold text-gray-800 font-serif text-lg truncate px-4">
                            📖 {readingData?.title || "学习回顾"}
                        </h1>
                    </div>
                    <button
                        onClick={() => setShowQuestionsDrawer(true)}
                        className="flex items-center gap-2 bg-purple-100 hover:bg-purple-200 text-purple-700 px-4 py-2 rounded-xl font-bold text-sm transition-colors"
                    >
                        <span>📝</span>
                        <span>题目 ({questionsState.length})</span>
                    </button>
                </header>

                {/* Main Content: Reading Material */}
                <main className="flex-1 overflow-y-auto">
                    <div className="max-w-3xl mx-auto p-6 md:p-8">
                        <div className="prose prose-lg font-serif text-gray-800 leading-loose">
                            {formattedParagraphs.map((p, idx) => (
                                <p key={idx} className="mb-6 indent-8 relative text-xl">
                                    {p.icon && <span className="absolute -left-8 top-1 text-2xl opacity-80">{p.icon}</span>}
                                    {p.content}
                                </p>
                            ))}
                        </div>
                        <div className="h-24"></div>
                    </div>
                </main>

                {/* Questions Drawer */}
                {showQuestionsDrawer && (
                    <div className="fixed inset-0 z-50 flex">
                        <div
                            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
                            onClick={() => { setShowQuestionsDrawer(false); setReviewingQuestion(null); }}
                        />
                        <div className="absolute right-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl flex flex-col animate-slide-in-right overflow-x-hidden">
                            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white sticky top-0 z-10">
                                <h3 className="font-bold text-gray-800 text-lg">
                                    📝 答题记录 ({reviewCorrectCount}/{questionsState.length} 正确)
                                </h3>
                                <button
                                    onClick={() => { setShowQuestionsDrawer(false); setReviewingQuestion(null); }}
                                    className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500"
                                >
                                    <i className="fas fa-times"></i>
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto overflow-x-hidden drawer-content">
                                {reviewQ !== null && reviewingQuestion !== null ? (
                                    // 显示单道题目详情
                                    <div className="p-4">
                                        <button
                                            onClick={() => setReviewingQuestion(null)}
                                            className="text-purple-600 font-bold mb-4 flex items-center gap-1 hover:underline"
                                        >
                                            <i className="fas fa-chevron-left"></i>
                                            <span>返回题目列表</span>
                                        </button>

                                        <div className="bg-gray-50 rounded-xl p-4 mb-4">
                                            <div className="flex items-center gap-2 mb-3">
                                                <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded uppercase">{reviewQ.question_type}</span>
                                                {reviewQ.difficulty_tag && <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded">{reviewQ.difficulty_tag}</span>}
                                            </div>
                                            <h4 className="font-bold text-gray-800 text-lg mb-4 question-text" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                                                <SafeText>{reviewQ.question_text || ''}</SafeText>
                                            </h4>

                                            {/* Options/Answer display */}
                                            {reviewQ.options && (
                                                <div className="space-y-2 mb-4">
                                                    {reviewQ.options.map((opt: string, i: number) => {
                                                        const isCorrectOption = String(reviewQ.correct_answer || reviewQ.expected?.value) === opt ||
                                                            (reviewQ.correct_answer && String(i) === String(reviewQ.correct_answer));
                                                        return (
                                                            <div
                                                                key={i}
                                                                className={`p-3 rounded-lg border ${isCorrectOption ? 'bg-green-50 border-green-300 text-green-800' : 'bg-white border-gray-200 text-gray-600'}`}
                                                            >
                                                                {isCorrectOption && <i className="fas fa-check-circle mr-2 text-green-500"></i>}
                                                                <Latex>{opt.includes('\\') ? `$${opt}$` : opt}</Latex>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* Correct Answer */}
                                            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                                                <div className="text-green-700 font-bold text-sm mb-1">✅ 正确答案</div>
                                                <div className="text-green-800">
                                                    <Latex>{String(reviewQ.correct_answer || reviewQ.expected?.value || '')}</Latex>
                                                </div>
                                            </div>

                                            {/* Explanation */}
                                            {reviewQ.explanation && (
                                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                                    <div className="text-blue-700 font-bold text-sm mb-1">💡 解析</div>
                                                    <div className="text-blue-800" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                                                        <SafeText>{reviewQ.explanation || ''}</SafeText>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    // 显示题目列表
                                    <div className="p-4 space-y-3">
                                        {questionsState.map((q, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => setReviewingQuestion(idx)}
                                                className="w-full text-left p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors border border-gray-200 hover:border-purple-300"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <span className="w-8 h-8 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center font-bold text-sm">
                                                            {idx + 1}
                                                        </span>
                                                        <span className="text-gray-800 font-medium line-clamp-1 flex-1">
                                                            {q.question_text?.substring(0, 40)}...
                                                        </span>
                                                    </div>
                                                    <i className="fas fa-chevron-right text-gray-400"></i>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Floating Questions Button (Mobile) */}
                <button
                    onClick={() => setShowQuestionsDrawer(true)}
                    className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-purple-600 text-white rounded-full shadow-lg flex items-center justify-center text-xl z-40 hover:bg-purple-700 transition-colors"
                >
                    📝
                </button>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-gray-100 flex flex-col overflow-hidden">
            {/* Progress Bar (Mobile) */}
            <div className="md:hidden h-1.5 bg-gray-200 w-full fixed top-0 z-30"><div className="h-full bg-brand-teal transition-all duration-500" style={{ width: `${progress}%` }}></div></div>

            {/* --- Knowledge Drawer (Slides from right) --- */}
            {showKnowledgeDrawer && hasReadingMaterial && (
                <div className="fixed inset-0 z-50 flex">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
                        onClick={() => setShowKnowledgeDrawer(false)}
                    />
                    {/* Drawer Content - 加宽至 max-w-2xl */}
                    <div className="absolute right-0 top-0 h-full w-full max-w-2xl bg-[#FFFBF0] shadow-2xl flex flex-col animate-slide-in-right">
                        <div className="p-4 border-b border-orange-100 flex justify-between items-center bg-[#FFFBF0]/95 backdrop-blur sticky top-0">
                            <h3 className="font-bold text-gray-800 font-serif text-lg flex items-center gap-2">
                                📖 <span>{readingData?.title || "知识点参考"}</span>
                            </h3>
                            <button
                                onClick={() => setShowKnowledgeDrawer(false)}
                                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500"
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 font-serif text-lg leading-loose text-gray-800">
                            {formattedParagraphs.map((p, idx) => (
                                <p key={idx} className="mb-5 indent-8 relative">
                                    {p.icon && <span className="absolute -left-6 top-1 text-xl opacity-80">{p.icon}</span>}
                                    {p.content}
                                </p>
                            ))}
                            <div className="h-20"></div>
                        </div>
                        {/* Hint at bottom */}
                        <div className="p-4 bg-gradient-to-t from-[#FFFBF0] via-[#FFFBF0] to-transparent border-t border-orange-100">
                            <p className="text-center text-xs text-gray-500">
                                💡 阅读完成后点击空白处返回答题
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* --- Main Content: Questions --- */}
            <div className="flex-1 flex flex-col h-full relative z-10 bg-brand-bg/50">
                {/* Desktop Header */}
                <header className="p-4 hidden md:flex justify-between items-center bg-white/80 backdrop-blur border-b border-gray-200">
                    <button onClick={onExit} className="text-gray-400 hover:text-gray-600 transition-colors"><i className="fas fa-times text-xl"></i></button>
                    <div className="flex items-center gap-4">
                        <div className="bg-orange-100 text-brand-orange px-3 py-1 rounded-full text-xs font-bold shadow-inner">
                            本局已得: {accumulatedXP} XP
                        </div>
                        <div className="text-sm font-bold text-gray-500">进度</div>
                        <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-brand-teal transition-all duration-500" style={{ width: `${progress}%` }}></div>
                        </div>
                        <div className="text-brand-darkTeal font-bold">{currentStep + 1}/{questionsState.length}</div>
                    </div>
                </header>

                {/* Mobile Header */}
                <header className="md:hidden p-4 flex justify-between items-center">
                    <button onClick={onExit} className="w-8 h-8 bg-white rounded-full shadow text-gray-500"><i className="fas fa-times"></i></button>
                    <div className="text-xs font-bold text-brand-orange bg-orange-50 px-2 py-1 rounded">XP: {accumulatedXP}</div>
                    <span className="font-bold text-gray-500 bg-white px-3 py-1 rounded-full text-xs shadow-sm">{currentStep + 1} / {questionsState.length}</span>
                </header>

                <main className="flex-1 p-4 md:p-8 overflow-y-auto flex flex-col justify-center max-w-3xl mx-auto w-full">
                    <Card className="animate-slide-up shadow-lg border-0 ring-1 ring-black/5">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <span className="px-2 py-1 bg-brand-mint text-brand-darkTeal text-xs font-bold rounded uppercase tracking-wider border border-brand-teal/20">{currentQ.question_type === 'fill' && currentQ.options ? 'CHOICE' : currentQ.question_type}</span>
                                {currentQ.difficulty_tag && <span className={`px-2 py-1 text-xs font-bold rounded uppercase border ${currentQ.difficulty_tag === 'Hard' ? 'bg-red-50 text-red-500 border-red-100' : 'bg-gray-50 text-gray-500 border-gray-100'}`}>{currentQ.difficulty_tag}</span>}
                            </div>
                            <div className="flex items-center gap-3">
                                {/* 📖 查看知识点按钮 */}
                                {hasReadingMaterial && (
                                    <button
                                        onClick={handleViewKnowledge}
                                        className="flex items-center gap-1 text-purple-600 text-sm font-bold hover:text-purple-800 transition-colors bg-purple-50 px-3 py-1.5 rounded-lg hover:bg-purple-100"
                                    >
                                        <span>📖</span>
                                        <span>知识点</span>
                                    </button>
                                )}
                                <div className="flex items-center gap-1 text-brand-orange font-black">
                                    <i className="fas fa-bolt"></i>
                                    <span>{currentQ.score_value || 10} XP</span>
                                </div>
                            </div>
                        </div>

                        <h3 className="text-xl md:text-2xl font-bold mb-8 text-gray-800 leading-relaxed font-display" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                            <SafeText>{currentQ.question_text || ''}</SafeText>
                        </h3>

                        {renderInteraction()}
                    </Card>

                    {/* Feedback Area */}
                    <div className="mt-6 h-24">
                        {showResult ? (
                            <div className="animate-fade-in">
                                {/* 答错时自动提示查看知识点 */}
                                {!isCorrect() && hasReadingMaterial && !viewedKnowledgeForQuestion.has(currentStep) && (
                                    <div className="mb-3 p-3 bg-purple-50 border border-purple-200 rounded-xl text-purple-700 text-sm flex items-center justify-between">
                                        <span>💡 建议阅读知识点，帮助你理解这道题</span>
                                        <button onClick={handleViewKnowledge} className="text-purple-600 font-bold underline">查看知识点</button>
                                    </div>
                                )}
                                {/* 错题归因组件 - 答错后显示 */}
                                {!isCorrect() && !attributionSubmittedForQuestion.has(currentStep) && (
                                    <ErrorAttribution
                                        questionId={currentQ.id}
                                        questionText={currentQ.question_text}
                                        onSubmit={async (attr) => {
                                            if (task.user_id) {
                                                await saveErrorAttribution({
                                                    question_id: attr.questionId,
                                                    user_id: task.user_id,
                                                    error_type: attr.errorType,
                                                });
                                            }
                                            setAttributionSubmittedForQuestion(prev => new Set([...prev, currentStep]));
                                        }}
                                        onSkip={() => setAttributionSubmittedForQuestion(prev => new Set([...prev, currentStep]))}
                                    />
                                )}
                                <div className={`p-4 rounded-xl text-sm mb-4 border-l-4 shadow-sm ${isCorrect() ? 'bg-green-50 border-green-400 text-green-800' : 'bg-blue-50 border-blue-400 text-blue-800'}`}>
                                    <div className="flex justify-between items-start">
                                        <div className="font-bold text-base mb-1">
                                            {isCorrect()
                                                ? `🎉 回答正确！ +${calculateXP(currentQ.score_value || 10, true)} XP${!viewedKnowledgeForQuestion.has(currentStep) ? ' (独立完成奖励!)' : ''}`
                                                : '💪 继续加油！'
                                            }
                                        </div>
                                    </div>
                                    <div className="mt-2 text-gray-700" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                                        <SafeText>{currentQ.explanation || ''}</SafeText>
                                    </div>
                                    {!aiExplanation && <div onClick={handleExplainMore} className="mt-2 text-brand-teal font-bold cursor-pointer hover:underline">🤔 还是不懂？点我让 AI 老师详解</div>}
                                    {aiExplanation && <div className="mt-3 bg-white/80 p-3 rounded border border-blue-100" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                                        <SafeText>{aiExplanation || ''}</SafeText>
                                    </div>}
                                </div>
                                <Button onClick={handleNext} className="w-full shadow-xl" size="xl" icon={<i className="fas fa-arrow-right"></i>}>{isLastQuestion ? "领取奖励" : "下一题"}</Button>
                            </div>
                        ) : (
                            isReviewMode ? (
                                <div className="space-y-3">
                                    <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-green-700 text-sm text-center">
                                        <i className="fas fa-eye mr-2"></i>
                                        回顾模式：你正在查看已完成的任务，不能重新作答
                                    </div>
                                    <Button onClick={onExit} className="w-full" size="xl" variant="secondary" icon={<i className="fas fa-arrow-left"></i>}>返回看板</Button>
                                </div>
                            ) : (
                                <Button onClick={handleAnswer} className="w-full shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all" size="xl" disabled={!userAnswer && userAnswer !== 0}>提交答案</Button>
                            )
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};
