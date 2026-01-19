/**
 * Skill Library - 课本外能力库
 * 
 * 定义可以穿插到练习中的"软技能"和"思维能力"
 * 这是 StudyQuest 的差异化亮点：不只是刷题，还培养思维能力
 */

// ============================================
// 能力定义
// ============================================

export type SkillCategory =
    | 'logical_thinking'    // 逻辑思维
    | 'probability'         // 概率思维
    | 'expression'          // 表达能力
    | 'critical_thinking'   // 批判性思维
    | 'creativity'          // 创造力
    | 'observation'         // 观察能力
    | 'pattern_recognition' // 模式识别
    | 'emotional_intelligence'; // 情商

export interface SkillDefinition {
    id: string;
    name: string;
    category: SkillCategory;
    description: string;
    minAge: number;          // 最低适用年龄
    maxAge: number;          // 最高适用年龄
    subjects: string[];      // 适用科目
    triggerCondition: {
        minMastery?: number;   // 最低掌握度要求
        emotionSignal?: string[];  // 适用情绪状态
        intentTypes?: string[];    // 适用意图类型
    };
    promptTemplate: string;  // 出题提示模板
    exampleQuestions: string[];
}

// ============================================
// 能力库配置
// ============================================

export const SKILL_LIBRARY: SkillDefinition[] = [
    // ----- 逻辑思维 -----
    {
        id: 'logic_sequence',
        name: '逻辑推理 - 找规律',
        category: 'logical_thinking',
        description: '通过观察数列或图形，找出其中的规律',
        minAge: 7,
        maxAge: 12,
        subjects: ['math', 'science'],
        triggerCondition: {
            minMastery: 0.6,
            intentTypes: ['challenge', 'introduce']
        },
        promptTemplate: `
      请额外生成1道逻辑推理题（找规律）：
      - 难度适合{gradeLevel}年级学生
      - 形式可以是：数列找规律、图形推理、或文字逻辑
      - 题目应有趣且能激发思考
      - 标记为 skill_type: "logic_sequence"
    `,
        exampleQuestions: [
            '2, 4, 8, 16, ？',
            '如果所有的猫都是动物，所有的动物都需要食物，那么...',
            '观察图形变化规律，下一个应该是什么？'
        ]
    },
    {
        id: 'logic_deduction',
        name: '逻辑推理 - 推断',
        category: 'logical_thinking',
        description: '根据已知信息推断结论',
        minAge: 8,
        maxAge: 12,
        subjects: ['chinese', 'science'],
        triggerCondition: {
            minMastery: 0.65,
            intentTypes: ['verify', 'challenge']
        },
        promptTemplate: `
      请额外生成1道逻辑推断题：
      - 给出一段描述，让学生推断结论
      - 适合{gradeLevel}年级理解能力
      - 标记为 skill_type: "logic_deduction"
    `,
        exampleQuestions: [
            '小明、小红、小李三人中，一个是医生，一个是老师，一个是学生。已知小明不是医生，小红不是老师...',
            '根据文章信息，你认为主人公最后会做什么选择？'
        ]
    },

    // ----- 概率思维 -----
    {
        id: 'probability_intro',
        name: '概率思维 - 可能性',
        category: 'probability',
        description: '理解"可能、不可能、一定"的概念',
        minAge: 8,
        maxAge: 10,
        subjects: ['math', 'science'],
        triggerCondition: {
            minMastery: 0.6,
            intentTypes: ['introduce', 'challenge']
        },
        promptTemplate: `
      请额外生成1道关于可能性的题目：
      - 用"一定会"、"可能会"、"不可能"等概念
      - 适合{gradeLevel}年级，用生活化场景
      - 标记为 skill_type: "probability_intro"
    `,
        exampleQuestions: [
            '从装有5个红球和3个蓝球的袋子里随机拿一个，拿到红球是"一定"还是"可能"？',
            '明天太阳会从西边升起吗？这是"可能"还是"不可能"？'
        ]
    },
    {
        id: 'probability_compare',
        name: '概率思维 - 比较可能性',
        category: 'probability',
        description: '比较不同事件发生的可能性大小',
        minAge: 9,
        maxAge: 12,
        subjects: ['math'],
        triggerCondition: {
            minMastery: 0.7,
            intentTypes: ['challenge']
        },
        promptTemplate: `
      请额外生成1道比较可能性的题目：
      - 让学生判断哪个事件更可能发生
      - 适合{gradeLevel}年级
      - 标记为 skill_type: "probability_compare"
    `,
        exampleQuestions: [
            '袋子A有2个红球8个白球，袋子B有5个红球5个白球，从哪个袋子更容易拿到红球？'
        ]
    },

    // ----- 表达能力 -----
    {
        id: 'expression_describe',
        name: '表达能力 - 描述',
        category: 'expression',
        description: '用自己的话描述一个概念或现象',
        minAge: 7,
        maxAge: 12,
        subjects: ['chinese', 'science'],
        triggerCondition: {
            minMastery: 0.5,
            emotionSignal: ['neutral', 'engaged'],
            intentTypes: ['verify', 'lighten']
        },
        promptTemplate: `
      请额外生成1道开放式表达题：
      - 让学生用自己的话描述一个概念
      - 没有标准答案，重点是表达清晰
      - 适合{gradeLevel}年级
      - 标记为 skill_type: "expression_describe"
    `,
        exampleQuestions: [
            '用你自己的话解释一下"光合作用"是什么？',
            '你觉得这首诗表达了怎样的情感？'
        ]
    },
    {
        id: 'expression_argument',
        name: '表达能力 - 论述',
        category: 'expression',
        description: '表达观点并给出理由',
        minAge: 9,
        maxAge: 12,
        subjects: ['chinese', 'english'],
        triggerCondition: {
            minMastery: 0.65,
            intentTypes: ['challenge']
        },
        promptTemplate: `
      请额外生成1道论述题：
      - 给出一个观点，让学生表示同意或反对，并说明理由
      - 适合{gradeLevel}年级语言水平
      - 标记为 skill_type: "expression_argument"
    `,
        exampleQuestions: [
            '你认为"书本比电子设备更适合学习"吗？说说你的理由。',
            'Do you think homework is helpful? Why or why not?'
        ]
    },

    // ----- 批判性思维 -----
    {
        id: 'critical_question',
        name: '批判性思维 - 质疑',
        category: 'critical_thinking',
        description: '对信息提出质疑，不盲目接受',
        minAge: 9,
        maxAge: 12,
        subjects: ['chinese', 'science'],
        triggerCondition: {
            minMastery: 0.7,
            emotionSignal: ['engaged'],
            intentTypes: ['challenge']
        },
        promptTemplate: `
      请额外生成1道批判性思维题：
      - 给出一个"看似正确"的陈述，让学生判断是否完全正确
      - 或者让学生指出一段论述中的漏洞
      - 适合{gradeLevel}年级
      - 标记为 skill_type: "critical_question"
    `,
        exampleQuestions: [
            '"所有的鸟都会飞"这句话正确吗？请说明理由。',
            '小明说"因为今天下雨了，所以明天一定会出太阳"，这个推理有问题吗？'
        ]
    },

    // ----- 观察能力 -----
    {
        id: 'observation_detail',
        name: '观察能力 - 细节',
        category: 'observation',
        description: '观察并发现细节',
        minAge: 7,
        maxAge: 10,
        subjects: ['science', 'chinese'],
        triggerCondition: {
            minMastery: 0.5,
            intentTypes: ['lighten', 'reinforce']
        },
        promptTemplate: `
      请额外生成1道观察细节题：
      - 基于文章或描述，让学生找出特定细节
      - 难度适中，适合{gradeLevel}年级
      - 标记为 skill_type: "observation_detail"
    `,
        exampleQuestions: [
            '文章中提到了几种动物？分别是什么？',
            '仔细看图片，找出三处不同。'
        ]
    },

    // ----- 模式识别 -----
    {
        id: 'pattern_math',
        name: '模式识别 - 数学规律',
        category: 'pattern_recognition',
        description: '发现数学中的模式和规律',
        minAge: 8,
        maxAge: 12,
        subjects: ['math'],
        triggerCondition: {
            minMastery: 0.65,
            intentTypes: ['verify', 'challenge']
        },
        promptTemplate: `
      请额外生成1道模式识别题：
      - 让学生发现并应用数学规律
      - 适合{gradeLevel}年级
      - 标记为 skill_type: "pattern_math"
    `,
        exampleQuestions: [
            '1+2+3+...+10等于多少？尝试找到快速计算的方法。',
            '观察：1×1=1，11×11=121，111×111=12321，那么1111×1111=？'
        ]
    },

    // ----- 情商 -----
    {
        id: 'eq_empathy',
        name: '情商 - 同理心',
        category: 'emotional_intelligence',
        description: '理解他人的感受和立场',
        minAge: 7,
        maxAge: 12,
        subjects: ['chinese'],
        triggerCondition: {
            minMastery: 0.5,
            emotionSignal: ['neutral', 'engaged'],
            intentTypes: ['lighten', 'verify']
        },
        promptTemplate: `
      请额外生成1道同理心思考题：
      - 基于故事情境，让学生思考人物的感受
      - 适合{gradeLevel}年级理解能力
      - 标记为 skill_type: "eq_empathy"
    `,
        exampleQuestions: [
            '故事中的小明失去了心爱的小狗，你觉得他现在的心情是怎样的？如果你是他的朋友，你会怎么安慰他？',
            '如果你是故事里的主人公，面对这个选择你会怎么做？为什么？'
        ]
    }
];

