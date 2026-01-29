import React from 'react';

interface ThinkingPredictProps {
    questionType: 'choice' | 'fill' | 'true_false' | 'short_answer' | 'correction' | 'open_ended';
    questionText: string;
    subject?: 'math' | 'chinese' | 'english' | 'science' | 'other' | 'reading';
    onSelect: (approach: ThinkingApproach) => void;
    onSkip: () => void;
}

export type ThinkingApproach =
    // 数学
    | 'add_sub'       // 加减法
    | 'mul_div'       // 乘除法
    | 'fraction'      // 分数运算
    | 'equation'      // 列方程
    | 'draw'          // 画图
    // 语文
    | 'find_keyword'  // 找关键词
    | 'context'       // 联系上下文
    | 'recall'        // 回忆背诵
    | 'understand'    // 理解含义
    // 英语
    | 'grammar'       // 语法规则
    | 'vocab'         // 单词记忆
    | 'sentence'      // 理解句意
    // 通用
    | 'reason'        // 逻辑推理
    | 'unsure';       // 不确定

interface ApproachOption {
    id: ThinkingApproach;
    emoji: string;
    label: string;
    desc: string;
}

// 根据科目返回适配的思路选项
const getApproachOptions = (subject: string): ApproachOption[] => {
    const mathOptions: ApproachOption[] = [
        { id: 'add_sub', emoji: '➕', label: '加减法', desc: '用加法或减法' },
        { id: 'mul_div', emoji: '✖️', label: '乘除法', desc: '用乘法或除法' },
        { id: 'fraction', emoji: '½', label: '分数运算', desc: '涉及分数计算' },
        { id: 'equation', emoji: '📐', label: '列方程', desc: '设未知数解方程' },
    ];

    const chineseOptions: ApproachOption[] = [
        { id: 'find_keyword', emoji: '🔍', label: '找关键词', desc: '圈出重点词句' },
        { id: 'context', emoji: '📖', label: '联系上下文', desc: '结合前后内容理解' },
        { id: 'recall', emoji: '📝', label: '回忆背诵', desc: '想想学过的内容' },
        { id: 'understand', emoji: '💡', label: '理解含义', desc: '思考作者意图' },
    ];

    const englishOptions: ApproachOption[] = [
        { id: 'grammar', emoji: '📏', label: '语法规则', desc: '用语法知识判断' },
        { id: 'vocab', emoji: '📚', label: '单词记忆', desc: '回忆单词意思' },
        { id: 'sentence', emoji: '💬', label: '理解句意', desc: '理解整句含义' },
        { id: 'recall', emoji: '🔤', label: '固定搭配', desc: '想想常用短语' },
    ];

    const scienceOptions: ApproachOption[] = [
        { id: 'reason', emoji: '🧠', label: '逻辑推理', desc: '分析因果关系' },
        { id: 'recall', emoji: '📚', label: '回忆知识', desc: '想想学过的概念' },
        { id: 'draw', emoji: '✏️', label: '画图分析', desc: '画图帮助理解' },
        { id: 'equation', emoji: '🔬', label: '套公式', desc: '用公式计算' },
    ];

    switch (subject) {
        case 'math':
            return mathOptions;
        case 'chinese':
        case 'reading':
            return chineseOptions;
        case 'english':
            return englishOptions;
        case 'science':
            return scienceOptions;
        default:
            return mathOptions; // 默认数学
    }
};

/**
 * 思路预判组件 - 答题前让学生预测解题思路
 * 改为弹窗 (Modal) 模式，避免挤占页面空间
 */
export const ThinkingPredict: React.FC<ThinkingPredictProps> = ({
    questionType,
    questionText,
    subject = 'math',
    onSelect,
    onSkip,
}) => {
    const options = getApproachOptions(subject);

    return (
        <div className="flex flex-wrap items-center gap-2 mb-6 animate-fade-in bg-blue-50/50 p-2 rounded-xl border border-blue-100">
            <span className="text-blue-600 font-bold text-sm mr-1 flex items-center gap-1">
                <span>💭</span>
                <span className="hidden sm:inline">解题思路:</span>
            </span>

            <div className="flex-1 flex flex-wrap gap-2">
                {options.map(option => (
                    <button
                        key={option.id}
                        onClick={() => onSelect(option.id)}
                        className="px-3 py-1 bg-white border border-blue-100 rounded-lg text-sm text-gray-700 hover:border-blue-400 hover:text-blue-600 hover:shadow-sm transition-all whitespace-nowrap"
                        title={option.desc}
                    >
                        {option.emoji} {option.label}
                    </button>
                ))}
                <button
                    onClick={() => onSelect('unsure')}
                    className="px-3 py-1 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:text-gray-700 hover:border-gray-400 transition-all whitespace-nowrap"
                >
                    🤔 没得思路
                </button>
            </div>
        </div>
    );
};
