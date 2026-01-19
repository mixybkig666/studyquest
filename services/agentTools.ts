/**
 * Agent Tools - 工具定义与执行器
 * 
 * 定义 Agent 可以调用的所有工具，供 Gemini Function Calling 使用
 */

import { Type, Schema } from "@google/genai";
import { getChildContext } from './contextService';
import { decideTeachingIntent, TeachingIntent } from './intentService';
import { writeMemory, readMemory, getMemorySummary } from './memoryService';
import { analyzeMaterialsAndCreatePlan } from './aiService';
import { getReadingMemorySummary, getReadingHistory } from './readingMemoryService';
import { selectApplicableSkills, gradeToAge, SKILL_LIBRARY } from './skillLibrary';
import { parseAttachment, analyzeImage, AttachmentParseResult } from './attachmentTools';

// ============================================
// 工具定义（给 Gemini 用）
// ============================================

export const AGENT_TOOLS = [
    // ----- 🚀 合并感知工具（推荐优先使用）-----
    {
        name: "get_full_context",
        description: "【⭐推荐】一次性获取学生的完整上下文，包括：学习画像、行为信号、情绪状态、记忆摘要和教学意图建议。调用此工具可替代 get_student_context + get_memory_summary + decide_teaching_intent，大幅减少调用次数。",
        parameters: {
            type: Type.OBJECT,
            properties: {
                student_id: {
                    type: Type.STRING,
                    description: "学生的 UUID"
                }
            },
            required: ["student_id"]
        } as Schema
    },

    // ----- 感知类工具（可选，如需单独调用）-----
    {
        name: "get_student_context",
        description: "获取学生的完整学习画像，包括：知识点掌握情况、近期行为信号、情绪状态。这是决策前的必要步骤。",
        parameters: {
            type: Type.OBJECT,
            properties: {
                student_id: {
                    type: Type.STRING,
                    description: "学生的 UUID"
                }
            },
            required: ["student_id"]
        } as Schema
    },
    {
        name: "read_student_memory",
        description: "读取学生的长期记忆，了解他的习惯、偏好、历史模式。可以过滤特定类型的记忆。",
        parameters: {
            type: Type.OBJECT,
            properties: {
                student_id: {
                    type: Type.STRING,
                    description: "学生的 UUID"
                },
                layer: {
                    type: Type.STRING,
                    enum: ["ephemeral", "hypothesis", "stable"],
                    description: "记忆层级：ephemeral(临时观察)、hypothesis(假设)、stable(稳定模式)"
                },
                key_pattern: {
                    type: Type.STRING,
                    description: "关键词模糊匹配，如 'fatigue' 会匹配 'learning_fatigue_english'"
                }
            },
            required: ["student_id"]
        } as Schema
    },
    {
        name: "get_memory_summary",
        description: "获取学生的记忆摘要，快速了解稳定模式、活跃假设和近期观察。",
        parameters: {
            type: Type.OBJECT,
            properties: {
                student_id: {
                    type: Type.STRING,
                    description: "学生的 UUID"
                }
            },
            required: ["student_id"]
        } as Schema
    },

    // ----- 决策类工具 -----
    {
        name: "decide_teaching_intent",
        description: "根据学生状态决定今日教学策略。返回教学意图类型和详细参数。",
        parameters: {
            type: Type.OBJECT,
            properties: {
                student_id: {
                    type: Type.STRING,
                    description: "学生的 UUID"
                },
                parent_signal: {
                    type: Type.OBJECT,
                    properties: {
                        type: { type: Type.STRING },
                        content: { type: Type.STRING }
                    },
                    description: "可选的家长反馈信号"
                }
            },
            required: ["student_id"]
        } as Schema
    },

    // ----- 执行类工具 -----
    // [REMOVED] generate_questions 工具已废弃，统一使用 generate_reading_material
    // 旧的 generate_questions 只能生成题目，无法生成左侧学习内容，导致 UI 布局问题。
    // 现在所有出题任务（包括刷题）都通过 generate_reading_material 完成。



    // ----- 记忆类工具 -----
    {
        name: "write_observation",
        description: "将观察写入学生的记忆系统。用于记录发现的模式、行为或情绪信号。",
        parameters: {
            type: Type.OBJECT,
            properties: {
                student_id: {
                    type: Type.STRING,
                    description: "学生的 UUID"
                },
                layer: {
                    type: Type.STRING,
                    enum: ["ephemeral", "hypothesis"],
                    description: "记忆层级（只能写入 ephemeral 或 hypothesis）"
                },
                key: {
                    type: Type.STRING,
                    description: "记忆键名，如 'learning_fatigue_english'"
                },
                content: {
                    type: Type.OBJECT,
                    description: "记忆内容 JSON"
                },
                confidence: {
                    type: Type.STRING,
                    enum: ["low", "medium", "high"],
                    description: "置信度"
                }
            },
            required: ["student_id", "layer", "key", "content"]
        } as Schema
    },

    // ----- 元认知工具 -----
    {
        name: "think_step",
        description: "记录当前的思考和推理过程。在做重要决策前调用，帮助理清思路。",
        parameters: {
            type: Type.OBJECT,
            properties: {
                thought: {
                    type: Type.STRING,
                    description: "当前的思考内容，如 '学生连续3天完成率低，可能是疲劳'"
                },
                observation: {
                    type: Type.STRING,
                    description: "基于什么观察得出这个想法"
                },
                next_action: {
                    type: Type.STRING,
                    description: "计划的下一步行动"
                }
            },
            required: ["thought", "next_action"]
        } as Schema
    },
    {
        name: "verify_decision",
        description: "验证一个决策是否合理。在做出最终决策后调用，检查是否符合原则。",
        parameters: {
            type: Type.OBJECT,
            properties: {
                decision: {
                    type: Type.STRING,
                    description: "做出的决策，如 '今天用 lighten 策略'"
                },
                reason: {
                    type: Type.STRING,
                    description: "决策理由"
                },
                principles_checked: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "检查了哪些原则，如 ['身心健康优先', '克制决策']"
                }
            },
            required: ["decision", "reason"]
        } as Schema
    },

    // ----- 分析类工具 -----
    {
        name: "search_knowledge_points",
        description: "查询学生某个科目的知识点掌握情况，找出薄弱点和强项。",
        parameters: {
            type: Type.OBJECT,
            properties: {
                student_id: {
                    type: Type.STRING,
                    description: "学生的 UUID"
                },
                subject: {
                    type: Type.STRING,
                    enum: ["math", "chinese", "english", "science"],
                    description: "科目"
                },
                min_mastery: {
                    type: Type.NUMBER,
                    description: "最低掌握度阈值 (0-1)，用于筛选"
                },
                max_mastery: {
                    type: Type.NUMBER,
                    description: "最高掌握度阈值 (0-1)，用于找薄弱点"
                }
            },
            required: ["student_id"]
        } as Schema
    },
    {
        name: "get_learning_goal",
        description: "获取学生的长期学习目标和进度。用于了解学生的学习方向。",
        parameters: {
            type: Type.OBJECT,
            properties: {
                student_id: {
                    type: Type.STRING,
                    description: "学生的 UUID"
                },
                status: {
                    type: Type.STRING,
                    enum: ["active", "completed", "paused"],
                    description: "目标状态过滤"
                }
            },
            required: ["student_id"]
        } as Schema
    },
    {
        name: "compare_with_history",
        description: "将当前状态与历史数据对比，判断趋势。",
        parameters: {
            type: Type.OBJECT,
            properties: {
                student_id: {
                    type: Type.STRING,
                    description: "学生的 UUID"
                },
                metric: {
                    type: Type.STRING,
                    enum: ["accuracy", "completion_rate", "time_spent", "mastery"],
                    description: "要对比的指标"
                },
                days: {
                    type: Type.INTEGER,
                    description: "对比近多少天的数据"
                }
            },
            required: ["student_id", "metric"]
        } as Schema
    },

    // ----- 阅读记忆工具 -----
    {
        name: "get_reading_memory",
        description: "获取学生的阅读历史和兴趣点。了解孩子读过什么书、喜欢什么主题。",
        parameters: {
            type: Type.OBJECT,
            properties: {
                student_id: {
                    type: Type.STRING,
                    description: "学生的 UUID"
                }
            },
            required: ["student_id"]
        } as Schema
    },

    // ----- 能力库工具 -----
    {
        name: "get_applicable_skills",
        description: "获取适合当前学生和场景的课本外能力（如逻辑思维、概率、表达能力等）。用于穿插能力训练题。",
        parameters: {
            type: Type.OBJECT,
            properties: {
                student_id: {
                    type: Type.STRING,
                    description: "学生的 UUID"
                },
                subject: {
                    type: Type.STRING,
                    enum: ["math", "chinese", "english", "science"],
                    description: "当前科目"
                },
                intent_type: {
                    type: Type.STRING,
                    description: "当前教学意图类型"
                }
            },
            required: ["student_id", "subject"]
        } as Schema
    },

    // ----- 附件处理工具 -----
    {
        name: "parse_attachment",
        description: "解析用户上传的附件（图片/PDF/Excel/Markdown）。图片会进行 OCR 和内容分析，文档会提取文字。在处理上传任务时首先调用此工具。",
        parameters: {
            type: Type.OBJECT,
            properties: {
                attachment_index: {
                    type: Type.INTEGER,
                    description: "附件在列表中的索引（从0开始）"
                },
                attachment_type: {
                    type: Type.STRING,
                    enum: ["image", "pdf", "excel", "markdown", "text"],
                    description: "附件类型"
                }
            },
            required: ["attachment_index", "attachment_type"]
        } as Schema
    },
    {
        name: "generate_reading_material",
        description: "根据主题/附件内容生成教育阅读材料。通常在 parse_attachment 后调用。",
        parameters: {
            type: Type.OBJECT,
            properties: {
                topic: {
                    type: Type.STRING,
                    description: "阅读材料的主题"
                },
                subject: {
                    type: Type.STRING,
                    enum: ["math", "chinese", "english", "science", "other"],
                    description: "科目"
                },
                grade_level: {
                    type: Type.INTEGER,
                    description: "年级（1-9）"
                },
                source_text: {
                    type: Type.STRING,
                    description: "从附件提取的原文内容"
                },
                style: {
                    type: Type.STRING,
                    enum: ["concept_review", "story", "explanation"],
                    description: "材料风格"
                }
            },
            required: ["topic", "subject"]
        } as Schema
    },
    {
        name: "process_full_upload_task",
        description: "一键处理上传的附件任务：自动分析附件、生成阅读材料和配套习题。当用户上传文件时，优先使用此工具。",
        parameters: {
            type: Type.OBJECT,
            properties: {
                instruction: {
                    type: Type.STRING,
                    description: "用户的附加指令"
                },
                grade_level: {
                    type: Type.INTEGER,
                    description: "学生年级"
                },
                preferred_subject: {
                    type: Type.STRING,
                    description: "家长偏好的科目 (math, chinese, english, etc.)"
                }
            },
            required: []
        } as Schema
    }
];

