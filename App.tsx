
import React, { useState, useEffect } from 'react';
import { User, AppState, DailyTask, RepositoryItem, RewardConfig, Book, CustomReward } from './types';
import { ChildDashboard } from './views/ChildDashboard';
import { RoleSelect } from './views/RoleSelect';
import { ParentDashboard } from './views/ParentDashboard';
import { QuestMode } from './views/QuestMode';
import { ImmersiveReadingMode } from './views/ImmersiveReadingMode';
import { WordPractice } from './views/WordPractice';
import { LoginPage } from './views/LoginPage';
import { PinEntryModal } from './components/PinEntryModal';
import { useAuth } from './contexts/AuthContext';
import { taskService } from './services/taskService';
import { rewardService } from './services/rewardService';
import { learningService } from './services/learningService';
import { userService } from './services/userService';
import bookStack3d from './assets/icons/3d/book_stack_3d.png';

// 开发模式：加载元认知测试工具
if (import.meta.env.DEV) {
    import('./tests/testMetacognitionEntry');
}

// Default reward config
const DEFAULT_REWARD_CONFIG: RewardConfig = {
    base_tablet: 15, base_outdoor: 30, max_tablet: 120, max_outdoor: 240, allocation_ratio: 0.2, xp_to_minute_rate: 10
};

