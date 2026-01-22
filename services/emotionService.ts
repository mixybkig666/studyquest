/**
 * 情绪记录服务
 * 收集学生做题后的情绪状态，用于调整学习节奏
 */

import { supabase } from './supabaseClient';

export interface EmotionRecord {
    id?: string;
    task_id: string;
    user_id: string;
    emotion: 'happy' | 'calm' | 'tired' | 'frustrated';
    score_percentage: number;
    created_at?: string;
}

/**
 * 保存情绪记录
 */
export async function saveEmotionRecord(record: Omit<EmotionRecord, 'id' | 'created_at'>): Promise<EmotionRecord | null> {
    try {
        const { data, error } = await supabase
            .from('emotion_record')
            .insert({
                task_id: record.task_id,
                user_id: record.user_id,
                emotion: record.emotion,
                score_percentage: record.score_percentage,
            })
            .select()
            .single();

        if (error) {
            console.error('[EmotionService] Failed to save record:', error);
            return null;
        }

        console.log('[EmotionService] Record saved:', data);
        return data;
    } catch (err) {
        console.error('[EmotionService] Error saving record:', err);
        return null;
    }
}

/**
 * 获取用户最近的情绪趋势
 * 返回最近 7 天的情绪分布
 */
export async function getEmotionTrend(userId: string): Promise<{
    recentEmotions: EmotionRecord[];
    dominantEmotion: EmotionRecord['emotion'] | null;
    frustrationStreak: number;  // 连续沮丧天数
    needsLightenMode: boolean;
} | null> {
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { data, error } = await supabase
            .from('emotion_record')
            .select('*')
            .eq('user_id', userId)
            .gte('created_at', sevenDaysAgo.toISOString())
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[EmotionService] Failed to get trend:', error);
            return null;
        }

        if (!data || data.length === 0) {
            return {
                recentEmotions: [],
                dominantEmotion: null,
                frustrationStreak: 0,
                needsLightenMode: false,
            };
        }

        // 计算主导情绪
        const emotionCounts: Record<string, number> = {};
        data.forEach(r => {
            emotionCounts[r.emotion] = (emotionCounts[r.emotion] || 0) + 1;
        });

        const dominantEmotion = Object.entries(emotionCounts)
            .sort((a, b) => b[1] - a[1])[0]?.[0] as EmotionRecord['emotion'] || null;

        // 计算连续沮丧天数
        let frustrationStreak = 0;
        for (const record of data) {
            if (record.emotion === 'frustrated' || record.emotion === 'tired') {
                frustrationStreak++;
            } else {
                break;
            }
        }

        // 判断是否需要减负模式
        const needsLightenMode = frustrationStreak >= 3 ||
            (emotionCounts['frustrated'] || 0) + (emotionCounts['tired'] || 0) >= data.length * 0.6;

        return {
            recentEmotions: data,
            dominantEmotion,
            frustrationStreak,
            needsLightenMode,
        };
    } catch (err) {
        console.error('[EmotionService] Error getting trend:', err);
        return null;
    }
}

/**
 * 将情绪洞察转换为 Intent 建议
 */
export function getEmotionBasedIntent(trend: Awaited<ReturnType<typeof getEmotionTrend>>): {
    suggestedIntent: 'lighten' | 'challenge' | 'normal';
    reason: string;
} {
    if (!trend) {
        return { suggestedIntent: 'normal', reason: '无情绪数据' };
    }

    if (trend.needsLightenMode) {
        return {
            suggestedIntent: 'lighten',
            reason: `连续 ${trend.frustrationStreak} 天情绪低落，建议减轻学习负担`,
        };
    }

    if (trend.dominantEmotion === 'happy' && trend.recentEmotions.length >= 3) {
        return {
            suggestedIntent: 'challenge',
            reason: '近期情绪良好，可以尝试更有挑战的内容',
        };
    }

    return { suggestedIntent: 'normal', reason: '情绪稳定' };
}
