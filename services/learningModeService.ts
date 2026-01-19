/**
 * Learning Mode Service - 学习负担调度系统
 * 
 * 核心职责：
 * 1. 判断当前生效模式（时期 + 日期）
 * 2. 根据资料类型 + 模式 决定处理策略
 * 3. 提供全局约束规则
 */

import {
    LearningPeriod,
    MaterialType,
    EffectiveMode,
    FrontMode,
    LearningDecision
} from '../types';

// ============================================
// 中国法定节假日（2024-2026 常见假期）
// 实际使用时应该从后端获取或使用节假日 API
// ============================================

const CHINESE_HOLIDAYS_2024 = [
    '2024-01-01', // 元旦
    '2024-02-10', '2024-02-11', '2024-02-12', '2024-02-13', '2024-02-14', '2024-02-15', '2024-02-16', '2024-02-17', // 春节
    '2024-04-04', '2024-04-05', '2024-04-06', // 清明
    '2024-05-01', '2024-05-02', '2024-05-03', '2024-05-04', '2024-05-05', // 劳动节
    '2024-06-08', '2024-06-09', '2024-06-10', // 端午
    '2024-09-15', '2024-09-16', '2024-09-17', // 中秋
    '2024-10-01', '2024-10-02', '2024-10-03', '2024-10-04', '2024-10-05', '2024-10-06', '2024-10-07', // 国庆
];

const CHINESE_HOLIDAYS_2025 = [
    '2025-01-01', // 元旦
    '2025-01-28', '2025-01-29', '2025-01-30', '2025-01-31', '2025-02-01', '2025-02-02', '2025-02-03', '2025-02-04', // 春节
    '2025-04-04', '2025-04-05', '2025-04-06', // 清明
    '2025-05-01', '2025-05-02', '2025-05-03', '2025-05-04', '2025-05-05', // 劳动节
    '2025-05-31', '2025-06-01', '2025-06-02', // 端午
    '2025-10-01', '2025-10-02', '2025-10-03', '2025-10-04', '2025-10-05', '2025-10-06', '2025-10-07', // 国庆 + 中秋
];

const CHINESE_HOLIDAYS_2026 = [
    '2026-01-01', '2026-01-02', '2026-01-03', // 元旦
    '2026-02-17', '2026-02-18', '2026-02-19', '2026-02-20', '2026-02-21', '2026-02-22', '2026-02-23', // 春节
    '2026-04-05', '2026-04-06', '2026-04-07', // 清明
    '2026-05-01', '2026-05-02', '2026-05-03', '2026-05-04', '2026-05-05', // 劳动节
    '2026-06-19', '2026-06-20', '2026-06-21', // 端午
    '2026-09-25', '2026-09-26', '2026-09-27', // 中秋
    '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07', // 国庆
];

const ALL_HOLIDAYS = new Set([
    ...CHINESE_HOLIDAYS_2024,
    ...CHINESE_HOLIDAYS_2025,
    ...CHINESE_HOLIDAYS_2026,
]);

// ============================================
// 全局约束规则
// ============================================

export const GLOBAL_CONSTRAINTS = {
    /** 禁止词（任何模式都不能使用） */
    FORBIDDEN_WORDS: ['测试', '考核', '评估', '排名', '正确率', '对比', '再来一题', '继续挑战'],

    /** 日常轻量模式约束 */
    DAILY_LIGHT: {
        maxInteractionMinutes: 3,
        maxConsecutiveQuestions: 3,
        allowNewKnowledge: false,
    },

    /** 复习模式约束 */
    EXAM_PREP: {
        maxPracticeMinutes: 15,
        questionRange: { min: 6, max: 12 },
        mustGroupByErrorType: true,
    },

    /** 假期模式约束 */
    VACATION: {
        enforceAlternatingIntensity: true,
        lightDay: { maxQuestions: 10 },
        deepDay: { maxQuestions: 15, maxExtensions: 1 },
    },
};

// ============================================
// 核心函数
// ============================================

/**
 * 检查是否为中国法定节假日
 */
export function isChineseHoliday(date: Date): boolean {
    const dateStr = date.toISOString().split('T')[0];
    return ALL_HOLIDAYS.has(dateStr);
}

