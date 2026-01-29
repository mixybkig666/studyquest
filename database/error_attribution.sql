-- =============================================================================
-- 错题归因表
-- 收集学生对错题原因的自我诊断，用于针对性练习设计
-- =============================================================================

-- 创建错题归因表
CREATE TABLE IF NOT EXISTS error_attribution (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id TEXT NOT NULL,  -- 题目 ID（可能是临时生成的）
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- 错误类型
  error_type TEXT NOT NULL CHECK (error_type IN 
    ('concept', 'calculation', 'reading', 'careless', 'unknown')),
  
  -- 应对措施
  countermeasure TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 索引优化
CREATE INDEX IF NOT EXISTS idx_error_attribution_user_id ON error_attribution(user_id);
CREATE INDEX IF NOT EXISTS idx_error_attribution_error_type ON error_attribution(error_type);
CREATE INDEX IF NOT EXISTS idx_error_attribution_created_at ON error_attribution(created_at DESC);

-- RLS 策略
ALTER TABLE error_attribution ENABLE ROW LEVEL SECURITY;

-- 用户只能查看和创建自己的记录
CREATE POLICY "Users can view own attribution" ON error_attribution
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own attribution" ON error_attribution
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 家长可以查看孩子的归因记录
CREATE POLICY "Parents can view family attribution" ON error_attribution
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u1
      JOIN users u2 ON u1.family_id = u2.family_id
      WHERE u1.id = auth.uid() 
        AND u1.role = 'parent'
        AND u2.id = error_attribution.user_id
    )
  );

-- =============================================================================
-- 错误类型说明：
-- concept     - 概念不懂（不理解知识点）
-- calculation - 计算错误（方法对但算错）
-- reading     - 审题不清（没看清题目）
-- careless    - 粗心大意（知道但写错）
-- unknown     - 不清楚原因
-- =============================================================================
