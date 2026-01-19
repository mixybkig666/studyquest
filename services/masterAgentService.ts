/**
 * Master Agent Service - 智能教学决策中枢
 * 
 * 职责：
 * 1. 获取孩子学习上下文
 * 2. 决定今日教学意图 (Teaching Intent)
 * 3. 调用出题系统生成题目
 * 4. 生成家长简报
 */

import { supabase } from './supabaseClient';
import { decideTeachingIntent, TeachingIntent, ChildContext } from './intentService';
import { getChildContext } from './contextService';
import { analyzeMaterialsAndCreatePlan } from './aiService';
import { Attachment } from '../types';

// ============================================
// 类型定义
// ============================================

export interface MasterAgentInput {
    childId: string;
    date?: string; // 默认今天
    parentSignal?: {
        type: string;
        content: string;
    };
    forceIntent?: TeachingIntent['type']; // 强制指定意图（调试用）
}

export interface ParentSummary {
    headline: string;    // 一句话总结
    insight: string;     // 深度洞察
    action: string;      // 可执行建议
}

export interface MasterAgentOutput {
    teachingIntent: TeachingIntent;
    parentSummary: ParentSummary;
    childMessage?: string;
    context: ChildContext;
}

// ============================================
// 主入口函数
// ============================================

/**
 * 运行 Master Agent 决策流程
 * 
 * @param input - 输入参数，包含孩子 ID 和可选的家长信号
 * @returns 教学意图、家长简报等输出
 */
export async function runMasterAgent(input: MasterAgentInput): Promise<MasterAgentOutput> {
    console.log('[MasterAgent] Starting decision process for child:', input.childId);

    // Step 1: 获取孩子学习上下文
    const context = await getChildContext(input.childId);
    console.log('[MasterAgent] Context loaded:', {
        avgMastery: context.masteryStats.avgMastery,
        emotionSignal: context.emotionSignal,
        behaviorTrend: context.behaviorSignals.trend
    });

    // Step 2: 决定 Teaching Intent
    let intent: TeachingIntent;
    if (input.forceIntent) {
        // 调试模式：强制使用指定意图
        intent = {
            type: input.forceIntent,
            reason: '手动指定的教学意图',
            focusKnowledgePoints: context.masteryStats.weakPoints.slice(0, 2),
            questionCount: 5,
            difficultyLevel: 'medium'
        };
    } else {
        intent = await decideTeachingIntent(context, input.parentSignal);
    }
    console.log('[MasterAgent] Intent decided:', intent.type, '-', intent.reason);

    // Step 3: 生成家长简报
    const parentSummary = generateParentSummary(context, intent);

    // Step 4: 生成给孩子的话
    const childMessage = generateChildMessage(intent);

    // Step 5: 保存今日决策到数据库
    await saveTeachingIntent(input.childId, intent, parentSummary, childMessage);

    return {
        teachingIntent: intent,
        parentSummary,
        childMessage,
        context
    };
}

// ============================================
// 获取今日已保存的教学意图
// ============================================

export async function getTodayIntent(childId: string): Promise<MasterAgentOutput | null> {
    try {
        const { data, error } = await supabase.rpc('get_today_intent', {
            p_child_id: childId
        });

        if (error || !data) {
            return null;
        }

        return {
            teachingIntent: {
                type: data.intent_type,
                reason: data.decision_reason,
                focusKnowledgePoints: data.focus_knowledge_points || [],
                questionCount: data.question_count,
                difficultyLevel: data.difficulty_level
            },
            parentSummary: {
                headline: data.parent_headline || '',
                insight: data.parent_insight || '',
                action: data.parent_action || ''
            },
            childMessage: data.child_message,
            context: {} as ChildContext // 简化返回
        };
    } catch (e) {
        console.error('[MasterAgent] Failed to get today intent:', e);
        return null;
    }
}

// ============================================
// 内部函数
// ============================================

/**
 * 生成家长简报
 */
function generateParentSummary(context: ChildContext, intent: TeachingIntent): ParentSummary {
    const childName = context.profile.name || '孩子';

    // 根据不同意图生成不同的简报
    const summaryTemplates: Record<TeachingIntent['type'], () => ParentSummary> = {
        reinforce: () => ({
            headline: `今天${childName}主要在巩固薄弱知识点`,
            insight: `近期错误集中在 ${intent.focusKnowledgePoints.slice(0, 2).join('、') || '部分知识点'}，正在稳步提升中。`,
            action: `晚饭后可以问问${childName}今天学了什么，让他用自己的话解释一下。`
        }),
        verify: () => ({
            headline: `今天进行验证检测，看看是否真的掌握`,
            insight: `${childName}最近表现不错，今天用几道题确认一下是否真正理解。`,
            action: `如果今天全对，可以给个小奖励；如果有错，说明还需要再练习。`
        }),
        challenge: () => ({
            headline: `今天是挑战模式！💪`,
            insight: `${childName}基础扎实，今天尝试更有难度的题目，培养高阶思维。`,
            action: `挑战题目错了也没关系，这是成长的过程。记得多鼓励！`
        }),
        lighten: () => ({
            headline: `今天轻松一点，保持学习连接`,
            insight: `系统检测到最近学习强度较大，今天降低难度和题量，让${childName}保持好状态。`,
            action: `不用额外布置作业，让${childName}休息一下，明天继续加油。`
        }),
        introduce: () => ({
            headline: `今天引入新知识点`,
            insight: `${childName}对现有内容掌握良好，今天开始学习新的内容。`,
            action: `新知识需要时间消化，今晚可以问问${childName}有没有不懂的地方。`
        }),
        pause: () => ({
            headline: `今天暂停学习任务`,
            insight: `系统检测到${childName}可能需要休息调整，今天不安排学习任务。`,
            action: `多陪陪${childName}，聊聊天，了解一下最近的状态。学习可以等，身心健康最重要。`
        })
    };

    return summaryTemplates[intent.type]();
}