/**
 * 检查是否为周末
 */
export function isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6;
}

/**
 * 根据家长设置的时期 + 当前日期，计算生效模式
 */
export function getEffectiveMode(
    period: LearningPeriod,
    date: Date = new Date()
): EffectiveMode {
    // 复习期和假期不受日期影响
    if (period === 'exam_prep') return 'exam_prep';
    if (period === 'vacation') return 'vacation';

    // 上学期：周末和节假日自动切换
    if (isWeekend(date) || isChineseHoliday(date)) {
        return 'weekend_review';
    }

    return 'daily_light';
}

/**
 * 根据孩子掌握情况动态计算题目数量
 * @param baseCount 基础题目数（来自决策矩阵）
 * @param masteryLevel 孩子整体掌握程度 (0-1)
 * @param recentErrorRate 最近错误率 (0-1)
 * @param mode 当前模式
 */
export function getDynamicQuestionCount(
    baseCount: number,
    masteryLevel: number = 0.7,
    recentErrorRate: number = 0.2,
    mode: EffectiveMode
): number {
    if (baseCount === 0) return 0; // no_learning/micro_reminder/feedback_only 模式

    // 获取模式约束
    const constraints = mode === 'exam_prep'
        ? GLOBAL_CONSTRAINTS.EXAM_PREP.questionRange
        : mode === 'vacation'
            ? { min: 10, max: 15 }
            : { min: 3, max: 8 }; // weekend_review 默认

    // 计算调整因子
    // - 掌握度高 → 减少题目（节省时间）
    // - 错误率高 → 增加题目（需要巩固）
    const masteryFactor = 1 - (masteryLevel * 0.3); // 0.7-1.0 → 0.79-0.7
    const errorFactor = 1 + (recentErrorRate * 0.5);  // 0-0.5 → 1.0-1.25

    const adjustedCount = Math.round(baseCount * masteryFactor * errorFactor);

    // 限制在范围内
    return Math.max(constraints.min, Math.min(constraints.max, adjustedCount));
}

/**
 * 根据资料类型 + 生效模式，决定处理策略
 */
