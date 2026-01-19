/**
 * Memory Service - 三层记忆系统完整实现
 * 
 * 记忆层级：
 * - ephemeral: 临时观察层（7-14天过期）
 * - hypothesis: 中期假设层（可被验证或推翻）
 * - stable: 长期稳定层（4周验证后写入）
 */

import { supabase } from './supabaseClient';

// ============================================
// 类型定义
// ============================================

export type MemoryLayer = 'ephemeral' | 'hypothesis' | 'stable';
export type MemoryStatus = 'active' | 'suspected' | 'resolving' | 'resolved' | 'expired';
export type ConfidenceLevel = 'low' | 'medium' | 'high';

export interface Memory {
    id: string;
    childId: string;
    layer: MemoryLayer;
    key: string;
    content: Record<string, any>;
    status: MemoryStatus;
    confidence: ConfidenceLevel;
    evidenceCount: number;
    firstObserved: Date;
    lastUpdated: Date;
    lastConfirmed?: Date;
    expiresAt?: Date;
}

export interface WriteMemoryInput {
    childId: string;
    layer: MemoryLayer;
    key: string;
    content: Record<string, any>;
    confidence?: ConfidenceLevel;
    ttlDays?: number; // 仅 ephemeral 使用
}

export interface ReadMemoryFilter {
    childId: string;
    layer?: MemoryLayer;
    status?: MemoryStatus;
    keyPattern?: string; // 支持模糊匹配
    minConfidence?: ConfidenceLevel;
}

// ============================================
// 核心功能：写入记忆
// ============================================

/**
 * 写入记忆
 * - 如果 key 已存在，增加 evidence_count 并更新内容
 * - ephemeral 层自动设置过期时间
 */
export async function writeMemory(input: WriteMemoryInput): Promise<Memory | null> {
    const { childId, layer, key, content, confidence = 'low', ttlDays = 10 } = input;

    console.log(`[Memory] Writing ${layer} memory: ${key}`);

    // 计算过期时间（仅 ephemeral 层）
    const expiresAt = layer === 'ephemeral'
        ? new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000)
        : null;

    // 初始状态
    const initialStatus: MemoryStatus = layer === 'hypothesis' ? 'suspected' : 'active';

    const { data, error } = await supabase
        .from('child_memory')
        .upsert({
            child_id: childId,
            memory_layer: layer,
            memory_key: key,
            memory_content: content,
            status: initialStatus,
            confidence: confidence,
            evidence_count: 1,
            first_observed: new Date().toISOString().split('T')[0],
            last_updated: new Date().toISOString(),
            expires_at: expiresAt?.toISOString() || null
        }, {
            onConflict: 'child_id,memory_key,memory_layer',
            ignoreDuplicates: false
        })
        .select()
        .single();

    if (error) {
        console.error('[Memory] Write error:', error);

        // 如果是重复键，尝试更新
        if (error.code === '23505') {
            return updateExistingMemory(childId, layer, key, content, confidence);
        }
        return null;
    }

    return transformMemory(data);
}

/**
 * 更新已存在的记忆（增加证据计数）
 */
async function updateExistingMemory(
    childId: string,
    layer: MemoryLayer,
    key: string,
    content: Record<string, any>,
    confidence: ConfidenceLevel
): Promise<Memory | null> {
    const { data, error } = await supabase
        .from('child_memory')
        .update({
            memory_content: content,
            confidence: confidence,
            evidence_count: supabase.raw('evidence_count + 1'),
            last_updated: new Date().toISOString()
        })
        .eq('child_id', childId)
        .eq('memory_key', key)
        .eq('memory_layer', layer)
        .select()
        .single();

    if (error) {
        console.error('[Memory] Update error:', error);
        return null;
    }

    return transformMemory(data);
}

// ============================================
// 核心功能：读取记忆
// ============================================

/**
 * 读取记忆
 * - 支持按层级、状态、关键词过滤
 */
