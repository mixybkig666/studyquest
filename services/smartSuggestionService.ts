/**
 * Smart Suggestion Service - Agent 智能推荐服务
 * 
 * 实现"学点什么"功能：
 * - 基于知识图谱的智能推荐
 * - 复习薄弱点 + 学习新内容的混合
 * - 使用越久，推荐越精准
 */

import { getChildContext } from './contextService';
import { getReadingHistory, analyzeReadingProfile } from './readingMemoryService';
import { selectApplicableSkills, pickRandomSkill, gradeToAge, SkillDefinition } from './skillLibrary';
import { analyzeMaterialsAndCreatePlan } from './aiService';
import { decideTeachingIntent } from './intentService';
import { writeMemory, getMemorySummary } from './memoryService';
import { supabase } from './supabaseClient';

// ============================================
// 类型定义
// ============================================

export interface SmartSuggestionResult {
    success: boolean;
    topic?: {
        title: string;
        description: string;
        subject: string;
        skill?: string;
        basedOn: string;  // 推荐理由
        contentMix: {     // 内容配比
            reviewPercent: number;
            newPercent: number;
        };
    };
    aiResult?: any;
    agentTrace?: Array<{ step: string; result: any }>;
    error?: string;
}

interface KnowledgeStatus {
    weakPoints: Array<{ point: string; mastery: number; subject: string }>;
    strongPoints: Array<{ point: string; mastery: number; subject: string }>;
    dueForReview: Array<{ point: string; subject: string; lastReview: string }>;
    avgMastery: number;
    hasData: boolean;
}

interface ContentMix {
    reviewPercent: number;
    newPercent: number;
    strategy: 'review_focus' | 'balanced' | 'explore_focus' | 'first_time';
}

// ============================================
// 知识图谱查询
// ============================================

/**
 * 查询孩子的知识掌握状态
 */
async function queryKnowledgeStatus(childId: string): Promise<KnowledgeStatus> {
    try {
        const { data: masteryData, error } = await supabase
            .from('knowledge_mastery')
            .select('*')
            .eq('user_id', childId);

        if (error || !masteryData || masteryData.length === 0) {
            return {
                weakPoints: [],
                strongPoints: [],
                dueForReview: [],
                avgMastery: 0.5,
                hasData: false
            };
        }

        const now = new Date();

        // 分类知识点
        const weakPoints = masteryData
            .filter(m => m.mastery_level < 0.6)
            .map(m => ({ point: m.knowledge_point, mastery: m.mastery_level, subject: m.subject }))
            .sort((a, b) => a.mastery - b.mastery)
            .slice(0, 5);

        const strongPoints = masteryData
            .filter(m => m.mastery_level >= 0.75)
            .map(m => ({ point: m.knowledge_point, mastery: m.mastery_level, subject: m.subject }))
            .sort((a, b) => b.mastery - a.mastery)
            .slice(0, 5);

        const dueForReview = masteryData
            .filter(m => m.next_review_at && new Date(m.next_review_at) <= now)
            .map(m => ({ point: m.knowledge_point, subject: m.subject, lastReview: m.last_practice_at }))
            .slice(0, 5);

        const avgMastery = masteryData.reduce((sum, m) => sum + m.mastery_level, 0) / masteryData.length;

        return {
            weakPoints,
            strongPoints,
            dueForReview,
            avgMastery,
            hasData: true
        };
    } catch (error) {
        console.warn('[SmartSuggestion] queryKnowledgeStatus failed (likely no data table yet), using defaults.', error);
        return { weakPoints: [], strongPoints: [], dueForReview: [], avgMastery: 0.5, hasData: false };
    }
}

/**
 * 计算复习/新知识配比
 */