export function getLearningDecision(
    materialType: MaterialType,
    effectiveMode: EffectiveMode
): LearningDecision {
    // 决策矩阵
    const matrix: Record<MaterialType, Record<EffectiveMode, Partial<LearningDecision>>> = {
        'completed_exam': {
            'daily_light': { front_mode: 'micro_reminder', question_count: 0, focus_message: '已分析错题，存入记忆' },
            'weekend_review': { front_mode: 'practice', question_count: 8, focus_message: '根据错题生成巩固练习' },
            'exam_prep': { front_mode: 'practice', question_count: 12, focus_message: '错题专项强化' },
            'vacation': { front_mode: 'practice', question_count: 15, focus_message: '系统性错题复习' },
        },
        'blank_exam': {
            'daily_light': { front_mode: 'no_learning', question_count: 0, focus_message: '已整理知识点，先完成试卷' },
            'weekend_review': { front_mode: 'practice', question_count: 5, focus_message: '知识点预热练习' },
            'exam_prep': { front_mode: 'practice', question_count: 10, focus_message: '模拟练习' },
            'vacation': { front_mode: 'practice', question_count: 12, focus_message: '完整模拟训练' },
        },
        'completed_homework': {
            'daily_light': { front_mode: 'no_learning', question_count: 0, focus_message: '作业完成，今日学习已结束' },
            'weekend_review': { front_mode: 'practice', question_count: 5, focus_message: '作业错题巩固' },
            'exam_prep': { front_mode: 'practice', question_count: 8, focus_message: '薄弱点强化' },
            'vacation': { front_mode: 'practice', question_count: 10, focus_message: '知识点拓展' },
        },
        'blank_homework': {
            'daily_light': { front_mode: 'no_learning', question_count: 0, focus_message: '请先完成作业' },
            'weekend_review': { front_mode: 'practice', question_count: 5, focus_message: '知识点练习' },
            'exam_prep': { front_mode: 'practice', question_count: 10, focus_message: '专项练习' },
            'vacation': { front_mode: 'practice', question_count: 15, focus_message: '完整练习' },
        },
        'essay_prompt': {
            'daily_light': { front_mode: 'feedback_only', question_count: 0, focus_message: '作文审题解析 + 范文参考' },
            'weekend_review': { front_mode: 'feedback_only', question_count: 0, focus_message: '作文审题解析 + 范文参考' },
            'exam_prep': { front_mode: 'feedback_only', question_count: 0, focus_message: '作文审题 + 范文 + 写作建议' },
            'vacation': { front_mode: 'feedback_only', question_count: 0, focus_message: '深度解析 + 多角度范文' },
        },
        'student_essay': {
            'daily_light': { front_mode: 'feedback_only', question_count: 0, focus_message: '作文评析：亮点 + 改进建议' },
            'weekend_review': { front_mode: 'feedback_only', question_count: 0, focus_message: '作文评析 + 修改示范' },
            'exam_prep': { front_mode: 'feedback_only', question_count: 0, focus_message: '详细评析 + 升格示范' },
            'vacation': { front_mode: 'feedback_only', question_count: 0, focus_message: '深度评析 + 建议重写' },
        },
        'textbook_notes': {
            'daily_light': { front_mode: 'no_learning', question_count: 0, focus_message: '知识点已存档' },
            'weekend_review': { front_mode: 'practice', question_count: 5, focus_message: '知识点理解题' },
            'exam_prep': { front_mode: 'practice', question_count: 10, focus_message: '知识点深化练习' },
            'vacation': { front_mode: 'practice', question_count: 12, focus_message: '系统性练习' },
        },
        'review_summary': {
            'daily_light': { front_mode: 'no_learning', question_count: 0, focus_message: '复习资料已存档，周末使用' },
            'weekend_review': { front_mode: 'practice', question_count: 8, focus_message: '复习巩固练习' },
            'exam_prep': { front_mode: 'practice', question_count: 12, focus_message: '全面复习练习' },
            'vacation': { front_mode: 'practice', question_count: 15, focus_message: '深度复习 + 拓展' },
        },
    };

    const decision = matrix[materialType]?.[effectiveMode] || {
        front_mode: 'no_learning',
        question_count: 0,
        focus_message: '已记录',
    };

    return {
        front_mode: decision.front_mode || 'no_learning',
        question_count: decision.question_count || 0,
        should_save_to_memory: true,
        focus_message: decision.focus_message || '',
    };
}

/**
 * 获取模式的中文名称
 */
export function getModeName(mode: EffectiveMode): string {
    const names: Record<EffectiveMode, string> = {
        'daily_light': '日常轻量',
        'weekend_review': '周末整理',
        'exam_prep': '复习备考',
        'vacation': '假期深度',
    };
    return names[mode] || mode;
}

/**
 * 获取时期的中文名称
 */
export function getPeriodName(period: LearningPeriod): string {
    const names: Record<LearningPeriod, string> = {
        'school': '上学期',
        'exam_prep': '复习期',
        'vacation': '放假中',
    };
    return names[period] || period;
}

/**
 * 校验输出是否符合约束
 */
export function validateOutput(
    text: string,
    questionCount: number,
    mode: EffectiveMode
): { valid: boolean; violations: string[] } {
    const violations: string[] = [];

    // 检查禁止词
    for (const word of GLOBAL_CONSTRAINTS.FORBIDDEN_WORDS) {
        if (text.includes(word)) {
            violations.push(`禁止词: "${word}"`);
        }
    }

    // 检查题量约束
    if (mode === 'daily_light' && questionCount > GLOBAL_CONSTRAINTS.DAILY_LIGHT.maxConsecutiveQuestions) {
        violations.push(`日常模式题目超过 ${GLOBAL_CONSTRAINTS.DAILY_LIGHT.maxConsecutiveQuestions} 道`);
    }

    if (mode === 'exam_prep' && questionCount > GLOBAL_CONSTRAINTS.EXAM_PREP.questionRange.max) {
        violations.push(`复习模式题目超过 ${GLOBAL_CONSTRAINTS.EXAM_PREP.questionRange.max} 道`);
    }

    return { valid: violations.length === 0, violations };
}

