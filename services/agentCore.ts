/**
 * Agent Core - Function Calling 核心循环
 * 
 * 实现 AI Agent 的核心逻辑：
 * 1. 接收用户请求
 * 2. AI 选择工具
 * 3. 执行工具
 * 4. AI 决定下一步
 * 5. 返回最终结果
 */

import { GoogleGenAI } from "@google/genai";
import agentTools, { AGENT_TOOLS, executeTool, ToolName } from './agentTools';

// ============================================
// 配置
// ============================================

const AI_BASE_URL = import.meta.env.VITE_AI_BASE_URL || 'https://api.restoremotion.xyz';
const WORKER_API_KEY = import.meta.env.VITE_WORKER_API_KEY || '';

const ai = new GoogleGenAI({
    apiKey: import.meta.env.VITE_GEMINI_API_KEY || 'cf-worker-proxy',
    httpOptions: {
        baseUrl: AI_BASE_URL,
        headers: WORKER_API_KEY ? { 'X-API-Key': WORKER_API_KEY } : undefined
    }
});

const AGENT_MODEL = 'gemini-3-flash-preview';
const MAX_TOOL_CALLS = 8; // 最大工具调用次数

// ============================================
// 类型定义
// ============================================

export interface AgentAttachment {
    id: string;
    type: 'image' | 'pdf' | 'excel' | 'markdown' | 'text';
    data: string; // base64 或 URL
    mimeType?: string;
    filename?: string;
}

export interface AgentStep {
    thought?: string;
    toolCall?: {
        name: string;
        args: any;
    };
    toolOutput?: any;
    analysis?: string;
}

export interface AgentRequest {
    studentId: string;
    task: 'decide_today' | 'generate_tasks' | 'chat' | 'process_upload';
    message?: string;
    context?: Record<string, any>;
    attachments?: AgentAttachment[];
}

export interface AgentResponse {
    success: boolean;
    result?: any;
    toolCalls?: ToolCallRecord[];
    steps?: AgentStep[];
    error?: string;
}

interface ToolCallRecord {
    name: string;
    params: Record<string, any>;
    result: any;
}

// ============================================
// Agent System Prompt
// ============================================

const AGENT_SYSTEM_PROMPT = `你是 StudyQuest 的"首席教学官"——一个长期陪伴型家庭教师 Agent。

## 你的核心职责

1. **理解学生状态**：通过工具获取学生的学习画像、记忆和行为
2. **智能决策**：决定今天的教学策略（巩固/验证/挑战/轻松）
3. **生成内容**：根据策略生成适合的练习题
4. **解释决策**：向家长清晰说明"为什么今天学这些"

## 你的核心原则（必须遵守！）

1. **身心健康优先于学习进度** - 宁可少学，不可伤害
2. **克制决策** - 不被单次情绪或家长焦虑左右
3. **可解释** - 所有决策都要能向家长说明原因
4. **不诊断** - 不做心理或医学诊断

## 工作流程 (Workflow)

你支持两种工作模式，请根据 Task Prompt 的指示灵活选择：

### 1. 高效双轨模式 (Efficient Mode) - **默认推荐**
适用于 decide_today 和 generate_tasks 任务。
1. **感知 & 决策**：调用 get_full_context 一次性获取画像、记忆和教学建议。
2. **执行**：根据建议直接调用 generate_reading_material 生成内容。

## 可用工具

### 感知与决策 (核心)
- **get_full_context**: 【推荐】一次性获取完整上下文和教学决策建议（替代旧的散装工具）。

### 感知类 (细粒度/按需)
- get_student_context: 获取学生学习画像（**通常是第一步**）
- read_student_memory: 读取学生的长期记忆
- get_memory_summary: 快速获取记忆摘要

### 分析类
- search_knowledge_points: 查询知识点掌握情况
- get_learning_goal: 获取长期学习目标
- compare_with_history: 与历史数据对比，判断趋势

### 决策类
- decide_teaching_intent: 决定今日教学策略

### 执行类
- generate_reading_material: 生成阅读材料和配套题目（**首选，内容完整**）
- process_full_upload_task: 处理上传的附件并生成任务

### 记忆类
- write_observation: 将新观察写入记忆

### 元认知类（帮助你更好地思考）
- think_step: 记录当前思考和计划的下一步
- verify_decision: 验证决策是否符合原则

## 注意事项

- **先思考再行动**：重要决策前先调用 think_step
- **每次决策要有理有据**：决策后调用 verify_decision 检查
- **如果学生状态不好，优先选择 lighten 或 pause**
- **发现新模式时，写入记忆**：调用 write_observation
- **控制工具调用次数**：5次以内完成任务`;