function calculateContentMix(knowledge: KnowledgeStatus): ContentMix {
    // 首次使用，无知识数据
    if (!knowledge.hasData) {
        return { reviewPercent: 20, newPercent: 80, strategy: 'first_time' };
    }

    const { avgMastery, weakPoints, dueForReview } = knowledge;
    const urgentReviewCount = weakPoints.length + dueForReview.length;

    // 有很多需要复习的点
    if (urgentReviewCount >= 5 || avgMastery < 0.5) {
        return { reviewPercent: 70, newPercent: 30, strategy: 'review_focus' };
    }

    // 中等水平
    if (avgMastery < 0.75) {
        return { reviewPercent: 50, newPercent: 50, strategy: 'balanced' };
    }

    // 掌握很好，多探索新知识
    return { reviewPercent: 30, newPercent: 70, strategy: 'explore_focus' };
}

/**
 * 选择复习主题
 */
function selectReviewTopic(knowledge: KnowledgeStatus, preferredSubject?: string): string | null {
    const candidates = [
        ...knowledge.weakPoints.map(p => ({ ...p, priority: 1 })),
        ...knowledge.dueForReview.map(p => ({ ...p, mastery: 0.5, priority: 2 }))
    ];

    if (candidates.length === 0) return null;

    // 如果有指定科目，优先选择
    if (preferredSubject) {
        const subjectCandidates = candidates.filter(c => c.subject === preferredSubject);
        if (subjectCandidates.length > 0) {
            return subjectCandidates[0].point;
        }
    }

    // 否则选择最需要复习的
    return candidates[0].point;
}

// ============================================
// 核心函数
// ============================================

/**
 * Agent 智能推荐"学点什么"
 */