// ============================================
// 周末整理数据获取
// ============================================

import { supabase } from './supabaseClient';
import { WeeklyReviewSummary } from '../types';

/**
 * 获取周末学习整理摘要
 * 区分：本周新增薄弱点 vs 上周遗留未掌握项
 */
export async function getWeeklyReviewSummary(userId: string): Promise<WeeklyReviewSummary> {
    // 计算本周开始日期（周一）
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - daysToMonday);
    weekStart.setHours(0, 0, 0, 0);
    const weekStartStr = weekStart.toISOString();

    // 计算上周开始日期
    const lastWeekStart = new Date(weekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekStartStr = lastWeekStart.toISOString();

    // 1. 获取本周错题
    const { data: thisWeekErrors } = await supabase
        .from('answer_records')
        .select(`*, question:questions(*)`)
        .eq('user_id', userId)
        .eq('is_correct', false)
        .gte('created_at', weekStartStr)
        .order('created_at', { ascending: false });

    // 2. 获取上周错题（用于判断carryover）
    const { data: lastWeekErrors } = await supabase
        .from('answer_records')
        .select(`*, question:questions(*)`)
        .eq('user_id', userId)
        .eq('is_correct', false)
        .gte('created_at', lastWeekStartStr)
        .lt('created_at', weekStartStr);

    // 3. 聚合本周错题（标记 is_new）
    const lastWeekKPs = new Set(
        (lastWeekErrors || []).map((r: any) =>
            r.question?.knowledge_point || r.question?.topic || '未分类'
        )
    );

    const thisWeekKPs: Record<string, { count: number; lastDate: string; isNew: boolean }> = {};
    (thisWeekErrors || []).forEach((record: any) => {
        const kp = record.question?.knowledge_point ||
            record.question?.topic ||
            record.question?.question_text?.substring(0, 15) ||
            '未分类问题';

        if (!thisWeekKPs[kp]) {
            thisWeekKPs[kp] = {
                count: 0,
                lastDate: record.created_at,
                isNew: !lastWeekKPs.has(kp) // 上周没出错 = 本周新增
            };
        }
        thisWeekKPs[kp].count += 1;
        if (record.created_at > thisWeekKPs[kp].lastDate) {
            thisWeekKPs[kp].lastDate = record.created_at;
        }
    });

    // 4. 识别 carryover 项（上周出错 + 本周**也**出错 = 持续未掌握）
    const carryoverKPs: Record<string, { weeksUnmastered: number; lastDate: string }> = {};
    (lastWeekErrors || []).forEach((record: any) => {
        const kp = record.question?.knowledge_point || record.question?.topic || '未分类';
        // 如果本周也出错了，说明是 carryover
        if (thisWeekKPs[kp]) {
            if (!carryoverKPs[kp]) {
                carryoverKPs[kp] = { weeksUnmastered: 2, lastDate: thisWeekKPs[kp].lastDate };
            }
        }
    });

    // 5. 转换为数组
    const weak_points = Object.entries(thisWeekKPs)
        .map(([kp, data]) => ({
            knowledge_point: kp,
            error_count: data.count,
            last_error_date: data.lastDate,
            is_new: data.isNew
        }))
        .sort((a, b) => b.error_count - a.error_count)
        .slice(0, 5);

    const carryover_points = Object.entries(carryoverKPs)
        .map(([kp, data]) => ({
            knowledge_point: kp,
            weeks_unmastered: data.weeksUnmastered,
            last_error_date: data.lastDate
        }))
        .slice(0, 3); // 最多 3 个 carryover

    // 6. 获取本周完成任务数
    const { count: taskCount } = await supabase
        .from('daily_tasks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'completed')
        .gte('created_at', weekStartStr);

    // 7. 计算建议练习时长（carryover 权重更高）
    const suggestedMinutes = Math.min(45, Math.max(10,
        weak_points.length * 5 + carryover_points.length * 8
    ));

    return {
        weak_points,
        carryover_points,
        total_tasks_completed: taskCount || 0,
        suggested_practice_minutes: suggestedMinutes
    };
}


