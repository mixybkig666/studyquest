import React from 'react';
import { Button } from './Button';

interface EmptyStateProps {
    icon: string;
    title: string;
    description: string;
    action?: {
        label: string;
        onClick: () => void;
        variant?: 'primary' | 'secondary';
    };
    className?: string;
}

/**
 * 空态组件 - 当内容为空时显示
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
    icon,
    title,
    description,
    action,
    className = ''
}) => (
    <div className={`clay-card text-center py-12 px-6 ${className}`}>
        <div className="text-5xl mb-4 animate-float">{icon}</div>
        <h3 className="text-display text-brand-textDark mb-2">{title}</h3>
        <p className="text-caption text-brand-textLight mb-6 max-w-xs mx-auto">{description}</p>
        {action && (
            <Button
                onClick={action.onClick}
                variant={action.variant || 'primary'}
                size="md"
            >
                {action.label}
            </Button>
        )}
    </div>
);

/**
 * 预定义空态配置
 */
export const EMPTY_STATES = {
    tasks: {
        icon: '😴',
        title: '今天没有任务',
        description: '休息一下，或者让爸爸妈妈布置新任务'
    },
    tasksLoading: {
        icon: '✨',
        title: '任务正在生成中',
        description: '稍等一下，AI老师正在为你准备挑战'
    },
    rewards: {
        icon: '🎁',
        title: '还没有心愿',
        description: '和爸爸妈妈一起设定一个小目标吧'
    },
    mistakes: {
        icon: '💎',
        title: '太棒了！',
        description: '最近没有发现错题，继续保持'
    },
    history: {
        icon: '📚',
        title: '暂无学习记录',
        description: '完成第一个任务后，这里会显示你的学习足迹'
    },
    reading: {
        icon: '📖',
        title: '还没有阅读记录',
        description: '开始一次阅读任务，记录你的阅读时光'
    },
    children: {
        icon: '👶',
        title: '还没有添加孩子',
        description: '点击上方"添加孩子"创建第一个账号'
    },
    repository: {
        icon: '📂',
        title: '资料库是空的',
        description: '上传学习资料后，这里会显示所有历史记录'
    },
} as const;

/**
 * 快捷空态组件
 */
export const TasksEmpty: React.FC<{ onAction?: () => void }> = ({ onAction }) => (
    <EmptyState
        {...EMPTY_STATES.tasks}
        action={onAction ? { label: '去看看其他的', onClick: onAction } : undefined}
    />
);

export const RewardsEmpty: React.FC<{ onAction?: () => void }> = ({ onAction }) => (
    <EmptyState
        {...EMPTY_STATES.rewards}
        action={onAction ? { label: '设定心愿', onClick: onAction } : undefined}
    />
);

export const MistakesEmpty: React.FC = () => (
    <EmptyState {...EMPTY_STATES.mistakes} />
);