/**
 * 生成给孩子的话
 */
function generateChildMessage(intent: TeachingIntent): string {
    const messageTemplates: Record<TeachingIntent['type'], string[]> = {
        reinforce: [
            '今天我们来复习一下，把不太熟的地方再练练！',
            '复习时间到！把学过的知识巩固一下吧～',
            '今天的题目你之前见过类似的，应该没问题！'
        ],
        verify: [
            '来测试一下，看看你是不是真的学会了！',
            '今天来个小检测，相信你可以的！',
            '考验时刻！展示你的实力吧～'
        ],
        challenge: [
            '今天有几道挑战题，勇敢尝试吧！💪',
            '挑战模式开启！错了也没关系，重要的是尝试！',
            '来点有难度的！相信你能搞定！'
        ],
        lighten: [
            '今天轻松一点，做几道简单的就好～',
            '休息也是学习的一部分，今天放松一下！',
            '今天题目不多，快速搞定然后去玩吧！'
        ],
        introduce: [
            '今天学点新东西！保持好奇心～',
            '新知识来啦！慢慢来，不着急～',
            '准备好学习新内容了吗？Let\'s go!'
        ],
        pause: [
            '今天休息一下，不安排任务啦～',
            '学累了就歇歇，明天继续加油！',
            '今天是休息日，好好放松！'
        ]
    };

    const templates = messageTemplates[intent.type];
    return templates[Math.floor(Math.random() * templates.length)];
}

/**
 * 保存今日教学意图到数据库
 */
async function saveTeachingIntent(
    childId: string,
    intent: TeachingIntent,
    parentSummary: ParentSummary,
    childMessage: string
): Promise<void> {
    try {
        const { error } = await supabase.rpc('save_teaching_intent', {
            p_child_id: childId,
            p_intent_type: intent.type,
            p_decision_context: {},
            p_decision_reason: intent.reason,
            p_question_count: intent.questionCount,
            p_difficulty_level: intent.difficultyLevel,
            p_focus_points: intent.focusKnowledgePoints,
            p_parent_headline: parentSummary.headline,
            p_parent_insight: parentSummary.insight,
            p_parent_action: parentSummary.action,
            p_child_message: childMessage
        });

        if (error) {
            console.error('[MasterAgent] Failed to save intent:', error);
        }
    } catch (e) {
        console.error('[MasterAgent] Save intent error:', e);
    }
}

export default {
    runMasterAgent,
    getTodayIntent,
    generateTasksWithIntent
};

// ============================================
// 整合函数：Master Agent + 出题
// ============================================

export interface GenerateTasksInput {
    childId: string;
    instruction?: string;          // 家长指令
    attachments: Attachment[];     // 学习材料
    gradeLevel?: number;
    parentSignal?: {
        type: string;
        content: string;
    };
}

export interface GenerateTasksOutput extends MasterAgentOutput {
    generatedContent?: any;        // AI 生成的题目和材料
}

/**
 * 完整流程：Master Agent 决策 + AI 出题
 * 
 * 这是外部调用的主入口，整合了：
 * 1. Master Agent 分析孩子状态
 * 2. 决定教学意图
 * 3. 调用 aiService 生成适配的题目
 */
export async function generateTasksWithIntent(input: GenerateTasksInput): Promise<GenerateTasksOutput> {
    console.log('[MasterAgent] === Starting Full Pipeline ===');

    // Step 1: 运行 Master Agent 决策
    const agentOutput = await runMasterAgent({
        childId: input.childId,
        parentSignal: input.parentSignal
    });

    const { teachingIntent, parentSummary, childMessage, context } = agentOutput;

    // Step 2: 如果是 pause 意图，不生成题目
    if (teachingIntent.type === 'pause') {
        console.log('[MasterAgent] Intent is PAUSE, skipping question generation.');
        return {
            ...agentOutput,
            generatedContent: null
        };
    }

    // Step 3: 调用 aiService 生成题目
    console.log('[MasterAgent] Calling aiService with intent:', teachingIntent.type);

    try {
        const generatedContent = await analyzeMaterialsAndCreatePlan(
            input.instruction || '',
            input.attachments,
            input.gradeLevel || context.profile.gradeLevel || 4,
            1 - context.masteryStats.recentErrorRate, // 转换为 accuracy
            undefined, // knowledgeSummary
            {
                type: teachingIntent.type,
                questionCount: teachingIntent.questionCount,
                difficultyLevel: teachingIntent.difficultyLevel,
                focusKnowledgePoints: teachingIntent.focusKnowledgePoints,
                reason: teachingIntent.reason
            }
        );

        console.log('[MasterAgent] === Pipeline Complete ===');
        console.log('[MasterAgent] Questions generated:', generatedContent?.questions?.length || 0);

        return {
            teachingIntent,
            parentSummary,
            childMessage,
            context,
            generatedContent
        };
    } catch (error) {
        console.error('[MasterAgent] aiService error:', error);
        return {
            ...agentOutput,
            generatedContent: null
        };
    }
}
