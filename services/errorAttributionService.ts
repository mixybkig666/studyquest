/**
 * 错题归因服务
 * 收集学生对错题原因的自我诊断，用于针对性练习设计
 */

import { supabase } from './supabaseClient';

export interface ErrorAttributionRecord {
    id?: string;
    question_id: string;
    user_id: string;
    error_type: 'concept' | 'calculation' | 'reading' | 'careless' | 'unknown';
    created_at?: string;
}

/**
 * 保存错题归因
 */
export async function saveErrorAttribution(record: Omit<ErrorAttributionRecord, 'id' | 'created_at'>): Promise<ErrorAttributionRecord | null> {
    try {
        const { data, error } = await supabase
            .from('error_attribution')
            .insert({
                question_id: record.question_id,
                user_id: record.user_id,
                error_type: record.error_type,
            })
            .select()
            .single();

        if (error) {
            console.error('[ErrorAttribution] Failed to save:', error);
            return null;
        }

        console.log('[ErrorAttribution] Saved:', data);
        return data;
    } catch (err) {
        console.error('[ErrorAttribution] Error:', err);
        return null;
    }
}

/**
 * 获取用户的错误类型分布
 * 用于分析主要错误模式
 */
export async function getErrorTypeDistribution(userId: string): Promise<{
    total: number;
    distribution: { type: string; count: number; percentage: number }[];
    dominantType: ErrorAttributionRecord['error_type'] | null;
    insights: string[];
} | null> {
    try {
        const { data, error } = await supabase
            .from('error_attribution')
            .select('error_type')
            .eq('user_id', userId);

        if (error) {
            console.error('[ErrorAttribution] Failed to get distribution:', error);
            return null;
        }

        if (!data || data.length === 0) {
            return {
                total: 0,
                distribution: [],
                dominantType: null,
                insights: [],
            };
        }

        // 计算分布
        const counts: Record<string, number> = {};
        data.forEach(r => {
            counts[r.error_type] = (counts[r.error_type] || 0) + 1;
        });

        const total = data.length;
        const distribution = Object.entries(counts)
            .map(([type, count]) => ({
                type,
                count,
                percentage: Math.round((count / total) * 100),
            }))
            .sort((a, b) => b.count - a.count);

        const dominantType = distribution[0]?.type as ErrorAttributionRecord['error_type'] || null;

        // 生成洞察
        const insights: string[] = [];
        if (dominantType) {
            const percentage = distribution[0].percentage;
            const insightMap: Record<string, string> = {
                concept: `${percentage}% 的错误是概念理解问题 → 建议多看例题和讲解`,
                calculation: `${percentage}% 的错误是计算问题 → 建议进行口算练习`,
                reading: `${percentage}% 的错误是审题问题 → 建议做题时圈画关键词`,
                careless: `${percentage}% 的错误是粗心 → 建议检查后再提交`,
                unknown: `${percentage}% 的错误原因不明 → 需要更多分析`,
            };
            insights.push(insightMap[dominantType] || '');
        }

        return {
            total,
            distribution,
            dominantType,
            insights,
        };
    } catch (err) {
        console.error('[ErrorAttribution] Error getting distribution:', err);
        return null;
    }
}

/**
 * 将错误分布转换为 Prompt 格式
 */
export function formatErrorInsightsForPrompt(
    distribution: Awaited<ReturnType<typeof getErrorTypeDistribution>>
): string {
    if (!distribution || distribution.total < 5) {
        return '';
    }

    let prompt = `
【📊 学生错误类型分析 - 请针对性设计题目】
错题分析样本：${distribution.total} 道

`;

    distribution.distribution.forEach(d => {
        const typeLabels: Record<string, string> = {
            concept: '概念不懂',
            calculation: '计算错误',
            reading: '审题不清',
            careless: '粗心大意',
            unknown: '原因不明',
        };
        prompt += `  - ${typeLabels[d.type] || d.type}：${d.percentage}%\n`;
    });

    if (distribution.dominantType === 'concept') {
        prompt += `\n⚠️ 建议：多出概念理解题，减少纯计算题\n`;
    } else if (distribution.dominantType === 'calculation') {
        prompt += `\n⚠️ 建议：增加分步骤的计算题，让学生看清计算过程\n`;
    } else if (distribution.dominantType === 'reading') {
        prompt += `\n⚠️ 建议：题目表述更清晰，关键信息突出\n`;
    } else if (distribution.dominantType === 'careless') {
        prompt += `\n⚠️ 建议：增加需要仔细检查的综合题\n`;
    }

    return prompt;
}
