/**
 * 课本词库解析服务
 * 使用 AI 从课本图片/PDF 中提取单词生成词库
 */

import { GoogleGenAI, Type, Schema } from "@google/genai";
import type { Word, WordBook } from '../types/word';
import type { Attachment } from '../types';

// 复用 AI 配置
const AI_BASE_URL = import.meta.env.VITE_AI_BASE_URL || 'https://generativelanguage.googleapis.com';
const WORKER_API_KEY = import.meta.env.VITE_WORKER_API_KEY || '';

const ai = new GoogleGenAI({
    apiKey: import.meta.env.VITE_GEMINI_API_KEY || 'cf-worker-proxy',
    httpOptions: {
        baseUrl: AI_BASE_URL,
        headers: WORKER_API_KEY ? { 'X-API-Key': WORKER_API_KEY } : undefined
    }
});

// 词库解析结果 Schema
const WORDBOOK_SCHEMA: Schema = {
    type: Type.OBJECT,
    properties: {
        bookInfo: {
            type: Type.OBJECT,
            properties: {
                name: { type: Type.STRING },
                gradeLevel: { type: Type.NUMBER },
                unit: { type: Type.STRING },
                publisher: { type: Type.STRING }
            },
            required: ["name", "gradeLevel"]
        },
        words: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    word: { type: Type.STRING },
                    phonetic_us: { type: Type.STRING },
                    phonetic_uk: { type: Type.STRING },
                    translations: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                pos: { type: Type.STRING },
                                meaning: { type: Type.STRING }
                            },
                            required: ["pos", "meaning"]
                        }
                    },
                    sentences: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                en: { type: Type.STRING },
                                cn: { type: Type.STRING }
                            },
                            required: ["en", "cn"]
                        }
                    },
                    lesson: { type: Type.STRING }
                },
                required: ["word", "translations"]
            }
        }
    },
    required: ["bookInfo", "words"]
};

/**
 * 解析结果类型
 */
export interface TextbookParseResult {
    success: boolean;
    bookInfo?: {
        name: string;
        gradeLevel: number;
        unit?: string;
        publisher?: string;
    };
    words?: Word[];
    error?: string;
}

/**
 * 从课本图片/PDF 提取单词
 */
export async function parseTextbookForWords(
    attachments: Attachment[],
    hints?: {
        gradeLevel?: number;
        publisher?: string;  // 如 "PEP", "外研版"
        unit?: string;
    }
): Promise<TextbookParseResult> {
    if (!attachments || attachments.length === 0) {
        return { success: false, error: '请上传课本图片或PDF' };
    }

    // 分批处理配置
    const BATCH_SIZE = 1; // 每次处理 1 张图，确保响应不被截断且准确
    const chunks: Attachment[][] = [];
    for (let i = 0; i < attachments.length; i += BATCH_SIZE) {
        chunks.push(attachments.slice(i, i + BATCH_SIZE));
    }

    console.log(`📦 [TextbookParser] Split ${attachments.length} images into ${chunks.length} chunks`);

    const allWords: Word[] = [];
    let aggregatedBookInfo: TextbookParseResult['bookInfo'] = {
        name: `${hints?.gradeLevel || '4'}年级英语`,
        gradeLevel: hints?.gradeLevel || 4
    };

    // 串行处理每个分批
    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        console.log(`🔄 [TextbookParser] Processing chunk ${i + 1}/${chunks.length}...`);

        try {
            const chunkResult = await processBatch(chunk, hints, i, chunks.length);

            if (chunkResult.words) {
                allWords.push(...chunkResult.words);
            }

            // 使用第一个成功识别到的有效书籍信息
            if (chunkResult.bookInfo && (!aggregatedBookInfo?.name || aggregatedBookInfo.name.includes('英语'))) {
                aggregatedBookInfo = { ...aggregatedBookInfo, ...chunkResult.bookInfo };
            }

        } catch (error) {
            console.error(`❌ [TextbookParser] Failed to process chunk ${i + 1}:`, error);
            // 继续处理下一个分批，尽最大努力提取
        }

        // 🟢 主动节流：每处理完一批，休息 3 秒，避免连续请求触发 429
        if (i < chunks.length - 1) {
            console.log('⏳ [TextbookParser] Cooldown 3s...');
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }

    if (allWords.length === 0) {
        return {
            success: false,
            error: '未能识别到任何单词，请重试或减少单次上传数量'
        };
    }

    console.log(`✅ [TextbookParser] Total extracted: ${allWords.length} words`);

    return {
        success: true,
        bookInfo: aggregatedBookInfo,
        words: allWords
    };
}

/**
 * 清理 JSON 字符串（去除 Markdown 标记等）
 */
function cleanJsonString(text: string): string {
    let clean = text.trim();
    // 去除 markdown 代码块标记
    if (clean.startsWith('```')) {
        clean = clean.replace(/^```(json)?/, '').replace(/```$/, '');
    }
    return clean.trim();
}

/**
 * 处理单个批次的图片
 */
