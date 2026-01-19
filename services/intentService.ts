/**
 * Intent Service - Teaching Intent 决策逻辑
 * 
 * 核心决策表：
 * | 条件 | 行为信号 | 情绪信号 | Intent |
 * |------|----------|----------|--------|
 * | mastery < 0.4 | 错误集中 | 稳定 | reinforce |
 * | mastery 0.4-0.7 | 正确率高但慢 | 稳定 | verify |
 * | mastery > 0.7 | 表现稳定 | 稳定 | challenge |
 * | 任意 | 放弃率↑ | 轻度烦躁 | lighten |
 * | 任意 | 连续异常 | 情绪低落 | pause |
 */

// ============================================
// 类型定义
// ============================================

export type IntentType = 'reinforce' | 'verify' | 'challenge' | 'lighten' | 'introduce' | 'pause';
export type EmotionSignal = 'neutral' | 'frustration' | 'avoidance' | 'fatigue' | 'low_mood' | 'engaged';
export type BehaviorTrend = 'improving' | 'stable' | 'declining';
export type DifficultyLevel = 'low' | 'medium' | 'high';

export interface TeachingIntent {
    type: IntentType;
    reason: string;
    focusKnowledgePoints: string[];
    questionCount: number;
    difficultyLevel: DifficultyLevel;
}

export interface ChildProfile {
    id: string;
    name: string;
    gradeLevel?: number;
    totalXp: number;
    streakDays: number;
}

export interface MasteryStats {
    avgMastery: number;           // 平均掌握度 0-1
    weakPoints: string[];         // 薄弱知识点
    strongPoints: string[];       // 强项知识点
    recentErrorRate: number;      // 近期错误率
    totalPoints: number;          // 总知识点数
    masteredCount: number;        // 已掌握数
}

export interface BehaviorSignals {
    abandonRate: number;          // 放弃率 0-1
    avgCompletionTime: number;    // 平均完成时间（秒）
    trend: BehaviorTrend;         // 趋势
    recentTasksCompleted: number; // 近期完成任务数
}

export interface ChildContext {
    profile: ChildProfile;
    masteryStats: MasteryStats;
    behaviorSignals: BehaviorSignals;
    emotionSignal: EmotionSignal;
    activeHypotheses: any[];      // 活跃的假设记忆
    stablePatterns: any[];        // 长期稳定模式
}

// ============================================
// Teaching Intent 决策配置
// ============================================

const INTENT_CONFIG: Record<IntentType, {
    defaultCount: number;
    defaultDifficulty: DifficultyLevel;
}> = {
    // 题目数量增加：阅读材料改为可选参考后，学习时间更紧凑
    reinforce: { defaultCount: 8, defaultDifficulty: 'low' },
    verify: { defaultCount: 6, defaultDifficulty: 'medium' },
    challenge: { defaultCount: 5, defaultDifficulty: 'high' },
    lighten: { defaultCount: 4, defaultDifficulty: 'low' },
    introduce: { defaultCount: 5, defaultDifficulty: 'low' },
    pause: { defaultCount: 0, defaultDifficulty: 'low' }
};

// ============================================
// 核心决策函数
// ============================================

/**
 * 决定今日教学意图
 * 
 * 决策优先级：
 * 1. 情绪硬边界检查（最高优先级）
 * 2. 行为风险检查
 * 3. 基于掌握度的常规决策
 */
export async function decideTeachingIntent(
    context: ChildContext,
    parentSignal?: { type: string; content: string }
): Promise<TeachingIntent> {

    // ====== 第一优先级：情绪硬边界 ======
    if (shouldPause(context)) {
        return createIntent('pause', context, '检测到情绪风险信号，今天优先保护孩子状态');
    }

    // ====== 第二优先级：行为风险 ======
    if (shouldLighten(context)) {
        return createIntent('lighten', context, '最近学习强度较大或放弃率上升，降低强度保持连接');
    }

    // ====== 第三优先级：处理家长信号 ======
    if (parentSignal) {
        const adjustedIntent = handleParentSignal(context, parentSignal);
        if (adjustedIntent) {
            return adjustedIntent;
        }
    }

    // ====== 第四优先级：基于掌握度的常规决策 ======
    const { avgMastery, masteredCount, totalPoints, strongPoints } = context.masteryStats;

    // 掌握度低于 40%：需要巩固
    if (avgMastery < 0.4) {
        return createIntent('reinforce', context, '部分知识点还不够稳固，今天重点巩固');
    }

    // 掌握度 40%-70%：验证是否真的掌握
    if (avgMastery < 0.7) {
        return createIntent('verify', context, '看起来掌握得不错，今天验证一下是否真正理解');
    }

    // 掌握度高于 70%：检查是否引入新知识
    if (avgMastery >= 0.7) {
        // 情况1：已掌握大部分知识点，可以学新的
        const masteryRatio = totalPoints > 0 ? masteredCount / totalPoints : 0;

        // 情况2：状态良好，没有疲劳信号
        const isGoodCondition = context.emotionSignal === 'engaged' ||
            (context.emotionSignal === 'neutral' &&
                context.behaviorSignals.trend !== 'declining');

        // 情况3：检查记忆中最近是否引入过新知识（间隔控制）
        const recentIntroduce = context.stablePatterns.find((p: any) =>
            p.key?.includes('last_introduce')
        );
        const daysSinceLastIntroduce = recentIntroduce
            ? Math.floor((Date.now() - new Date(recentIntroduce.lastUpdated).getTime()) / (1000 * 60 * 60 * 24))
            : 999;

        // 触发条件：掌握率高 + 状态好 + 距离上次引入超过 3 天
        if (masteryRatio >= 0.6 && isGoodCondition && daysSinceLastIntroduce >= 3) {
            return createIntent('introduce', context,
                `已掌握 ${Math.round(masteryRatio * 100)}% 的知识点，状态良好，今天可以学点新东西！`);
        }
    }

    // 高掌握度 + 状态良好：挑战
    if (context.emotionSignal === 'engaged') {
        return createIntent('challenge', context, '基础扎实且状态良好，来点有挑战的！');
    }

    // 状态一般但掌握度高：轻度挑战
    return createIntent('challenge', context, '基础扎实，尝试更有难度的题目');
}

