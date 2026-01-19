-- Master Agent 系统表
-- StudyQuest Phase 1: 智能教学决策层

-- ============================================
-- 1. Teaching Intents 表 - 每日教学意图决策记录
-- ============================================

CREATE TABLE teaching_intents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    intent_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Teaching Intent 决策
    intent_type VARCHAR(20) NOT NULL CHECK (intent_type IN (
        'reinforce',  -- 巩固已学
        'verify',     -- 验证掌握
        'challenge',  -- 挑战提升
        'lighten',    -- 轻松模式
        'introduce',  -- 引入新知
        'pause'       -- 暂停学习
    )),
    
    -- 决策依据（JSON 格式）
    decision_context JSONB NOT NULL DEFAULT '{}',
    /*
      示例:
      {
        "avg_mastery": 0.45,
        "weak_points": ["english.grammar.third_person"],
        "strong_points": ["math.calculation"],
        "emotion_signal": "neutral",
        "behavior_signal": "normal",
        "recent_error_rate": 0.3,
        "abandon_rate": 0.1
      }
    */
    
    -- 决策原因（人类可读）
    decision_reason TEXT,
    
    -- 执行参数
    question_count INTEGER DEFAULT 5,
    difficulty_level VARCHAR(10) CHECK (difficulty_level IN ('low', 'medium', 'high')),
    focus_knowledge_points TEXT[], -- 今日聚焦的知识点
    
    -- 执行结果
    tasks_generated INTEGER DEFAULT 0,
    tasks_completed INTEGER DEFAULT 0,
    
    -- 家长简报
    parent_headline TEXT,      -- 一句话总结
    parent_insight TEXT,       -- 深度洞察
    parent_action TEXT,        -- 可执行建议
    
    -- 孩子视角
    child_message TEXT,        -- 给孩子的话
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(child_id, intent_date)
);

-- 索引
CREATE INDEX idx_teaching_intents_child_date ON teaching_intents(child_id, intent_date);
CREATE INDEX idx_teaching_intents_type ON teaching_intents(intent_type);

-- ============================================
-- 2. Child Memory 表 - 三层记忆系统
-- ============================================

CREATE TABLE child_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    
    -- 记忆层级
    memory_layer VARCHAR(20) NOT NULL CHECK (memory_layer IN (
        'ephemeral',   -- 临时观察层（7-14天过期）
        'hypothesis',  -- 中期假设层（可被推翻）
        'stable'       -- 长期稳定层（4周验证后）
    )),
    
    -- 记忆键（用于去重和查询）
    memory_key VARCHAR(100) NOT NULL,
    
    -- 记忆内容（JSON 格式，不同层级结构不同）
    memory_content JSONB NOT NULL,
    /*
      Layer 1 (ephemeral) 示例:
      {
        "source": "parent_chat",
        "content_type": "emotion_report",
        "summary": "最近写英语有点烦躁",
        "confidence": "low"
      }
      
      Layer 2 (hypothesis) 示例:
      {
        "hypothesis": "learning_fatigue_english",
        "description": "英语语法练习疲劳迹象",
        "evidence": ["parent_chat", "task_abandon_rate"],
        "status": "suspected",
        "needs_validation": true
      }
      
      Layer 3 (stable) 示例:
      {
        "pattern": "low_tolerance_repetitive_drill",
        "description": "重复机械练习时表现下降",
        "effective_strategy": ["use_varied_contexts", "short_sessions"],
        "validated_by": ["longitudinal_performance", "intervention_result"]
      }
    */
    
    -- 状态管理
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN (
        'active',      -- 活跃
        'suspected',   -- 待验证（hypothesis 专用）
        'resolving',   -- 正在解决
        'resolved',    -- 已解决
        'expired'      -- 已过期
    )),
    
    -- 置信度
    confidence VARCHAR(10) CHECK (confidence IN ('low', 'medium', 'high')),
    
    -- 生命周期
    first_observed DATE DEFAULT CURRENT_DATE,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    last_confirmed DATE,           -- 最后一次确认/验证日期
    expires_at TIMESTAMPTZ,        -- 过期时间（ephemeral 层必填）
    review_cycle_days INTEGER,     -- 复核周期（stable 层使用）
    
    -- 证据来源计数
    evidence_count INTEGER DEFAULT 1,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(child_id, memory_key, memory_layer)
);

-- 索引
CREATE INDEX idx_child_memory_child_layer ON child_memory(child_id, memory_layer);
CREATE INDEX idx_child_memory_status ON child_memory(status);
CREATE INDEX idx_child_memory_key ON child_memory(memory_key);
CREATE INDEX idx_child_memory_expires ON child_memory(expires_at) WHERE expires_at IS NOT NULL;

-- ============================================
-- 3. Parent Signals 表 - 家长输入信号
-- ============================================