const App: React.FC = () => {
    const { user, loading: authLoading, session, children: familyChildren, selectedChild, viewAsRole, selectChild, switchToParentView, switchToChildView, refreshUser, refreshFamily, signOut, addChild } = useAuth();

    const [currentView, setCurrentView] = useState<'role-select' | 'child-dashboard' | 'parent-dashboard' | 'quest-mode' | 'immersive-reading' | 'word-practice'>('role-select');
    const [tasks, setTasks] = useState<DailyTask[]>([]);
    const [repository, setRepository] = useState<RepositoryItem[]>([]);
    const [activeTask, setActiveTask] = useState<DailyTask | null>(null);
    const [books, setBooks] = useState<Book[]>([]);
    const [activeBook, setActiveBook] = useState<Book | null>(null);
    const [customRewards, setCustomRewards] = useState<CustomReward[]>([]);
    const [rewardConfig, setRewardConfig] = useState<RewardConfig>(DEFAULT_REWARD_CONFIG);
    const [isLoadingTask, setIsLoadingTask] = useState(false);

    // PIN Modal State
    const [isPinOpen, setIsPinOpen] = useState(false);
    const [pendingView, setPendingView] = useState<'parent-dashboard' | null>(null);

    // Sync timeout state for session+!user recovery
    const [syncTimeout, setSyncTimeout] = useState(false);

    // 使用 useMemo 缓存 effectiveChild，避免每次渲染触发 useEffect
    const effectiveChild = React.useMemo(() => {
        if (user?.role === 'child') return user;
        if (user?.role === 'parent' && selectedChild) return selectedChild;
        if (user?.role === 'parent' && familyChildren.length > 0) return familyChildren[0];
        return null;
    }, [user, selectedChild, familyChildren]);

    useEffect(() => {
        const loadData = async () => {
            if (!user) return;
            try {
                const [config, rewards] = await Promise.all([rewardService.getRewardConfig(), rewardService.getFamilyRewards()]);
                if (config) setRewardConfig(config);
                if (rewards) setCustomRewards(rewards);

                const materials = await learningService.getMaterials();
                setRepository(learningService.materialsToRepositoryItems(materials));
            } catch (error) {
                console.error('Error loading data:', error);
            }
        };
        if (user) loadData();
    }, [user?.id]);

    // 单独监听 effectiveChild 变化，重新加载任务
    useEffect(() => {
        const loadChildTasks = async () => {
            if (!effectiveChild?.id) {
                setTasks([]);
                return;
            }
            try {
                const todayTasks = await taskService.getTodayTasks(effectiveChild.id);
                setTasks(todayTasks);
            } catch (error) {
                console.error('Error loading child tasks:', error);
            }
        };
        // 切换孩子时立即清空，避免显示其他孩子的任务
        setTasks([]);
        loadChildTasks();
    }, [effectiveChild?.id]);

    // Auto-recovery for session+!user stuck state (15s timeout to accommodate 3 retries)
    useEffect(() => {
        let timer: NodeJS.Timeout | null = null;
        if (session && !user && !authLoading) {
            console.warn('App: Session exists but no user data, starting 15s recovery timer...');
            timer = setTimeout(() => {
                console.error('App: User profile sync failed after retries, forcing sign out to recover.');
                setSyncTimeout(true);
                signOut();
            }, 15000); // 15s to accommodate 3 retries × 2s delay + actual fetch time
        }
        return () => { if (timer) clearTimeout(timer); };
    }, [session, user, authLoading, signOut]);

    // --- Parent Actions ---
    const handleUpdateRewardConfig = async (newConfig: RewardConfig) => {
        const res = await rewardService.updateRewardConfig(newConfig);
        if (res.success) {
            setRewardConfig(newConfig);
        } else {
            console.error("Update config failed", res.error);
            // 乐观更新，或者提示错误。这里简单设置一下防止 UI 跳变
            setRewardConfig(newConfig);
        }
    };

    const handleUpdateChildSettings = async (grade: number) => {
        // MVP: 默认更新第一个孩子，未来支持多孩子选择
        const childToUpdate = familyChildren[0];
        if (childToUpdate) {
            const res = await userService.updateProfile(childToUpdate.id, { grade_level: grade });
            if (res.success) {
                await refreshFamily(); // 刷新家庭数据以获取最新状态
            }
        }
    };

    const handleAddReward = async (reward: CustomReward) => {
        const res = await rewardService.createReward({
            name: reward.name,
            costXp: reward.cost_xp,
            icon: reward.icon
        });
        if (res.success) {
            const list = await rewardService.getFamilyRewards();
            setCustomRewards(list);
        }
    };

    const handleDeleteReward = async (rewardId: string) => {
        // Optimistic update
        setCustomRewards(prev => prev.filter(r => r.id !== rewardId));
        const res = await rewardService.deleteReward(rewardId);
        if (!res.success) {
            console.error("Delete reward failed", res.error);
            // Revert if failed
            const list = await rewardService.getFamilyRewards();
            setCustomRewards(list);
        } else {
            // Explicit refresh to ensure sync
            const list = await rewardService.getFamilyRewards();
            setCustomRewards(list);
        }
    };

    const handleGrantBonus = async (xp: number, tabletMinutes: number, reason: string) => {
        if (effectiveChild) {
            await userService.updateXP(effectiveChild.id, xp);
            // 这里可以添加一条特殊的 completed task 或者 notification，简化起见直接加XP
            await refreshUser();
            // TODO: Add tablet minutes
        }
    };

    // Wrapper for adding a child to match ParentDashboard signature
    const handleAddChild = async (name: string, grade: number) => {
        return await addChild(name, undefined, grade);
    };

    // --- Child Actions ---
    const handleSetWish = async (rewardId: string) => {
        if (effectiveChild) {
            const res = await userService.updateProfile(effectiveChild.id, { active_wish_id: rewardId });
            if (res.success) {
                await refreshUser(); // Update local state
                // If viewing as parent, also refresh the selected child object
                if (viewAsRole === 'parent' && selectedChild) {
                    await refreshFamily();
                }
            }
        }
    };

    const handleRedeemReward = async (rewardId: string) => {
        if (!effectiveChild) return;
        const res = await rewardService.redeemReward(rewardId);
        if (res.success) {
            await refreshUser();
            if (viewAsRole === 'parent' && selectedChild) await refreshFamily();
        } else {
            console.error("Redemption failed:", res.error);
        }
    };

    // --- Quest Logic ---
    const calculateCurrentRewards = (currentTasks: DailyTask[]) => {
        const completedTasks = currentTasks.filter(t => t.status === 'completed');

        // Base Calculation
        let earnedTablet = rewardConfig.base_tablet + completedTasks.reduce((acc, t) => acc + (t.time_reward_tablet || 0), 0);
        let earnedOutdoor = rewardConfig.base_outdoor + completedTasks.reduce((acc, t) => acc + (t.time_reward_outdoor || 0), 0);

        // Cap Logic
        const maxTablet = rewardConfig.max_tablet ?? 999;
        const maxOutdoor = rewardConfig.max_outdoor ?? 999;

        return {
            tablet: Math.min(earnedTablet, maxTablet),
            outdoor: Math.min(earnedOutdoor, maxOutdoor)
        };
    };

    const handleStartQuest = async (task: DailyTask, mode: 'normal' | 'review' = 'normal') => {
        setIsLoadingTask(true);
        try {
            // 关键修复：从数据库获取完整任务详情（包含题目）
            const fullTask = await taskService.getTaskWithQuestions(task.id);

            if (!fullTask) {
                console.error("Task data not found or incomplete");
                setIsLoadingTask(false);
                return;
            }

            // 仅在非回顾模式时更新状态
            if (mode === 'normal') {
                await taskService.startTask(task.id);
                setActiveTask({ ...fullTask, status: 'in_progress' });
            } else {
                // 回顾模式：不改变数据库状态
                setActiveTask({ ...fullTask, status: 'completed' });
            }

            // 存储当前模式用于 QuestMode (通过 activeTask 的扩展属性)
            (window as any).__questReviewMode = mode === 'review';

            if (task.task_type === 'reading') {
                const bookName = fullTask.learning_material?.title.replace('阅读任务：', '') || '自由阅读';
                const book = books.find(b => b.title === bookName) || { id: 'temp', title: bookName, status: 'in_progress', total_minutes_read: 0, last_read_at: new Date().toISOString() };
                setActiveBook(book);
                setCurrentView('immersive-reading');
            } else {
                setCurrentView('quest-mode');
            }
        } catch (e) {
            console.error("Failed to start quest:", e);
        } finally {
            setIsLoadingTask(false);
        }
    };

    const handleQuestComplete = async (rewards: any, updatedQuestions: any[]) => {
        if (activeTask && effectiveChild) {
            // NOTE: rewards.scorePercentage (0-100) is now passed as the score
            const scoreToSave = rewards.scorePercentage !== undefined ? rewards.scorePercentage : (rewards.correctCount || 0);

            await taskService.completeTask(activeTask.id, scoreToSave, rewards.xp, rewards.tablet, rewards.outdoor);
            if (updatedQuestions.length > 0) {
                await taskService.saveAnswerRecords(updatedQuestions.filter((q: any) => q.user_result).map((q: any) => ({ taskId: activeTask.id, userId: effectiveChild.id, questionId: q.id, userAnswer: String(q.user_result.user_answer), isCorrect: q.user_result.is_correct, aiFeedback: q.user_result.ai_feedback })));
            }

            setTasks(prev => prev.map(t => t.id === activeTask.id ? {
                ...t,
                status: 'completed',
                xp_reward: rewards.xp,
                score: scoreToSave, // Save percentage for reporting
                time_reward_tablet: rewards.tablet,
                time_reward_outdoor: rewards.outdoor
            } : t));

            await refreshUser();
        }
        setActiveTask(null);
        // Fix: Always return to child dashboard after a quest to see progress/rewards
        setCurrentView('child-dashboard');
    };

    const handleAddTask = async (task: DailyTask, targetChildId?: string) => {
        // 使用指定的孩子 ID，或默认使用 effectiveChild
        const childId = targetChildId || effectiveChild?.id;
        if (!childId) return;



        // 1. Create Learning Material if needed (handled in ParentDashboard mostly, but let's ensure)
        let matId = task.material_id;
        if (task.learning_material && task.learning_material.id.startsWith('mat-')) {
            const matRes = await learningService.createMaterial({
                title: task.learning_material.title,
                subject: task.learning_material.subject,
                materialType: task.learning_material.material_type,
                description: task.learning_material.description,
                // Fix: Ensure we use the extracted content passed from ParentDashboard
                extractedContent: task.learning_material.extracted_content,
                isTemporary: task.learning_material.is_temporary
            });
            if (matRes.success && matRes.materialId) matId = matRes.materialId;
        }

        // 2. Create Questions
        let qIds: string[] = [];
        if (task.questions && task.questions.length > 0) {

            const qRes = await learningService.createQuestions(matId, task.questions.map(q => ({
                questionText: q.question_text,
                questionType: q.question_type,
                options: q.options,
                correctAnswer: q.correct_answer,
                expected: q.expected,
                explanation: q.explanation,
                difficulty: 1,
                difficultyTag: q.difficulty_tag,
                isAiGenerated: true,
                chineseSkill: q.chinese_skill,
                englishSkill: q.english_skill,
                knowledgePoints: q.knowledge_points,
                scoreValue: q.score_value
            })));

            if (qRes.success && qRes.questionIds) qIds = qRes.questionIds;
        } else if (task.question_ids && task.question_ids.length > 0) {
            // Re-assigning existing questions
            qIds = task.question_ids;
        }



        // 3. Create Task
        const taskRes = await taskService.createTask({
            userId: childId,
            materialId: matId,
            taskType: task.task_type,
            xpReward: task.xp_reward,
            questionIds: qIds,
            readingDurationGoal: task.reading_duration_goal
        });


        if (taskRes.success) {
            // Refresh tasks
            const todayTasks = await taskService.getTodayTasks(childId);
            setTasks(todayTasks);
        }
    };

    // --- PIN Handling ---
    const handleRequestParentView = () => {
        setIsPinOpen(true);
        setPendingView('parent-dashboard');
    };

    const handlePinSuccess = () => {
        setIsPinOpen(false);
        if (pendingView) {
            switchToParentView();
            setCurrentView(pendingView);
            setPendingView(null);
        }
    };

    // --- 路由守卫逻辑优化 ---

    // 1. 正在检查 Session
    if (authLoading) {
        return (
            <div className="min-h-screen bg-brand-bg flex items-center justify-center">
                <div className="text-center animate-pulse">
                    <div className="w-24 h-24 mx-auto mb-4 animate-float">
                        <img src={bookStack3d} alt="Loading" className="w-full h-full object-contain" />
                    </div>
                    <p className="text-brand-textLight font-bold">正在准备探险装备...</p>
                </div>
            </div>
        );
    }

    // 2. 有 Session 但资料还没加载完 - 自动恢复机制已在 useEffect 中处理
    if (session && !user) {
        return (
            <div className="min-h-screen bg-brand-bg flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl mb-4 animate-spin">⏳</div>
                    <p className="text-brand-textLight font-bold">正在同步档案...</p>
                    <p className="text-xs text-brand-textLight mt-2">
                        {syncTimeout ? '同步超时，正在重置...' : '如果长时间卡住，可能是网络原因。'}
                    </p>
                    <button onClick={signOut} className="mt-6 px-6 py-2 bg-white border-2 border-brand-border rounded-full text-brand-textLight font-bold hover:bg-brand-bg transition-colors">退出重试</button>
                </div>
            </div>
        );
    }

    // 3. 确实没登录
    if (!session) {
        return <LoginPage />;
    }

    // 4. 已登录且有 User
    const displayChild = effectiveChild || { id: 'demo', family_id: 'demo', name: '加载中...', role: 'child', total_xp: 0, available_xp: 0, streak_days: 0 };

    return (
        <>
            {/* Loading Overlay for Task Fetch */}
            {isLoadingTask && (
                <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-center justify-center animate-fade-in">
                    <div className="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center animate-pop">
                        <div className="w-16 h-16 mx-auto mb-3 animate-bounce">
                            <img src={bookStack3d} alt="Loading" className="w-full h-full object-contain" />
                        </div>
                        <p className="font-bold text-brand-darkTeal">整理装备中...</p>
                        <p className="text-xs text-gray-400 mt-1">AI 正在准备题目</p>
                    </div>
                </div>
            )}

            {currentView === 'role-select' && (
                <RoleSelect
                    user={user}
                    familyChildren={familyChildren}
                    onSelectChild={(child) => { selectChild(child); switchToChildView(child); setCurrentView('child-dashboard'); }}
                    onRequestParentView={handleRequestParentView}
                    onSignOut={signOut}
                />
            )}

            {currentView === 'child-dashboard' && (
                <ChildDashboard
                    user={displayChild}
                    tasks={tasks}
                    rewardsList={customRewards}
                    onStartQuest={handleStartQuest}
                    onOpenRewards={() => { }}
                    onChangeUser={() => setCurrentView('role-select')}
                    rewardsConfig={rewardConfig}
                    currentRewards={calculateCurrentRewards(tasks)}
                    onSetWish={handleSetWish}
                    onRedeem={handleRedeemReward}
                    onStartWordPractice={() => setCurrentView('word-practice')}
                />
            )}

            {currentView === 'parent-dashboard' && (
                <ParentDashboard
                    user={user}
                    children={familyChildren} // Pass children list
                    repository={repository}
                    tasks={tasks}
                    books={books}
                    rewards={customRewards}
                    rewardConfig={rewardConfig}
                    onAddToRepo={() => { }}
                    onAddTask={handleAddTask}
                    onChangeUser={() => setCurrentView('role-select')}
                    onUpdateChildSettings={handleUpdateChildSettings}
                    onUpdateRewardConfig={handleUpdateRewardConfig}
                    onAddReward={handleAddReward}
                    onDeleteReward={handleDeleteReward}
                    onGrantBonus={handleGrantBonus}
                    onAddChild={handleAddChild} // Updated to use wrapper
                />
            )}

            {currentView === 'quest-mode' && activeTask && <QuestMode task={activeTask} onExit={() => setCurrentView('child-dashboard')} onComplete={handleQuestComplete} />}

            {currentView === 'immersive-reading' && activeBook && (
                <ImmersiveReadingMode
                    book={activeBook}
                    allBooks={books}
                    targetDurationMinutes={activeTask?.reading_duration_goal || 20}
                    readingContent={
                        // 优先检查 reading_material (直接生成的)
                        activeTask?.reading_material?.content
                            ? activeTask.reading_material
                            : (activeTask?.learning_material?.extracted_content as any)?.reading_material?.content
                                ? (activeTask.learning_material.extracted_content as any).reading_material
                                : undefined
                    }
                    onExit={() => setCurrentView('child-dashboard')}
                    onFinish={async (s, r, t) => {
                        if (!activeTask) return;
                        await taskService.updateReadingTask(activeTask.id, s, r);
                        handleQuestComplete({ xp: 50, correctCount: 0, tablet: 0, outdoor: 0 }, []);
                    }}
                />
            )}

            {currentView === 'word-practice' && effectiveChild && (
                <WordPractice
                    userId={effectiveChild.id}
                    onBack={() => setCurrentView('child-dashboard')}
                />
            )}

            <PinEntryModal
                isOpen={isPinOpen}
                onClose={() => setIsPinOpen(false)}
                onSuccess={handlePinSuccess}
            />
        </>
    );
};

export default App;
