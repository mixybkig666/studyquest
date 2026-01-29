import React, { useState } from 'react';

interface SmartFollowUpProps {
    questionText: string;
    subject?: string;
    onSelect: (response: FollowUpResponse) => void;
    onSkip: () => void;
}

export type FollowUpResponse =
    | 'no_method'      // 不知道用什么方法
    | 'calc_error'     // 方法对了，算错了
    | 'not_understand' // 题目没看懂
    | 'think_more';    // 想自己再想想

interface FollowUpOption {
    id: FollowUpResponse;
    emoji: string;
    label: string;
    aiHint: string;  // AI 会给出的提示类型
}

const FOLLOW_UP_OPTIONS: FollowUpOption[] = [
    {
        id: 'no_method',
        emoji: '🤷',
        label: '不知道用什么方法',
        aiHint: '给出思路提示，不给答案'
    },
    {
        id: 'calc_error',
        emoji: '✏️',
        label: '方法对了，算错了',
        aiHint: '引导检查计算步骤'
    },
    {
        id: 'not_understand',
        emoji: '😕',
        label: '题目没看懂',
        aiHint: '用更简单的语言解释'
    },
    {
        id: 'think_more',
        emoji: '💪',
        label: '我想自己再想想',
        aiHint: '鼓励后隐藏'
    },
];

/**
 * 智能追问组件 - 答错后 AI 主动引导
 * 帮助学生定位困难点，提供针对性帮助
 */
export const SmartFollowUp: React.FC<SmartFollowUpProps> = ({
    questionText,
    subject = 'math',
    onSelect,
    onSkip,
}) => {
    const [selectedResponse, setSelectedResponse] = useState<FollowUpResponse | null>(null);
    const [showAiResponse, setShowAiResponse] = useState(false);

    const handleSelect = (response: FollowUpResponse) => {
        setSelectedResponse(response);

        if (response === 'think_more') {
            // 鼓励后直接关闭
            setTimeout(() => onSkip(), 1500);
        } else {
            setShowAiResponse(true);
        }

        onSelect(response);
    };

    // AI 响应内容（根据选择动态生成）
    const getAiResponse = () => {
        switch (selectedResponse) {
            case 'no_method':
                return {
                    emoji: '💡',
                    title: 'AI 僚机提示',
                    content: '这道题可以先想想：题目问的是什么？给了哪些已知条件？试着把它们联系起来。'
                };
            case 'calc_error':
                return {
                    emoji: '🔍',
                    title: '检查一下',
                    content: '方法对了很棒！现在重新算一遍，每一步都仔细检查，特别注意进位和借位。'
                };
            case 'not_understand':
                return {
                    emoji: '📖',
                    title: '换个说法',
                    content: '没关系！建议你再读一遍题目，把关键的数字和问题用笔圈出来。'
                };
            default:
                return null;
        }
    };

    // 显示鼓励语
    if (selectedResponse === 'think_more') {
        return (
            <div className="mt-4 bg-gradient-to-br from-green-50 to-teal-50 border border-green-200 rounded-2xl p-4 text-center animate-fade-in">
                <div className="text-3xl mb-2">💪</div>
                <p className="font-bold text-green-700">加油！你可以的！</p>
                <p className="text-sm text-green-600 mt-1">相信自己，再想想看</p>
            </div>
        );
    }

    // 显示 AI 响应
    if (showAiResponse) {
        const aiResponse = getAiResponse();
        if (!aiResponse) return null;

        return (
            <div className="mt-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 animate-fade-in">
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">{aiResponse.emoji}</span>
                    <h3 className="font-bold text-blue-700">{aiResponse.title}</h3>
                </div>
                <p className="text-blue-800 text-sm leading-relaxed">
                    {aiResponse.content}
                </p>
                <button
                    onClick={onSkip}
                    className="mt-3 text-blue-400 text-xs hover:text-blue-600"
                >
                    知道了 →
                </button>
            </div>
        );
    }

    // 选择界面
    return (
        <div className="mt-4 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 animate-fade-in">
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-amber-700 flex items-center gap-2">
                    <span>🤖</span>
                    <span>AI 僚机想问你</span>
                </h3>
                <button onClick={onSkip} className="text-amber-400 hover:text-amber-600 text-sm">
                    跳过
                </button>
            </div>

            <p className="text-amber-800 font-medium mb-3 text-center">
                "你在哪一步卡住了？"
            </p>

            <div className="space-y-2">
                {FOLLOW_UP_OPTIONS.map(option => (
                    <button
                        key={option.id}
                        onClick={() => handleSelect(option.id)}
                        className="w-full py-2.5 px-4 rounded-xl border-2 text-left transition-all
                            bg-white border-amber-100 hover:border-amber-400 hover:scale-[1.01]
                            flex items-center gap-3"
                    >
                        <span className="text-xl">{option.emoji}</span>
                        <span className="font-medium text-gray-700 text-sm">{option.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};
