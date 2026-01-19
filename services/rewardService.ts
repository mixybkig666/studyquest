
import { supabase, directRpc } from './supabaseClient';
import { CustomReward, Redemption, RewardConfig } from '../types';

// ===================================
// Reward Service - 奖励系统管理
// ===================================

export const rewardService = {
    /**
     * 获取家庭奖励列表
     */
    async getFamilyRewards(): Promise<CustomReward[]> {
        const { data, error } = await supabase
            .from('rewards')
            .select('*')
            .eq('is_active', true)
            .order('cost_xp', { ascending: true });

        if (error) {
            console.error('Error fetching rewards:', error);
            return [];
        }

        return data.map(r => ({
            id: r.id,
            name: r.name,
            cost_xp: r.cost_xp,
            icon: r.icon,
            is_active: r.is_active,
            description: r.description,
            reward_type: r.reward_type,
            time_minutes: r.time_minutes
        })) as CustomReward[];
    },

    /**
     * 获取所有奖励（包含未激活的）
     */
    async getAllRewards(): Promise<CustomReward[]> {
        const { data, error } = await supabase
            .from('rewards')
            .select('*')
            .order('cost_xp', { ascending: true });

        if (error) {
            console.error('Error fetching all rewards:', error);
            return [];
        }

        return data as CustomReward[];
    },

    /**
     * 创建新奖励
     */
    async createReward(reward: {
        name: string;
        costXp: number;
        icon?: string;
        description?: string;
        rewardType?: 'screen_time' | 'outdoor' | 'special' | 'custom';
        timeMinutes?: number;
    }): Promise<{ success: boolean; rewardId?: string; error?: string }> {
        // Get family_id
        const { data: user } = await supabase.auth.getUser();
        if (!user.user) {
            return { success: false, error: '未登录' };
        }

        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('family_id')
            .eq('id', user.user.id)
            .single();

        if (userError || !userData) {
            return { success: false, error: '获取用户信息失败' };
        }

        const { data, error } = await supabase
            .from('rewards')
            .insert({
                family_id: userData.family_id,
                name: reward.name,
                cost_xp: reward.costXp,
                icon: reward.icon || '🎁',
                description: reward.description,
                reward_type: reward.rewardType || 'custom',
                time_minutes: reward.timeMinutes,
                is_active: true
            })
            .select()
            .single();

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true, rewardId: data.id };
    },

    /**
     * 更新奖励
     */
    async updateReward(rewardId: string, updates: Partial<{
        name: string;
        costXp: number;
        icon: string;
        description: string;
        isActive: boolean;
        timeMinutes: number;
    }>): Promise<{ success: boolean; error?: string }> {
        const updateData: any = {};
        if (updates.name !== undefined) updateData.name = updates.name;
        if (updates.costXp !== undefined) updateData.cost_xp = updates.costXp;
        if (updates.icon !== undefined) updateData.icon = updates.icon;
        if (updates.description !== undefined) updateData.description = updates.description;
        if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
        if (updates.timeMinutes !== undefined) updateData.time_minutes = updates.timeMinutes;

        const { error } = await supabase
            .from('rewards')
            .update(updateData)
            .eq('id', rewardId);

        if (error) {
            return { success: false, error: error.message };
        }
        return { success: true };
    },

    /**
     * 删除奖励（软删除）
     */
    async deleteReward(rewardId: string): Promise<{ success: boolean; error?: string }> {
        const { error } = await supabase
            .from('rewards')
            .update({ is_active: false })
            .eq('id', rewardId);

        if (error) {
            return { success: false, error: error.message };
        }
        return { success: true };
    },

    /**
     * 兑换奖励（通过 RPC）- 使用 directRpc 避免刷新后的请求问题
     */
    async redeemReward(rewardId: string): Promise<{ success: boolean; redemptionId?: string; remainingXp?: number; error?: string }> {
        const { data, error } = await directRpc('redeem_reward', {
            p_reward_id: rewardId
        });

        if (error) {
            return { success: false, error: error.message };
        }

        if (!data?.success) {
            return { success: false, error: data?.error || '兑换失败' };
        }

        return {
            success: true,
            redemptionId: data.redemption_id,
            remainingXp: data.remaining_xp
        };
    },

    /**
     * 获取用户的兑换记录
     */
    async getUserRedemptions(userId: string): Promise<Redemption[]> {
        const { data, error } = await supabase
            .from('reward_redemptions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching redemptions:', error);
            return [];
        }

        return data.map(r => ({
            id: r.id,
            user_id: r.user_id,
            reward_id: r.reward_id,
            reward_name: r.reward_name,
            cost_xp: r.xp_spent,
            status: r.status,
            created_at: r.created_at
        })) as Redemption[];
    },

    /**
     * 获取待审批的兑换请求（家长用）
     */
    async getPendingRedemptions(): Promise<Redemption[]> {
        const { data, error } = await supabase
            .from('reward_redemptions')
            .select(`
        *,
        user:users(name, avatar_url)
      `)
            .eq('status', 'pending')
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching pending redemptions:', error);
            return [];
        }

        return data as any[];
    },

    /**
     * 审批兑换请求（通过 RPC）
     */
    async approveRedemption(redemptionId: string, approved: boolean): Promise<{ success: boolean; error?: string }> {
        const { data, error } = await supabase.rpc('approve_redemption', {
            p_redemption_id: redemptionId,
            p_approved: approved
        });

        if (error) {
            return { success: false, error: error.message };
        }

        if (!data?.success) {
            return { success: false, error: data?.error || '操作失败' };
        }

        return { success: true };
    },

    /**
     * 标记兑换已使用
     */
    async markRedemptionUsed(redemptionId: string): Promise<{ success: boolean; error?: string }> {
        const { error } = await supabase
            .from('reward_redemptions')
            .update({
                status: 'fulfilled',
                used_at: new Date().toISOString()
            })
            .eq('id', redemptionId);

        if (error) {
            return { success: false, error: error.message };
        }
        return { success: true };
    },

    /**
     * 获取奖励配置
     */
    async getRewardConfig(): Promise<RewardConfig | null> {
        const { data, error } = await supabase
            .from('reward_configs')
            .select('*')
            .single();

        if (error) {
            // Supabase "single" query returns error code PGRST116 if no rows found.
            // This is expected for new families.
            if (error.code === 'PGRST116') {
                return null;
            }
            console.error('Error fetching reward config:', error);
            return null;
        }

        return {
            base_tablet: data.base_tablet,
            base_outdoor: data.base_outdoor,
            max_tablet: data.max_tablet,
            max_outdoor: data.max_outdoor,
            allocation_ratio: parseFloat(data.allocation_ratio),
            xp_to_minute_rate: data.xp_to_minute_rate
        };
    },

    /**
     * 更新奖励配置
     */
    async updateRewardConfig(config: Partial<RewardConfig>): Promise<{ success: boolean; error?: string }> {
        const updateData: any = {};
        if (config.base_tablet !== undefined) updateData.base_tablet = config.base_tablet;
        if (config.base_outdoor !== undefined) updateData.base_outdoor = config.base_outdoor;
        if (config.max_tablet !== undefined) updateData.max_tablet = config.max_tablet;
        if (config.max_outdoor !== undefined) updateData.max_outdoor = config.max_outdoor;
        if (config.allocation_ratio !== undefined) updateData.allocation_ratio = config.allocation_ratio;
        if (config.xp_to_minute_rate !== undefined) updateData.xp_to_minute_rate = config.xp_to_minute_rate;

        // Get family_id from current user
        const { data: user } = await supabase.auth.getUser();
        if (!user.user) {
            return { success: false, error: '未登录' };
        }

        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('family_id')
            .eq('id', user.user.id)
            .single();

        if (userError || !userData) {
            return { success: false, error: '获取用户信息失败' };
        }

        const { error } = await supabase
            .from('reward_configs')
            .update(updateData)
            .eq('family_id', userData.family_id);

        if (error) {
            return { success: false, error: error.message };
        }
        return { success: true };
    }
};

export default rewardService;