// ============================================
// 工具函数
// ============================================

/**
 * 根据条件筛选适合的能力
 */
export function selectApplicableSkills(params: {
    age: number;
    subject: string;
    mastery: number;
    emotionSignal: string;
    intentType: string;
}): SkillDefinition[] {
    const { age, subject, mastery, emotionSignal, intentType } = params;

    return SKILL_LIBRARY.filter(skill => {
        // 年龄检查
        if (age < skill.minAge || age > skill.maxAge) return false;

        // 科目检查
        if (!skill.subjects.includes(subject)) return false;

        // 掌握度检查
        if (skill.triggerCondition.minMastery && mastery < skill.triggerCondition.minMastery) {
            return false;
        }

        // 情绪检查
        if (skill.triggerCondition.emotionSignal &&
            !skill.triggerCondition.emotionSignal.includes(emotionSignal)) {
            return false;
        }

        // 意图类型检查
        if (skill.triggerCondition.intentTypes &&
            !skill.triggerCondition.intentTypes.includes(intentType)) {
            return false;
        }

        return true;
    });
}

/**
 * 随机选择一个能力进行穿插
 */
export function pickRandomSkill(skills: SkillDefinition[]): SkillDefinition | null {
    if (skills.length === 0) return null;

    // 随机选择
    const randomIndex = Math.floor(Math.random() * skills.length);
    return skills[randomIndex];
}

/**
 * 生成能力穿插的 prompt 片段
 */
export function generateSkillPrompt(skill: SkillDefinition, gradeLevel: number): string {
    return skill.promptTemplate.replace('{gradeLevel}', String(gradeLevel));
}

/**
 * 根据年级计算年龄
 */
export function gradeToAge(gradeLevel: number): number {
    // 小学1年级约6-7岁，以此类推
    return 5 + gradeLevel;
}

export default {
    SKILL_LIBRARY,
    selectApplicableSkills,
    pickRandomSkill,
    generateSkillPrompt,
    gradeToAge
};
