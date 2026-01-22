/**
 * Context Service - 获取孩子学习上下文
 * 
 * 聚合数据来源：
 * 1. 用户基本信息 (profiles)
 * 2. 知识点掌握情况 (knowledge_mastery)
 * 3. 近期学习行为 (daily_tasks, answer_records)
 * 4. 记忆系统 (child_memory)
 */

import { supabase } from './supabaseClient';
import { ChildContext, ChildProfile, MasteryStats, BehaviorSignals, EmotionSignal } from './intentService';
import { getEmotionTrend } from './emotionService';

// ============================================
// 主函数：获取完整上下文
// ============================================

/**
 * 获取孩子的完整学习上下文
 */
export async function getChildContext(childId: string): Promise<ChildContext> {
    // 并行获取各项数据
    const [profile, masteryStats, behaviorSignals, memoryData, emotionTrend] = await Promise.all([
        getChildProfile(childId),
        getMasteryStats(childId),
        getBehaviorSignals(childId),
        getMemoryData(childId),
        getEmotionTrend(childId)  // 获取情绪趋势
    ]);

    // 推断情绪信号（优先使用实际记录）
    const emotionSignal = inferEmotionSignal(behaviorSignals, memoryData, emotionTrend);

    return {
        profile,
        masteryStats,
        behaviorSignals,
        emotionSignal,
        activeHypotheses: memoryData.hypotheses,
        stablePatterns: memoryData.stable
    };
}

// ============================================
// 数据获取函数
// ============================================

/**
 * 获取孩子基本信息
 */
async function getChildProfile(childId: string): Promise<ChildProfile> {
    const { data, error } = await supabase
        .from('users')
        .select('id, name, grade_level, total_xp, streak_days')
        .eq('id', childId)
        .single();

    if (error || !data) {
        console.error('[Context] Failed to get profile:', error);
        return {
            id: childId,
            name: '孩子',
            gradeLevel: undefined,
            totalXp: 0,
            streakDays: 0
        };
    }

    return {
        id: data.id,
        name: data.name,
        gradeLevel: data.grade_level,
        totalXp: data.total_xp || 0,
        streakDays: data.streak_days || 0
    };
}

/**
 * 获取知识点掌握统计
 */
async function getMasteryStats(childId: string): Promise<MasteryStats> {
    try {
        // 获取所有知识点掌握情况
        const { data: masteryData, error } = await supabase
            .from('knowledge_mastery')
            .select('knowledge_point_name, mastery_level, subject')
            .eq('user_id', childId);

        if (error || !masteryData || masteryData.length === 0) {
            return getDefaultMasteryStats();
        }

        // 计算统计
        const totalPoints = masteryData.length;
        const avgMastery = masteryData.reduce((sum, m) => sum + (m.mastery_level || 0), 0) / totalPoints;

        // 分类知识点
        const weakPoints = masteryData
            .filter(m => (m.mastery_level || 0) < 0.4)
            .map(m => m.knowledge_point_name);

        const strongPoints = masteryData
            .filter(m => (m.mastery_level || 0) >= 0.7)
            .map(m => m.knowledge_point_name);

        const masteredCount = strongPoints.length;

        // 获取近期错误率
        const recentErrorRate = await getRecentErrorRate(childId);

        return {
            avgMastery: Math.round(avgMastery * 100) / 100,
            weakPoints,
            strongPoints,
            recentErrorRate,
            totalPoints,
            masteredCount
        };
    } catch (e) {
        console.error('[Context] Failed to get mastery stats:', e);
        return getDefaultMasteryStats();
    }
}

/**
 * 获取近期错误率
 */
async function getRecentErrorRate(childId: string): Promise<number> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data, error } = await supabase
        .from('answer_records')
        .select('is_correct')
        .eq('user_id', childId)
        .gte('created_at', sevenDaysAgo.toISOString());

    if (error || !data || data.length === 0) {
        return 0;
    }

    const incorrectCount = data.filter(r => !r.is_correct).length;
    return Math.round((incorrectCount / data.length) * 100) / 100;
}

/**
 * 获取行为信号
 */
