/**
 * 英语单词模块 - 类型定义
 * 兼容 TypeWords 数据格式
 */

// ============================================
// 单词相关类型
// ============================================

/**
 * 单词翻译
 */
export interface WordTranslation {
    pos: string;      // 词性: n./v./adj./adv.
    meaning: string;  // 中文释义
}

/**
 * 例句
 */
export interface WordSentence {
    en: string;       // 英文
    cn: string;       // 中文
}

/**
 * 单词定义 (兼容 TypeWords 格式)
 */
export interface Word {
    id?: string;
    word: string;                      // 单词
    phonetic_us?: string;              // 美式音标
    phonetic_uk?: string;              // 英式音标
    translations: WordTranslation[];   // 翻译列表
    sentences?: WordSentence[];        // 例句
    phrases?: WordSentence[];          // 短语
    image?: string;                    // 配图 URL
    audio_us?: string;                 // 美音音频 URL
    audio_uk?: string;                 // 英音音频 URL

    // StudyQuest 扩展字段
    gradeLevel?: number;               // 适合年级
    source?: 'builtin' | 'textbook' | 'custom';  // 来源
    lesson?: string;                   // 所属课程 (如 "Unit 3")
}

// ============================================
// 词库相关类型
// ============================================

/**
 * 词库分类
 */
export type WordBookCategory = 'builtin' | 'textbook' | 'custom';

/**
 * 词库定义
 */
export interface WordBook {
    id: string;
    name: string;                      // "PEP 四年级上册"
    description?: string;
    category: WordBookCategory;
    gradeLevel?: number;
    wordCount: number;
    words: Word[];

    // 用户相关
    userId?: string;                   // 自定义词库的创建者
    createdAt?: string;

    // 学习进度 (运行时计算)
    progress?: {
        new: number;                   // 新词
        learning: number;              // 学习中
        reviewing: number;             // 复习中
        mastered: number;              // 已掌握
    };
}

/**
 * 词库元数据 (不含完整单词列表，用于列表展示)
 */
export interface WordBookMeta {
    id: string;
    name: string;
    description?: string;
    category: WordBookCategory;
    gradeLevel?: number;
    wordCount: number;
    progress?: {
        new: number;
        learning: number;
        reviewing: number;
        mastered: number;
    };
}

// ============================================
// 学习进度相关类型
// ============================================

/**
 * 单词学习状态
 */
export type WordStatus = 'new' | 'learning' | 'reviewing' | 'mastered';

/**
 * 单词学习进度
 */
export interface WordProgress {
    id?: string;
    userId: string;
    word: string;
    bookId: string;
    status: WordStatus;
    correctCount: number;              // 正确次数
    wrongCount: number;                // 错误次数
    reviewStage: number;               // 复习阶段 (1-6)
    lastPracticeAt?: Date;             // 上次练习时间
    nextReviewAt?: Date;               // 下次复习时间
    createdAt?: Date;
    updatedAt?: Date;
}

// ============================================
// 练习会话相关类型
// ============================================

/**
 * 练习模式
 */
export type PracticeMode = 'recognize' | 'spell' | 'challenge';

/**
 * 练习会话
 */
export interface PracticeSession {
    id: string;
    userId: string;
    bookId: string;
    mode: PracticeMode;
    words: Word[];                     // 本次练习的单词
    currentIndex: number;              // 当前进度
    results: PracticeResult[];         // 答题结果
    startedAt: Date;
    completedAt?: Date;
}

/**
 * 单次答题结果
 */
export interface PracticeResult {
    word: string;
    correct: boolean;
    userInput?: string;                // 用户输入
    timeSpent: number;                 // 用时(ms)
    hintsUsed: number;                 // 使用提示次数
}

/**
 * 练习小结
 */
export interface PracticeSummary {
    totalWords: number;
    correctCount: number;
    wrongCount: number;
    accuracy: number;                  // 0-1
    xpEarned: number;
    maxCombo: number;
    newWordsMastered: number;
    timeSpent: number;                 // 总用时(s)
}

// ============================================
// 工具类型
// ============================================

/**
 * 发音类型
 */
export type AccentType = 'us' | 'uk';

/**
 * 字母输入状态
 */
export type LetterStatus = 'pending' | 'correct' | 'wrong';

/**
 * 单字母状态
 */
export interface LetterState {
    char: string;
    status: LetterStatus;
    userInput?: string;
}
