-- =============================================================================
-- 情绪记录表
-- 收集学生做题后的情绪状态，用于调整学习节奏
-- =============================================================================

-- 创建情绪记录表
CREATE TABLE IF NOT EXISTS emotion_record (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES daily_tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- 情绪状态
  emotion TEXT NOT NULL CHECK (emotion IN ('happy', 'calm', 'tired', 'frustrated')),
  
  -- 关联成绩（用于分析情绪与成绩关系）
  score_percentage INT CHECK (score_percentage BETWEEN 0 AND 100),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- 每个任务每个用户只能记录一次情绪
  UNIQUE(task_id, user_id)
);

-- 索引优化
CREATE INDEX IF NOT EXISTS idx_emotion_record_user_id ON emotion_record(user_id);
CREATE INDEX IF NOT EXISTS idx_emotion_record_created_at ON emotion_record(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_emotion_record_emotion ON emotion_record(emotion);

-- RLS 策略
ALTER TABLE emotion_record ENABLE ROW LEVEL SECURITY;

-- 用户只能查看和创建自己的记录
CREATE POLICY "Users can view own emotion" ON emotion_record
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own emotion" ON emotion_record
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 家长可以查看孩子的情绪记录
CREATE POLICY "Parents can view family emotion" ON emotion_record
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u1
      JOIN users u2 ON u1.family_id = u2.family_id
      WHERE u1.id = auth.uid() 
        AND u1.role = 'parent'
        AND u2.id = emotion_record.user_id
    )
  );

-- =============================================================================
-- 使用说明：
-- 1. 在 Supabase Dashboard 中执行此 SQL
-- 2. 前端通过 emotionService.ts 调用
-- =============================================================================