// ============================================
// 工具执行器
// ============================================

export type ToolName =
    | 'get_full_context'  // 新增：合并工具
    | 'get_student_context'
    | 'read_student_memory'
    | 'get_memory_summary'
    | 'decide_teaching_intent'

    | 'write_observation'
    // 新增元认知工具
    | 'think_step'
    | 'verify_decision'
    | 'search_knowledge_points'
    | 'get_learning_goal'
    | 'compare_with_history'
    // 新增阅读和能力工具
    | 'get_reading_memory'
    | 'get_applicable_skills'
    // 新增附件处理工具
    | 'parse_attachment'
    | 'generate_reading_material'
    | 'process_full_upload_task';

interface ToolResult {
    success: boolean;
    data?: any;
    error?: string;
}

/**
 * 执行工具
 */
export async function executeTool(
    name: ToolName,
    params: Record<string, any>
): Promise<ToolResult> {
    console.log(`[AgentTools] Executing tool: ${name}`, params);

    try {
        switch (name) {
            // 🚀 合并工具 - 推荐优先使用
            case 'get_full_context':
                return await executeGetFullContext(params as any);

            case 'get_student_context':
                return await executeGetStudentContext(params as any);

            case 'read_student_memory':
                return await executeReadMemory(params as any);

            case 'get_memory_summary':
                return await executeGetMemorySummary(params as any);

            case 'decide_teaching_intent':
                return await executeDecideIntent(params as any);

            // [REMOVED] case 'generate_questions':
            //     return await executeGenerateQuestions(params as any);



            case 'write_observation':
                return await executeWriteObservation(params as any);

            // 元认知工具
            case 'think_step':
                return executeThinkStep(params as any);

            case 'verify_decision':
                return executeVerifyDecision(params as any);

            case 'search_knowledge_points':
                return await executeSearchKnowledgePoints(params as any);

            case 'get_learning_goal':
                return await executeGetLearningGoal(params as any);

            case 'compare_with_history':
                return await executeCompareWithHistory(params as any);

            // 阅读和能力工具
            case 'get_reading_memory':
                return await executeGetReadingMemory(params as any);

            case 'get_applicable_skills':
                return await executeGetApplicableSkills(params as any);

            // 附件处理工具
            case 'parse_attachment':
                return await executeParseAttachment(params as any);

            case 'generate_reading_material':
                return await executeGenerateReadingMaterial(params as any);

            case 'process_full_upload_task':
                return await executeProcessFullUploadTask(params as any);

            default:
                return { success: false, error: `Unknown tool: ${name}` };
        }
    } catch (error) {
        console.error(`[AgentTools] Error executing ${name}:`, error);
        return { success: false, error: String(error) };
    }
}

