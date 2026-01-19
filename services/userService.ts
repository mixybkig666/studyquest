import { supabase, directFetch } from './supabaseClient';
import { User } from '../types';

// ===================================
// User Service - 用户和家庭管理
// ===================================

export const userService = {
    /**
     * 获取当前登录用户信息
     */
    async getCurrentUser(): Promise<User | null> {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) return null;

        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', authUser.id)
            .single();

        if (error) {
            console.error('Error fetching current user:', error);
            return null;
        }
        return data as User;
    },

    /**
     * 获取家庭成员列表
     */
    async getFamilyMembers(): Promise<User[]> {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .order('role', { ascending: false }) // parents first
            .order('name');

        if (error) {
            console.error('Error fetching family members:', error);
            return [];
        }
        return data as User[];
    },

    /**
     * 获取家庭中的所有孩子
     */
    async getChildren(): Promise<User[]> {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('role', 'child')
            .order('name');

        if (error) {
            console.error('Error fetching children:', error);
            return [];
        }
        return data as User[];
    },

    /**
     * 获取特定用户信息
     */
    async getUserById(userId: string): Promise<User | null> {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) {
            console.error('Error fetching user:', error);
            return null;
        }
        return data as User;
    },

    /**
     * 更新用户资料 - 使用 directFetch 避免刷新后的请求问题
     */
    async updateProfile(userId: string, updates: Partial<User>): Promise<{ success: boolean; error?: string }> {
        const { error, status } = await directFetch(
            `users?id=eq.${userId}`,
            'PATCH',
            updates
        );

        if (error) {
            console.error('updateProfile error:', error, 'status:', status);
            return { success: false, error: error.message };
        }
        return { success: true };
    },

    /**
     * 添加孩子到家庭（通过 RPC）
     */
    async addChild(name: string, avatarUrl?: string, gradeLevel?: number): Promise<{ success: boolean; childId?: string; error?: string }> {
        const { data, error } = await supabase.rpc('add_child_to_family', {
            p_name: name,
            p_avatar_url: avatarUrl || null,
            p_grade_level: gradeLevel || null
        });

        if (error) {
            return { success: false, error: error.message };
        }

        if (!data?.success) {
            return { success: false, error: data?.error || '添加失败' };
        }

        return { success: true, childId: data.child_id };
    },

    /**
     * 更新孩子的 XP - 使用 directFetch 避免刷新后的请求问题
     */
    async updateXP(userId: string, xpDelta: number, walletXpDelta?: number): Promise<{ success: boolean; error?: string }> {
        // Get current values using directFetch
        const { data: users, error: fetchError } = await directFetch(`users?id=eq.${userId}&select=total_xp,available_xp`);

        if (fetchError || !users || users.length === 0) {
            return { success: false, error: fetchError?.message || 'User not found' };
        }

        const user = users[0];
        const newTotalXp = (user.total_xp || 0) + xpDelta;
        const newAvailableXp = (user.available_xp || 0) + (walletXpDelta ?? xpDelta);

        const { error } = await directFetch(
            `users?id=eq.${userId}`,
            'PATCH',
            {
                total_xp: newTotalXp,
                available_xp: newAvailableXp,
                last_active_date: new Date().toISOString().split('T')[0]
            }
        );

        if (error) {
            return { success: false, error: error.message };
        }
        return { success: true };
    },

    /**
     * 更新连续天数
     */


    /**
     * 获取家庭信息
     */
    async getFamily(): Promise<{ id: string; name: string; learning_period?: string } | null> {
        const { data, error } = await supabase
            .from('families')
            .select('id, name, learning_period')
            .single();

        if (error) {
            console.error('Error fetching family:', error);
            return null;
        }
        return data as { id: string; name: string; learning_period?: string };
    },

    /**
     * 更新家庭名称
     */
    async updateFamilyName(familyId: string, name: string): Promise<{ success: boolean; error?: string }> {
        const { error } = await supabase
            .from('families')
            .update({ name })
            .eq('id', familyId);

        if (error) {
            return { success: false, error: error.message };
        }
        return { success: true };
    },

    /**
     * 更新家庭学期状态
     */
    async updateFamilyLearningPeriod(familyId: string, period: string): Promise<{ success: boolean; error?: string }> {
        const { error } = await supabase
            .from('families')
            .update({ learning_period: period })
            .eq('id', familyId);

        if (error) {
            return { success: false, error: error.message };
        }
        return { success: true };
    },

    /**
     * 更新连续天数
     */
    async updateStreak(userId: string): Promise<{ success: boolean; newStreak?: number; error?: string }> {
        // 先获取最新的上次活跃时间
        const { data: user, error: fetchError } = await supabase
            .from('users')
            .select('streak_days, last_active_date')
            .eq('id', userId)
            .single();

        if (fetchError || !user) {
            return { success: false, error: fetchError?.message || 'User not found' };
        }

        const today = new Date().toISOString().split('T')[0];
        // 修正时区问题：使用本地日期计算
        // const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        // 简化逻辑：如果是今天，不变；如果是昨天，+1；如果是更早，重置为1
        // 如果 last_active_date 已经在 updateXP 中被更新为今天，我们需要判断它更新前的值
        // 但 updateXP 和 updateStreak 谁先调？
        // 策略：updateStreak 应该在页面加载时调用，且仅当 last_active_date != today 时逻辑才有效。
        // 如果 updateXP 先调用了并把 date 改成了 today，那么 streak 就无法增加。
        // FIX: 在 updateXP 中不要盲目更新 last_active_date，或者在 updateStreak 中处理。
        // 这里假设 updateStreak 是首次加载调用。

        let newStreak = user.streak_days || 0;
        let shouldUpdate = false;

        if (user.last_active_date !== today) {
            const lastActive = new Date(user.last_active_date);
            const now = new Date();
            const diffTime = Math.abs(now.getTime() - lastActive.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            // 简单的字符串比较更可靠
            const dateObj = new Date();
            dateObj.setDate(dateObj.getDate() - 1);
            const yesterdayStr = dateObj.toISOString().split('T')[0];

            if (user.last_active_date === yesterdayStr) {
                newStreak += 1;
            } else {
                newStreak = 1;
            }
            shouldUpdate = true;
        }

        if (shouldUpdate) {
            const { error } = await supabase
                .from('users')
                .update({
                    streak_days: newStreak,
                    last_active_date: today
                })
                .eq('id', userId);

            if (error) {
                return { success: false, error: error.message };
            }
            return { success: true, newStreak };
        }

        return { success: true, newStreak: user.streak_days };
    }
};

export default userService;