export async function generateSmartSuggestion(
    childId: string,
    preferredSubject?: string,
    userTopic?: string
): Promise<SmartSuggestionResult> {
    console.log('[SmartSuggestion] Starting intelligent recommendation for child:', childId);

    const trace: SmartSuggestionResult['agentTrace'] = [];

    try {
        // ====== Step 1: 获取孩子上下文 ======
        const context = await getChildContext(childId);
        const gradeLevel = context.profile.gradeLevel || 4;
        const age = gradeToAge(gradeLevel);

        trace.push({
            step: 'get_student_context',
            result: { gradeLevel, mastery: context.masteryStats.avgMastery }
        });

        // ====== Step 2: 查询知识图谱 ======
        const knowledge = await queryKnowledgeStatus(childId);

        trace.push({
            step: 'query_knowledge_status',
            result: {
                hasData: knowledge.hasData,
                weakPointsCount: knowledge.weakPoints.length,
                dueForReviewCount: knowledge.dueForReview.length,
                avgMastery: Math.round(knowledge.avgMastery * 100) + '%'
            }
        });

        // ====== Step 3: 计算内容配比 ======
        const contentMix = calculateContentMix(knowledge);

        trace.push({
            step: 'calculate_content_mix',
            result: {
                strategy: contentMix.strategy,
                review: contentMix.reviewPercent + '%',
                new: contentMix.newPercent + '%'
            }
        });

        // ====== Step 4: 获取阅读兴趣 ======
        const readingHistory = await getReadingHistory(childId);
        const readingProfile = analyzeReadingProfile(readingHistory);

        trace.push({
            step: 'get_reading_memory',
            result: { interests: readingProfile.interests }
        });

        // ====== Step 5: 决定教学意图 ======
        const intent = await decideTeachingIntent(context);

        trace.push({
            step: 'decide_teaching_intent',
            result: { type: intent.type, reason: intent.reason }
        });

        // ====== Step 6: 智能选择主题 ======
        const reviewTopic = selectReviewTopic(knowledge, preferredSubject);
        const selectedTopic = selectTopicIntelligently(
            gradeLevel,
            preferredSubject,
            readingProfile.interests,
            contentMix,
            reviewTopic,
            knowledge.strongPoints.map(p => p.point),
            userTopic
        );

        trace.push({
            step: 'select_topic_intelligently',
            result: {
                title: selectedTopic.title,
                basedOn: selectedTopic.basedOn,
                includesReview: !!reviewTopic
            }
        });

        // ====== Step 7: 检查是否穿插能力训练 ======
        const applicableSkills = selectApplicableSkills({
            age,
            subject: selectedTopic.subject,
            mastery: context.masteryStats.avgMastery,
            emotionSignal: context.emotionSignal,
            intentType: intent.type
        });
        const skill = pickRandomSkill(applicableSkills);

        if (skill) {
            trace.push({
                step: 'select_skill',
                result: { skillName: skill.name, category: skill.category }
            });
        }

        // ====== Step 8: 构建智能指令 ======
        const instruction = buildSmartInstruction(
            selectedTopic,
            skill,
            gradeLevel,
            readingProfile.interests,
            contentMix,
            reviewTopic,
            knowledge.weakPoints.slice(0, 3).map(p => p.point)
        );

        trace.push({
            step: 'build_instruction',
            result: { instruction: instruction.substring(0, 150) + '...' }
        });

        // ====== Step 9: 调用 AI 生成内容 ======
        const aiResult = await analyzeMaterialsAndCreatePlan(
            instruction,
            [],
            gradeLevel,
            1 - context.masteryStats.recentErrorRate,
            undefined,
            {
                type: intent.type,
                questionCount: intent.questionCount,
                difficultyLevel: intent.difficultyLevel,
                focusKnowledgePoints: intent.focusKnowledgePoints,
                reason: intent.reason
            }
        );

        // ====== Step X: 动态更新标题 ======
        // 如果 AI 生成了具体标题，且原标题是 AI_GENERATED，则进行覆盖
        if (aiResult.daily_challenge?.title && selectedTopic.title === 'AI_GENERATED') {
            const newTitle = aiResult.daily_challenge.title;
            // 简单清理下可能带有的引号
            selectedTopic.title = newTitle.replace(/^["']|["']$/g, '');
            console.log('[SmartSuggestion] Updated dynamic title to:', selectedTopic.title);
        }

        trace.push({
            step: 'generate_content',
            result: {
                success: true,
                finalTitle: selectedTopic.title, // 记录最终标题
                questionsCount: aiResult.daily_challenge?.questions?.length || 0
            }
        });

        // ====== Step 10: 记录到记忆 ======
        await writeMemory({
            childId,
            layer: 'ephemeral',
            key: `smart_suggestion_${Date.now()}`,
            content: {
                topic: selectedTopic.title,
                subject: selectedTopic.subject,
                skill: skill?.name,
                strategy: contentMix.strategy,
                reviewIncluded: !!reviewTopic,
                date: new Date().toISOString().split('T')[0]
            },
            ttlDays: 7
        });

        return {
            success: true,
            topic: {
                title: selectedTopic.title,
                description: selectedTopic.description,
                subject: selectedTopic.subject,
                skill: skill?.name,
                basedOn: selectedTopic.basedOn,
                contentMix: {
                    reviewPercent: contentMix.reviewPercent,
                    newPercent: contentMix.newPercent
                }
            },
            aiResult,
            agentTrace: trace
        };

    } catch (error) {
        console.error('[SmartSuggestion] Error:', error);
        return {
            success: false,
            error: String(error),
            agentTrace: trace
        };
    }
}

// ============================================
// 辅助函数
// ============================================

// ============================================
// 辅助函数
// ============================================

// 有趣的跨学科主题
const CROSS_TOPICS = [
    { title: '恐龙灭绝的秘密', subjects: ['science', 'chinese'], description: '探索6500万年前的地球故事' },
    { title: '数学魔术', subjects: ['math'], description: '用数学原理变魔术' },
    { title: '太空探险记', subjects: ['science', 'english'], description: '跟随宇航员探索宇宙' },
    { title: '古代发明家', subjects: ['science', 'chinese'], description: '了解古人的智慧' },
    { title: '动物趣闻', subjects: ['science', 'english'], description: '有趣的动物知识' },
    { title: '时间旅行', subjects: ['chinese', 'science'], description: '如果可以穿越时空' },
    { title: '侦探推理', subjects: ['chinese', 'math'], description: '破解谜题，找出真相' },
    { title: '未来城市', subjects: ['science', 'chinese'], description: '想象100年后的世界' }
];

// ============================================
// 辅助函数
// ============================================

interface TopicSelection {
    title: string;          // 具体的标题，或者 "AI_GENERATED"
    description: string;    // 给 UI 展示的预告，或者给 Agent 的方向提示
    subject: string;
    basedOn: string;
    isDynamic: boolean;     // 标记是否由 Agent 动态生成
    promptContext?: string; // 传递给 Prompt 的额外上下文
}

function selectTopicIntelligently(
    gradeLevel: number,
    preferredSubject: string | undefined,
    interests: string[],
    contentMix: ContentMix,
    reviewTopic: string | null,
    strongPoints: string[],
    userTopic?: string
): TopicSelection {

    // 0. 用户指定主题：最高优先级
    if (userTopic && userTopic.trim()) {
        const subName = preferredSubject ? getSubjectName(preferredSubject) : '趣味';
        return {
            title: "AI_GENERATED",
            description: `关于"${userTopic}"的${subName}探索`,
            subject: preferredSubject || 'mixed',
            basedOn: '家长特别指定',
            isDynamic: true,
            promptContext: `家长特别指定了主题："${userTopic}"。请务必围绕这个主题创作内容。`
        };
    }

    // 1. 复习策略：优先处理
    if (reviewTopic && (contentMix.strategy === 'review_focus' || contentMix.strategy === 'balanced')) {
        return {
            title: `复习：${reviewTopic}`, // 这里保留具体 Title 方便 Logging，但在 Prompt 里我们会让 Agent 把这包装成故事
            description: `针对"${reviewTopic}"的专项复习与巩固`,
            subject: 'mixed',
            basedOn: '根据知识图谱识别的薄弱点',
            isDynamic: false, // 复习主题相对固定
            promptContext: `核心目标是复习"${reviewTopic}"。请将这个知识点融入到一个有趣的故事或场景中，不要生硬地出题。`
        };
    }

    // 2. 探索/进阶策略：完全由 Agent 动态生成

    // 构造 Subject (如果没指定，就是 random)
    let targetSubject = preferredSubject || 'mixed';
    if (!preferredSubject) {
        const subjects = ['math', 'chinese', 'english', 'science'];
        // 简单加权：science 和 chinese 更适合讲故事
        const weightedSubjects = [...subjects, 'science', 'chinese'];
        targetSubject = weightedSubjects[Math.floor(Math.random() * weightedSubjects.length)];
    }

    // 场景 A: 基于兴趣的探索
    if (interests && interests.length > 0 && Math.random() > 0.3) {
        // 随机选 1-2 个兴趣点
        const selectedInterests = interests.sort(() => 0.5 - Math.random()).slice(0, 2);
        return {
            title: "AI_GENERATED", // 标记由 Agent 生成
            description: `结合"${selectedInterests.join('+')}"的${getSubjectName(targetSubject)}探索`,
            subject: targetSubject,
            basedOn: `基于阅读兴趣: ${selectedInterests.join('、')}`,
            isDynamic: true,
            promptContext: `请结合孩子的兴趣"${selectedInterests.join('、')}"，构思一个富有创意的${getSubjectName(targetSubject)}学习主题。`
        };
    }

    // 场景 B: 基于强势点的进阶 (Plus)
    if (strongPoints.length > 0 && Math.random() > 0.7) {
        const strongPoint = strongPoints[Math.floor(Math.random() * strongPoints.length)];
        return {
            title: "AI_GENERATED",
            description: `基于"${strongPoint}"的进阶挑战`,
            subject: targetSubject,
            basedOn: '基于强势知识点的拓展',
            isDynamic: true,
            promptContext: `孩子已经很好地掌握了"${strongPoint}"。请设计一个更有挑战性的场景，展示这个知识点的高级应用或跨学科应用。`
        };
    }

    // 场景 C: 纯随机创意 (Open Brainstorming)
    return {
        title: "AI_GENERATED",
        description: `探索${getSubjectName(targetSubject)}的奥秘`,
        subject: targetSubject,
        basedOn: preferredSubject ? `家长指定科目` : '开放式探索',
        isDynamic: true,
        promptContext: `请发挥你的创意，在${getSubjectName(targetSubject)}领域为${gradeLevel}年级孩子设计一个最新颖、最吸引人的主题。可以是未解之谜、前沿科技、或生活中的趣味现象。`
    };
}

function getSubjectName(subject: string): string {
    const names: Record<string, string> = {
        math: '数学',
        chinese: '语文',
        english: '英语',
        science: '科学',
        mixed: '跨学科'
    };
    return names[subject] || subject;
}

function buildSmartInstruction(
    topic: TopicSelection,
    skill: SkillDefinition | null,
    gradeLevel: number,
    interests: string[],
    contentMix: ContentMix,
    reviewTopic: string | null,
    weakPoints: string[]
): string {
    let instruction = `
【任务目标】
为一名${gradeLevel}年级的小学生设计并生成今天的"每日挑战"内容。

【核心指令】
${topic.promptContext || topic.description}

【IMPORTANT: 格式要求】
必须严格遵守 JSON 格式返回，不要包含任何 "skill_type: ..." 这样的标记在 JSON 内容之外。如果你需要标记技能，请使用 "skill_tag" 字段。不要在题目文本中泄露你的 prompt 指令（如 skill_type: expression_describe）。

【IMPORTANT: 科目一致性】
${topic.subject === 'mixed' ? '这是一个跨学科主题，可以自由组合。' : `这是 ${getSubjectName(topic.subject)} (${topic.subject}) 学习内容。生成的阅读材料和题目必须与 ${getSubjectName(topic.subject)} 强相关。严禁生成其他科目的内容。`}

【要求】
1. **主题构思**：${topic.isDynamic ? '请先自主构思一个吸睛的标题（Title），要具体且有趣，不要使用 "AI_GENERATED"。' : `主题是"${topic.title}"。`}
2. **内容生成**：围绕该主题生成一篇生动的阅读材料。
   - 风格：${topic.subject === 'math' ? '生活应用/数学故事' : '故事性/探索性强'}
   - 篇幅：适中，适合10分钟阅读。
3. **知识配比**：${contentMix.newPercent}% 新知识，${contentMix.reviewPercent}% 复习内容。
`;

    if (reviewTopic) {
        instruction += `4. **复习植入**：必须巧妙融入复习知识点"${reviewTopic}"，不要生硬拼接。\n`;
    }

    if (weakPoints.length > 0 && weakPoints[0] !== reviewTopic) {
        instruction += `5. (可选) 如果情节允许，顺带回顾：${weakPoints.join('、')}。\n`;
    }

    instruction += `
6. **配套练习**：生成 **8-10 道** 对应的互动题目（选择题、填空题、判断题混合）。请确保：
   - 选择题至少要有 4 个选项 (A, B, C, D)
   - 题目难度递进（前几道简单，后几道稍难）
   - 题目与阅读材料紧密关联
   - **禁止**在阅读材料末尾添加类似"【互动练习】"、"【思考题】"这样的文字，题目会在专门的区域展示
7. **能力训练**：${skill ? `必须包含一道"${skill.name}"能力的训练题。Prompt: ${skill.promptTemplate.replace('{gradeLevel}', String(gradeLevel))}` : '无'}
`;

    return instruction;
}

export default {
    generateSmartSuggestion
};
