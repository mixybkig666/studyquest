/**
 * 元认知反馈服务
 * 收集学生对 AI 出题质量的评价，用于优化出题策略
 */

import { supabase } from './supabaseClient';

export interface TaskFeedback {
    id?: string;
    task_id: string;
    user_id: string;
    overall_rating: 'great' | 'ok' | 'bad';
    positive_tags: string[];
    negative_tags: string[];
    created_at?: string;
}

/**
 * 保存任务反馈
 */
export async function saveTaskFeedback(feedback: Omit<TaskFeedback, 'id' | 'created_at'>): Promise<TaskFeedback | null> {
    try {
        const { data, error } = await supabase
            .from('task_feedback')
            .insert({
                task_id: feedback.task_id,
                user_id: feedback.user_id,
                overall_rating: feedback.overall_rating,
                positive_tags: feedback.positive_tags,
                negative_tags: feedback.negative_tags,
            })
            .select()
            .single();

        if (error) {
            console.error('[FeedbackService] Failed to save feedback:', error);
            return null;
        }

        console.log('[FeedbackService] Feedback saved:', data);
        return data;
    } catch (err) {
        console.error('[FeedbackService] Error saving feedback:', err);
        return null;
    }
}

/**
 * 获取用户的反馈统计
 */
export async function getUserFeedbackStats(userId: string): Promise<{
    totalFeedback: number;
    ratingDistribution: { great: number; ok: number; bad: number };
    topPositiveTags: { tag: string; count: number }[];
    topNegativeTags: { tag: string; count: number }[];
} | null> {
    try {
        const { data, error } = await supabase
            .from('task_feedback')
            .select('*')
            .eq('user_id', userId);

        if (error) {
            console.error('[FeedbackService] Failed to get stats:', error);
            return null;
        }

        if (!data || data.length === 0) {
            return {
                totalFeedback: 0,
                ratingDistribution: { great: 0, ok: 0, bad: 0 },
                topPositiveTags: [],
                topNegativeTags: [],
            };
        }

        // 计算评分分布
        const ratingDistribution = { great: 0, ok: 0, bad: 0 };
        const positiveTagCounts: Record<string, number> = {};
        const negativeTagCounts: Record<string, number> = {};

        data.forEach(fb => {
            if (fb.overall_rating in ratingDistribution) {
                ratingDistribution[fb.overall_rating as keyof typeof ratingDistribution]++;
            }

            fb.positive_tags?.forEach((tag: string) => {
                positiveTagCounts[tag] = (positiveTagCounts[tag] || 0) + 1;
            });

            fb.negative_tags?.forEach((tag: string) => {
                negativeTagCounts[tag] = (negativeTagCounts[tag] || 0) + 1;
            });
        });

        // 排序标签
        const topPositiveTags = Object.entries(positiveTagCounts)
            .map(([tag, count]) => ({ tag, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        const topNegativeTags = Object.entries(negativeTagCounts)
            .map(([tag, count]) => ({ tag, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        return {
            totalFeedback: data.length,
            ratingDistribution,
            topPositiveTags,
            topNegativeTags,
        };
    } catch (err) {
        console.error('[FeedbackService] Error getting stats:', err);
        return null;
    }
}

/**
 * 检查任务是否已有反馈
 */
export async function hasTaskFeedback(taskId: string): Promise<boolean> {
    try {
        const { count, error } = await supabase
            .from('task_feedback')
            .select('*', { count: 'exact', head: true })
            .eq('task_id', taskId);

        if (error) {
            console.error('[FeedbackService] Failed to check feedback:', error);
            return false;
        }

        return (count || 0) > 0;
    } catch (err) {
        console.error('[FeedbackService] Error checking feedback:', err);
        return false;
    }
}

/**
 * 获取反馈洞察 - 用于指导 AI 出题策略
 * 根据最近的反馈数据，生成出题建议
 */
export async function getFeedbackInsights(userId: string): Promise<{
    hasEnoughData: boolean;
    difficultyAdvice: 'increase' | 'decrease' | 'maintain';
    qualityAdvice: string[];
    summary: string;
} | null> {
    try {
        // 获取最近 10 次反馈
        const { data, error } = await supabase
            .from('task_feedback')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) {
            console.error('[FeedbackService] Failed to get insights:', error);
            return null;
        }

        if (!data || data.length < 3) {
            return {
                hasEnoughData: false,
                difficultyAdvice: 'maintain',
                qualityAdvice: [],
                summary: '反馈数据不足，暂无优化建议',
            };
        }

        // 分析评分趋势
        const ratings = data.map(d => d.overall_rating);
        const greatCount = ratings.filter(r => r === 'great').length;
        const badCount = ratings.filter(r => r === 'bad').length;
        const satisfactionRate = greatCount / ratings.length;

        // 分析难度反馈
        const allNegativeTags = data.flatMap(d => d.negative_tags || []);
        const tooEasyCount = allNegativeTags.filter(t => t === 'too_easy').length;
        const tooHardCount = allNegativeTags.filter(t => t === 'too_hard').length;

        // 确定难度建议
        let difficultyAdvice: 'increase' | 'decrease' | 'maintain' = 'maintain';
        if (tooEasyCount >= 3 && tooEasyCount > tooHardCount * 2) {
            difficultyAdvice = 'increase';
        } else if (tooHardCount >= 3 && tooHardCount > tooEasyCount * 2) {
            difficultyAdvice = 'decrease';
        }

        // 分析质量反馈
        const qualityAdvice: string[] = [];
        const irrelevantCount = allNegativeTags.filter(t => t === 'irrelevant').length;
        const buggyCount = allNegativeTags.filter(t => t === 'buggy').length;

        if (irrelevantCount >= 2) {
            qualityAdvice.push('题目与学习内容关联性需加强');
        }
        if (buggyCount >= 2) {
            qualityAdvice.push('检查题目和答案的准确性');
        }

        // 分析正向反馈，保留优点
        const allPositiveTags = data.flatMap(d => d.positive_tags || []);
        const targetedCount = allPositiveTags.filter(t => t === 'targeted').length;
        const insightCount = allPositiveTags.filter(t => t === 'insight').length;

        if (targetedCount >= 3) {
            qualityAdvice.push('继续保持精准出题的优势');
        }
        if (insightCount >= 3) {
            qualityAdvice.push('继续设计启发性题目');
        }

        // 生成总结
        let summary = '';
        if (satisfactionRate >= 0.7) {
            summary = `学生反馈良好（${Math.round(satisfactionRate * 100)}%满意）`;
        } else if (satisfactionRate >= 0.4) {
            summary = `学生反馈一般，需关注改进`;
        } else {
            summary = `学生反馈较差，需要调整出题策略`;
        }

        if (difficultyAdvice === 'increase') {
            summary += '；难度可适当提升';
        } else if (difficultyAdvice === 'decrease') {
            summary += '；难度需要降低';
        }

        return {
            hasEnoughData: true,
            difficultyAdvice,
            qualityAdvice,
            summary,
        };
    } catch (err) {
        console.error('[FeedbackService] Error getting insights:', err);
        return null;
    }
}

/**
 * 将反馈洞察转换为 Prompt 格式
 * 用于直接插入到 AI 出题的 prompt 中
 */
export function formatInsightsForPrompt(insights: Awaited<ReturnType<typeof getFeedbackInsights>>): string {
    if (!insights || !insights.hasEnoughData) {
        return '';
    }

    let prompt = `
【📊 学生反馈洞察 - 请根据以下信息调整出题策略】
${insights.summary}

`;

    if (insights.difficultyAdvice !== 'maintain') {
        const advice = insights.difficultyAdvice === 'increase'
            ? '学生反馈题目太简单，请适当提高难度（增加 Medium/Hard 题目比例）'
            : '学生反馈题目太难，请降低难度（增加 Easy 题目比例，减少多步推理）';
        prompt += `⚠️ 难度调整：${advice}\n`;
    }

    if (insights.qualityAdvice.length > 0) {
        prompt += `📝 质量建议：\n`;
        insights.qualityAdvice.forEach(advice => {
            prompt += `  - ${advice}\n`;
        });
    }

    return prompt;
}

