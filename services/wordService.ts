/**
 * 英语单词学习服务
 * 提供词库管理、学习进度追踪、智能复习等功能
 */

import { supabase } from './supabaseClient';
import type {
    Word,
    WordBook,
    WordBookMeta,
    WordProgress,
    WordStatus,
    PracticeSession,
    PracticeSummary,
} from '../types/word';

// 内置词库
import primary3 from '../data/wordbooks/primary_3.json';
import primary4 from '../data/wordbooks/primary_4.json';

// ============================================
// 内置词库管理
// ============================================

const BUILTIN_WORDBOOKS: WordBook[] = [
    primary3 as WordBook,
    primary4 as WordBook,
];

/**
 * 获取所有可用词库（内置 + 用户自定义）
 */
export async function getWordBooks(userId?: string): Promise<WordBookMeta[]> {
    // 1. 内置词库
    const builtinMetas: WordBookMeta[] = BUILTIN_WORDBOOKS.map(book => ({
        id: book.id,
        name: book.name,
        description: book.description,
        category: book.category,
        gradeLevel: book.gradeLevel,
        wordCount: book.words.length,
    }));

    // 2. 如果有用户 ID，获取用户进度
    if (userId) {
        for (const meta of builtinMetas) {
            meta.progress = await getBookProgress(userId, meta.id);
        }

        // 3. 获取用户自定义词库
        try {
            const { data: customBooks } = await supabase
                .from('word_books')
                .select('id, name, description, category, grade_level, word_count')
                .eq('user_id', userId);

            if (customBooks) {
                for (const book of customBooks) {
                    builtinMetas.push({
                        id: book.id,
                        name: book.name,
                        description: book.description,
                        category: book.category as any,
                        gradeLevel: book.grade_level,
                        wordCount: book.word_count,
                        progress: await getBookProgress(userId, book.id),
                    });
                }
            }
        } catch (err) {
            console.warn('[WordService] Failed to fetch custom books:', err);
        }
    }

    return builtinMetas;
}

/**
 * 获取词库详情（含完整单词列表）
 */
export function getWordBookById(bookId: string): WordBook | null {
    return BUILTIN_WORDBOOKS.find(b => b.id === bookId) || null;
}

/**
 * 获取词库学习进度
 */
async function getBookProgress(userId: string, bookId: string): Promise<WordBookMeta['progress']> {
    try {
        const { data } = await supabase
            .from('word_progress')
            .select('status')
            .eq('user_id', userId)
            .eq('book_id', bookId);

        if (!data) return { new: 0, learning: 0, reviewing: 0, mastered: 0 };

        const counts = { new: 0, learning: 0, reviewing: 0, mastered: 0 };
        data.forEach(p => {
            if (p.status in counts) {
                counts[p.status as WordStatus]++;
            }
        });

        return counts;
    } catch {
        return { new: 0, learning: 0, reviewing: 0, mastered: 0 };
    }
}

// ============================================
// 练习单词获取
// ============================================

/**
 * 获取练习单词
 * 智能混合：需要复习的词 + 新词
 */
