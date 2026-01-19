
import { supabase, directFetch, directRpc } from './supabaseClient';
import { DailyTask, Question, LearningMaterial } from '../types';

// ===================================
// Task Service - 每日任务管理
// ===================================

export interface CreateTaskParams {
    userId: string;
    materialId?: string;
    taskDate?: string;
    taskType: 'quiz' | 'reading' | 'review';
    xpReward?: number;
    tabletReward?: number;
    outdoorReward?: number;
    questionIds?: string[];
    readingDurationGoal?: number;
}

export interface TaskWithDetails extends DailyTask {
    questions?: Question[];
}

export const taskService = {
    /**
     * 获取今日任务
     */
    async getTodayTasks(userId: string): Promise<DailyTask[]> {
        const today = new Date().toISOString().split('T')[0];

        // Use standard table name join instead of alias to prevent ambiguous relationship errors
        const { data, error } = await supabase
            .from('daily_tasks')
            .select(`
                *,
                learning_materials (*)
            `)
            .eq('user_id', userId)
            .eq('task_date', today)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching today tasks:', JSON.stringify(error));
            return [];
        }

        // Map 'learning_materials' (from DB join) to 'learning_material' (expected by frontend types)
        return (data || []).map((task: any) => ({
            ...task,
            learning_material: task.learning_materials
        })) as DailyTask[];
    },

    /**
     * 获取多个孩子的任务（用于家长仪表盘）
     */
    async getFamilyChildrenTasks(childIds: string[], days: number = 30): Promise<DailyTask[]> {
        if (!childIds.length) return [];

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const startDateStr = startDate.toISOString().split('T')[0];

        const { data, error } = await supabase
            .from('daily_tasks')
            .select(`
                *,
                learning_materials (*)
            `)
            .in('user_id', childIds)
            .gte('task_date', startDateStr)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching family tasks:', JSON.stringify(error));
            return [];
        }

        return (data || []).map((task: any) => ({
            ...task,
            child_id: task.user_id, // 确保 child_id 字段存在
            learning_material: task.learning_materials
        })) as DailyTask[];
    },

    /**
     * 获取任务历史
     */
    async getTaskHistory(userId: string, days: number = 7): Promise<DailyTask[]> {
        const startDate = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];

        const { data, error } = await supabase
            .from('daily_tasks')
            .select(`
                *,
                learning_materials (*)
            `)
            .eq('user_id', userId)
            .gte('task_date', startDate)
            .order('task_date', { ascending: false });

        if (error) {
            console.error('Error fetching task history:', JSON.stringify(error));
            return [];
        }

        return (data || []).map((task: any) => ({
            ...task,
            learning_material: task.learning_materials
        })) as DailyTask[];
    },

    /**
     * 获取任务详情（包含题目）
     */
    async getTaskWithQuestions(taskId: string): Promise<TaskWithDetails | null> {
        const { data: taskData, error: taskError } = await supabase
            .from('daily_tasks')
            .select(`
                *,
                learning_materials (*)
            `)
            .eq('id', taskId)
            .single();

        if (taskError || !taskData) {
            console.error('Error fetching task:', JSON.stringify(taskError));
            return null;
        }

        // Map fields
        const task = {
            ...taskData,
            learning_material: taskData.learning_materials
        } as TaskWithDetails;



        // Fetch questions if there are question IDs
        if (task.question_ids && task.question_ids.length > 0) {

            const { data: questions, error: qError } = await supabase
                .from('questions')
                .select('*')
                .in('id', task.question_ids)
                .order('order_index');



            if (!qError && questions && questions.length > 0) {
                // 映射字段
                const mappedQuestions = questions.map(q => ({
                    ...q,
                    expected: q.expected || { mode: 'text', value: q.correct_answer }
                }));
                return { ...task, questions: mappedQuestions } as TaskWithDetails;
            }
        }


        return task as TaskWithDetails;
    },

    /**
     * 创建新任务
     */
    async createTask(params: CreateTaskParams): Promise<{ success: boolean; taskId?: string; error?: string }> {
        const taskDate = params.taskDate || new Date().toISOString().split('T')[0];

        const taskData = {
            user_id: params.userId,
            material_id: params.materialId || null,
            task_date: taskDate,
            task_type: params.taskType,
            status: 'pending',
            xp_reward: params.xpReward || 50,
            time_reward_tablet: params.tabletReward || 0,
            time_reward_outdoor: params.outdoorReward || 0,
            question_ids: params.questionIds || [],
            reading_duration_goal: params.readingDurationGoal || null
        };

        const { data, error } = await supabase
            .from('daily_tasks')
            .insert(taskData)
            .select()
            .single();

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true, taskId: data.id };
    },

    /**
     * 开始任务 - 使用 directFetch 避免刷新后的请求问题
     */
    async startTask(taskId: string): Promise<{ success: boolean; error?: string }> {
        const { error } = await directFetch(
            `daily_tasks?id=eq.${taskId}`,
            'PATCH',
            {
                status: 'in_progress',
                started_at: new Date().toISOString()
            }
        );

        if (error) {
            return { success: false, error: error.message };
        }
        return { success: true };
    },

    /**
     * 完成任务（通过 RPC 同时更新 XP）- 使用 directRpc 避免刷新后的请求问题
     */
    async completeTask(
        taskId: string,
        score: number,
        xpEarned: number,
        tabletMinutes: number = 0,
        outdoorMinutes: number = 0
    ): Promise<{ success: boolean; error?: string }> {
        const { data, error } = await directRpc('complete_task', {
            p_task_id: taskId,
            p_score: score,
            p_xp_earned: xpEarned,
            p_tablet_minutes: tabletMinutes,
            p_outdoor_minutes: outdoorMinutes
        });

        if (error) {
            return { success: false, error: error.message };
        }

        if (!data?.success) {
            return { success: false, error: data?.error || '完成任务失败' };
        }

        return { success: true };
    },

    /**
     * 更新阅读任务
     */
    async updateReadingTask(
        taskId: string,
        actualDuration: number,
        reflection: string
    ): Promise<{ success: boolean; error?: string }> {
        const { error } = await supabase
            .from('daily_tasks')
            .update({
                status: 'completed',
                completed_at: new Date().toISOString(),
                actual_reading_duration: actualDuration,
                reading_reflection: reflection
            })
            .eq('id', taskId);

        if (error) {
            return { success: false, error: error.message };
        }
        return { success: true };
    },

    /**
     * 跳过任务
     */
    async skipTask(taskId: string): Promise<{ success: boolean; error?: string }> {
        const { error } = await supabase
            .from('daily_tasks')
            .update({ status: 'skipped' })
            .eq('id', taskId);

        if (error) {
            return { success: false, error: error.message };
        }
        return { success: true };
    },

    /**
     * 删除任务
     */
    async deleteTask(taskId: string): Promise<{ success: boolean; error?: string }> {
        const { error } = await supabase
            .from('daily_tasks')
            .delete()
            .eq('id', taskId);

        if (error) {
            return { success: false, error: error.message };
        }
        return { success: true };
    },

    /**
     * 保存答题记录
     */
    async saveAnswerRecord(
        taskId: string,
        userId: string,
        questionId: string,
        userAnswer: string,
        isCorrect: boolean,
        timeSpentSeconds?: number,
        selfConfidence?: 'know' | 'fuzzy' | 'unknown',
        aiFeedback?: string
    ): Promise<{ success: boolean; error?: string }> {
        const { error } = await supabase
            .from('answer_records')
            .insert({
                task_id: taskId,
                user_id: userId,
                question_id: questionId,
                user_answer: userAnswer,
                is_correct: isCorrect,
                time_spent_seconds: timeSpentSeconds,
                self_confidence: selfConfidence,
                ai_feedback: aiFeedback
            });

        if (error) {
            return { success: false, error: error.message };
        }
        return { success: true };
    },

    /**
     * 批量保存答题记录
     */
    async saveAnswerRecords(
        records: Array<{
            taskId: string;
            userId: string;
            questionId: string;
            userAnswer: string;
            isCorrect: boolean;
            timeSpentSeconds?: number;
            selfConfidence?: 'know' | 'fuzzy' | 'unknown';
            aiFeedback?: string;
        }>
    ): Promise<{ success: boolean; error?: string }> {
        const insertData = records.map(r => ({
            task_id: r.taskId,
            user_id: r.userId,
            question_id: r.questionId,
            user_answer: r.userAnswer,
            is_correct: r.isCorrect,
            time_spent_seconds: r.timeSpentSeconds,
            self_confidence: r.selfConfidence,
            ai_feedback: r.aiFeedback
        }));

        const { error } = await supabase
            .from('answer_records')
            .insert(insertData);

        if (error) {
            return { success: false, error: error.message };
        }
        return { success: true };
    },

    /**
     * 获取用户的错题记录
     * @param date Optional date string (YYYY-MM-DD) to filter results
     */
    async getWrongAnswers(userId: string, limit: number = 20, date?: string): Promise<any[]> {
        let query = supabase
            .from('answer_records')
            .select(`
                *,
                question:questions(*)
            `)
            .eq('user_id', userId)
            .eq('is_correct', false)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (date) {
            // Filter by created_at starting with date string (simple date filter)
            // Or use gte/lt for full day range
            const nextDay = new Date(date);
            nextDay.setDate(nextDay.getDate() + 1);
            const nextDayStr = nextDay.toISOString().split('T')[0];

            query = query.gte('created_at', date).lt('created_at', nextDayStr);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching wrong answers:', error);
            return [];
        }

        return data || [];
    },

    /**
     * 获取每日进度统计
     */
    async getDailyProgress(userId: string, date?: string): Promise<any | null> {
        const targetDate = date || new Date().toISOString().split('T')[0];

        const { data, error } = await supabase
            .from('daily_progress')
            .select('*')
            .eq('user_id', userId)
            .eq('progress_date', targetDate)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null; // No rows found
            console.error('Error fetching daily progress:', error);
            return null;
        }

        return data;
    },

    /**
     * 更新/创建每日进度
     */
    async upsertDailyProgress(
        userId: string,
        updates: {
            tasksCompleted?: number;
            totalTasks?: number;
            questionsAnswered?: number;
            questionsCorrect?: number;
            xpEarned?: number;
            timeSpentMinutes?: number;
        }
    ): Promise<{ success: boolean; error?: string }> {
        const today = new Date().toISOString().split('T')[0];

        const { error } = await supabase
            .from('daily_progress')
            .upsert({
                user_id: userId,
                progress_date: today,
                tasks_completed: updates.tasksCompleted,
                total_tasks: updates.totalTasks,
                questions_answered: updates.questionsAnswered,
                questions_correct: updates.questionsCorrect,
                xp_earned: updates.xpEarned,
                time_spent_minutes: updates.timeSpentMinutes
            }, {
                onConflict: 'user_id,progress_date'
            });

        if (error) {
            return { success: false, error: error.message };
        }
        return { success: true };
    }
};

export default taskService;
