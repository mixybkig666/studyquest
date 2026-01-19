/**
 * Agent Task Service - Agent + 任务生成的统一入口
 * 
 * 集成 Agent 决策到任务生成流程：
 * 1. 调用 Agent 获取教学决策
 * 2. 将决策参数传递给 aiService
 * 3. 返回生成结果 + Agent 执行记录
 */

import { runAgent, AgentResponse } from './agentCore';
import { analyzeMaterialsAndCreatePlan } from './aiService';
import type { Attachment } from '../types';
import { getChildContext } from './contextService';
import { decideTeachingIntent, TeachingIntent } from './intentService';
import { writeMemory } from './memoryService';

// ============================================
// 类型定义
// ============================================

export interface AgentTaskResult {
    success: boolean;
    aiResult?: any;
    teachingIntent?: TeachingIntent;
    agentTrace?: {
        toolCalls: Array<{
            name: string;
            params: any;
            result: any;
        }>;
        decision?: string;
    };
    error?: string;
}

interface GenerateTaskWithAgentParams {
    childId: string;
    instruction: string;
    attachments: Attachment[];
    gradeLevel: number;
}

// ============================================
// 核心函数：带 Agent 决策的任务生成
// ============================================

/**
 * 带 Agent 决策的任务生成
 * 
 * 流程：
 * 1. 获取孩子上下文
 * 2. Agent 决定教学意图
 * 3. 记录本次学习（写入记忆）
 * 4. 使用意图参数生成任务
 */
export async function generateTaskWithAgent(
    params: GenerateTaskWithAgentParams
): Promise<AgentTaskResult> {
    const { childId, instruction, attachments, gradeLevel } = params;

    console.log('[AgentTask] Starting task generation with Agent for child:', childId);

    const agentTrace: AgentTaskResult['agentTrace'] = {
        toolCalls: []
    };

    try {
        // ====== Step 1: 获取孩子上下文 ======
        console.log('[AgentTask] Step 1: Getting child context...');
        const context = await getChildContext(childId);

        agentTrace.toolCalls.push({
            name: 'get_student_context',
            params: { student_id: childId },
            result: {
                mastery: context.masteryStats.avgMastery,
                recentErrorRate: context.masteryStats.recentErrorRate,
                emotionSignal: context.emotionSignal,
                trend: context.behaviorSignals.trend
            }
        });

        // ====== Step 2: Agent 决定教学意图 ======
        console.log('[AgentTask] Step 2: Deciding teaching intent...');
        const teachingIntent = await decideTeachingIntent(context);

        agentTrace.toolCalls.push({
            name: 'decide_teaching_intent',
            params: { context_summary: `mastery=${context.masteryStats.avgMastery}` },
            result: {
                type: teachingIntent.type,
                reason: teachingIntent.reason,
                questionCount: teachingIntent.questionCount,
                difficulty: teachingIntent.difficultyLevel
            }
        });

        agentTrace.decision = teachingIntent.reason;

        // ====== Step 3: 记录本次学习主题（写入临时记忆）======
        if (instruction) {
            console.log('[AgentTask] Step 3: Writing observation to memory...');
            const topicKey = `learning_topic_${Date.now()}`;

            await writeMemory({
                childId,
                layer: 'ephemeral',
                key: topicKey,
                content: {
                    instruction: instruction.substring(0, 100),
                    attachmentCount: attachments.length,
                    intentUsed: teachingIntent.type,
                    date: new Date().toISOString().split('T')[0]
                },
                ttlDays: 7
            });

            agentTrace.toolCalls.push({
                name: 'write_observation',
                params: { layer: 'ephemeral', key: topicKey },
                result: { recorded: true }
            });
        }

        // ====== Step 4: 使用意图生成任务 ======
        console.log('[AgentTask] Step 4: Generating task with intent...');

        // 计算最近准确率（基于上下文）
        const recentAccuracy = 1 - context.masteryStats.recentErrorRate;

        // 调用 aiService，传入教学意图
        const aiResult = await analyzeMaterialsAndCreatePlan(
            instruction,
            attachments,
            gradeLevel,
            recentAccuracy,
            undefined,  // knowledgeSummary - 可选
            {           // teachingIntent
                type: teachingIntent.type,
                questionCount: teachingIntent.questionCount,
                difficultyLevel: teachingIntent.difficultyLevel,
                focusKnowledgePoints: teachingIntent.focusKnowledgePoints,
                reason: teachingIntent.reason
            }
        );

        agentTrace.toolCalls.push({
            name: 'generate_questions',
            params: {
                intent: teachingIntent.type,
                count: teachingIntent.questionCount,
                difficulty: teachingIntent.difficultyLevel
            },
            result: {
                questionsGenerated: aiResult.daily_challenge?.questions?.length || 0,
                subject: aiResult.analysis?.subject
            }
        });

        console.log('[AgentTask] Task generation completed successfully');

        return {
            success: true,
            aiResult,
            teachingIntent,
            agentTrace
        };

    } catch (error) {
        console.error('[AgentTask] Error:', error);
        return {
            success: false,
            error: String(error),
            agentTrace
        };
    }
}

/**
 * 简化版：只获取 Agent 决策（不生成任务）
 */
export async function getAgentDecision(childId: string): Promise<{
    intent: TeachingIntent | null;
    trace: AgentTaskResult['agentTrace'];
}> {
    const trace: AgentTaskResult['agentTrace'] = { toolCalls: [] };

    try {
        const context = await getChildContext(childId);

        trace.toolCalls.push({
            name: 'get_student_context',
            params: { student_id: childId },
            result: {
                mastery: context.masteryStats.avgMastery,
                emotion: context.emotionSignal
            }
        });

        const intent = await decideTeachingIntent(context);

        trace.toolCalls.push({
            name: 'decide_teaching_intent',
            params: {},
            result: intent
        });

        trace.decision = intent.reason;

        return { intent, trace };
    } catch (error) {
        console.error('[AgentTask] Decision error:', error);
        return { intent: null, trace };
    }
}

export default {
    generateTaskWithAgent,
    getAgentDecision
};