CREATE TABLE parent_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    parent_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    
    -- 信号类型
    signal_type VARCHAR(50) NOT NULL CHECK (signal_type IN (
        'emotion_report',      -- 情绪报告
        'behavior_observation', -- 行为观察
        'schedule_change',     -- 时间安排变化
        'feedback',            -- 一般反馈
        'concern'              -- 担忧
    )),
    
    -- 原始输入（临时存储，不进入决策）
    raw_input TEXT,
    
    -- 系统转译后的结构化信号
    parsed_signal JSONB,
    /*
      示例:
      {
        "emotion": "frustration",
        "context": "english_tasks",
        "intensity": "low",
        "confidence": "medium",
        "needs_validation": true
      }
    */
    
    -- 处理状态
    processed BOOLEAN DEFAULT FALSE,
    processing_result TEXT,        -- 处理结果说明
    action_taken VARCHAR(50),      -- 采取的行动
    
    -- 是否写入记忆
    written_to_memory BOOLEAN DEFAULT FALSE,
    memory_id UUID REFERENCES child_memory(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_parent_signals_child ON parent_signals(child_id);
CREATE INDEX idx_parent_signals_processed ON parent_signals(processed);
CREATE INDEX idx_parent_signals_created ON parent_signals(created_at);

-- ============================================
-- 4. RLS 策略
-- ============================================

ALTER TABLE teaching_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_signals ENABLE ROW LEVEL SECURITY;

-- Teaching Intents 策略
-- 孩子可以查看自己的教学意图
CREATE POLICY "Children can view own intents" ON teaching_intents
    FOR SELECT USING (child_id = auth.uid());

-- 家长可以查看孩子的教学意图
CREATE POLICY "Parents can view children intents" ON teaching_intents
    FOR SELECT USING (
        child_id IN (
            SELECT id FROM users 
            WHERE family_id = get_my_family_id() AND role = 'child'
        )
        AND EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'parent'
        )
    );

-- 系统可以插入教学意图（使用 service role）
CREATE POLICY "System can insert intents" ON teaching_intents
    FOR INSERT WITH CHECK (
        child_id IN (
            SELECT id FROM users WHERE family_id = get_my_family_id()
        )
    );

-- 系统可以更新教学意图
CREATE POLICY "System can update intents" ON teaching_intents
    FOR UPDATE USING (
        child_id IN (
            SELECT id FROM users WHERE family_id = get_my_family_id()
        )
    );

-- Child Memory 策略
-- 家长可以查看孩子的记忆
CREATE POLICY "Parents can view child memory" ON child_memory
    FOR SELECT USING (
        child_id IN (
            SELECT id FROM users 
            WHERE family_id = get_my_family_id() AND role = 'child'
        )
        AND EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'parent'
        )
    );

-- 系统可以管理记忆（通过 service role）
CREATE POLICY "System can manage memory" ON child_memory
    FOR ALL USING (
        child_id IN (
            SELECT id FROM users WHERE family_id = get_my_family_id()
        )
    );

-- Parent Signals 策略
-- 家长可以提交信号
CREATE POLICY "Parents can insert signals" ON parent_signals
    FOR INSERT WITH CHECK (
        parent_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'parent'
        )
    );

-- 家长可以查看自己提交的信号
CREATE POLICY "Parents can view own signals" ON parent_signals
    FOR SELECT USING (parent_id = auth.uid());

-- ============================================
-- 5. 触发器
-- ============================================

-- 更新 updated_at 触发器
CREATE TRIGGER update_teaching_intents_updated_at 
    BEFORE UPDATE ON teaching_intents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 自动清理过期 ephemeral 记忆的函数
CREATE OR REPLACE FUNCTION cleanup_expired_memory()
RETURNS void AS $$
BEGIN
    UPDATE child_memory 
    SET status = 'expired'
    WHERE memory_layer = 'ephemeral' 
      AND expires_at < NOW()
      AND status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. RPC 函数
-- ============================================