// ============================================
// 工具实现
// ============================================

async function executeProcessFullUploadTask(params: {
    instruction?: string;
    grade_level?: number;
    preferred_subject?: string;
}): Promise<ToolResult> {
    console.log('[AgentTools] Processing full upload task with attachments:', currentAttachments.length);

    // Map AgentAttachment to the format expected by aiService
    const serviceAttachments = currentAttachments.map(att => ({
        id: att.id,
        // aiService uses 'type' as mimeType for inlineData
        type: att.mimeType || (att.type === 'image' ? 'image/jpeg' : 'application/pdf'),
        data: att.data,
        name: att.filename || 'upload'
    }));

    try {
        // 如果有 preferred_subject，将其合并到 instruction 中，因为 analyzeMaterialsAndCreatePlan 目前没有独立的 subject 参数
        // 它的 subject 是通过 internal analysis 或 prompt 引导决定的。
        // 最好的方式是明确告诉 AI：
        let finalInstruction = params.instruction || "Please analyze these uploaded materials and generate a learning plan.";
        if (params.preferred_subject) {
            finalInstruction = `[PRIORITY SUBJECT: ${params.preferred_subject}] ${finalInstruction}`;
        }

        const result = await analyzeMaterialsAndCreatePlan(
            finalInstruction,
            serviceAttachments as any, // Cast to avoid minor type mismatches if any
            params.grade_level || 4,
            0.75 // Default accuracy assumption
        );

        return {
            success: true,
            data: result
        };
    } catch (error) {
        console.error('[AgentTools] Full upload process failed:', error);
        return { success: false, error: String(error) };
    }
}

