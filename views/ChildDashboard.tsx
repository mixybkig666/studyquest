import React, { useState, useEffect, useMemo } from 'react';
import { User, DailyTask, CustomReward, RewardConfig } from '../types';
import { Button } from '../components/Button';
import { taskService } from '../services/taskService';
import userService from '../services/userService';
import { KnowledgeOverview } from '../components/KnowledgeOverview';
import { EmptyState, EMPTY_STATES } from '../components/EmptyState';
import {
  PowerIcon,
  CheckIcon,
  ClockIcon,
  PlayIcon,
  BookIcon,       // 用于 Fallback
  StarIcon,       // 用于小图标
  FireIcon,       // 用于小图标
  QuizIcon,       // 用于 Fallback
  TargetIcon,
  TrophyIcon,     // 用于 Stats
  StrengthIcon,
  WisdomIcon,
  MagicIcon,
} from '../components/IconLibrary';
import 'katex/dist/katex.min.css';
import Latex from 'react-latex-next';

// 3D Assets Imports
// 注意：Vite 中导入图片会得到路径字符串
import avatarGirl3d from '../assets/icons/3d/avatar_girl_3d.png';
import tabletLimit3d from '../assets/icons/3d/tablet_limit_3d.png';
import bookStack3d from '../assets/icons/3d/book_stack_3d.png';
import quizBoard3d from '../assets/icons/3d/quiz_board_3d.png';
import starCoin3d from '../assets/icons/3d/star_coin_3d.png';
import fireFlame3d from '../assets/icons/3d/fire_flame_3d.png';
import giftBox3d from '../assets/icons/3d/gift_box_3d.png';

interface ChildDashboardProps {
  user: User;
  tasks: DailyTask[];
  rewardsList: CustomReward[];
  onStartQuest: (task: DailyTask, mode?: 'normal' | 'review') => void;
  onOpenRewards: () => void;
  onChangeUser: () => void;
  onSetWish: (rewardId: string) => void;
  onRedeem?: (rewardId: string) => void;
  rewardsConfig: RewardConfig;
  currentRewards: { tablet: number; outdoor: number };
  onStartWordPractice?: () => void;  // 新增：单词练习入口
}

