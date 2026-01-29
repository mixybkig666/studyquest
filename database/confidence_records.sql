-- 自评记录表
-- 记录学生对答案的信心评估，用于追踪自评准确率

CREATE TABLE IF NOT EXISTS confidence_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_id UUID NOT NULL,
    task_id UUID REFERENCES daily_tasks(id) ON DELETE SET NULL,
    
    -- 自评等级
    confidence_level TEXT NOT NULL CHECK (confidence_level IN ('confident', 'unsure', 'guessing')),
    
    -- 实际结果
    was_correct BOOLEAN NOT NULL,
    
    -- 时间戳
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_confidence_user_time ON confidence_records (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_confidence_task ON confidence_records (task_id);

-- 启用 RLS
ALTER TABLE confidence_records ENABLE ROW LEVEL SECURITY;

-- RLS 策略：用户只能访问自己的记录
CREATE POLICY "Users can view their own confidence records"
    ON confidence_records FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own confidence records"
    ON confidence_records FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 注释
COMMENT ON TABLE confidence_records IS '学生答题后自评记录，用于追踪自评准确率';
COMMENT ON COLUMN confidence_records.confidence_level IS '自评等级：confident(稳了)/unsure(不太确定)/guessing(靠蒙)';
COMMENT ON COLUMN confidence_records.was_correct IS '实际答题是否正确';