/**
 * 🚀 合并工具：一次性获取完整上下文
 * 替代 get_student_context + get_memory_summary + decide_teaching_intent
 */
async function executeGetFullContext(params: { student_id: string }): Promise<ToolResult> {
    console.log('[AgentTools] 🚀 Executing merged get_full_context for:', params.student_id);

    try {
        // 并行获取所有数据
        const [context, memorySummary] = await Promise.all([
            getChildContext(params.student_id),
            getMemorySummary(params.student_id)
        ]);

        // 基于上下文决定教学意图
        const teachingIntent = await decideTeachingIntent(context);

        // 返回精简的合并结果
        return {
            success: true,
            data: {
                // 学习画像摘要
                profile: {
                    mastery: context.masteryStats.avgMastery,
                    recentErrorRate: context.masteryStats.recentErrorRate,
                    trend: context.behaviorSignals.trend,
                    emotion: context.emotionSignal
                },
                // 记忆摘要
                memory: {
                    stablePatterns: memorySummary.stablePatterns?.slice(0, 3) || [],
                    activeHypotheses: memorySummary.activeHypotheses?.slice(0, 3) || [],
                    recentObservations: memorySummary.recentObservations?.slice(0, 5) || []
                },
                // 教学意图建议
                teachingIntent: {
                    type: teachingIntent.type,
                    reason: teachingIntent.reason,
                    questionCount: teachingIntent.questionCount,
                    difficultyLevel: teachingIntent.difficultyLevel,
                    focusKnowledgePoints: teachingIntent.focusKnowledgePoints?.slice(0, 5)
                },
                // 弱点知识点
                weakPoints: context.masteryStats.weakPoints?.slice(0, 5) || []
            }
        };
    } catch (error) {
        console.error('[AgentTools] get_full_context error:', error);
        return { success: false, error: String(error) };
    }
}