export const ChildDashboard: React.FC<ChildDashboardProps> = ({
  user,
  tasks,
  rewardsList,
  onStartQuest,
  onChangeUser,
  onSetWish,
  onRedeem,
  rewardsConfig,
  currentRewards,
  onStartWordPractice
}) => {
  const [showShop, setShowShop] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [expandedMistake, setExpandedMistake] = useState<string | null>(null);
  const [mistakes, setMistakes] = useState<any[]>([]);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [weeklyHistory, setWeeklyHistory] = useState<DailyTask[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);

  // Auto-update streak on mount
  useEffect(() => {
    if (user?.id) {
      // Ignore result as UI will be updated on next refresh or if we locally mutate user prompt
      // Actually we should probably just trigger it silently
      userService.updateStreak(user.id);
    }
  }, [user.id]);

  // Load Stats Data
  useEffect(() => {
    if (showStats) {
      setLoadingStats(true);
      const p1 = taskService.getWrongAnswers(user.id).then(data => {
        setMistakes(data.map(r => ({
          id: r.id,
          question: r.question?.question_text || '题目已删除',
          wrong_answer: r.user_answer,
          correct_answer: r.question?.correct_answer,
          explanation: r.question?.explanation,
          seen_at: r.created_at
        })));
      });

      const p2 = taskService.getTaskHistory(user.id, 7).then(data => {
        setWeeklyHistory(data.filter(t => t.status === 'completed'));
      });

      Promise.all([p1, p2]).finally(() => setLoadingStats(false));
    }
  }, [showStats, user.id]);

  // Calculations
  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const totalCount = tasks.length;

  // Rewards & Wish
  const activeWish = rewardsList.find(r => r.id === user.active_wish_id);
  const wishProgress = activeWish ? Math.min(((user.available_xp || 0) / activeWish.cost_xp) * 100, 100) : 0;

  const maxTablet = rewardsConfig.max_tablet || 999;
  const tabletPercent = Math.min((currentRewards.tablet / maxTablet) * 100, 100);
  const isTabletMaxed = currentRewards.tablet >= maxTablet;

  // Level & Streak
  const currentLevel = 1 + Math.floor((user.total_xp || 0) / 200);
  const nextLevelXp = currentLevel * 200;
  const currentLevelProgress = ((user.total_xp || 0) % 200) / 200 * 100;
  const displayStreak = Math.max(1, user.streak_days || 1);

  // Weekly Stats
  const weeklyBooks = weeklyHistory.filter(t => t.task_type === 'reading').length;
  const weeklyQuizzes = weeklyHistory.filter(t => t.task_type === 'quiz').length;

  const attributes = useMemo(() => {
    const counts = { strength: 0, wisdom: 0, magic: 0 };
    weeklyHistory.forEach(t => {
      const sub = t.learning_material?.subject;
      if (sub === 'math') counts.strength += 1;
      else if (sub === 'chinese' || sub === 'english' || sub === 'reading') counts.wisdom += 1;
      else counts.magic += 1;
    });
    const max = Math.max(5, counts.strength, counts.wisdom, counts.magic);
    return {
      strength: (counts.strength / max) * 100,
      wisdom: (counts.wisdom / max) * 100,
      magic: (counts.magic / max) * 100
    };
  }, [weeklyHistory]);

  return (
    <div className="min-h-screen bg-[#FFF8F0] pb-24 font-display overflow-x-hidden selection:bg-brand-primary/20">

      {/* 🌈 Header Section with 3D Avatar */}
      <header className="relative pt-8 pb-12 px-6 rounded-b-[40px] bg-white shadow-xl z-20 overflow-visible">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-5 group cursor-pointer" onClick={() => setShowStats(true)}>
            {/* 3D Avatar Container */}
            <div className="relative w-24 h-24 transition-transform duration-300 hover:scale-105 icon-3d-container">
              <div className="absolute inset-0 bg-brand-primary/20 rounded-full blur-xl animate-pulse"></div>
              <img
                src={avatarGirl3d}
                alt="Avatar"
                className="w-full h-full object-contain drop-shadow-2xl relative z-10"
              />
              <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-1 shadow-md z-20 border-2 border-brand-secondary">
                <img src={starCoin3d} className="w-6 h-6 animate-spin-slow" />
              </div>
            </div>

            {/* User Info */}
            <div className="flex flex-col">
              <h1 className="text-3xl font-black text-brand-textDark tracking-tight mb-1 text-transparent bg-clip-text bg-gradient-to-r from-brand-primaryDark to-brand-secondaryDark">
                Hi, {user.name}!
              </h1>
              <div className="flex items-center gap-2">
                <span className="stat-badge stat-badge-primary animate-entrancement delay-100">
                  <span className="text-sm">Lv.{currentLevel}</span>
                </span>
                <span className="stat-badge stat-badge-secondary animate-entrancement delay-200">
                  <img src={fireFlame3d} className="w-4 h-4 mr-1" /> 第{user.streak_days || 1}天
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onChangeUser}
            className="w-12 h-12 rounded-2xl bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-400 flex items-center justify-center transition-all duration-300 shadow-sm hover:shadow-md active:scale-95"
          >
            <PowerIcon size="md" />
          </button>
        </div>

        {/* 📊 Main Stats Cards Row - 3D Layout */}
        <div className="grid grid-cols-2 gap-4 mt-8">
          {/* Screen Time Card - Redesigned */}
          <div className={`
            relative p-4 rounded-[24px] overflow-hidden transition-all duration-500 card-3d-hover group border-2
            ${isTabletMaxed
              ? 'bg-red-50 border-red-200 shadow-red-100'
              : 'bg-orange-50 border-orange-100 shadow-orange-100'
            }
          `}>
            <div className="flex justify-between items-start relative z-10">
              <div>
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">屏幕时间 Screen Time</div>
                <div className={`text-3xl font-black ${isTabletMaxed ? 'text-red-500' : 'text-brand-primaryDark'}`}>
                  {currentRewards.tablet}<span className="text-sm text-gray-400 ml-1 font-bold">/ {maxTablet}m</span>
                </div>
              </div>
              <div className="w-16 h-16 -mt-2 -mr-2 animate-float">
                <img src={tabletLimit3d} className="w-full h-full object-contain drop-shadow-lg filter drop-shadow-md" />
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-4 h-3 bg-white/50 rounded-full overflow-hidden p-[2px]">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${isTabletMaxed ? 'bg-red-400' : 'bg-brand-primary'}`}
                style={{ width: `${tabletPercent}%` }}
              ></div>
            </div>

            {isTabletMaxed && (
              <div className="absolute inset-0 bg-red-500/10 z-0 animate-pulse"></div>
            )}
          </div>

          {/* Wish / Gift Card */}
          <div
            onClick={() => setShowShop(true)}
            className="relative p-4 rounded-[24px] bg-purple-50 border-2 border-purple-100 overflow-hidden cursor-pointer card-3d-hover group"
          >
            <div className="flex justify-between items-start relative z-10">
              <div>
                <div className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-1">我的心愿 Wish</div>
                <div className="text-lg font-black text-purple-600 truncate max-w-[100px] leading-tight">
                  {activeWish ? activeWish.name : '选个礼物'}
                </div>
                <div className="text-xs font-bold text-purple-400 mt-1">
                  {user.available_xp} / {activeWish?.cost_xp || '?'} XP
                </div>
              </div>
              <div className="w-14 h-14 -mt-1 -mr-1 transition-transform group-hover:scale-110 group-hover:rotate-12">
                <img src={giftBox3d} className="w-full h-full object-contain drop-shadow-md" />
              </div>
            </div>

            {/* Wish Progress */}
            {activeWish && (
              <div className="mt-4 h-2 bg-white/50 rounded-full overflow-hidden">
                <div className="h-full bg-purple-400 rounded-full" style={{ width: `${wishProgress}%` }}></div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="px-6 py-8 relative z-10">

        {/* 📚 Today's Quest Section */}
        <div className="mb-8 hidden-scrollbar">
          <h2 className="text-2xl font-black text-brand-textDark mb-6 flex items-center gap-3 animate-entrancement delay-100">
            <div className="w-10 h-10 p-1 bg-orange-100 rounded-xl relative overflow-hidden shadow-inner">
              <img src={bookStack3d} className="w-full h-full object-contain mix-blend-multiply opacity-90" />
            </div>
            知识图谱 Knowledge Map
            <span className="text-sm font-bold text-gray-400 bg-white px-3 py-1 rounded-full shadow-sm border border-gray-100">
              {completedCount} / {totalCount}
            </span>
          </h2>

          <div className="grid grid-cols-1 gap-5">
            {tasks.length === 0 ? (
              <div className="premium-card p-10 text-center flex flex-col items-center justify-center min-h-[400px] animate-pop">
                <div className="w-32 h-32 mb-6 bg-green-100 rounded-full flex items-center justify-center relative overflow-visible">
                  <div className="absolute inset-0 bg-green-200 rounded-full animate-ping opacity-20"></div>
                  <img src={giftBox3d} className="w-24 h-24 object-contain animate-bounce-slow drop-shadow-lg" />
                </div>
                <h3 className="text-2xl font-black text-brand-textDark mb-2 font-display">任务完成！</h3>
                <p className="text-lg text-brand-textLight font-bold mb-8">今天表现太棒了，没有任何待办任务啦！</p>
                <Button
                  onClick={() => setShowShop(true)}
                  variant="primary"
                  size="lg"
                  className="shadow-xl shadow-brand-orange/30 hover:shadow-brand-orange/50 active:scale-95 transition-all text-xl px-10 py-4 h-auto rounded-full"
                  icon={<span className="text-2xl mr-2">🛍️</span>}
                >
                  逛逛奖励商店
                </Button>
              </div>
            ) : (
              tasks.map((task, index) => {
                const isCompleted = task.status === 'completed';
                const isReading = task.task_type === 'reading';
                const Icon3d = isReading ? bookStack3d : quizBoard3d; // Use 3D assets

                return (
                  <div
                    key={task.id}
                    onClick={() => onStartQuest(task, isCompleted ? 'review' : 'normal')}
                    className={`
                       group relative bg-white rounded-[28px] p-5 shadow-sm border-2 border-transparent transition-all duration-300 animate-entrancement cursor-pointer
                       ${isCompleted
                        ? 'opacity-80 hover:opacity-100 hover:border-green-300 hover:shadow-lg hover:-translate-y-1'
                        : 'hover:border-brand-primary/30 hover:shadow-xl hover:-translate-y-1'
                      }
                     `}
                    style={{ animationDelay: `${index * 100 + 200}ms` }}
                  >
                    <div className="flex items-center gap-5">
                      {/* 3D Icon Box */}
                      <div className={`
                         relative w-20 h-20 rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3
                         ${isReading ? 'bg-blue-50' : 'bg-orange-50'}
                       `}>
                        <img
                          src={Icon3d}
                          className="w-16 h-16 object-contain drop-shadow-md z-10 icon-3d"
                        />
                        <div className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${isReading ? 'bg-blue-100/50' : 'bg-orange-100/50'}`}></div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          {isReading ?
                            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 text-[10px] font-bold uppercase tracking-wider">阅读 Reading</span> :
                            <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 text-[10px] font-bold uppercase tracking-wider">挑战 Quiz</span>
                          }
                          {isCompleted && <span className="text-green-500 font-bold text-xs flex items-center gap-1">✓ 已完成</span>}
                        </div>

                        <h3 className="font-bold text-gray-800 text-lg leading-tight truncate mb-2 group-hover:text-brand-primary transition-colors">
                          {task.learning_material?.title}
                        </h3>

                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1 text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-lg border border-gray-200">
                            <img src={starCoin3d} className="w-3 h-3" /> +{task.xp_reward} XP
                          </span>
                          {isReading && (
                            <span className="text-xs font-bold text-gray-400 flex items-center gap-1">
                              <ClockIcon size="sm" /> {task.reading_duration_goal}m
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action Button (Hover only) */}
                      <div className="absolute right-5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
                        {isCompleted ? (
                          <div className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center shadow-lg hover:scale-110">
                            <i className="fas fa-eye"></i>
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-brand-primary text-white flex items-center justify-center shadow-lg hover:scale-110">
                            <PlayIcon size="sm" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 知识点掌握概览 */}
        <KnowledgeOverview userId={user.id} />

        {/* 📚 快捷入口 - 单词练习 */}
        {onStartWordPractice && (
          <div className="mt-6">
            <button
              onClick={onStartWordPractice}
              className="w-full group relative bg-gradient-to-r from-teal-400 to-cyan-500 rounded-[24px] p-5 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/10 group-hover:bg-white/20 transition-colors"></div>
              <div className="relative z-10 flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-4xl group-hover:scale-110 transition-transform">
                  📚
                </div>
                <div className="flex-1 text-left">
                  <div className="text-white font-black text-xl mb-1">单词练习</div>
                  <div className="text-white/80 text-sm font-bold">背单词像玩游戏一样有趣</div>
                </div>
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white text-xl group-hover:translate-x-1 transition-transform">
                  →
                </div>
              </div>
            </button>
          </div>
        )}

        {/* Placeholder for future widgets */}
        <div className="mt-8"></div>
      </main>

      {/* Stats Modal: The Adventure Log */}
      {showStats && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowStats(false)}>
          <div className="w-full max-w-2xl bg-white rounded-[2rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>

            {/* Header Section */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-8 text-white relative overflow-hidden shrink-0">
              <div className="absolute top-0 right-0 w-64 h-64 bg-brand-teal rounded-full blur-[100px] opacity-20 -mr-20 -mt-20"></div>
              <div className="relative z-10 flex items-center gap-6">
                <div className="w-24 h-24 relative icon-3d-container animate-float">
                  <img src={avatarGirl3d} alt="avatar" className="w-full h-full object-contain" />
                </div>
                <div className="flex-1">
                  <div className="text-brand-teal font-black tracking-widest uppercase text-xs mb-1">Adventure Log</div>
                  <h2 className="text-3xl font-black mb-2">{user.name}的探险档案</h2>

                  {/* Level Progress Bar */}
                  <div className="w-full bg-white/10 h-4 rounded-full overflow-hidden border border-white/10 relative">
                    <div className="h-full bg-gradient-to-r from-brand-secondary to-brand-primary transition-all duration-1000" style={{ width: `${currentLevelProgress}%` }}></div>
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white/80">Lv.{currentLevel} ({user.total_xp} / {nextLevelXp} XP)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="p-6 overflow-y-auto bg-gray-50 flex-1 space-y-6">

              {/* 1. Weekly Loot (Stats) */}
              <section>
                <h3 className="font-black text-gray-700 mb-3 flex items-center gap-2 text-sm uppercase tracking-wider opacity-60">
                  本周战利品 (Weekly Loot)
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 text-center">
                    <div className="icon-container-lg mx-auto mb-1 icon-lavender"><BookIcon size="lg" /></div>
                    <div className="text-2xl font-black text-brand-textDark">{weeklyBooks}</div>
                    <div className="text-xs font-bold text-gray-400">本好书</div>
                  </div>
                  <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 text-center">
                    <div className="icon-container-lg mx-auto mb-1 icon-primary"><QuizIcon size="lg" /></div>
                    <div className="text-2xl font-black text-brand-textDark">{weeklyQuizzes}</div>
                    <div className="text-xs font-bold text-gray-400">次挑战</div>
                  </div>
                  <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 text-center">
                    <div className="icon-container-lg mx-auto mb-1 icon-primary">
                      <img src={fireFlame3d} className="w-full h-full object-contain" />
                    </div>
                    <div className="text-2xl font-black text-brand-textDark">{displayStreak}</div>
                    <div className="text-xs font-bold text-gray-400">天连胜</div>
                  </div>
                </div>
              </section>

              {/* 2. Attributes (Subject Mastery) */}
              <section>
                <h3 className="font-black text-gray-700 mb-3 flex items-center gap-2 text-sm uppercase tracking-wider opacity-60">
                  英雄属性 (Attributes)
                </h3>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1 text-gray-600">
                      <span className="flex items-center gap-1"><StrengthIcon size="sm" className="text-red-400" /> 力量 (数学 Math)</span>
                      <span>{Math.round(attributes.strength)}%</span>
                    </div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-red-400 rounded-full transition-all duration-1000" style={{ width: `${attributes.strength}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1 text-gray-600">
                      <span className="flex items-center gap-1"><WisdomIcon size="sm" className="text-blue-400" /> 智慧 (语言 Language)</span>
                      <span>{Math.round(attributes.wisdom)}%</span>
                    </div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-400 rounded-full transition-all duration-1000" style={{ width: `${attributes.wisdom}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1 text-gray-600">
                      <span className="flex items-center gap-1"><MagicIcon size="sm" className="text-purple-400" /> 魔法 (科学 Science)</span>
                      <span>{Math.round(attributes.magic)}%</span>
                    </div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-400 rounded-full transition-all duration-1000" style={{ width: `${attributes.magic}%` }}></div>
                    </div>
                  </div>
                </div>
              </section>

              {/* 3. Mistake Notebook */}
              <section>
                <h3 className="font-black text-gray-700 mb-3 flex items-center gap-2 text-sm uppercase tracking-wider opacity-60">
                  错题宝藏 (Mistakes)
                </h3>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2">
                  {mistakes.length > 0 ? (
                    mistakes.map((m, i) => (
                      <div key={m.id} className="p-4 border-b last:border-0 border-gray-50 hover:bg-gray-50 transition-colors rounded-lg cursor-pointer" onClick={() => setExpandedMistake(expandedMistake === m.id ? null : m.id)}>
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-red-100 text-red-500 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{i + 1}</div>
                          <div className="flex-1">
                            <div className="font-bold text-gray-800 mb-1 text-sm">
                              <Latex>{m.question?.includes('\\') ? `$${m.question}$` : m.question}</Latex>
                            </div>
                            <div className="text-xs text-red-400 mb-1 line-through decoration-red-300">
                              我的: <Latex>{String(m.wrong_answer).includes('\\') ? `$${m.wrong_answer}$` : String(m.wrong_answer)}</Latex>
                            </div>

                            {expandedMistake === m.id && (
                              <div className="mt-2 bg-green-50 p-3 rounded-lg animate-slide-up">
                                <div className="text-xs font-bold text-green-700 mb-1 flex items-center gap-1">
                                  <CheckIcon size="sm" />
                                  正确答案: <Latex>{m.correct_answer?.includes('\\') ? `$${m.correct_answer}$` : m.correct_answer}</Latex>
                                </div>
                                {m.explanation && <div className="text-xs text-gray-600 leading-relaxed">
                                  <Latex>{m.explanation?.includes('\\') ? `$${m.explanation}$` : m.explanation}</Latex>
                                </div>}
                              </div>
                            )}
                            {expandedMistake !== m.id && <div className="text-[10px] text-gray-400 mt-1">点击查看详解</div>}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-gray-400">
                      <div className="icon-container-xl mx-auto mb-2 icon-secondary"><TrophyIcon size="xl" /></div>
                      太棒了！最近没有发现错题宝藏。
                    </div>
                  )}
                </div>
              </section>
            </div>

            <div className="p-4 bg-white border-t border-gray-100">
              <Button onClick={() => setShowStats(false)} variant="secondary" className="w-full">继续探险</Button>
            </div>
          </div>
        </div>
      )}

      {/* Shop Modal */}
      {showShop && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center animate-fade-in" onClick={() => setShowShop(false)}>
          <div className="bg-white w-full sm:w-[90%] max-w-md h-[80vh] sm:h-auto sm:rounded-3xl rounded-t-3xl p-6 flex flex-col animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2">
                <div className="w-8 h-8"><img src={giftBox3d} className="w-full h-full object-contain" /></div>
                心愿小店
              </h2>
              <button onClick={() => setShowShop(false)} className="bg-gray-100 w-8 h-8 rounded-full flex items-center justify-center"><CheckIcon size="sm" /></button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4">
              {rewardsList.map(item => {
                const isActive = user.active_wish_id === item.id;
                const canRedeem = (user.available_xp || 0) >= item.cost_xp;

                const handleSelectWish = async () => {
                  await onSetWish(item.id);
                  setShowShop(false);
                };

                const handleRedeem = async (e: React.MouseEvent) => {
                  e.stopPropagation();
                  if (!onRedeem || isRedeeming) return;
                  setIsRedeeming(true);
                  try {
                    await onRedeem(item.id);
                    setShowShop(false);
                  } finally {
                    setIsRedeeming(false);
                  }
                };

                return (
                  <div key={item.id} onClick={handleSelectWish} className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${isActive ? 'border-yellow-400 bg-yellow-50' : 'border-gray-100 bg-white hover:border-yellow-200'}`}>
                    {isActive && <div className="absolute -top-3 -right-3 bg-yellow-400 text-white p-1 rounded-full shadow-md"><CheckIcon size="sm" /></div>}
                    <div className="flex items-center gap-4">
                      {/* 如果有 3D 图标可以在这里做映射，暂时用 emoji 或 item.icon */}
                      <div className="text-4xl">{item.icon}</div>
                      <div className="flex-1">
                        <div className="font-bold text-gray-800 text-lg">{item.name}</div>
                        <div className="text-sm font-bold text-brand-orange flex items-center gap-1">
                          <img src={starCoin3d} className="w-4 h-4" /> {item.cost_xp} XP
                        </div>
                      </div>
                      {isActive && canRedeem && (
                        <Button
                          size="sm"
                          className="bg-brand-orange shadow-orange-200"
                          onClick={handleRedeem}
                          disabled={isRedeeming}
                        >
                          {isRedeeming ? '兑换中...' : '兑换!'}
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};