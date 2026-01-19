import { useState, useEffect, useCallback } from 'react';
import { rewardService } from '../services/rewardService';
import { CustomReward, Redemption, RewardConfig } from '../types';

interface UseRewardsReturn {
    rewards: CustomReward[];
    redemptions: Redemption[];
    pendingRedemptions: Redemption[];
    rewardConfig: RewardConfig | null;
    loading: boolean;
    error: string | null;

    // Actions
    refresh: () => Promise<void>;
    createReward: (data: { name: string; costXp: number; icon?: string; description?: string }) => Promise<{ success: boolean; error?: string }>;
    updateReward: (rewardId: string, updates: Partial<{ name: string; costXp: number; icon: string; isActive: boolean }>) => Promise<{ success: boolean; error?: string }>;
    deleteReward: (rewardId: string) => Promise<{ success: boolean; error?: string }>;
    redeemReward: (rewardId: string) => Promise<{ success: boolean; remainingXp?: number; error?: string }>;
    approveRedemption: (redemptionId: string, approved: boolean) => Promise<{ success: boolean; error?: string }>;
    updateRewardConfig: (config: Partial<RewardConfig>) => Promise<{ success: boolean; error?: string }>;
}

export function useRewards(userId?: string): UseRewardsReturn {
    const [rewards, setRewards] = useState<CustomReward[]>([]);
    const [redemptions, setRedemptions] = useState<Redemption[]>([]);
    const [pendingRedemptions, setPendingRedemptions] = useState<Redemption[]>([]);
    const [rewardConfig, setRewardConfig] = useState<RewardConfig | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const [rewardsList, config, pending] = await Promise.all([
                rewardService.getFamilyRewards(),
                rewardService.getRewardConfig(),
                rewardService.getPendingRedemptions()
            ]);

            setRewards(rewardsList);
            setRewardConfig(config);
            setPendingRedemptions(pending);

            if (userId) {
                const userRedemptions = await rewardService.getUserRedemptions(userId);
                setRedemptions(userRedemptions);
            }
        } catch (err: any) {
            setError(err.message || '加载奖励失败');
        } finally {
            setLoading(false);
        }
    }, [userId]);

    const createReward = useCallback(async (data: { name: string; costXp: number; icon?: string; description?: string }) => {
        const result = await rewardService.createReward(data);
        if (result.success) {
            await refresh();
        }
        return result;
    }, [refresh]);

    const updateReward = useCallback(async (rewardId: string, updates: Partial<{ name: string; costXp: number; icon: string; isActive: boolean }>) => {
        const result = await rewardService.updateReward(rewardId, updates);
        if (result.success) {
            setRewards(prev => prev.map(r =>
                r.id === rewardId ? { ...r, ...updates } : r
            ));
        }
        return result;
    }, []);

    const deleteReward = useCallback(async (rewardId: string) => {
        const result = await rewardService.deleteReward(rewardId);
        if (result.success) {
            setRewards(prev => prev.filter(r => r.id !== rewardId));
        }
        return result;
    }, []);

    const redeemReward = useCallback(async (rewardId: string) => {
        const result = await rewardService.redeemReward(rewardId);
        if (result.success) {
            await refresh();
        }
        return result;
    }, [refresh]);

    const approveRedemption = useCallback(async (redemptionId: string, approved: boolean) => {
        const result = await rewardService.approveRedemption(redemptionId, approved);
        if (result.success) {
            setPendingRedemptions(prev => prev.filter(r => r.id !== redemptionId));
        }
        return result;
    }, []);

    const updateRewardConfigFn = useCallback(async (config: Partial<RewardConfig>) => {
        const result = await rewardService.updateRewardConfig(config);
        if (result.success) {
            setRewardConfig(prev => prev ? { ...prev, ...config } : null);
        }
        return result;
    }, []);

    // Auto load on mount
    useEffect(() => {
        refresh();
    }, [refresh]);

    return {
        rewards,
        redemptions,
        pendingRedemptions,
        rewardConfig,
        loading,
        error,
        refresh,
        createReward,
        updateReward,
        deleteReward,
        redeemReward,
        approveRedemption,
        updateRewardConfig: updateRewardConfigFn
    };
}

export default useRewards;