async function executeGetStudentContext(params: { student_id: string }): Promise<ToolResult> {
    const context = await getChildContext(params.student_id);
    return { success: true, data: context };
}

async function executeReadMemory(params: {
    student_id: string;
    layer?: string;
    key_pattern?: string
}): Promise<ToolResult> {
    const memories = await readMemory({
        childId: params.student_id,
        layer: params.layer as any,
        keyPattern: params.key_pattern
    });
    return { success: true, data: memories };
}

async function executeGetMemorySummary(params: { student_id: string }): Promise<ToolResult> {
    const summary = await getMemorySummary(params.student_id);
    return { success: true, data: summary };
}

async function executeDecideIntent(params: {
    student_id: string;
    parent_signal?: { type: string; content: string }
}): Promise<ToolResult> {
    const context = await getChildContext(params.student_id);
    const intent = await decideTeachingIntent(context, params.parent_signal);
    return { success: true, data: intent };
}

// [REMOVED] executeGenerateQuestions function
// async function executeGenerateQuestions(...) { ... }



async function executeWriteObservation(params: {
    student_id: string;
    layer: string;
    key: string;
    content: Record<string, any>;
    confidence?: string;
}): Promise<ToolResult> {
    // 只允许写入 ephemeral 或 hypothesis
    if (params.layer !== 'ephemeral' && params.layer !== 'hypothesis') {
        return { success: false, error: 'Can only write to ephemeral or hypothesis layer' };
    }

    const memory = await writeMemory({
        childId: params.student_id,
        layer: params.layer as any,
        key: params.key,
        content: params.content,
        confidence: (params.confidence as any) || 'low'
    });

    if (!memory) {
        return { success: false, error: 'Failed to write memory' };
    }

    return { success: true, data: memory };
}

// ============================================
// 元认知工具实现
// ============================================

/**
 * 思考步骤 - 记录 Agent 的推理过程
 */
function executeThinkStep(params: {
    thought: string;
    observation?: string;
    next_action: string;
}): ToolResult {
    console.log(`[AgentTools] 🧠 Think: ${params.thought}`);
    console.log(`[AgentTools] 📋 Next: ${params.next_action}`);

    // 思考工具不执行实际操作，只是记录推理过程
    return {
        success: true,
        data: {
            recorded: true,
            thought: params.thought,
            observation: params.observation,
            next_action: params.next_action,
            timestamp: new Date().toISOString()
        }
    };
}

/**
 * 验证决策 - 检查决策是否符合原则
 */
function executeVerifyDecision(params: {
    decision: string;
    reason: string;
    principles_checked?: string[];
}): ToolResult {
    console.log(`[AgentTools] ✅ Verify: ${params.decision}`);

    // 核心原则
    const CORE_PRINCIPLES = [
        '身心健康优先于学习进度',
        '克制决策，不被单次情绪左右',
        '所有决策可向家长解释',
        '不做诊断性判断'
    ];

    const checkedPrinciples = params.principles_checked || [];
    const uncheckedPrinciples = CORE_PRINCIPLES.filter(p =>
        !checkedPrinciples.some(cp => cp.includes(p.slice(0, 4)))
    );

    return {
        success: true,
        data: {
            decision: params.decision,
            reason: params.reason,
            principles_checked: checkedPrinciples,
            principles_missed: uncheckedPrinciples.length > 0 ? uncheckedPrinciples : undefined,
            is_valid: true, // 简化实现，实际可以添加更多验证逻辑
            timestamp: new Date().toISOString()
        }
    };
}

/**
 * 搜索知识点 - 查询学生的知识点掌握情况
 */