export async function getWordsForPractice(
    userId: string,
    bookId: string,
    count: number = 10
): Promise<Word[]> {
    let bookWords: Word[] = [];
    const builtinBook = getWordBookById(bookId);

    if (builtinBook) {
        bookWords = builtinBook.words;
    } else {
        // 尝试从数据库获取自定义词库的单词
        const { data: entries } = await supabase
            .from('word_book_entries')
            .select('*')
            .eq('book_id', bookId)
            .order('line_number');

        if (entries && entries.length > 0) {
            bookWords = entries.map(e => ({
                id: e.id,
                word: e.word,
                phonetic_us: e.phonetic_us,
                phonetic_uk: e.phonetic_uk,
                translations: e.translations,
                sentences: e.sentences || [],
                lesson: '',
                source: 'textbook',
                gradeLevel: 4
            }));
        }
    }

    if (bookWords.length === 0) return [];

    const now = new Date();
    const result: Word[] = [];

    try {
        // 1. 获取需要复习的单词（next_review_at <= now）
        const { data: reviewWords } = await supabase
            .from('word_progress')
            .select('word')
            .eq('user_id', userId)
            .eq('book_id', bookId)
            .lte('next_review_at', now.toISOString())
            .neq('status', 'mastered')
            .limit(Math.floor(count * 0.6));  // 60% 复习词

        const reviewWordSet = new Set(reviewWords?.map(w => w.word) || []);

        // 添加复习词
        for (const word of bookWords) {
            if (reviewWordSet.has(word.word) && result.length < count) {
                result.push(word);
            }
        }

        // 2. 获取已学过的单词（排除）
        const { data: learnedWords } = await supabase
            .from('word_progress')
            .select('word')
            .eq('user_id', userId)
            .eq('book_id', bookId);

        const learnedSet = new Set(learnedWords?.map(w => w.word) || []);

        // 3. 补充新词
        for (const word of bookWords) {
            if (!learnedSet.has(word.word) && result.length < count) {
                result.push(word);
            }
        }

        // 4. 如果还不够，随机补充
        if (result.length < count) {
            const remaining = bookWords.filter(w => !result.some(r => r.word === w.word));
            const shuffled = remaining.sort(() => Math.random() - 0.5);
            result.push(...shuffled.slice(0, count - result.length));
        }

    } catch (err) {
        console.warn('[WordService] Failed to get smart words, using random:', err);
        // 降级：随机选择
        const shuffled = [...bookWords].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, count);
    }

    // 打乱顺序
    return result.sort(() => Math.random() - 0.5);
}

// ============================================
// 学习进度记录
// ============================================

/**
 * 记录答题结果
 */
export async function recordAnswer(
    userId: string,
    word: string,
    bookId: string,
    correct: boolean
): Promise<void> {
    try {
        // 检查是否已有记录
        const { data: existing } = await supabase
            .from('word_progress')
            .select('*')
            .eq('user_id', userId)
            .eq('word', word)
            .eq('book_id', bookId)
            .maybeSingle();

        if (existing) {
            // 更新现有记录
            const newCorrect = existing.correct_count + (correct ? 1 : 0);
            const newWrong = existing.wrong_count + (correct ? 0 : 1);
            const { newStage, nextReview } = calculateNextReview(
                existing.review_stage,
                correct
            );

            await supabase
                .from('word_progress')
                .update({
                    correct_count: newCorrect,
                    wrong_count: newWrong,
                    review_stage: newStage,
                    status: newStage >= 6 ? 'mastered' : newStage > 0 ? 'reviewing' : 'learning',
                    last_practice_at: new Date().toISOString(),
                    next_review_at: nextReview.toISOString(),
                })
                .eq('id', existing.id);
        } else {
            // 创建新记录
            const { newStage, nextReview } = calculateNextReview(0, correct);

            await supabase
                .from('word_progress')
                .insert({
                    user_id: userId,
                    word,
                    book_id: bookId,
                    correct_count: correct ? 1 : 0,
                    wrong_count: correct ? 0 : 1,
                    review_stage: newStage,
                    status: 'learning',
                    last_practice_at: new Date().toISOString(),
                    next_review_at: nextReview.toISOString(),
                });
        }
    } catch (err) {
        console.error('[WordService] Failed to record answer:', err);
    }
}

/**
 * 计算下次复习时间 (SM-2 简化版)
 */
function calculateNextReview(
    currentStage: number,
    correct: boolean
): { newStage: number; nextReview: Date } {
    const now = new Date();

    // 复习间隔（天）
    const intervals = [1, 2, 4, 7, 14, 30];

    let newStage = currentStage;

    if (correct) {
        // 答对：进入下一阶段
        newStage = Math.min(currentStage + 1, 6);
    } else {
        // 答错：回退一个阶段
        newStage = Math.max(currentStage - 1, 0);
    }

    const days = intervals[Math.min(newStage, intervals.length - 1)];
    const nextReview = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    return { newStage, nextReview };
}