-- 获取孩子的教学上下文（供 Master Agent 使用）
CREATE OR REPLACE FUNCTION get_child_teaching_context(p_child_id UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    child_profile JSONB;
    mastery_stats JSONB;
    recent_intents JSONB;
    active_memory JSONB;
BEGIN
    -- 获取孩子基本信息
    SELECT jsonb_build_object(
        'id', id,
        'name', name,
        'grade_level', grade_level,
        'total_xp', total_xp,
        'streak_days', streak_days
    ) INTO child_profile
    FROM users WHERE id = p_child_id;
    
    -- 获取掌握度统计
    SELECT jsonb_build_object(
        'total_points', COALESCE(COUNT(*), 0),
        'avg_mastery', COALESCE(AVG(mastery_level), 0),
        'weak_count', COALESCE(SUM(CASE WHEN mastery_level < 0.4 THEN 1 ELSE 0 END), 0),
        'strong_count', COALESCE(SUM(CASE WHEN mastery_level >= 0.7 THEN 1 ELSE 0 END), 0)
    ) INTO mastery_stats
    FROM knowledge_mastery WHERE user_id = p_child_id;
    
    -- 获取最近 7 天的教学意图
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'date', intent_date,
        'type', intent_type,
        'tasks_completed', tasks_completed
    )), '[]'::jsonb) INTO recent_intents
    FROM teaching_intents 
    WHERE child_id = p_child_id 
      AND intent_date >= CURRENT_DATE - INTERVAL '7 days'
    ORDER BY intent_date DESC;
    
    -- 获取活跃的记忆
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'layer', memory_layer,
        'key', memory_key,
        'status', status,
        'confidence', confidence
    )), '[]'::jsonb) INTO active_memory
    FROM child_memory 
    WHERE child_id = p_child_id AND status = 'active';
    
    -- 组装结果
    result := jsonb_build_object(
        'profile', child_profile,
        'mastery', mastery_stats,
        'recent_intents', recent_intents,
        'active_memory', active_memory
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 保存今日教学意图
CREATE OR REPLACE FUNCTION save_teaching_intent(
    p_child_id UUID,
    p_intent_type VARCHAR(20),
    p_decision_context JSONB,
    p_decision_reason TEXT,
    p_question_count INTEGER,
    p_difficulty_level VARCHAR(10),
    p_focus_points TEXT[],
    p_parent_headline TEXT,
    p_parent_insight TEXT,
    p_parent_action TEXT,
    p_child_message TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    result_id UUID;
BEGIN
    INSERT INTO teaching_intents (
        child_id, intent_date, intent_type,
        decision_context, decision_reason,
        question_count, difficulty_level, focus_knowledge_points,
        parent_headline, parent_insight, parent_action,
        child_message
    ) VALUES (
        p_child_id, CURRENT_DATE, p_intent_type,
        p_decision_context, p_decision_reason,
        p_question_count, p_difficulty_level, p_focus_points,
        p_parent_headline, p_parent_insight, p_parent_action,
        p_child_message
    )
    ON CONFLICT (child_id, intent_date) 
    DO UPDATE SET
        intent_type = EXCLUDED.intent_type,
        decision_context = EXCLUDED.decision_context,
        decision_reason = EXCLUDED.decision_reason,
        question_count = EXCLUDED.question_count,
        difficulty_level = EXCLUDED.difficulty_level,
        focus_knowledge_points = EXCLUDED.focus_knowledge_points,
        parent_headline = EXCLUDED.parent_headline,
        parent_insight = EXCLUDED.parent_insight,
        parent_action = EXCLUDED.parent_action,
        child_message = EXCLUDED.child_message,
        updated_at = NOW()
    RETURNING id INTO result_id;
    
    RETURN result_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 写入临时观察记忆
CREATE OR REPLACE FUNCTION write_ephemeral_memory(
    p_child_id UUID,
    p_memory_key VARCHAR(100),
    p_memory_content JSONB,
    p_ttl_days INTEGER DEFAULT 10
)
RETURNS UUID AS $$
DECLARE
    result_id UUID;
BEGIN
    INSERT INTO child_memory (
        child_id, memory_layer, memory_key, memory_content,
        confidence, expires_at
    ) VALUES (
        p_child_id, 'ephemeral', p_memory_key, p_memory_content,
        COALESCE(p_memory_content->>'confidence', 'low'),
        NOW() + (p_ttl_days || ' days')::INTERVAL
    )
    ON CONFLICT (child_id, memory_key, memory_layer) 
    DO UPDATE SET
        memory_content = EXCLUDED.memory_content,
        last_updated = NOW(),
        evidence_count = child_memory.evidence_count + 1,
        expires_at = NOW() + (p_ttl_days || ' days')::INTERVAL
    RETURNING id INTO result_id;
    
    RETURN result_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 获取今日教学意图
CREATE OR REPLACE FUNCTION get_today_intent(p_child_id UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id', id,
        'intent_type', intent_type,
        'decision_reason', decision_reason,
        'question_count', question_count,
        'difficulty_level', difficulty_level,
        'focus_knowledge_points', focus_knowledge_points,
        'parent_headline', parent_headline,
        'parent_insight', parent_insight,
        'parent_action', parent_action,
        'child_message', child_message,
        'tasks_generated', tasks_generated,
        'tasks_completed', tasks_completed
    ) INTO result
    FROM teaching_intents
    WHERE child_id = p_child_id AND intent_date = CURRENT_DATE;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. 授权 RPC 函数
-- ============================================

GRANT EXECUTE ON FUNCTION get_child_teaching_context(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION save_teaching_intent(UUID, VARCHAR, JSONB, TEXT, INTEGER, VARCHAR, TEXT[], TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION write_ephemeral_memory(UUID, VARCHAR, JSONB, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_today_intent(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_memory() TO authenticated;
