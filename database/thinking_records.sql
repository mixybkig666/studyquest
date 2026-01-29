-- 思路预判记录表
-- 记录学生答题前的思路选择，用于分析思路与正确率的关系

CREATE TABLE IF NOT EXISTS thinking_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_id UUID NOT NULL,
    task_id UUID REFERENCES daily_tasks(id) ON DELETE SET NULL,
    
    -- 思路选择
    approach TEXT NOT NULL,
    
    -- 实际结果
    was_correct BOOLEAN NOT NULL,
    
    -- 题目类型（用于统计分析）
    question_type TEXT,
    
    -- 时间戳
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_thinking_user_time ON thinking_records (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_thinking_approach ON thinking_records (user_id, approach);

-- 启用 RLS
ALTER TABLE thinking_records ENABLE ROW LEVEL SECURITY;

-- RLS 策略
CREATE POLICY "Users can view their own thinking records"
    ON thinking_records FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own thinking records"
    ON thinking_records FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 注释
COMMENT ON TABLE thinking_records IS '学生答题前思路预判记录';
COMMENT ON COLUMN thinking_records.approach IS '选择的解题思路：add_sub/mul_div/fraction/equation等';
COMMENT ON COLUMN thinking_records.was_correct IS '最终答题是否正确';