// ============================================
// 错词本
// ============================================

/**
 * 获取错词列表
 */
export async function getWrongWords(userId: string, bookId?: string): Promise<Word[]> {
    try {
        let query = supabase
            .from('word_progress')
            .select('word, book_id, wrong_count')
            .eq('user_id', userId)
            .gt('wrong_count', 0)
            .order('wrong_count', { ascending: false })
            .limit(50);

        if (bookId) {
            query = query.eq('book_id', bookId);
        }

        const { data } = await query;
        if (!data) return [];

        // 查找完整单词信息
        const result: Word[] = [];
        for (const item of data) {
            const book = getWordBookById(item.book_id);
            if (book) {
                // 内置词库
                const word = book.words.find(w => w.word === item.word);
                if (word) {
                    result.push(word);
                }
            } else {
                // 自定义词库，查表
                const { data: entry } = await supabase
                    .from('word_book_entries')
                    .select('*')
                    .eq('book_id', item.book_id)
                    .eq('word', item.word)
                    .maybeSingle();

                if (entry) {
                    result.push({
                        id: entry.id,
                        word: entry.word,
                        phonetic_us: entry.phonetic_us,
                        phonetic_uk: entry.phonetic_uk,
                        translations: entry.translations,
                        sentences: entry.sentences || [],
                        lesson: '',
                        source: 'textbook',
                        gradeLevel: 4
                    });
                }
            }
        }

        return result;
    } catch (err) {
        console.error('[WordService] Failed to get wrong words:', err);
        return [];
    }
}

// ============================================
// 统计数据
// ============================================

/**
 * 获取今日学习统计
 */
export async function getTodayStats(userId: string): Promise<{
    wordsLearned: number;
    correctRate: number;
    streak: number;
}> {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { data } = await supabase
            .from('word_progress')
            .select('correct_count, wrong_count')
            .eq('user_id', userId)
            .gte('last_practice_at', today.toISOString());

        if (!data || data.length === 0) {
            return { wordsLearned: 0, correctRate: 0, streak: 0 };
        }

        const totalCorrect = data.reduce((sum, p) => sum + p.correct_count, 0);
        const totalWrong = data.reduce((sum, p) => sum + p.wrong_count, 0);
        const total = totalCorrect + totalWrong;

        return {
            wordsLearned: data.length,
            correctRate: total > 0 ? totalCorrect / total : 0,
            streak: 0, // TODO: 实现连续天数计算
        };
    } catch {
        return { wordsLearned: 0, correctRate: 0, streak: 0 };
    }
}

/**
 * 计算练习小结
 */
export function calculateSummary(results: { word: string; correct: boolean }[]): PracticeSummary {
    const correctCount = results.filter(r => r.correct).length;
    const wrongCount = results.length - correctCount;

    // 计算最大连击
    let maxCombo = 0;
    let currentCombo = 0;
    for (const r of results) {
        if (r.correct) {
            currentCombo++;
            maxCombo = Math.max(maxCombo, currentCombo);
        } else {
            currentCombo = 0;
        }
    }

    // 计算 XP
    const baseXp = correctCount * 5;
    const comboBonus = maxCombo >= 5 ? 10 : maxCombo >= 3 ? 5 : 0;
    const xpEarned = baseXp + comboBonus;

    return {
        totalWords: results.length,
        correctCount,
        wrongCount,
        accuracy: results.length > 0 ? correctCount / results.length : 0,
        xpEarned,
        maxCombo,
        newWordsMastered: 0, // TODO: 实际计算
        timeSpent: 0, // TODO: 实际计算
    };
}

// ============================================
// 导出
// ============================================

export const wordService = {
    getWordBooks,
    getWordBookById,
    getWordsForPractice,
    recordAnswer,
    getWrongWords,
    getTodayStats,
    calculateSummary,
};

export default wordService;