async function getBehaviorSignals(childId: string): Promise<BehaviorSignals> {
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        // 获取近7天的任务数据
        const { data: tasks, error } = await supabase
            .from('daily_tasks')
            .select('status, created_at, completed_at, started_at')
            .eq('user_id', childId)
            .gte('created_at', sevenDaysAgo.toISOString());

        if (error || !tasks || tasks.length === 0) {
            return getDefaultBehaviorSignals();
        }

        // 计算放弃率
        const abandonedCount = tasks.filter(t => t.status === 'skipped' ||
            (t.status === 'in_progress' && t.started_at && !t.completed_at)).length;
        const abandonRate = tasks.length > 0 ? abandonedCount / tasks.length : 0;

        // 计算完成数和趋势
        const completedTasks = tasks.filter(t => t.status === 'completed').length;

        // 简单趋势判断：比较前后半周
        const midpoint = new Date();
        midpoint.setDate(midpoint.getDate() - 3);

        const firstHalf = tasks.filter(t => new Date(t.created_at) < midpoint);
        const secondHalf = tasks.filter(t => new Date(t.created_at) >= midpoint);

        const firstHalfCompletion = firstHalf.length > 0
            ? firstHalf.filter(t => t.status === 'completed').length / firstHalf.length
            : 0;
        const secondHalfCompletion = secondHalf.length > 0
            ? secondHalf.filter(t => t.status === 'completed').length / secondHalf.length
            : 0;

        let trend: 'improving' | 'stable' | 'declining';
        if (secondHalfCompletion > firstHalfCompletion + 0.1) {
            trend = 'improving';
        } else if (secondHalfCompletion < firstHalfCompletion - 0.1) {
            trend = 'declining';
        } else {
            trend = 'stable';
        }

        // 平均完成时间（简化计算）
        const completedWithTime = tasks.filter(t =>
            t.status === 'completed' && t.started_at && t.completed_at
        );
        let avgCompletionTime = 0;
        if (completedWithTime.length > 0) {
            const totalTime = completedWithTime.reduce((sum, t) => {
                const start = new Date(t.started_at).getTime();
                const end = new Date(t.completed_at).getTime();
                return sum + (end - start) / 1000; // 秒
            }, 0);
            avgCompletionTime = Math.round(totalTime / completedWithTime.length);
        }

        return {
            abandonRate: Math.round(abandonRate * 100) / 100,
            avgCompletionTime,
            trend,
            recentTasksCompleted: completedTasks
        };
    } catch (e) {
        console.error('[Context] Failed to get behavior signals:', e);
        return getDefaultBehaviorSignals();
    }
}

/**
 * 获取记忆数据
 */
async function getMemoryData(childId: string): Promise<{
    ephemeral: any[];
    hypotheses: any[];
    stable: any[];
}> {
    try {
        const { data, error } = await supabase
            .from('child_memory')
            .select('*')
            .eq('child_id', childId)
            .eq('status', 'active');

        if (error || !data) {
            return { ephemeral: [], hypotheses: [], stable: [] };
        }

        return {
            ephemeral: data.filter(m => m.memory_layer === 'ephemeral'),
            hypotheses: data.filter(m => m.memory_layer === 'hypothesis'),
            stable: data.filter(m => m.memory_layer === 'stable')
        };
    } catch (e) {
        console.error('[Context] Failed to get memory data:', e);
        return { ephemeral: [], hypotheses: [], stable: [] };
    }
}

// ============================================
// 情绪推断
// ============================================

/**
 * 从行为、记忆和情绪记录数据推断情绪信号
 */
function inferEmotionSignal(
    behavior: BehaviorSignals,
    memory: { ephemeral: any[]; hypotheses: any[]; stable: any[] },
    emotionTrend?: Awaited<ReturnType<typeof getEmotionTrend>>
): EmotionSignal {
    // 🆕 优先使用孩子的实际情绪记录
    if (emotionTrend?.hasEnoughData && emotionTrend.recentEmotions.length > 0) {
        const dominant = emotionTrend.dominantEmotion;

        // 如果需要减负模式，返回疲劳信号
        if (emotionTrend.needsLightenMode) {
            return emotionTrend.frustrationStreak >= 3 ? 'low_mood' : 'fatigue';
        }

        // 映射情绪记录到意图信号
        if (dominant === 'frustrated') return 'frustration';
        if (dominant === 'tired') return 'fatigue';
        if (dominant === 'happy') return 'engaged';
    }

    // 检查假设层是否有情绪相关记录
    const emotionHypothesis = memory.hypotheses.find(h =>
        h.memory_key?.includes('fatigue') ||
        h.memory_key?.includes('frustration') ||
        h.memory_key?.includes('avoidance')
    );

    if (emotionHypothesis) {
        if (emotionHypothesis.memory_key.includes('fatigue')) return 'fatigue';
        if (emotionHypothesis.memory_key.includes('frustration')) return 'frustration';
        if (emotionHypothesis.memory_key.includes('avoidance')) return 'avoidance';
    }

    // 从行为数据推断
    if (behavior.abandonRate > 0.6) {
        return 'avoidance';
    }
    if (behavior.abandonRate > 0.2 || behavior.trend === 'declining') {
        return 'fatigue';
    }
    if (behavior.trend === 'improving' && behavior.recentTasksCompleted > 5) {
        return 'engaged';
    }

    return 'neutral';
}

// ============================================
// 默认值
// ============================================

function getDefaultMasteryStats(): MasteryStats {
    return {
        avgMastery: 0.5,
        weakPoints: [],
        strongPoints: [],
        recentErrorRate: 0,
        totalPoints: 0,
        masteredCount: 0
    };
}

function getDefaultBehaviorSignals(): BehaviorSignals {
    return {
        abandonRate: 0,
        avgCompletionTime: 0,
        trend: 'stable',
        recentTasksCompleted: 0
    };
}

export default {
    getChildContext
};