export async function readMemory(filter: ReadMemoryFilter): Promise<Memory[]> {
    const { childId, layer, status, keyPattern, minConfidence } = filter;

    let query = supabase
        .from('child_memory')
        .select('*')
        .eq('child_id', childId)
        .eq('status', 'active'); // 默认只读活跃的

    if (layer) {
        query = query.eq('memory_layer', layer);
    }

    if (status) {
        query = query.eq('status', status);
    }

    if (keyPattern) {
        query = query.ilike('memory_key', `%${keyPattern}%`);
    }

    if (minConfidence) {
        const confidenceOrder = { low: 1, medium: 2, high: 3 };
        const minLevel = confidenceOrder[minConfidence];
        // 使用 in 过滤
        const allowedConfidences = Object.entries(confidenceOrder)
            .filter(([, level]) => level >= minLevel)
            .map(([name]) => name);
        query = query.in('confidence', allowedConfidences);
    }

    const { data, error } = await query.order('last_updated', { ascending: false });

    if (error) {
        console.error('[Memory] Read error:', error);
        return [];
    }

    return (data || []).map(transformMemory);
}

/**
 * 读取特定记忆
 */
export async function getMemory(
    childId: string,
    key: string,
    layer?: MemoryLayer
): Promise<Memory | null> {
    let query = supabase
        .from('child_memory')
        .select('*')
        .eq('child_id', childId)
        .eq('memory_key', key);

    if (layer) {
        query = query.eq('memory_layer', layer);
    }

    const { data, error } = await query.maybeSingle();

    if (error || !data) {
        return null;
    }

    return transformMemory(data);
}

// ============================================
// 核心功能：记忆升级
// ============================================

/**
 * 升级记忆层级
 * - ephemeral → hypothesis: 当证据累积到一定程度
 * - hypothesis → stable: 当假设被验证
 */
export async function promoteMemory(memoryId: string): Promise<Memory | null> {
    // 先获取当前记忆
    const { data: current, error: fetchError } = await supabase
        .from('child_memory')
        .select('*')
        .eq('id', memoryId)
        .single();

    if (fetchError || !current) {
        console.error('[Memory] Promote - not found:', memoryId);
        return null;
    }

    const currentLayer = current.memory_layer as MemoryLayer;
    let newLayer: MemoryLayer;
    let newStatus: MemoryStatus = 'active';

    // 确定升级目标
    switch (currentLayer) {
        case 'ephemeral':
            newLayer = 'hypothesis';
            newStatus = 'suspected';
            break;
        case 'hypothesis':
            newLayer = 'stable';
            newStatus = 'active';
            break;
        case 'stable':
            // 已是最高层级
            return transformMemory(current);
    }

    console.log(`[Memory] Promoting ${memoryId}: ${currentLayer} → ${newLayer}`);

    // 更新层级
    const { data, error } = await supabase
        .from('child_memory')
        .update({
            memory_layer: newLayer,
            status: newStatus,
            last_confirmed: new Date().toISOString().split('T')[0],
            expires_at: null, // 升级后不再过期
            last_updated: new Date().toISOString()
        })
        .eq('id', memoryId)
        .select()
        .single();

    if (error) {
        console.error('[Memory] Promote error:', error);
        return null;
    }

    return transformMemory(data);
}

// ============================================
// 核心功能：记忆衰减
// ============================================

/**
 * 衰减记忆置信度
 * - 长时间未验证的 hypothesis 记忆，降低置信度
 * - 置信度降到 low 且长时间无更新，标记为 resolved
 */
export async function decayMemory(childId: string): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 降低未验证 hypothesis 的置信度
    const { data: hypotheses } = await supabase
        .from('child_memory')
        .select('id, confidence')
        .eq('child_id', childId)
        .eq('memory_layer', 'hypothesis')
        .eq('status', 'suspected')
        .lt('last_updated', thirtyDaysAgo.toISOString());

    let decayedCount = 0;

    for (const memory of (hypotheses || [])) {
        const currentConfidence = memory.confidence as ConfidenceLevel;
        let newConfidence: ConfidenceLevel = currentConfidence;
        let newStatus: MemoryStatus = 'suspected';

        // 降级置信度
        if (currentConfidence === 'high') {
            newConfidence = 'medium';
        } else if (currentConfidence === 'medium') {
            newConfidence = 'low';
        } else {
            // 已是 low，标记为 resolved（放弃假设）
            newStatus = 'resolved';
        }

        await supabase
            .from('child_memory')
            .update({
                confidence: newConfidence,
                status: newStatus,
                last_updated: new Date().toISOString()
            })
            .eq('id', memory.id);

        decayedCount++;
    }

    console.log(`[Memory] Decayed ${decayedCount} memories for child ${childId}`);
    return decayedCount;
}

