import React, { useState, useRef, useMemo, useEffect } from 'react';
import { User, DailyTask, RepositoryItem, Attachment, Book, CustomReward, RewardConfig, LearningPeriod, MaterialType, MaterialAnalysis, WeeklyReviewSummary } from '../types';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { analyzeMaterialsAndCreatePlan, generateQuizFromBook } from '../services/aiService';
import { generateTaskWithAgent, AgentTaskResult } from '../services/agentTaskService';
import { generateSmartSuggestion, SmartSuggestionResult } from '../services/smartSuggestionService';
import { AgentTracePanel, AgentTraceBadge } from '../components/AgentTracePanel';
import { Toast } from '../components/Toast';
import 'katex/dist/katex.min.css';
import Latex from 'react-latex-next';
import { rewardService } from '../services/rewardService';
import { PinEntryModal } from '../components/PinEntryModal';
import { userService } from '../services/userService';
import { learningService } from '../services/learningService';
import { taskService } from '../services/taskService';
import imageCompression from 'browser-image-compression';
import { useUserPreferences } from '../hooks/useUserPreferences';
import { AI_STEPS, SUCCESS, ERROR } from '../constants/copywriting';
import { AgentChatModal } from '../components/AgentChatModal';
import { TraceProvider, useTrace } from '../contexts/TraceContext';
import { FloatingTracePanel } from '../components/FloatingTracePanel';
import { PeriodSelector } from '../components/PeriodSelector';
import { MaterialConfirmDialog } from '../components/MaterialConfirmDialog';
import { WeekendReviewCard } from '../components/WeekendReviewCard';
import { getEffectiveMode, getLearningDecision, isWeekend, isChineseHoliday, getWeeklyReviewSummary } from '../services/learningModeService';
import quizBoard3d from '../assets/icons/3d/quiz_board_3d.png';
import starCoin3d from '../assets/icons/3d/star_coin_3d.png';
import giftBox3d from '../assets/icons/3d/gift_box_3d.png';
import bookStack3d from '../assets/icons/3d/book_stack_3d.png';

interface ParentDashboardProps {
    user: User;
    children?: User[];
    repository: RepositoryItem[];
    tasks?: DailyTask[];
    books?: Book[];
    rewards?: CustomReward[];
    rewardConfig: RewardConfig;
    onAddToRepo: (item: RepositoryItem) => void;
    onAddTask: (task: DailyTask, targetChildId?: string) => void;
    onChangeUser: () => void;
    onUpdateChildSettings: (grade: number) => void;
    onUpdateRewardConfig: (cfg: RewardConfig) => void;
    onAddReward: (reward: CustomReward) => void;
    onDeleteReward: (rewardId: string) => void;
    onGrantBonus: (xp: number, tabletMinutes: number, reason: string) => void;
    onAddChild: (name: string, grade: number) => Promise<{ success: boolean; error?: string }>;
}

type Tab = 'create' | 'report' | 'repository' | 'rewards';
type ReportPeriod = 'today' | 'week';