async function processBatch(
    chunkFiles: Attachment[],
    hints?: { gradeLevel?: number; publisher?: string; unit?: string; },
    chunkIndex?: number,
    totalChunks?: number
): Promise<TextbookParseResult> {
    try {
        const parts: any[] = [];

        // 构建 Prompt
        const prompt = `
你是一位专业的英语教材分析专家。请仔细分析上传的课本图片（第 ${chunkIndex! + 1}/${totalChunks} 批），提取其中的英语单词表。

【任务要求】
1. 识别图片中的所有英语单词
2. 为每个单词提供：
   - 准确的音标（美式/英式）
   - 词性和中文释义
   - 一个简单的例句（中英对照）
3. 识别课本信息（出版社、年级、单元等）

【用户提示】
- ${hints?.gradeLevel ? `年级: ${hints.gradeLevel}年级` : '年级: 请从图片识别'}
- ${hints?.publisher ? `出版社: ${hints.publisher}` : '出版社: 请从图片识别'}
- ${hints?.unit ? `单元: ${hints.unit}` : '单元: 请从图片识别'}

【注意事项】
- 只提取单词表中的核心词汇，忽略课文中的普通词汇
- 如果看到 "Words to learn" 或 "生词" 等标题，重点提取该区域
- 音标请使用标准 IPA 格式
- 请输出规范的 JSON 格式。`;

        parts.push({ text: prompt });

        // 添加图片
        for (const file of chunkFiles) {
            const base64Data = file.data.split(',')[1];
            if (base64Data) {
                parts.push({
                    inlineData: {
                        mimeType: file.type,
                        data: base64Data
                    }
                });
            }
        }

        // 调用 AI (支持重试)
        let response;
        let retryCount = 0;
        const MAX_RETRIES = 3;
        const INITIAL_DELAY = 5000;

        while (retryCount <= MAX_RETRIES) {
            try {
                response = await ai.models.generateContent({
                    model: 'gemini-2.0-flash',
                    contents: [{ role: 'user', parts }],
                    config: {
                        responseMimeType: 'application/json',
                        responseSchema: WORDBOOK_SCHEMA,
                        temperature: 0.3,
                    }
                });
                break; // 成功则退出循环

            } catch (error: any) {
                const isRateLimit = error.message?.includes('429') || error.status === 429 || error.code === 429;
                const isServerOverload = error.message?.includes('503') || error.status === 503;

                if ((isRateLimit || isServerOverload) && retryCount < MAX_RETRIES) {
                    retryCount++;
                    const delay = INITIAL_DELAY * Math.pow(2, retryCount - 1); // 2s, 4s, 8s
                    console.warn(`⚠️ [TextbookParser] Batch ${chunkIndex! + 1} Error ${error.status || '429'}, retrying in ${delay / 1000}s...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }
                throw error;
            }
        }

        const text = response?.text || '';
        // 清理并解析 JSON
        const cleanText = cleanJsonString(text);
        const result = JSON.parse(cleanText);

        if (!result.words) return { success: false, words: [] };

        // 规范化单词数据
        const words: Word[] = result.words.map((w: any, index: number) => ({
            id: `parsed_${Date.now()}_${chunkIndex}_${index}`,
            word: w.word?.trim() || '',
            phonetic_us: w.phonetic_us || '',
            phonetic_uk: w.phonetic_uk || w.phonetic_us || '',
            translations: w.translations || [{ pos: 'n.', meaning: w.word }],
            sentences: w.sentences || [],
            lesson: w.lesson || result.bookInfo?.unit || '',
            source: 'textbook' as const,
            gradeLevel: result.bookInfo?.gradeLevel || hints?.gradeLevel || 4
        }));

        return {
            success: true,
            bookInfo: {
                name: result.bookInfo?.name,
                gradeLevel: result.bookInfo?.gradeLevel,
                unit: result.bookInfo?.unit,
                publisher: result.bookInfo?.publisher
            },
            words
        };

    } catch (error: any) {
        console.error(`❌ [TextbookParser] Batch error:`, error);
        throw error;
    }
}

/**
 * 创建词库并保存到数据库
 */
export async function createWordBookFromParsed(
    userId: string,
    parseResult: TextbookParseResult,
    customName?: string
): Promise<{ success: boolean; bookId?: string; error?: string }> {
    if (!parseResult.success || !parseResult.words) {
        return { success: false, error: parseResult.error || '解析结果无效' };
    }

    try {
        const { supabase } = await import('./supabaseClient');

        // 1. 创建词库记录
        const bookName = customName || parseResult.bookInfo?.name || '课本词汇';
        const { data: book, error: bookError } = await supabase
            .from('word_books')
            .insert({
                user_id: userId,
                name: bookName,
                description: `从课本提取的词汇 - ${parseResult.bookInfo?.unit || ''}`,
                category: 'textbook',
                grade_level: parseResult.bookInfo?.gradeLevel || 4,
                word_count: parseResult.words.length
            })
            .select('id')
            .single();

        if (bookError) {
            console.error('Failed to create word book:', bookError);
            return { success: false, error: '保存词库失败' };
        }

        console.log(`📚 [TextbookParser] Created word book: ${book.id}`);

        // 2. 批量插入单词
        const entries = parseResult.words.map((w, index) => ({
            book_id: book.id,
            user_id: userId,
            word: w.word,
            phonetic_us: w.phonetic_us,
            phonetic_uk: w.phonetic_uk,
            translations: w.translations,
            sentences: w.sentences,
            line_number: index + 1
        }));

        const { error: entriesError } = await supabase
            .from('word_book_entries')
            .insert(entries);

        if (entriesError) {
            console.error('Failed to save words:', entriesError);
            // 即使单词保存失败，书本记录可能已存在，暂不回滚以免复杂，提示用户即可
            return { success: false, error: '词库创建成功但单词保存失败，请重试' };
        }

        console.log(`✅ [TextbookParser] Saved ${entries.length} words to book ${book.id}`);

        return {
            success: true,
            bookId: book.id
        };

    } catch (error: any) {
        console.error('❌ [TextbookParser] Save error:', error);
        return { success: false, error: error.message || '保存失败' };
    }
}

export default {
    parseTextbookForWords,
    createWordBookFromParsed
};