// ============================================
// 辅助决策函数
// ============================================

/**
 * 判断是否应该暂停
 */
function shouldPause(context: ChildContext): boolean {
    // 情绪信号为 low_mood 且行为趋势下降
    if (context.emotionSignal === 'low_mood' && context.behaviorSignals.trend === 'declining') {
        return true;
    }

    // 连续高放弃率
    if (context.behaviorSignals.abandonRate > 0.5) {
        return true;
    }

    // 检查是否有强烈的回避信号
    if (context.emotionSignal === 'avoidance' && context.behaviorSignals.abandonRate > 0.3) {
        return true;
    }

    return false;
}

/**
 * 判断是否应该减轻强度
 */
function shouldLighten(context: ChildContext): boolean {
    // 轻度疲劳或烦躁
    if (context.emotionSignal === 'fatigue' || context.emotionSignal === 'frustration') {
        return true;
    }

    // 放弃率中等偏高
    if (context.behaviorSignals.abandonRate > 0.2) {
        return true;
    }

    // 行为趋势下降
    if (context.behaviorSignals.trend === 'declining') {
        return true;
    }

    return false;
}

/**
 * 处理家长信号
 * 返回调整后的意图，如果不需要调整返回 null
 */
function handleParentSignal(
    context: ChildContext,
    signal: { type: string; content: string }
): TeachingIntent | null {
    // 家长报告情绪问题
    if (signal.type === 'emotion_report') {
        const content = signal.content.toLowerCase();

        // 严重情绪问题关键词
        if (content.includes('厌学') || content.includes('不想学') || content.includes('很烦')) {
            // 但不直接 pause，而是 lighten，除非行为数据也支持
            if (context.behaviorSignals.abandonRate > 0.2) {
                return createIntent('lighten', context, '家长反馈情绪问题，结合行为数据降低强度');
            }
        }
    }

    // 家长请求调整
    if (signal.type === 'schedule_change') {
        return createIntent('lighten', context, '家长反馈需要调整学习安排');
    }

    return null;
}

/**
 * 创建 Teaching Intent 对象
 */
function createIntent(
    type: IntentType,
    context: ChildContext,
    reason: string
): TeachingIntent {
    const config = INTENT_CONFIG[type];

    // 根据意图类型选择聚焦的知识点
    let focusPoints: string[] = [];
    if (type === 'reinforce' || type === 'verify') {
        // 巩固/验证：聚焦薄弱点
        focusPoints = context.masteryStats.weakPoints.slice(0, 3);
    } else if (type === 'challenge') {
        // 挑战：可以用强项进行扩展
        focusPoints = context.masteryStats.strongPoints.slice(0, 2);
    } else if (type === 'lighten') {
        // 轻松：用强项保持成功体验
        focusPoints = context.masteryStats.strongPoints.slice(0, 1);
    }

    return {
        type,
        reason,
        focusKnowledgePoints: focusPoints,
        questionCount: config.defaultCount,
        difficultyLevel: config.defaultDifficulty
    };
}

// ============================================
// 情绪信号转译
// ============================================

/**
 * 将家长描述转译为标准化情绪信号
 */
export function translateEmotionSignal(description: string): EmotionSignal {
    const text = description.toLowerCase();

    // 关键词匹配
    if (text.includes('不想') || text.includes('回避') || text.includes('逃避')) {
        return 'avoidance';
    }
    if (text.includes('烦') || text.includes('生气') || text.includes('发脾气')) {
        return 'frustration';
    }
    if (text.includes('累') || text.includes('疲') || text.includes('困')) {
        return 'fatigue';
    }
    if (text.includes('不开心') || text.includes('难过') || text.includes('情绪低')) {
        return 'low_mood';
    }
    if (text.includes('积极') || text.includes('开心') || text.includes('主动')) {
        return 'engaged';
    }

    return 'neutral';
}

export default {
    decideTeachingIntent,
    translateEmotionSignal
};
