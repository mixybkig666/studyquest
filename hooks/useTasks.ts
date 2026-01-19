import { useState, useEffect, useCallback } from 'react';
import { taskService, TaskWithDetails, CreateTaskParams } from '../services/taskService';
import { DailyTask } from '../types';

interface UseTasksOptions {
    userId: string;
    autoLoad?: boolean;
}

interface UseTasksReturn {
    tasks: DailyTask[];
    loading: boolean;
    error: string | null;

    // Actions
    refresh: () => Promise<void>;
    loadHistory: (days?: number) => Promise<void>;
    createTask: (params: Omit<CreateTaskParams, 'userId'>) => Promise<{ success: boolean; taskId?: string; error?: string }>;
    startTask: (taskId: string) => Promise<{ success: boolean; error?: string }>;
    completeTask: (taskId: string, score: number, xpEarned: number, tabletMinutes?: number, outdoorMinutes?: number) => Promise<{ success: boolean; error?: string }>;
    skipTask: (taskId: string) => Promise<{ success: boolean; error?: string }>;
    getTaskWithQuestions: (taskId: string) => Promise<TaskWithDetails | null>;
}

export function useTasks({ userId, autoLoad = true }: UseTasksOptions): UseTasksReturn {
    const [tasks, setTasks] = useState<DailyTask[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        if (!userId) return;

        setLoading(true);
        setError(null);

        try {
            const todayTasks = await taskService.getTodayTasks(userId);
            setTasks(todayTasks);
        } catch (err: any) {
            setError(err.message || '加载任务失败');
        } finally {
            setLoading(false);
        }
    }, [userId]);

    const loadHistory = useCallback(async (days: number = 7) => {
        if (!userId) return;

        setLoading(true);
        setError(null);

        try {
            const historyTasks = await taskService.getTaskHistory(userId, days);
            setTasks(historyTasks);
        } catch (err: any) {
            setError(err.message || '加载历史失败');
        } finally {
            setLoading(false);
        }
    }, [userId]);

    const createTask = useCallback(async (params: Omit<CreateTaskParams, 'userId'>) => {
        const result = await taskService.createTask({ ...params, userId });
        if (result.success) {
            await refresh();
        }
        return result;
    }, [userId, refresh]);

    const startTask = useCallback(async (taskId: string) => {
        const result = await taskService.startTask(taskId);
        if (result.success) {
            setTasks(prev => prev.map(t =>
                t.id === taskId ? { ...t, status: 'in_progress' as const, started_at: new Date().toISOString() } : t
            ));
        }
        return result;
    }, []);

    const completeTask = useCallback(async (
        taskId: string,
        score: number,
        xpEarned: number,
        tabletMinutes: number = 0,
        outdoorMinutes: number = 0
    ) => {
        const result = await taskService.completeTask(taskId, score, xpEarned, tabletMinutes, outdoorMinutes);
        if (result.success) {
            setTasks(prev => prev.map(t =>
                t.id === taskId ? {
                    ...t,
                    status: 'completed' as const,
                    completed_at: new Date().toISOString(),
                    score,
                    xp_reward: xpEarned,
                    time_reward_tablet: tabletMinutes,
                    time_reward_outdoor: outdoorMinutes
                } : t
            ));
        }
        return result;
    }, []);

    const skipTask = useCallback(async (taskId: string) => {
        const result = await taskService.skipTask(taskId);
        if (result.success) {
            setTasks(prev => prev.map(t =>
                t.id === taskId ? { ...t, status: 'skipped' as const } : t
            ));
        }
        return result;
    }, []);

    const getTaskWithQuestions = useCallback(async (taskId: string) => {
        return await taskService.getTaskWithQuestions(taskId);
    }, []);

    // Auto load on mount
    useEffect(() => {
        if (autoLoad && userId) {
            refresh();
        }
    }, [autoLoad, userId, refresh]);

    return {
        tasks,
        loading,
        error,
        refresh,
        loadHistory,
        createTask,
        startTask,
        completeTask,
        skipTask,
        getTaskWithQuestions
    };
}

export default useTasks;