export const ParentDashboard: React.FC<ParentDashboardProps> = ({
    user,
    children = [],
    repository,
    tasks = [],
    books = [],
    rewards = [],
    rewardConfig,
    onAddToRepo,
    onAddTask,
    onChangeUser,
    onUpdateChildSettings,
    onUpdateRewardConfig,
    onAddReward,
    onDeleteReward,
    onGrantBonus,
    onAddChild
}) => {
    const [activeTab, setActiveTab] = useState<Tab>('create');
    const [reportPeriod, setReportPeriod] = useState<ReportPeriod>('today');

    // 用户偏好记忆
    const { prefs, updatePref } = useUserPreferences();

    const [inputMode, setInputMode] = useState<'upload' | 'topic' | 'book_quiz' | 'repository' | 'smart_suggest'>(prefs.lastInputMode as any || 'upload');
    const [selectedRepoItem, setSelectedRepoItem] = useState<RepositoryItem | null>(null);
    const [agentTrace, setAgentTrace] = useState<any[]>([]); // Agent 思考过程
    const [selectedSubject, setSelectedSubject] = useState<string | undefined>(undefined); // 智能推荐的偏好科目

    const [viewingMaterial, setViewingMaterial] = useState<RepositoryItem | null>(null);

    const [isProcessing, setIsProcessing] = useState(false);
    const [processingStage, setProcessingStage] = useState(0); // 0: Start, 1: Reading, 2: Analyzing, 3: Generating

    // 生成任务队列（乐观 UI 模式）
    interface GeneratingTask {
        id: string;
        title: string;
        status: 'pending' | 'processing' | 'success' | 'error';
        error?: string;
    }
    const [generatingTasks, setGeneratingTasks] = useState<GeneratingTask[]>([]);

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [toast, setToast] = useState<{ msg: string, type: 'success' | 'error' } | null>(null);

    // 选中的孩子（多孩子时需要选择）
    const [selectedChildId, setSelectedChildId] = useState<string | null>(children.length > 0 ? children[0].id : null);
    const selectedChild = children.find(c => c.id === selectedChildId) || children[0];

    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [instruction, setInstruction] = useState('');
    const [readDuration, setReadDuration] = useState<number>(prefs.readingDuration || 20);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [newRewardName, setNewRewardName] = useState('');
    const [newRewardCost, setNewRewardCost] = useState(300);
    const [bonusReason, setBonusReason] = useState('');

    const [localRewardConfig, setLocalRewardConfig] = useState<RewardConfig>(rewardConfig);
    const [isSavingConfig, setIsSavingConfig] = useState(false);

    const [wrongQuestions, setWrongQuestions] = useState<any[]>([]);

    // Custom confirm modal state (replaces browser confirm() which causes shake)
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; rewardId: string | null }>({ isOpen: false, rewardId: null });

    const [isChatOpen, setIsChatOpen] = useState(false);

    // Use global preference state directly
    // Use global preference state directly, but sync with DB for family setting
    const learningPeriod = prefs.learningPeriod;

    // Sync from DB on mount
    useEffect(() => {
        const fetchFamilySettings = async () => {
            if (user?.family_id) { // Assuming user is available in scope
                const family = await userService.getFamily(); // userService is imported? Need to check imports
                if (family && family.learning_period) {
                    // If DB differs from local pref, update local pref to match DB
                    if (family.learning_period !== prefs.learningPeriod) {
                        updatePref('learningPeriod', family.learning_period as LearningPeriod);
                    }
                }
            }
        };
        fetchFamilySettings();
    }, [user?.family_id]);

    const setLearningPeriod = async (val: LearningPeriod) => {
        // Optimistic update
        updatePref('learningPeriod', val);

        // Persist to DB
        if (user?.family_id) {
            const res = await userService.updateFamilyLearningPeriod(user.family_id, val);
            if (!res.success) {
                console.error('Failed to persist learning period:', res.error);
                // Optionally revert? For now just log.
            }
        }
    };

    const [materialConfirmOpen, setMaterialConfirmOpen] = useState(false);
    const [pendingMaterialAnalysis, setPendingMaterialAnalysis] = useState<MaterialAnalysis | null>(null);
    const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);

    // 周末整理数据
    const [weeklyReviewSummary, setWeeklyReviewSummary] = useState<WeeklyReviewSummary | null>(null);
    const [isLoadingWeeklyReview, setIsLoadingWeeklyReview] = useState(false);

    useEffect(() => {
        setLocalRewardConfig(rewardConfig);
    }, [rewardConfig.base_tablet, rewardConfig.base_outdoor, rewardConfig.max_tablet, rewardConfig.max_outdoor, rewardConfig.allocation_ratio]);

    // Load wrong answers specifically for the report tab
    // 🔧 新增：用于报告的家庭任务数据（包含所有孩子的任务）
    const [familyTasks, setFamilyTasks] = useState<DailyTask[]>([]);
    const [isLoadingFamilyTasks, setIsLoadingFamilyTasks] = useState(false);

    useEffect(() => {
        if (activeTab === 'report' && selectedChildId) {
            const today = new Date().toISOString().split('T')[0];
            // If 'week', pass undefined to get all recent. If 'today', pass today.
            const dateFilter = reportPeriod === 'today' ? today : undefined;
            taskService.getWrongAnswers(selectedChildId, 50, dateFilter).then(data => {
                setWrongQuestions(data);
            });
        }
    }, [activeTab, selectedChildId, reportPeriod]);

    // 🔧 新增：加载家庭所有孩子的任务历史（用于报告）
    useEffect(() => {
        if (activeTab === 'report' && children && children.length > 0) {
            setIsLoadingFamilyTasks(true);
            const childIds = children.map(c => c.id);
            taskService.getFamilyChildrenTasks(childIds, 30).then(data => {
                setFamilyTasks(data);
                setIsLoadingFamilyTasks(false);
            }).catch(() => {
                setFamilyTasks([]);
                setIsLoadingFamilyTasks(false);
            });
        }
    }, [activeTab, children]);

    // 加载周末整理数据
    useEffect(() => {
        const shouldLoadWeeklyReview =
            learningPeriod === 'school' &&
            (isWeekend(new Date()) || isChineseHoliday(new Date())) &&
            selectedChildId &&
            activeTab === 'create';

        if (shouldLoadWeeklyReview) {
            setIsLoadingWeeklyReview(true);
            getWeeklyReviewSummary(selectedChildId).then(summary => {
                setWeeklyReviewSummary(summary);
                setIsLoadingWeeklyReview(false);
            }).catch(err => {
                console.error('[WeekendReview] Failed to load summary:', err);
                setIsLoadingWeeklyReview(false);
            });
        }
    }, [learningPeriod, selectedChildId, activeTab]);

    // Simulate AI Processing Stages
    useEffect(() => {
        let interval: any;
        if (isProcessing) {
            setProcessingStage(1);
            interval = setInterval(() => {
                setProcessingStage(prev => (prev < 3 ? prev + 1 : prev));
            }, 3000); // Change stage every 3 seconds
        } else {
            setProcessingStage(0);
        }
        return () => clearInterval(interval);
    }, [isProcessing]);

    const [isAddingChild, setIsAddingChild] = useState(false);
    const [isAddingChildProcessing, setIsAddingChildProcessing] = useState(false);
    const [newChildName, setNewChildName] = useState('');
    const [newChildGrade, setNewChildGrade] = useState(4);

    const currentGrade = children.length > 0 ? (children[0].grade_level || 4) : 4;

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newAttachments: Attachment[] = [];

            for (let i = 0; i < e.target.files.length; i++) {
                const f = e.target.files[i];

                try {
                    let fileToProcess = f;

                    // Only compress images
                    if (f.type.startsWith('image/')) {
                        const options = {
                            maxSizeMB: 0.8, // Target ~800KB (balanced quality)
                            maxWidthOrHeight: 1280, // Resize large photos
                            useWebWorker: true
                        };
                        try {
                            const compressedFile = await imageCompression(f, options);
                            fileToProcess = compressedFile;
                            console.log(`Compressed: ${f.size / 1024 / 1024}MB -> ${compressedFile.size / 1024 / 1024}MB`);
                        } catch (error) {
                            console.warn("Compression failed, using original:", error);
                        }
                    }

                    // Convert to Base64
                    const reader = new FileReader();
                    reader.readAsDataURL(fileToProcess);
                    reader.onload = (ev) => {
                        if (ev.target?.result) {
                            // Use original name but update attachment state
                            setAttachments(prev => [...prev, {
                                name: f.name,
                                type: f.type,
                                data: ev.target!.result as string
                            }]);
                        }
                    }
                } catch (err) {
                    console.error("File processing error", err);
                    showToast("文件处理失败", "error");
                }
            }
        }
    };
    const removeAttachment = (i: number) => setAttachments(prev => prev.filter((_, idx) => idx !== i));

    const handleAddChild = async () => {
        if (isAddingChildProcessing) return;

        if (!newChildName.trim()) {
            showToast("请输入孩子名字", "error");
            return;
        }

        setIsAddingChildProcessing(true);
        try {
            const res = await onAddChild(newChildName, newChildGrade);
            if (res.success) {
                showToast("孩子账号添加成功！", "success");
                setIsAddingChild(false);
                setNewChildName('');
                setNewChildGrade(4);
            } else {
                showToast(res.error || "添加失败", "error");
            }
        } finally {
            setIsAddingChildProcessing(false);
        }
    };

    const handleSaveConfig = async () => {
        setIsSavingConfig(true);
        try {
            await onUpdateRewardConfig(localRewardConfig);
            showToast("设置已保存", "success");
        } catch (e) {
            showToast("保存失败", "error");
        } finally {
            setIsSavingConfig(false);
        }
    };

    const handleDeleteReward = async (e: React.MouseEvent, rewardId: string) => {
        e.stopPropagation();
        // Show custom confirm modal instead of browser confirm()
        setConfirmModal({ isOpen: true, rewardId });
    };

    const confirmDeleteReward = () => {
        if (confirmModal.rewardId) {
            onDeleteReward(confirmModal.rewardId);
            showToast("奖励删除中...");
        }
        setConfirmModal({ isOpen: false, rewardId: null });
    };

    const handleReassign = (e: React.MouseEvent, item: RepositoryItem) => {
        e.stopPropagation();
        if (!checkChildExists()) return;
        setSelectedRepoItem(item);
        setInputMode('repository');
        setActiveTab('create');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleViewMaterial = async (item: RepositoryItem) => {
        setViewingMaterial(item);
        const fullMat = await learningService.getMaterialById(item.id);
        if (fullMat) {
            setViewingMaterial({
                ...item,
                description: fullMat.description || item.description,
                ...((fullMat.extracted_content) ? { extracted_content: fullMat.extracted_content } : {})
            } as any);
        }
    };

    const handleConfirmReassign = async () => {
        if (!selectedRepoItem || !checkChildExists()) return;
        setIsProcessing(true);
        try {
            const fullMaterial = await learningService.getMaterialById(selectedRepoItem.id);
            let contextText = selectedRepoItem.title;
            if (fullMaterial) {
                if (fullMaterial.extracted_content) {
                    const ex = fullMaterial.extracted_content as any;
                    contextText = ex?.daily_challenge?.reading_material?.content
                        || ex?.analysis?.summary
                        || fullMaterial.description
                        || fullMaterial.title;
                } else if (fullMaterial.description) {
                    contextText = fullMaterial.description;
                }
            }

            // Build prompt with optional parent instruction
            const customInstruction = instruction.trim() ? `\n\n🔥 **家长特别强调**：${instruction.trim()}` : '';
            const fullPrompt = `请基于以下资料内容重新出题，生成一套新的练习题：${customInstruction}\n\n资料内容：${contextText.substring(0, 2000)}`;

            const aiResult = await analyzeMaterialsAndCreatePlan(
                fullPrompt,
                [],
                currentGrade,
                0.75
            );

            onAddTask({
                id: `task-${Date.now()}`,
                task_type: 'quiz',
                task_date: new Date().toISOString(),
                material_id: `mat-${Date.now()}`,
                status: 'pending',
                xp_reward: 100,
                time_reward_tablet: 0,
                time_reward_outdoor: 0,
                learning_material: {
                    id: `mat-${Date.now()}`,
                    title: `复习：${selectedRepoItem.title}`,
                    subject: (aiResult.analysis?.subject?.toLowerCase() as any) || 'other',
                    material_type: 'textbook',
                    is_temporary: false,
                    ai_analysis: aiResult.analysis,
                    extracted_content: aiResult
                },
                reading_material: aiResult.daily_challenge.reading_material,
                questions: aiResult.daily_challenge.questions.map((q: any, i: number) => ({
                    id: `q-${Date.now()}-${i}`,
                    question_text: q.question_text,
                    question_type: q.question_type,
                    options: q.options,
                    correct_answer: q.correct_answer || q.expected?.value,
                    expected: q.expected,
                    explanation: q.explanation,
                    score_value: q.score_value || 10,
                    difficulty_tag: q.difficulty_tag,
                    knowledge_points: q.knowledge_points || []
                }))
            }, selectedChildId || undefined);

            showToast("AI 已基于原资料生成新题并发布！", "success");
            setActiveTab('report');
            setSelectedRepoItem(null);
            setInputMode('upload');

        } catch (e: any) {
            showToast("发布失败: " + e.message, "error");
        } finally {
            setIsProcessing(false);
        }
    }

    const checkChildExists = () => {
        if (children.length === 0) {
            showToast("请先点击右上角“添加孩子”创建账号", "error");
            setIsSettingsOpen(true);
            setIsAddingChild(true);
            return false;
        }
        return true;
    };

    // 🤖 Agent 统一提交处理 (All-in-One Handler)
    const handleDirectReading = async () => {
        if (!checkChildExists() || !selectedChildId) return;

        await onAddTask({
            id: `task-${Date.now()}`,
            task_type: 'reading',
            task_date: new Date().toISOString(),
            material_id: `mat-${Date.now()}`,
            status: 'pending',
            xp_reward: 100,
            time_reward_tablet: 15,
            time_reward_outdoor: 0,
            learning_material: {
                id: `mat-${Date.now()}`,
                title: '30分钟自主阅读',
                subject: 'other',
                material_type: 'book',
                is_temporary: true,
                ai_analysis: { subject: 'other', topic: 'Free Reading' },
                extracted_content: { reading_material: { title: '自主阅读', content: '请选择一本你喜欢的书，专注于阅读30分钟。读完后可以和爸爸妈妈分享你的感想哦！' } }
            },
            reading_material: { title: '自主阅读', content: '请选择一本你喜欢的书，专注于阅读30分钟。读完后可以和爸爸妈妈分享你的感想哦！', source_style: 'Story' },
            questions: []
        }, selectedChildId);

        showToast("📚 阅读任务已添加", "success");
    };

    const handleAgentSubmit = async (overrideMessage?: string, confirmedMaterialType?: MaterialType) => {
        if (!checkChildExists() || !selectedChildId) return;

        const finalMessage = overrideMessage || instruction;

        // 如果有附件但没有确认资料类型，先弹出确认弹窗
        if (attachments.length > 0 && !confirmedMaterialType) {
            setPendingAttachments([...attachments]);
            setPendingMaterialAnalysis({
                detected_type: 'completed_exam', // 默认检测为已完成试卷
                subject: selectedSubject || 'other',
                confidence: 0.8,
                knowledge_points: []
            });
            setMaterialConfirmOpen(true);
            return; // 等待用户确认后再继续
        }

        // 如果什么都没填，默认为智能推荐
        const isDecideToday = attachments.length === 0 && !finalMessage;

        const taskId = `gen-${Date.now()}`;
        const taskTitle = isDecideToday
            ? '🤖 智能推荐 (Agent)'
            : finalMessage
                ? `✨ ${finalMessage.substring(0, 10)}...`
                : '📄 资料分析';

        setIsProcessing(true);
        setAgentTrace([{ step: 'start', result: { message: 'Agent 已接收请求，正在思考...' } }]);

        // 乐观 UI：立即显示生成中
        setGeneratingTasks(prev => [...prev, { id: taskId, title: taskTitle, status: 'processing' }]);
        setInstruction(''); // 立即清空输入
        setAttachments([]); // 立即清空附件

        // 后台异步执行
        (async () => {
            try {
                // 1. 确定任务类型
                let taskType: 'process_upload' | 'generate_tasks' | 'decide_today' = 'decide_today';
                if (attachments.length > 0) taskType = 'process_upload';
                else if (finalMessage) taskType = 'generate_tasks';

                // 2. 准备附件格式
                const agentReqAttachments = attachments.map(att => ({
                    id: `att-${Date.now()}`,
                    type: att.type.includes('image') ? 'image' : att.type.includes('pdf') ? 'pdf' : 'text',
                    data: att.data,
                    mimeType: att.type,
                    filename: att.name
                }));

                // 3. 准备上下文 (Context) - 包含学习负担调度信息
                const effectiveMode = getEffectiveMode(learningPeriod);
                const context: any = {
                    learningPeriod,
                    effectiveMode,
                    materialType: confirmedMaterialType || undefined
                };
                if (selectedSubject) context.preferredSubject = selectedSubject;

                // 如果有 materialType，获取决策并加入 context
                if (confirmedMaterialType) {
                    const decision = getLearningDecision(confirmedMaterialType, effectiveMode);
                    context.learningDecision = decision;
                    console.log('[Agent] Using decision:', decision);
                }

                // 4. 调用 Agent Core
                // 动态导入以避免循环依赖或加载过重
                const { runAgent } = await import('../services/agentCore');
                const result = await runAgent({
                    studentId: selectedChild.id,
                    task: taskType,
                    message: finalMessage,
                    attachments: agentReqAttachments,
                    context
                });

                // 5. 更新思考痕迹 (Trace)
                if (result.steps && result.steps.length > 0) {
                    const formattedTrace = result.steps.map((s, i) => ({
                        step: s.toolCall ? `🔧 调用工具: ${s.toolCall.name}` : `🧠 思考 (${i + 1})`,
                        result: {
                            message: s.thought || (s.toolCall ? `参数: ${JSON.stringify(s.toolCall.args)}` : '...'),
                            output: s.toolOutput
                        }
                    }));
                    setAgentTrace(formattedTrace);
                }

                if (!result.success) {
                    throw new Error(result.error || "Agent 生成失败");
                }

                // 6. 解析结果并创建任务
                const aiData = result.result || {};

                // 尝试适配不同结构的结果
                let payload = aiData.daily_challenge || aiData;

                // [FIX] 针对 process_upload 场景，如果主结果只有文本，尝试从 toolCalls 找 process_full_upload_task 的结果
                if ((!payload.questions || payload.questions.length === 0) && result.toolCalls) {
                    // 1. 优先尝试找 process_full_upload_task (New Tool)
                    let uploadCall = result.toolCalls.find(t => t.name === 'process_full_upload_task');
                    if (uploadCall && uploadCall.result) {
                        console.log("Found payload in toolCall:", uploadCall.name);
                        // [CRITICAL FIX] 修复嵌套层级问题
                        // process_full_upload_task 返回的 data 字段才是 aiService 的 result
                        // 结构是: toolResult = { success: true, data: { analysis:..., daily_challenge:... } }
                        const toolData = uploadCall.result;
                        payload = toolData.daily_challenge || toolData;
                    }

                    // 2. 如果没找到，尝试找 generate_reading_material (Old Tool used by Agent sometimes)
                    if ((!payload.questions || payload.questions.length === 0)) {
                        const matCall = result.toolCalls.find(t => t.name === 'generate_reading_material');
                        if (matCall && matCall.result) {
                            console.log("Found payload in toolCall:", matCall.name);
                            // generate_reading_material returns { reading_material, questions, title } at root or inside data
                            payload = matCall.result;
                        }
                    }
                }

                // 最后的兜底校验
                if (!payload.reading_material && !payload.questions) {
                    // 如果还是没有，可能是纯文本回复，尝试作为阅读任务
                    if (aiData.answer) {
                        payload = {
                            title: 'Agent 建议',
                            reading_material: { title: '建议', content: aiData.answer, source_style: 'Explanation' }
                        };
                    }
                }

                const taskSubject = (payload.subject || aiData.analysis?.subject || selectedSubject || 'other').toLowerCase();
                const generatedTitle = payload.title || (finalMessage ? `任务：${finalMessage}` : '今日智能推荐');

                await onAddTask({
                    id: `task-${Date.now()}`,
                    task_type: (payload.questions && payload.questions.length > 0) ? 'quiz' : 'reading',
                    task_date: new Date().toISOString(),
                    material_id: `mat-${Date.now()}`,
                    status: 'pending',
                    xp_reward: isDecideToday ? 150 : 100, // 智能推荐奖励更高
                    time_reward_tablet: 0,
                    time_reward_outdoor: 0,
                    learning_material: {
                        id: `mat-${Date.now()}`,
                        title: generatedTitle,
                        subject: taskSubject as any,
                        material_type: attachments.length > 0 ? 'textbook' : 'temporary',
                        is_temporary: attachments.length === 0,
                        ai_analysis: payload.analysis || { subject: taskSubject, topic: generatedTitle },
                        extracted_content: payload
                    },
                    reading_material: payload.reading_material,
                    questions: (payload.questions || []).map((q: any, i: number) => ({
                        id: `q-${Date.now()}-${i}`,
                        question_text: q.question_text,
                        question_type: q.question_type,
                        options: q.options,
                        correct_answer: q.correct_answer || q.expected?.value,
                        expected: q.expected,
                        explanation: q.explanation,
                        score_value: q.score_value || 10,
                        difficulty_tag: q.difficulty_tag,
                        knowledge_points: q.knowledge_points || []
                    }))
                }, selectedChildId);

                // 成功完成
                setGeneratingTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'success' } : t));
                showToast(`🎉 任务生成成功！`, "success");

                // 延迟移除成功状态
                setTimeout(() => {
                    setGeneratingTasks(prev => prev.filter(t => t.id !== taskId));
                }, 4000);

            } catch (e: any) {
                console.error("[HandleAgentSubmit] Error:", e);
                setAgentTrace(prev => [...prev, { step: '❌ 出错了', result: { message: e.message } }]);
                setGeneratingTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'error', error: e.message } : t));
                showToast(`生成失败: ${e.message}`, "error");
            } finally {
                setIsProcessing(false);
            }
        })();
    };

    const handleAddCustomReward = () => {
        if (!newRewardName) return;
        onAddReward({ id: `r-${Date.now()}`, name: newRewardName, cost_xp: newRewardCost, is_active: true, icon: '🎁' });
        setNewRewardName(''); setNewRewardCost(300);
        showToast("奖励添加成功");
    };

    const handleManualBonus = () => {
        if (!checkChildExists()) return;
        if (!bonusReason) return;
        onGrantBonus(50, 10, bonusReason);
        setBonusReason('');
        showToast("奖励已发放！", 'success');
    }

    // --- Report Logic ---
    const reportData = useMemo(() => {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const startOfWeek = startOfDay - (now.getDay() === 0 ? 6 : now.getDay() - 1) * 86400000;
        const startTime = reportPeriod === 'today' ? startOfDay : startOfWeek;

        // 🔧 修复：使用 familyTasks（包含所有孩子的任务），按 child_id/user_id 过滤
        const childTasks = familyTasks.filter(t => (t.child_id || (t as any).user_id) === selectedChildId);
        const periodTasks = childTasks.filter(t => new Date(t.task_date).getTime() >= startTime);

        const completedTasks = periodTasks.filter(t => t.status === 'completed');
        const readingTasks = completedTasks.filter(t => t.task_type === 'reading');
        const quizTasks = completedTasks.filter(t => t.task_type === 'quiz');

        const totalReadingTime = readingTasks.reduce((acc, t) => acc + (t.actual_reading_duration || 0), 0);

        // 按科目统计分数
        const subjectScores: Record<string, { total: number; count: number }> = {};
        quizTasks.forEach(t => {
            // 🔧 修复：从 learning_material.subject 获取科目，而不是 extracted_content
            const subject = t.learning_material?.subject || '其他';
            if (t.score !== undefined && t.score !== null) {
                if (!subjectScores[subject]) {
                    subjectScores[subject] = { total: 0, count: 0 };
                }
                subjectScores[subject].total += t.score;
                subjectScores[subject].count++;
            }
        });

        // 计算总体平均分
        let totalScoreSum = 0;
        let scoredTasksCount = 0;
        Object.values(subjectScores).forEach(s => {
            totalScoreSum += s.total;
            scoredTasksCount += s.count;
        });
        const avgScore = scoredTasksCount > 0 ? Math.round(totalScoreSum / scoredTasksCount) : 0;

        // 🔧 修复：从真实数据生成 insights，而不是 mock 数据
        const insights = Object.entries(subjectScores).map(([subject, data]) => {
            const score = Math.round(data.total / data.count);
            return {
                subject,
                score,
                status: score > 80 ? 'good' : score < 60 ? 'bad' : 'warning'
            };
        });

        // 如果没有数据，显示默认提示
        if (insights.length === 0) {
            insights.push(
                { subject: '暂无数据', score: 0, status: 'warning' }
            );
        }

        // Recommendation
        let suggestion = "孩子表现很棒！继续保持阅读习惯。";
        if (avgScore < 70 && scoredTasksCount > 0) suggestion = "准确率有待提高，建议针对性练习巩固。";
        if (readingTasks.length === 0 && periodTasks.length > 0) suggestion = "最近阅读量较少，建议增加15分钟睡前阅读。";
        if (periodTasks.length === 0) suggestion = "该时段暂无学习记录，快去布置任务吧！";

        return {
            total: periodTasks.length,
            completed: completedTasks.length,
            readingMins: Math.floor(totalReadingTime / 60),
            booksRead: readingTasks.length,
            recentReadingLogs: readingTasks.map(t => ({
                id: t.id,
                title: t.learning_material?.title.replace('阅读任务：', ''),
                duration: Math.round((t.actual_reading_duration || 0) / 60),
                reflection: t.reading_reflection,
                date: t.completed_at || t.task_date
            })),
            avgScore,
            insights,
            suggestion
        };
    }, [familyTasks, reportPeriod, selectedChildId]);

    // Yesterday Recap Data (Mock logic based on real history would go here)
    // For now, we reuse reportData logic but pretend it's yesterday if we were strict, 
    // but for MVP we just show "Recent Performance" as a hook.
    const performanceHook = reportData.avgScore < 80 ? "⚠️ 最近数学正确率有些波动，建议复习错题。" : "🌟 最近表现非常稳定，可以尝试一些挑战题！";

    const renderWrongQuestionList = () => {
        if (wrongQuestions.length === 0) {
            return <p className="text-sm text-gray-400 text-center py-4">暂无错题记录，太棒了！</p>;
        }
        return (
            <div className="space-y-3">
                {wrongQuestions.map((record) => (
                    <div key={record.id} className="bg-red-50 p-3 rounded-lg border border-red-100">
                        <div className="font-bold text-gray-800 text-sm mb-1">
                            <Latex>{(record.question?.question_text || "题目未知").includes('\\') ? `$${record.question?.question_text || "题目未知"}$` : (record.question?.question_text || "题目未知")}</Latex>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-red-400 line-through">我的: <Latex>{String(record.user_answer).includes('\\') ? `$${record.user_answer}$` : String(record.user_answer)}</Latex></span>
                            <span className="text-green-600 font-bold">正解: <Latex>{record.question?.correct_answer?.includes('\\') ? `$${record.question?.correct_answer}$` : record.question?.correct_answer}</Latex></span>
                        </div>
                        <div className="text-[10px] text-gray-400 mt-1 text-right">{new Date(record.created_at).toLocaleString()}</div>
                    </div>
                ))}
            </div>
        );
    };

    const renderProcessingOverlay = () => (
        <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center rounded-3xl animate-fade-in border-4 border-brand-mint/50">
            <div className="relative mb-8">
                <div className="w-32 h-32 rounded-full border-4 border-brand-teal/20 flex items-center justify-center animate-pulse">
                    <div className="text-6xl animate-bounce">🤖</div>
                </div>
                {/* Scan effect */}
                <div className="absolute top-0 left-0 w-full h-full rounded-full overflow-hidden">
                    <div className="w-full h-1 bg-brand-teal/50 shadow-[0_0_15px_rgba(38,166,154,0.8)] absolute top-0 animate-scan"></div>
                </div>
            </div>
            <h3 className="text-2xl font-black text-brand-textDark mb-2 animate-pulse">
                {AI_STEPS.find(s => s.stage === processingStage)?.icon} {AI_STEPS.find(s => s.stage === processingStage)?.title || 'AI 老师启动中...'}
            </h3>
            <p className="text-brand-textLight text-sm font-bold">
                {AI_STEPS.find(s => s.stage === processingStage)?.subtitle || '请勿关闭页面，马上就好！'}
            </p>
            <div className="mt-6 w-48 h-3 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-brand-teal animate-[slideUp_2s_ease-in-out_infinite] w-full origin-left scale-x-0" style={{ animation: 'load 3s infinite linear' }}></div>
            </div>
            <style>{`
            @keyframes load { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
          `}</style>
        </div>
    );

    return (
        <TraceProvider>
            <div className="min-h-screen bg-brand-bg pb-20 font-sans">
                {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

                {/* 浮动孩子选择器 - 固定右侧，鼠标悬停展开 */}
                {children.length > 1 && (
                    <div className="fixed right-0 top-1/2 -translate-y-1/2 z-40 group">
                        {/* 折叠状态：只显示当前孩子头像/首字 */}
                        <div className="
                            bg-white/90 backdrop-blur-xl shadow-lg rounded-l-2xl 
                            border border-r-0 border-gray-200
                            transition-all duration-300 ease-out
                            w-12 group-hover:w-48
                            overflow-hidden
                        ">
                            {/* 当前选中指示器 */}
                            <div className="p-2 border-b border-gray-100 bg-gradient-to-r from-brand-teal/10 to-transparent">
                                <div className="text-xs font-bold text-gray-400 whitespace-nowrap overflow-hidden">
                                    <span className="group-hover:hidden">👤</span>
                                    <span className="hidden group-hover:inline">📊 查看报告</span>
                                </div>
                            </div>

                            {/* 孩子列表 */}
                            <div className="flex flex-col">
                                {children.map(child => (
                                    <button
                                        key={child.id}
                                        onClick={() => setSelectedChildId(child.id)}
                                        className={`
                                            flex items-center gap-3 p-3 transition-all duration-200 whitespace-nowrap
                                            ${selectedChildId === child.id
                                                ? 'bg-brand-teal/10 border-l-4 border-brand-teal'
                                                : 'hover:bg-gray-50 border-l-4 border-transparent'
                                            }
                                        `}
                                    >
                                        {/* 头像/首字 */}
                                        <div className={`
                                            w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0
                                            ${selectedChildId === child.id
                                                ? 'bg-brand-teal text-white'
                                                : 'bg-gray-100 text-gray-500'
                                            }
                                        `}>
                                            {child.name.charAt(0)}
                                        </div>
                                        {/* 名字 - 展开时显示 */}
                                        <span className={`
                                            text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-200
                                            ${selectedChildId === child.id ? 'text-brand-darkTeal' : 'text-gray-600'}
                                        `}>
                                            {child.name}
                                        </span>
                                        {/* 选中标记 */}
                                        {selectedChildId === child.id && (
                                            <span className="ml-auto text-brand-teal opacity-0 group-hover:opacity-100 transition-opacity">
                                                <i className="fas fa-check-circle"></i>
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                <header className="bg-white/90 backdrop-blur-xl sticky top-0 z-30 border-b border-brand-border/40 shadow-sm px-6 py-4 flex justify-between items-center transition-all duration-300">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-teal-500 shadow-lg shadow-teal-500/20 flex items-center justify-center text-2xl text-white transform hover:scale-105 hover:rotate-3 transition-all duration-300 cursor-pointer">
                            🧘
                        </div>
                        <div>
                            <h1 className="text-xl font-black font-display text-gray-800 leading-tight tracking-tight">家长控制台</h1>
                            <div className="flex items-center gap-3 mt-1">
                                <button onClick={() => { setIsSettingsOpen(true); setIsAddingChild(true); }} className="px-2 py-0.5 rounded-full bg-teal-50 text-xs font-bold text-teal-600 hover:bg-teal-100 transition-colors flex items-center gap-1">
                                    <span>+ 添加孩子</span>
                                </button>
                                <button onClick={() => { setIsSettingsOpen(!isSettingsOpen); setIsAddingChild(false); }} className="text-xs font-bold text-gray-400 hover:text-teal-500 transition-colors flex items-center gap-1">
                                    <span>⚙️ 设定</span>
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex items-center gap-2 bg-gray-50/80 px-4 py-2 rounded-full border border-gray-100">
                            <span className="text-lg">👤</span>
                            <span className="text-sm font-bold text-gray-600">{user.name}</span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={onChangeUser} className="text-gray-400 hover:text-red-500 font-bold">退出</Button>
                    </div>
                </header>

                {/* 生成任务状态栏 */}
                {generatingTasks.length > 0 && (
                    <div className="bg-gradient-to-r from-brand-mint to-brand-teal/20 px-6 py-3 border-b border-brand-teal/20">
                        <div className="flex items-center gap-4 overflow-x-auto">
                            {generatingTasks.map(task => (
                                <div key={task.id} className="flex items-center gap-2 bg-white/80 px-3 py-1.5 rounded-full text-sm font-medium shadow-sm shrink-0">
                                    {task.status === 'processing' && (
                                        <>
                                            <div className="w-4 h-4 border-2 border-brand-teal border-t-transparent rounded-full animate-spin"></div>
                                            <span className="text-brand-darkTeal">生成中: {task.title}</span>
                                        </>
                                    )}
                                    {task.status === 'success' && (
                                        <>
                                            <i className="fas fa-check-circle text-green-500"></i>
                                            <span className="text-green-700">{task.title} 完成!</span>
                                        </>
                                    )}
                                    {task.status === 'error' && (
                                        <>
                                            <i className="fas fa-exclamation-circle text-red-500"></i>
                                            <span className="text-red-600 truncate max-w-[150px]" title={task.error}>失败</span>
                                            <button
                                                onClick={() => setGeneratingTasks(prev => prev.filter(t => t.id !== task.id))}
                                                className="text-gray-400 hover:text-red-500"
                                            >
                                                <i className="fas fa-times text-xs"></i>
                                            </button>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {isSettingsOpen && (
                    <div className="bg-white/95 backdrop-blur-xl border-b border-gray-100 p-8 animate-slide-up shadow-xl relative z-20">
                        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Left Column: Member & Period */}
                            <div className="space-y-8">
                                <section>
                                    <h3 className="font-display font-black text-xl text-gray-800 mb-6 flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-500">
                                            <i className="fas fa-users"></i>
                                        </div>
                                        家庭成员 & 年级
                                    </h3>
                                    <div className="space-y-3 mb-4">
                                        {children.map(child => (
                                            <div key={child.id} className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-brand-primary/10 text-brand-primary rounded-full flex items-center justify-center font-display font-black text-lg">
                                                        {child.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-gray-800">{child.name}</div>
                                                        <div className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full inline-block mt-1">{child.grade_level || 4}年级</div>
                                                    </div>
                                                </div>
                                                <div className="text-gray-300">
                                                    <i className="fas fa-chevron-right"></i>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {!isAddingChild ? (
                                        <button onClick={() => setIsAddingChild(true)} className="w-full py-3 border-2 border-dashed border-gray-200 text-gray-400 rounded-xl font-bold hover:border-brand-teal hover:text-brand-teal hover:bg-brand-mint/10 transition-all flex items-center justify-center gap-2 group">
                                            <div className="w-6 h-6 rounded-full bg-gray-100 group-hover:bg-brand-teal group-hover:text-white flex items-center justify-center transition-colors">
                                                <i className="fas fa-plus text-xs"></i>
                                            </div>
                                            添加新成员
                                        </button>
                                    ) : (
                                        <div className="premium-card p-6 animate-fade-in border-2 border-brand-teal/20">
                                            <h4 className="font-bold text-gray-800 mb-4">添加孩子</h4>
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">名字</label>
                                                    <input type="text" value={newChildName} onChange={e => setNewChildName(e.target.value)} className="w-full p-3 text-sm border-2 border-gray-200 rounded-xl focus:border-brand-teal outline-none transition-colors" placeholder="例如: 小明" autoFocus />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">年级</label>
                                                    <div className="flex gap-2 overflow-x-auto pb-2">
                                                        {[1, 2, 3, 4, 5, 6].map(g => (
                                                            <button key={g} onClick={() => setNewChildGrade(g)} className={`w-10 h-10 rounded-xl font-black text-sm border-2 transition-all ${newChildGrade === g ? 'bg-brand-teal text-white border-brand-teal shadow-lg shadow-brand-teal/30 scale-105' : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'}`}>{g}</button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="flex gap-3 pt-2">
                                                    <Button size="sm" variant="ghost" onClick={() => setIsAddingChild(false)} className="flex-1" disabled={isAddingChildProcessing}>取消</Button>
                                                    <Button size="sm" onClick={handleAddChild} className="flex-1" isLoading={isAddingChildProcessing}>确认添加</Button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </section>

                                <section>
                                    <h3 className="font-display font-black text-xl text-gray-800 mb-6 flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-500">
                                            <i className="fas fa-calendar-alt"></i>
                                        </div>
                                        当前学期状态
                                    </h3>
                                    <PeriodSelector
                                        value={learningPeriod}
                                        onChange={setLearningPeriod}
                                    />
                                </section>
                            </div>

                            {/* Right Column: Reward Config */}
                            <div>
                                <div className="premium-card p-8 h-full">
                                    <div className="flex justify-between items-center mb-8">
                                        <h3 className="font-display font-black text-xl text-gray-800 flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-pink-100 flex items-center justify-center text-pink-500">
                                                <i className="fas fa-sliders-h"></i>
                                            </div>
                                            奖励机制配置
                                        </h3>
                                        <Button size="sm" onClick={handleSaveConfig} isLoading={isSavingConfig} icon={<i className="fas fa-save"></i>}>保存设置</Button>
                                    </div>

                                    <div className="space-y-6">
                                        {[
                                            { label: '基础平板时长', key: 'base_tablet', icon: 'tablets' },
                                            { label: '基础户外时长', key: 'base_outdoor', icon: 'tree' },
                                            { label: '平板时长上限', key: 'max_tablet', icon: 'stop-circle' },
                                            { label: '户外时长上限', key: 'max_outdoor', icon: 'stop-circle' }
                                        ].map((setting) => (
                                            <div key={setting.key} className="flex items-center justify-between group">
                                                <span className="font-bold text-gray-600 flex items-center gap-2">
                                                    <i className={`fas fa-${setting.icon} text-gray-300 w-5 text-center group-hover:text-brand-teal transition-colors`}></i>
                                                    {setting.label}
                                                </span>
                                                <div className="flex items-center gap-3">
                                                    <div className="relative">
                                                        <input
                                                            type="number"
                                                            value={(localRewardConfig as any)[setting.key]}
                                                            onChange={e => setLocalRewardConfig({ ...localRewardConfig, [setting.key]: Number(e.target.value) })}
                                                            className="w-24 py-2 px-4 border-2 border-gray-200 rounded-xl text-center font-black text-brand-darkTeal focus:border-brand-teal outline-none transition-colors"
                                                        />
                                                    </div>
                                                    <span className="text-xs font-bold text-gray-400 w-8">分钟</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="mt-8 pt-6 border-t border-gray-100">
                                        <div className="bg-blue-50 rounded-xl p-4 flex gap-4 items-start">
                                            <div className="text-blue-500 mt-1">
                                                <i className="fas fa-info-circle"></i>
                                            </div>
                                            <p className="text-xs text-blue-600 leading-relaxed font-bold">
                                                调整这些数值将直接影响 AI 自动计算奖励的逻辑。所有的修改将在点击"保存"后立即生效，但不会影响已经生成的任务奖励。
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Material Detail Modal */}
                {viewingMaterial && (
                    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setViewingMaterial(null)}>
                        <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl animate-pop" onClick={e => e.stopPropagation()}>
                            <div className="flex justify-between items-start mb-4">
                                <h2 className="text-xl font-bold text-gray-800">{viewingMaterial.title}</h2>
                                <button onClick={() => setViewingMaterial(null)} className="text-gray-400 hover:text-gray-600"><i className="fas fa-times"></i></button>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                                <div className="prose prose-sm max-w-none text-gray-600">
                                    {(() => {
                                        const ex = (viewingMaterial as any).extracted_content;
                                        // 尝试多种可能的数据结构路径
                                        const content = ex?.daily_challenge?.reading_material?.content
                                            || ex?.reading_material?.content
                                            || ex?.content
                                            || viewingMaterial.description;
                                        return content ? (
                                            <div className="whitespace-pre-line">{content}</div>
                                        ) : (
                                            <p>暂无详细内容描述</p>
                                        );
                                    })()}

                                    {viewingMaterial.attachments && viewingMaterial.attachments.length > 0 && (
                                        <div className="mt-4 border-t pt-4">
                                            <h4 className="font-bold text-xs text-gray-400 uppercase mb-2">附件</h4>
                                            <div className="flex gap-2">
                                                {viewingMaterial.attachments.map((att, i) => (
                                                    <div key={i} className="text-xs bg-gray-100 p-2 rounded">📄 文件</div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
                                <Button onClick={(e: any) => { setViewingMaterial(null); handleReassign(e, viewingMaterial); }} variant="secondary" icon={<i className="fas fa-redo"></i>}>再次布置</Button>
                            </div>
                        </div>
                    </div>
                )}

                <main className="max-w-4xl mx-auto p-6">
                    <div className="flex gap-4 mb-8 border-b border-gray-200 overflow-x-auto pb-1">
                        <div className="flex gap-4 mb-8 border-b border-gray-200 overflow-x-auto pb-1">
                            {/* Define tabs configuration */}
                            {[
                                { id: 'create', label: '发布', icon: quizBoard3d },
                                { id: 'report', label: '汇总', icon: starCoin3d },
                                { id: 'rewards', label: '奖励', icon: giftBox3d },
                                { id: 'repository', label: '资料', icon: bookStack3d }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as Tab)}
                                    className={`pb-3 px-4 font-bold transition-all relative text-lg whitespace-nowrap flex items-center gap-2 ${activeTab === tab.id ? 'text-brand-darkTeal' : 'text-brand-teal/70 hover:text-brand-darkTeal/80 transition-colors'}`}
                                >
                                    <div className={`w-8 h-8 transition-transform duration-300 ${activeTab === tab.id ? 'scale-110 drop-shadow-md' : 'opacity-60 group-hover:opacity-100 group-hover:scale-105'}`}>
                                        <img src={tab.icon} alt={tab.label} className="w-full h-full object-contain" />
                                    </div>
                                    {tab.label}
                                    {activeTab === tab.id && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-brand-darkTeal rounded-t-full"></div>}
                                </button>
                            ))}
                        </div>
                    </div>

                    {activeTab === 'create' && (
                        <div className="space-y-6">
                            {/* 周末整理卡片 - 仅在周末/节假日且处于上学期时显示 */}
                            {learningPeriod === 'school' && (isWeekend(new Date()) || isChineseHoliday(new Date())) && weeklyReviewSummary && weeklyReviewSummary.weak_points.length > 0 && (
                                <WeekendReviewCard
                                    summary={weeklyReviewSummary}
                                    isLoading={isLoadingWeeklyReview}
                                    onGeneratePractice={() => {
                                        console.log('[WeekendReview] Generating practice from weak points:', weeklyReviewSummary.weak_points);
                                        // 构建巩固练习指令
                                        const weakPointsText = weeklyReviewSummary.weak_points
                                            .map(p => p.knowledge_point)
                                            .join('、');
                                        setInstruction(`请针对以下薄弱知识点生成巩固练习：${weakPointsText}`);
                                        showToast('🎯 已生成练习指令，点击发送按钮开始', 'success');
                                    }}
                                    onSkip={() => {
                                        console.log('[WeekendReview] Skipped');
                                        setWeeklyReviewSummary(null); // 隐藏卡片
                                        showToast('📌 已跳过本周整理', 'success');
                                    }}
                                />
                            )}

                            {/* Yesterday's Recap Card */}
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-2xl border border-blue-100 flex items-start gap-4 animate-slide-up">
                                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-xl shadow-sm shrink-0">📊</div>
                                <div>
                                    <h3 className="font-bold text-blue-900 text-sm mb-1">昨日学情回顾</h3>
                                    <p className="text-blue-700 text-xs leading-relaxed">{performanceHook}</p>
                                </div>
                            </div>

                            {/* 孩子选择器 */}
                            {children.length > 1 && (
                                <div className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-gray-100 shadow-sm">
                                    <span className="text-sm text-gray-500 font-medium">发布给：</span>
                                    <div className="flex gap-2 flex-wrap">
                                        {children.map(child => (
                                            <button
                                                key={child.id}
                                                onClick={() => setSelectedChildId(child.id)}
                                                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold transition-all ${selectedChildId === child.id
                                                    ? 'bg-brand-teal text-white shadow-md'
                                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                    }`}
                                            >
                                                <span className="w-6 h-6 rounded-full bg-white/30 flex items-center justify-center text-xs">
                                                    {child.name.charAt(0)}
                                                </span>
                                                {child.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* 统一 AI 入口卡片 */}
                            <Card className="relative overflow-hidden min-h-[350px]">
                                {isProcessing && renderProcessingOverlay()}

                                {/* Agent 思考过程 - 调整样式使其更紧凑 */}
                                {agentTrace.length > 0 && (
                                    <div className="mb-4 bg-gray-50 rounded-xl p-3 max-h-40 overflow-y-auto border border-gray-100/50 custom-scrollbar">
                                        <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-2 flex justify-between">
                                            <span>Agent 思考过程</span>
                                            <button onClick={() => setAgentTrace([])} className="hover:text-red-400"><i className="fas fa-trash"></i></button>
                                        </h4>
                                        <AgentTracePanel trace={agentTrace} />
                                    </div>
                                )}

                                <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-3xl border border-pink-100 transition-all hover:shadow-sm">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white shadow-md text-lg">✨</div>
                                        <div>
                                            <h3 className="font-bold text-gray-800 text-lg">智能规划助手</h3>
                                            <p className="text-xs text-purple-600 font-medium">上传资料或输入想法，Agent 帮你搞定一切</p>
                                        </div>
                                    </div>

                                    {/* 统一输入区域 */}
                                    <div className="relative mb-4 group">
                                        <textarea
                                            value={instruction}
                                            onChange={(e) => setInstruction(e.target.value)}
                                            placeholder="想学点什么？例如：关于恐龙、分数的加减... (或者留空让 Agent 决定)"
                                            className="w-full p-4 pr-12 rounded-2xl border border-pink-200 focus:outline-none focus:ring-4 focus:ring-pink-100 bg-white/80 backdrop-blur-sm text-gray-700 placeholder-gray-400 shadow-inner min-h-[100px] resize-none transition-all"
                                        />

                                        {/* 附件上传按钮 (输入框内右下角) */}
                                        <div className="absolute bottom-3 right-3">
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                className={`p-2 rounded-xl transition-all flex items-center gap-2 font-bold text-xs ${attachments.length > 0
                                                    ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                                                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'
                                                    }`}
                                                title="上传图片或文件"
                                            >
                                                {attachments.length > 0 ? (
                                                    <>
                                                        <span className="w-5 h-5 bg-blue-500 rounded-full text-white flex items-center justify-center text-[10px]">{attachments.length}</span>
                                                        <span>已选</span>
                                                    </>
                                                ) : (
                                                    <i className="fas fa-paperclip text-lg"></i>
                                                )}
                                            </button>
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                onChange={handleFileSelect}
                                                className="hidden"
                                                accept="image/*,application/pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.webp"
                                                multiple
                                            />
                                        </div>
                                    </div>

                                    {/* 附件预览列表 */}
                                    {attachments.length > 0 && (
                                        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                                            {attachments.map((att, i) => (
                                                <div key={i} className="relative group shrink-0">
                                                    <div className="w-16 h-16 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center">
                                                        {att.type.startsWith('image/') ? (
                                                            <img src={att.data} alt="preview" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="text-2xl text-gray-400">📄</span>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={() => removeAttachment(i)}
                                                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs shadow-md hover:scale-110 transition-transform"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* 底部操作栏 */}
                                    <div className="flex flex-col sm:flex-row gap-4 justify-between items-end sm:items-center">
                                        {/* 快捷标签 */}
                                        <div className="flex flex-wrap gap-2">
                                            {/* 阅读快捷键 */}
                                            <button
                                                onClick={handleDirectReading}
                                                disabled={isProcessing}
                                                className="px-3 py-1.5 rounded-full text-xs font-bold border transition-all bg-purple-50 border-purple-200 text-purple-600 hover:bg-purple-100 hover:border-purple-300 flex items-center gap-1 active:scale-95"
                                            >
                                                <i className="fas fa-book-reader"></i> 30分钟阅读
                                            </button>

                                            {/* 科目偏好 */}
                                            {['math', 'chinese', 'english', 'science'].map(subj => (
                                                <button
                                                    key={subj}
                                                    onClick={() => setSelectedSubject(selectedSubject === subj ? undefined : subj)}
                                                    className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${selectedSubject === subj
                                                        ? 'bg-pink-100 border-pink-300 text-pink-700'
                                                        : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-500'
                                                        }`}
                                                >
                                                    {subj === 'math' ? '🧮 数学' : subj === 'chinese' ? '📝 语文' : subj === 'english' ? '🔤 英语' : '🔬 科学'}
                                                </button>
                                            ))}
                                        </div>

                                        {/* 主提交按钮 */}
                                        <Button
                                            onClick={() => handleAgentSubmit()}
                                            disabled={isProcessing}
                                            variant="primary"
                                            className="w-full sm:w-auto px-8 h-12 text-lg bg-gradient-to-r from-purple-600 to-pink-600 shadow-lg hover:shadow-xl hover:shadow-pink-500/20 transform transition-all active:scale-95 rounded-xl font-black"
                                        >
                                            {isProcessing ? 'Agent 正在思考...' : instruction.trim() || attachments.length > 0 ? '发布任务' : '生成今日推荐'}
                                        </Button>
                                    </div>
                                </div>
                            </Card>

                            {/* 重新布置旧资料 (Repository Mode) */}
                            {inputMode === 'repository' && selectedRepoItem && (
                                <div className="border-2 border-brand-teal/20 rounded-3xl p-6 bg-brand-mint/10 animate-fade-in">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-16 h-16 bg-brand-teal/10 rounded-xl flex items-center justify-center text-3xl">📚</div>
                                        <div>
                                            <div className="text-xs font-bold text-brand-teal uppercase mb-1">正在布置旧资料</div>
                                            <h3 className="font-bold text-gray-800 text-xl">{selectedRepoItem.title}</h3>
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-3">
                                        <Button variant="ghost" onClick={() => { setSelectedRepoItem(null); setInputMode('upload'); }}>取消</Button>
                                        <Button onClick={handleConfirmReassign} isLoading={isProcessing} icon={<i className="fas fa-magic"></i>}>AI 重新生成并发布</Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ... Redesigned Report Tab ... */}
                    {
                        activeTab === 'report' && (
                            <div className="space-y-6 animate-slide-up">
                                <div className="flex justify-center gap-2 mb-4">
                                    <button onClick={() => setReportPeriod('today')} className={`px-4 py-1 rounded-full text-sm font-bold ${reportPeriod === 'today' ? 'bg-brand-darkTeal text-white' : 'bg-white text-gray-500'}`}>今日</button>
                                    <button onClick={() => setReportPeriod('week')} className={`px-4 py-1 rounded-full text-sm font-bold ${reportPeriod === 'week' ? 'bg-brand-darkTeal text-white' : 'bg-white text-gray-500'}`}>本周</button>
                                </div>

                                {/* --- Insight Section (New) --- */}
                                <Card>
                                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                        <i className="fas fa-chart-radar text-brand-teal"></i> 能力诊断 (Insights)
                                    </h3>
                                    <div className="mb-6 bg-brand-mint/20 p-4 rounded-xl border border-brand-teal/20">
                                        <p className="text-brand-darkTeal text-sm font-bold leading-relaxed">
                                            💡 <span className="underline decoration-2 decoration-brand-teal">AI 建议</span>：{reportData.suggestion}
                                        </p>
                                        <div className="mt-3 text-right">
                                            <button
                                                onClick={() => setIsChatOpen(true)}
                                                className="text-xs text-brand-teal font-bold hover:bg-brand-teal/10 px-3 py-1.5 rounded-full transition-colors inline-flex items-center gap-1"
                                            >
                                                <i className="fas fa-comments"></i> 深入咨询 Agent
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        {reportData.insights.map((insight, idx) => (
                                            <div key={idx}>
                                                <div className="flex justify-between text-xs font-bold text-gray-600 mb-1">
                                                    <span>{insight.subject}</span>
                                                    <span className={insight.score > 80 ? 'text-green-600' : insight.score < 60 ? 'text-red-500' : 'text-yellow-600'}>{insight.score}%</span>
                                                </div>
                                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-1000 ${insight.score > 80 ? 'bg-green-400' : insight.score < 60 ? 'bg-red-400' : 'bg-yellow-400'}`}
                                                        style={{ width: `${insight.score}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </Card>

                                {/* Data Grid */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <Card className="text-center py-6 bg-blue-50 border-blue-100">
                                        <div className="text-3xl font-black text-blue-600">{reportData.readingMins}</div>
                                        <div className="text-xs text-blue-400 font-bold uppercase">阅读(分钟)</div>
                                    </Card>
                                    <Card className="text-center py-6 bg-green-50 border-green-100">
                                        <div className="text-3xl font-black text-green-600">{reportData.completed}/{reportData.total}</div>
                                        <div className="text-xs text-green-400 font-bold uppercase">任务完成</div>
                                    </Card>
                                    <Card className="text-center py-6 bg-purple-50 border-purple-100">
                                        <div className="text-3xl font-black text-purple-600">{reportData.booksRead}</div>
                                        <div className="text-xs text-purple-400 font-bold uppercase">阅读本数</div>
                                    </Card>
                                    <Card className="text-center py-6 bg-orange-50 border-orange-100">
                                        <div className="text-3xl font-black text-orange-600">{reportData.avgScore}%</div>
                                        <div className="text-xs text-orange-400 font-bold uppercase">平均正确率</div>
                                    </Card>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* 阅读足迹 (New Section) */}
                                    <Card>
                                        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                            <i className="fas fa-book-reader text-brand-teal"></i> 阅读足迹
                                        </h3>
                                        <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-3">
                                            {reportData.recentReadingLogs.length === 0 && <p className="text-sm text-gray-400 text-center py-4">暂无阅读记录</p>}
                                            {reportData.recentReadingLogs.map((log) => (
                                                <div key={log.id} className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div className="font-bold text-gray-800 text-sm">📖 {log.title}</div>
                                                        <div className="text-xs text-brand-teal font-bold bg-brand-mint px-2 py-0.5 rounded-full">{log.duration}分钟</div>
                                                    </div>
                                                    {log.reflection && (
                                                        <div className="text-xs text-gray-600 italic bg-white p-2 rounded border border-gray-100">
                                                            "{log.reflection}"
                                                        </div>
                                                    )}
                                                    <div className="text-[10px] text-gray-400 mt-2 text-right">{new Date(log.date).toLocaleString()}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </Card>

                                    <Card>
                                        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                            <i className="fas fa-bug text-red-500"></i> 错题攻坚
                                        </h3>
                                        <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                            {renderWrongQuestionList()}
                                        </div>
                                    </Card>

                                    <Card className="md:col-span-2">
                                        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                            <i className="fas fa-medal text-yellow-500"></i> 额外奖励
                                        </h3>
                                        <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 flex gap-4 items-center">
                                            <div className="flex-1">
                                                <p className="text-sm text-yellow-800 mb-2 font-bold">觉得孩子表现不错？手动发个红包吧！</p>
                                                <input type="text" placeholder="奖励理由 (如: 主动洗碗)" value={bonusReason} onChange={e => setBonusReason(e.target.value)} className="w-full p-2 text-sm rounded-lg border-yellow-200 focus:ring-yellow-400" />
                                            </div>
                                            <Button onClick={handleManualBonus} size="sm" className="bg-yellow-500 hover:bg-yellow-600 border-none shadow-none text-white whitespace-nowrap h-fit self-end mb-0.5">发送 +50XP & +10分钟</Button>
                                        </div>
                                    </Card>
                                </div>
                            </div>
                        )
                    }

                    {
                        activeTab === 'rewards' && (
                            <div className="space-y-6 animate-slide-up">
                                <Card>
                                    <h3 className="font-bold text-gray-800 mb-4">设置心愿商品</h3>
                                    <div className="mb-4">
                                        <div className="flex gap-2 mb-2">
                                            <button onClick={() => setNewRewardCost(300)} className={`px-3 py-1 rounded-full text-xs font-bold border transition ${newRewardCost === 300 ? 'bg-brand-teal text-white border-brand-teal' : 'bg-white text-gray-500 border-gray-200'}`}>小奖励 (~1天)</button>
                                            <button onClick={() => setNewRewardCost(2000)} className={`px-3 py-1 rounded-full text-xs font-bold border transition ${newRewardCost === 2000 ? 'bg-brand-teal text-white border-brand-teal' : 'bg-white text-gray-500 border-gray-200'}`}>中奖励 (~1周)</button>
                                            <button onClick={() => setNewRewardCost(8000)} className={`px-3 py-1 rounded-full text-xs font-bold border transition ${newRewardCost === 8000 ? 'bg-brand-teal text-white border-brand-teal' : 'bg-white text-gray-500 border-gray-200'}`}>大奖励 (~1月)</button>
                                        </div>
                                        <div className="flex gap-2">
                                            <input type="text" placeholder="商品名称 (如: 乐高)" value={newRewardName} onChange={e => setNewRewardName(e.target.value)} className="flex-1 p-3 rounded-xl border border-gray-200" />
                                            <input type="number" placeholder="所需积分" value={newRewardCost} onChange={e => setNewRewardCost(Number(e.target.value))} className="w-24 p-3 rounded-xl border border-gray-200" />
                                            <Button onClick={handleAddCustomReward} icon={<i className="fas fa-plus"></i>}>添加</Button>
                                        </div>
                                    </div>
                                </Card>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {rewards.map(r => (
                                        <div key={r.id} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between shadow-sm relative group overflow-visible">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-xl">{r.icon}</div>
                                                <div>
                                                    <div className="font-bold text-gray-800">{r.name}</div>
                                                    <div className="text-xs text-brand-orange font-bold">{r.cost_xp} XP</div>
                                                </div>
                                            </div>
                                            {/* Fixed: Always visible delete button with high z-index and explicit cursor */}
                                            <div
                                                onClick={(e) => handleDeleteReward(e, r.id)}
                                                className="absolute -top-2 -right-2 bg-red-100 text-red-500 p-2 rounded-full shadow-md cursor-pointer hover:bg-red-200 hover:scale-110 transition-all z-20 flex items-center justify-center w-8 h-8"
                                            >
                                                <i className="fas fa-trash text-sm"></i>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    }

                    {
                        activeTab === 'repository' && (
                            <div className="space-y-4">
                                {repository.map(item => (
                                    <Card key={item.id} className="flex justify-between items-center cursor-pointer hover:border-brand-primary/30 transition-colors" onClick={() => handleViewMaterial(item)}>
                                        <div>
                                            <h3 className="font-bold">{item.title}</h3>
                                            <p className="text-xs text-gray-500">{new Date(item.created_at).toLocaleDateString()}</p>
                                        </div>
                                        <Button variant="secondary" size="sm" onClick={(e: any) => handleReassign(e, item)} isLoading={isProcessing}>再次布置</Button>
                                    </Card>
                                ))}
                            </div>
                        )
                    }

                </main >

                {/* Custom Confirm Modal for Deletion */}
                {
                    confirmModal.isOpen && (
                        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setConfirmModal({ isOpen: false, rewardId: null })}>
                            <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full text-center" onClick={e => e.stopPropagation()}>
                                <div className="text-4xl mb-4">🗑️</div>
                                <h3 className="font-bold text-lg text-gray-800 mb-2">确定删除?</h3>
                                <p className="text-sm text-gray-500 mb-6">此操作无法撤销，确定要删除这个奖励吗？</p>
                                <div className="flex gap-3 justify-center">
                                    <Button variant="ghost" onClick={() => setConfirmModal({ isOpen: false, rewardId: null })}>取消</Button>
                                    <Button onClick={confirmDeleteReward} className="bg-red-500 hover:bg-red-600 border-red-600">确认删除</Button>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* Agent Chat Modal */}
                <AgentChatModal
                    isOpen={isChatOpen}
                    onClose={() => setIsChatOpen(false)}
                    childName={selectedChild?.name || '孩子'}
                />

                {/* Floating Trace Panel */}
                <FloatingTracePanel />

                {/* Floating Chat Button (FAB) */}
                {
                    !isChatOpen && (
                        <button
                            onClick={() => setIsChatOpen(true)}
                            className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center text-2xl hover:scale-110 transition-transform z-40"
                            title="咨询 Agent"
                        >
                            🤖
                        </button>
                    )
                }

                {/* 资料类型确认弹窗 */}
                <MaterialConfirmDialog
                    isOpen={materialConfirmOpen}
                    onClose={() => {
                        setMaterialConfirmOpen(false);
                        setPendingMaterialAnalysis(null);
                        setPendingAttachments([]);
                    }}
                    onConfirm={(materialType) => {
                        setMaterialConfirmOpen(false);

                        // 获取决策
                        const effectiveMode = getEffectiveMode(learningPeriod);
                        const decision = getLearningDecision(materialType, effectiveMode);
                        console.log('[MaterialConfirm] Type:', materialType, 'Mode:', effectiveMode, 'Decision:', decision);

                        // 恢复附件并调用 handleAgentSubmit
                        const savedAttachments = [...pendingAttachments];
                        const savedInstruction = instruction;
                        setPendingMaterialAnalysis(null);
                        setPendingAttachments([]);

                        // 临时恢复附件状态，然后调用 handleAgentSubmit
                        setAttachments(savedAttachments);

                        // 使用 setTimeout 确保状态更新后再调用
                        setTimeout(() => {
                            handleAgentSubmit(savedInstruction, materialType);
                        }, 0);
                    }}
                    detectedType={pendingMaterialAnalysis?.detected_type}
                    fileName={pendingAttachments[0]?.name}
                    previewUrl={pendingAttachments[0]?.data}
                />
            </div >
        </TraceProvider >
    );
};
