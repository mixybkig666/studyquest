/**
 * 知识点追踪服务
 * 实现艾宾浩斯遗忘曲线复习机制
 */

import { KnowledgeMastery, EBBINGHAUS_INTERVALS } from '../types';
import { supabase } from './supabaseClient';

/**
 * 计算下次复习时间
 * 基于艾宾浩斯遗忘曲线：1天→2天→4天→7天→15天→30天
 */
export function calculateNextReviewDate(
    reviewCount: number,
    masteryLevel: 0 | 1 | 2 | 3
): Date {
    const now = new Date();

    // 已经熟练掌握，30天后复习
    if (masteryLevel === 3 && reviewCount >= 5) {
        now.setDate(now.getDate() + 30);
        return now;
    }

    // 根据复习次数确定间隔
    const intervalIndex = Math.min(reviewCount, EBBINGHAUS_INTERVALS.length - 1);
    const daysToAdd = EBBINGHAUS_INTERVALS[intervalIndex];

    now.setDate(now.getDate() + daysToAdd);
    return now;
}

/**
 * 根据正确率计算掌握程度
 */
export function calculateMasteryLevel(
    correctCount: number,
    totalAttempts: number,
    consecutiveCorrect: number
): 0 | 1 | 2 | 3 {
    if (totalAttempts === 0) return 0;

    const accuracy = correctCount / totalAttempts;

    // 熟练掌握：正确率 > 85% 且连续正确 >= 3 次
    if (accuracy > 0.85 && consecutiveCorrect >= 3) {
        return 3;
    }

    // 基本掌握：正确率 60-85%
    if (accuracy >= 0.6) {
        return 2;
    }

    // 初步了解：正确率 < 60%
    return 1;
}

/**
 * 更新知识点掌握情况
 */
export function updateMastery(
    current: KnowledgeMastery | null,
    isCorrect: boolean,
    userId: string,
    knowledgePointId: string,
    knowledgePointName: string
): KnowledgeMastery {
    const now = new Date().toISOString();

    if (!current) {
        // 新知识点
        const mastery: KnowledgeMastery = {
            user_id: userId,
            knowledge_point_id: knowledgePointId,
            knowledge_point_name: knowledgePointName,
            total_attempts: 1,
            correct_count: isCorrect ? 1 : 0,
            mastery_level: isCorrect ? 1 : 0,
            last_reviewed_at: now,
            next_review_at: calculateNextReviewDate(0, isCorrect ? 1 : 0).toISOString(),
            review_count: 1,
            consecutive_correct: isCorrect ? 1 : 0,
            common_error_types: []
        };
        return mastery;
    }

    // 更新现有记录
    const newConsecutiveCorrect = isCorrect ? current.consecutive_correct + 1 : 0;
    const newCorrectCount = current.correct_count + (isCorrect ? 1 : 0);
    const newTotalAttempts = current.total_attempts + 1;
    const newReviewCount = current.review_count + 1;

    const newMasteryLevel = calculateMasteryLevel(
        newCorrectCount,
        newTotalAttempts,
        newConsecutiveCorrect
    );

    return {
        ...current,
        total_attempts: newTotalAttempts,
        correct_count: newCorrectCount,
        mastery_level: newMasteryLevel,
        last_reviewed_at: now,
        next_review_at: calculateNextReviewDate(newReviewCount, newMasteryLevel).toISOString(),
        review_count: newReviewCount,
        consecutive_correct: newConsecutiveCorrect
    };
}

/**
 * 获取需要复习的知识点
 */
export function getReviewDuePoints(
    masteries: KnowledgeMastery[]
): KnowledgeMastery[] {
    const now = new Date();
    return masteries.filter(m => {
        const nextReview = new Date(m.next_review_at);
        return nextReview <= now;
    });
}

/**
 * 获取薄弱知识点（掌握程度 <= 1）
 */
export function getWeakPoints(
    masteries: KnowledgeMastery[]
): KnowledgeMastery[] {
    return masteries.filter(m => m.mastery_level <= 1);
}

/**
 * 生成知识点掌握情况汇总（用于注入到 AI Prompt）
 */
