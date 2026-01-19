import React from 'react';

interface SkeletonProps {
    className?: string;
    variant?: 'text' | 'title' | 'avatar' | 'card' | 'button' | 'circle';
}

/**
 * 骨架屏组件 - 加载时的视觉占位
 */
export const Skeleton: React.FC<SkeletonProps> = ({
    className = '',
    variant = 'text'
}) => {
    const baseStyle = 'animate-skeleton bg-gradient-to-r from-brand-border/40 via-brand-border/70 to-brand-border/40 bg-[length:200%_100%]';

    const variants: Record<string, string> = {
        text: 'h-4 rounded-md',
        title: 'h-6 rounded-md w-3/4',
        avatar: 'w-12 h-12 rounded-full',
        card: 'h-24 rounded-card',
        button: 'h-10 w-24 rounded-clay',
        circle: 'w-10 h-10 rounded-full',
    };

    return <div className={`${baseStyle} ${variants[variant]} ${className}`} />;
};

/**
 * 任务卡片骨架屏
 */
export const TaskCardSkeleton: React.FC = () => (
    <div className="clay-card p-0 overflow-hidden">
        <div className="h-1.5 bg-brand-border/30" />
        <div className="p-4 flex items-center gap-4">
            <Skeleton variant="avatar" className="w-14 h-14 shrink-0" />
            <div className="flex-1 space-y-3">
                <Skeleton variant="title" />
                <div className="flex gap-2">
                    <Skeleton className="w-16 h-5 rounded-full" />
                    <Skeleton className="w-20 h-5 rounded-full" />
                </div>
            </div>
        </div>
    </div>
);

/**
 * 任务列表骨架屏
 */
export const TaskListSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => (
    <div className="space-y-4">
        {Array.from({ length: count }).map((_, i) => (
            <TaskCardSkeleton key={i} />
        ))}
    </div>
);

/**
 * 统计卡片骨架屏
 */
export const StatCardSkeleton: React.FC = () => (
    <div className="clay-card p-4 space-y-3">
        <Skeleton variant="circle" />
        <Skeleton variant="title" className="w-1/2" />
        <Skeleton className="w-full h-2 rounded-full" />
    </div>
);

/**
 * 仪表盘骨架屏
 */
export const DashboardSkeleton: React.FC = () => (
    <div className="space-y-6 animate-fade-in">
        {/* Header 区域 */}
        <div className="flex items-center gap-4 p-4">
            <Skeleton variant="avatar" className="w-14 h-14" />
            <div className="space-y-2 flex-1">
                <Skeleton variant="title" className="w-1/3" />
                <div className="flex gap-2">
                    <Skeleton className="w-16 h-5 rounded-full" />
                    <Skeleton className="w-16 h-5 rounded-full" />
                </div>
            </div>
        </div>

        {/* 奖励柱子 */}
        <div className="grid grid-cols-3 gap-3 px-4">
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
        </div>

        {/* 任务列表 */}
        <div className="px-4">
            <Skeleton variant="title" className="mb-4 w-1/4" />
            <TaskListSkeleton count={3} />
        </div>
    </div>
);
