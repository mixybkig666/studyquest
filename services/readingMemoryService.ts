/**
 * Reading Memory Service - 阅读记忆服务
 * 
 * 记录和分析孩子的阅读历史，为 Agent 决策提供参考
 */

import { supabase } from './supabaseClient';
import { writeMemory, readMemory } from './memoryService';

// ============================================
// 类型定义
// ============================================

export interface ReadingHistory {
    totalBooks: number;
    completedBooks: number;
    inProgressBooks: number;
    totalMinutesRead: number;
    genres: string[];
    favoriteTopics: string[];
    recentBooks: Array<{
        title: string;
        status: string;
        minutesRead: number;
        lastReadAt: string;
    }>;
}

export interface ReadingInsight {
    readingLevel: 'beginner' | 'developing' | 'proficient' | 'advanced';
    interests: string[];
    strengths: string[];
    suggestions: string[];
}

// ============================================
// 核心函数
// ============================================

/**
 * 获取孩子的阅读历史 (从 daily_tasks 表获取)
 */
export async function getReadingHistory(childId: string): Promise<ReadingHistory> {
    try {
        // 从 daily_tasks 表获取阅读任务
        const { data: readingTasks, error } = await supabase
            .from('daily_tasks')
            .select('*')
            .eq('user_id', childId)
            .eq('task_type', 'reading')
            .order('task_date', { ascending: false })
            .limit(50);

        if (error) {
            console.warn('[ReadingMemory] Could not fetch reading tasks:', error);
            return getDefaultReadingHistory();
        }

        if (!readingTasks || readingTasks.length === 0) {
            return getDefaultReadingHistory();
        }

        // 分析阅读数据
        const completedTasks = readingTasks.filter(t => t.status === 'completed');
        const inProgressTasks = readingTasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
        const totalMinutes = readingTasks.reduce((sum, t) => sum + (t.actual_reading_duration || 0), 0);

        // 从 learning_material.title 提取书名
        const bookTitles = readingTasks
            .map(t => {
                const title = t.learning_material?.title || '';
                // 移除前缀如 "阅读任务："
                return title.replace(/^阅读任务[:：]/i, '').trim();
            })
            .filter(Boolean);

        // 提取书名关键词作为兴趣点
        const topics = extractTopicsFromTitles(bookTitles);

        return {
            totalBooks: readingTasks.length,
            completedBooks: completedTasks.length,
            inProgressBooks: inProgressTasks.length,
            totalMinutesRead: Math.floor(totalMinutes / 60), // 秒 -> 分
            genres: [],
            favoriteTopics: topics,
            recentBooks: readingTasks.slice(0, 5).map(t => ({
                title: (t.learning_material?.title || '未命名').replace(/^阅读任务[:：]/i, ''),
                status: t.status,
                minutesRead: Math.floor((t.actual_reading_duration || 0) / 60),
                lastReadAt: t.task_date
            }))
        };
    } catch (error) {
        console.warn('[ReadingMemory] Error in reading service:', error);
        return getDefaultReadingHistory();
    }
}

/**
 * 将阅读历史写入长期记忆
 */
export async function syncReadingToMemory(childId: string): Promise<void> {
    const history = await getReadingHistory(childId);

    // 写入稳定记忆
    await writeMemory({
        childId,
        layer: 'stable',
        key: 'reading_profile',
        content: {
            totalBooks: history.totalBooks,
            completedBooks: history.completedBooks,
            totalHoursRead: Math.round(history.totalMinutesRead / 60),
            favoriteTopics: history.favoriteTopics,
            lastSyncAt: new Date().toISOString()
        },
        confidence: 'high'
    });

    console.log('[ReadingMemory] Synced reading history to memory for child:', childId);
}

/**
 * 根据阅读历史生成洞察
 */
export function analyzeReadingProfile(history: ReadingHistory): ReadingInsight {
    // 根据阅读量判断阅读水平
    let readingLevel: ReadingInsight['readingLevel'];
    const totalBooks = history.totalBooks;
    const totalHours = history.totalMinutesRead / 60;

    if (totalBooks >= 20 || totalHours >= 50) {
        readingLevel = 'advanced';
    } else if (totalBooks >= 10 || totalHours >= 25) {
        readingLevel = 'proficient';
    } else if (totalBooks >= 5 || totalHours >= 10) {
        readingLevel = 'developing';
    } else {
        readingLevel = 'beginner';
    }

    // 生成建议
    const suggestions: string[] = [];
    if (history.completedBooks < history.inProgressBooks) {
        suggestions.push('鼓励完成正在读的书，培养坚持的习惯');
    }
    if (history.totalBooks < 5) {
        suggestions.push('可以尝试更多类型的书籍');
    }
    if (history.favoriteTopics.length > 0) {
        suggestions.push(`孩子对 ${history.favoriteTopics.slice(0, 2).join('、')} 感兴趣，可以多提供相关读物`);
    }

    return {
        readingLevel,
        interests: history.favoriteTopics,
        strengths: readingLevel === 'advanced' ? ['阅读习惯好', '阅读量大'] : [],
        suggestions
    };
}

/**
 * 获取阅读记忆摘要（给 Agent 用）
 */
export async function getReadingMemorySummary(childId: string): Promise<string> {
    const history = await getReadingHistory(childId);
    const insight = analyzeReadingProfile(history);

    if (history.totalBooks === 0) {
        return '暂无阅读记录';
    }

    const levelLabels = {
        beginner: '初级',
        developing: '发展中',
        proficient: '熟练',
        advanced: '高级'
    };

    return `阅读水平: ${levelLabels[insight.readingLevel]}, ` +
        `已读${history.totalBooks}本书, ` +
        `累计${Math.round(history.totalMinutesRead / 60)}小时, ` +
        `兴趣点: ${history.favoriteTopics.slice(0, 3).join('、') || '待发现'}`;
}

// ============================================
// 辅助函数
// ============================================

function getDefaultReadingHistory(): ReadingHistory {
    return {
        totalBooks: 0,
        completedBooks: 0,
        inProgressBooks: 0,
        totalMinutesRead: 0,
        genres: [],
        favoriteTopics: [],
        recentBooks: []
    };
}

/**
 * 从书名中提取主题关键词
 */
function extractTopicsFromTitles(titles: string[]): string[] {
    const topicKeywords: Record<string, string[]> = {
        '科幻': ['科幻', '太空', '机器人', '未来', '外星'],
        '历史': ['历史', '古代', '朝代', '战争', '三国', '西游'],
        '自然': ['自然', '动物', '植物', '地球', '海洋', '恐龙'],
        '科学': ['科学', '实验', '发明', '物理', '化学'],
        '冒险': ['冒险', '探险', '寻找', '神秘'],
        '童话': ['童话', '公主', '王子', '魔法', '精灵'],
        '文学': ['文学', '诗歌', '散文', '名著']
    };

    const foundTopics = new Set<string>();

    titles.forEach(title => {
        for (const [topic, keywords] of Object.entries(topicKeywords)) {
            if (keywords.some(kw => title.includes(kw))) {
                foundTopics.add(topic);
            }
        }
    });

    return Array.from(foundTopics);
}

export default {
    getReadingHistory,
    syncReadingToMemory,
    analyzeReadingProfile,
    getReadingMemorySummary
};