// ============================================
// 🚀 工具输出摘要化（减少 Context Token）
// ============================================

/**
 * 对工具输出进行摘要化，减少 Context Token 消耗
 * 超过阈值的输出会被压缩为简短摘要
 */
function summarizeToolOutput(toolName: string, result: { success: boolean; data?: any; error?: string }): any {
    if (!result.success) {
        return { error: result.error };
    }

    const data = result.data;
    const dataStr = JSON.stringify(data);
    const TOKEN_THRESHOLD = 800; // 约 800 字符 ≈ 200 tokens

    // 小输出直接返回
    if (dataStr.length <= TOKEN_THRESHOLD) {
        return data;
    }

    // 根据工具类型生成不同的摘要
    switch (toolName) {
        case 'get_full_context':
            return {
                _summarized: true,
                profile: `掌握度${data.profile?.mastery || '?'}%, 情绪${data.profile?.emotion || '正常'}, 趋势${data.profile?.trend || '稳定'}`,
                teachingIntent: data.teachingIntent ? `${data.teachingIntent.type}(${data.teachingIntent.questionCount}题, ${data.teachingIntent.difficultyLevel}难度)` : '未决定',
                weakPointsCount: data.weakPoints?.length || 0,
                memoryPatterns: data.memory?.stablePatterns?.length || 0
            };

        case 'get_student_context':
            return {
                _summarized: true,
                mastery: data.masteryStats?.avgMastery,
                errorRate: data.masteryStats?.recentErrorRate,
                emotion: data.emotionSignal,
                trend: data.behaviorSignals?.trend
            };

        case 'get_memory_summary':
            return {
                _summarized: true,
                stablePatternsCount: data.stablePatterns?.length || 0,
                activeHypothesesCount: data.activeHypotheses?.length || 0,
                recentObservationsCount: data.recentObservations?.length || 0
            };

        case 'generate_reading_material':
        case 'process_full_upload_task':
            const dc = data.daily_challenge || data;
            return {
                _summarized: true,
                title: dc.reading_material?.title || data.analysis?.subject || '已生成',
                questionsCount: dc.questions?.length || 0,
                subject: data.analysis?.subject || '未分类',
                success: true
            };

        case 'decide_teaching_intent':
            return {
                _summarized: true,
                type: data.type,
                reason: data.reason?.substring(0, 100),
                questionCount: data.questionCount,
                difficulty: data.difficultyLevel
            };

        default:
            // 通用摘要：只保留成功状态和关键字段
            return {
                _summarized: true,
                success: true,
                dataKeys: Object.keys(data || {}).slice(0, 5),
                originalLength: dataStr.length
            };
    }
}

// ============================================
// 核心函数：运行 Agent
// ============================================

/**
 * 运行 Agent 完成指定任务
 */