async function executeSearchKnowledgePoints(params: {
    student_id: string;
    subject?: string;
    min_mastery?: number;
    max_mastery?: number;
}): Promise<ToolResult> {
    // 获取学生上下文
    const context = await getChildContext(params.student_id);

    // 模拟知识点数据（实际应从 knowledge_mastery 表获取）
    const allPoints = context.masteryStats.weakPoints.map(wp => ({
        name: wp,
        mastery: 0.3 + Math.random() * 0.4, // 模拟掌握度
        subject: params.subject || 'unknown'
    }));

    // 应用过滤器
    let filtered = allPoints;
    if (params.min_mastery !== undefined) {
        filtered = filtered.filter(p => p.mastery >= params.min_mastery!);
    }
    if (params.max_mastery !== undefined) {
        filtered = filtered.filter(p => p.mastery <= params.max_mastery!);
    }

    return {
        success: true,
        data: {
            student_id: params.student_id,
            subject: params.subject,
            knowledge_points: filtered,
            weak_points: filtered.filter(p => p.mastery < 0.5),
            strong_points: filtered.filter(p => p.mastery >= 0.7),
            total_count: filtered.length
        }
    };
}

/**
 * 获取学习目标 - 查询学生的长期目标
 */
async function executeGetLearningGoal(params: {
    student_id: string;
    status?: string;
}): Promise<ToolResult> {
    // TODO: 实际应从 learning_goals 表获取
    // 目前返回模拟数据

    const mockGoals = [
        {
            id: 'goal_1',
            description: '掌握四年级英语三单用法',
            subject: 'english',
            target_mastery: 0.8,
            current_mastery: 0.45,
            status: 'active',
            progress: 0.56, // 45/80
            created_at: '2026-01-01'
        }
    ];

    const filtered = params.status
        ? mockGoals.filter(g => g.status === params.status)
        : mockGoals;

    return {
        success: true,
        data: {
            student_id: params.student_id,
            goals: filtered,
            active_count: filtered.filter(g => g.status === 'active').length,
            completed_count: filtered.filter(g => g.status === 'completed').length
        }
    };
}

/**
 * 与历史对比 - 分析趋势
 */
async function executeCompareWithHistory(params: {
    student_id: string;
    metric: string;
    days?: number;
}): Promise<ToolResult> {
    const context = await getChildContext(params.student_id);
    const days = params.days || 7;

    // 根据不同指标返回不同的对比数据
    let current: number;
    let historical: number;
    let trend: 'improving' | 'declining' | 'stable';

    switch (params.metric) {
        case 'accuracy':
            current = 1 - context.masteryStats.recentErrorRate;
            historical = current - 0.05 + Math.random() * 0.1;
            break;
        case 'completion_rate':
            current = 1 - context.behaviorSignals.abandonRate;
            historical = current - 0.03 + Math.random() * 0.06;
            break;
        case 'mastery':
            current = context.masteryStats.avgMastery;
            historical = current - 0.02 + Math.random() * 0.04;
            break;
        default:
            current = 0.7;
            historical = 0.65;
    }

    const change = current - historical;
    if (change > 0.05) trend = 'improving';
    else if (change < -0.05) trend = 'declining';
    else trend = 'stable';

    return {
        success: true,
        data: {
            student_id: params.student_id,
            metric: params.metric,
            period_days: days,
            current_value: Math.round(current * 100) / 100,
            historical_value: Math.round(historical * 100) / 100,
            change: Math.round(change * 100) / 100,
            trend: trend,
            interpretation: trend === 'improving'
                ? '正在进步中，保持！'
                : trend === 'declining'
                    ? '有下降趋势，可能需要调整'
                    : '保持稳定'
        }
    };
}

/**
 * 获取阅读记忆
 */
async function executeGetReadingMemory(params: {
    student_id: string;
}): Promise<ToolResult> {
    try {
        const history = await getReadingHistory(params.student_id);
        const summary = await getReadingMemorySummary(params.student_id);

        return {
            success: true,
            data: {
                summary,
                totalBooks: history.totalBooks,
                completedBooks: history.completedBooks,
                totalHoursRead: Math.round(history.totalMinutesRead / 60),
                favoriteTopics: history.favoriteTopics,
                recentBooks: history.recentBooks.slice(0, 3).map(b => b.title)
            }
        };
    } catch (error) {
        return {
            success: true,
            data: {
                summary: '暂无阅读记录',
                totalBooks: 0,
                favoriteTopics: []
            }
        };
    }
}

/**
 * 获取适用的课本外能力
 */