export function generateMasterySummary(
    masteries: KnowledgeMastery[]
): string {
    if (masteries.length === 0) {
        return "暂无知识点记录";
    }

    const masteryLabels = ['未学习', '初步了解', '基本掌握', '熟练掌握'];

    const needReview = getReviewDuePoints(masteries);
    const weakPoints = getWeakPoints(masteries);

    let summary = "【学生知识点掌握情况】\n";

    // 需要复习的
    if (needReview.length > 0) {
        summary += "⏰ 需要复习：\n";
        needReview.slice(0, 5).forEach(m => {
            const accuracy = m.total_attempts > 0
                ? Math.round((m.correct_count / m.total_attempts) * 100)
                : 0;
            summary += `  - ${m.knowledge_point_name}: ${masteryLabels[m.mastery_level]} (正确率 ${accuracy}%)\n`;
        });
    }

    // 薄弱点
    if (weakPoints.length > 0) {
        summary += "📚 薄弱知识点（需重点考察）：\n";
        weakPoints.slice(0, 5).forEach(m => {
            const accuracy = m.total_attempts > 0
                ? Math.round((m.correct_count / m.total_attempts) * 100)
                : 0;
            summary += `  - ${m.knowledge_point_name}: ${masteryLabels[m.mastery_level]} (正确率 ${accuracy}%)\n`;
        });
    }

    // 已掌握的
    const mastered = masteries.filter(m => m.mastery_level >= 2);
    if (mastered.length > 0) {
        summary += `✅ 已掌握 ${mastered.length} 个知识点\n`;
    }

    return summary;
}

// ===== 数据库交互函数 =====

/**
 * 从数据库加载用户的知识点掌握情况
 */
export async function loadUserMasteries(userId: string): Promise<KnowledgeMastery[]> {
    try {
        const { data, error } = await supabase
            .from('knowledge_mastery')
            .select('*')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false });

        if (error) {
            console.error('Failed to load masteries:', error);
            return [];
        }

        // 转换数据库格式到前端格式
        return (data || []).map(row => ({
            user_id: row.user_id,
            knowledge_point_id: row.id,
            knowledge_point_name: row.knowledge_point_name,
            total_attempts: row.total_attempts,
            correct_count: row.correct_count,
            mastery_level: row.mastery_level as 0 | 1 | 2 | 3,
            last_reviewed_at: row.last_reviewed_at,
            next_review_at: row.next_review_at,
            review_count: row.review_count,
            consecutive_correct: row.consecutive_correct,
            common_error_types: [
                { type: 'concept', count: row.error_concept_count || 0 },
                { type: 'calculation', count: row.error_calculation_count || 0 },
                { type: 'reading', count: row.error_reading_count || 0 },
                { type: 'careless', count: row.error_careless_count || 0 }
            ].filter(e => e.count > 0)
        }));
    } catch (e) {
        console.error('Load masteries error:', e);
        return [];
    }
}

/**
 * 通过 RPC 调用数据库函数更新知识点掌握情况
 */
export async function saveMasteryToDb(
    userId: string,
    knowledgePointName: string,
    subject: string,
    isCorrect: boolean,
    errorType?: string
): Promise<void> {
    try {
        const { error } = await supabase.rpc('upsert_knowledge_mastery', {
            p_user_id: userId,
            p_knowledge_point_name: knowledgePointName,
            p_subject: subject,
            p_is_correct: isCorrect,
            p_error_type: errorType || null
        });

        if (error) {
            console.error('Failed to save mastery:', error);
        }
    } catch (e) {
        console.error('Save mastery error:', e);
    }
}

/**
 * 批量更新知识点掌握情况（答题结束后调用）
 */
export async function updateMasteriesFromQuestions(
    userId: string,
    subject: string,
    questions: Array<{
        knowledge_points?: string[];
        user_result?: {
            is_correct: boolean;
        };
    }>
): Promise<void> {
    console.log('[knowledgeService] updateMasteriesFromQuestions called', { userId, subject, questionsCount: questions.length });
    let updateCount = 0;
    for (const q of questions) {
        if (!q.knowledge_points || !q.user_result) continue;

        console.log('[knowledgeService] Processing question KPs:', q.knowledge_points);
        for (const kp of q.knowledge_points) {
            await saveMasteryToDb(
                userId,
                kp,
                subject,
                q.user_result.is_correct
            );
            updateCount++;
        }
    }
    console.log(`[knowledgeService] Updated ${updateCount} mastery records`);
}

/**
 * 获取知识点掌握汇总（用于仪表盘显示）
 */
export async function getMasterySummaryFromDb(userId: string): Promise<{
    total_points: number;
    mastered_count: number;
    learning_count: number;
    weak_count: number;
    review_due_count: number;
} | null> {
    try {
        const { data, error } = await supabase.rpc('get_mastery_summary', {
            p_user_id: userId
        });

        if (error) {
            console.error('Failed to get mastery summary:', error);
            return null;
        }

        return data?.[0] || null;
    } catch (e) {
        console.error('Get mastery summary error:', e);
        return null;
    }
}