export async function runAgent(request: AgentRequest): Promise<AgentResponse> {
    console.log('[AgentCore] Starting agent for task:', request.task);

    // 注入附件到工具上下文
    if (request.attachments && request.attachments.length > 0) {
        agentTools.setCurrentAttachments(request.attachments);
        console.log(`[AgentCore] Injected ${request.attachments.length} attachments`);
    } else {
        agentTools.setCurrentAttachments([]);
    }

    const toolCalls: ToolCallRecord[] = [];
    let toolCallCount = 0;

    // 构建初始 prompt
    const taskPrompts: Record<AgentRequest['task'], string> = {
        // 🚀 优化后：从 4 步减少到 2 步
        decide_today: `请为学生 ${request.studentId} 决定今天的教学策略并生成任务。
${request.context?.learningPeriod ? `\n📅 **当前学期状态**：${request.context.learningPeriod === 'school' ? '上学中' : request.context.learningPeriod === 'exam_prep' ? '复习阶段' : '放假中'}` : ''}
${request.context?.effectiveMode ? `\n🎯 **生效模式**：${request.context.effectiveMode}` : ''}
${request.context?.preferredSubject ? `\n🔥 **家长特别指定科目**：${request.context.preferredSubject} (请务必优先生成该科目的内容)\n` : ''}
⭐ **高效流程（只需 2 步）**：

**第一步**：调用 get_full_context 获取学生完整上下文
- 此工具会一次性返回：学习画像、记忆摘要、教学意图建议
- get_full_context 的 teachingIntent 字段已包含 questionCount 和 difficultyLevel

**第二步**：根据 get_full_context 返回的 teachingIntent 调用 generate_reading_material 生成任务
- 使用 teachingIntent.type 决定内容风格
- 使用 teachingIntent.questionCount 决定题目数量
- 使用 teachingIntent.difficultyLevel 决定难度
- 即使意图是"刷题"，也**必须**生成知识点回顾材料（style 设为 concept_review）

🚫 **严禁调用以下工具**（会浪费 Token）：
- get_student_context（已被 get_full_context 替代）
- get_memory_summary（已被 get_full_context 替代）
- decide_teaching_intent（已被 get_full_context 替代）
- think_step（无需在此任务中记录思考）
- verify_decision（无需验证，直接执行）
- generate_questions（已废弃）

📌 **学期策略参考**：
- 上学中：轻量练习，侧重薄弱点巩固
- 复习阶段：错题专项，强化巩固
- 放假中：可增加课外扩展内容，全面成长`,

        generate_tasks: `请为学生 ${request.studentId} 生成今日学习任务。
${request.context?.learningPeriod ? `\n📅 **当前学期状态**：${request.context.learningPeriod === 'school' ? '上学中' : request.context.learningPeriod === 'exam_prep' ? '复习阶段' : '放假中'}` : ''}
${request.context?.effectiveMode ? `\n🎯 **生效模式**：${request.context.effectiveMode}` : ''}
${request.context?.preferredSubject ? `\n🔥 **家长特别指定科目**：${request.context.preferredSubject}\n` : ''}
${request.message ? `\n🔥 **家长指令**：${request.message}\n` : ''}

⭐ **高效流程（只需 2 步）**：
1. 调用 get_full_context 获取学生上下文和教学建议
2. 根据 teachingIntent 调用 generate_reading_material 生成任务

🚫 **严禁调用**：get_student_context、get_memory_summary、decide_teaching_intent、think_step、verify_decision、generate_questions`,

        chat: request.message || '请帮助这个学生',

        process_upload: `用户上传了 ${request.attachments?.length || 0} 个学习资料附件。
${request.context?.preferredSubject ? `\n🔥 **家长特别指定科目**：${request.context.preferredSubject}\n` : ''}
${request.message ? `\n🔥 **家长指令**：${request.message}\n` : ''}
${request.context?.learningDecision ? `
📋 **学习负担调度决策**：
- 当前模式：${request.context.effectiveMode}
- 资料类型：${request.context.materialType}
- 输出模式：${request.context.learningDecision.front_mode}
- 允许题目数：${request.context.learningDecision.question_count} 题
- 重点提示：${request.context.learningDecision.focus_message}

⚠️ **重要约束**：
- 如果输出模式是 no_learning，只需提取知识点存入记忆，不生成任何题目。
- 如果输出模式是 micro_reminder，只生成 1 条提醒，不生成题目。
- 如果输出模式是 feedback_only（作文），只提供评析反馈，不生成题目。
- 如果输出模式是 practice，最多生成 ${request.context.learningDecision.question_count} 道题。
` : ''}
请分析这些资料内容，为学生 ${request.studentId} 生成合适的学习任务。
步骤：
1. 调用 process_full_upload_task 工具处理附件并生成任务。
   - 务必将 parent instruction 传入 instruction 参数。
   - 务必将 preferredSubject 传入 preferred_subject 参数。

2. **必须**调用 write_observation 存储分析结果到记忆：
   - 知识点：key="knowledge_points_${Date.now()}", content={points: [...], source: "upload"}
   - 如有错题：key="error_analysis_${Date.now()}", content={errors: [...], subject: "xxx"}
   - layer 使用 "ephemeral"

3. 根据 front_mode 决定输出：
   - no_learning → 不生成题目，只返回"已记录"
   - micro_reminder → 返回 1 条简短提醒
   - feedback_only → 返回评析文本
   - practice → 返回题目

注意：不要分步调用 parse_attachment，直接使用 process_full_upload_task 即可一步完成。`
    };

    const userMessage = taskPrompts[request.task];

    // 构建多模态 parts（支持文本 + 图片）
    const userParts: any[] = [{ text: userMessage }];

    // 如果有图片附件，添加到 parts
    if (request.attachments) {
        for (const att of request.attachments) {
            if (att.type === 'image' && att.data) {
                // 提取 base64 数据（去掉 data:image/... 前缀）
                const base64Data = att.data.includes(',') ? att.data.split(',')[1] : att.data;
                const mimeType = att.mimeType || 'image/jpeg';
                userParts.push({
                    inlineData: {
                        mimeType,
                        data: base64Data
                    }
                });
                console.log(`[AgentCore] Added image attachment: ${att.filename || att.id}`);
            }
        }
    }

    // 初始化对话
    const messages: { role: string; parts: any[] }[] = [
        { role: 'user', parts: userParts }
    ];

    // 记录执行步骤
    const steps: AgentStep[] = [];

    try {
        // Function Calling 循环
        while (toolCallCount < MAX_TOOL_CALLS) {
            console.log(`[AgentCore] Iteration ${toolCallCount + 1}/${MAX_TOOL_CALLS}`);

            // 调用 AI
            const response = await ai.models.generateContent({
                model: AGENT_MODEL,
                contents: messages,
                config: {
                    temperature: 0.3,
                    systemInstruction: { parts: [{ text: AGENT_SYSTEM_PROMPT }] },
                    tools: [{ functionDeclarations: AGENT_TOOLS }]
                }
            });

            const candidate = response.candidates?.[0];
            if (!candidate) {
                return { success: false, error: 'No response from AI', toolCalls, steps };
            }

            const parts = candidate.content?.parts || [];

            // 1. 记录 AI 的思考过程 (Text Part)
            const textPart = parts.find(p => p.text);
            if (textPart?.text) {
                console.log('[AgentCore] Thought:', textPart.text.substring(0, 50) + '...');
                // 记录步骤
                steps.push({ thought: textPart.text });

                // 将思考过程添加到历史，以便 AI 记得它想了什么
                // 注意：Gemini API 有时对纯文本回复后接 FunctionCall 的处理比较敏感，
                // 但为了保持上下文，我们需要添加它。
                // 如果这是最终答案，循环会在下面终止。
            }

            // 2. 检查是否有 function call
            const functionCalls = parts.filter(p => p.functionCall).map(p => p.functionCall!);

            if (functionCalls.length > 0) {
                // AI 想调用工具 (可能一次调用多个)

                // 添加 model turn (包含 text 和 function calls)
                messages.push({
                    role: 'model',
                    parts: parts
                });

                for (const fc of functionCalls) {
                    const { name, args } = fc;
                    console.log(`[AgentCore] AI wants to call: ${name}`, args);

                    // 记录步骤: 工具调用
                    const stepIndex = steps.length;
                    steps.push({
                        toolCall: { name, args: args || {} }
                    });

                    // 执行工具
                    const toolResult = await executeTool(name as ToolName, args || {});

                    // 记录步骤: 工具输出（保留完整数据用于返回）
                    steps[stepIndex].toolOutput = toolResult.success ? toolResult.data : { error: toolResult.error };

                    // 记录工具调用记录（保留完整数据）
                    toolCalls.push({
                        name,
                        params: args || {},
                        result: toolResult.data
                    });

                    // 🚀 优化：对大输出进行摘要化，减少 context token
                    const resultForHistory = summarizeToolOutput(name, toolResult);

                    // 添加摘要后的工具执行结果到对话
                    messages.push({
                        role: 'user',
                        parts: [{
                            functionResponse: {
                                name,
                                response: resultForHistory
                            }
                        }]
                    });
                }

                toolCallCount++;

            } else if (textPart?.text) {
                // AI 返回了最终答案，且没有 Function Call
                console.log('[AgentCore] Agent completed with final answer');

                // 尝试解析 JSON 结果
                let finalResult = { answer: textPart.text };
                try {
                    const jsonMatch = textPart.text.match(/```json\n([\s\S]*?)\n```/) || textPart.text.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        finalResult = JSON.parse(jsonMatch[1] || jsonMatch[0]);
                    }
                } catch (e) {
                    // ignore
                }

                return {
                    success: true,
                    result: finalResult,
                    toolCalls,
                    steps
                };
            } else {
                // 既没有 text 也没有 function call，异常情况
                return { success: false, error: 'Empty response from AI', toolCalls, steps };
            }
        }

        // 达到最大调用次数
        console.log('[AgentCore] Reached max tool calls');
        return {
            success: true,
            result: {
                message: 'Agent completed with tool results (max steps reached)',
                toolCalls
            },
            toolCalls,
            steps
        };

    } catch (error) {
        console.error('[AgentCore] Error:', error);
        return {
            success: false,
            error: String(error),
            toolCalls,
            steps
        };
    }
}

// ============================================
// 便捷函数
// ============================================

/**
 * 为学生获取今日决策
 */
export async function decideTodayIntent(studentId: string): Promise<AgentResponse> {
    return runAgent({
        studentId,
        task: 'decide_today'
    });
}

/**
 * 为学生生成任务
 */
export async function generateStudentTasks(studentId: string): Promise<AgentResponse> {
    return runAgent({
        studentId,
        task: 'generate_tasks'
    });
}

export default {
    runAgent,
    decideTodayIntent,
    generateStudentTasks
};