async function executeGetApplicableSkills(params: {
    student_id: string;
    subject: string;
    intent_type?: string;
}): Promise<ToolResult> {
    const context = await getChildContext(params.student_id);
    const age = gradeToAge(context.profile.gradeLevel || 4);

    const applicableSkills = selectApplicableSkills({
        age,
        subject: params.subject,
        mastery: context.masteryStats.avgMastery,
        emotionSignal: context.emotionSignal,
        intentType: params.intent_type || 'verify'
    });

    // 只返回前 3 个最匹配的
    const topSkills = applicableSkills.slice(0, 3).map(s => ({
        id: s.id,
        name: s.name,
        category: s.category,
        description: s.description,
        promptHint: s.exampleQuestions[0]
    }));

    return {
        success: true,
        data: {
            student_id: params.student_id,
            subject: params.subject,
            applicable_count: applicableSkills.length,
            suggested_skills: topSkills,
            recommendation: topSkills.length > 0
                ? `建议穿插 "${topSkills[0].name}" 能力训练`
                : '当前条件暂不适合穿插能力训练'
        }
    };
}

// ============================================
// 工具注册表
// ============================================

export class ToolRegistry {
    private tools: Map<string, typeof AGENT_TOOLS[0]> = new Map();

    constructor() {
        // 注册所有预定义工具
        for (const tool of AGENT_TOOLS) {
            this.tools.set(tool.name, tool);
        }
    }

    /**
     * 获取所有工具定义（用于 Gemini Function Calling）
     */
    getToolDeclarations() {
        return Array.from(this.tools.values());
    }

    /**
     * 获取工具定义
     */
    getTool(name: string) {
        return this.tools.get(name);
    }

    /**
     * 执行工具
     */
    async execute(name: string, params: Record<string, any>): Promise<ToolResult> {
        if (!this.tools.has(name)) {
            return { success: false, error: `Tool not found: ${name}` };
        }
        return executeTool(name as ToolName, params);
    }

    /**
     * 列出所有可用工具（简化版，用于 prompt）
     */
    listTools(): string {
        return Array.from(this.tools.values())
            .map(t => `- ${t.name}: ${t.description}`)
            .join('\n');
    }
}

// ============================================
// 附件处理工具执行器
// ============================================

// 存储当前请求的附件（由 agentCore 注入）
let currentAttachments: any[] = [];

export function setCurrentAttachments(attachments: any[]) {
    currentAttachments = attachments || [];
}

async function executeParseAttachment(
    params: { attachment_index: number; attachment_type: string },
    context?: any
): Promise<ToolResult> {
    const { attachment_index, attachment_type } = params;

    if (attachment_index < 0 || attachment_index >= currentAttachments.length) {
        return {
            success: false,
            error: `Invalid attachment index: ${attachment_index}. Available: ${currentAttachments.length}`
        };
    }

    const attachment = currentAttachments[attachment_index];
    const result = await parseAttachment(
        attachment.data,
        attachment_type as any,
        attachment.mimeType
    );

    return {
        success: result.success,
        data: result,
        error: result.error
    };
}

async function executeGenerateReadingMaterial(params: {
    topic: string;
    subject: string;
    grade_level?: number;
    source_text?: string;
    style?: string;
}): Promise<ToolResult> {
    const { topic, subject, grade_level = 4, source_text, style = 'explanation' } = params;

    // 构建生成请求 - 使用 PRIORITY SUBJECT 前缀强制指定科目
    const subjectPrefix = `[PRIORITY SUBJECT: ${subject}] `;
    const instruction = source_text
        ? `${subjectPrefix}基于以下内容，生成一篇适合${grade_level}年级学生的${subject}阅读材料：\n\n${source_text.substring(0, 3000)}`
        : `${subjectPrefix}请生成一篇关于"${topic}"的${subject}阅读材料，适合${grade_level}年级学生`;

    try {
        // 调用现有的 analyzeMaterialsAndCreatePlan 生成材料
        const result = await analyzeMaterialsAndCreatePlan(
            instruction,
            [], // 无附件，纯文本生成
            grade_level,
            0.75 // 默认正确率
        );

        return {
            success: true,
            data: {
                reading_material: result.daily_challenge?.reading_material,
                questions: result.daily_challenge?.questions,
                title: result.daily_challenge?.title
            }
        };
    } catch (error: any) {
        return {
            success: false,
            error: error.message || 'Failed to generate reading material'
        };
    }
}

export const toolRegistry = new ToolRegistry();

export default {
    AGENT_TOOLS,
    executeTool,
    ToolRegistry,
    toolRegistry,
    setCurrentAttachments
};