// ============================================
// 核心功能：清理过期记忆
// ============================================

/**
 * 清理过期的 ephemeral 记忆
 */
export async function cleanupExpired(): Promise<number> {
    const { data, error } = await supabase
        .from('child_memory')
        .update({ status: 'expired' })
        .eq('memory_layer', 'ephemeral')
        .eq('status', 'active')
        .lt('expires_at', new Date().toISOString())
        .select();

    if (error) {
        console.error('[Memory] Cleanup error:', error);
        return 0;
    }

    const count = data?.length || 0;
    console.log(`[Memory] Cleaned up ${count} expired memories`);
    return count;
}

// ============================================
// 辅助功能：验证假设
// ============================================

/**
 * 验证假设记忆
 * - validated: 升级到 stable
 * - rejected: 标记为 resolved
 */
export async function validateHypothesis(
    memoryId: string,
    result: 'validated' | 'rejected'
): Promise<Memory | null> {
    if (result === 'validated') {
        return promoteMemory(memoryId);
    }

    // 拒绝假设
    const { data, error } = await supabase
        .from('child_memory')
        .update({
            status: 'resolved',
            last_updated: new Date().toISOString()
        })
        .eq('id', memoryId)
        .select()
        .single();

    if (error) {
        console.error('[Memory] Validate error:', error);
        return null;
    }

    return transformMemory(data);
}

// ============================================
// 辅助功能：获取记忆摘要（给 Agent 用）
// ============================================

/**
 * 获取孩子的记忆摘要
 * - 用于 Agent 快速了解孩子的长期特征
 */
export async function getMemorySummary(childId: string): Promise<{
    stablePatterns: Memory[];
    activeHypotheses: Memory[];
    recentObservations: Memory[];
    stats: {
        totalMemories: number;
        stableCount: number;
        hypothesisCount: number;
        ephemeralCount: number;
    };
}> {
    const allMemories = await supabase
        .from('child_memory')
        .select('*')
        .eq('child_id', childId)
        .eq('status', 'active')
        .order('last_updated', { ascending: false });

    const memories = (allMemories.data || []).map(transformMemory);

    return {
        stablePatterns: memories.filter(m => m.layer === 'stable'),
        activeHypotheses: memories.filter(m => m.layer === 'hypothesis'),
        recentObservations: memories.filter(m => m.layer === 'ephemeral').slice(0, 5),
        stats: {
            totalMemories: memories.length,
            stableCount: memories.filter(m => m.layer === 'stable').length,
            hypothesisCount: memories.filter(m => m.layer === 'hypothesis').length,
            ephemeralCount: memories.filter(m => m.layer === 'ephemeral').length
        }
    };
}

// ============================================
// 数据转换
// ============================================

function transformMemory(data: any): Memory {
    return {
        id: data.id,
        childId: data.child_id,
        layer: data.memory_layer,
        key: data.memory_key,
        content: data.memory_content,
        status: data.status,
        confidence: data.confidence,
        evidenceCount: data.evidence_count,
        firstObserved: new Date(data.first_observed),
        lastUpdated: new Date(data.last_updated),
        lastConfirmed: data.last_confirmed ? new Date(data.last_confirmed) : undefined,
        expiresAt: data.expires_at ? new Date(data.expires_at) : undefined
    };
}

// ============================================
// 导出
// ============================================

export default {
    writeMemory,
    readMemory,
    getMemory,
    promoteMemory,
    decayMemory,
    cleanupExpired,
    validateHypothesis,
    getMemorySummary
};
