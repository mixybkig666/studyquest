/**
 * ChildIntentMessage - 给孩子的今日提示
 * 
 * 在任务卡片上展示，告诉孩子"今天为什么学这个"
 */

import React from 'react';

const INTENT_MESSAGES = {
    reinforce: {
        icon: '📚',
        color: 'blue',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        textColor: 'text-blue-700'
    },
    verify: {
        icon: '🔍',
        color: 'purple',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200',
        textColor: 'text-purple-700'
    },
    challenge: {
        icon: '🚀',
        color: 'orange',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        textColor: 'text-orange-700'
    },
    lighten: {
        icon: '🌿',
        color: 'green',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        textColor: 'text-green-700'
    },
    introduce: {
        icon: '✨',
        color: 'teal',
        bgColor: 'bg-teal-50',
        borderColor: 'border-teal-200',
        textColor: 'text-teal-700'
    },
    pause: {
        icon: '☕',
        color: 'gray',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        textColor: 'text-gray-600'
    }
} as const;

type IntentType = keyof typeof INTENT_MESSAGES;

interface ChildIntentMessageProps {
    intentType: IntentType;
    message: string;
    compact?: boolean;
}

export const ChildIntentMessage: React.FC<ChildIntentMessageProps> = ({
    intentType,
    message,
    compact = false
}) => {
    const config = INTENT_MESSAGES[intentType] || INTENT_MESSAGES.reinforce;

    if (compact) {
        return (
            <div className={`inline-flex items-center gap-1.5 text-xs ${config.textColor}`}>
                <span>{config.icon}</span>
                <span className="italic">{message}</span>
            </div>
        );
    }

    return (
        <div className={`${config.bgColor} border ${config.borderColor} rounded-xl p-3 flex items-start gap-2`}>
            <span className="text-xl flex-shrink-0">{config.icon}</span>
            <p className={`${config.textColor} text-sm font-medium leading-relaxed`}>
                {message}
            </p>
        </div>
    );
};

// 在任务开始页面展示的欢迎消息
export const WelcomeIntentCard: React.FC<{
    childName: string;
    intentType: IntentType;
    message: string;
    questionCount: number;
}> = ({ childName, intentType, message, questionCount }) => {
    const config = INTENT_MESSAGES[intentType] || INTENT_MESSAGES.reinforce;

    return (
        <div className={`${config.bgColor} border ${config.borderColor} rounded-2xl p-5 text-center`}>
            <div className="text-4xl mb-3">{config.icon}</div>
            <h2 className={`text-xl font-bold ${config.textColor} mb-2`}>
                嗨，{childName}！
            </h2>
            <p className="text-gray-600 mb-4">
                {message}
            </p>
            <div className="inline-flex items-center gap-2 bg-white/60 px-4 py-2 rounded-full text-sm text-gray-700">
                <span>📝</span>
                <span>今天有 <strong>{questionCount}</strong> 道题等着你</span>
            </div>
        </div>
    );
};

export default ChildIntentMessage;
